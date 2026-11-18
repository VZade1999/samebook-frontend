import React from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  BankOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CreditCardOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  MinusCircleFilled,
  MobileOutlined,
  PieChartFilled,
  StopOutlined,
  WalletOutlined,
} from "@ant-design/icons";

export { inr, inrCompact, count, pct } from "@/modules/dashboard/utils/format";
export { Avatar, dateTime, joinAddr, parseJsonField, personName, rupees, shortDate } from "@/modules/quotation/pages/view/shared";

// ── Payment state (mirrors invoice-insights.rules.ts on the backend) ─────────

export type InvState = "unpaid" | "partial" | "paid" | "cancelled";
export const DEAD_STATUSES = ["CANCELLED", "SUPERSEDED"];

const paise = (v: any) => Math.round((Number(v) || 0) * 100);

/** What is still owed, worked out in paise so it never shows float noise. */
export const balanceOf = (inv: any) => {
  if (!inv) return 0;
  if (inv.balance_amount !== undefined && inv.balance_amount !== null) return Math.max(0, paise(inv.balance_amount)) / 100;
  return Math.max(0, paise(inv.grand_total) - paise(inv.paid_amount)) / 100;
};

export const paidShare = (inv: any) => {
  const total = Number(inv?.grand_total) || 0;
  return total > 0 ? Math.min(100, Math.max(0, (Number(inv?.paid_amount) || 0) / total * 100)) : 0;
};

export const stateOf = (inv: any): InvState => {
  if (!inv) return "unpaid";
  if (DEAD_STATUSES.includes(inv.status)) return "cancelled";
  if (inv.status === "PAID" || Number(inv.balance_amount ?? 1) <= 0) return "paid";
  if (Number(inv.paid_amount || 0) > 0) return "partial";
  return "unpaid";
};

export const isOpen = (inv: any) => ["unpaid", "partial"].includes(stateOf(inv));

export const STATE_META: Record<InvState, { label: string; icon: React.ReactNode; hint: string }> = {
  unpaid: { label: "Unpaid", icon: <MinusCircleFilled />, hint: "Nothing received yet" },
  partial: { label: "Part-paid", icon: <PieChartFilled />, hint: "Part of it has come in" },
  paid: { label: "Paid", icon: <CheckCircleFilled />, hint: "Paid in full" },
  cancelled: { label: "Cancelled", icon: <StopOutlined />, hint: "Cancelled — it doesn't count anywhere" },
};

export const StatePill: React.FC<{ inv?: any; state?: InvState }> = ({ inv, state }) => {
  const s = state || stateOf(inv);
  const meta = STATE_META[s];
  return (
    <span className={`qp-pill ip-${s}`} title={meta.hint}>
      <span className="qp-pill-icon" aria-hidden>
        {meta.icon}
      </span>
      {meta.label}
    </span>
  );
};

// ── Due date ─────────────────────────────────────────────────────────────────

const relDays = (n: number) => (n < 31 ? `${n} day${n === 1 ? "" : "s"}` : n < 365 ? `${Math.round(n / 30)} mo` : `${Math.round(n / 365)} yr`);

export interface DueInfo {
  tone: "ok" | "warn" | "bad" | "muted" | "good";
  label: string;
  /** Days until due (negative once late); null without a due date. */
  days: number | null;
}

/** How an invoice's due date reads today. Only money still owed can be late. */
export const dueOf = (inv: any, today: Dayjs = dayjs().startOf("day")): DueInfo => {
  const s = stateOf(inv);
  if (s === "cancelled") return { tone: "muted", label: "Cancelled", days: null };
  if (s === "paid") {
    return { tone: "good", label: inv?.last_paid_on ? `Paid ${dayjs(inv.last_paid_on).format("D MMM")}` : "Paid in full", days: null };
  }
  if (!inv?.due_date) return { tone: "muted", label: "No due date", days: null };
  const d = dayjs(String(inv.due_date).slice(0, 10)).startOf("day");
  if (!d.isValid()) return { tone: "muted", label: "No due date", days: null };
  const days = d.diff(today, "day");
  if (days < 0) return { tone: "bad", label: `Overdue by ${relDays(-days)}`, days };
  if (days === 0) return { tone: "warn", label: "Due today", days };
  if (days <= 7) return { tone: "warn", label: `Due in ${days} day${days === 1 ? "" : "s"}`, days };
  return { tone: "ok", label: `Due ${d.format("D MMM")}`, days };
};

export const DueChip: React.FC<{ inv: any; today?: Dayjs }> = ({ inv, today }) => {
  const d = dueOf(inv, today);
  const icon = d.tone === "bad" ? <ExclamationCircleFilled aria-hidden /> : d.tone === "good" ? <CheckCircleFilled aria-hidden /> : <ClockCircleFilled aria-hidden />;
  return (
    <span className={`qp-valid ${d.tone}`}>
      {icon} {d.label}
    </span>
  );
};

// ── List filters (the `status` query param) and sorts ───────────────────────

export interface FilterDef {
  key: string;
  label: string;
  /** Only show the tab when it has something. */
  optional?: boolean;
  tone?: "warn" | "bad";
}

export const FILTERS: FilterDef[] = [
  { key: "", label: "All" },
  { key: "UNPAID", label: "Unpaid" },
  { key: "PARTIAL", label: "Part-paid" },
  { key: "PAID", label: "Paid" },
  { key: "OVERDUE", label: "Overdue", optional: true, tone: "bad" },
  { key: "DUE_SOON", label: "Due this week", optional: true, tone: "warn" },
  { key: "NO_DUE", label: "No due date", optional: true },
  { key: "CANCELLED", label: "Cancelled", optional: true },
];

export const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "due_soonest", label: "Due date" },
  { key: "balance_high", label: "Most owed" },
  { key: "amount_high", label: "Highest amount" },
];

// ── Payment modes (keys mirror PAYMENT_MODES on the backend) ─────────────────

export const PAYMENT_MODES: { key: string; label: string; icon: React.ReactNode; ref: string | null }[] = [
  { key: "UPI", label: "UPI", icon: <MobileOutlined />, ref: "UPI reference / UTR" },
  { key: "BANK_TRANSFER", label: "Bank transfer", icon: <BankOutlined />, ref: "UTR / transaction ID" },
  { key: "CASH", label: "Cash", icon: <WalletOutlined />, ref: "Receipt number" },
  { key: "CHEQUE", label: "Cheque", icon: <FileTextOutlined />, ref: "Cheque number" },
  { key: "CARD", label: "Card", icon: <CreditCardOutlined />, ref: "Approval code / last 4 digits" },
];

export const modeLabel = (key?: string | null) => PAYMENT_MODES.find((m) => m.key === key)?.label || (key ? String(key).replace(/_/g, " ").toLowerCase() : "—");
export const modeIcon = (key?: string | null) => PAYMENT_MODES.find((m) => m.key === key)?.icon || <WalletOutlined />;

/** Server message from an axios error (Nest sends a string or a list). */
export const errorText = (e: any, fallback = "Something went wrong. Please try again.") => {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m[0] || fallback;
  if (typeof m === "string" && m) return m;
  if (!e?.response) return "Can't reach SameBook right now. Check your connection and try again.";
  return fallback;
};
