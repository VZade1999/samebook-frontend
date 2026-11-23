import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Col, DatePicker, Drawer, Form, Input, InputNumber, Row, Select, Spin, message } from "antd";
import { CloseOutlined, DeleteOutlined, InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getCatalog, type CatalogProduct } from "@/modules/products/catalog/productsApi";
import { useWarehouseList } from "@/modules/stock/pickers";
import { type PoDetail, type PoPreview, type SupplierOption, amendPo, apiError, previewPo, savePo, supplierOptions } from "./api";
import { MSME_TYPE, TAX_TYPE, rs, rs2 } from "./format";

export interface EditorLine {
  key: string;
  po_item_id?: number | null;
  product_id?: number | null;
  item_name: string;
  hsn_code?: string | null;
  unit?: string | null;
  qty?: number | null;
  rate?: number | null;
  discount_percent?: number | null;
  gst_rate?: number | null;
  /** Goods already arrived (amendments: the quantity can't go below it). */
  received?: number;
}
export interface EditorPreset {
  supplier_id?: number;
  items?: Omit<EditorLine, "key">[];
  /** Ordered for a customer quotation ("Order from supplier"). */
  quotation?: { id: number; number: string; customer_name: string | null } | null;
  notes?: string;
}

let seq = 0;
const newKey = () => `l${Date.now()}${++seq}`;
const blank = (): EditorLine => ({ key: newKey(), item_name: "", qty: null, rate: null, discount_percent: 0, gst_rate: null });
const GST_SLABS = [0, 5, 12, 18, 28, 40];

/** Product search for one line (the company's catalogue). */
const ProductCell: React.FC<{ value: EditorLine; onPick: (p: CatalogProduct | null) => void; disabled?: boolean }> = ({ value, onPick, disabled }) => {
  const [options, setOptions] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const turn = useRef(0);
  const look = (text: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const mine = ++turn.current;
      setLoading(true);
      try {
        const d = await getCatalog({ search: text.trim(), limit: 20, sort: text.trim() ? "name" : "recent" });
        if (mine === turn.current) setOptions(d.products);
      } catch {
        if (mine === turn.current) setOptions([]);
      } finally {
        if (mine === turn.current) setLoading(false);
      }
    }, 280);
  };
  return (
    <Select
      showSearch
      allowClear
      disabled={disabled}
      filterOption={false}
      placeholder="Pick from your products…"
      value={value.product_id ?? undefined}
      onSearch={look}
      onOpenChange={(o) => o && !options.length && look("")}
      notFoundContent={loading ? <Spin size="small" /> : "No products found"}
      onClear={() => onPick(null)}
      onChange={(id) => {
        const p = options.find((x) => x.id === id);
        if (p) onPick(p);
      }}
      options={[
        ...(value.product_id && !options.some((o) => o.id === value.product_id) ? [{ value: value.product_id, label: value.item_name }] : []),
        ...options.map((p) => ({
          value: p.id,
          label: (
            <span className="pu-opt">
              <span>{p.name}</span>
              <em>{[p.hsn ? `HSN ${p.hsn}` : null, `${p.stock} in stock`, p.cost ? `last cost ${rs(p.cost)}` : null].filter(Boolean).join(" · ")}</em>
            </span>
          ),
        })),
      ]}
      style={{ width: "100%" }}
      aria-label="Product"
    />
  );
};

/**
 * Make, edit or amend a purchase order. The figures on the right are the
 * server's own (preview), so what you see is exactly what gets saved.
 */
const PoEditor: React.FC<{
  open: boolean;
  mode: "new" | "edit" | "amend";
  po?: PoDetail | null;
  preset?: EditorPreset | null;
  onClose: (saved?: PoDetail) => void;
}> = ({ open, mode, po, preset, onClose }) => {
  const [form] = Form.useForm();
  const [lines, setLines] = useState<EditorLine[]>([blank()]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [supplier, setSupplier] = useState<SupplierOption | null>(null);
  const [preview, setPreview] = useState<PoPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | "draft" | "submit" | "amend">(null);
  const { list: warehouses } = useWarehouseList(open);
  const values = Form.useWatch([], form);
  const supTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const findSuppliers = useCallback((q: string) => {
    clearTimeout(supTimer.current);
    supTimer.current = setTimeout(() => supplierOptions({ q }).then(setSuppliers).catch(() => setSuppliers([])), 250);
  }, []);

  // Fill the form when it opens.
  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setPreviewError(null);
    form.resetFields();
    if (po) {
      form.setFieldsValue({
        supplier_id: po.supplier_id,
        supplier_address_id: po.supplier?.address?.id ?? undefined,
        supplier_ref: po.supplier_ref,
        po_date: po.po_date ? dayjs(po.po_date) : dayjs(),
        expected_date: po.expected_date ? dayjs(po.expected_date) : null,
        warehouse_id: po.warehouse_id ?? undefined,
        freight_charges: po.freight_charges || null,
        payment_terms: po.payment_terms,
        delivery_terms: po.delivery_terms,
        notes: po.notes,
        terms_conditions: po.terms_conditions,
      });
      setLines(
        po.lines.map((l) => ({
          key: newKey(),
          po_item_id: l.id,
          product_id: l.product_id,
          item_name: l.item_name,
          hsn_code: l.hsn_code,
          unit: l.unit,
          qty: l.qty,
          rate: l.rate,
          discount_percent: l.discount_percent,
          gst_rate: l.gst_rate,
          received: l.received,
        })),
      );
      supplierOptions({ id: po.supplier_id }).then((s) => {
        setSuppliers(s);
        setSupplier(s[0] || null);
      });
    } else {
      form.setFieldsValue({ po_date: dayjs(), supplier_id: preset?.supplier_id, notes: preset?.notes });
      setLines(preset?.items?.length ? preset.items.map((i) => ({ ...i, key: newKey() })) : [blank()]);
      if (preset?.supplier_id) {
        supplierOptions({ id: preset.supplier_id }).then((s) => {
          setSuppliers(s);
          setSupplier(s[0] || null);
          if (s[0]) form.setFieldsValue({ supplier_address_id: s[0].addresses.find((a) => a.is_primary)?.id });
        });
      } else {
        setSupplier(null);
        findSuppliers("");
      }
    }
  }, [open, po, preset, form, findSuppliers]);

  // New PO: deliver to the default warehouse.
  useEffect(() => {
    if (open && !po && warehouses?.length && !form.getFieldValue("warehouse_id")) {
      form.setFieldsValue({ warehouse_id: (warehouses.find((w) => w.is_default) || warehouses[0]).id });
    }
  }, [open, po, warehouses, form]);

  const payload = useCallback(
    (v: any) => ({
      supplier_id: v?.supplier_id,
      supplier_address_id: v?.supplier_address_id || null,
      supplier_ref: v?.supplier_ref || null,
      po_date: v?.po_date ? dayjs(v.po_date).format("YYYY-MM-DD") : undefined,
      expected_date: v?.expected_date ? dayjs(v.expected_date).format("YYYY-MM-DD") : null,
      warehouse_id: v?.warehouse_id || null,
      freight_charges: v?.freight_charges || 0,
      ...(v?.payment_terms !== undefined && v?.payment_terms !== null ? { payment_terms: v.payment_terms } : {}),
      ...(v?.delivery_terms !== undefined && v?.delivery_terms !== null ? { delivery_terms: v.delivery_terms } : {}),
      notes: v?.notes || null,
      ...(v?.terms_conditions !== undefined && v?.terms_conditions !== null ? { terms_conditions: v.terms_conditions } : {}),
      items: lines
        .filter((l) => l.item_name.trim())
        .map((l) => ({
          po_item_id: l.po_item_id || undefined,
          product_id: l.product_id || null,
          item_name: l.item_name.trim(),
          hsn_code: l.hsn_code || null,
          unit: l.unit || null,
          qty: l.qty,
          rate: l.rate ?? 0,
          discount_percent: l.discount_percent ?? 0,
          gst_rate: l.gst_rate ?? undefined,
        })),
    }),
    [lines],
  );

  // Live figures from the server (debounced).
  const previewKey = JSON.stringify(payload(values));
  useEffect(() => {
    if (!open) return;
    const p = JSON.parse(previewKey);
    if (!p.supplier_id || !p.items.some((i: any) => Number(i.qty) > 0)) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const t = setTimeout(() => {
      previewPo(p)
        .then((r) => {
          setPreview(r);
          setPreviewError(null);
          // A new PO takes the terms worked out for this supplier, unless typed.
          if (mode === "new") {
            const f = form.getFieldsValue(["payment_terms", "delivery_terms", "terms_conditions"]);
            const fill: any = {};
            if (!f.payment_terms && r.payment_terms) fill.payment_terms = r.payment_terms;
            if (!f.delivery_terms && r.delivery_terms) fill.delivery_terms = r.delivery_terms;
            if (!f.terms_conditions && r.terms_conditions) fill.terms_conditions = r.terms_conditions;
            if (Object.keys(fill).length) form.setFieldsValue(fill);
          }
        })
        .catch((e) => {
          setPreview(null);
          setPreviewError(apiError(e, "Couldn't work the totals out"));
        });
    }, 450);
    return () => clearTimeout(t);
  }, [previewKey, open, mode, form]);

  const setLine = (key: string, patch: Partial<EditorLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const pick = (key: string, p: CatalogProduct | null) => {
    if (!p) return setLine(key, { product_id: null });
    setLine(key, {
      product_id: p.id,
      item_name: p.name,
      hsn_code: p.hsn,
      unit: p.unit,
      gst_rate: p.gst > 0 ? p.gst : 18,
      ...(p.cost > 0 ? { rate: p.cost } : {}),
    });
  };

  const save = async (kind: "draft" | "submit" | "amend") => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const body = payload(form.getFieldsValue(true));
    if (!body.items.length) return message.warning("Add at least one item");
    const bad = body.items.find((i) => !(Number(i.qty) > 0));
    if (bad) return message.warning(`${bad.item_name}: enter a quantity`);
    setSaving(kind);
    try {
      let saved: PoDetail;
      if (kind === "amend" && po) saved = await amendPo(po.id, { ...body, amend_note: form.getFieldValue("amend_note") || undefined });
      else saved = await savePo(mode === "edit" && po ? po.id : null, { ...body, submit: kind === "submit", ...(mode === "new" && preset?.quotation ? { quotation_id: preset.quotation.id } : {}) });
      message.success(saved.message || "Saved");
      onClose(saved);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the purchase order"));
    } finally {
      setSaving(null);
    }
  };

  const address = supplier?.addresses || [];
  const intra = preview?.tax_type === "INTRA_STATE";
  const title = mode === "amend" ? `Amend ${po?.po_number}` : mode === "edit" ? `Edit ${po?.po_number}` : "New purchase order";
  const needsApproval = preview?.approval === "PENDING_APPROVAL";
  const amountOf = useMemo(() => {
    const filled = lines.filter((l) => l.item_name.trim());
    const map = new Map<string, { amount: number; tax: number }>();
    if (preview && preview.lines.length === filled.length) filled.forEach((l, i) => map.set(l.key, preview.lines[i]));
    return map;
  }, [lines, preview]);

  return (
    <Drawer
      open={open}
      onClose={() => onClose()}
      size="min(1120px, 100vw)"
      closable={false}
      title={null}
      rootClassName="pu-drawer"
      destroyOnHidden
      maskClosable={false}
    >
      <div className="pu-dhead" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <p>{mode === "amend" ? "The supplier gets the amended PDF as Amendment No. " + ((po?.revision || 0) + 1) + ". Lines with goods received keep at least that much." : "To your supplier, in Indian GST format."}</p>
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={() => onClose()} aria-label="Close" />
      </div>
      <div className="pu-sec">
        <Form form={form} layout="vertical" requiredMark="optional" className="pu-editor">
          <Row gutter={14}>
            <Col xs={24} md={12}>
              <Form.Item name="supplier_id" label="Supplier" rules={[{ required: true, message: "Choose the supplier" }]}>
                <Select
                  showSearch
                  filterOption={false}
                  disabled={mode === "amend"}
                  placeholder="Search your suppliers…"
                  onSearch={findSuppliers}
                  onChange={(id) => {
                    const s = suppliers.find((x) => x.id === id) || null;
                    setSupplier(s);
                    form.setFieldsValue({ supplier_address_id: s?.addresses.find((a) => a.is_primary)?.id, payment_terms: undefined });
                  }}
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: (
                      <span className="pu-opt">
                        <span>{s.name}</span>
                        <em>{[s.gstin || "Unregistered", s.state, s.msme_type ? `MSME ${MSME_TYPE[s.msme_type]}` : null].filter(Boolean).join(" · ")}</em>
                      </span>
                    ),
                  }))}
                  notFoundContent="No supplier found — add it on the Suppliers page"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="supplier_address_id" label="Supplier's address">
                <Select
                  allowClear
                  placeholder={supplier ? (address.length ? "Main address" : "No address saved") : "Choose the supplier first"}
                  options={address.map((a) => ({ value: a.id, label: `${a.label || "Address"} — ${a.line}${a.gstin ? ` (GSTIN ${a.gstin})` : ""}` }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="po_date" label="PO date" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} format="D MMM YYYY" allowClear={false} disabledDate={(d) => !!d && d.isAfter(dayjs(), "day")} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="expected_date" label="Expected delivery">
                <DatePicker style={{ width: "100%" }} format="D MMM YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="warehouse_id" label="Deliver to (warehouse)">
                <Select placeholder="Choose a warehouse" options={(warehouses || []).map((w) => ({ value: w.id, label: `${w.name}${w.is_default ? " (default)" : ""}` }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="supplier_ref" label="Supplier's quotation / ref.">
                <Input maxLength={80} placeholder="e.g. SQ/123 dated 20 Nov" />
              </Form.Item>
            </Col>
          </Row>

          {mode === "new" && preset?.quotation && (
            <div className="pu-note good" style={{ marginBottom: 12 }}>
              <InfoCircleOutlined />
              <span>
                For customer quotation <b>{preset.quotation.number}</b>
                {preset.quotation.customer_name ? ` (${preset.quotation.customer_name})` : ""} — the lines are what's still to send after your stock and open POs. The PO stays linked to it.
              </span>
            </div>
          )}
          {preview && (
            <div className="pu-note" style={{ marginBottom: 12 }}>
              <InfoCircleOutlined />
              <span>
                <b>{TAX_TYPE[preview.tax_type]}</b>
                {preview.place_of_supply ? ` — goods go to ${preview.place_of_supply}` : ""}
                {supplier?.state ? `, supplier in ${supplier.state}` : ""}.
                {preview.freight_charges > 0 && (preview.freight_gst ? " Freight carries GST like the goods." : " Freight is added without GST (Company setting).")}
              </span>
            </div>
          )}

          <div className="pu-items-wrap">
            <table className="pu-items">
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Item</th>
                  <th style={{ width: 100 }}>HSN</th>
                  <th style={{ width: 90 }}>Qty</th>
                  <th style={{ width: 70 }}>Unit</th>
                  <th style={{ width: 110 }}>Rate (₹)</th>
                  <th style={{ width: 76 }}>Disc %</th>
                  <th style={{ width: 90 }}>GST %</th>
                  <th style={{ width: 110, textAlign: "right" }}>Amount</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const fig = amountOf.get(l.key);
                  const locked = !!l.received && l.received > 0;
                  return (
                    <tr key={l.key}>
                      <td>
                        <ProductCell value={l} onPick={(p) => pick(l.key, p)} disabled={locked} />
                        <Input
                          style={{ marginTop: 4 }}
                          maxLength={255}
                          placeholder="…or type the item name"
                          value={l.item_name}
                          onChange={(e) => setLine(l.key, { item_name: e.target.value })}
                        />
                        {locked && <span className="sub">{l.received} received — can't go below</span>}
                      </td>
                      <td>
                        <Input maxLength={8} value={l.hsn_code ?? ""} onChange={(e) => setLine(l.key, { hsn_code: e.target.value.replace(/\D/g, "") })} />
                      </td>
                      <td>
                        <InputNumber min={0} precision={l.product_id ? 0 : 3} value={l.qty} onChange={(v) => setLine(l.key, { qty: v as number })} />
                      </td>
                      <td>
                        <Input maxLength={30} value={l.unit ?? ""} onChange={(e) => setLine(l.key, { unit: e.target.value })} placeholder="NOS" />
                      </td>
                      <td>
                        <InputNumber min={0} precision={2} value={l.rate} onChange={(v) => setLine(l.key, { rate: v as number })} />
                      </td>
                      <td>
                        <InputNumber min={0} max={100} precision={2} value={l.discount_percent} onChange={(v) => setLine(l.key, { discount_percent: v as number })} />
                      </td>
                      <td>
                        <Select
                          value={l.gst_rate ?? undefined}
                          placeholder="18"
                          onChange={(v) => setLine(l.key, { gst_rate: v })}
                          options={[...new Set([...GST_SLABS, ...(l.gst_rate !== null && l.gst_rate !== undefined ? [l.gst_rate] : [])])].sort((a, b) => a - b).map((r) => ({ value: r, label: `${r}%` }))}
                        />
                      </td>
                      <td className="r">
                        {fig ? rs2(fig.amount) : "—"}
                        {fig && fig.tax > 0 && <span className="sub">+{rs2(fig.tax)} GST</span>}
                      </td>
                      <td>
                        <Button type="text" danger icon={<DeleteOutlined />} disabled={locked || lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove line" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button className="pu-add" icon={<PlusOutlined />} onClick={() => setLines((ls) => [...ls, blank()])}>
            Add a line
          </Button>

          <div className="pu-editor-foot">
            <div>
              <Row gutter={14}>
                <Col xs={24} md={12}>
                  <Form.Item name="payment_terms" label="Payment terms">
                    <Input maxLength={200} placeholder="e.g. 30 days from receipt of goods and invoice" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="delivery_terms" label="Delivery terms">
                    <Input maxLength={200} placeholder="e.g. Door delivery, freight paid" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="freight_charges" label="Freight / packing (₹)" tooltip="Charged by the supplier with the goods — it carries GST like them">
                    <InputNumber min={0} precision={2} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item name="notes" label="Note to the supplier">
                    <Input maxLength={2000} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="terms_conditions" label="Terms & conditions (printed on the PO)">
                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 9 }} maxLength={5000} />
                  </Form.Item>
                </Col>
                {mode === "amend" && (
                  <Col xs={24}>
                    <Form.Item name="amend_note" label="What changed (for the history)">
                      <Input maxLength={200} placeholder="e.g. MCB quantity raised to 120" />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </div>
            <div className="pu-sumcard">
              {previewError ? (
                <div className="pu-note bad">{previewError}</div>
              ) : !preview ? (
                <p className="pu-muted">Choose the supplier and add items to see the GST and total.</p>
              ) : (
                <div className="pu-totals" style={{ maxWidth: "none" }}>
                  <div>
                    <span>Items</span>
                    <b>{rs2(preview.sub_total)}</b>
                  </div>
                  {preview.discount_amount > 0 && (
                    <div>
                      <span>Discount</span>
                      <b>−{rs2(preview.discount_amount)}</b>
                    </div>
                  )}
                  {preview.freight_charges > 0 && preview.freight_gst && (
                    <div>
                      <span>Freight / packing</span>
                      <b>{rs2(preview.freight_charges)}</b>
                    </div>
                  )}
                  <div>
                    <span>Taxable value</span>
                    <b>{rs2(preview.taxable_amount)}</b>
                  </div>
                  {intra ? (
                    <>
                      <div>
                        <span>CGST</span>
                        <b>{rs2(preview.cgst_amount)}</b>
                      </div>
                      <div>
                        <span>SGST</span>
                        <b>{rs2(preview.sgst_amount)}</b>
                      </div>
                    </>
                  ) : preview.tax_type === "INTER_STATE" ? (
                    <div>
                      <span>IGST</span>
                      <b>{rs2(preview.igst_amount)}</b>
                    </div>
                  ) : (
                    <div>
                      <span>GST</span>
                      <b>None</b>
                    </div>
                  )}
                  {preview.freight_charges > 0 && !preview.freight_gst && (
                    <div>
                      <span>Freight (no GST)</span>
                      <b>{rs2(preview.freight_charges)}</b>
                    </div>
                  )}
                  {Math.abs(preview.round_off) > 0 && (
                    <div>
                      <span>Round off</span>
                      <b>{preview.round_off > 0 ? "+" : "−"}{rs2(Math.abs(preview.round_off))}</b>
                    </div>
                  )}
                  <div className="grand">
                    <span>Total</span>
                    <b>{rs2(preview.grand_total)}</b>
                  </div>
                </div>
              )}
              <div className="pu-actions" style={{ marginTop: 14 }}>
                {mode === "amend" ? (
                  <Button type="primary" block loading={saving === "amend"} onClick={() => save("amend")}>
                    Save amendment
                  </Button>
                ) : (
                  <>
                    <Button type="primary" block loading={saving === "submit"} disabled={!!saving} onClick={() => save("submit")}>
                      {needsApproval ? "Save & send for approval" : "Save & approve"}
                    </Button>
                    <Button block loading={saving === "draft"} disabled={!!saving} onClick={() => save("draft")}>
                      Save as draft
                    </Button>
                  </>
                )}
              </div>
              {preview && mode !== "amend" && (
                <p className="pu-muted" style={{ marginTop: 8 }}>
                  {needsApproval ? "Someone who can approve purchase orders gets a notification." : "You can approve this yourself — it's ready to send once saved."}
                </p>
              )}
            </div>
          </div>
        </Form>
      </div>
    </Drawer>
  );
};

export default PoEditor;
