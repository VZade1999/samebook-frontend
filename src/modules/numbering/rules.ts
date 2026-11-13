// Client copy of the backend numbering rules (customer-backend.service/src/
// document-series/document-series.rules.ts) — only what the editor needs for
// instant previews. The server stays the authority: it validates on save.

export type DocType = "INVOICE" | "QUOTATION" | "DELIVERY_CHALLAN";
export type ResetPeriod = "NEVER" | "YEARLY" | "MONTHLY" | "DAILY";

export const DOC_TYPES: { key: DocType; label: string; plural: string }[] = [
  { key: "INVOICE", label: "Invoice", plural: "Invoices" },
  { key: "QUOTATION", label: "Quotation", plural: "Quotations" },
  { key: "DELIVERY_CHALLAN", label: "Delivery challan", plural: "Delivery challans" },
];
export const docLabel = (t: DocType) => DOC_TYPES.find((d) => d.key === t)?.label || t;

export const RESET_OPTIONS: { value: ResetPeriod; label: string; short: string }[] = [
  { value: "YEARLY", label: "Every financial year (April)", short: "Restarts every April" },
  { value: "MONTHLY", label: "Every month", short: "Restarts monthly" },
  { value: "DAILY", label: "Every day", short: "Restarts daily" },
  { value: "NEVER", label: "Never — one continuous count", short: "Never restarts" },
];

export const TOKEN_HELP: { token: string; label: string }[] = [
  { token: "{SEQ}", label: "Running number" },
  { token: "{PREFIX}", label: "Company prefix" },
  { token: "{FY}", label: "Financial year, short" },
  { token: "{FY_LONG}", label: "Financial year, long" },
  { token: "{YYYY}", label: "Year" },
  { token: "{YY}", label: "Year, 2 digits" },
  { token: "{MM}", label: "Month" },
  { token: "{DD}", label: "Day" },
];

export interface Series {
  id: number;
  doc_type: DocType;
  name: string;
  format: string;
  padding: number;
  reset_period: ResetPeriod;
  next_number: number;
  next_preview: string;
  restarts: boolean;
  is_default: boolean;
  is_active: boolean;
  issued_count: number;
  last_issued_number: string | null;
  last_issued_at: string | null;
}

export interface SeriesList {
  series: Series[];
  standard: Record<DocType, string>;
  prefix: string;
}

interface Parts {
  y: number;
  m: number;
  d: number;
}

/** Today in India time, matching the server. */
export function todayParts(date = new Date()): Parts {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
  const get = (t: string) => Number(f.formatToParts(date).find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

const pad = (n: number, w: number) => String(n).padStart(w, "0");
const yy = (y: number) => pad(y % 100, 2);

export function renderNumber(format: string, opts: { padding: number; seq: number; prefix?: string; parts?: Parts }): string {
  const p = opts.parts || todayParts();
  const fy = p.m >= 4 ? p.y : p.y - 1;
  const values: Record<string, string> = {
    SEQ: pad(Math.max(1, Math.floor(opts.seq || 1)), Math.min(9, Math.max(1, Math.floor(opts.padding || 1)))),
    FY: `${yy(fy)}-${yy(fy + 1)}`,
    FY_LONG: `${fy}-${yy(fy + 1)}`,
    YYYY: String(p.y),
    YY: yy(p.y),
    MM: pad(p.m, 2),
    DD: pad(p.d, 2),
    PREFIX: (opts.prefix || "").trim().toUpperCase() || "COMP",
  };
  return format.replace(/\{([^{}]*)\}/g, (whole, name: string) => values[name.trim().toUpperCase()] ?? whole);
}

export interface Preset {
  key: string;
  format: string;
  reset_period: ResetPeriod;
  padding: number;
  hint: string;
}

/** Common Indian numbering styles; shown rendered with the company's prefix. */
export const PRESETS: Record<DocType, Preset[]> = {
  INVOICE: [
    { key: "fy-prefix", format: "{PREFIX}/{FY}/{SEQ}", reset_period: "YEARLY", padding: 4, hint: "Prefix, financial year, number" },
    { key: "fy-long", format: "INV/{FY_LONG}/{SEQ}", reset_period: "YEARLY", padding: 3, hint: "GST-style, restarts each April" },
    { key: "plain", format: "INV-{SEQ}", reset_period: "NEVER", padding: 4, hint: "One running number" },
    { key: "monthly", format: "{YY}{MM}/{SEQ}", reset_period: "MONTHLY", padding: 3, hint: "Restarts every month" },
  ],
  QUOTATION: [
    { key: "fy-prefix", format: "QT/{FY}/{SEQ}", reset_period: "YEARLY", padding: 4, hint: "Financial year, number" },
    { key: "prefix", format: "{PREFIX}-Q-{SEQ}", reset_period: "NEVER", padding: 4, hint: "One running number" },
    { key: "monthly", format: "QT-{YY}{MM}-{SEQ}", reset_period: "MONTHLY", padding: 3, hint: "Restarts every month" },
  ],
  DELIVERY_CHALLAN: [
    { key: "fy-prefix", format: "DC/{FY}/{SEQ}", reset_period: "YEARLY", padding: 4, hint: "Financial year, number" },
    { key: "prefix", format: "{PREFIX}-DC-{SEQ}", reset_period: "NEVER", padding: 4, hint: "One running number" },
  ],
};

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
