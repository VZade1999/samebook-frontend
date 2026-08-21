// Mirrors customer-backend.service/src/common/gst-state.util.ts.
// This is a PREVIEW-ONLY helper for instant on-screen calculation — the
// backend independently resolves and persists the authoritative tax split,
// so this file must never be the only place this logic lives.
export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

const STATE_NAME_TO_CODE: Record<string, string> = Object.entries(
  GST_STATE_CODES,
).reduce((acc, [code, name]) => {
  acc[name.trim().toLowerCase()] = code;
  return acc;
}, {} as Record<string, string>);

export function getStateCodeFromGstin(gstin?: string | null): string | null {
  if (!gstin) return null;
  const prefix = gstin.trim().slice(0, 2);
  return GST_STATE_CODES[prefix] ? prefix : null;
}

export function getStateCodeFromName(name?: string | null): string | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return STATE_NAME_TO_CODE[normalized] || null;
}

export type TaxType = "INTRA_STATE" | "INTER_STATE" | "NO_GST";

export function determineTaxType(
  sellerStateCode: string | null,
  buyerStateCode: string | null,
): TaxType {
  if (!sellerStateCode) return "NO_GST";
  if (!buyerStateCode) return "INTER_STATE";
  return sellerStateCode === buyerStateCode ? "INTRA_STATE" : "INTER_STATE";
}

// Resolves the seller's GST state code from whatever the company record
// exposes: a cached gst_state_code, else derived from its GSTIN prefix.
export function resolveSellerStateCode(company: {
  gst_state_code?: string | null;
  gst_no?: string | null;
} | null | undefined): string | null {
  if (!company) return null;
  return company.gst_state_code || getStateCodeFromGstin(company.gst_no) || null;
}
