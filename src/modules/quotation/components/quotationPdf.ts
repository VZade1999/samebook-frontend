import { notification } from "antd";
import { BAD, MUTED, PdfKit, type Column, type Fact, type ItemCell } from "@/utils/pdf/pdfKit";
import { addressLines, amount, date, parseJson, pct, qty, withDate } from "@/utils/pdf/pdfFormat";
import { bankRows, lineNet, sellerFromSnapshot, storedCompany, totalRows } from "@/utils/pdf/pdfData";

/**
 * The quotation PDF: letterhead, key facts (number, date, valid until, the
 * customer's PO), quotation-for / deliver-to, items with their discounts,
 * totals with the amount in words, bank / terms / signature.
 */
export async function downloadQuotationPDF(quotation: any, fetchQuotationDetails?: (id: number) => Promise<any>): Promise<void> {
  try {
    const data =
      quotation.items?.length > 0 ? quotation : await fetchQuotationDetails?.(quotation.id).then((res) => res?.data?.data || quotation);

    const company = storedCompany();
    const seller = sellerFromSnapshot(data.business_details_snapshot, company);
    const items: any[] = Array.isArray(data.items) ? data.items : [];
    const billing = parseJson(data.billing_address_snapshot) || {};
    const shipping = parseJson(data.shipping_address_snapshot) || {};
    const billLines = addressLines(billing);
    const shipLines = addressLines(shipping);
    const sameAddress = !shipLines.length || shipLines.join("|").toLowerCase() === billLines.join("|").toLowerCase();
    const contact = [
      data.contact_person_name && data.contact_person_name !== data.customer_name ? data.contact_person_name : null,
      data.contact_person_phone,
      data.contact_person_email,
    ]
      .filter(Boolean)
      .join("   ·   ");
    const grand = Number(data.grand_total || 0);
    const validTill = date(data.validity_date);
    const status = String(data.status || "").toUpperCase();
    const terms = String(data.notes || "").trim() || company?.default_terms_conditions || "";

    const kit = await PdfKit.create("quotation");
    if (status === "EXPIRED") kit.stamp("EXPIRED", MUTED);
    else if (status === "REJECTED") kit.stamp("DECLINED", BAD);
    const cur = kit.cur;

    const facts: Fact[] = [
      { label: "Quotation No.", value: data.quotation_number || "—" },
      { label: "Date", value: date(data.quotation_date || data.created_at) || "—" },
      { label: "Valid Until", value: validTill || "—" },
      data.customer_po_number
        ? { label: "Your PO", value: withDate(data.customer_po_number, data.customer_po_date) }
        : { label: "Quotation Total", value: kit.money(grand), accent: true },
    ];
    const cols: Column[] = [
      { header: "#", width: 24, align: "center" },
      { header: "ITEM & DESCRIPTION" },
      { header: "HSN/SAC", width: 58, align: "center" },
      { header: "QTY", width: 62, align: "right" },
      { header: `RATE (${cur})`, width: 70, align: "right" },
      { header: "DISC.", width: 44, align: "right" },
      { header: `AMOUNT (${cur})`, width: 82, align: "right" },
    ];
    const rows = items.map((it, i) => [
      String(i + 1),
      {
        content: it.description ? `${it.product_name || ""}\n${it.description}` : String(it.product_name || ""),
        name: String(it.product_name || "—"),
        sub: it.description || null,
      } as ItemCell,
      it.hsn_code || "—",
      `${qty(it.qty)}${it.unit ? ` ${it.unit}` : ""}`,
      amount(it.rate),
      Number(it.discount_percent) > 0 ? pct(it.discount_percent) : "—",
      amount(lineNet(it)),
    ]);

    kit.beginCopy(null);
    let y = kit.header({ seller, title: "QUOTATION", number: data.quotation_number || "" });
    y = kit.facts(y, facts) + 12;
    y =
      kit.parties(y, [
        { title: "Quotation for", name: data.customer_name || "—", lines: billLines, gstin: data.customer_gst_number || billing.gst_number || "Unregistered", meta: contact ? [contact] : [] },
        { title: "Deliver to", name: data.customer_name || "—", lines: sameAddress ? [] : shipLines, empty: "Same as the billing address" },
      ]) + 12;
    y = kit.table(y, cols, rows) + 12;
    y = kit.totals(y, {
      rows: totalRows(data, items, (v) => kit.money(v), kit.minus),
      grand: { label: "Quotation total", value: kit.money(grand) },
      leftHeight: (w) => kit.words(0, 0, w, grand, false),
      left: (x, top, w) => kit.words(x, top, w, grand),
    });
    kit.closing(y + 12, {
      bank: bankRows(data.payment_details_snapshot),
      terms,
      thanks: "Thank you for considering us!",
      note: validTill ? `This quotation is valid until ${validTill}. Prices and availability may change after that date.` : null,
      signFor: seller.name,
    });

    kit.save(`quotation-${data.quotation_number}.pdf`);
  } catch (err: any) {
    notification.error({
      title: "Download failed",
      description: err?.message || "Unable to make the quotation PDF",
    });
  }
}
