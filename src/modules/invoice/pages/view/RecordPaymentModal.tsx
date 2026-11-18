import React, { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker, Input, InputNumber, Modal, message } from "antd";
import { CheckCircleFilled, ExclamationCircleFilled } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import InvoiceService from "../../services/invoiceService";
import { ASYNC_ADD_PAYMENT_SUCCESS } from "../../redux/invoiceActions";
import { PAYMENT_MODES, balanceOf, errorText, rupees } from "./shared";

const service = new InvoiceService();
const NOTES_MAX = 500;
const REF_MAX = 100;

/** Rupees → paise, so comparisons against the balance never suffer float noise. */
const paise = (v: number | null | undefined) => Math.round((Number(v) || 0) * 100);

export interface PayTarget {
  id: number;
  invoice_number: string;
  customer_name?: string;
  grand_total: number | string;
  paid_amount?: number | string;
  balance_amount?: number | string;
  invoice_date?: string;
}

const RecordPaymentModal: React.FC<{
  inv: PayTarget | null;
  onCancel: () => void;
  onRecorded: (result: { invoice_id: number; status: string; balance_amount: number }) => void;
}> = ({ inv, onCancel, onRecorded }) => {
  const dispatch = useDispatch();
  const balance = balanceOf(inv);
  const [amount, setAmount] = useState<number | null>(balance);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [mode, setMode] = useState("UPI");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  // A new invoice opened in the dialog starts fresh, on the full balance.
  useEffect(() => {
    if (!inv) return;
    setAmount(balanceOf(inv));
    setDate(dayjs());
    setMode("UPI");
    setReference("");
    setNotes("");
    setError("");
    setTouched(false);
  }, [inv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const amountPaise = paise(amount);
  const balancePaise = paise(balance);
  const half = Math.round(balancePaise / 2) / 100;
  const problem =
    !amount || amountPaise <= 0
      ? "Enter the amount received"
      : amountPaise > balancePaise
        ? `That is more than the balance due (${rupees(balance)})`
        : !date
          ? "Pick the date it was received"
          : null;
  const settles = !problem && amountPaise === balancePaise;
  const leftAfter = Math.max(0, balancePaise - amountPaise) / 100;
  const modeDef = useMemo(() => PAYMENT_MODES.find((m) => m.key === mode) || PAYMENT_MODES[0], [mode]);

  const submit = async () => {
    setTouched(true);
    if (!inv || problem) return;
    setSaving(true);
    setError("");
    try {
      const res: any = await service.addPayment(inv.id, {
        amount: amountPaise / 100,
        payment_date: date.format("YYYY-MM-DD"),
        payment_mode: mode,
        transaction_reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (res?.data?.success && res.data.data) {
        message.success(res.data.message || "Payment recorded");
        // A billing change: every cached list / details copy is dropped and refetched.
        dispatch({ type: ASYNC_ADD_PAYMENT_SUCCESS });
        onRecorded(res.data.data);
      } else {
        setError(res?.data?.message || "The payment wasn't recorded. Please try again.");
      }
    } catch (e: any) {
      setError(errorText(e, "The payment wasn't recorded. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!inv}
      onCancel={() => !saving && onCancel()}
      footer={null}
      width={560}
      rootClassName="qp-portal ip-portal"
      destroyOnHidden
      title={null}
      closable={!saving}
    >
      {inv && (
        <div className="ip-pm">
          <div className="ip-pm-head">
            <span className="ip-pm-icon" aria-hidden>
              ₹
            </span>
            <div>
              <h3>Record a payment</h3>
              <p>
                <span className="qd-mono">{inv.invoice_number}</span>
                {inv.customer_name ? ` · ${inv.customer_name}` : ""}
              </p>
            </div>
          </div>

          <div className="ip-pm-strip">
            <div>
              <span>Invoice total</span>
              <b>{rupees(inv.grand_total)}</b>
            </div>
            <div>
              <span>Received so far</span>
              <b>{rupees(inv.paid_amount || 0)}</b>
            </div>
            <div className="due">
              <span>Balance due</span>
              <b>{rupees(balance)}</b>
            </div>
          </div>

          <label className="ip-pm-label" htmlFor="ip-pm-amount">
            Amount received
          </label>
          <InputNumber
            id="ip-pm-amount"
            className="ip-pm-amount"
            prefix="₹"
            min={0}
            step={1}
            precision={2}
            value={amount}
            onChange={(v) => setAmount(v === null ? null : Number(v))}
            status={touched && problem && problem !== "Pick the date it was received" ? "error" : undefined}
            autoFocus
            onPressEnter={submit}
          />
          <div className="ip-pm-quick" role="group" aria-label="Quick amounts">
            <button type="button" className={`ip-chip${amountPaise === balancePaise ? " on" : ""}`} onClick={() => setAmount(balance)}>
              Full balance · {rupees(balance)}
            </button>
            {balancePaise >= 200 && (
              <button type="button" className={`ip-chip${amountPaise === paise(half) && amountPaise !== balancePaise ? " on" : ""}`} onClick={() => setAmount(half)}>
                Half · {rupees(half)}
              </button>
            )}
          </div>

          <div className="ip-pm-grid">
            <div>
              <label className="ip-pm-label" htmlFor="ip-pm-date">
                Received on
              </label>
              <DatePicker
                id="ip-pm-date"
                value={date}
                onChange={(d) => d && setDate(d)}
                format="D MMM YYYY"
                allowClear={false}
                disabledDate={(d) => d.isAfter(dayjs(), "day")}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label className="ip-pm-label" htmlFor="ip-pm-ref">
                {modeDef.ref} <em>optional</em>
              </label>
              <Input id="ip-pm-ref" value={reference} maxLength={REF_MAX} onChange={(e) => setReference(e.target.value)} placeholder={mode === "CASH" ? "e.g. R-1042" : mode === "CHEQUE" ? "e.g. 004512" : "e.g. 4123 5678 9012"} />
            </div>
          </div>

          <span className="ip-pm-label">How was it paid?</span>
          <div className="ip-pm-modes" role="radiogroup" aria-label="Payment method">
            {PAYMENT_MODES.map((m) => (
              <button key={m.key} type="button" role="radio" aria-checked={mode === m.key} className={`ip-mode${mode === m.key ? " on" : ""}`} onClick={() => setMode(m.key)}>
                <span aria-hidden>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          <label className="ip-pm-label" htmlFor="ip-pm-notes">
            Note <em>optional</em>
          </label>
          <Input.TextArea id="ip-pm-notes" value={notes} maxLength={NOTES_MAX} onChange={(e) => setNotes(e.target.value)} autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Anything worth remembering about this payment" />

          <div className={`ip-pm-after${settles ? " settles" : ""}`} aria-live="polite">
            {problem && touched ? (
              <span className="bad">
                <ExclamationCircleFilled /> {problem}
              </span>
            ) : settles ? (
              <span>
                <CheckCircleFilled /> This settles the invoice in full.
              </span>
            ) : !problem ? (
              <span>
                After this payment, <b>{rupees(leftAfter)}</b> will still be due.
              </span>
            ) : (
              <span>Enter the amount you received.</span>
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
            <button type="button" className="qp-btn primary ip-pm-save" onClick={submit} disabled={saving}>
              {saving ? "Recording…" : `Record ${amount && amountPaise > 0 ? rupees(amountPaise / 100) : "payment"}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default RecordPaymentModal;
