import React from "react";
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  ExclamationCircleFilled,
  LoadingOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { type AiAction, minutesLeft, RECORD_WORD } from "./aiApi";

const STATUS: Record<AiAction["status"], { word: string; icon: React.ReactNode }> = {
  PENDING: { word: "Waiting for you", icon: <SafetyCertificateOutlined /> },
  RUNNING: { word: "Running…", icon: <LoadingOutlined /> },
  DONE: { word: "Done", icon: <CheckCircleFilled /> },
  FAILED: { word: "Didn't work", icon: <ExclamationCircleFilled /> },
  CANCELLED: { word: "Cancelled", icon: <StopOutlined /> },
  EXPIRED: { word: "Expired", icon: <ClockCircleOutlined /> },
};

/**
 * One thing the assistant did or wants to do. Risky actions wait here for the
 * person's Confirm (only the person who asked can press it); everything else
 * shows how it ended, with a link to the record.
 */
const ActionCard: React.FC<{
  action: AiAction;
  canDecide: boolean;
  busy: boolean;
  onDecide: (a: AiAction, d: "confirm" | "cancel") => void;
}> = ({ action: a, canDecide, busy, onDecide }) => {
  const navigate = useNavigate();
  const waiting = a.status === "PENDING";
  const left = waiting ? minutesLeft(a.expires_at) : null;
  const s = STATUS[a.status] || STATUS.DONE;
  const quiet = a.kind === "write" && a.status === "DONE";

  return (
    <div className={`ai-card s-${a.status.toLowerCase()}${quiet ? " quiet" : ""}`} role={waiting ? "group" : undefined} aria-label={waiting ? `Needs your confirm: ${a.summary}` : undefined}>
      <div className="ai-card-head">
        <span className="ai-card-icon" aria-hidden>
          {busy ? <LoadingOutlined /> : s.icon}
        </span>
        <div className="ai-card-text">
          <b>{a.summary}</b>
          <span className="ai-card-status">
            {busy ? "Working…" : s.word}
            {waiting && left !== null ? ` · expires in ${left} min` : ""}
            {!waiting && a.result && a.status !== "DONE" ? ` · ${a.result}` : ""}
          </span>
        </div>
      </div>
      {waiting && a.details.length > 0 && (
        <ul className="ai-card-details">
          {a.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
      {(waiting || a.record) && (
        <div className="ai-card-foot">
          {a.record && a.status !== "CANCELLED" && a.status !== "EXPIRED" && (
            <button type="button" className="ai-link-btn" onClick={() => navigate(a.record!.link)}>
              Open {RECORD_WORD[a.record.type]?.toLowerCase()} {a.record.label}
            </button>
          )}
          {waiting && canDecide && (
            <div className="ai-card-btns">
              <button type="button" className="ai-btn ghost" disabled={busy} onClick={() => onDecide(a, "cancel")}>
                <CloseCircleFilled /> Cancel
              </button>
              <button type="button" className="ai-btn primary" disabled={busy} onClick={() => onDecide(a, "confirm")}>
                <CheckCircleFilled /> Confirm
              </button>
            </div>
          )}
          {waiting && !canDecide && <span className="ai-card-note">Only the person who asked can confirm this.</span>}
        </div>
      )}
    </div>
  );
};

export default ActionCard;
