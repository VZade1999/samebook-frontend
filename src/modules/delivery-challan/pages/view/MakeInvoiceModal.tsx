import React, { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker, Form, Modal } from "antd";
import { ExclamationCircleFilled, FileDoneOutlined, LinkOutlined, ThunderboltFilled } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import SeriesField from "@/modules/numbering/SeriesField";
import InvoiceService from "@/modules/invoice/services/invoiceService";
import { ASYNC_GENERATE_INVOICE_SUCCESS } from "@/modules/invoice/redux/invoiceActions";
import BillingPanel, { type BillState } from "@/modules/invoice/pages/view/BillingPanel";
import { convertChallanToInvoice } from "../../redux/challanActions";
import { inr, rupees } from "./shared";
import type { InvoiceTarget } from "./types";

const invoiceService = new InvoiceService();

/** Payment terms offered as one-click choices (days after the invoice date). */
const TERMS = [
  { days: 0, label: "On receipt" },
  { days: 7, label: "7 days" },
  { days: 15, label: "15 days" },
  { days: 30, label: "30 days" },
  { days: 45, label: "45 days" },
  { days: 60, label: "60 days" },
];

export interface InvoiceResult {
  invoice?: { id: number; invoice_number: string };
  invoice_generated?: boolean;
  converted_challan_ids?: number[];
}

const errorOf = (e: any, fallback: string) => (typeof e === "string" ? e : e?.response?.data?.message || e?.message || fallback);

/**
 * Bill a challan made from a quotation: exactly the goods it carried —
 * optionally together with other delivered challans of the same customer on
 * one invoice. When its quotation is already billed in full, the goods are
 * on an invoice already: the challan is just linked to it.
 */
const MakeInvoiceModal: React.FC<{
  target: InvoiceTarget | null;
  onCancel: () => void;
  onDone: (result: InvoiceResult, target: InvoiceTarget) => void;
}> = ({ target, onCancel, onDone }) => {
  const dispatch = useDispatch<any>();
  const [form] = Form.useForm();
  const [invoiceDate, setInvoiceDate] = useState<Dayjs>(dayjs());
  const [terms, setTerms] = useState<number | "custom">(30);
  const [dueDate, setDueDate] = useState<Dayjs>(dayjs().add(30, "day"));
  const [bill, setBill] = useState<BillState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const open = !!target;
  const link = !!target?.quotation_invoice_number;

  useEffect(() => {
    if (!open) return;
    setInvoiceDate(dayjs());
    setTerms(30);
    setDueDate(dayjs().add(30, "day"));
    setBill(null);
    setError("");
    // The series form only exists when a new invoice is made.
    if (!link) form.resetFields();
  }, [open, target?.id, link, form]);

  const setInvDate = (d: Dayjs) => {
    setInvoiceDate(d);
    if (terms !== "custom") setDueDate(d.add(terms, "day"));
  };
  const chooseTerms = (days: number) => {
    setTerms(days);
    setDueDate(invoiceDate.add(days, "day"));
  };

  const problem = useMemo(() => {
    if (link) return null;
    if (!bill || bill.busy) return "Working out the invoice…";
    if (bill.problem || !bill.request) return bill.problem || "Choose what to bill";
    if (invoiceDate.isAfter(dayjs(), "day")) return "The invoice date can't be in the future";
    if (bill.quotationDate && invoiceDate.isBefore(dayjs(bill.quotationDate), "day")) {
      return `The invoice date can't be before the quotation's date (${dayjs(bill.quotationDate).format("D MMM YYYY")})`;
    }
    if (bill.lastChallanDate && invoiceDate.isBefore(dayjs(bill.lastChallanDate), "day")) {
      return `The invoice date can't be before the challan date (${dayjs(bill.lastChallanDate).format("D MMM YYYY")})`;
    }
    if (dueDate.isBefore(invoiceDate, "day")) return "The due date can't be before the invoice date";
    return null;
  }, [link, bill, invoiceDate, dueDate]);
  const dueIn = dueDate.startOf("day").diff(invoiceDate.startOf("day"), "day");

  const submit = async () => {
    if (!target) return;
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (link) {
        const result: InvoiceResult = await dispatch(
          // A due date is always sent (the API asks for one); only a new invoice uses it.
          convertChallanToInvoice({ id: target.id, payment_due_date: dayjs().format("YYYY-MM-DD") }),
        ).unwrap();
        onDone(result || {}, target);
        return;
      }
      const r = bill!.request!;
      if (r.kind !== "challans") throw new Error("Choose the challans to bill");
      const res: any = await invoiceService.createFromChallans({
        challan_ids: r.challan_ids,
        invoice_date: invoiceDate.format("YYYY-MM-DD"),
        payment_due_date: dueDate.format("YYYY-MM-DD"),
        series_id: form.getFieldValue("series_id") || undefined,
        transport_charges: r.transport_charges,
      });
      // A billing change: quotation, challan and invoice lists all refresh.
      dispatch({ type: ASYNC_GENERATE_INVOICE_SUCCESS });
      const data = res?.data?.data || {};
      onDone({ invoice: data.invoice, invoice_generated: true, converted_challan_ids: data.converted_challan_ids }, target);
    } catch (e: any) {
      setError(errorOf(e, link ? "The challan wasn't linked. Please try again." : "The invoice wasn't made. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const nChallans = bill?.request?.kind === "challans" ? bill.request.challan_ids.length : 0;
  return (
    <Modal
      open={open}
      onCancel={() => !saving && onCancel()}
      footer={null}
      width={link ? 640 : 720}
      rootClassName="qp-portal ip-portal dc-portal"
      destroyOnHidden
      title={null}
      closable={!saving}
    >
      {target && (
        <div className="ip-ni">
          <div className="ip-pm-head">
            <span className="ip-pm-icon ni" aria-hidden>
              {link ? <LinkOutlined /> : <FileDoneOutlined />}
            </span>
            <div>
              <h3>{link ? `Link ${target.challan_number} to its invoice` : `Invoice ${target.challan_number}`}</h3>
              <p>
                {target.customer_name || "Customer"}
                {target.quotation_number ? ` · from ${target.quotation_number}` : ""}
                {target.total_value !== undefined && target.total_value !== null ? ` · goods worth ${inr(Number(target.total_value))}` : ""}
              </p>
            </div>
          </div>

          {link ? (
            <div className="ip-ni-sum">
              <LinkOutlined />
              <span>
                Quotation <b>{target.quotation_number}</b> is already billed in full on invoice <b>{target.quotation_invoice_number}</b>, so these goods are billed. This
                challan gets linked to that invoice and marked invoiced — nothing new is billed.
              </span>
            </div>
          ) : (
            <>
              <span className="ip-pm-label">
                What to bill <em>exactly what the challans carried, at the quotation's prices</em>
              </span>
              <BillingPanel source={{ challanId: target.id }} onChange={setBill} />

              <span className="ip-pm-label">Dates</span>
              <div className="ip-pm-grid">
                <div>
                  <label className="ip-pm-label sub" htmlFor="dc-inv-date">
                    Invoice date
                  </label>
                  <DatePicker
                    id="dc-inv-date"
                    value={invoiceDate}
                    onChange={(d) => d && setInvDate(d)}
                    format="D MMM YYYY"
                    allowClear={false}
                    disabledDate={(d) => d.isAfter(dayjs(), "day")}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label className="ip-pm-label sub" htmlFor="dc-inv-due">
                    Payment due
                  </label>
                  <DatePicker
                    id="dc-inv-due"
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
              <div className={`ip-ni-sum${bill?.total != null ? "" : " empty"}`} aria-live="polite">
                {bill?.total != null ? (
                  <>
                    <ThunderboltFilled />
                    <span>
                      A <b>{rupees(bill.total)}</b> invoice for <b>{bill.customerName || target.customer_name || "the customer"}</b> billing {nChallans} challan
                      {nChallans === 1 ? "" : "s"}, dated {invoiceDate.format("D MMM YYYY")},{" "}
                      {dueIn === 0 ? "due on receipt" : <>due {dueDate.format("D MMM YYYY")} ({dueIn} day{dueIn === 1 ? "" : "s"})</>}.
                    </span>
                  </>
                ) : (
                  <span>Working out the invoice…</span>
                )}
              </div>
            </>
          )}

          {/* Date problems (the billing panel shows its own). */}
          {!link && problem && bill && !bill.busy && !bill.problem && (
            <div className="ip-pm-error soft" role="status">
              <ExclamationCircleFilled /> {problem}
            </div>
          )}
          {error && (
            <div className="ip-pm-error" role="alert">
              <ExclamationCircleFilled /> {error}
            </div>
          )}

          <div className="ip-pm-foot">
            <button type="button" className="qp-btn ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="qp-btn primary" onClick={submit} disabled={saving || (!link && !!problem)} title={!link && problem ? problem : undefined}>
              {saving ? (link ? "Linking…" : "Making the invoice…") : link ? "Link invoice" : nChallans > 1 ? `Make invoice for ${nChallans} challans` : "Make invoice"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default MakeInvoiceModal;
