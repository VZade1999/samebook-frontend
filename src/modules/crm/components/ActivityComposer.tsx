import React, { useEffect, useState } from "react";
import { Input, Spin, message } from "antd";
import {
  MailOutlined,
  PhoneOutlined,
  ProfileOutlined,
  SendOutlined,
  TeamOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { crmService } from "../services/crmService";
import { CALL_OUTCOMES, LOG_TYPES, LeadDetail, LogType, emitCrmChanged, errText, whenLabel } from "../constants";
import FollowUpPicker, { quickPicks } from "./FollowUpPicker";

const ICON: Record<LogType, React.ReactNode> = {
  CALL: <PhoneOutlined />,
  WHATSAPP: <WhatsAppOutlined />,
  EMAIL: <MailOutlined />,
  MEETING: <TeamOutlined />,
  NOTE: <ProfileOutlined />,
};

const PLACEHOLDER: Record<LogType, string> = {
  CALL: "What did you talk about? Quantity, price, timeline…",
  WHATSAPP: "What did you send or what did they reply?",
  EMAIL: "What was the email about?",
  MEETING: "Where did you meet and what was agreed?",
  NOTE: "Write a note for the team…",
};

/** Suggested next follow-up after an activity (the user can change it). */
const suggest = (type: LogType, outcome?: string | null): string | null | undefined => {
  const picks = quickPicks();
  const by = (k: string) => picks.find((p) => p.key === k)?.at.toISOString();
  if (type === "NOTE") return undefined;
  if (type === "CALL") {
    if (!outcome) return undefined;
    if (["NO_ANSWER", "BUSY", "SWITCHED_OFF"].includes(outcome)) return by("2h") ?? by("tom");
    if (outcome === "CALL_BACK") return by("tom");
    if (["WRONG_NUMBER", "NOT_INTERESTED"].includes(outcome)) return null;
    return by("2d");
  }
  return by("2d");
};

interface Props {
  lead: LeadDetail;
  initialType?: LogType;
  onLogged: (lead: LeadDetail) => void;
  onSuggestLost?: () => void;
}

const ActivityComposer: React.FC<Props> = ({ lead, initialType = "CALL", onLogged, onSuggestLost }) => {
  const [type, setType] = useState<LogType>(initialType);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [next, setNext] = useState<string | null | undefined>(undefined);
  const [touchedNext, setTouchedNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const closed = lead.stage === "WON" || lead.stage === "LOST";

  useEffect(() => setType(initialType), [initialType]);
  useEffect(() => {
    if (!touchedNext && !closed) setNext(suggest(type, outcome));
  }, [type, outcome, touchedNext, closed]);

  const reset = () => {
    setOutcome(null);
    setBody("");
    setNext(undefined);
    setTouchedNext(false);
  };

  const save = async () => {
    if (type === "CALL" && !outcome) {
      message.warning("Pick how the call went");
      return;
    }
    if (type === "NOTE" && !body.trim()) {
      message.warning("Write the note first");
      return;
    }
    setSaving(true);
    try {
      const payload: any = { type, ...(outcome && type === "CALL" ? { outcome } : {}), ...(body.trim() ? { body: body.trim() } : {}) };
      if (next !== undefined && !closed && type !== "NOTE") payload.next_follow_up_at = next;
      const res = await crmService.log(lead.id, payload);
      emitCrmChanged();
      message.success(type === "NOTE" ? "Note added" : "Activity logged");
      const notInterested = type === "CALL" && outcome === "NOT_INTERESTED";
      reset();
      onLogged(res.data.data as LeadDetail);
      if (notInterested && onSuggestLost) onSuggestLost();
    } catch (err) {
      message.error(errText(err, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };

  const current = lead.next_follow_up_at;
  const keepHint =
    next === undefined && current && !closed
      ? lead.follow_up_state === "UPCOMING"
        ? `The planned follow-up (${whenLabel(current)}) stays.`
        : `The follow-up that was due (${whenLabel(current)}) will be marked done.`
      : null;

  return (
    <div className="crm-composer" onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && save()}>
      <div className="crm-composer-tabs" role="tablist" aria-label="Activity type">
        {LOG_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={type === t.key}
            className={`crm-ctab t-${t.key.toLowerCase()}${type === t.key ? " on" : ""}`}
            onClick={() => {
              setType(t.key);
              setOutcome(null);
            }}
          >
            {ICON[t.key]} <span>{t.label}</span>
          </button>
        ))}
      </div>

      {type === "CALL" && (
        <div className="crm-outcomes" role="radiogroup" aria-label="How did the call go?">
          {CALL_OUTCOMES.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={outcome === o.key}
              className={`crm-chip${outcome === o.key ? " on" : ""}${o.reached ? "" : " soft"}`}
              onClick={() => setOutcome(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <Input.TextArea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={PLACEHOLDER[type]}
        autoSize={{ minRows: 2, maxRows: 8 }}
        maxLength={5000}
        aria-label="Details"
      />

      {!closed && type !== "NOTE" && (
        <div className="crm-composer-next">
          <span className="crm-composer-label">Next follow-up</span>
          <FollowUpPicker
            value={next}
            onChange={(v) => {
              setTouchedNext(true);
              setNext(v);
            }}
            allowNone
            size="sm"
          />
          {keepHint && <div className="crm-hint">{keepHint}</div>}
        </div>
      )}

      <div className="crm-composer-foot">
        <span className="crm-hint">Ctrl + Enter to save</span>
        <button className="crm-btn primary" onClick={save} disabled={saving}>
          {saving ? <Spin size="small" /> : <SendOutlined />} {type === "NOTE" ? "Add note" : "Log activity"}
        </button>
      </div>
    </div>
  );
};

export default ActivityComposer;
