import { notification } from "antd";
import { BAD, PdfKit, type Column, type ItemCell, type Seller, type TotalRow } from "@/utils/pdf/pdfKit";
import { amount, date, pct, qty } from "@/utils/pdf/pdfFormat";
import { logoDataUrl, storedCompany } from "@/utils/pdf/pdfData";
import type { PoDetail } from "./api";

const single = (rates: number[]) => (rates.length && rates.every((r) => r === rates[0]) ? rates[0] : null);

/**
 * The purchase order PDF (Indian format): our letterhead and GSTIN, the
 * supplier with GSTIN and state code, where to deliver, PO facts and terms,
 * items with HSN and GST rate, totals with the amount in words and an
 * HSN-wise tax summary, and the authorised signatory with the company's
 * signature / stamp. Drafts and cancelled POs carry a stamp.
 */
export async function downloadPoPdf(po: PoDetail): Promise<void> {
  try {
    const company = storedCompany();
    const buyer = po.buyer || {};
    const supplier = po.supplier || {};
    const ship = po.ship_to || {};
    const seller: Seller = {
      name: buyer.name || company?.name || "Your company",
      lines: buyer.address_lines || [],
      gstin: buyer.gstin || null,
      phone: buyer.phone || null,
      email: buyer.email || null,
      extra: buyer.branch ? [`Branch: ${buyer.branch}`] : [],
      logo: logoDataUrl(company?.logo),
    };

    const kit = await PdfKit.create("purchase");
    const cur = kit.cur;
    if (po.status === "CANCELLED") kit.stamp("CANCELLED", BAD);
    else if (po.status === "DRAFT" || po.status === "PENDING_APPROVAL") kit.stamp("DRAFT", BAD);

    const intra = po.tax_type === "INTRA_STATE";
    const taxed = po.tax_type !== "NO_GST";
    const cols: Column[] = [
      { header: "#", width: 22, align: "center" },
      { header: "ITEM & DESCRIPTION" },
      { header: "HSN/SAC", width: 56, align: "center" },
      { header: "QTY", width: 58, align: "right" },
      { header: `RATE (${cur})`, width: 64, align: "right" },
      { header: "DISC.", width: 40, align: "right" },
      ...(taxed ? [{ header: "GST", width: 36, align: "right" as const }] : []),
      { header: `AMOUNT (${cur})`, width: 76, align: "right" },
    ];
    const rows = po.lines.map((l, i) => [
      String(i + 1),
      { content: l.description ? `${l.item_name}\n${l.description}` : l.item_name, name: l.item_name, sub: l.description || null } as ItemCell,
      l.hsn_code || "—",
      `${qty(l.qty)}${l.unit ? ` ${l.unit}` : ""}`,
      amount(l.rate),
      Number(l.discount_percent) > 0 ? pct(l.discount_percent) : "—",
      ...(taxed ? [pct(l.gst_rate)] : []),
      amount(l.amount),
    ]);

    const rate = single(po.lines.map((l) => Number(l.gst_rate)));
    const money = (v: unknown) => kit.money(v);
    const totals: TotalRow[] = [];
    if (Number(po.discount_amount) > 0) {
      totals.push({ label: "Items total", value: money(po.sub_total) });
      totals.push({ label: "Discount", value: `${kit.minus} ${money(po.discount_amount)}` });
    }
    if (Number(po.freight_charges) > 0 && po.freight_gst) totals.push({ label: "Freight / packing", value: money(po.freight_charges) });
    totals.push({ label: "Taxable value", value: money(po.taxable_amount) });
    if (intra) {
      totals.push({ label: rate !== null ? `CGST @ ${pct(rate / 2)}` : "CGST", value: money(po.cgst_amount) });
      totals.push({ label: rate !== null ? `SGST @ ${pct(rate / 2)}` : "SGST", value: money(po.sgst_amount) });
    } else if (taxed) {
      totals.push({ label: rate !== null ? `IGST @ ${pct(rate)}` : "IGST", value: money(po.igst_amount) });
    }
    if (Number(po.freight_charges) > 0 && !po.freight_gst) totals.push({ label: "Freight (no GST)", value: money(po.freight_charges) });
    if (Number(po.round_off)) totals.push({ label: "Round off", value: `${Number(po.round_off) < 0 ? `${kit.minus} ` : "+ "}${money(Math.abs(Number(po.round_off)))}` });

    const hsnHead = intra ? ["HSN/SAC", "Taxable", "CGST", "SGST", "Total tax"] : ["HSN/SAC", "Taxable", "IGST", "Total tax"];
    const hsnBody = (po.hsn_summary || []).map((h) =>
      intra
        ? [`${h.hsn} @ ${pct(h.rate)}`, amount(h.taxable), amount(h.cgst), amount(h.sgst), amount(h.cgst + h.sgst)]
        : [`${h.hsn} @ ${pct(h.rate)}`, amount(h.taxable), amount(h.igst), amount(h.igst)],
    );
    const hsn = taxed && hsnBody.length ? { head: hsnHead, body: hsnBody, widths: intra ? [76, 64, 54, 54, 60] : [86, 80, 70, 70] } : null;

    const refs: [string, string][] = [];
    if (po.supplier_ref) refs.push(["Supplier's quotation / ref.", po.supplier_ref]);
    if (po.payment_terms) refs.push(["Payment terms", po.payment_terms]);
    if (po.delivery_terms) refs.push(["Delivery terms", po.delivery_terms]);
    if (po.revision > 0) refs.push(["Amendment", `No. ${po.revision} — this replaces the earlier copy`]);

    const contact = [supplier.contact_name, supplier.phone, supplier.email].filter(Boolean).join("   ·   ");
    const msme = supplier.msme_type ? `MSME (${String(supplier.msme_type).toLowerCase()})${supplier.udyam_number ? ` · ${supplier.udyam_number}` : ""}` : null;

    let y = kit.header({ seller, title: "PURCHASE ORDER", number: po.po_number });
    y =
      kit.facts(y, [
        { label: "PO No.", value: po.po_number },
        { label: "PO Date", value: date(po.po_date) || "—" },
        { label: "Expected Delivery", value: date(po.expected_date) || "As agreed" },
        { label: "Place of Supply", value: po.place_of_supply ? `${po.place_of_supply} (${po.place_of_supply_code})` : "—" },
      ]) + 12;
    y =
      kit.parties(y, [
        {
          title: "Supplier",
          name: supplier.legal_name || supplier.name || "—",
          lines: supplier.address?.lines || [],
          gstin: supplier.gstin || "Unregistered",
          meta: [contact, msme].filter(Boolean) as string[],
        },
        {
          title: "Deliver to",
          name: ship.name ? `${seller.name} — ${ship.name}` : seller.name,
          lines: ship.lines?.length ? ship.lines : [],
          empty: "Our address above",
          gstin: seller.gstin || null,
        },
      ]) + 12;
    if (refs.length) y = kit.refGrid(y, refs, refs.length >= 3 ? 3 : refs.length) + 12;
    else y += 2;
    y = kit.table(y, cols, rows) + 12;
    const grand = Number(po.grand_total || 0);
    y = kit.totals(y, {
      rows: totals,
      grand: { label: "PO total", value: money(grand) },
      after: [],
      leftHeight: (w) => kit.words(0, 0, w, grand, false) + (hsn ? 10 + kit.miniTable(0, 0, w, "", hsn.head, hsn.body, hsn.widths, false) : 0),
      left: (x, top, w) => {
        const h = kit.words(x, top, w, grand);
        if (hsn) kit.miniTable(x, top + h + 10, w, "HSN-wise tax summary", hsn.head, hsn.body, hsn.widths);
      },
    });
    kit.closing(y + 12, {
      bank: [],
      terms: [po.notes, po.terms_conditions].filter((s) => String(s || "").trim()).join("\n"),
      termsTitle: "Terms & conditions",
      thanks: null,
      note: `This purchase order is computer generated${po.approved_by ? ` and approved by ${po.approved_by}` : ""}. Please quote ${po.po_number} on your invoice and delivery challan.`,
      signFor: seller.name,
    });
    kit.save(`purchase-order-${po.po_number.replace(/[\\/]+/g, "-")}${po.revision ? `-amendment-${po.revision}` : ""}.pdf`);
  } catch (error: any) {
    notification.error({ title: "Download failed", description: error?.message || "Unable to make the purchase order PDF" });
  }
}
