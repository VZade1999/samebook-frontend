import React, { useMemo } from "react";
import { Tooltip } from "antd";
import dayjs from "dayjs";
import {
  ClockCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  FlagOutlined,
  InboxOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  ProfileOutlined,
  RetweetOutlined,
  ShopOutlined,
  TeamOutlined,
  UserSwitchOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { inr } from "@/modules/dashboard/utils/format";
import { Activity, OUTCOME_LABEL, STAGE, sourceLabel, whenLabel } from "../constants";

const LOOK: Record<string, { icon: React.ReactNode; color: string }> = {
  CALL: { icon: <PhoneOutlined />, color: "#0891b2" },
  WHATSAPP: { icon: <WhatsAppOutlined />, color: "#0ca30c" },
  EMAIL: { icon: <MailOutlined />, color: "#475569" },
  MEETING: { icon: <TeamOutlined />, color: "#7c3aed" },
  NOTE: { icon: <ProfileOutlined />, color: "#64748b" },
  CREATED: { icon: <InboxOutlined />, color: "#2a78d6" },
  ENQUIRY: { icon: <RetweetOutlined />, color: "#eb6834" },
  STAGE: { icon: <FlagOutlined />, color: "#6250d6" },
  ASSIGNED: { icon: <UserSwitchOutlined />, color: "#4f46e5" },
  FOLLOW_UP: { icon: <ClockCircleOutlined />, color: "#d98a00" },
  CONVERTED: { icon: <ShopOutlined />, color: "#059669" },
  QUOTATION: { icon: <FileTextOutlined />, color: "#c98500" },
  UPDATED: { icon: <EditOutlined />, color: "#64748b" },
};

const OUTCOME_TONE: Record<string, string> = {
  CONNECTED: "good",
  CALL_BACK: "warn",
  NO_ANSWER: "muted",
  BUSY: "muted",
  SWITCHED_OFF: "muted",
  WRONG_NUMBER: "bad",
  NOT_INTERESTED: "bad",
};

interface Props {
  items: Activity[];
  /** id → name, for "assigned to …". */
  people: Map<number, string>;
  showMoney: boolean;
}

const dayTitle = (d: dayjs.Dayjs) => {
  const now = dayjs();
  if (d.isSame(now, "day")) return "Today";
  if (d.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
  return d.format(d.year() === now.year() ? "ddd, D MMM" : "D MMM YYYY");
};

/** The lead's story, newest first, grouped by day. */
const Timeline: React.FC<Props> = ({ items, people, showMoney }) => {
  const groups = useMemo(() => {
    const out: { title: string; items: Activity[] }[] = [];
    items.forEach((a) => {
      const t = dayTitle(dayjs(a.created_at));
      if (!out.length || out[out.length - 1].title !== t) out.push({ title: t, items: [] });
      out[out.length - 1].items.push(a);
    });
    return out;
  }, [items]);

  const who = (a: Activity) => a.user?.name || "SameBook";
  const nameOf = (id: any) => (id ? people.get(Number(id)) || "someone" : null);

  const line = (a: Activity): React.ReactNode => {
    const m = a.meta || {};
    switch (a.type) {
      case "CREATED":
        return a.user ? (
          <>
            <b>{who(a)}</b> added this lead{m.source ? <> · {sourceLabel(m.source)}</> : null}
          </>
        ) : (
          <>
            New enquiry from <b>{a.body || sourceLabel(m.source)}</b>
            {m.detail ? <> · {m.detail}</> : null}
          </>
        );
      case "ENQUIRY":
        return (
          <>
            <b>Enquired again</b> via {sourceLabel(m.source)}
            {m.detail ? <> · {m.detail}</> : null}
          </>
        );
      case "STAGE": {
        const to = STAGE[m.to as keyof typeof STAGE];
        const from = STAGE[m.from as keyof typeof STAGE];
        const pill = <span className="crm-tl-stage" style={{ ["--c" as any]: to?.color }}>{to?.label || m.to}</span>;
        if (m.auto === "contacted") return <>Moved to {pill} after the first contact</>;
        if (m.auto === "quotation") return <>Moved to {pill} — a quotation was made</>;
        return (
          <>
            <b>{who(a)}</b> moved it {from ? <>from {from.label} </> : null}to {pill}
            {m.to === "WON" && m.value ? <> · {showMoney ? inr(m.value) : "value saved"}</> : null}
          </>
        );
      }
      case "ASSIGNED":
        if (m.claimed) return <><b>{who(a)}</b> took this lead</>;
        if (!m.to) return <><b>{who(a)}</b> moved it back to unassigned</>;
        return (
          <>
            <b>{who(a)}</b> assigned it to <b>{nameOf(m.to)}</b>
          </>
        );
      case "FOLLOW_UP":
        return m.at ? (
          <>
            <b>{who(a)}</b> planned a follow-up for <b>{whenLabel(m.at)}</b>
          </>
        ) : (
          <>
            <b>{who(a)}</b> cleared the follow-up
          </>
        );
      case "CONVERTED":
        return (
          <>
            <b>{who(a)}</b> · {a.body}
          </>
        );
      case "QUOTATION":
        return (
          <>
            <b>{a.user ? who(a) : "Quotation"}</b> {a.user ? "created quotation" : "created:"} <b>{m.number}</b>
            {showMoney && m.total ? <> · {inr(m.total)}</> : null}
          </>
        );
      case "UPDATED":
        return (
          <>
            <b>{who(a)}</b> updated {Array.isArray(m.fields) && m.fields.length ? m.fields.join(", ") : "details"}
          </>
        );
      case "CALL":
        return (
          <>
            <b>{who(a)}</b> called
            {a.outcome && <span className={`crm-outcome ${OUTCOME_TONE[a.outcome] || ""}`}>{OUTCOME_LABEL[a.outcome] || a.outcome}</span>}
          </>
        );
      case "WHATSAPP":
        return <><b>{who(a)}</b> sent a WhatsApp</>;
      case "EMAIL":
        return <><b>{who(a)}</b> sent an email</>;
      case "MEETING":
        return <><b>{who(a)}</b> had a meeting</>;
      case "NOTE":
        return <><b>{who(a)}</b> added a note</>;
      default:
        return <><b>{who(a)}</b> · {a.type.toLowerCase()}</>;
    }
  };

  const showBody = (a: Activity) => !!a.body && !["CREATED", "CONVERTED", "QUOTATION"].includes(a.type);

  return (
    <div className="crm-timeline">
      {groups.map((g) => (
        <section key={g.title} className="crm-tl-group">
          <h5>{g.title}</h5>
          <ol>
            {g.items.map((a) => {
              const look = LOOK[a.type] || { icon: <MessageOutlined />, color: "#64748b" };
              const next = a.meta && "next_follow_up_at" in a.meta ? a.meta.next_follow_up_at : undefined;
              return (
                <li key={a.id} className={`crm-tl-item t-${a.type.toLowerCase()}`} style={{ ["--ac" as any]: look.color }}>
                  <span className="crm-tl-icon">{look.icon}</span>
                  <div className="crm-tl-body">
                    <div className="crm-tl-line">
                      <span>{line(a)}</span>
                      <Tooltip title={dayjs(a.created_at).format("D MMM YYYY, h:mm A")}>
                        <time dateTime={a.created_at}>{dayjs(a.created_at).format("h:mm A")}</time>
                      </Tooltip>
                    </div>
                    {showBody(a) && <p className={`crm-tl-text${a.type === "STAGE" ? " reason" : ""}`}>{a.body}</p>}
                    {next !== undefined && (
                      <div className="crm-tl-next">
                        <ClockCircleOutlined /> {next ? <>Next follow-up {whenLabel(next)}</> : "No further follow-up"}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};

export default Timeline;
