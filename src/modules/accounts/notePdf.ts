import { notification } from "antd";
import { BAD, PdfKit, type Column, type ItemCell, type Seller, type TotalRow } from "@/utils/pdf/pdfKit";
import { amount, date, pct, qty } from "@/utils/pdf/pdfFormat";
import { logoDataUrl, storedCompany } from "@/utils/pdf/pdfData";
import type { NoteView } from "./api";

/**
 * A GST credit note (to a customer) or debit note (to a supplier) as a PDF,
 * with what Rule 53 asks for: both parties with GSTIN, the note's number and
 * date, the original invoice / bill and its date, the taxable value, GST
 * rates and amounts, the total in words, and the signature.
 */
export async function downloadNotePdf(n: NoteView): Promise<void> {
  try {
    const company = storedCompany();
    const seller: Seller = {
      name: n.company.name || company?.name || "Your company",
      lines: n.company.address_lines || [],
      gstin: n.company.gstin,
      phone: n.company.phone,
      email: n.company.email,
      logo: logoDataUrl(company?.logo),
    };
    const credit = n.kind === "credit";
    const kit = await PdfKit.create("ledger");
    const cur = kit.cur;
    if (n.status === "CANCELLED") kit.stamp("CANCELLED", BAD);
    const title = credit ? "CREDIT NOTE" : "DEBIT NOTE";
    let y = kit.header({ seller, title, number: n.number, subtitle: credit ? "Issued under Section 34, CGST Act" : "Purchase return / adjustment" });
    y =
      kit.facts(y, [
        { label: credit ? "Credit note no." : "Debit note no.", value: n.number },
        { label: "Date", value: date(n.date) || "—" },
        { label: credit ? "Against invoice" : "Against bill", value: n.against?.number || "—" },
        { label: credit ? "Invoice date" : "Bill date", value: date(n.against?.date) || "—" },
      ]) + 12;
    y =
      kit.parties(y, [
        { title: credit ? "Customer" : "Supplier", name: n.party.name || "—", lines: n.party.lines || [], gstin: n.party.gstin || "Unregistered" },
        { title: "Reason", name: n.reason_word, lines: [n.note || "", n.stock ? (credit ? `Goods taken back into stock${n.warehouse ? ` (${n.warehouse})` : ""}` : `Goods returned from stock${n.warehouse ? ` (${n.warehouse})` : ""}`) : ""].filter(Boolean) },
      ]) + 12;

    const withQty = n.lines.some((l) => l.qty !== null);
    const showRate = !credit;
    const cols: Column[] = [
      { header: "#", width: 22, align: "center" },
      { header: "ITEM / DESCRIPTION" },
      { header: "HSN/SAC", width: 58, align: "center" },
      ...(withQty ? [{ header: "QTY", width: 58, align: "right" as const }, { header: `RATE (${cur})`, width: 66, align: "right" as const }] : []),
      ...(showRate ? [{ header: "GST", width: 40, align: "right" as const }] : []),
      { header: `TAXABLE (${cur})`, width: 84, align: "right" },
    ];
    const rows = n.lines.map((l, i) => [
      String(i + 1),
      { content: l.name, name: l.name, sub: null } as ItemCell,
      l.hsn_code || "—",
      ...(withQty ? [l.qty !== null ? `${qty(l.qty)}${l.unit ? ` ${l.unit}` : ""}` : "—", l.rate !== null ? amount(l.rate) : "—"] : []),
      ...(showRate ? [l.gst_rate !== null ? pct(l.gst_rate) : "—"] : []),
      amount(l.taxable),
    ]);
    y = kit.table(y, cols, rows) + 12;

    const money = (v: number) => kit.money(v);
    const totals: TotalRow[] = [{ label: "Taxable value", value: money(n.taxable) }];
    const r = n.rates;
    if (n.cgst) totals.push({ label: r?.cgst ? `CGST @ ${pct(r.cgst)}` : "CGST", value: money(n.cgst) });
    if (n.sgst) totals.push({ label: r?.sgst ? `SGST @ ${pct(r.sgst)}` : "SGST", value: money(n.sgst) });
    if (n.igst) totals.push({ label: r?.igst ? `IGST @ ${pct(r.igst)}` : "IGST", value: money(n.igst) });
    y = kit.totals(y, {
      rows: totals,
      grand: { label: credit ? "Credit note total" : "Debit note total", value: money(n.total) },
      after: [],
      leftHeight: (w) => kit.words(0, 0, w, n.total, false),
      left: (x, top, w) => {
        kit.words(x, top, w, n.total);
      },
    });
    kit.closing(y + 12, {
      bank: [],
      terms: null,
      thanks: null,
      note: credit
        ? `This credit note reduces invoice ${n.against?.number || ""} by ${cur}${amount(n.total)} (GST ${cur}${amount(n.cgst + n.sgst + n.igst)}).`
        : `This debit note reduces bill ${n.against?.number || ""} by ${cur}${amount(n.total)} (GST ${cur}${amount(n.cgst + n.sgst + n.igst)}).`,
      signFor: seller.name,
    });
    kit.save(`${credit ? "credit-note" : "debit-note"}-${n.number.replace(/[\\/]+/g, "-")}.pdf`);
  } catch (error: any) {
    notification.error({ title: "Download failed", description: error?.message || "Unable to make the PDF" });
  }
}
