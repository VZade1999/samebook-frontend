import React from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  CarFilled,
  CheckCircleFilled,
  ClockCircleFilled,
  EditFilled,
  ExclamationCircleFilled,
  FileDoneOutlined,
  StopOutlined,
} from "@ant-design/icons";

export { inr, inrCompact, count, pct } from "@/modules/dashboard/utils/format";
export { Avatar, dateTime, joinAddr, parseJsonField, personName, rupees, shortDate } from "@/modules/quotation/pages/view/shared";
export { errorText } from "@/modules/invoice/pages/view/shared";
export { formatQty } from "../../constants";

// ── Stages (one per status; the backend's statuses, in words people use) ─────

export type Stage = "draft" | "transit" | "delivered" | "invoiced" | "cancelled";

export const stageOf = (c: any): Stage => {
  switch (c?.status) {
    case "DISPATCHED":
      return "transit";
    case "DELIVERED":
      return "delivered";
    case "INVOICED":
      return "invoiced";
    case "CANCELLED":
      return "cancelled";
    default:
      return "draft";
  }
};

export const STAGE_META: Record<Stage, { label: string; icon: React.ReactNode; hint: string }> = {
  draft: { label: "Draft", icon: <EditFilled />, hint: "Made, not sent yet" },
  transit: { label: "On the road", icon: <CarFilled />, hint: "Dispatched — delivery not confirmed yet" },
  delivered: { label: "Delivered", icon: <CheckCircleFilled />, hint: "The goods reached the consignee" },
  invoiced: { label: "Invoiced", icon: <FileDoneOutlined />, hint: "An invoice covers these goods" },
  cancelled: { label: "Cancelled", icon: <StopOutlined />, hint: "Cancelled — it doesn't count anywhere" },
};

export const StagePill: React.FC<{ c?: any; stage?: Stage }> = ({ c, stage }) => {
  const s = stage || stageOf(c);
  const meta = STAGE_META[s];
  return (
    <span className={`qp-pill dc-${s}`} title={meta.hint}>
      <span className="qp-pill-icon" aria-hidden>
        {meta.icon}
      </span>
      {meta.label}
    </span>
  );
};

// ── What a challan is waiting for ───────────────────────────────────────────

/** Sales made without a quotation that are still billed (mirrors BILLABLE_STANDALONE_REASONS). */
export const BILLABLE_STANDALONE_REASONS = ["SALE", "PARTIAL_SUPPLY", "SUPPLY_ON_APPROVAL"];

/**
 * Dispatched or delivered, no invoice yet, and made from a quotation — or a
 * sale to a customer made without one (mirrors TO_INVOICE_SQL).
 */
export const isToInvoice = (c: any) =>
  !!c &&
  (c.status === "DISPATCHED" || c.status === "DELIVERED") &&
  !c.invoice_id &&
  (!!c.quotation_id || (!!c.customer_id && BILLABLE_STANDALONE_REASONS.includes(c.reason)));

/** Sent against an invoice made first (bill first, send in lots — GST Rule 55(5)). */
export const isLot = (c: any) => !!c && !!c.invoice_id && (c.status === "DISPATCHED" || c.status === "DELIVERED");

/** Goods that end up on an invoice: from a quotation, or a sale to a customer made without one. */
export const isBillable = (c: any) => !!c && (!!c.quotation_id || (!!c.customer_id && BILLABLE_STANDALONE_REASONS.includes(c.reason)));

export const isTransfer = (c: any) => c?.reason === "STOCK_TRANSFER";

/** Goods worth this much or more usually need an e-way bill (mirrors the backend). */
export const EWAY_BILL_THRESHOLD = 50_000;

/** Not sent, or on the road, worth ₹50,000 or more, and no e-way bill number. */
export const needsEway = (c: any) =>
  !!c && (c.status === "DRAFT" || c.status === "DISPATCHED") && Number(c.total_value || 0) >= EWAY_BILL_THRESHOLD && !String(c.eway_bill_number || "").trim();

/** A draft this old, or goods this long on the road, get a gentle nudge. */
export const NUDGE_DAYS = 7;

/** Who the goods go to: the customer, or the destination warehouse for a transfer. */
export const consigneeOf = (c: any) => (isTransfer(c) ? c?.to_warehouse_name || "Warehouse" : c?.customer_name || "—");
export const routeOf = (c: any) => `${c?.from_warehouse_name || "Warehouse"} → ${c?.to_warehouse_name || "Warehouse"}`;

const startOfDay = (v: any) => dayjs(v).startOf("day");
/** Whole days from `v` to today (0 = today). */
export const daysSince = (v: any, today: Dayjs = dayjs().startOf("day")) => (v ? Math.max(0, today.diff(startOfDay(v), "day")) : null);

export const relDays = (n: number) => (n < 31 ? `${n} day${n === 1 ? "" : "s"}` : n < 365 ? `${Math.round(n / 30)} mo` : `${Math.round(n / 365)} yr`);

export interface Journey {
  /** 0 = made, 1 = sent, 2 = delivered: how far along the track to fill. */
  step: 0 | 1 | 2;
  tone: "muted" | "ok" | "warn" | "good";
  label: string;
}

/** Where the goods are, in a few words, with how long it has been. */
export const journeyOf = (c: any, today: Dayjs = dayjs().startOf("day")): Journey => {
  const day = (v: any) => dayjs(v).format("D MMM");
  switch (stageOf(c)) {
    case "cancelled":
      return { step: c?.delivered_at ? 2 : c?.dispatched_at ? 1 : 0, tone: "muted", label: c?.cancelled_at ? `Cancelled ${day(c.cancelled_at)}` : "Cancelled" };
    case "transit": {
      const d = daysSince(c.dispatched_at, today);
      if (d === null) return { step: 1, tone: "ok", label: "On the road" };
      return { step: 1, tone: d >= NUDGE_DAYS ? "warn" : "ok", label: d === 0 ? "Sent today" : `On the road · ${relDays(d)}` };
    }
    case "delivered":
      return { step: 2, tone: "good", label: c?.delivered_at ? `Delivered ${day(c.delivered_at)}` : "Delivered" };
    case "invoiced":
      return c?.delivered_at
        ? { step: 2, tone: "good", label: `Delivered ${day(c.delivered_at)}` }
        : { step: 1, tone: "good", label: c?.dispatched_at ? `Sent ${day(c.dispatched_at)}` : "Sent" };
    default: {
      const d = daysSince(c?.created_at, today);
      if (d === null || d === 0) return { step: 0, tone: "muted", label: "Not sent yet" };
      return { step: 0, tone: d >= NUDGE_DAYS ? "warn" : "muted", label: `Not sent · ${relDays(d)} old` };
    }
  }
};

/** The small dot track: made → sent → delivered. */
export const JourneyTrack: React.FC<{ c: any; today?: Dayjs }> = ({ c, today }) => {
  const j = journeyOf(c, today);
  const s = stageOf(c);
  return (
    <div className={`dc-journey ${s} ${j.tone}`}>
      <div className="dc-dots" role="img" aria-label={j.label}>
        {[0, 1, 2].map((i) => (
          <React.Fragment key={i}>
            {i > 0 && <i className={`dc-link${i <= j.step ? " on" : ""}`} />}
            <span className={`dc-dot${i < j.step ? " on" : i === j.step ? " cur" : ""}`} />
          </React.Fragment>
        ))}
      </div>
      <span className="dc-journey-text">
        {j.tone === "warn" ? <ExclamationCircleFilled aria-hidden /> : s === "transit" ? <ClockCircleFilled aria-hidden /> : null}
        {j.label}
      </span>
    </div>
  );
};

// ── List filters (the `status` query param), sorts and reasons ───────────────

export interface FilterDef {
  key: string;
  label: string;
  /** Only show the tab when it has something. */
  optional?: boolean;
  tone?: "warn" | "bad";
}

export const FILTERS: FilterDef[] = [
  { key: "", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "DISPATCHED", label: "On the road" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "TO_INVOICE", label: "Ready to invoice", optional: true, tone: "warn" },
  { key: "INVOICED", label: "Invoiced" },
  { key: "CANCELLED", label: "Cancelled", optional: true },
];

export const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "value_high", label: "Highest value" },
  { key: "value_low", label: "Lowest value" },
];

/** Short labels (keys mirror DC_REASONS on the backend). */
export const REASONS: { key: string; label: string }[] = [
  { key: "SALE", label: "Sale" },
  { key: "PARTIAL_SUPPLY", label: "Part delivery" },
  { key: "SUPPLY_ON_APPROVAL", label: "On approval" },
  { key: "JOB_WORK", label: "Job work" },
  { key: "STOCK_TRANSFER", label: "Stock transfer" },
  { key: "EXHIBITION", label: "Exhibition" },
  { key: "REPAIR", label: "Repair" },
  { key: "OTHER", label: "Other" },
];
export const reasonText = (key?: string | null) => REASONS.find((r) => r.key === key)?.label || (key ? String(key).replace(/_/g, " ").toLowerCase() : "—");

/** Quantity with its unit when every line shares one ("22 pcs"), else just the number. */
export const qtyWithUnit = (qty: any, items?: any[]) => {
  const n = Number(qty || 0);
  const units = [...new Set((items || []).map((i) => String(i?.unit || "").trim()).filter(Boolean))];
  const text = Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
  return units.length === 1 ? `${text} ${units[0]}` : text;
};
