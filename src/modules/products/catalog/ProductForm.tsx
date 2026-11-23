import React, { useEffect, useMemo, useState } from "react";
import { AutoComplete, Form, Input, InputNumber, message, Modal, Spin } from "antd";
import { AppstoreOutlined, DownOutlined, HomeOutlined, PlusOutlined, RightOutlined, SaveOutlined, WarningOutlined } from "@ant-design/icons";
import { useAccess } from "@/permissions/useAccess";
import { CategoryPicker, WarehousePicker, useCategoryList, useWarehouseList } from "@/modules/stock/pickers";
import "@/modules/stock/stock.scss";
import { type CatalogProduct, type ProductInput, apiError, createProduct, getProduct, marginOf, nameCheck, rupees, updateProduct } from "./productsApi";

const GST_RATES = [0, 5, 12, 18, 28];
const COMMON_UNITS = ["NOS", "PCS", "MTR", "COIL", "KG", "BOX", "PKT", "SET", "DZN", "ROLL", "LTR"];

/** GST as one tap, or any other rate typed in. */
const GstPicker: React.FC<{ value?: number; onChange?: (v: number) => void }> = ({ value, onChange }) => (
  <div className="pc-gst" role="radiogroup" aria-label="GST rate">
    {GST_RATES.map((r) => (
      <button key={r} type="button" role="radio" aria-checked={value === r} className={value === r ? "on" : ""} onClick={() => onChange?.(r)}>
        {r}%
      </button>
    ))}
    <InputNumber
      min={0}
      max={100}
      step={0.25}
      value={GST_RATES.includes(Number(value)) ? null : value}
      placeholder="Other"
      onChange={(v) => v !== null && v !== undefined && onChange?.(Number(v))}
      style={{ width: 92 }}
      aria-label="Other GST rate"
      suffix="%"
    />
  </div>
);

type Values = {
  name: string;
  product_code?: string;
  unit?: string;
  price?: number | null;
  tax_percentage?: number;
  category_id?: number | null;
  description?: string;
  sku?: string;
  barcode?: string;
  cost_price?: number | null;
  minimum_stock?: number | null;
  image_url?: string;
  warehouse_id?: number | null;
  bin_location?: string;
  stock_quantity?: number | null;
};

/**
 * Add or edit a product. Everyday fields first (name, HSN, unit, price, GST,
 * category — a new category can be added right here); then where it's kept
 * (warehouse, rack / shelf, opening stock); SKU, barcode, cost and picture
 * under "More details". Warns while typing if another product already has
 * the name, since quotations find products by name. After a product exists,
 * its stock changes only through Receive / Move / Count.
 */
const ProductForm: React.FC<{
  open: boolean;
  product: CatalogProduct | null;
  units: string[];
  onClose: (saved: boolean) => void;
}> = ({ open, product, units, onClose }) => {
  const { can } = useAccess();
  const [form] = Form.useForm<Values>();
  const editing = !!product;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false);
  const [clash, setClash] = useState<{ id: number; name: string } | null>(null);
  const cats = useCategoryList(open && can("categories.view"));
  const whs = useWarehouseList(open && !editing && can("warehouses.view"));
  const canStock = can("stock.manage");
  const name = Form.useWatch("name", form);
  const price = Form.useWatch("price", form);
  const cost = Form.useWatch("cost_price", form);
  const opening = Form.useWatch("stock_quantity", form);

  // Fill the form: the whole product when editing (the list only has part of the description).
  useEffect(() => {
    if (!open) return;
    setClash(null);
    form.resetFields();
    if (!product) {
      setMore(false);
      form.setFieldsValue({ tax_percentage: 18, unit: "NOS" });
      return;
    }
    setLoading(true);
    getProduct(product.id)
      .then((full) => {
        const v: Values = {
          name: full?.name ?? product.name,
          product_code: full?.product_code ?? product.hsn ?? "",
          unit: full?.unit ?? product.unit ?? "",
          price: Number(full?.price ?? product.price),
          tax_percentage: Number(full?.tax_percentage ?? product.gst) || 0,
          category_id: full?.category_id ?? null,
          description: full?.description ?? product.description ?? "",
          sku: full?.sku ?? "",
          barcode: full?.barcode ?? "",
          cost_price: Number(full?.cost_price) || null,
          minimum_stock: Number(full?.minimum_stock) || null,
          image_url: full?.image_url ?? "",
        };
        form.setFieldsValue(v);
        setMore(!!(v.sku || v.barcode || v.cost_price || v.image_url));
      })
      .catch((e) => {
        message.error(apiError(e, "Couldn't open this product"));
        onClose(false);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  // New product: start in the default warehouse.
  useEffect(() => {
    if (open && !editing && whs.list?.length && !form.getFieldValue("warehouse_id")) {
      form.setFieldsValue({ warehouse_id: (whs.list.find((w) => w.is_default) ?? whs.list[0]).id });
    }
  }, [open, editing, whs.list, form]);

  // Warn while typing when another product already has this name.
  useEffect(() => {
    const n = String(name || "").trim();
    if (!open || n.length < 2) {
      setClash(null);
      return;
    }
    const t = setTimeout(() => {
      nameCheck(n, product?.id)
        .then(setClash)
        .catch(() => setClash(null));
    }, 400);
    return () => clearTimeout(t);
  }, [name, open, product?.id]);

  const unitOptions = useMemo(() => {
    const seen = new Set<string>();
    return [...units, ...COMMON_UNITS]
      .filter((u) => u && !seen.has(u.toUpperCase()) && seen.add(u.toUpperCase()))
      .map((u) => ({ value: u }));
  }, [units]);

  const margin = marginOf(Number(price) || 0, Number(cost) || 0);

  const save = async () => {
    let v: Values;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    if (clash) {
      message.warning(`"${clash.name}" is already in your products`);
      return;
    }
    const text = (s?: string) => String(s ?? "").trim();
    const body: ProductInput = {
      name: text(v.name),
      product_code: text(v.product_code),
      unit: text(v.unit),
      price: Number(v.price) || 0,
      tax_percentage: Number(v.tax_percentage) || 0,
      description: text(v.description),
      sku: text(v.sku),
      barcode: text(v.barcode),
      category_id: v.category_id ? Number(v.category_id) : null,
      cost_price: Number(v.cost_price) || 0,
      minimum_stock: Math.max(0, Math.round(Number(v.minimum_stock) || 0)),
      image_url: text(v.image_url),
    };
    setSaving(true);
    try {
      if (editing) {
        // Stock isn't edited here — it moves through Receive / Move / Count.
        const r = await updateProduct(product!.id, body);
        message.success(r?.message || "Product saved");
      } else {
        const fresh = Object.fromEntries(Object.entries(body).filter(([, x]) => x !== "" && x !== null)) as unknown as ProductInput;
        if (v.warehouse_id) fresh.warehouse_id = Number(v.warehouse_id);
        if (text(v.bin_location)) fresh.bin_location = text(v.bin_location);
        if (canStock && Number(v.stock_quantity) > 0) fresh.stock_quantity = Math.round(Number(v.stock_quantity));
        const r = await createProduct(fresh);
        message.success(r?.message || "Product added");
      }
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save this product"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onCancel={() => onClose(false)} footer={null} closable={false} width={660} destroyOnHidden className="pc-dialog" rootClassName="pc-portal" centered>
      <div className="pc-dlg-head">
        <span className="pc-thumb">
          <AppstoreOutlined />
        </span>
        <div>
          <h3>{editing ? "Edit product" : "Add a product"}</h3>
          <p>{editing ? product!.name : "It shows up in quotations and challans as soon as you save."}</p>
        </div>
        <button type="button" className="pc-x" onClick={() => onClose(false)} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="pc-dlg-body">
        {loading ? (
          <div className="pc-loading">
            <Spin />
          </div>
        ) : (
          <Form form={form} layout="vertical" requiredMark="optional" onFinish={save}>
            <Form.Item
              name="name"
              label="Product name"
              rules={[
                { required: true, whitespace: true, message: "Give the product a name" },
                { min: 2, message: "At least 2 letters" },
                { max: 255, message: "Keep it under 255 letters" },
              ]}
            >
              <Input placeholder="e.g. 1.5 SQMM HOUSE WIRE (90 MTR) POLYCAB" autoFocus maxLength={255} />
            </Form.Item>
            {clash && (
              <div className="pc-clash" role="alert">
                <WarningOutlined />
                <span>
                  <b>{clash.name}</b> is already in your products. Quotations find products by name, so use a different name — or edit that one instead.
                </span>
              </div>
            )}
            <div className="pc-grid">
              <Form.Item name="product_code" label="HSN code" extra="Many products can share one HSN." rules={[{ max: 100 }]}>
                <Input placeholder="e.g. 85446090" inputMode="numeric" maxLength={100} />
              </Form.Item>
              <Form.Item name="unit" label="Unit" rules={[{ max: 50 }]}>
                <AutoComplete options={unitOptions} placeholder="NOS, MTR, COIL…" filterOption={(i, o) => String(o?.value).toUpperCase().includes(i.toUpperCase())} />
              </Form.Item>
              <Form.Item name="price" label="Selling price" rules={[{ required: true, message: "Enter a price (0 is fine)" }]}>
                <InputNumber min={0} step={1} precision={2} prefix="₹" placeholder="0.00" />
              </Form.Item>
              <Form.Item name="tax_percentage" label="GST">
                <GstPicker />
              </Form.Item>
              {cats.list && (
                <Form.Item name="category_id" label="Category" className="full" extra={can("categories.create") ? "Pick one, or type a new name at the bottom of the list and Add." : undefined}>
                  <CategoryPicker
                    categories={cats.list}
                    canAdd={can("categories.create")}
                    onAdded={(c) => cats.setList((l) => [...(l || []), c])}
                    placeholder="No category"
                  />
                </Form.Item>
              )}
              <Form.Item name="description" label="Description" className="full" rules={[{ max: 2000 }]}>
                <Input.TextArea rows={2} placeholder="Shown under the item on quotations (optional)" maxLength={2000} showCount />
              </Form.Item>
            </div>

            {/* Where it's kept */}
            <div className="pc-sec-h" style={{ marginTop: 4 }}>
              <HomeOutlined /> Where it's kept <em>{editing ? "stock changes through Receive / Move / Count on its profile" : "optional"}</em>
            </div>
            <div className="pc-grid">
              {!editing && whs.list && (
                <Form.Item name="warehouse_id" label="Warehouse">
                  <WarehousePicker
                    warehouses={whs.list}
                    canAdd={can("warehouses.create")}
                    onAdded={(w) => whs.setList((l) => [...(l || []), w])}
                    allowClear
                    placeholder="Not in a warehouse"
                  />
                </Form.Item>
              )}
              {!editing && whs.list && (
                <Form.Item name="bin_location" label="Rack / shelf" rules={[{ max: 64 }]}>
                  <Input placeholder="e.g. Rack A-3" maxLength={64} />
                </Form.Item>
              )}
              {!editing && canStock && (
                <Form.Item
                  name="stock_quantity"
                  label="Opening stock"
                  extra={Number(opening) > 0 ? "Recorded as opening stock in the history." : "How many you have right now (whole number)."}
                >
                  <InputNumber min={0} step={1} precision={0} placeholder="0" />
                </Form.Item>
              )}
              <Form.Item name="minimum_stock" label="Low-stock alert at" extra="Warn when stock falls to this.">
                <InputNumber min={0} step={1} precision={0} placeholder="Off" />
              </Form.Item>
            </div>

            <button type="button" className="pc-more" onClick={() => setMore((m) => !m)} aria-expanded={more}>
              {more ? <DownOutlined /> : <RightOutlined />} More details <em>SKU, barcode, cost, picture</em>
            </button>
            {more && (
              <div className="pc-grid">
                <Form.Item name="sku" label="SKU" rules={[{ max: 100 }]}>
                  <Input placeholder="Your own code" maxLength={100} />
                </Form.Item>
                <Form.Item name="barcode" label="Barcode" rules={[{ max: 100 }]}>
                  <Input placeholder="EAN / UPC" maxLength={100} />
                </Form.Item>
                <Form.Item name="cost_price" label="Cost price" extra={margin === null ? "What you pay for it — shows your margin." : undefined}>
                  <InputNumber min={0} step={1} precision={2} prefix="₹" placeholder="0.00" />
                </Form.Item>
                <div>
                  {margin !== null && (
                    <div className={`pc-margin ${margin >= 0 ? "good" : "bad"}`} style={{ marginTop: 30 }}>
                      {Math.round(margin)}% margin · {rupees((Number(price) || 0) - (Number(cost) || 0))} a {String(form.getFieldValue("unit") || "unit").toLowerCase()}
                    </div>
                  )}
                </div>
                <Form.Item name="image_url" label="Picture link" className="full" rules={[{ type: "url", message: "Paste a full link (https://…)" }, { max: 500 }]}>
                  <Input placeholder="https://…" maxLength={500} />
                </Form.Item>
              </div>
            )}
          </Form>
        )}
      </div>
      <div className="pc-dlg-foot">
        <span className="pc-foot-gap" />
        <button type="button" className="pc-btn ghost" onClick={() => onClose(false)} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="pc-btn primary" onClick={save} disabled={saving || loading || !!clash}>
          {saving ? <Spin size="small" /> : editing ? <SaveOutlined /> : <PlusOutlined />} {editing ? "Save changes" : "Add product"}
        </button>
      </div>
    </Modal>
  );
};

export default ProductForm;
