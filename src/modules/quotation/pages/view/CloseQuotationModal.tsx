import React, { useEffect, useMemo, useState } from "react";
import { Input, Modal, Spin, message } from "antd";
import { ClockCircleFilled, CloseCircleFilled, InfoCircleOutlined, StopOutlined } from "@ant-design/icons";
import QuotationService from "../../redux";
import { CLOSE_REASONS, type CloseOutcome, inr, validityOf } from "./shared";

const OUTCOMES: { key: CloseOutcome; title: string; sub: string; icon: React.ReactNode }[] = [
  { key: "REJECTED", title: "Customer said no", sub: "Mark it rejected and note why", icon: <CloseCircleFilled /> },
  { key: "EXPIRED", title: "No reply — expired", sub: "The offer ran out without an answer", icon: <ClockCircleFilled /> },
];

const PLACEHOLDER: Record<CloseOutcome, string> = {
  REJECTED: "What did the customer say? e.g. “Found it ₹2,000 cheaper with a local dealer”",
  EXPIRED: "Anything the team should know, e.g. “Called twice on 10 and 12 Nov, no answer”",
};

/**
 * Closes a quotation as rejected or expired with a reason and the customer's
 * feedback. Nothing is deleted; it can be reopened from the details panel.
 */
const CloseQuotationModal: React.FC<{
  q: any | null;
  onCancel: () => void;
  onClosed: (fresh: any) => void;
}> = ({ q, onCancel, onClosed }) => {
  const service = useMemo(() => new QuotationService(), []);
  const [outcome, setOutcome] = useState<CloseOutcome>("REJECTED");
  const [reason, setReason] = useState<string | null>(null);
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A quotation whose validity already passed most likely just expired.
  useEffect(() => {
    if (!q) return;
    const lapsed = (validityOf(q)?.days ?? 1) < 0;
    setOutcome(lapsed ? "EXPIRED" : "REJECTED");
    setReason(null);
    setRemark("");
    setError(null);
  }, [q?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsRemark = reason === "OTHER";
  const pickOutcome = (o: CloseOutcome) => {
    setOutcome(o);
    setReason(null);
    setError(null);
  };

  const submit = async () => {
    if (!q) return;
    if (!reason) return setError("Pick a reason for closing");
    if (needsRemark && remark.trim().length < 3) return setError("Add a remark explaining why it was closed");
    setSaving(true);
    setError(null);
    try {
      const res = await service.closeQuotation(q.id, { outcome, reason, remark: remark.trim() || undefined });
      if (res?.data?.success) {
        message.success(res.data.message || "Quotation closed");
        onClosed(res.data.data);
      } else {
        setError(res?.data?.message || "Couldn't close the quotation");
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Couldn't close the quotation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!q} onCancel={() => !saving && onCancel()} title={null} footer={null} width={580} centered destroyOnHidden rootClassName="qp-portal">
      {q && (
        <div className="qc">
          <div className="qc-head">
            <span className="qc-head-icon">
              <StopOutlined />
            </span>
            <div>
              <h3>Close quotation</h3>
              <p>
                <span className="qp-mono">{q.quotation_number}</span> · {q.customer_name || "Customer"} · {inr(q.grand_total)}
              </p>
            </div>
          </div>

          <div className="qc-outcomes" role="radiogroup" aria-label="Outcome">
            {OUTCOMES.map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={outcome === o.key}
                className={`qc-outcome ${o.key.toLowerCase()}${outcome === o.key ? " on" : ""}`}
                onClick={() => pickOutcome(o.key)}
              >
                <span className="qc-outcome-icon">{o.icon}</span>
                <b>{o.title}</b>
                <small>{o.sub}</small>
              </button>
            ))}
          </div>

          <div className="qc-label">Reason</div>
          <div className="qc-reasons" role="radiogroup" aria-label="Reason">
            {CLOSE_REASONS[outcome].map((r) => (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={reason === r.key}
                className={`qc-chip${reason === r.key ? " on" : ""}`}
                onClick={() => {
                  setReason(r.key);
                  setError(null);
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="qc-label">
            {outcome === "REJECTED" ? "Customer feedback" : "Remark"}
            <em>{needsRemark ? "required" : "optional"}</em>
          </div>
          <Input.TextArea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            maxLength={1000}
            showCount
            autoSize={{ minRows: 3, maxRows: 7 }}
            placeholder={PLACEHOLDER[outcome]}
            aria-label={outcome === "REJECTED" ? "Customer feedback" : "Remark"}
          />

          {error && (
            <div className="qc-error" role="alert">
              {error}
            </div>
          )}

          <div className="qc-note">
            <InfoCircleOutlined /> Nothing is deleted. The quotation keeps its history, shows under “{outcome === "REJECTED" ? "Rejected" : "Expired"}”, and can be reopened any time.
          </div>

          <div className="qc-foot">
            <button type="button" className="qp-btn ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="qp-btn danger solid" onClick={submit} disabled={saving}>
              {saving ? <Spin size="small" /> : <StopOutlined />} Close as {outcome === "REJECTED" ? "rejected" : "expired"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CloseQuotationModal;
