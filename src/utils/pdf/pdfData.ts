// What the quotation and invoice PDFs read from a document: the seller (from
// the document's own snapshot), bank details, the totals rows (reconciled to
// the grand total) and the HSN-wise tax summary.

import { StorageService } from "@/storage";
import { docTaxesTransport, gstBase } from "@/utils/transportGst";
import { amount, parseJson, pct } from "./pdfFormat";
import type { Seller, TotalRow } from "./pdfKit";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** The company saved at sign-in (name, logo…), if any. */
export const storedCompany = (): any => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "null");
  } catch {
    return null;
  }
};

/** A company logo as a data URL, whichever shape the API sent (data URL, base64, Buffer JSON). */
export const logoDataUrl = (logo: any): string | null => {
  if (!logo) return null;
  if (typeof logo === "string") return logo.startsWith("data:image") ? logo : logo.length ? `data:image/png;base64,${logo}` : null;
  if (!Array.isArray(logo?.data) || !logo.data.length) return null;
  try {
    const bytes = new Uint8Array(logo.data);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const png = bytes[0] === 0x89 && bytes[1] === 0x50;
    const jpg = bytes[0] === 0xff && bytes[1] === 0xd8;
    return `data:${png ? "image/png" : jpg ? "image/jpeg" : "image/png"};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
};

/** The seller as printed on the document (its business-details snapshot), falling back to the company. */
export const sellerFromSnapshot = (snapshot: unknown, company: any): Seller => {
  const s = parseJson(snapshot) || {};
  const lines =
    typeof s.businessAddress === "string"
      ? s.businessAddress
          .split("\n")
          .map((l: string) => l.trim())
          .filter(Boolean)
      : [];
  const extra = Array.isArray(s.businessMeta)
    ? s.businessMeta
        .filter((m: any) => m?.key && m?.value && m.key !== "undefined" && m.value !== "undefined")
        .map((m: any) => `${m.key}: ${m.value}`)
    : [];
  return {
    name: s.businessName || company?.name || "Your Company",
    lines,
    gstin: s.businessGST || company?.gst_no || null,
    phone: s.businessPhone || company?.primary_phone || null,
    email: s.businessEmail || company?.primary_email || null,
    extra,
    logo: logoDataUrl(company?.logo || s.logo),
  };
};

export const bankRows = (snapshot: unknown): [string, string][] => {
  const b = parseJson(snapshot) || {};
  const rows: [string, unknown][] = [
    ["Bank", b.bank_name],
    ["A/c holder", b.account_holder_name],
    ["A/c number", b.account_number],
    ["IFSC", b.ifsc_code],
    ["Branch", b.branch_name],
  ];
  return rows.filter(([, v]) => v !== null && v !== undefined && String(v).trim()).map(([k, v]) => [k, String(v).trim()]);
};

/** A line's value after its own discount. */
export const lineNet = (it: any) =>
  it?.total !== undefined && it?.total !== null ? num(it.total) : round2(num(it?.qty) * num(it?.rate) * (1 - num(it?.discount_percent) / 100));

/**
 * The totals rows, adding up to the grand total: items (after their own
 * discounts), the overall discount, taxable value, GST that applies,
 * transport, and a round-off line only when the stored figures need one.
 * Transport that carried GST (transport_gst) is part of the taxable value,
 * so it is listed before it; older documents list it after the GST.
 */
export const totalRows = (data: any, items: any[], money: (v: unknown) => string, minus = "−"): TotalRow[] => {
  const itemsNet = round2(items.reduce((s, it) => s + lineNet(it), 0));
  const sub = num(data.sub_total);
  const disc = num(data.discount_amount);
  const taxable = round2(sub - disc);
  const transport = num(data.transport_charges);
  const taxedTransport = transport > 0 && docTaxesTransport(data);
  // Older documents stored the subtotal after line discounts.
  const subIsNet = Math.abs(itemsNet - sub) < 0.01;
  const overall = subIsNet ? disc : round2(itemsNet - taxable);
  const rows: TotalRow[] = [];
  // Items total only when something is added to or taken off it; otherwise it equals the taxable value.
  if (overall > 0.005 || taxedTransport) {
    rows.push({ label: subIsNet ? "Subtotal" : "Items total", value: money(subIsNet ? sub : itemsNet) });
  }
  if (overall > 0.005) rows.push({ label: "Discount", value: `${minus} ${money(overall)}` });
  if (taxedTransport) rows.push({ label: "Transport", value: money(transport) });
  rows.push({ label: "Taxable value", value: money(gstBase(taxable, transport, taxedTransport)) });
  const cgst = num(data.cgst_amount);
  const sgst = num(data.sgst_amount);
  const igst = num(data.igst_amount);
  if (cgst > 0) rows.push({ label: `CGST @ ${pct(data.cgst_percent)}`, value: money(cgst) });
  if (sgst > 0) rows.push({ label: `SGST @ ${pct(data.sgst_percent)}`, value: money(sgst) });
  if (igst > 0) rows.push({ label: `IGST @ ${pct(data.igst_percent)}`, value: money(igst) });
  if (transport > 0 && !taxedTransport) rows.push({ label: "Transport", value: money(transport) });
  const off = round2(num(data.grand_total) - (taxable + cgst + sgst + igst + transport));
  if (Math.abs(off) >= 0.01) rows.push({ label: "Round off", value: `${off < 0 ? `${minus} ` : "+ "}${money(Math.abs(off))}` });
  return rows;
};

/**
 * HSN-wise tax summary (as Tally prints it): each HSN's share of the taxable
 * value and its tax, adjusted so the columns add up to the invoice's totals.
 * Transport that carried GST is shared out over the HSNs by value — it goes
 * with the goods it delivers (a composite supply). Null when no GST is charged.
 */
export const hsnSummary = (data: any, items: any[]) => {
  const tax = { cgst: num(data.cgst_amount), sgst: num(data.sgst_amount), igst: num(data.igst_amount) };
  if (tax.cgst + tax.sgst + tax.igst <= 0) return null;
  const intra = tax.igst <= 0;
  const groups = new Map<string, number>();
  items.forEach((it) => {
    const k = String(it?.hsn_code || "").trim() || "—";
    groups.set(k, (groups.get(k) || 0) + lineNet(it));
  });
  const itemsNet = [...groups.values()].reduce((s, v) => s + v, 0);
  const taxable = gstBase(round2(num(data.sub_total) - num(data.discount_amount)), data.transport_charges, docTaxesTransport(data));
  const share = itemsNet > 0 ? taxable / itemsNet : 0;
  const rows = [...groups.entries()].map(([hsn, net]) => ({ hsn, taxable: round2(net * share), cgst: 0, sgst: 0, igst: 0 }));
  const fix = (key: "taxable" | "cgst" | "sgst" | "igst", want: number) => {
    const sum = round2(rows.reduce((s, r) => s + r[key], 0));
    rows[rows.length - 1][key] = round2(rows[rows.length - 1][key] + want - sum);
  };
  fix("taxable", taxable);
  rows.forEach((r) => {
    r.cgst = round2((r.taxable * num(data.cgst_percent)) / 100);
    r.sgst = round2((r.taxable * num(data.sgst_percent)) / 100);
    r.igst = round2((r.taxable * num(data.igst_percent)) / 100);
  });
  fix("cgst", tax.cgst);
  fix("sgst", tax.sgst);
  fix("igst", tax.igst);
  const totalTax = round2(tax.cgst + tax.sgst + tax.igst);
  const head = intra
    ? ["HSN/SAC", "Taxable", `CGST ${pct(data.cgst_percent)}`, `SGST ${pct(data.sgst_percent)}`, "Total tax"]
    : ["HSN/SAC", "Taxable", `IGST ${pct(data.igst_percent)}`, "Total tax"];
  const body = rows.map((r) =>
    intra
      ? [r.hsn, amount(r.taxable), amount(r.cgst), amount(r.sgst), amount(r.cgst + r.sgst)]
      : [r.hsn, amount(r.taxable), amount(r.igst), amount(r.igst)],
  );
  if (rows.length > 1) {
    body.push(intra ? ["Total", amount(taxable), amount(tax.cgst), amount(tax.sgst), amount(totalTax)] : ["Total", amount(taxable), amount(tax.igst), amount(totalTax)]);
  }
  return { head, body, widths: intra ? [70, 66, 56, 56, 62] : [80, 80, 70, 70] };
};
