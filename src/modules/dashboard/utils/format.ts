import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const inrFull = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹12,34,567 — Indian digit grouping; paise only below ₹100. */
export const inr = (n: number | null | undefined) => {
  const v = Number(n || 0);
  return Math.abs(v) < 100 && v % 1 !== 0 ? inrPaise.format(v) : inrFull.format(v);
};

const trim = (v: number, digits: number) => {
  const s = v.toFixed(digits);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
};

/** Compact rupees the way Indian businesses read them: ₹950 · ₹12.5K · ₹4.2L · ₹1.35Cr. */
export const inrCompact = (n: number | null | undefined) => {
  const v = Number(n || 0);
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 1e7) return `${sign}₹${trim(a / 1e7, a >= 1e9 ? 0 : 2)}Cr`;
  if (a >= 1e5) return `${sign}₹${trim(a / 1e5, a >= 1e6 ? 1 : 2)}L`;
  if (a >= 1e3) return `${sign}₹${trim(a / 1e3, 1)}K`;
  return `${sign}₹${trim(a, a % 1 ? 2 : 0)}`;
};

/** Axis ticks: compact once the axis reaches 10,000, in full below. */
export const axisInr = (max: number) => (n: number) => (max >= 10_000 ? inrCompact(n) : intFmt.format(n));
export const axisCount = (max: number) => (n: number) =>
  max >= 10_000 ? `${trim(n / 1000, 1)}K` : intFmt.format(n);

export const count = (n: number | null | undefined) => intFmt.format(Number(n || 0));
export const decimal = (n: number | null | undefined) => decFmt.format(Number(n || 0));

export const pct = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${trim(n, digits)}%`;

export const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

export const bytes = (n: number) => {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(Math.abs(n)) / Math.log(1024)), units.length - 1);
  const v = n / Math.pow(1024, i);
  return `${i === 0 ? v : v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
};

export const duration = (minutes: number | null | undefined) => {
  const m = Math.max(0, Math.round(Number(minutes || 0)));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
};

export const ago = (iso: string) => dayjs(iso).fromNow();
export const dateTime = (iso: string) => dayjs(iso).format("D MMM YYYY, h:mm A");

export const titleCase = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const PAYMENT_MODE_LABEL: Record<string, string> = {
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  CASH: "Cash",
  CHEQUE: "Cheque",
  CARD: "Card",
};

export const greeting = (hour = new Date().getHours()) =>
  hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
