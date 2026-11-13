import React from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  EditFilled,
  FileDoneOutlined,
  SendOutlined,
} from "@ant-design/icons";

export { inr, inrCompact, count, pct } from "@/modules/dashboard/utils/format";

// ── Stages (mirrors quotation-insights.rules.ts on the backend) ──────────────

export type Stage = "draft" | "sent" | "approved" | "invoiced" | "rejected" | "expired";
export const APPROVED_STATUSES = ["APPROVED", "PARTIALLY_DISPATCHED", "FULLY_DISPATCHED"];
export const OPEN_STAGES: Stage[] = ["draft", "sent", "approved"];

export const stageOf = (q: any): Stage => {
  if (!q) return "draft";
  if (q.has_invoice || q.status === "INVOICED") return "invoiced";
  if (q.status === "REJECTED") return "rejected";
  if (q.status === "EXPIRED") return "expired";
  if (APPROVED_STATUSES.includes(q.status)) return "approved";
  if (q.status === "SENT") return "sent";
  return "draft";
};

export const STAGE_META: Record<Stage, { label: string; icon: React.ReactNode; hint: string }> = {
  draft: { label: "Draft", icon: <EditFilled />, hint: "Not shared with the customer yet" },
  sent: { label: "Sent", icon: <SendOutlined />, hint: "Shared, waiting for the customer" },
  approved: { label: "Approved", icon: <CheckCircleFilled />, hint: "Accepted by the customer, ready to invoice" },
  invoiced: { label: "Invoiced", icon: <FileDoneOutlined />, hint: "An invoice was made from it" },
  rejected: { label: "Rejected", icon: <CloseCircleFilled />, hint: "The customer declined it" },
  expired: { label: "Expired", icon: <ClockCircleFilled />, hint: "Marked as expired" },
};

/** Extra word on an approved quotation that goods already moved against. */
export const dispatchNote = (q: any) =>
  q?.status === "PARTIALLY_DISPATCHED" ? "Part dispatched" : q?.status === "FULLY_DISPATCHED" ? "Dispatched" : null;

export const StagePill: React.FC<{ q?: any; stage?: Stage; className?: string }> = ({ q, stage, className = "" }) => {
  const s = stage || stageOf(q);
  const meta = STAGE_META[s];
  const note = q ? dispatchNote(q) : null;
  return (
    <span className={`qp-pill ${s} ${className}`} title={meta.hint}>
      <span className="qp-pill-icon" aria-hidden>
        {meta.icon}
      </span>
      {meta.label}
      {note && s === "approved" && <em>· {note}</em>}
    </span>
  );
};

// ── List filters (the `status` query param) ──────────────────────────────────

export interface FilterDef {
  key: string;
  label: string;
  /** Only show the tab when it has something (attention views, rare stages). */
  optional?: boolean;
  tone?: "warn" | "bad";
}

export const FILTERS: FilterDef[] = [
  { key: "", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "SENT", label: "Sent" },
  { key: "APPROVED", label: "Approved" },
  { key: "INVOICED", label: "Invoiced" },
  { key: "EXPIRING", label: "Expiring soon", optional: true, tone: "warn" },
  { key: "LAPSED", label: "Past validity", optional: true },
  { key: "REJECTED", label: "Rejected", optional: true },
  { key: "EXPIRED", label: "Expired", optional: true },
];

export const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "value_high", label: "Highest value" },
  { key: "value_low", label: "Lowest value" },
];

// ── Validity ─────────────────────────────────────────────────────────────────

export interface ValidityInfo {
  tone: "ok" | "warn" | "bad" | "muted";
  label: string;
  days: number;
}

/** How a quotation's validity reads today. Only open quotations can lapse. */
export const validityOf = (q: any, today: Dayjs = dayjs().startOf("day")): ValidityInfo | null => {
  if (!q?.validity_date) return null;
  const d = dayjs(String(q.validity_date).slice(0, 10)).startOf("day");
  if (!d.isValid()) return null;
  const days = d.diff(today, "day");
  if (!OPEN_STAGES.includes(stageOf(q))) return { tone: "muted", label: `Valid till ${d.format("D MMM")}`, days };
  if (days < 0) return { tone: "bad", label: `Validity passed ${relDays(-days)} ago`, days };
  if (days === 0) return { tone: "warn", label: "Last day today", days };
  if (days <= 7) return { tone: "warn", label: `${days} day${days === 1 ? "" : "s"} left`, days };
  return { tone: "ok", label: `Valid till ${d.format("D MMM")}`, days };
};

const relDays = (n: number) => (n < 31 ? `${n} day${n === 1 ? "" : "s"}` : n < 365 ? `${Math.round(n / 30)} mo` : `${Math.round(n / 365)} yr`);

export const ValidityChip: React.FC<{ q: any; today?: Dayjs }> = ({ q, today }) => {
  const v = validityOf(q, today);
  if (!v) return <span className="qp-valid muted">No validity date</span>;
  return (
    <span className={`qp-valid ${v.tone}`}>
      <ClockCircleFilled aria-hidden /> {v.label}
    </span>
  );
};

// ── Formatting ───────────────────────────────────────────────────────────────

const rupeeFmt = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Exact amount with paise — documents, totals. */
export const rupees = (n: any) => `₹${rupeeFmt.format(Number.isFinite(Number(n)) ? Number(n) : 0)}`;

export const shortDate = (v: any) => (v ? dayjs(v).format("D MMM YYYY") : "—");
export const dateTime = (v: any) => (v ? dayjs(v).format("D MMM YYYY, h:mm A") : "—");

export const personName = (u: any) => `${u?.first_name || ""} ${u?.last_name || ""}`.trim();

export const initials = (name?: string | null) =>
  (name || "?")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

/** Stable avatar tint per customer (8 hues, picked by a name hash). */
export const avatarHue = (seed?: string | number | null) => {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 8;
};

export const Avatar: React.FC<{ name?: string | null; seed?: string | number | null; size?: number }> = ({ name, seed, size = 40 }) => (
  <span className={`qp-avatar h${avatarHue(seed ?? name)}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden>
    {initials(name)}
  </span>
);

// ── Snapshot helpers (also used by the editor) ───────────────────────────────

export const parseJsonField = (raw: any) => {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return raw;
};

export const joinAddr = (snap: any) =>
  [snap?.address_line_1, snap?.address_line_2, snap?.city, snap?.state, snap?.country, snap?.postal_code].filter(Boolean).join(", ");

export const getValidityDate = (v: string | undefined) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : dayjs(d);
};

// Which workflow actions a quotation's status allows (mirrors the backend).
// Send is limited to DRAFT/SENT (resend): sending an APPROVED/INVOICED one
// would push it back to SENT.
export const canSendStatus = (q: any) => !!q && !q.has_invoice && ["DRAFT", "SENT"].includes(q.status);
export const canApproveStatus = (q: any) => !!q && !q.has_invoice && q.status === "SENT";
export const canChallanStatus = (q: any) => !!q && q.status === "APPROVED";
/** Open and not invoiced (mirrors closeBlocker in quotation-insights.rules.ts). */
export const canCloseStatus = (q: any) => !!q && !q.has_invoice && ["DRAFT", "", "SENT", "APPROVED"].includes(q.status ?? "");
export const canReopenStatus = (q: any) => !!q && !q.has_invoice && ["REJECTED", "EXPIRED"].includes(q.status);
export const isClosed = (q: any) => !!q && ["REJECTED", "EXPIRED"].includes(q.status);

// ── Closing with the customer's feedback (keys mirror CLOSE_REASONS) ─────────

export type CloseOutcome = "REJECTED" | "EXPIRED";

export const CLOSE_REASONS: Record<CloseOutcome, { key: string; label: string }[]> = {
  REJECTED: [
    { key: "PRICE", label: "Price too high" },
    { key: "COMPETITOR", label: "Went with a competitor" },
    { key: "NOT_NEEDED", label: "Requirement cancelled" },
    { key: "DELIVERY", label: "Delivery time didn't suit" },
    { key: "BUDGET", label: "No budget / postponed" },
    { key: "SPEC", label: "Product didn't match the need" },
    { key: "OTHER", label: "Other" },
  ],
  EXPIRED: [
    { key: "NO_RESPONSE", label: "No response from the customer" },
    { key: "UNREACHABLE", label: "Couldn't reach the customer" },
    { key: "REPLACED", label: "Replaced by a newer quotation" },
    { key: "OTHER", label: "Other" },
  ],
};

export const closeReasonLabel = (outcome?: string | null, key?: string | null) =>
  (CLOSE_REASONS[outcome as CloseOutcome] || []).find((r) => r.key === key)?.label || null;
