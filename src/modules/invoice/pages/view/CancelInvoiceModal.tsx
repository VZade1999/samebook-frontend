import React, { useEffect, useMemo, useState } from "react";
import { Input, Modal, Spin } from "antd";
import { ExclamationCircleFilled, InfoCircleOutlined, StopOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import InvoiceService from "../../services/invoiceService";
import { invoiceCancelled } from "../../redux/invoiceActions";
import { errorText, inr } from "./shared";

const service = new InvoiceService();

/** Common reasons, one click each (GST e-invoice cancellations use similar ones). */
const REASONS = ["Wrong details on the invoice", "Duplicate invoice", "Order cancelled by the customer", "Wrong quantity or price"];

/**
 * Cancels an invoice that has no payments. The number stays used (a cancelled
 * invoice is kept on record); its challans go back to "ready to invoice" and
 * the quotation can be billed again.
 */
const CancelInvoiceModal: React.FC<{
  inv: any | null;
  onCancel: () => void;
  onDone: (message: string) => void;
}> = ({ inv, onCancel, onDone }) => {
  const dispatch = useDispatch();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReason("");
    setError("");
  }, [inv?.id]);

  const problem = useMemo(() => (reason.trim().length < 3 ? "Say why the invoice is cancelled" : null), [reason]);

  const submit = async () => {
    if (!inv) return;
    if (problem) return setError(problem);
    setSaving(true);
    setError("");
    try {
      const res: any = await service.cancelInvoice(inv.id, reason.trim());
      dispatch(invoiceCancelled(inv.id));
      onDone(res?.data?.message || `${inv.invoice_number} cancelled`);
    } catch (e) {
      setError(errorText(e, "The invoice wasn't cancelled. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!inv} onCancel={() => !saving && onCancel()} title={null} footer={null} width={560} centered destroyOnHidden rootClassName="qp-portal ip-portal">
      {inv && (
        <div className="qc">
          <div className="qc-head">
            <span className="qc-head-icon">
              <StopOutlined />
            </span>
            <div>
              <h3>Cancel invoice</h3>
              <p>
                <span className="qp-mono">{inv.invoice_number}</span> · {inv.customer_name || "Customer"} · {inr(inv.grand_total)}
              </p>
            </div>
          </div>

          <div className="qc-label">
            Reason <em>required</em>
          </div>
          <div className="qc-reasons" role="group" aria-label="Common reasons">
            {REASONS.map((r) => (
              <button key={r} type="button" className={`qc-chip${reason === r ? " on" : ""}`} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
          <Input.TextArea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
            maxLength={300}
            showCount
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Why is it cancelled?"
            aria-label="Reason for cancelling"
          />

          {error && (
            <div className="qc-error" role="alert">
              <ExclamationCircleFilled /> {error}
            </div>
          )}

          <div className="qc-note">
            <InfoCircleOutlined />
            <span>
              The number <b>{inv.invoice_number}</b> stays used and the invoice is kept as cancelled. Its delivery challans go back to “Ready to invoice”, and what it billed on the
              quotation can be billed again.
            </span>
          </div>

          <div className="qc-foot">
            <button type="button" className="qp-btn ghost" onClick={onCancel} disabled={saving}>
              Keep it
            </button>
            <button type="button" className="qp-btn danger solid" onClick={submit} disabled={saving}>
              {saving ? <Spin size="small" /> : <StopOutlined />} Cancel invoice
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CancelInvoiceModal;
