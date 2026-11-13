import React, { useEffect, useState } from "react";
import { Input, InputNumber, Modal, message } from "antd";
import { CloseCircleFilled, TrophyFilled } from "@ant-design/icons";
import { crmService } from "../services/crmService";
import { LOST_REASONS, Lead, LeadDetail, emitCrmChanged, errText } from "../constants";

interface Props {
  /** The lead and the closing stage being set, or null when closed. */
  target: { lead: Pick<Lead, "id" | "key" | "name" | "estimated_value">; stage: "WON" | "LOST" } | null;
  onClose: () => void;
  onDone: (lead: LeadDetail) => void;
}

/** Closing a lead: the deal value when won, the reason when lost. */
const StageModal: React.FC<Props> = ({ target, onClose, onDone }) => {
  const [reason, setReason] = useState<string>("");
  const [other, setOther] = useState("");
  const [value, setValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const won = target?.stage === "WON";

  useEffect(() => {
    if (!target) return;
    setReason("");
    setOther("");
    setValue(target.lead.estimated_value ?? null);
  }, [target]);

  const save = async () => {
    if (!target) return;
    const lostReason = reason === "__other" ? other.trim() : reason;
    if (!won && !lostReason) {
      message.warning("Pick a reason");
      return;
    }
    setSaving(true);
    try {
      const res = await crmService.stage(target.lead.id, {
        stage: target.stage,
        ...(won ? (value !== null && value !== undefined ? { value } : {}) : { lost_reason: lostReason }),
      });
      emitCrmChanged();
      message.success(won ? `🎉 ${target.lead.key} won` : `${target.lead.key} marked as lost`);
      onDone(res.data.data as LeadDetail);
    } catch (err) {
      message.error(errText(err, "Couldn't update the lead"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!target}
      onCancel={onClose}
      onOk={save}
      okText={won ? "Mark as won" : "Mark as lost"}
      okButtonProps={{ danger: !won }}
      confirmLoading={saving}
      width={480}
      className="crm-modal"
      destroyOnHidden
      title={
        <div className="crm-modal-title">
          <span className={`crm-modal-icon ${won ? "good" : "bad"}`}>{won ? <TrophyFilled /> : <CloseCircleFilled />}</span>
          <div>
            <b>{won ? "Won the deal" : "Lost the lead"}</b>
            <small>
              {target?.lead.key} · {target?.lead.name}
            </small>
          </div>
        </div>
      }
    >
      {won ? (
        <div className="crm-stage-form">
          <label htmlFor="crm-won-value">Final order value (₹)</label>
          <InputNumber
            id="crm-won-value"
            min={0}
            max={999999999999}
            style={{ width: "100%" }}
            value={value as any}
            onChange={(v) => setValue(v === null ? null : Number(v))}
            formatter={(v) => (v ? Number(v).toLocaleString("en-IN") : "")}
            parser={(v) => Number(String(v || "").replace(/[^\d.]/g, "")) as any}
            placeholder="Optional"
            autoFocus
          />
          <p className="crm-hint">Used for won revenue in Insights. Follow-ups on this lead are cleared.</p>
        </div>
      ) : (
        <div className="crm-stage-form">
          <label>Why was it lost?</label>
          <div className="crm-reasons" role="radiogroup">
            {[...LOST_REASONS, "__other"].map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                className={`crm-chip${reason === r ? " on" : ""}`}
                onClick={() => setReason(r)}
              >
                {r === "__other" ? "Something else…" : r}
              </button>
            ))}
          </div>
          {reason === "__other" && (
            <Input.TextArea
              autoFocus
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={300}
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="What happened?"
            />
          )}
          <p className="crm-hint">Lost reasons show up in Insights, so the team can see what to fix.</p>
        </div>
      )}
    </Modal>
  );
};

export default StageModal;
