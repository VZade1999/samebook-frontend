import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Spin, message } from "antd";
import { DeleteOutlined, InfoCircleOutlined, PlusOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/api/axios";
import { StorageService } from "@/storage";
import {
  type BillDetail,
  type BillPreview,
  type Billable,
  type SupplierOption,
  type Unpaid,
  apiError,
  getBillable,
  getPos,
  getUnpaid,
  pay,
  previewBill,
  saveBill,
  supplierOptions,
} from "./api";
import { PAY_MODE, TAX_TYPE, day, qtyText, rs, rs2 } from "./format";

const GST_SLABS = [0, 5, 12, 18, 28, 40];
let seq = 0;
const key = () => `b${Date.now()}${++seq}`;
interface BillLine {
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
  /** PO lines: the most that can be billed (arrived, not billed yet). */
  max?: number;
}

/** Supplier search shared by both dialogs. */
const useSupplierSearch = () => {
  const [list, setList] = useState<SupplierOption[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const find = useCallback((q: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => supplierOptions({ q }).then(setList).catch(() => setList([])), 250);
  }, []);
  const load = useCallback((id: number) => supplierOptions({ id }).then((s) => setList((l) => [...s, ...l.filter((x) => x.id !== id)])), []);
  return { list, find, load };
};

// ── Enter a supplier bill ───────────────────────────────────────────────────

export const BillForm: React.FC<{ open: boolean; poId?: number | null; supplierId?: number | null; onClose: (saved?: BillDetail) => void }> = ({ open, poId, supplierId, onClose }) => {
  const [form] = Form.useForm();
  const sup = useSupplierSearch();
  const [lines, setLines] = useState<BillLine[]>([]);
  const [billable, setBillable] = useState<Billable | null>(null);
  const [pos, setPos] = useState<{ id: number; po_number: string }[]>([]);
  const [preview, setPreview] = useState<BillPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const values = Form.useWatch([], form);

  const loadPo = useCallback(
    async (id: number | null) => {
      setBillable(null);
      if (!id) return setLines([{ key: key(), item_name: "", qty: null, rate: null, discount_percent: 0, gst_rate: 18 }]);
      try {
        const b = await getBillable(id);
        setBillable(b);
        await sup.load(b.supplier_id);
        form.setFieldsValue({ supplier_id: b.supplier_id, po_id: id, freight_charges: b.freight_suggested || null, due_date: b.due_date_suggested ? dayjs(b.due_date_suggested) : null });
        setLines(
          b.lines.map((l) => ({ key: key(), po_item_id: l.po_item_id, product_id: l.product_id, item_name: l.item_name, hsn_code: l.hsn_code, unit: l.unit, qty: l.qty, rate: l.rate, discount_percent: l.discount_percent, gst_rate: l.gst_rate, max: l.qty })),
        );
        if (!b.lines.length) message.info(`Everything that arrived on ${b.po_number} is billed already`);
      } catch (e) {
        message.error(apiError(e, "Couldn't load the purchase order"));
      }
    },
    [form, sup],
  );

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setPreview(null);
    setPreviewError(null);
    form.setFieldsValue({ bill_date: dayjs() });
    if (poId) loadPo(poId);
    else {
      setLines([{ key: key(), item_name: "", qty: null, rate: null, discount_percent: 0, gst_rate: 18 }]);
      if (supplierId) {
        sup.load(supplierId);
        form.setFieldsValue({ supplier_id: supplierId });
      } else sup.find("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, poId, supplierId]);

  // The supplier's POs that have goods to bill.
  const supplier = values?.supplier_id;
  useEffect(() => {
    if (!open || !supplier) return setPos([]);
    getPos({ supplier_id: supplier, status: "ALL", limit: 50 })
      .then((r) => setPos(r.rows.filter((p) => ["PARTLY_RECEIVED", "RECEIVED", "CLOSED"].includes(p.status)).map((p) => ({ id: p.id, po_number: p.po_number }))))
      .catch(() => setPos([]));
  }, [open, supplier]);

  const payload = useCallback(
    (v: any) => ({
      supplier_id: v?.supplier_id,
      po_id: v?.po_id || null,
      bill_number: v?.bill_number || "",
      bill_date: v?.bill_date ? dayjs(v.bill_date).format("YYYY-MM-DD") : "",
      due_date: v?.due_date ? dayjs(v.due_date).format("YYYY-MM-DD") : null,
      freight_charges: v?.freight_charges || 0,
      bill_total: v?.bill_total ?? null,
      notes: v?.notes || null,
      apply_advance: !!v?.apply_advance,
      items: lines
        .filter((l) => l.item_name.trim() && Number(l.qty) > 0)
        .map((l) => ({ po_item_id: l.po_item_id || undefined, product_id: l.product_id || null, item_name: l.item_name.trim(), hsn_code: l.hsn_code || null, unit: l.unit || null, qty: l.qty, rate: l.rate ?? 0, discount_percent: l.discount_percent ?? 0, gst_rate: l.gst_rate ?? 18 })),
    }),
    [lines],
  );
  const pKey = JSON.stringify(payload(values));
  useEffect(() => {
    if (!open) return;
    const p = JSON.parse(pKey);
    if (!p.supplier_id || !p.bill_number || !p.bill_date || !p.items.length) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const t = setTimeout(() => {
      previewBill(p)
        .then((r) => {
          setPreview(r);
          setPreviewError(null);
          if (!form.getFieldValue("due_date") && r.due_date) form.setFieldsValue({ due_date: dayjs(r.due_date) });
        })
        .catch((e) => {
          setPreview(null);
          setPreviewError(apiError(e, "Couldn't work the bill out"));
        });
    }, 450);
    return () => clearTimeout(t);
  }, [pKey, open, form]);

  const setLine = (k: string, patch: Partial<BillLine>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));
  const submit = async () => {
    await form.validateFields();
    const body = payload(form.getFieldsValue(true));
    if (!body.items.length) return message.warning("Add at least one item with a quantity");
    setSaving(true);
    try {
      const r = await saveBill(body);
      message.success(r.message || "Bill saved");
      onClose(r);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the bill"));
    } finally {
      setSaving(false);
    }
  };

  const t = preview?.totals;
  return (
    <Modal open={open} title="Enter a supplier bill" onCancel={() => onClose()} onOk={submit} okText="Save bill" confirmLoading={saving} width={980} destroyOnHidden className="pu-modal" maskClosable={false}>
      <Form form={form} layout="vertical" requiredMark="optional" className="pu-editor">
        <Row gutter={12}>
          <Col xs={24} md={9}>
            <Form.Item name="supplier_id" label="Supplier" rules={[{ required: true, message: "Choose the supplier" }]}>
              <Select
                showSearch
                filterOption={false}
                disabled={!!poId}
                onSearch={sup.find}
                placeholder="Search your suppliers…"
                onChange={() => {
                  form.setFieldsValue({ po_id: null });
                  loadPo(null);
                }}
                options={sup.list.map((s) => ({ value: s.id, label: `${s.name}${s.gstin ? ` · ${s.gstin}` : ""}` }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={7}>
            <Form.Item name="po_id" label="Against purchase order">
              <Select allowClear disabled={!!poId} placeholder={pos.length ? "Pick a PO (fills the lines)" : "No PO with goods to bill"} options={pos.map((p) => ({ value: p.id, label: p.po_number }))} onChange={(v) => loadPo(v || null)} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="bill_number" label="Supplier's bill no." rules={[{ required: true, message: "Enter it" }]}>
              <Input maxLength={40} placeholder="GJ/1001" />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="bill_date" label="Bill date" rules={[{ required: true }]}>
              <DatePicker style={{ width: "100%" }} format="D MMM YYYY" allowClear={false} disabledDate={(d) => !!d && d.isAfter(dayjs(), "day")} />
            </Form.Item>
          </Col>
        </Row>

        {billable && (
          <div className="pu-note" style={{ marginBottom: 10 }}>
            <InfoCircleOutlined />
            <span>
              Lines from {billable.po_number}: what arrived and isn't billed yet, at the PO's rates. Change a rate if the supplier billed differently — you'll see the difference.
            </span>
          </div>
        )}
        <div className="pu-items-wrap">
          <table className="pu-items">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Item</th>
                <th style={{ width: 96 }}>HSN</th>
                <th style={{ width: 96 }}>Qty</th>
                <th style={{ width: 110 }}>Rate (₹)</th>
                <th style={{ width: 76 }}>Disc %</th>
                <th style={{ width: 90 }}>GST %</th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key}>
                  <td>
                    <Input value={l.item_name} disabled={!!l.po_item_id} maxLength={255} placeholder="Item" onChange={(e) => setLine(l.key, { item_name: e.target.value })} />
                    {l.max !== undefined && <span className="sub">up to {qtyText(l.max, l.unit)}</span>}
                  </td>
                  <td>
                    <Input value={l.hsn_code ?? ""} maxLength={8} onChange={(e) => setLine(l.key, { hsn_code: e.target.value.replace(/\D/g, "") })} />
                  </td>
                  <td>
                    <InputNumber min={0} max={l.max} precision={l.product_id ? 0 : 3} value={l.qty} onChange={(v) => setLine(l.key, { qty: v as number })} />
                  </td>
                  <td>
                    <InputNumber min={0} precision={2} value={l.rate} onChange={(v) => setLine(l.key, { rate: v as number })} />
                  </td>
                  <td>
                    <InputNumber min={0} max={100} precision={2} value={l.discount_percent} onChange={(v) => setLine(l.key, { discount_percent: v as number })} />
                  </td>
                  <td>
                    <Select value={l.gst_rate ?? 18} onChange={(v) => setLine(l.key, { gst_rate: v })} options={[...new Set([...GST_SLABS, l.gst_rate ?? 18])].sort((a, b) => a - b).map((r) => ({ value: r, label: `${r}%` }))} />
                  </td>
                  <td>
                    <Button type="text" danger icon={<DeleteOutlined />} disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove line" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!billable && (
          <Button className="pu-add" icon={<PlusOutlined />} onClick={() => setLines((ls) => [...ls, { key: key(), item_name: "", qty: null, rate: null, discount_percent: 0, gst_rate: 18 }])}>
            Add a line
          </Button>
        )}

        <div className="pu-editor-foot">
          <div>
            <Row gutter={12}>
              <Col xs={12} md={8}>
                <Form.Item name="freight_charges" label="Freight / packing (₹)">
                  <InputNumber min={0} precision={2} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item name="due_date" label="Due date" tooltip="Bill date + the supplier's credit days, unless you change it">
                  <DatePicker style={{ width: "100%" }} format="D MMM YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="bill_total" label="Total on the supplier's bill" tooltip="Type it to check your lines add up to the same">
                  <InputNumber min={0} precision={2} style={{ width: "100%" }} prefix="₹" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="notes" label="Notes">
                  <Input maxLength={2000} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="apply_advance" valuePropName="checked" style={{ marginBottom: 0 }}>
                  <Checkbox>Use any advance already paid to this supplier</Checkbox>
                </Form.Item>
              </Col>
            </Row>
          </div>
          <div className="pu-sumcard">
            {previewError ? (
              <div className="pu-note bad">{previewError}</div>
            ) : !t ? (
              <p className="pu-muted">Fill the supplier, bill number and lines to see the GST and total.</p>
            ) : (
              <>
                {(preview?.duplicate || preview?.warnings.length) && (
                  <div className="pu-notes">
                    {preview?.duplicate && (
                      <div className="pu-note bad">
                        <WarningOutlined /> {preview.duplicate}
                      </div>
                    )}
                    {preview?.warnings.map((w) => (
                      <div className="pu-note warn" key={w}>
                        <WarningOutlined /> {w}
                      </div>
                    ))}
                  </div>
                )}
                <div className="pu-totals" style={{ maxWidth: "none" }}>
                  <div>
                    <span>{TAX_TYPE[preview!.tax_type]}</span>
                  </div>
                  <div>
                    <span>Taxable value</span>
                    <b>{rs2(t.taxable_amount)}</b>
                  </div>
                  {t.cgst_amount > 0 && (
                    <div>
                      <span>CGST + SGST</span>
                      <b>{rs2(t.cgst_amount + t.sgst_amount)}</b>
                    </div>
                  )}
                  {t.igst_amount > 0 && (
                    <div>
                      <span>IGST</span>
                      <b>{rs2(t.igst_amount)}</b>
                    </div>
                  )}
                  {t.round_off !== 0 && (
                    <div>
                      <span>Round off</span>
                      <b>{rs2(t.round_off)}</b>
                    </div>
                  )}
                  <div className="grand">
                    <span>Bill total</span>
                    <b>{rs2(t.grand_total)}</b>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
};

// ── Pay a supplier ──────────────────────────────────────────────────────────

const companyId = () => {
  try {
    return Number(JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.id) || null;
  } catch {
    return null;
  }
};

export const PayModal: React.FC<{ open: boolean; supplierId?: number | null; billId?: number | null; onClose: (paid?: boolean) => void }> = ({ open, supplierId, billId, onClose }) => {
  const sup = useSupplierSearch();
  const [supplier, setSupplier] = useState<number | null>(null);
  const [unpaid, setUnpaid] = useState<Unpaid | null>(null);
  const [split, setSplit] = useState<Record<number, number | null>>({});
  const [amount, setAmount] = useState<number | null>(null);
  const [mode, setMode] = useState<string>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(dayjs());
  const [bank, setBank] = useState<number | null>(null);
  const [banks, setBanks] = useState<{ id: number; label: string; is_default: boolean }[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUnpaid(null);
    setSplit({});
    setAmount(null);
    setReference("");
    setNotes("");
    setDate(dayjs());
    setSupplier(supplierId ?? null);
    if (supplierId) sup.load(supplierId);
    else sup.find("");
    const cid = companyId();
    if (cid) {
      api
        .get(`/companies/details/${cid}`)
        .then((r) => {
          const list = (r?.data?.data?.bank_accounts || r?.data?.bank_accounts || []).filter((b: any) => b.is_active !== 0);
          const opts = list.map((b: any) => ({ id: Number(b.id), label: `${b.bank_name || "Bank"} · ${String(b.account_number || "").slice(-4).padStart(8, "•")}`, is_default: !!b.is_default }));
          setBanks(opts);
          setBank(opts.find((b: any) => b.is_default)?.id ?? null);
        })
        .catch(() => setBanks([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplierId]);

  useEffect(() => {
    if (!open || !supplier) return setUnpaid(null);
    getUnpaid(supplier)
      .then((u) => {
        setUnpaid(u);
        // Paying one bill: its balance; otherwise everything due.
        const only = billId ? u.bills.find((b) => b.id === billId) : null;
        const total = only ? only.balance_amount : u.bills.reduce((s, b) => s + b.balance_amount, 0);
        setAmount(total > 0 ? Math.round(total * 100) / 100 : null);
        setSplit(only ? { [only.id]: only.balance_amount } : {});
      })
      .catch((e) => message.error(apiError(e, "Couldn't load the bills")));
  }, [open, supplier, billId]);

  // Oldest due first, unless amounts were typed against bills.
  const auto = useMemo(() => {
    const out: Record<number, number> = {};
    let left = amount || 0;
    (unpaid?.bills || []).forEach((b) => {
      const take = Math.max(0, Math.min(left, b.balance_amount));
      out[b.id] = Math.round(take * 100) / 100;
      left -= take;
    });
    return out;
  }, [amount, unpaid]);
  const typed = Object.values(split).some((v) => v !== null && v !== undefined);
  const shares = typed ? Object.fromEntries(Object.entries(split).map(([k, v]) => [Number(k), Number(v) || 0])) : auto;
  const allocated = Object.values(shares).reduce((s, v) => s + (v || 0), 0);
  const advance = Math.max(0, Math.round(((amount || 0) - allocated) * 100) / 100);

  const submit = async () => {
    if (!supplier) return message.warning("Choose the supplier");
    if (!(Number(amount) > 0)) return message.warning("Enter the amount paid");
    if (allocated > (amount || 0) + 0.004) return message.warning("The bills add up to more than the amount paid");
    setSaving(true);
    try {
      const r = await pay({
        supplier_id: supplier,
        amount,
        mode,
        reference: reference || null,
        payment_date: date.format("YYYY-MM-DD"),
        bank_account_id: mode === "CASH" ? null : bank,
        notes: notes || null,
        ...(typed ? { allocations: Object.entries(shares).filter(([, v]) => v > 0).map(([bill_id, amt]) => ({ bill_id: Number(bill_id), amount: amt })) } : {}),
      });
      message.success(r.message || "Payment saved");
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the payment"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Pay a supplier" onCancel={() => onClose()} onOk={submit} okText="Save payment" confirmLoading={saving} width={760} destroyOnHidden className="pu-modal">
      <div className="pu-grid">
        <label>
          <span className="pu-label">Supplier</span>
          <Select
            showSearch
            filterOption={false}
            style={{ width: "100%" }}
            value={supplier ?? undefined}
            onSearch={sup.find}
            onChange={(v) => (setSupplier(v), setSplit({}))}
            placeholder="Search your suppliers…"
            options={sup.list.map((s) => ({ value: s.id, label: s.name }))}
          />
        </label>
        <label>
          <span className="pu-label">Amount paid (₹)</span>
          <InputNumber min={0} precision={2} style={{ width: "100%" }} value={amount} onChange={(v) => setAmount(v as number)} />
        </label>
        <label>
          <span className="pu-label">Paid on</span>
          <DatePicker style={{ width: "100%" }} format="D MMM YYYY" allowClear={false} value={date} onChange={(d) => d && setDate(d)} disabledDate={(d) => !!d && d.isAfter(dayjs(), "day")} />
        </label>
        <label>
          <span className="pu-label">How</span>
          <Select style={{ width: "100%" }} value={mode} onChange={setMode} options={Object.entries(PAY_MODE).map(([value, label]) => ({ value, label }))} />
        </label>
        <label>
          <span className="pu-label">{mode === "CHEQUE" ? "Cheque no." : mode === "CASH" ? "Receipt no." : "UTR / reference"}</span>
          <Input maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
        {mode !== "CASH" && banks.length > 0 && (
          <label>
            <span className="pu-label">Paid from</span>
            <Select style={{ width: "100%" }} allowClear value={bank ?? undefined} onChange={(v) => setBank(v ?? null)} options={banks.map((b) => ({ value: b.id, label: b.label }))} />
          </label>
        )}
      </div>
      {unpaid?.supplier.bank && (
        <p className="pu-muted" style={{ marginTop: 8 }}>
          Pay into: {unpaid.supplier.bank.name ? `${unpaid.supplier.bank.name} · ` : ""}A/c {unpaid.supplier.bank.account}
          {unpaid.supplier.bank.ifsc ? ` · IFSC ${unpaid.supplier.bank.ifsc}` : ""}
          {unpaid.supplier.upi_id ? ` · UPI ${unpaid.supplier.upi_id}` : ""}
        </p>
      )}
      <div className="pu-sec" style={{ padding: "12px 0 0", borderBottom: 0 }}>
        <h4>Against bills</h4>
        {!supplier ? (
          <p className="pu-muted">Choose the supplier to see their unpaid bills.</p>
        ) : !unpaid ? (
          <Spin />
        ) : !unpaid.bills.length ? (
          <p className="pu-muted">No unpaid bills — the whole amount is kept as an advance{unpaid.advance ? ` (already ${rs(unpaid.advance)})` : ""}.</p>
        ) : (
          <table className="pu-lines">
            <thead>
              <tr>
                <th>Bill</th>
                <th>Pay by</th>
                <th className="r">Due</th>
                <th className="r">Pay now</th>
              </tr>
            </thead>
            <tbody>
              {unpaid.bills.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.bill_number}
                    {b.msme && <span className="pu-chip violet" style={{ marginLeft: 6 }}>MSME</span>}
                    <span className="sub">{day(b.bill_date)}</span>
                  </td>
                  <td>{b.alerts?.overdue_days ? <span style={{ color: "var(--pu-bad)" }}>{day(b.pay_by)} · {b.alerts.overdue_days} days late</span> : day(b.pay_by)}</td>
                  <td className="r">{rs2(b.balance_amount)}</td>
                  <td className="r">
                    <InputNumber
                      min={0}
                      max={b.balance_amount}
                      precision={2}
                      value={typed ? split[b.id] ?? null : auto[b.id]}
                      onChange={(v) => setSplit((s) => ({ ...(typed ? s : auto), [b.id]: v as number }))}
                      style={{ width: 120 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {unpaid && (amount || 0) > 0 && (
          <div className="pu-note" style={{ marginTop: 10 }}>
            <InfoCircleOutlined />
            <span>
              {rs2(allocated)} against bills{advance > 0 ? `, ${rs2(advance)} kept as an advance (used on their next bill)` : ""}.{typed ? " " : " Oldest due first — type amounts to choose."}
            </span>
          </div>
        )}
      </div>
      <Input style={{ marginTop: 10 }} maxLength={500} placeholder="Note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
    </Modal>
  );
};
