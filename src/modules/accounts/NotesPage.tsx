import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Checkbox, DatePicker, Drawer, Input, InputNumber, Modal, Pagination, Select, Spin, message } from "antd";
import { DownloadOutlined, FileDoneOutlined, FileExcelOutlined, ReloadOutlined, RollbackOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { useAccess } from "@/permissions/useAccess";
import { useModules } from "@/session/useModules";
import { StorageService } from "@/storage";
import { askReason } from "@/modules/purchases/PoDrawer";
import { day, rs, rs2 } from "@/modules/purchases/format";
import {
  type BillNoteForm,
  type InvoiceNoteForm,
  type NoteDocPick,
  type NoteKind,
  type NoteReason,
  type NoteRow,
  type NoteView,
  NOTE_REASONS,
  apiError,
  cancelNote,
  createNote,
  getBillForNote,
  getInvoiceForNote,
  getNote,
  getNoteBills,
  getNoteInvoices,
  getNotes,
} from "./api";
import { downloadNotePdf } from "./notePdf";
import "@/modules/purchases/purchases.scss";
import "./accounts.scss";

const today = () => dayjs().format("YYYY-MM-DD");
const paise = (v: number | null | undefined) => Math.round((Number(v) || 0) * 100);
const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};

// ── New credit / debit note ─────────────────────────────────────────────────

/**
 * A credit note against one of your invoices, or a debit note against a
 * supplier's bill: goods returned (lines and quantities, stock moves) or an
 * amount (price reduced, deficiency, correction). GST follows the original.
 */
export const NoteModal: React.FC<{ kind: NoteKind | null; docId?: number | null; onClose: (saved: boolean) => void }> = ({ kind, docId, onClose }) => {
  const open = !!kind;
  const [form, setForm] = useState<InvoiceNoteForm | BillNoteForm | null>(null);
  // The loaded form decides credit or debit (kind clears first when the dialog closes).
  const credit = form ? "invoice" in form : kind === "credit";
  const [picks, setPicks] = useState<NoteDocPick[]>([]);
  const [doc, setDoc] = useState<number | null>(null);
  const [reason, setReason] = useState<NoteReason>("GOODS_RETURNED");
  const [qtys, setQtys] = useState<Record<number, number | null>>({});
  const [amount, setAmount] = useState<number | null>(null);
  const [gstRate, setGstRate] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [stock, setStock] = useState(true);
  const [warehouse, setWarehouse] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  const search = useCallback(
    (q: string) => {
      if (!kind) return;
      const mine = ++seq.current;
      (kind === "credit" ? getNoteInvoices(q) : getNoteBills(q))
        .then((r) => mine === seq.current && setPicks(r.rows))
        .catch(() => mine === seq.current && setPicks([]));
    },
    [kind],
  );
  useEffect(() => {
    if (!open) return;
    setDoc(docId ?? null);
    setForm(null);
    setReason("GOODS_RETURNED");
    setQtys({});
    setAmount(null);
    setGstRate(null);
    setDate(today());
    setNote("");
    setWarehouse(null);
    search("");
  }, [open, docId, search]);
  useEffect(() => {
    if (!open || !doc) return setForm(null);
    (kind === "credit" ? getInvoiceForNote(doc) : getBillForNote(doc))
      .then((f) => {
        setForm(f);
        setQtys({});
        const def = f.warehouses.find((w) => w.is_default) || f.warehouses[0];
        setWarehouse(def?.id ?? null);
        // Goods go back into stock by default when they left stock (a challan) or came in by a bill line with a product.
        const isCredit = "invoice" in f;
        setStock(isCredit ? f.lines.some((l) => l.from_challan && l.product_id) : f.lines.some((l) => l.product_id));
        if (!isCredit) setGstRate((f as BillNoteForm).bill.gst_rates.length === 1 ? (f as BillNoteForm).bill.gst_rates[0] : null);
      })
      .catch((e) => message.error(apiError(e, "Couldn't load that document")));
  }, [open, doc, kind]);

  // Preview: taxable, GST and total (the server works it out again).
  const preview = useMemo(() => {
    if (!form) return null;
    let taxable = 0;
    let gst = 0;
    if (reason === "GOODS_RETURNED") {
      for (const l of form.lines) {
        const q = Number(qtys[l.id] || 0);
        if (!q) continue;
        const t = Math.round(q * l.unit_value * 100);
        taxable += t;
        if (!credit) gst += (form as BillNoteForm).bill.tax_type === "NO_GST" ? 0 : Math.round((t * (l.gst_rate || 0)) / 100);
      }
    } else {
      taxable = paise(amount);
      if (!credit && gstRate !== null && (form as BillNoteForm).bill.tax_type !== "NO_GST") gst = Math.round((taxable * gstRate) / 100);
    }
    if (credit) {
      const r = (form as InvoiceNoteForm).invoice.rates;
      gst = Math.round((taxable * r.cgst) / 100) + Math.round((taxable * r.sgst) / 100) + Math.round((taxable * r.igst) / 100);
    }
    return { taxable, gst, total: taxable + gst };
  }, [form, reason, qtys, amount, gstRate, credit]);

  const save = async () => {
    if (!doc || !form) return message.warning(credit ? "Choose the invoice" : "Choose the bill");
    setSaving(true);
    try {
      const r = await createNote(kind!, {
        [credit ? "invoice_id" : "bill_id"]: doc,
        reason,
        date,
        note: note || undefined,
        ...(reason === "GOODS_RETURNED"
          ? { lines: form.lines.filter((l) => Number(qtys[l.id] || 0) > 0).map((l) => ({ item_id: l.id, qty: Number(qtys[l.id]) })), stock, warehouse_id: stock ? warehouse : null }
          : { amount, ...(credit ? {} : { gst_rate: gstRate }) }),
      });
      message.success(r.message, 6);
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the note"));
    } finally {
      setSaving(false);
    }
  };

  const head = form ? (credit ? (form as InvoiceNoteForm).invoice : (form as BillNoteForm).bill) : null;
  const stockHint = credit
    ? form && (form as InvoiceNoteForm).lines.some((l) => l.from_challan)
      ? "These goods left stock on a delivery challan."
      : "This invoice didn't take goods out of stock — tick only if you counted them out another way."
    : "The goods leave your stock as they go back to the supplier.";
  return (
    <Modal open={open} title={credit ? "New credit note" : "New debit note"} okText="Save note" onOk={save} confirmLoading={saving} onCancel={() => onClose(false)} width={760} rootClassName="ac-modal" destroyOnHidden>
      <p className="ac-help">
        {credit
          ? "To a customer, against your invoice: goods came back, or the price went down after the sale. GST is reduced at the invoice's rates."
          : "To a supplier, against their bill: goods you sent back, or a price they reduced. Your GST input credit is reduced."}
      </p>
      <label className="ac-field">
        <b>{credit ? "Invoice" : "Supplier's bill"}</b>
        <Select
          showSearch
          filterOption={false}
          onSearch={search}
          value={doc ?? undefined}
          placeholder={credit ? "Search by invoice no. or customer" : "Search by bill no. or supplier"}
          onChange={(v) => setDoc(v ?? null)}
          options={picks.map((p) => ({ value: p.id, label: `${p.number} · ${p.customer_name || p.supplier_name} · ${rs2(p.total)}${p.credited ? ` (credited ${rs(p.credited)})` : ""}` }))}
        />
      </label>
      {head && (
        <div className="ac-note-head">
          <span>
            {credit ? (form as InvoiceNoteForm).invoice.customer_name : (form as BillNoteForm).bill.supplier_name} · {day(head.date)}
          </span>
          <span>
            Total {rs2(head.total)} · paid {rs2(head.paid)}
            {head.credited ? ` · credited ${rs2(head.credited)}` : ""} · due {rs2(head.balance)}
          </span>
        </div>
      )}
      {credit && form && (form as InvoiceNoteForm).gst_late && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} title={`Past the GST time limit (${day((form as InvoiceNoteForm).gst_deadline)}): the note settles the account, but the GST already paid can't be reduced (Section 34(2)).`} />
      )}
      {form && (
        <>
          <div className="ac-grid2">
            <label className="ac-field">
              <b>Why</b>
              <Select value={reason} options={NOTE_REASONS} onChange={setReason} />
            </label>
            <label className="ac-field">
              <b>Date</b>
              <DatePicker value={dayjs(date)} onChange={(d) => setDate(d ? d.format("YYYY-MM-DD") : today())} format="D MMM YYYY" allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} style={{ width: "100%" }} />
            </label>
          </div>
          {reason === "GOODS_RETURNED" ? (
            <div className="ac-alloc">
              <div className="ac-alloc-head">
                <b>What came back</b>
                <span className="ac-help" style={{ margin: 0 }}>
                  value per unit after discounts
                </span>
              </div>
              {form.lines.map((l) => (
                <div key={l.id} className={`ac-alloc-row${qtys[l.id] ? " on" : ""}`}>
                  <span>
                    <b>{l.name}</b>
                    <small>
                      {l.left} of {l.qty}
                      {l.unit ? ` ${l.unit}` : ""} can come back · {rs2(l.unit_value)} each
                      {!credit && l.gst_rate !== undefined ? ` · GST ${l.gst_rate}%` : ""}
                    </small>
                  </span>
                  <InputNumber min={0} max={l.left} precision={3} disabled={!l.left} placeholder="0" value={qtys[l.id] ?? null} onChange={(v) => setQtys((x) => ({ ...x, [l.id]: v === null ? null : Number(v) }))} style={{ width: 120 }} />
                </div>
              ))}
              <div className="ac-alloc-foot">
                <Checkbox checked={stock} onChange={(e) => setStock(e.target.checked)}>
                  {credit ? "Put the goods back into stock" : "Take the goods out of stock"}
                </Checkbox>
                {stock && <Select size="small" value={warehouse ?? undefined} options={form.warehouses.map((w) => ({ value: w.id, label: w.name }))} onChange={setWarehouse} style={{ minWidth: 180 }} />}
              </div>
              <small className="ac-help" style={{ display: "block", marginTop: 6 }}>
                {stockHint}
              </small>
            </div>
          ) : (
            <div className="ac-grid2">
              <label className="ac-field">
                <b>Amount before GST</b>
                <InputNumber min={0.01} precision={2} prefix="₹" style={{ width: "100%" }} value={amount} onChange={(v) => setAmount(v === null ? null : Number(v))} />
              </label>
              {!credit && (form as BillNoteForm).bill.tax_type !== "NO_GST" && (
                <label className="ac-field">
                  <b>GST rate</b>
                  <Select value={gstRate ?? undefined} placeholder="Choose" options={(form as BillNoteForm).bill.gst_rates.map((r) => ({ value: r, label: `${r}%` }))} onChange={setGstRate} />
                </label>
              )}
            </div>
          )}
          <label className="ac-field">
            <b>Note (optional)</b>
            <Input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2 MCBs damaged in transit" />
          </label>
          {preview && (
            <div className="ac-total">
              Taxable {rs2(preview.taxable / 100)} · GST {rs2(preview.gst / 100)} · Note total <b>{rs2(preview.total / 100)}</b>
              {preview.total > paise(form.can_note) && <div className="ac-bad">More than is left to credit on this {credit ? "invoice" : "bill"} ({rs2(form.can_note)})</div>}
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

// ── One note ────────────────────────────────────────────────────────────────

const NoteDrawer: React.FC<{ target: { kind: NoteKind; id: number } | null; canRecord: boolean; onClose: () => void; onChanged: () => void }> = ({ target, canRecord, onClose, onChanged }) => {
  const navigate = useNavigate();
  const [n, setN] = useState<NoteView | null>(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const load = useCallback(() => {
    if (!target) return;
    getNote(target.kind, target.id)
      .then(setN)
      .catch((e) => {
        message.error(apiError(e, "Couldn't open the note"));
        closeRef.current();
      });
  }, [target]);
  useEffect(() => {
    setN(null);
    load();
  }, [load]);
  const credit = n?.kind === "credit";
  return (
    <Drawer open={!!target} onClose={onClose} size="min(720px, 100vw)" title={null} rootClassName="pu-drawer ac-drawer" destroyOnHidden>
      {!n ? (
        <div className="pu-empty">
          <Spin />
        </div>
      ) : (
        <>
          <div className="pu-dhead">
            <div className="pu-dhead-top">
              <span className="pu-chip accent">{credit ? "Credit note" : "Debit note"}</span>
              <span className={`pu-chip ${n.status === "ACTIVE" ? "good" : "bad"}`}>{n.status === "ACTIVE" ? n.reason_word : "Cancelled"}</span>
            </div>
            <h3>
              {n.number} · {n.party.name}
            </h3>
            <p>
              {day(n.date)} · against {credit ? "invoice" : "bill"} {n.against.number} ({day(n.against.date)})
            </p>
            <div className="pu-big">{rs2(n.total)}</div>
            <div className="pu-actions">
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await downloadNotePdf(n);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                PDF
              </Button>
              <Button icon={<FileDoneOutlined />} onClick={() => navigate(credit ? `/app/invoice?open=${n.against.id}` : `/app/purchase-bills?open=${n.against.id}`)}>
                {n.against.number}
              </Button>
              {canRecord && n.status === "ACTIVE" && (
                <Button
                  danger
                  onClick={async () => {
                    const why = await askReason(`Cancel ${n.number}?`, "Why? e.g. raised by mistake", "Cancel note");
                    if (!why) return;
                    try {
                      const r = await cancelNote(n.kind, n.id, why);
                      message.success(r.message);
                      load();
                      onChanged();
                    } catch (e) {
                      message.error(apiError(e, "Couldn't cancel it"));
                    }
                  }}
                >
                  Cancel note
                </Button>
              )}
            </div>
          </div>
          {n.status === "CANCELLED" && n.cancel_reason && (
            <div className="pu-sec">
              <h4>Cancelled</h4>
              <p style={{ margin: 0 }}>{n.cancel_reason}</p>
            </div>
          )}
          <div className="pu-sec">
            <h4>Lines</h4>
            <div className="ac-vlines">
              <div className="head">
                <span>Item</span>
                <span>Qty</span>
                <span>Taxable</span>
              </div>
              {n.lines.map((l, i) => (
                <div key={i}>
                  <span>
                    {l.name}
                    {l.hsn_code ? ` · HSN ${l.hsn_code}` : ""}
                  </span>
                  <span>{l.qty !== null ? `${l.qty}${l.unit ? ` ${l.unit}` : ""}` : ""}</span>
                  <span>{rs2(l.taxable)}</span>
                </div>
              ))}
              <div>
                <span>GST{n.cgst ? ` · CGST ${rs2(n.cgst)} · SGST ${rs2(n.sgst)}` : n.igst ? ` · IGST ${rs2(n.igst)}` : " · none"}</span>
                <span />
                <span>{rs2(n.cgst + n.sgst + n.igst)}</span>
              </div>
              <div className="foot">
                <span>Total</span>
                <span />
                <span>{rs2(n.total)}</span>
              </div>
            </div>
          </div>
          <div className="pu-sec">
            <h4>What it changed</h4>
            <p style={{ margin: 0 }}>
              {credit
                ? `${rs2(n.applied ?? 0)} taken off invoice ${n.against.number}${n.total - (n.applied ?? 0) > 0.004 ? ` · ${rs2(n.total - (n.applied ?? 0))} went to the customer's advance (use it on other invoices or refund it from their ledger)` : ""}.`
                : `Bill ${n.against.number} owes ${rs2(n.total)} less (as far as it was unpaid).`}
              {n.stock ? ` Stock: goods ${credit ? "back in" : "out of"} ${n.warehouse || "the warehouse"}.` : ""}
            </p>
          </div>
        </>
      )}
    </Drawer>
  );
};

// ── The page ────────────────────────────────────────────────────────────────

/** Accounts → Credit & debit notes. */
const NotesPage: React.FC = () => {
  const { can } = useAccess();
  const { hasModule } = useModules();
  const canRecord = can("accounts.record");
  const buys = hasModule("purchases");
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState<NoteKind>(params.get("tab") === "debit" ? "debit" : "credit");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: NoteRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<{ kind: NoteKind; docId: number | null } | null>(
    params.get("new") === "credit" ? { kind: "credit", docId: Number(params.get("invoice")) || null } : params.get("new") === "debit" ? { kind: "debit", docId: Number(params.get("bill")) || null } : null,
  );
  const openParam = /^(credit|debit):(\d+)$/.exec(params.get("open") || "");
  const target = openParam ? { kind: openParam[1] as NoteKind, id: Number(openParam[2]) } : null;
  const company = useMemo(companyName, []);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const r = await getNotes({ kind, q: q || undefined, page, limit: 25 });
      if (mine === seq.current) setData(r);
    } catch (e) {
      if (mine === seq.current) message.error(apiError(e, "Couldn't load the notes"));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [kind, q, page]);
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  const openNote = (t: { kind: NoteKind; id: number } | null) => {
    if (t) params.set("open", `${t.kind}:${t.id}`);
    else params.delete("open");
    setParams(params, { replace: true });
  };
  const active = (data?.rows || []).filter((r) => r.status === "ACTIVE");
  return (
    <div className={`db-root pu-root ac-root${loading ? " refreshing" : ""}`}>
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Accounts
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <RollbackOutlined />
              </span>
              Credit &amp; debit notes
            </div>
            <div className="db-hero-sub">Goods returned and prices reduced after the sale — GST reversed the right way, invoices and bills corrected, stock moved.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">{kind === "credit" ? "Credit notes on this page" : "Debit notes on this page"}</span>
              <span className="db-hero-number">{rs(active.reduce((s, r) => s + r.total, 0))}</span>
              <span className="db-hero-figure-foot">
                <span>{data ? `${data.total} note${data.total === 1 ? "" : "s"}` : "…"}</span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            {canRecord && (
              <div className="db-hero-btns">
                <button type="button" className="db-btn white" onClick={() => setCreating({ kind: "credit", docId: null })}>
                  <FileDoneOutlined /> New credit note
                </button>
                {buys && (
                  <button type="button" className="db-btn glass" onClick={() => setCreating({ kind: "debit", docId: null })}>
                    <FileExcelOutlined /> New debit note
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`db-filter${loading ? " loading" : ""}`}>
        <div className="pu-tabs" role="tablist" aria-label="Which notes">
          <button type="button" className={kind === "credit" ? "on" : ""} onClick={() => (setKind("credit"), setPage(1))}>
            Credit notes (customers)
          </button>
          {buys && (
            <button type="button" className={kind === "debit" ? "on" : ""} onClick={() => (setKind("debit"), setPage(1))}>
              Debit notes (suppliers)
            </button>
          )}
        </div>
        <div className="db-filter-right">
          <Input className="pu-search" allowClear prefix={<SearchOutlined />} placeholder={kind === "credit" ? "CN no., invoice no., customer" : "DN no., bill no., supplier"} value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          <Button icon={<ReloadOutlined />} onClick={load} aria-label="Refresh" />
        </div>
        <div className="db-filter-progress" />
      </div>

      <div className="pu-list" role="list">
        {!data ? (
          <div className="pu-empty">
            <Spin />
          </div>
        ) : !data.rows.length ? (
          <div className="pu-empty">
            <b>No {kind} notes yet</b>
            {canRecord && !q && (kind === "credit" ? "When a customer returns goods or you reduce a price after invoicing, raise a credit note here." : "When you send goods back to a supplier, raise a debit note here.")}
          </div>
        ) : (
          data.rows.map((r) => (
            <div key={r.id} className="pu-row" role="listitem" tabIndex={0} onClick={() => openNote({ kind, id: r.id })} onKeyDown={(e) => e.key === "Enter" && openNote({ kind, id: r.id })}>
              <div className="pu-row-main">
                <div className="pu-row-title">
                  {r.number}
                  {r.status === "CANCELLED" && <span className="pu-chip bad">Cancelled</span>}
                  {r.stock && r.status === "ACTIVE" && <span className="pu-chip violet">Stock moved</span>}
                </div>
                <div className="pu-row-sub">
                  {r.party_name} · against {r.doc_number || "—"}
                </div>
              </div>
              <div className="pu-row-sub pu-hide-sm">{day(r.date)}</div>
              <div className="pu-row-sub pu-hide-sm">{r.reason_word}</div>
              <div className="pu-num">{rs2(r.total)}</div>
            </div>
          ))
        )}
      </div>
      {data && data.total > 25 && (
        <div className="pu-pager">
          <Pagination current={page} total={data.total} pageSize={25} onChange={setPage} showSizeChanger={false} />
        </div>
      )}

      <NoteDrawer target={target} canRecord={canRecord} onClose={() => openNote(null)} onChanged={load} />
      <NoteModal
        kind={creating?.kind ?? null}
        docId={creating?.docId ?? null}
        onClose={(saved) => {
          const k = creating?.kind;
          setCreating(null);
          ["new", "invoice", "bill"].forEach((p) => params.delete(p));
          setParams(params, { replace: true });
          if (saved && k) {
            setKind(k);
            load();
          }
        }}
      />
    </div>
  );
};

export default NotesPage;
