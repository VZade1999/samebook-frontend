import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { message } from "antd";
import { GST_STATE_CODES, resolveSellerStateCode } from "@/utils/taxType";

dayjs.extend(relativeTime);

// Display helpers for the company profile page (read-only: nothing here
// changes what is saved).

/** Standard 15-character GSTIN: 2-digit state, 10-char PAN, entity, 'Z', checksum. */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const gstinLooksValid = (gstin?: string | null) => !!gstin && GSTIN_RE.test(gstin.trim().toUpperCase());

/** Characters 3–12 of a GSTIN are the business PAN. */
export const panFromGstin = (gstin?: string | null) =>
  gstinLooksValid(gstin) ? gstin!.trim().toUpperCase().slice(2, 12) : null;

export const sellerState = (company: any) => {
  const code = resolveSellerStateCode(company);
  return code ? { code, name: GST_STATE_CODES[code] || code } : null;
};

export const websiteHref = (w?: string | null) => {
  if (!w) return null;
  const s = w.trim();
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};
export const websiteText = (w?: string | null) => (w || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");

export const addressLines = (a: any, keys = ["line_1", "line_2", "city", "state", "postal_code", "country"]) => {
  const [l1, l2, city, state, pin, country] = keys.map((k) => (a?.[k] ? String(a[k]).trim() : ""));
  const cityLine = [city, [state, pin].filter(Boolean).join(" – ")].filter(Boolean).join(", ");
  return [l1, l2, cityLine, country].filter(Boolean);
};

export const LOCATION_ADDRESS_KEYS = [
  "address_line_1",
  "address_line_2",
  "address_city",
  "address_state",
  "address_postal_code",
  "address_country",
];

export const mapsUrl = (lines: string[]) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lines.join(", "))}`;

/** "•••• 4521": enough to recognise the account without exposing it on screen. */
export const maskAccount = (n?: string | null) => {
  const s = String(n || "").replace(/\s+/g, "");
  if (s.length <= 4) return s;
  return `•••• •••• ${s.slice(-4)}`;
};
export const groupAccount = (n?: string | null) => String(n || "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

/** What a document number looks like today, e.g. QT-KD-261113-001-0001 (format from the backend). */
export const docNumberParts = (prefix?: string | null, type = "QT") => {
  const p = (prefix || "COMP").trim().toUpperCase();
  return [
    { part: type, label: "Document type" },
    { part: p, label: "Company prefix" },
    { part: dayjs().format("YYMMDD"), label: "Date" },
    { part: "001", label: "No. that day" },
    { part: "0001", label: "Running no." },
  ];
};

export const memberSince = (iso?: string | null) => (iso ? dayjs(iso).format("MMM YYYY") : null);
export const updatedAgo = (iso?: string | null) => (iso ? dayjs(iso).fromNow() : null);

export const initials = (name?: string | null) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export const truthy = (v: any) => v === true || v === 1 || v === "1" || v === "true";

const norm = (s?: string | null) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
/** The legal name, only when it actually differs from the trading name. */
export const distinctLegalName = (c: any) => (c?.legal_name && norm(c.legal_name) !== norm(c.name) ? String(c.legal_name).trim() : null);

export const copyText = async (text: string, what = "Copied") => {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    message.success(what);
  } catch {
    message.error("Couldn't copy. Select the text and copy it instead.");
  }
};

// ── Profile completeness ───────────────────────────────────────────────────

export interface CheckItem {
  key: string;
  label: string;
  hint: string;
  done: boolean;
}

export const profileChecklist = (c: any): CheckItem[] => [
  { key: "logo", label: "Logo", hint: "Shown on every quotation and invoice", done: !!c?.logo },
  { key: "legal_name", label: "Legal name", hint: "The registered name for tax documents", done: !!c?.legal_name },
  { key: "gst_no", label: "GSTIN", hint: "Needed for GST invoices and the CGST/SGST vs IGST split", done: !!c?.gst_no },
  { key: "registration_number", label: "Registration number", hint: "CIN / Udyam / shop licence", done: !!c?.registration_number },
  { key: "industry", label: "Industry", hint: "Helps describe what you do", done: !!c?.industry },
  { key: "primary_email", label: "Email", hint: "Where customers can reach you", done: !!c?.primary_email },
  { key: "primary_phone", label: "Phone", hint: "Printed on documents", done: !!c?.primary_phone },
  { key: "website", label: "Website", hint: "Optional, printed on documents", done: !!c?.website },
  { key: "addresses", label: "Address", hint: "Your billing / office address", done: (c?.addresses?.length || 0) > 0 },
  { key: "bank_accounts", label: "Bank account", hint: "So customers know where to pay", done: (c?.bank_accounts?.length || 0) > 0 },
  { key: "terms", label: "Terms & conditions", hint: "Auto-filled into new quotations", done: !!c?.default_terms_conditions?.trim() },
];

export const companyCardText = (c: any) => {
  const addr = (c?.addresses || []).find((a: any) => truthy(a.is_default)) || c?.addresses?.[0];
  return [
    c?.name,
    distinctLegalName(c),
    ...(addr ? addressLines(addr) : []),
    c?.gst_no ? `GSTIN: ${c.gst_no}` : null,
    panFromGstin(c?.gst_no) ? `PAN: ${panFromGstin(c?.gst_no)}` : null,
    c?.registration_number ? `Reg. no: ${c.registration_number}` : null,
    c?.primary_phone ? `Phone: ${c.primary_phone}` : null,
    c?.primary_email ? `Email: ${c.primary_email}` : null,
    c?.website ? `Web: ${websiteText(c.website)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

export const bankText = (b: any) =>
  [
    b?.bank_name ? `Bank: ${b.bank_name}` : null,
    b?.account_holder_name ? `Account name: ${b.account_holder_name}` : null,
    b?.account_number ? `Account no: ${String(b.account_number).replace(/\s+/g, "")}` : null,
    b?.ifsc_code ? `IFSC: ${b.ifsc_code}` : null,
    b?.account_type ? `Type: ${b.account_type}` : null,
    b?.branch_name ? `Branch: ${b.branch_name}${b?.branch_address ? `, ${b.branch_address}` : ""}` : null,
  ]
    .filter(Boolean)
    .join("\n");
