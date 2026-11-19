import React, { useEffect, useState } from "react";
import { Input, Modal } from "antd";
import { DeleteOutlined, ExclamationCircleFilled, InboxOutlined, StopOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { cancelChallan, deleteChallan } from "../../redux/challanActions";
import { isTransfer } from "./shared";

export type RemoveMode = "cancel" | "delete";

/** What happens to stock when this challan is cancelled now. */
const stockOnCancel = (c: any) => {
  const moved = c?.status !== "DRAFT" && Number(c?.affects_stock) === 1 && !!c?.from_warehouse_id;
  if (!moved) return null;
  return isTransfer(c)
    ? `The stock moved on dispatch goes back from ${c.to_warehouse_name || "the destination"} to ${c.from_warehouse_name || "the source warehouse"}. If the destination no longer has it, cancelling is refused.`
    : `The goods taken out on dispatch go back into ${c.from_warehouse_name || "the warehouse"}'s stock.`;
};

/**
 * Cancel a challan (kept for the record, with an optional reason; stock moved
 * on dispatch is put back) or delete a draft that was never sent.
 */
const RemoveChallanModal: React.FC<{
  target: any | null;
  mode: RemoveMode;
  onCancel: () => void;
  onDone: (c: any, mode: RemoveMode) => void;
}> = ({ target, mode, onCancel, onDone }) => {
  const dispatch = useDispatch<any>();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const open = !!target;

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError("");
  }, [open, target?.id]);

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    setError("");
    try {
      if (mode === "delete") await dispatch(deleteChallan(target.id)).unwrap();
      else await dispatch(cancelChallan({ id: target.id, reason: reason.trim() || undefined })).unwrap();
      onDone(target, mode);
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || "That didn't work. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const stock = mode === "cancel" ? stockOnCancel(target) : null;

  return (
    <Modal open={open} onCancel={() => !saving && onCancel()} footer={null} width={520} rootClassName="qp-portal ip-portal dc-portal" destroyOnHidden title={null} closable={!saving}>
      {target && (
        <div className="ip-ni">
          <div className="ip-pm-head">
            <span className="ip-pm-icon dc-icon danger" aria-hidden>
              {mode === "delete" ? <DeleteOutlined /> : <StopOutlined />}
            </span>
            <div>
              <h3>{mode === "delete" ? `Delete draft ${target.challan_number}?` : `Cancel ${target.challan_number}?`}</h3>
              <p>
                {mode === "delete"
                  ? "It was never sent, so nothing else changes. Its number won't be used again."
                  : "It stays on record as cancelled and stops counting anywhere. This can't be undone."}
              </p>
            </div>
          </div>

          {stock && (
            <div className="ip-pm-error soft" role="note">
              <InboxOutlined /> {stock}
            </div>
          )}
          {mode === "cancel" && target.status === "DELIVERED" && (
            <div className="ip-pm-error soft" role="note">
              <ExclamationCircleFilled /> These goods were marked delivered. Cancel only if they came back or the challan was made by mistake.
            </div>
          )}

          {mode === "cancel" && (
            <>
              <label className="ip-pm-label" htmlFor="dc-cancel-reason">
                Why? <em>optional — shown in the activity</em>
              </label>
              <Input.TextArea
                id="dc-cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="e.g. Customer postponed the order"
              />
            </>
          )}

          {error && (
            <div className="ip-pm-error" role="alert">
              <ExclamationCircleFilled /> {error}
            </div>
          )}

          <div className="ip-pm-foot">
            <button type="button" className="qp-btn ghost" onClick={onCancel} disabled={saving}>
              Keep it
            </button>
            <button type="button" className="qp-btn danger" onClick={submit} disabled={saving}>
              {saving ? "Working…" : mode === "delete" ? "Delete draft" : "Cancel challan"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default RemoveChallanModal;
