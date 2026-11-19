import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker, Form, Modal, Spin, message } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  EditOutlined,
  ExclamationCircleFilled,
  FileDoneOutlined,
  FileSearchOutlined,
  FormOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import SeriesField from "@/modules/numbering/SeriesField";
import InvoiceService from "../../services/invoiceService";
import { ASYNC_GENERATE_INVOICE_SUCCESS } from "../../redux/invoiceActions";
import { Avatar, count, errorText, inr, rupees, shortDate } from "./shared";
import BillingPanel, { type BillState } from "./BillingPanel";

const service = new InvoiceService();

/** Payment terms offered as one-click choices (days after the invoice date). */
const TERMS = [
  { days: 0, label: "On receipt" },
  { days: 7, label: "7 days" },
  { days: 15, label: "15 days" },
  { days: 30, label: "30 days" },
  { days: 45, label: "45 days" },
  { days: 60, label: "60 days" },
];

export interface EligibleQuotation {
  id: number;
  quotation_number: string;
  customer_id: number | null;
  customer_name: string;
  contact_person_name?: string;
  quotation_date: string;
  validity_date?: string | null;
  grand_total: number;
  gst: number;
  items_count: number;
  billing_ok: boolean;
  shipping_ok: boolean;
  /** Already has an invoice (a quotation can have several). */
  has_invoice?: boolean;
  /** Value not billed yet (before GST). */
  to_bill_value?: number;
  /** Its dispatched / delivered challans waiting to be billed. */
  ready_challans?: number;
  customer_po_number?: string | null;
}

const NewInvoiceModal: React.FC<{
  open: boolean;
  /** Start with this quotation picked (e.g. "Create invoice" on the quotation page). */
  presetQuotationId?: number | null;
  onCancel: () => void;
  onCreated: (invoice: any) => void;
  /** Open the quotation so its missing address can be filled in. */
  onFixQuotation: (q: EligibleQuotation) => void;
  /** Make an invoice without a quotation (the full editor). */
  onDirect?: () => void;
}> = ({ open, presetQuotationId, onCancel, onCreated, onFixQuotation, onDirect }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<EligibleQuotation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [picked, setPicked] = useState<EligibleQuotation | null>(null);
  const [presetMissing, setPresetMissing] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState<Dayjs>(dayjs());
  const [terms, setTerms] = useState<number | "custom">(30);
  const [dueDate, setDueDate] = useState<Dayjs>(dayjs().add(30, "day"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bill, setBill] = useState<BillState | null>(null);
  const req = useRef(0);

  const load = useCallback(async (q: string) => {
    const id = ++req.current;
    setLoading(true);
    setFailed(false);
    try {
      const res: any = await service.getEligibleQuotations(q || undefined);
      if (id !== req.current) return;
      setRows(res?.data?.data?.rows || []);
      setTotal(Number(res?.data?.data?.total || 0));
    } catch {
      if (id === req.current) setFailed(true);
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, []);

  // Fresh state every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setPickedId(presetQuotationId || null);
    setPicked(null);
    setPresetMissing(false);
    setInvoiceDate(dayjs());
    setTerms(30);
    setDueDate(dayjs().add(30, "day"));
    setError("");
    form.resetFields();
    load("");
  }, [open, presetQuotationId, load, form]);

  // Search as you type (after a short pause).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the picked quotation even when a search hides it from the list.
  useEffect(() => {
    if (!pickedId) return;
    const hit = rows.find((r) => r.id === pickedId);
    if (hit) {
      setPicked(hit);
      setPresetMissing(false);
    } else if (!loading && !search && presetQuotationId === pickedId && !picked) {
      setPresetMissing(true);
      setPickedId(null);
    }
  }, [rows, pickedId, loading, search, presetQuotationId, picked]);

  const pick = (q: EligibleQuotation) => {
    if (!q.billing_ok || !q.shipping_ok) return;
    setPickedId(q.id);
    setPicked(q);
    setBill(null);
    setError("");
  };

  const setInvDate = (d: Dayjs) => {
    setInvoiceDate(d);
    if (terms !== "custom") setDueDate(d.add(terms, "day"));
  };
  const chooseTerms = (days: number) => {
    setTerms(days);
    setDueDate(invoiceDate.add(days, "day"));
  };

  const problem = useMemo(() => {
    if (!picked) return "Pick the quotation to invoice";
    if (!bill || bill.busy) return "Working out the invoice…";
    if (bill.problem || !bill.request) return bill.problem || "Choose what to bill";
    if (invoiceDate.isAfter(dayjs(), "day")) return "The invoice date can't be in the future";
    if (picked.quotation_date && invoiceDate.isBefore(dayjs(picked.quotation_date), "day")) {
      return `The invoice date can't be before the quotation's date (${shortDate(picked.quotation_date)})`;
    }
    if (bill.request.kind === "challans" && bill.lastChallanDate && invoiceDate.isBefore(dayjs(bill.lastChallanDate), "day")) {
      return `The invoice date can't be before the challan date (${shortDate(bill.lastChallanDate)})`;
    }
    if (dueDate.isBefore(invoiceDate, "day")) return "The due date can't be before the invoice date";
    return null;
  }, [picked, bill, invoiceDate, dueDate]);

  const dueIn = dueDate.startOf("day").diff(invoiceDate.startOf("day"), "day");

  const submit = async () => {
    if (!picked || problem || !bill?.request) {
      setError(problem || "");
      return;
    }
    setSaving(true);
    setError("");
    const r = bill.request;
    const common = {
      invoice_date: invoiceDate.format("YYYY-MM-DD"),
      payment_due_date: dueDate.format("YYYY-MM-DD"),
      series_id: form.getFieldValue("series_id"),
      transport_charges: r.transport_charges,
    };
    try {
      const res: any =
        r.kind === "challans"
          ? await service.createFromChallans({ ...common, challan_ids: r.challan_ids })
          : await service.generateInvoice({ ...common, quotation_id: picked.id, lines: r.lines });
      if (res?.data?.success && res.data.data) {
        message.success(res.data.message || "Invoice created");
        dispatch({ type: ASYNC_GENERATE_INVOICE_SUCCESS });
        onCreated(res.data.data);
      } else {
        setError(res?.data?.message || "The invoice wasn't created. Please try again.");
      }
    } catch (e: any) {
      setError(errorText(e, "The invoice wasn't created. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => !saving && onCancel()}
      footer={null}
      width={720}
      rootClassName="qp-portal ip-portal"
      destroyOnHidden
      title={null}
      closable={!saving}
    >
      <div className="ip-ni">
        <div className="ip-pm-head">
          <span className="ip-pm-icon ni" aria-hidden>
            <FileDoneOutlined />
          </span>
          <div>
            <h3>New invoice</h3>
            <p>From an approved quotation — bill its delivered challans, or choose how much of each item. Prices, GST and the customer carry over.</p>
          </div>
        </div>

        {onDirect && (
          <button type="button" className="ip-ni-direct" onClick={onDirect} disabled={saving}>
            <span className="ip-ni-direct-icon" aria-hidden>
              <FormOutlined />
            </span>
            <span className="ip-ni-direct-text">
              <b>Without a quotation</b>
              <small>A walk-in sale, or goods sent on a challan made without one — type the customer, items and prices.</small>
            </span>
            <RightOutlined aria-hidden />
          </button>
        )}

        <span className="ip-pm-label">1 · Quotation</span>
        <label className="qp-search ip-ni-search">
          <SearchOutlined />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotation number or customer" aria-label="Search approved quotations" />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <CloseCircleFilled />
            </button>
          )}
        </label>
        {presetMissing && (
          <div className="ip-pm-error soft" role="status">
            <ExclamationCircleFilled /> That quotation can't be invoiced right now — it isn't approved yet, or it's already billed in full.
          </div>
        )}
        <div className={`ip-ni-list${loading && rows.length ? " busy" : ""}`} role="radiogroup" aria-label="Approved quotations">
          {failed ? (
            <div className="ip-ni-empty">
              <span>Couldn't load the quotations.</span>
              <button type="button" className="qp-btn ghost sm" onClick={() => load(search.trim())}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          ) : !rows.length && loading ? (
            <div className="ip-ni-empty">
              <Spin size="small" /> Loading approved quotations…
            </div>
          ) : !rows.length ? (
            <div className="ip-ni-empty">
              <FileSearchOutlined />
              <span>
                {search
                  ? "No approved quotation matches that search."
                  : `No approved quotations are waiting for an invoice. Approve a quotation first, then invoice it here${onDirect ? " — or make one without a quotation above" : ""}.`}
              </span>
            </div>
          ) : (
            rows.map((q) => {
              const blocked = !q.billing_ok || !q.shipping_ok;
              const on = pickedId === q.id;
              return (
                <div key={q.id} className={`ip-ni-opt${on ? " on" : ""}${blocked ? " blocked" : ""}`}>
                  <button type="button" role="radio" aria-checked={on} disabled={blocked} onClick={() => pick(q)} className="ip-ni-opt-main">
                    <span className="ip-ni-radio" aria-hidden>
                      {on ? <CheckCircleFilled /> : null}
                    </span>
                    <Avatar name={q.customer_name} seed={q.customer_id || q.customer_name} size={34} />
                    <span className="ip-ni-opt-text">
                      <b>{q.customer_name || "—"}</b>
                      <small>
                        <span className="qd-mono">{q.quotation_number}</span> · {shortDate(q.quotation_date)} · {count(q.items_count)} item{q.items_count === 1 ? "" : "s"}
                        {q.ready_challans ? ` · ${q.ready_challans} challan${q.ready_challans === 1 ? "" : "s"} to bill` : ""}
                      </small>
                    </span>
                    <span className="ip-ni-opt-amt">
                      {q.has_invoice ? (
                        <>
                          <b>{inr(q.to_bill_value || 0)}</b>
                          <small>left to bill</small>
                        </>
                      ) : (
                        <>
                          <b>{inr(q.grand_total)}</b>
                          <small>{q.gst > 0 ? "incl. GST" : "no GST"}</small>
                        </>
                      )}
                    </span>
                  </button>
                  {blocked && (
                    <div className="ip-ni-fix">
                      <ExclamationCircleFilled /> {!q.billing_ok && !q.shipping_ok ? "Billing and shipping addresses are" : !q.billing_ok ? "Billing address is" : "Shipping address is"} incomplete.
                      <button type="button" onClick={() => onFixQuotation(q)}>
                        <EditOutlined /> Fix in the quotation
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        {total > rows.length && !search && <div className="ip-ni-more">Showing the {count(rows.length)} most recent of {count(total)} — search to find others.</div>}

        {picked && (
          <>
            <span className="ip-pm-label">2 · What to bill</span>
            <BillingPanel source={{ quotationId: picked.id }} onChange={setBill} />
          </>
        )}

        <span className="ip-pm-label">{picked ? "3" : "2"} · Dates</span>
        <div className="ip-pm-grid">
          <div>
            <label className="ip-pm-label sub" htmlFor="ip-ni-date">
              Invoice date
            </label>
            <DatePicker
              id="ip-ni-date"
              value={invoiceDate}
              onChange={(d) => d && setInvDate(d)}
              format="D MMM YYYY"
              allowClear={false}
              disabledDate={(d) => d.isAfter(dayjs(), "day") || (!!picked?.quotation_date && d.isBefore(dayjs(picked.quotation_date), "day"))}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label className="ip-pm-label sub" htmlFor="ip-ni-due">
              Payment due
            </label>
            <DatePicker
              id="ip-ni-due"
              value={dueDate}
              onChange={(d) => {
                if (!d) return;
                setDueDate(d);
                const n = d.startOf("day").diff(invoiceDate.startOf("day"), "day");
                setTerms(TERMS.some((t) => t.days === n) ? n : "custom");
              }}
              format="D MMM YYYY"
              allowClear={false}
              disabledDate={(d) => d.isBefore(invoiceDate, "day")}
              style={{ width: "100%" }}
            />
          </div>
        </div>
        <div className="ip-pm-quick" role="group" aria-label="Payment terms">
          {TERMS.map((t) => (
            <button key={t.days} type="button" className={`ip-chip${terms === t.days ? " on" : ""}`} onClick={() => chooseTerms(t.days)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* series_id starts as "" (not undefined) so its hidden input is controlled from the first render. */}
        <Form form={form} layout="vertical" className="ip-ni-series" component={false} initialValues={{ series_id: "" }}>
          <SeriesField docType="INVOICE" form={form} />
        </Form>

        <div className={`ip-ni-sum${picked && bill?.total != null ? "" : " empty"}`} aria-live="polite">
          {picked && bill?.total != null ? (
            <>
              <ThunderboltFilled />
              <span>
                A <b>{rupees(bill.total)}</b> invoice for <b>{picked.customer_name}</b>
                {bill.request?.kind === "challans" ? ` billing ${bill.request.challan_ids.length} challan${bill.request.challan_ids.length === 1 ? "" : "s"}` : ""}, dated{" "}
                {invoiceDate.format("D MMM YYYY")}, {dueIn === 0 ? "due on receipt" : <>due {dueDate.format("D MMM YYYY")} ({dueIn} day{dueIn === 1 ? "" : "s"})</>}.
              </span>
            </>
          ) : (
            <span>{picked ? "Choose what to bill above." : "Pick an approved quotation above."}</span>
          )}
        </div>

        {error && (
          <div className="ip-pm-error" role="alert">
            <ExclamationCircleFilled /> {error}
          </div>
        )}

        <div className="ip-pm-foot">
          <button type="button" className="qp-btn ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="qp-btn primary" onClick={submit} disabled={saving || !picked || !bill?.request || !!bill?.problem || !!bill?.busy}>
            {saving ? "Creating…" : "Create invoice"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default NewInvoiceModal;
