import dayjs, { type Dayjs } from "dayjs";
import type { RangeQuery, SeriesRow } from "../types";

export const ISO = "YYYY-MM-DD";
const iso = (d: Dayjs) => d.format(ISO);

export type PresetKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "mtd"
  | "last_month"
  | "qtd"
  | "fytd"
  | "last_fy"
  | "custom";

export const PRESETS: { key: Exclude<PresetKey, "custom">; label: string; short: string }[] = [
  { key: "today", label: "Today", short: "Today" },
  { key: "yesterday", label: "Yesterday", short: "Yesterday" },
  { key: "7d", label: "Last 7 days", short: "7D" },
  { key: "30d", label: "Last 30 days", short: "30D" },
  { key: "90d", label: "Last 90 days", short: "90D" },
  { key: "mtd", label: "This month", short: "This month" },
  { key: "last_month", label: "Last month", short: "Last month" },
  { key: "qtd", label: "This quarter", short: "This quarter" },
  { key: "fytd", label: "This financial year", short: "This FY" },
  { key: "last_fy", label: "Last financial year", short: "Last FY" },
];

/** Indian financial year starts on 1 April. */
export const fyStart = (d: Dayjs) => {
  const y = d.month() >= 3 ? d.year() : d.year() - 1;
  return dayjs(`${y}-04-01`);
};
/** FY quarters: Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar. */
export const quarterStart = (d: Dayjs) => {
  const m = d.month(); // 0 = Jan
  const startMonth = m >= 9 ? 9 : m >= 6 ? 6 : m >= 3 ? 3 : 0;
  return d.month(startMonth).date(1);
};
export const fyLabel = (start: Dayjs) => `FY ${start.year()}–${String(start.year() + 1).slice(2)}`;

export interface ResolvedRange {
  from: string;
  to: string;
  /** Compare with this start instead of the days right before (same days last month…). */
  cmpFrom?: string;
  label: string;
}

const days = (from: string, to: string) => dayjs(to).diff(dayjs(from), "day") + 1;

/** Use a calendar-aligned comparison only when it cannot overlap the period. */
const withCompare = (r: ResolvedRange, cmpFrom: Dayjs): ResolvedRange => {
  const end = cmpFrom.add(days(r.from, r.to) - 1, "day");
  return iso(end) < r.from ? { ...r, cmpFrom: iso(cmpFrom) } : r;
};

export const resolvePreset = (key: PresetKey, today: Dayjs, custom?: [string, string]): ResolvedRange => {
  const t = today.startOf("day");
  switch (key) {
    case "today":
      return { from: iso(t), to: iso(t), label: "Today" };
    case "yesterday": {
      const y = t.subtract(1, "day");
      return { from: iso(y), to: iso(y), label: "Yesterday" };
    }
    case "7d":
      return { from: iso(t.subtract(6, "day")), to: iso(t), label: "Last 7 days" };
    case "90d":
      return { from: iso(t.subtract(89, "day")), to: iso(t), label: "Last 90 days" };
    case "mtd": {
      const start = t.startOf("month");
      return withCompare({ from: iso(start), to: iso(t), label: t.format("MMMM YYYY") }, start.subtract(1, "month"));
    }
    case "last_month": {
      const start = t.subtract(1, "month").startOf("month");
      return withCompare(
        { from: iso(start), to: iso(start.endOf("month")), label: start.format("MMMM YYYY") },
        start.subtract(1, "month"),
      );
    }
    case "qtd": {
      const start = quarterStart(t);
      return withCompare(
        { from: iso(start), to: iso(t), label: `${start.format("MMM")}–${t.format("MMM YYYY")}` },
        start.subtract(3, "month"),
      );
    }
    case "fytd": {
      const start = fyStart(t);
      return withCompare({ from: iso(start), to: iso(t), label: `${fyLabel(start)} so far` }, start.subtract(1, "year"));
    }
    case "last_fy": {
      const start = fyStart(t).subtract(1, "year");
      return withCompare(
        { from: iso(start), to: iso(start.add(1, "year").subtract(1, "day")), label: fyLabel(start) },
        start.subtract(1, "year"),
      );
    }
    case "custom":
      if (custom) return { from: custom[0], to: custom[1], label: rangeText(custom[0], custom[1]) };
      return { from: iso(t.subtract(29, "day")), to: iso(t), label: "Last 30 days" };
    case "30d":
    default:
      return { from: iso(t.subtract(29, "day")), to: iso(t), label: "Last 30 days" };
  }
};

export const toQuery = (r: ResolvedRange, today: Dayjs): RangeQuery => ({
  from: r.from,
  to: r.to,
  today: iso(today),
  tz: -new Date().getTimezoneOffset(),
  ...(r.cmpFrom ? { cmp_from: r.cmpFrom } : {}),
});

/** "3 – 9 Nov 2026", "28 Oct – 3 Nov 2026", "12 Nov 2026". */
export const rangeText = (from: string, to: string) => {
  const a = dayjs(from);
  const b = dayjs(to);
  if (from === to) return b.format("D MMM YYYY");
  if (a.year() !== b.year()) return `${a.format("D MMM YYYY")} – ${b.format("D MMM YYYY")}`;
  if (a.month() !== b.month()) return `${a.format("D MMM")} – ${b.format("D MMM YYYY")}`;
  return `${a.format("D")} – ${b.format("D MMM YYYY")}`;
};

// ── Bucketing ──────────────────────────────────────────────────────────────

export type Granularity = "day" | "week" | "month";

export const autoGranularity = (n: number): Granularity => (n <= 31 ? "day" : n <= 180 ? "week" : "month");

export const allowedGranularities = (n: number): Granularity[] =>
  (["day", "week", "month"] as Granularity[]).filter((g) =>
    g === "day" ? n >= 2 && n <= 120 : g === "week" ? n >= 14 : n >= 60,
  );

export interface Bucket {
  key: string;
  start: string;
  end: string;
  label: string;
  /** Long label for tooltips and the table view. */
  title: string;
  cur: Record<string, { n: number; v: number }>;
  prev: Record<string, { n: number; v: number }>;
}

/**
 * Splits the period into day / week / month buckets and sums each series into
 * them. Previous-period rows are shifted forward by the gap between the two
 * period starts, so bucket i of the previous period lines up with bucket i
 * of the current one (Tue vs Tue, the 3rd week vs the 3rd week).
 */
export const buildBuckets = (
  series: Record<string, SeriesRow[] | undefined>,
  range: { from: string; to: string; prev_from: string },
  gran: Granularity,
): Bucket[] => {
  const from = dayjs(range.from);
  const to = dayjs(range.to);
  const buckets: Bucket[] = [];
  const index = new Map<string, number>();

  const keyOf = (d: Dayjs) =>
    gran === "day" ? iso(d) : gran === "week" ? `w${Math.floor(d.diff(from, "day") / 7)}` : d.format("YYYY-MM");

  for (let d = from; !d.isAfter(to); d = d.add(1, "day")) {
    const k = keyOf(d);
    if (!index.has(k)) {
      index.set(k, buckets.length);
      buckets.push({ key: k, start: iso(d), end: iso(d), label: "", title: "", cur: {}, prev: {} });
    }
    buckets[index.get(k)!].end = iso(d);
  }
  for (const b of buckets) {
    const s = dayjs(b.start);
    if (gran === "day") {
      b.label = s.format("D MMM");
      b.title = s.format("ddd, D MMM YYYY");
    } else if (gran === "week") {
      b.label = s.format("D MMM");
      b.title = rangeText(b.start, b.end);
    } else {
      b.label = s.format(s.month() === 0 || s.isSame(from, "day") ? "MMM YY" : "MMM");
      b.title = b.start === s.startOf("month").format(ISO) && b.end === s.endOf("month").format(ISO)
        ? s.format("MMMM YYYY")
        : rangeText(b.start, b.end);
    }
  }

  const shift = from.diff(dayjs(range.prev_from), "day");
  const add = (target: "cur" | "prev", name: string, date: string, n: number, v: number) => {
    const d = target === "cur" ? dayjs(date) : dayjs(date).add(shift, "day");
    if (d.isBefore(from) || d.isAfter(to)) return;
    const b = buckets[index.get(keyOf(d))!];
    if (!b) return;
    const slot = (b[target][name] ||= { n: 0, v: 0 });
    slot.n += n;
    slot.v += v;
  };
  for (const [name, rows] of Object.entries(series)) {
    for (const [date, n, v] of rows || []) {
      if (date >= range.from) add("cur", name, date, n, v);
      else add("prev", name, date, n, v);
    }
  }
  return buckets;
};
