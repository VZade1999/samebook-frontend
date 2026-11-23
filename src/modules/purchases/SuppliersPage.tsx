import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Col, Drawer, Form, Input, InputNumber, Modal, Pagination, Row, Select, Spin, message } from "antd";
import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  FileAddOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  UndoOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";
import {
  type Supplier,
  type SupplierRow,
  type SupplierSummary,
  apiError,
  archiveSupplier,
  getSupplier,
  getSupplierSummary,
  getSuppliers,
  restoreSupplier,
  saveSupplier,
} from "./api";
import { BILL_STATUS, GST_STATES, GST_TYPE, MSME_TYPE, PAY_MODE_SHORT, PO_STATUS, STATE_OPTIONS, day, gstinProblem, rs } from "./format";
import "./purchases.scss";

const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};

// ── Add / edit ──────────────────────────────────────────────────────────────

const SupplierForm: React.FC<{ open: boolean; supplier: Supplier | null; onClose: (saved?: Supplier) => void }> = ({ open, supplier, onClose }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const gstType = Form.useWatch("gst_type", form);
  const gstin: string = Form.useWatch("gstin", form) || "";
  const msme = Form.useWatch("msme_type", form);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(
      supplier
        ? {
            ...supplier,
            addresses: supplier.addresses.length ? supplier.addresses : [],
            contacts: supplier.contacts.length ? supplier.contacts : [],
          }
        : { gst_type: "REGISTERED", addresses: [{ is_primary: true, country: "India" }], contacts: [] },
    );
  }, [open, supplier, form]);

  const g = gstin.trim().toUpperCase();
  const problem = g.length >= 15 ? gstinProblem(g) : null;
  const detected = g.length === 15 && !problem ? `${GST_STATES[g.slice(0, 2)] || "—"} (${g.slice(0, 2)}) · PAN ${g.slice(2, 12)}` : null;

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const r = await saveSupplier(supplier?.id ?? null, {
        ...v,
        gstin: v.gst_type === "UNREGISTERED" ? null : v.gstin,
        addresses: (v.addresses || []).filter((a: any) => a?.address_line_1),
        contacts: (v.contacts || []).filter((c: any) => c?.name),
      });
      message.success(r.message || "Saved");
      onClose(r.data);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the supplier"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={supplier ? `Edit ${supplier.name}` : "Add a supplier"}
      onCancel={() => onClose()}
      onOk={submit}
      okText={supplier ? "Save" : "Add supplier"}
      confirmLoading={saving}
      width={760}
      destroyOnHidden
      className="pu-modal"
    >
      <Form form={form} layout="vertical" requiredMark="optional" className="pu-editor">
        <Row gutter={14}>
          <Col xs={24} md={12}>
            <Form.Item name="name" label="Name (as you call them)" rules={[{ required: true, message: "Enter the supplier's name" }]}>
              <Input maxLength={200} placeholder="e.g. Sharma Cables" autoFocus />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="gst_type" label="GST registration">
              <Select options={Object.entries(GST_TYPE).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
          </Col>
          {gstType !== "UNREGISTERED" && (
            <Col xs={24} md={12}>
              <Form.Item
                name="gstin"
                label="GSTIN"
                normalize={(v) => (v ? String(v).toUpperCase().replace(/\s+/g, "") : v)}
                validateStatus={problem ? "error" : undefined}
                help={problem || (detected ? `State and PAN from the GSTIN: ${detected}` : "15 characters — the state and PAN fill themselves in")}
                rules={[{ required: true, message: "Enter the GSTIN (or choose Unregistered)" }]}
              >
                <Input maxLength={15} placeholder="27AAPFU0939F1ZV" />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} md={12}>
            <Form.Item name="legal_name" label="Legal name (as on GST)">
              <Input maxLength={200} />
            </Form.Item>
          </Col>
          {gstType === "UNREGISTERED" && (
            <Col xs={24} md={12}>
              <Form.Item name="state" label="State">
                <Select showSearch allowClear options={STATE_OPTIONS} placeholder="Where they are" />
              </Form.Item>
            </Col>
          )}
          <Col xs={12} md={6}>
            <Form.Item name="phone" label="Phone">
              <Input maxLength={20} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="credit_days" label="Credit days" tooltip="Their payment terms — a bill's due date is its date plus these days">
              <InputNumber min={0} max={365} precision={0} style={{ width: "100%" }} placeholder="30" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="email" label="Email">
              <Input maxLength={150} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="msme_type" label="MSME (Udyam)" tooltip="Micro and small suppliers must be paid within 45 days (income-tax rule) — SameBook reminds you">
              <Select allowClear placeholder="Not MSME" options={Object.entries(MSME_TYPE).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="udyam_number" label="Udyam number" normalize={(v) => (v ? String(v).toUpperCase() : v)}>
              <Input maxLength={25} placeholder="UDYAM-MH-26-0012345" disabled={!msme} />
            </Form.Item>
          </Col>
        </Row>

        <h4 className="pu-form-h">Addresses</h4>
        <Form.List name="addresses">
          {(fields, { add, remove }) => (
            <>
              {fields.map((f, i) => (
                <div key={f.key} className="pu-party" style={{ marginBottom: 10 }}>
                  <Row gutter={10}>
                    <Col xs={24} md={8}>
                      <Form.Item name={[f.name, "label"]} label="Label">
                        <Input maxLength={60} placeholder={i === 0 ? "Head office" : "Godown / branch"} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Form.Item name={[f.name, "address_line_1"]} label="Address" rules={[{ required: true, message: "Enter the address line" }]}>
                        <Input maxLength={255} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                      <Form.Item name={[f.name, "city"]} label="City">
                        <Input maxLength={100} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                      <Form.Item name={[f.name, "state"]} label="State">
                        <Select showSearch allowClear options={STATE_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item name={[f.name, "postal_code"]} label="PIN">
                        <Input maxLength={6} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 12 }}>
                      <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(f.name)} aria-label="Remove this address" />
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name={[f.name, "gstin"]} label="This branch's own GSTIN (if another state)" normalize={(v) => (v ? String(v).toUpperCase() : v)}>
                        <Input maxLength={15} />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => add({ country: "India", is_primary: fields.length === 0 })}>
                Add an address
              </Button>
            </>
          )}
        </Form.List>

        <h4 className="pu-form-h">Contacts</h4>
        <Form.List name="contacts">
          {(fields, { add, remove }) => (
            <>
              {fields.map((f) => (
                <Row gutter={10} key={f.key}>
                  <Col xs={24} md={7}>
                    <Form.Item name={[f.name, "name"]} label="Name" rules={[{ required: true, message: "Enter the name" }]}>
                      <Input maxLength={120} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={5}>
                    <Form.Item name={[f.name, "designation"]} label="Role">
                      <Input maxLength={80} placeholder="Sales" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={5}>
                    <Form.Item name={[f.name, "phone"]} label="Phone">
                      <Input maxLength={20} />
                    </Form.Item>
                  </Col>
                  <Col xs={20} md={6}>
                    <Form.Item name={[f.name, "email"]} label="Email">
                      <Input maxLength={150} />
                    </Form.Item>
                  </Col>
                  <Col xs={4} md={1} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 12 }}>
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(f.name)} aria-label="Remove this contact" />
                  </Col>
                </Row>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => add({ is_primary: fields.length === 0 })}>
                Add a contact
              </Button>
            </>
          )}
        </Form.List>

        <h4 className="pu-form-h">Bank details (where you pay them)</h4>
        <Row gutter={10}>
          <Col xs={24} md={8}>
            <Form.Item name="bank_account_name" label="Account name">
              <Input maxLength={150} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="bank_account_number" label="Account number">
              <Input maxLength={20} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="bank_ifsc" label="IFSC" normalize={(v) => (v ? String(v).toUpperCase() : v)}>
              <Input maxLength={11} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="bank_name" label="Bank">
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="upi_id" label="UPI ID">
              <Input maxLength={100} placeholder="name@bank" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 4 }} maxLength={2000} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

// ── Profile ─────────────────────────────────────────────────────────────────

const SupplierProfile: React.FC<{ id: number | null; onClose: () => void; onChanged: () => void; onEdit: (s: Supplier) => void }> = ({ id, onClose, onChanged, onEdit }) => {
  const { can } = useAccess();
  const navigate = useNavigate();
  const [s, setS] = useState<Supplier | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    if (!id) return;
    setS(null);
    getSupplier(id)
      .then(setS)
      .catch((e) => {
        message.error(apiError(e, "Couldn't open the supplier"));
        onClose();
      });
  }, [id, onClose]);
  useEffect(load, [load]);

  const toggle = async () => {
    if (!s) return;
    setBusy(true);
    try {
      const r = s.is_active ? await archiveSupplier(s.id) : await restoreSupplier(s.id);
      message.success(r.message);
      load();
      onChanged();
    } catch (e) {
      message.error(apiError(e, "Couldn't change it"));
    } finally {
      setBusy(false);
    }
  };

  const main = s?.addresses.find((a) => a.is_primary) || s?.addresses[0];
  return (
    <Drawer open={!!id} onClose={onClose} size="min(640px, 100vw)" title={null} rootClassName="pu-drawer" destroyOnHidden>
      {!s ? (
        <div className="pu-empty">
          <Spin />
        </div>
      ) : (
        <>
          <div className="pu-dhead">
            <div className="pu-dhead-top">
              <span className="pu-chip accent">{GST_TYPE[s.gst_type]}</span>
              {s.msme_type && <span className="pu-chip violet">MSME · {MSME_TYPE[s.msme_type]}</span>}
              {!s.is_active && <span className="pu-chip bad">Archived</span>}
            </div>
            <h3>{s.name}</h3>
            <p>
              {[s.legal_name && s.legal_name !== s.name ? s.legal_name : null, s.gstin ? `GSTIN ${s.gstin}` : null, s.state].filter(Boolean).join(" · ") || "No GSTIN"}
            </p>
            <div className="pu-actions">
              {can("purchases.create") && s.is_active && (
                <>
                  <Button type="primary" icon={<FileAddOutlined />} onClick={() => navigate(`/app/purchase-orders?new=1&supplier=${s.id}`)}>
                    New purchase order
                  </Button>
                  <Button icon={<EditOutlined />} onClick={() => onEdit(s)}>
                    Edit
                  </Button>
                </>
              )}
              {can("purchases.bills") && (
                <Button icon={<WalletOutlined />} onClick={() => navigate(`/app/purchase-bills?pay=${s.id}`)}>
                  Pay
                </Button>
              )}
              {can("purchases.create") && (
                <Button icon={s.is_active ? <DeleteOutlined /> : <UndoOutlined />} loading={busy} onClick={toggle} danger={s.is_active}>
                  {s.is_active ? "Archive" : "Restore"}
                </Button>
              )}
            </div>
          </div>
          {s.stats && (
            <div className="pu-sec">
              <div className="pu-facts">
                <div>
                  <span>You owe</span>
                  <b>{rs(s.stats.payable)}</b>
                </div>
                <div>
                  <span>On order</span>
                  <b>{rs(s.stats.on_order)}</b>
                </div>
                <div>
                  <span>Billed this year</span>
                  <b>{rs(s.stats.billed_this_year)}</b>
                </div>
                <div>
                  <span>Advance paid</span>
                  <b>{rs(s.stats.advance)}</b>
                </div>
              </div>
            </div>
          )}
          <div className="pu-sec">
            <h4>Details</h4>
            <div className="pu-facts">
              <div>
                <span>PAN</span>
                <b>{s.pan || "—"}</b>
              </div>
              <div>
                <span>Credit days</span>
                <b>{s.credit_days === null ? "—" : s.credit_days ? `${s.credit_days} days` : "Pay on delivery"}</b>
              </div>
              <div>
                <span>Phone</span>
                <b>{s.phone || "—"}</b>
              </div>
              <div>
                <span>Email</span>
                <b>{s.email || "—"}</b>
              </div>
              {s.udyam_number && (
                <div>
                  <span>Udyam</span>
                  <b>{s.udyam_number}</b>
                </div>
              )}
            </div>
          </div>
          {(s.addresses.length > 0 || s.contacts.length > 0) && (
            <div className="pu-sec">
              <h4>Addresses & contacts</h4>
              <div className="pu-parties">
                {s.addresses.map((a) => (
                  <div className="pu-party" key={a.id}>
                    <em>{a.label || (a === main ? "Main address" : "Address")}</em>
                    <b>{a.address_line_1}</b>
                    <p>{[a.address_line_2, a.city, a.state, a.postal_code].filter(Boolean).join(", ")}</p>
                    {a.gstin && <p>GSTIN {a.gstin}</p>}
                  </div>
                ))}
                {s.contacts.map((c) => (
                  <div className="pu-party" key={c.id}>
                    <em>{c.designation || "Contact"}</em>
                    <b>{c.name}</b>
                    <p>{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(s.bank_account_number || s.upi_id) && (
            <div className="pu-sec">
              <h4>
                <BankOutlined /> Pay into
              </h4>
              <div className="pu-facts">
                <div>
                  <span>Account</span>
                  <b>{s.bank_account_number || "—"}</b>
                </div>
                <div>
                  <span>IFSC</span>
                  <b>{s.bank_ifsc || "—"}</b>
                </div>
                <div>
                  <span>Name / bank</span>
                  <b>{[s.bank_account_name, s.bank_name].filter(Boolean).join(" · ") || "—"}</b>
                </div>
                {s.upi_id && (
                  <div>
                    <span>UPI</span>
                    <b>{s.upi_id}</b>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="pu-sec">
            <h4>Purchase orders</h4>
            {s.purchase_orders.length ? (
              <div className="pu-links">
                {s.purchase_orders.map((p) => (
                  <button type="button" className="pu-link" key={p.id} onClick={() => navigate(`/app/purchase-orders?open=${p.id}`)}>
                    {p.po_number} · {rs(p.grand_total)}
                    <small>
                      {day(p.po_date)} · {PO_STATUS[p.status]?.label}
                    </small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="pu-muted">None yet.</p>
            )}
          </div>
          {s.bills.length > 0 && (
            <div className="pu-sec">
              <h4>Bills</h4>
              <div className="pu-links">
                {s.bills.map((b) => (
                  <button type="button" className="pu-link" key={b.id} onClick={() => navigate(`/app/purchase-bills?open=${b.id}`)}>
                    {b.bill_number} · {rs(b.balance_amount > 0 ? b.balance_amount : b.grand_total)} {b.balance_amount > 0 ? "due" : ""}
                    <small>
                      {b.overdue ? <span style={{ color: "var(--pu-bad)" }}>Overdue · pay by {day(b.pay_by)}</span> : `${BILL_STATUS[b.status]?.label} · ${day(b.bill_date)}`}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {s.payments.length > 0 && (
            <div className="pu-sec">
              <h4>Payments</h4>
              <ul className="pu-timeline">
                {s.payments.map((p) => (
                  <li key={p.id}>
                    <b>{rs(p.amount)}</b> · {PAY_MODE_SHORT[p.mode]} {p.reference ? `· ${p.reference}` : ""} · {day(p.payment_date)}
                    {p.status !== "ACTIVE" && <span className="pu-chip bad" style={{ marginLeft: 6 }}>Cancelled</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

const SuppliersPage: React.FC = () => {
  const { can } = useAccess();
  const [params, setParams] = useSearchParams();
  const [summary, setSummary] = useState<SupplierSummary | null>(null);
  const [rows, setRows] = useState<SupplierRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [sort, setSort] = useState("name");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{ open: boolean; supplier: Supplier | null }>({ open: false, supplier: null });
  const [rev, setRev] = useState(0);
  const openId = Number(params.get("open")) || null;
  const company = useMemo(companyName, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([getSupplierSummary(), getSuppliers({ q, status, sort, page, limit: 25 })]);
      setSummary(s);
      setRows(list.rows);
      setTotal(list.total || 0);
    } catch (e) {
      message.error(apiError(e, "Couldn't load suppliers"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, status, sort, page]);
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => {
    if (params.get("new") === "1" && can("purchases.create")) {
      setForm({ open: true, supplier: null });
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams, can]);

  const open = (id: number | null) => {
    if (id) params.set("open", String(id));
    else params.delete("open");
    setParams(params, { replace: true });
  };

  return (
    <div className={`db-root pu-root${loading ? " refreshing" : ""}`}>
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Purchases
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <ShopOutlined />
              </span>
              Suppliers
            </div>
            <div className="db-hero-sub">Who you buy from: their GSTIN, MSME status and credit days, what is on order and what you owe them.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">You owe suppliers</span>
              <span className="db-hero-number">{summary?.payable === null ? "—" : rs(summary?.payable ?? 0)}</span>
              <span className="db-hero-figure-foot">
                <span>
                  {summary ? `${summary.suppliers} supplier${summary.suppliers === 1 ? "" : "s"}` : "…"}
                  {summary?.msme ? ` · ${summary.msme} MSME (pay within 45 days)` : ""}
                </span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{rs(summary?.on_order ?? 0)}</b>
                <span>On order</span>
              </div>
              <div className="db-hero-stat">
                <b>{rs(summary?.overdue ?? 0)}</b>
                <span>Overdue</span>
              </div>
            </div>
            {can("purchases.create") && (
              <div className="db-hero-btns">
                <button type="button" className="db-btn white" onClick={() => setForm({ open: true, supplier: null })}>
                  <PlusOutlined /> Add supplier
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`db-filter${loading ? " loading" : ""}`}>
        <div className="pu-tabs" role="tablist">
          {(["active", "archived"] as const).map((s) => (
            <button key={s} type="button" className={status === s ? "on" : ""} onClick={() => (setStatus(s), setPage(1))}>
              {s === "active" ? "Active" : "Archived"}
            </button>
          ))}
        </div>
        <Input
          className="pu-search"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search name, GSTIN or phone"
          value={q}
          onChange={(e) => (setQ(e.target.value), setPage(1))}
        />
        <div className="db-filter-right">
          <Select
            value={sort}
            onChange={(v) => setSort(v)}
            style={{ width: 150 }}
            options={[
              { value: "name", label: "A to Z" },
              { value: "payable", label: "You owe most" },
              { value: "recent", label: "Recently ordered" },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={load} aria-label="Refresh" />
        </div>
        <div className="db-filter-progress" />
      </div>

      <div className="pu-list" role="list">
        {rows === null ? (
          <div className="pu-empty">
            <Spin />
          </div>
        ) : !rows.length ? (
          <div className="pu-empty">
            <b>{q ? "No supplier matches" : status === "archived" ? "No archived suppliers" : "No suppliers yet"}</b>
            {!q && status === "active" && "Add the people you buy from — type the GSTIN and the rest fills itself in."}
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="pu-row" role="listitem" tabIndex={0} onClick={() => open(r.id)} onKeyDown={(e) => e.key === "Enter" && open(r.id)}>
              <div className="pu-row-main">
                <div className="pu-row-title">
                  {r.name}
                  {r.msme_type && <span className="pu-chip violet">MSME</span>}
                  {r.gst_type !== "REGISTERED" && <span className="pu-chip">{r.gst_type === "COMPOSITION" ? "Composition" : "Unregistered"}</span>}
                </div>
                <div className="pu-row-sub">{[r.gstin, r.state, r.phone].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div className="pu-row-sub pu-hide-sm">{r.open_pos ? `${r.open_pos} open PO${r.open_pos === 1 ? "" : "s"} · ${rs(r.open_value)}` : r.last_po_date ? `Last PO ${day(r.last_po_date)}` : "No POs yet"}</div>
              <div className="pu-row-sub pu-hide-sm">{r.credit_days === null ? "—" : r.credit_days ? `${r.credit_days} days credit` : "Pay on delivery"}</div>
              <div className="pu-num">
                {rs(r.payable)}
                <small>{r.overdue ? <span style={{ color: "var(--pu-bad)" }}><WarningOutlined /> {rs(r.overdue)} overdue</span> : "you owe"}</small>
              </div>
              <span className="pu-hide-sm" aria-hidden>
                ›
              </span>
            </div>
          ))
        )}
      </div>
      {total > 25 && (
        <div className="pu-pager">
          <Pagination current={page} total={total} pageSize={25} onChange={setPage} showSizeChanger={false} />
        </div>
      )}

      <SupplierForm
        open={form.open}
        supplier={form.supplier}
        onClose={(saved) => {
          setForm({ open: false, supplier: null });
          if (saved) {
            load();
            setRev((r) => r + 1);
            open(saved.id);
          }
        }}
      />
      <SupplierProfile key={`${openId}-${rev}`} id={openId} onClose={() => open(null)} onChanged={load} onEdit={(s) => setForm({ open: true, supplier: s })} />
    </div>
  );
};

export default SuppliersPage;
