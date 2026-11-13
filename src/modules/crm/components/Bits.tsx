import React from "react";
import { Tooltip } from "antd";
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  ExclamationCircleFilled,
  FacebookFilled,
  FireFilled,
  FlagOutlined,
  GlobalOutlined,
  GoogleOutlined,
  MailOutlined,
  PhoneOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { inr, inrCompact } from "@/modules/dashboard/utils/format";
import {
  Lead,
  RATING,
  SOURCE,
  STAGE,
  avatarColor,
  initials,
  overdueBy,
  whenLabel,
} from "../constants";

export const SOURCE_ICON: Record<string, React.ReactNode> = {
  INDIAMART: <ShopOutlined />,
  WEBSITE: <GlobalOutlined />,
  FACEBOOK: <FacebookFilled />,
  GOOGLE: <GoogleOutlined />,
  JUSTDIAL: <PhoneOutlined />,
  TRADEINDIA: <ShopOutlined />,
  WHATSAPP: <WhatsAppOutlined />,
  PHONE: <PhoneOutlined />,
  WALK_IN: <UserOutlined />,
  REFERRAL: <TeamOutlined />,
  EXHIBITION: <FlagOutlined />,
  EMAIL: <MailOutlined />,
  OTHER: <AppstoreOutlined />,
};

export const Avatar: React.FC<{ name?: string | null; seed?: string | number | null; size?: number; ring?: string; title?: string }> = ({
  name,
  seed,
  size = 28,
  ring,
  title,
}) => (
  <span
    className="crm-avatar"
    title={title ?? name ?? undefined}
    style={{
      width: size,
      height: size,
      fontSize: Math.max(10, Math.round(size * 0.38)),
      background: avatarColor(seed ?? name),
      boxShadow: ring ? `0 0 0 2px var(--card), 0 0 0 4px ${ring}` : undefined,
    }}
  >
    {initials(name)}
  </span>
);

export const StagePill: React.FC<{ stage: string; small?: boolean }> = ({ stage, small }) => {
  const s = STAGE[stage as keyof typeof STAGE];
  return (
    <span className={`crm-stage-pill${small ? " sm" : ""}`} style={{ ["--c" as any]: s?.color || "#64748b" }}>
      <i />
      {s?.label || stage}
    </span>
  );
};

export const SourceChip: React.FC<{ source: string; detail?: string | null; compact?: boolean }> = ({ source, detail, compact }) => {
  const s = SOURCE[source];
  const chip = (
    <span className={`crm-src${compact ? " compact" : ""}`} style={{ ["--c" as any]: s?.color || "#64748b" }}>
      {SOURCE_ICON[source] || <AppstoreOutlined />}
      {!compact && <span>{s?.label || source}</span>}
    </span>
  );
  return detail || compact ? <Tooltip title={[s?.label || source, detail].filter(Boolean).join(" · ")}>{chip}</Tooltip> : chip;
};

export const RatingBadge: React.FC<{ rating?: string | null; withLabel?: boolean }> = ({ rating, withLabel }) => {
  if (!rating || !RATING[rating]) return null;
  const r = RATING[rating];
  return (
    <Tooltip title={`${r.label} — ${r.hint}`}>
      <span className={`crm-rating r-${rating.toLowerCase()}`} style={{ ["--c" as any]: r.color }}>
        <FireFilled />
        {withLabel && <span>{r.label}</span>}
      </span>
    </Tooltip>
  );
};

/** Follow-up state at a glance: overdue (red), today (amber), later, or none. */
export const FollowUpChip: React.FC<{ lead: Pick<Lead, "next_follow_up_at" | "follow_up_state" | "stage" | "follow_up_note">; showNone?: boolean }> = ({
  lead,
  showNone,
}) => {
  if (!lead.next_follow_up_at) {
    if (!showNone || lead.stage === "WON" || lead.stage === "LOST") return null;
    return (
      <Tooltip title="No next step planned">
        <span className="crm-fu none">
          <ExclamationCircleFilled /> No follow-up
        </span>
      </Tooltip>
    );
  }
  const state = lead.follow_up_state;
  const text = state === "OVERDUE" ? `Overdue ${overdueBy(lead.next_follow_up_at)}` : whenLabel(lead.next_follow_up_at);
  return (
    <Tooltip title={[whenLabel(lead.next_follow_up_at), lead.follow_up_note].filter(Boolean).join(" — ")}>
      <span className={`crm-fu ${(state || "upcoming").toLowerCase()}`}>
        <ClockCircleOutlined /> {text}
      </span>
    </Tooltip>
  );
};

export const Money: React.FC<{ value?: number | null; compact?: boolean; muted?: boolean }> = ({ value, compact, muted }) =>
  value === null || value === undefined ? (
    muted ? <span className="crm-money none">—</span> : null
  ) : (
    <Tooltip title={inr(value)}>
      <span className="crm-money">{compact ? inrCompact(value) : inr(value)}</span>
    </Tooltip>
  );

export const KeyChip: React.FC<{ k: string }> = ({ k }) => <span className="crm-key">{k}</span>;

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; sub?: React.ReactNode; action?: React.ReactNode }> = ({
  icon,
  title,
  sub,
  action,
}) => (
  <div className="crm-empty">
    <div className="crm-empty-icon">{icon}</div>
    <h3>{title}</h3>
    {sub && <p>{sub}</p>}
    {action}
  </div>
);
