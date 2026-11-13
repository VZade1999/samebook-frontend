import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Form, AutoComplete, Input, InputNumber, Row, Col, Spin, Tooltip } from "antd";
import { DeleteOutlined, PlusOutlined, ShoppingCartOutlined, ShoppingOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import { getProducts } from "@/modules/products/redux/productActions";
import FormSection from "./FormSection";
import { rupees } from "../view/shared";

// ─── Types ────────────────────────────────────────────────
interface Item {
  id: number;
  name: string;
  hsn_code: string;
  unit: string;
  price: number;
}

interface ItemOption {
  label: string;
  value: string;
  item: Item;
}

interface QuotationLineItem {
  itemName?: string;
  hsn_code?: string;
  unit?: string;
  quantity?: number;
  price?: number;
  discount?: number;
  discounted_price?: number;
  total?: number;
}

/** A computed figure of one row, re-rendered only when that row's value changes. */
const RowFigure: React.FC<{ index: number; field: "discounted_price" | "total"; className?: string }> = ({ index, field, className }) => (
  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.items?.[index]?.[field] !== cur.items?.[index]?.[field]}>
    {({ getFieldValue }) => <span className={className}>{rupees(getFieldValue(["items", index, field]) || 0)}</span>}
  </Form.Item>
);

// ─── Memoized row components ─────────────────────────────────
// Each row/card only re-renders when its OWN props change — editing one
// row's price no longer forces every other row's AutoComplete/InputNumber
// to reconcile, which is what caused visible typing lag as the item count
// grew (worst on mobile CPUs). Props are kept to primitives + stable
// callback refs so React.memo's default shallow comparison actually works.
interface ItemRowProps {
  name: number;
  index: number;
  itemOptions: ItemOption[];
  searchLoading: boolean;
  onItemSelect: (value: string, option: Partial<ItemOption> | undefined, index: number) => void;
  onItemNameSearch: (value: string) => void;
  onQtyChange: (index: number) => void;
  onPriceChange: (index: number) => void;
  onDiscountChange: (index: number) => void;
  onRemove: (name: number) => void;
}

const DesktopItemRow: React.FC<ItemRowProps> = React.memo(({
  name, index, itemOptions, searchLoading, onItemSelect, onItemNameSearch, onQtyChange, onPriceChange, onDiscountChange, onRemove,
}) => (
  <tr>
    <td className="qi-row-num">{index + 1}</td>
    <td>
      <Form.Item name={[name, "itemName"]} rules={[{ required: true, message: "Required" }]}>
        <AutoComplete
          placeholder="Search or type an item"
          options={itemOptions}
          onSearch={onItemNameSearch}
          onSelect={(value, option) => onItemSelect(value, option as Partial<ItemOption>, index)}
          filterOption={false}
          notFoundContent={searchLoading ? <Spin size="small" /> : "Type to search products"}
          style={{ width: "100%", minWidth: 180 }}
          aria-label={`Item ${index + 1} name`}
        />
      </Form.Item>
    </td>
    <td>
      <Form.Item name={[name, "hsn_code"]} rules={[{ required: true, message: "Required" }]}>
        <Input placeholder="HSN" aria-label={`Item ${index + 1} HSN code`} />
      </Form.Item>
    </td>
    <td>
      <Form.Item name={[name, "quantity"]} rules={[{ required: true, message: "Req." }]}>
        <InputNumber min={1} style={{ width: "100%" }} onChange={() => onQtyChange(index)} aria-label={`Item ${index + 1} quantity`} />
      </Form.Item>
    </td>
    <td>
      {/* Unit is populated exclusively from onItemSelect above. No onChange
          here — the user can still type/edit freely, but typing never
          re-derives the value from the catalog. */}
      <Form.Item name={[name, "unit"]} rules={[{ required: true, message: "Required" }]}>
        <Input placeholder="pcs" aria-label={`Item ${index + 1} unit`} />
      </Form.Item>
    </td>
    <td>
      <Form.Item name={[name, "price"]} rules={[{ required: true, message: "Req." }]}>
        <InputNumber min={0} step={0.01} style={{ width: "100%" }} prefix="₹" onChange={() => onPriceChange(index)} aria-label={`Item ${index + 1} rate`} />
      </Form.Item>
    </td>
    <td>
      <Form.Item name={[name, "discount"]}>
        <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} suffix="%" onChange={() => onDiscountChange(index)} aria-label={`Item ${index + 1} discount percent`} />
      </Form.Item>
    </td>
    <td className="qi-calc">
      <Form.Item name={[name, "discounted_price"]} hidden><InputNumber /></Form.Item>
      <RowFigure index={index} field="discounted_price" />
    </td>
    <td className="qi-calc total">
      <Form.Item name={[name, "total"]} hidden><InputNumber /></Form.Item>
      <RowFigure index={index} field="total" />
    </td>
    <td className="qi-action-cell">
      <Tooltip title="Remove item">
        <button type="button" className="qi-del" onClick={() => onRemove(name)} aria-label={`Remove item ${index + 1}`}>
          <DeleteOutlined />
        </button>
      </Tooltip>
    </td>
  </tr>
));
DesktopItemRow.displayName = "DesktopItemRow";

const MobileItemCard: React.FC<ItemRowProps> = React.memo(({
  name, index, itemOptions, searchLoading, onItemSelect, onItemNameSearch, onQtyChange, onPriceChange, onDiscountChange, onRemove,
}) => (
  <div className="qi-item-card">
    <div className="qi-item-card-head">
      <span className="qi-item-num">Item {index + 1}</span>
      <button type="button" className="qi-del" onClick={() => onRemove(name)} aria-label={`Remove item ${index + 1}`}>
        <DeleteOutlined />
      </button>
    </div>

    <Form.Item label="Item name" name={[name, "itemName"]} rules={[{ required: true, message: "Please enter item name" }]}>
      <AutoComplete
        placeholder="Search or type an item…"
        options={itemOptions}
        onSearch={onItemNameSearch}
        onSelect={(value, option) => onItemSelect(value, option as Partial<ItemOption>, index)}
        filterOption={false}
        notFoundContent={searchLoading ? <Spin size="small" /> : "Type to search products"}
        style={{ width: "100%" }}
      />
    </Form.Item>

    <Row gutter={10}>
      <Col span={10}>
        <Form.Item label="HSN code" name={[name, "hsn_code"]} rules={[{ required: true, message: "Required" }]}>
          <Input placeholder="e.g. 8471" />
        </Form.Item>
      </Col>
      <Col span={7}>
        <Form.Item label="Qty" name={[name, "quantity"]} rules={[{ required: true, message: "Required" }]}>
          <InputNumber min={1} style={{ width: "100%" }} onChange={() => onQtyChange(index)} />
        </Form.Item>
      </Col>
      <Col span={7}>
        <Form.Item label="Unit" name={[name, "unit"]} rules={[{ required: true, message: "Required" }]}>
          <Input placeholder="pcs" />
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={10}>
      <Col span={12}>
        <Form.Item label="Rate (₹)" name={[name, "price"]} rules={[{ required: true, message: "Required" }]}>
          <InputNumber min={0} step={0.01} style={{ width: "100%" }} onChange={() => onPriceChange(index)} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Discount (%)" name={[name, "discount"]}>
          <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} onChange={() => onDiscountChange(index)} />
        </Form.Item>
      </Col>
    </Row>

    <div className="qi-totals-strip">
      <div className="qi-total-chip">
        <span>Net rate</span>
        <RowFigure index={index} field="discounted_price" />
      </div>
      <div className="qi-total-chip accent">
        <span>Amount</span>
        <b><RowFigure index={index} field="total" /></b>
      </div>
    </div>

    {/* Hidden fields keep values synced */}
    <Form.Item name={[name, "discounted_price"]} hidden><InputNumber /></Form.Item>
    <Form.Item name={[name, "total"]} hidden><InputNumber /></Form.Item>
  </div>
));
MobileItemCard.displayName = "MobileItemCard";

const QuotationItems: React.FC = () => {
  const form = Form.useFormInstance();
  const dispatch = useDispatch();
  const subTotal = Form.useWatch("subTotal", form);
  const itemCount = (Form.useWatch("items", form) || []).length;

  // ─── Product catalog: real server-side search-as-you-type ─────────────
  // Every keystroke (debounced) queries GET /product/list?search=... —
  // product_code doubles as hsn_code, matching how this company treats it.
  const [hasQuery, setHasQuery] = useState(false);
  const rawProducts = useSelector(
    (state: any) => state.products?.products?.products || [],
  );
  const searchLoading = useSelector((state: any) => state.products?.loading || false);

  const catalogItems: Item[] = useMemo(
    () =>
      rawProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        hsn_code: p.product_code || "",
        unit: p.unit || "",
        price: p.price != null ? parseFloat(p.price) : 0,
      })),
    [rawProducts],
  );

  const itemOptions: ItemOption[] = useMemo(() => {
    if (!hasQuery) return [];
    return catalogItems.map((item) => ({ label: item.name, value: item.name, item }));
  }, [hasQuery, catalogItems]);

  // Stable across renders (created once) — debounces the actual network
  // call to 400ms after typing stops.
  const debouncedFetch = useRef(
    debounce((term: string) => {
      dispatch(getProducts({ search: term, limit: 20, page: 1 }) as any);
    }, 400),
  ).current;

  useEffect(() => () => debouncedFetch.cancel(), [debouncedFetch]);

  const handleItemNameSearch = useCallback((value: string) => {
    if (!value.trim()) {
      setHasQuery(false);
      return;
    }
    setHasQuery(true);
    debouncedFetch(value.trim());
  }, [debouncedFetch]);

  /** The catalog record behind an AutoComplete pick. */
  const resolveSelectedItem = (value: string, option: Partial<ItemOption> | undefined): Item | undefined => {
    return option?.item ?? catalogItems.find((item) => item.name === value);
  };

  const calculateAndUpdateSubTotal = useCallback(() => {
    const items: QuotationLineItem[] = form.getFieldValue("items") || [];
    const sub = items.reduce((sum, item) => sum + (item?.total || 0), 0);
    form.setFieldsValue({ subTotal: parseFloat(sub.toFixed(2)) });
  }, [form]);

  // Writes only the single field path that changed (rc-field-form updates
  // just that Field's subscribers) instead of replacing the whole `items`
  // array, which would rebuild every row.
  const handleItemChange = useCallback((_fieldName: string, index: number) => {
    const items: QuotationLineItem[] = form.getFieldValue("items") || [];
    const item = items[index];
    if (!item) return;
    const quantity = item.quantity || 0;
    const price = item.price || 0;
    const discount = item.discount || 0;
    const discountedPrice = price - (price * discount) / 100;
    const total = quantity * discountedPrice;
    form.setFields([
      { name: ["items", index, "discounted_price"], value: parseFloat(discountedPrice.toFixed(2)) },
      { name: ["items", index, "total"], value: parseFloat(total.toFixed(2)) },
    ]);
    calculateAndUpdateSubTotal();
  }, [form, calculateAndUpdateSubTotal]);

  const handleItemSelect = useCallback((value: string, option: Partial<ItemOption> | undefined, index: number) => {
    const selectedItem = resolveSelectedItem(value, option);
    if (!selectedItem) return;

    form.setFields([
      { name: ["items", index, "itemName"], value: selectedItem.name },
      { name: ["items", index, "hsn_code"], value: selectedItem.hsn_code || "" },
      { name: ["items", index, "unit"], value: selectedItem.unit || "" },
      ...(selectedItem.price != null ? [{ name: ["items", index, "price"], value: selectedItem.price }] : []),
    ]);
    handleItemChange("price", index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, handleItemChange, catalogItems]);

  const handleQtyChange = useCallback((index: number) => handleItemChange("quantity", index), [handleItemChange]);
  const handleDiscountChange = useCallback((index: number) => handleItemChange("discount", index), [handleItemChange]);
  const handlePriceChange = useCallback((index: number) => {
    const items: QuotationLineItem[] = form.getFieldValue("items") || [];
    if (!items[index]?.discount) {
      form.setFields([{ name: ["items", index, "discount"], value: 0 }]);
    }
    handleItemChange("price", index);
  }, [form, handleItemChange]);

  // `remove` (from Form.List's render-prop) is read via a ref so
  // `handleRemove` never changes identity across renders.
  const removeRef = useRef<(index: number | number[]) => void>(() => {});
  const addRef = useRef<(defaultValue?: any) => void>(() => {});
  const handleRemove = useCallback((name: number) => {
    removeRef.current(name);
    calculateAndUpdateSubTotal();
  }, [calculateAndUpdateSubTotal]);

  const rowProps = {
    itemOptions,
    searchLoading,
    onItemSelect: handleItemSelect,
    onItemNameSearch: handleItemNameSearch,
    onQtyChange: handleQtyChange,
    onPriceChange: handlePriceChange,
    onDiscountChange: handleDiscountChange,
    onRemove: handleRemove,
  };

  return (
    <FormSection
      id="qf-items"
      step={3}
      icon={<ShoppingCartOutlined />}
      title="Items"
      sub="Search your product catalogue or type a new item"
      flush
      extra={
        <button type="button" className="qp-btn ghost sm" onClick={() => addRef.current({ quantity: 1, discount: 0 })}>
          <PlusOutlined /> Add item
        </button>
      }
    >
      <Form.List name="items">
        {(fields, { add, remove }) => {
          removeRef.current = remove;
          addRef.current = add;
          return (
            <>
              {/* ─── DESKTOP TABLE ─── */}
              <div className="qi-table-wrap">
                <table className="qi-table">
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}>#</th>
                      <th style={{ minWidth: 200 }}>Item</th>
                      <th style={{ width: 110 }}>HSN</th>
                      <th style={{ width: 84 }}>Qty</th>
                      <th style={{ width: 84 }}>Unit</th>
                      <th style={{ width: 124 }}>Rate</th>
                      <th style={{ width: 96 }}>Disc.</th>
                      <th style={{ width: 104 }} className="num">Net rate</th>
                      <th style={{ width: 118 }} className="num">Amount</th>
                      <th style={{ width: 44 }} aria-label="Actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.length === 0 ? (
                      <tr>
                        <td colSpan={10}>
                          <div className="qi-empty">
                            <span className="qi-empty-icon"><ShoppingOutlined /></span>
                            <b>No items yet</b>
                            <span>Add the products or services you are quoting for.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      fields.map(({ key, name }, index) => <DesktopItemRow key={key} name={name} index={index} {...rowProps} />)
                    )}
                  </tbody>
                </table>
              </div>

              {/* ─── MOBILE CARDS ─── */}
              <div className="qi-cards-wrap">
                {fields.length === 0 && (
                  <div className="qi-empty">
                    <span className="qi-empty-icon"><ShoppingOutlined /></span>
                    <b>No items yet</b>
                    <span>Tap “Add item” to begin.</span>
                  </div>
                )}
                {fields.map(({ key, name }, index) => <MobileItemCard key={key} name={name} index={index} {...rowProps} />)}
              </div>

              <div className="qi-foot">
                <button type="button" className="qi-add" onClick={() => add({ quantity: 1, discount: 0 })}>
                  <PlusOutlined /> Add item
                </button>
                <span className="qi-sum">
                  {itemCount} item{itemCount === 1 ? "" : "s"} · subtotal<b>{rupees(subTotal || 0)}</b>
                </span>
              </div>
            </>
          );
        }}
      </Form.List>
    </FormSection>
  );
};

export default QuotationItems;
