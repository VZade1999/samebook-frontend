import React, { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker, Form, Modal } from "antd";
import { ExclamationCircleFilled, FileDoneOutlined, InfoCircleOutlined, LinkOutlined, ThunderboltFilled } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import SeriesField from "@/modules/numbering/SeriesField";
import { convertChallanToInvoice } from "../../redux/challanActions";
import { inr } from "./shared";
import type { InvoiceTarget } from "./types";

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

/**
 * Invoice a challan made from a quotation. When the quotation already has an
 * invoice, the challan is simply linked to it; otherwise a new invoice is made
 * from the whole quotation (all its items, prices and GST). Either way every
 * dispatched or delivered challan of that quotation is marked invoiced.
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const open = !!target;
  const link = !!target?.quotation_invoice_number;

  useEffect(() => {
    if (!open) return;
    setInvoiceDate(dayjs());
    setTerms(30);
    setDueDate(dayjs().add(30, "day"));
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
    if (invoiceDate.isAfter(dayjs(), "day")) return "The invoice date can't be in the future";
    if (dueDate.isBefore(invoiceDate, "day")) return "The due date can't be before the invoice date";
    return null;
  }, [link, invoiceDate, dueDate]);
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
      const result: InvoiceResult = await dispatch(
        convertChallanToInvoice({
          id: target.id,
          // A due date is always sent (the API asks for one); it is only used for a new invoice.
          payment_due_date: (link ? dayjs() : dueDate).format("YYYY-MM-DD"),
          invoice_date: link ? undefined : invoiceDate.format("YYYY-MM-DD"),
          series_id: link ? undefined : form.getFieldValue("series_id") || undefined,
        }),
      ).unwrap();
      onDone(result || {}, target);
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || "The invoice wasn't made. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => !saving && onCancel()}
      footer={null}
      width={640}
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
                Quotation <b>{target.quotation_number}</b> already has invoice <b>{target.quotation_invoice_number}</b>. This challan — and any other dispatched or delivered challan of the
                quotation — gets linked to it and marked invoiced. Nothing new is billed.
              </span>
            </div>
          ) : (
            <>
              <div className="ip-pm-error soft" role="note">
                <InfoCircleOutlined />
                <span>
                  The invoice is made from quotation <b>{target.quotation_number}</b> as a whole — all its items, prices and GST — not only the goods on this challan.
                  Every dispatched or delivered challan of that quotation is then marked invoiced.
                </span>
              </div>
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
              <div className="ip-ni-sum" aria-live="polite">
                <ThunderboltFilled />
                <span>
                  A new invoice for <b>{target.customer_name || "the customer"}</b>, dated {invoiceDate.format("D MMM YYYY")},{" "}
                  {dueIn === 0 ? "due on receipt" : <>due {dueDate.format("D MMM YYYY")} ({dueIn} day{dueIn === 1 ? "" : "s"})</>}.
                </span>
              </div>
            </>
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
            <button type="button" className="qp-btn primary" onClick={submit} disabled={saving}>
              {saving ? (link ? "Linking…" : "Making the invoice…") : link ? "Link invoice" : "Make invoice"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default MakeInvoiceModal;
