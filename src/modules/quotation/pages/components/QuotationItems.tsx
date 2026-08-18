import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Form, AutoComplete, Input, InputNumber, Row, Col, Spin } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import { getProducts } from "@/modules/products/redux/productActions";

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

const tokens = {
  navy: "#0F1F3D", navyMid: "#1A3560", surface: "var(--muted)", surfaceCard: "var(--card)",
  border: "var(--border)", borderFocus: "#3B6FE8", accent: "#3B6FE8", accentLight: "#EBF0FD",
  text: "var(--foreground)", textMuted: "var(--muted-foreground)", textLight: "var(--muted-foreground)",
  red: "#EF4444", redLight: "#FEF2F2",
  green: "#10B981", greenLight: "#ECFDF5",
  radius: "12px", radiusSm: "8px",
  shadow: "0 1px 3px rgba(15,31,61,0.06), 0 4px 16px rgba(15,31,61,0.06)",
};

const injectStyles = () => {
  const id = "qi-premium-styles";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    .qi-card .ant-card {
      border-radius: ${tokens.radius} !important;
      border: 1px solid ${tokens.border} !important;
      box-shadow: ${tokens.shadow} !important;
      overflow: hidden;
    }
    .qi-card .ant-card-head {
      background: linear-gradient(135deg, ${tokens.navy} 0%, ${tokens.navyMid} 100%) !important;
      border-bottom: none !important;
      padding: 0 !important;
      min-height: unset !important;
    }
    .qi-card .ant-card-head-title { padding: 0 !important; }
    .qi-card .ant-card-body { padding: 0 !important; }

    /* Form items in table */
    .qi-card .ant-form-item { margin-bottom: 0 !important; }
    .qi-card .ant-form-item-explain { font-size: 11px; }

    /* Inputs */
    .qi-card .ant-input,
    .qi-card .ant-input-number,
    .qi-card .ant-input-number-input,
    .qi-card .ant-select-selector {
      border-radius: 6px !important;
      border-color: ${tokens.border} !important;
      background: ${tokens.surface} !important;
      font-size: 13px !important;
      color: ${tokens.text} !important;
      transition: all 0.15s ease !important;
    }
    .qi-card .ant-input:focus,
    .qi-card .ant-input-number-focused,
    .qi-card .ant-select-focused .ant-select-selector {
      border-color: ${tokens.borderFocus} !important;
      box-shadow: 0 0 0 2px rgba(59,111,232,0.10) !important;
      background: #fff !important;
    }
    .qi-card .ant-input-number-disabled,
    .qi-card .ant-input-number-disabled .ant-input-number-input {
      background: #F0F5FF !important;
      color: ${tokens.accent} !important;
      font-weight: 600 !important;
      cursor: default !important;
    }

    /* ─── Desktop table ─────────────────────────── */
    .qi-table-wrap { display: block; overflow-x: auto; }
    .qi-cards-wrap { display: none; }

    .qi-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 680px;
    }
    .qi-table thead tr {
      background: ${tokens.surface};
      border-bottom: 2px solid ${tokens.border};
    }
    .qi-table th {
      padding: 12px 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: ${tokens.textMuted};
      white-space: nowrap;
    }
    .qi-table tbody tr {
      border-bottom: 1px solid ${tokens.border};
      transition: background 0.12s ease;
    }
    .qi-table tbody tr:last-child { border-bottom: none; }
    .qi-table tbody tr:hover { background: #FAFBFF; }
    .qi-table td { padding: 8px 10px; vertical-align: middle; }
    .qi-table td.qi-row-num {
      width: 36px;
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      color: ${tokens.textLight};
    }
    .qi-table td.qi-action-cell { width: 44px; text-align: center; }

    /* ─── Mobile cards ──────────────────────────── */
    @media (max-width: 767px) {
      .qi-table-wrap { display: none; }
      .qi-cards-wrap { display: block; padding: 12px 16px; }
    }

    .qi-item-card {
      background: ${tokens.surface};
      border: 1px solid ${tokens.border};
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
      position: relative;
      transition: box-shadow 0.15s ease;
    }
    .qi-item-card:hover { box-shadow: 0 2px 12px rgba(59,111,232,0.08); }
    .qi-item-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .qi-item-num {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: ${tokens.accent};
      background: ${tokens.accentLight};
      border: 1px solid #C7D8FA;
      border-radius: 20px;
      padding: 3px 12px;
    }
    .qi-item-card .ant-form-item { margin-bottom: 10px !important; }
    .qi-item-card .ant-form-item-label > label {
      font-size: 11px !important;
      font-weight: 600 !important;
      letter-spacing: 0.4px !important;
      text-transform: uppercase !important;
      color: ${tokens.textMuted} !important;
    }

    /* Computed totals strip (mobile) */
    .qi-totals-strip {
      display: flex;
      gap: 8px;
      margin-top: 4px;
      padding-top: 12px;
      border-top: 1px dashed ${tokens.border};
    }
    .qi-total-chip {
      flex: 1;
      background: #fff;
      border: 1px solid ${tokens.border};
      border-radius: 8px;
      padding: 8px 10px;
      text-align: center;
    }
    .qi-total-chip.accent {
      background: ${tokens.accentLight};
      border-color: #C7D8FA;
    }
    .qi-total-chip-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: ${tokens.textLight};
      margin-bottom: 3px;
    }
    .qi-total-chip.accent .qi-total-chip-label { color: ${tokens.accent}; }
    .qi-total-chip-value {
      font-size: 15px;
      font-weight: 700;
      color: ${tokens.text};
    }
    .qi-total-chip.accent .qi-total-chip-value { color: ${tokens.accent}; }

    /* Empty state */
    .qi-empty {
      text-align: center;
      padding: 40px 20px;
      color: ${tokens.textLight};
    }
    .qi-empty-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      background: ${tokens.surface};
      border: 2px dashed ${tokens.border};
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Add item button */
    .qi-add-btn-wrap {
      padding: 16px;
      border-top: 1px solid ${tokens.border};
    }
    .qi-add-btn-wrap .ant-btn-dashed {
      border-radius: 8px !important;
      border-color: ${tokens.accent} !important;
      color: ${tokens.accent} !important;
      font-weight: 600 !important;
      height: 40px !important;
      font-size: 13.5px !important;
      transition: all 0.15s ease !important;
    }
    .qi-add-btn-wrap .ant-btn-dashed:hover {
      background: ${tokens.accentLight} !important;
    }
    .qi-delete-btn.ant-btn-dangerous {
      border-radius: 6px !important;
      opacity: 0.6;
      transition: opacity 0.15s ease !important;
    }
    .qi-delete-btn.ant-btn-dangerous:hover { opacity: 1 !important; }
  `;
  document.head.appendChild(s);
};
injectStyles();

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
          placeholder="Item name"
          size="small"
          options={itemOptions}
          onSearch={onItemNameSearch}
          onSelect={(value, option) => onItemSelect(value, option as Partial<ItemOption>, index)}
          filterOption={false}
          notFoundContent={searchLoading ? <Spin size="small" /> : "Type to search products"}
          style={{ width: "100%", minWidth: 140 }}
        />
      </Form.Item>
    </td>
    <td>
      <Form.Item name={[name, "hsn_code"]} rules={[{ required: true, message: "Required" }]}>
        <Input placeholder="HSN" size="small" />
      </Form.Item>
    </td>
    <td>
      <Form.Item name={[name, "quantity"]} rules={[{ required: true, message: "Req." }]}>
        <InputNumber min={1} style={{ width: "100%" }} size="small" onChange={() => onQtyChange(index)} />
      </Form.Item>
    </td>
    <td>
      {/* Unit is populated exclusively from onItemSelect above. No onChange
          here — the user can still type/edit freely, but typing never
          re-derives the value from the catalog. */}
      <Form.Item name={[name, "unit"]} rules={[{ required: true, message: "Required" }]}>
        <Input placeholder="Unit (e.g. pcs)" size="small" />
      </Form.Item>
    </td>
    <td>
      <Form.Item name={[name, "price"]} rules={[{ required: true, message: "Req." }]}>
        <InputNumber min={0} step={0.01} style={{ width: "100%" }} size="small" onChange={() => onPriceChange(index)} />
      </Form.Item>
    </td>
    <td>
      <Form.Item name={[name, "discount"]}>
        <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} size="small" onChange={() => onDiscountChange(index)} />
      </Form.Item>
    </td>
    <td>
      <Form.Item name={[name, "discounted_price"]}>
        <InputNumber min={0} step={0.01} style={{ width: "100%" }} size="small" disabled />
      </Form.Item>
    </td>
    <td>
      <Form.Item name={[name, "total"]}>
        <InputNumber min={0} step={0.01} style={{ width: "100%" }} size="small" disabled />
      </Form.Item>
    </td>
    <td className="qi-action-cell">
      <Button className="qi-delete-btn" danger size="small" icon={<DeleteOutlined />}
        onClick={() => onRemove(name)} />
    </td>
  </tr>
));
DesktopItemRow.displayName = "DesktopItemRow";

const MobileItemCard: React.FC<ItemRowProps> = React.memo(({
  name, index, itemOptions, searchLoading, onItemSelect, onItemNameSearch, onQtyChange, onPriceChange, onDiscountChange, onRemove,
}) => {
  const form = Form.useFormInstance();
  return (
    <div className="qi-item-card">
      <div className="qi-item-card-header">
        <span className="qi-item-num">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/></svg>
          Item {index + 1}
        </span>
        <Button className="qi-delete-btn" danger size="small" icon={<DeleteOutlined />}
          onClick={() => onRemove(name)} />
      </div>

      <Form.Item label="Item Name" name={[name, "itemName"]} rules={[{ required: true, message: "Please enter item name" }]}>
        <AutoComplete
          placeholder="Type item name…"
          options={itemOptions}
          onSearch={onItemNameSearch}
          onSelect={(value, option) => onItemSelect(value, option as Partial<ItemOption>, index)}
          filterOption={false}
          notFoundContent={searchLoading ? <Spin size="small" /> : "Type to search products"}
          style={{ width: "100%" }}
        />
      </Form.Item>

      <Row gutter={12}>
        <Col span={10}>
          <Form.Item label="HSN Code" name={[name, "hsn_code"]} rules={[{ required: true, message: "Required" }]}>
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
            <Input placeholder="Unit (e.g. pcs)" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item label="Price (₹)" name={[name, "price"]} rules={[{ required: true, message: "Required" }]}>
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} onChange={() => onPriceChange(index)} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Discount (%)" name={[name, "discount"]} rules={[{ required: true, message: "Required" }]}>
            <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} onChange={() => onDiscountChange(index)} />
          </Form.Item>
        </Col>
      </Row>

      {/* Scoped to this row's own path so it re-renders on this row's total
          changing, without needing the parent to pass live values as props
          (which would defeat the memoization above). */}
      <Form.Item
        noStyle
        shouldUpdate={(prev, cur) =>
          prev.items?.[index]?.discounted_price !== cur.items?.[index]?.discounted_price ||
          prev.items?.[index]?.total !== cur.items?.[index]?.total
        }
      >
        {() => {
          const discounted = form.getFieldValue(["items", index, "discounted_price"]) || 0;
          const total = form.getFieldValue(["items", index, "total"]) || 0;
          return (
            <div className="qi-totals-strip">
              <div className="qi-total-chip">
                <div className="qi-total-chip-label">Net Price</div>
                <div className="qi-total-chip-value">₹{discounted}</div>
              </div>
              <div className="qi-total-chip accent">
                <div className="qi-total-chip-label">Total</div>
                <div className="qi-total-chip-value">₹{total}</div>
              </div>
            </div>
          );
        }}
      </Form.Item>

      {/* Hidden fields keep values synced */}
      <Form.Item name={[name, "discounted_price"]} hidden><InputNumber /></Form.Item>
      <Form.Item name={[name, "total"]} hidden><InputNumber /></Form.Item>
    </div>
  );
});
MobileItemCard.displayName = "MobileItemCard";

const QuotationItems: React.FC = () => {
  const form = Form.useFormInstance();
  const dispatch = useDispatch();

  // ─── Product catalog: real server-side search-as-you-type ─────────────
  // Replaces both the old hardcoded mock list AND the earlier "fetch 100
  // products once, filter client-side" version — that capped out at 100
  // products for larger catalogs. Now every keystroke (debounced) queries
  // GET /product/list?search=... directly, same as CustomerDetails.tsx's
  // customer search in this same module. product_code doubles as hsn_code,
  // matching how this company treats it.
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
  // call to 400ms after typing stops, without recreating the debounce
  // timer (and losing pending calls) on every keystroke/render.
  const debouncedFetch = useRef(
    debounce((term: string) => {
      dispatch(getProducts({ search: term, limit: 20, page: 1 }) as any);
    }, 400),
  ).current;

  useEffect(() => () => debouncedFetch.cancel(), [debouncedFetch]);

  // ─── Search: item name -> candidate list ───────────────────
  const handleItemNameSearch = useCallback((value: string) => {
    if (!value.trim()) {
      setHasQuery(false);
      return;
    }
    setHasQuery(true);
    debouncedFetch(value.trim());
  }, [debouncedFetch]);

  /**
   * Resolves the concrete Item record for a selection coming from
   * AutoComplete. Prefers the item embedded on the option (fast path,
   * no extra lookup) and falls back to a name lookup against the
   * catalog if the option didn't carry the item for any reason.
   */
  const resolveSelectedItem = (value: string, option: Partial<ItemOption> | undefined): Item | undefined => {
    return option?.item ?? catalogItems.find((item) => item.name === value);
  };

  /**
   * Single source of truth for "an item was picked from AutoComplete".
   * This is the ONLY place that writes unit / hsn_code / price coming
   * from the catalog. It updates the specific row via form.setFieldsValue
   * and then re-runs the discount/total calculation for that row.
   */
  // Stable across renders (only ever recreated if `form` changes, which it
  // doesn't) — lets the memoized row components below actually bail out of
  // re-rendering when a *different* row is edited, instead of every row's
  // AutoComplete/InputNumber reconciling on every keystroke.
  const calculateAndUpdateSubTotal = useCallback(() => {
    const items: QuotationLineItem[] = form.getFieldValue("items") || [];
    const subTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    form.setFieldsValue({ subTotal: parseFloat(subTotal.toFixed(2)) });
  }, [form]);

  // Writes only the single field path that changed (rc-field-form updates
  // just that Field's subscribers) instead of replacing the whole `items`
  // array via setFieldsValue, which forces Form.List to re-invoke its
  // children() render-prop and rebuild every row.
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
  }, [form, handleItemChange]);

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
  // `handleRemove` itself never changes identity across renders — a fresh
  // closure here would break the memoized rows' prop-equality check for
  // every row, defeating the whole point of memoizing them.
  const removeRef = useRef<(index: number | number[]) => void>(() => {});
  const handleRemove = useCallback((name: number) => {
    removeRef.current(name);
    calculateAndUpdateSubTotal();
  }, [calculateAndUpdateSubTotal]);

  return (
    <div className="qi-card">
      <Card
        bordered={false}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Line Items</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11.5, marginTop: 2 }}>Add products / services to this quotation</div>
            </div>
          </div>
        }
      >
        <Form.List name="items">
          {(fields, { add, remove }) => {
            removeRef.current = remove;
            return (
              <>
                {/* ─── DESKTOP TABLE ─── */}
                <div className="qi-table-wrap">
                  <table className="qi-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>#</th>
                        <th style={{ minWidth: 160 }}>Item Name</th>
                        <th style={{ minWidth: 110 }}>HSN Code</th>
                        <th style={{ width: 80 }}>Qty</th>
                        <th style={{ width: 80 }}>Unit</th>
                        <th style={{ width: 100 }}>Price (₹)</th>
                        <th style={{ width: 100 }}>Disc. (%)</th>
                        <th style={{ width: 110 }}>Net Price</th>
                        <th style={{ width: 110 }}>Total (₹)</th>
                        <th style={{ width: 44 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.length === 0 ? (
                        <tr>
                          <td colSpan={9}>
                            <div className="qi-empty">
                              <div className="qi-empty-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tokens.textLight} strokeWidth="1.5">
                                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                                </svg>
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>No items yet</div>
                              <div style={{ fontSize: 12, marginTop: 4 }}>Click "Add Item" below to get started</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        fields.map(({ key, name }, index) => (
                          <DesktopItemRow
                            key={key}
                            name={name}
                            index={index}
                            itemOptions={itemOptions}
                            searchLoading={searchLoading}
                            onItemSelect={handleItemSelect}
                            onItemNameSearch={handleItemNameSearch}
                            onQtyChange={handleQtyChange}
                            onPriceChange={handlePriceChange}
                            onDiscountChange={handleDiscountChange}
                            onRemove={handleRemove}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ─── MOBILE CARDS ─── */}
                <div className="qi-cards-wrap">
                  {fields.length === 0 && (
                    <div className="qi-empty">
                      <div className="qi-empty-icon" style={{ margin: "0 auto 12px" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tokens.textLight} strokeWidth="1.5">
                          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                        </svg>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: tokens.textMuted }}>No items added yet</div>
                      <div style={{ fontSize: 12, color: tokens.textLight, marginTop: 4 }}>Tap "Add Item" to begin</div>
                    </div>
                  )}
                  {fields.map(({ key, name }, index) => (
                    <MobileItemCard
                      key={key}
                      name={name}
                      index={index}
                      itemOptions={itemOptions}
                      searchLoading={searchLoading}
                      onItemSelect={handleItemSelect}
                      onItemNameSearch={handleItemNameSearch}
                      onQtyChange={handleQtyChange}
                      onPriceChange={handlePriceChange}
                      onDiscountChange={handleDiscountChange}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>

                {/* ─── Add button ─── */}
                <div className="qi-add-btn-wrap">
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Item
                  </Button>
                </div>
              </>
            );
          }}
        </Form.List>
      </Card>
    </div>
  );
};

export default QuotationItems;