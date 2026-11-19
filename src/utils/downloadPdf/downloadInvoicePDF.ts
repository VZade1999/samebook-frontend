import { notification } from "antd";
import { getTrail } from "@/modules/document-links/documentLinksService";
import type { Trail } from "@/modules/document-links/types";
import { BAD, GOOD, PdfKit, type Column, type ItemCell, type TotalRow } from "@/utils/pdf/pdfKit";
import { addressLines, amount, date, parseJson, pct, qty, stateWithCode, uniq, withDate } from "@/utils/pdf/pdfFormat";
import { bankRows, hsnSummary, lineNet, sellerFromSnapshot, storedCompany, totalRows } from "@/utils/pdf/pdfData";

/** GST Rule 48: an invoice for goods is made in triplicate. */
export const INVOICE_COPIES = ["ORIGINAL FOR RECIPIENT", "DUPLICATE FOR TRANSPORTER", "TRIPLICATE FOR SUPPLIER"] as const;

export interface InvoicePdfOptions {
  /** "original" (default — the copy you email) or all three copies for printing. */
  copies?: "original" | "all";
}

const DECLARATION =
  "Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";

/**
 * The tax invoice PDF: letterhead, key facts, bill-to / ship-to, the
 * references (PO, quotation, challans, dispatch), items, totals with the
 * amount in words and an HSN-wise tax summary, bank / terms / signature —
 * and a PAID or CANCELLED stamp when that applies.
 */
export async function downloadInvoicePDF(
  invoice: any,
  fetchInvoiceDetails?: (id: number) => Promise<any>,
  options: InvoicePdfOptions = {},
): Promise<void> {
  try {
    const data =
      invoice.items?.length > 0 ? invoice : await fetchInvoiceDetails?.(invoice.id).then((res) => res?.data?.data || invoice);

    // The linked documents: PO, quotation, challans with their vehicle / e-way
    // bill, and the place of supply. If they can't be loaded the invoice still
    // prints, without the references.
    let trail: Trail | null = null;
    try {
      trail = data?.id ? await getTrail("invoice", Number(data.id)) : null;
    } catch (e) {
      console.warn("Invoice PDF: linked documents not loaded", e);
    }

    const company = storedCompany();
    const seller = sellerFromSnapshot(data.business_details_snapshot, company);
    const items: any[] = Array.isArray(data.items) ? data.items : [];
    const billing = parseJson(data.billing_address_snapshot) || {};
    const shipping = parseJson(data.shipping_address_snapshot) || {};

    // ── References ──────────────────────────────────────────────────────────
    const refs = trail?.references;
    const pos = trail?.place_of_supply;
    const placeOfSupply = pos ? `${pos.state}${pos.code ? ` (${pos.code})` : ""}` : stateWithCode(shipping.state || billing.state) || "—";
    const challans = refs?.challans || [];
    // The invoice's own dispatch details (when it travels with the goods), then those of the challans it bills.
    const own = refs?.dispatch || {
      vehicle_number: data.vehicle_number || null,
      transporter_name: data.transporter_name || null,
      lr_number: data.lr_number || null,
      eway_bill_number: data.eway_bill_number || null,
    };
    const vehicles = uniq([own.vehicle_number, ...challans.map((c) => c.vehicle_number)]);
    const transporters = uniq([own.transporter_name, ...challans.map((c) => c.transporter_name)]);
    const lrs = uniq([own.lr_number]);
    const eways = uniq([own.eway_bill_number, ...challans.map((c) => c.eway_bill_number)]);
    const dispatch = [
      vehicles.length ? `Vehicle ${vehicles.join(", ")}` : null,
      transporters.length ? `Transporter ${transporters.join(", ")}` : null,
      lrs.length ? `LR No. ${lrs.join(", ")}` : null,
      eways.length ? `E-way bill ${eways.join(", ")}` : null,
    ].filter(Boolean) as string[];
    // One invoice can bill several quotations (monthly billing): print them all.
    const buyerOrders = refs?.pos?.length ? refs.pos : refs?.po ? [refs.po] : [];
    const quotationRefs = refs?.quotations?.length ? refs.quotations : refs?.quotation ? [refs.quotation] : [];
    const quotationText = quotationRefs.map((q) => withDate(q.number, q.date)).join(", ") || data.quotation_number || "";
    const refCells: [string, string][] = [];
    if (buyerOrders.length) {
      refCells.push([buyerOrders.length > 1 ? "Buyer's order nos. & dates" : "Buyer's order no. & date", buyerOrders.map((p) => withDate(p.number, p.date)).join(", ")]);
    }
    if (quotationText) refCells.push([quotationRefs.length > 1 ? "Quotation nos. & dates" : "Quotation no. & date", quotationText]);
    if (challans.length) refCells.push(["Delivery challan no(s). & date(s)", challans.map((c) => withDate(c.number, c.date)).join(", ")]);
    if (dispatch.length) refCells.push(["Dispatch details", dispatch.join("   ·   ")]);

    // ── Customer ────────────────────────────────────────────────────────────
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

    // ── Money ───────────────────────────────────────────────────────────────
    const grand = Number(data.grand_total || 0);
    const paid = Number(data.paid_amount || 0);
    const balance = data.balance_amount !== null && data.balance_amount !== undefined ? Number(data.balance_amount) : grand - paid;
    const status = String(data.status || "").toUpperCase();
    const terms = [data.notes, data.terms_conditions].filter((s) => String(s || "").trim()).join("\n") || company?.default_terms_conditions || "";

    const kit = await PdfKit.create("invoice");
    const cur = kit.cur;
    if (status === "CANCELLED" || status === "SUPERSEDED") kit.stamp("CANCELLED", BAD);
    else if (grand > 0 && balance <= 0.005) kit.stamp("PAID", GOOD);

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
    const after: TotalRow[] =
      paid > 0.005
        ? [
            { label: "Received", value: kit.money(paid), tone: "good" },
            { label: "Balance due", value: kit.money(Math.max(0, balance)), tone: balance > 0.005 ? "accent" : "good" },
          ]
        : [];
    const hsn = hsnSummary(data, items);

    const copies = options.copies === "all" ? [...INVOICE_COPIES] : [INVOICE_COPIES[0]];
    copies.forEach((copy) => {
      kit.beginCopy(copy);
      let y = kit.header({ seller, title: "TAX INVOICE", number: data.invoice_number || "" });
      y =
        kit.facts(y, [
          { label: "Invoice No.", value: data.invoice_number || "—" },
          { label: "Invoice Date", value: date(data.invoice_date) || "—" },
          { label: "Due Date", value: date(data.due_date) || "On receipt" },
          { label: "Place of Supply", value: placeOfSupply },
        ]) + 12;
      y =
        kit.parties(y, [
          { title: "Bill to", name: data.customer_name || "—", lines: billLines, gstin: data.customer_gst_number || billing.gst_number || "Unregistered", meta: contact ? [contact] : [] },
          { title: "Ship to", name: data.customer_name || "—", lines: sameAddress ? [] : shipLines, empty: "Same as the billing address" },
        ]) + 12;
      if (refCells.length) y = kit.refGrid(y, refCells, refCells.length === 4 ? 2 : 3) + 12;
      else y += 2;
      y = kit.table(y, cols, rows) + 12;
      y = kit.totals(y, {
        rows: totalRows(data, items, (v) => kit.money(v), kit.minus),
        grand: { label: "Grand total", value: kit.money(grand) },
        after,
        leftHeight: (w) => kit.words(0, 0, w, grand, false) + (hsn ? 10 + kit.miniTable(0, 0, w, "", hsn.head, hsn.body, hsn.widths, false) : 0),
        left: (x, top, w) => {
          const h = kit.words(x, top, w, grand);
          if (hsn) kit.miniTable(x, top + h + 10, w, "HSN-wise tax summary", hsn.head, hsn.body, hsn.widths);
        },
      });
      kit.closing(y + 12, {
        bank: bankRows(data.payment_details_snapshot),
        terms,
        thanks: "Thank you for your business!",
        note: DECLARATION,
        signFor: seller.name,
      });
    });

    kit.save(`invoice-${data.invoice_number}${options.copies === "all" ? "-3-copies" : ""}.pdf`);
  } catch (error: any) {
    notification.error({
      title: "Download failed",
      description: error?.message || "Unable to make the invoice PDF",
    });
  }
}
