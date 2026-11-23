// Words, colours and number formats shared by the Purchases pages.
import dayjs from "dayjs";
import type { BillStatus, GstType, MsmeType, PaymentMode, PoStatus, TaxType } from "./api";

const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const qtyFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

/** ₹1,23,456 (paise only when there are some). */
export const rs = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `₹${inrFmt.format(Number(n) || 0)}`);
/** ₹1,23,456.00 — for totals that must show paise. */
export const rs2 = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `₹${inr2.format(Number(n) || 0)}`);
export const qtyText = (n: number | null | undefined, unit?: string | null) => `${qtyFmt.format(Number(n) || 0)}${unit ? ` ${unit}` : ""}`;
export const day = (d: string | null | undefined) => (d ? dayjs(d).format("D MMM YYYY") : "—");
export const dayShort = (d: string | null | undefined) => (d ? dayjs(d).format("D MMM") : "—");
export const when = (iso: string | null | undefined) => (iso ? dayjs(iso).format("D MMM YYYY, h:mm A") : "—");
export const todayIso = () => dayjs().format("YYYY-MM-DD");

export type Tone = "neutral" | "accent" | "good" | "warn" | "bad" | "violet";

export const PO_STATUS: Record<PoStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_APPROVAL: { label: "Waiting for approval", tone: "warn" },
  APPROVED: { label: "Approved — to send", tone: "violet" },
  SENT: { label: "Sent to supplier", tone: "accent" },
  PARTLY_RECEIVED: { label: "Part received", tone: "accent" },
  RECEIVED: { label: "Received", tone: "good" },
  CLOSED: { label: "Closed", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "bad" },
};
export const BILL_STATUS: Record<BillStatus, { label: string; tone: Tone }> = {
  UNPAID: { label: "Unpaid", tone: "warn" },
  PARTLY_PAID: { label: "Part paid", tone: "accent" },
  PAID: { label: "Paid", tone: "good" },
  CANCELLED: { label: "Cancelled", tone: "bad" },
};
export const GST_TYPE: Record<GstType, string> = { REGISTERED: "Registered (regular)", COMPOSITION: "Composition scheme", UNREGISTERED: "Unregistered" };
export const MSME_TYPE: Record<MsmeType, string> = { MICRO: "Micro", SMALL: "Small", MEDIUM: "Medium" };
export const TAX_TYPE: Record<TaxType, string> = {
  INTRA_STATE: "CGST + SGST (same state)",
  INTER_STATE: "IGST (other state)",
  NO_GST: "No GST (supplier not registered / composition)",
};
export const PAY_MODE: Record<PaymentMode, string> = { CASH: "Cash", BANK_TRANSFER: "Bank transfer (NEFT/RTGS/IMPS)", CHEQUE: "Cheque", UPI: "UPI", CARD: "Card" };
export const PAY_MODE_SHORT: Record<PaymentMode, string> = { CASH: "Cash", BANK_TRANSFER: "Bank", CHEQUE: "Cheque", UPI: "UPI", CARD: "Card" };

export const ACTIVITY: Record<string, string> = {
  CREATED: "Made",
  UPDATED: "Draft saved",
  SUBMITTED: "Sent for approval",
  APPROVED: "Approved",
  SENT_BACK: "Sent back",
  SENT: "Sent to the supplier",
  AMENDED: "Amended",
  RECEIVED: "Goods received",
  RECEIPT_CANCELLED: "Receipt undone",
  BILLED: "Supplier bill entered",
  BILL_CANCELLED: "Supplier bill cancelled",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  REOPENED: "Reopened",
};

const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** The same GSTIN check the server makes (format, state code, check digit); null = fine. */
export const gstinProblem = (raw: string): string | null => {
  const g = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!g) return null;
  if (g.length !== 15) return "A GSTIN has 15 characters";
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][0-9A-Z][0-9A-Z]$/.test(g)) return "That GSTIN doesn't look right — it is like 27AAPFU0939F1ZV";
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const p = GSTIN_CHARS.indexOf(g[i]) * ((i % 2) + 1);
    sum += Math.floor(p / 36) + (p % 36);
  }
  if (GSTIN_CHARS[(36 - (sum % 36)) % 36] !== g[14]) return "That GSTIN doesn't add up — check it for a typo";
  return null;
};

export const GST_STATES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi",
  "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh",
  "23": "Madhya Pradesh", "24": "Gujarat", "25": "Daman and Diu", "26": "Dadra and Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh",
};
export const STATE_OPTIONS = Object.entries(GST_STATES)
  .map(([code, name]) => ({ value: name, label: `${name} (${code})` }))
  .sort((a, b) => a.value.localeCompare(b.value));
