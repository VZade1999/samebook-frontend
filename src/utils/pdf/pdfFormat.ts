// Formatting shared by every PDF: Indian money (₹1,18,000.00), quantities,
// dates (19 Nov 2026), addresses and the amount in words (Indian system:
// thousand, lakh, crore).

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** 1,18,000.00 — Indian digit grouping, always two decimals. */
export const amount = (v: unknown) =>
  num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,18,000.00 (or "Rs. …" when the PDF font has no rupee sign). */
export const money = (v: unknown, rupeeSign = true) => `${rupeeSign ? "₹" : "Rs. "}${amount(v)}`;

/** 25 · 2.5 · 0.125 — up to three decimals, no trailing zeros. */
export const qty = (v: unknown) => {
  const n = Math.round(num(v) * 1000) / 1000;
  return n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
};

/** 18 · 2.5 — a percentage without trailing zeros. */
export const pct = (v: unknown) => `${Math.round(num(v) * 100) / 100}%`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 19 Nov 2026 (date-only values are read as calendar days, never shifted by time zone). */
export const date = (v: unknown) => {
  if (!v) return "";
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) && s.length <= 10 ? new Date(`${s.slice(0, 10)}T00:00:00`) : new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** "KD/26-27/0151 · 19 Nov 2026" */
export const withDate = (no: string, d?: unknown) => (date(d) ? `${no}  ·  ${date(d)}` : no);

export const uniq = (list: (string | null | undefined)[]) => [...new Set(list.map((s) => (s || "").trim()).filter(Boolean))];

export const parseJson = (v: unknown): any => {
  let p: any = v;
  try {
    while (typeof p === "string") p = JSON.parse(p);
  } catch {
    return null;
  }
  return p && typeof p === "object" ? p : null;
};

// ── Amount in words (Indian system) ─────────────────────────────────────────
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const upTo99 = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);
const upTo999 = (n: number) =>
  [Math.floor(n / 100) ? `${ONES[Math.floor(n / 100)]} Hundred` : "", n % 100 ? upTo99(n % 100) : ""].filter(Boolean).join(" ");

/** 1,18,000 → "One Lakh Eighteen Thousand" (crores keep counting: "One Hundred Twenty Crore"). */
export const numberInWords = (n: number): string => {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  return [
    crore ? `${numberInWords(crore)} Crore` : "",
    lakh ? `${upTo99(lakh)} Lakh` : "",
    thousand ? `${upTo99(thousand)} Thousand` : "",
    rest ? upTo999(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
};

/** "Indian Rupees One Thousand One Hundred Eighty and Fifty Paise Only" */
export const amountInWords = (v: unknown) => {
  const paiseTotal = Math.round(Math.abs(num(v)) * 100);
  const rupees = Math.floor(paiseTotal / 100);
  const paise = paiseTotal % 100;
  return `Indian Rupees ${numberInWords(rupees)}${paise ? ` and ${upTo99(paise)} Paise` : ""} Only`;
};

// ── Addresses ────────────────────────────────────────────────────────────────
const STATE_CODES: Record<string, string> = {
  "jammu and kashmir": "01", "himachal pradesh": "02", punjab: "03", chandigarh: "04", uttarakhand: "05", haryana: "06",
  delhi: "07", rajasthan: "08", "uttar pradesh": "09", bihar: "10", sikkim: "11", "arunachal pradesh": "12", nagaland: "13",
  manipur: "14", mizoram: "15", tripura: "16", meghalaya: "17", assam: "18", "west bengal": "19", jharkhand: "20",
  odisha: "21", chhattisgarh: "22", "madhya pradesh": "23", gujarat: "24", "dadra and nagar haveli and daman and diu": "26",
  maharashtra: "27", karnataka: "29", goa: "30", lakshadweep: "31", kerala: "32", "tamil nadu": "33", puducherry: "34",
  "andaman and nicobar islands": "35", telangana: "36", "andhra pradesh": "37", ladakh: "38",
};

/** "Maharashtra (27)" — the GST state code next to the state name, when known. */
export const stateWithCode = (state?: string | null) => {
  const s = String(state || "").trim();
  if (!s) return "";
  const code = STATE_CODES[s.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ")];
  return code ? `${s} (${code})` : s;
};

/** Street lines, then "City, State (code) - PIN"; the country only when it isn't India. */
export const addressLines = (a: any): string[] => {
  if (!a || typeof a !== "object") return [];
  const city = [a.city, stateWithCode(a.state)].filter(Boolean).join(", ");
  const cityPin = [city, a.postal_code].filter(Boolean).join(" - ");
  const country = String(a.country || "").trim();
  return [a.address_line_1, a.address_line_2, cityPin, country && country.toLowerCase() !== "india" ? country : ""]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
};

export const initials = (name: string) =>
  String(name || "")
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "•";
