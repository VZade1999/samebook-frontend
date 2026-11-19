import { message } from "antd";
import {
  MISSING_CONSIGNOR_GSTIN,
  companyAddressLines,
  companyGstin,
  fromWarehouseName,
  loadCompanyDetails,
  loadWarehouseMap,
  quotationNumber,
  reasonLabel,
  toWarehouseName,
  warehouseAddressLines,
} from "../constants";
import { getTrail } from "@/modules/document-links/documentLinksService";
import type { Trail } from "@/modules/document-links/types";
import { BAD, PdfKit, type Column, type ItemCell } from "@/utils/pdf/pdfKit";
import { addressLines, amount, date, parseJson, qty, stateWithCode, withDate } from "@/utils/pdf/pdfFormat";
import { logoDataUrl } from "@/utils/pdf/pdfData";

// Printed in triplicate per CGST Rule 55.
const COPIES = ["ORIGINAL FOR CONSIGNEE", "DUPLICATE FOR TRANSPORTER", "TRIPLICATE FOR CONSIGNOR"];

export interface ChallanPdfOptions {
  /**
   * Print Rate / Value columns. Off by default: the copy that travels with the
   * goods (driver, transporter, consignee) normally shows only item, HSN,
   * quantity and unit. Turn on for a valued copy (Rule 55 lists taxable value).
   */
  showValues?: boolean;
}

/**
 * Builds and downloads the delivery challan PDF (three copies). `fetchDetails`
 * is used when the passed challan is a list row without items.
 */
export async function downloadChallanPDF(challan: any, fetchDetails?: (id: number) => Promise<any>, options: ChallanPdfOptions = {}): Promise<void> {
  const showValues = !!options.showValues;
  const data = Array.isArray(challan?.items) && challan.items.length > 0 ? challan : (await fetchDetails?.(challan.id)) || challan;

  const company = await loadCompanyDetails();
  const gstin = companyGstin(company);
  if (!gstin) message.warning(MISSING_CONSIGNOR_GSTIN);
  // The company's default address, written like every other document's addresses.
  const companyAddresses: any[] = Array.isArray(company?.addresses) ? company.addresses : [];
  const companyAddress = companyAddresses.find((a) => a.is_default) || companyAddresses[0];
  const seller = {
    name: company?.name || company?.company_name || "Company",
    lines: companyAddress ? addressLines(companyAddress) : companyAddressLines(company),
    gstin: gstin || null,
    phone: company?.primary_phone || null,
    email: company?.primary_email || null,
    logo: logoDataUrl(company?.logo),
  };

  const isTransfer = data.reason === "STOCK_TRANSFER";
  const warehouseMap = isTransfer ? await loadWarehouseMap() : {};
  const billing = parseJson(data.billing_address_snapshot) || {};
  const shipping = parseJson(data.shipping_address_snapshot) || {};
  const consigneeGstin = data.customer_gst_number || billing?.gst_number || shipping?.gst_number || "";
  const items: any[] = data.items || [];

  // Quotation, PO and invoice references. If they can't be loaded the
  // challan still prints, with the quotation number it carries.
  let refs: Trail["references"] | null = null;
  try {
    refs = data?.id ? (await getTrail("challan", Number(data.id))).references : null;
  } catch (e) {
    console.warn("Challan PDF: linked documents not loaded", e);
  }

  const refCells: [string, string][] = [];
  const qn = quotationNumber(data);
  if (refs?.quotation || qn) refCells.push(["Quotation no. & date", refs?.quotation ? withDate(refs.quotation.number, refs.quotation.date) : String(qn)]);
  if (refs?.po) refCells.push(["Buyer's order no. & date", withDate(refs.po.number, refs.po.date)]);
  if (refs?.invoice) {
    if (refs.lot) {
      // Bill first, send in lots: the invoice this lot travels against, then which lot it is.
      refCells.push(["Against invoice", withDate(refs.invoice.number, refs.invoice.date)]);
      refCells.push(["Lot no.", `${refs.lot.number}${refs.lot.last ? " (last lot)" : ""}`]);
    } else {
      refCells.push(["Invoice no. & date", withDate(refs.invoice.number, refs.invoice.date)]);
    }
  }
  refCells.push(["Transporter", data.transporter_name || "—"]);
  refCells.push(["Vehicle no.", data.vehicle_number || "—"]);
  if (data.eway_bill_number) refCells.push(["E-way bill no.", data.eway_bill_number]);
  if (!isTransfer && fromWarehouseName(data)) refCells.push(["Dispatched from", fromWarehouseName(data)]);

  const billLines = addressLines(billing);
  const shipLines = addressLines(shipping);
  const sameAddress = !shipLines.length || shipLines.join("|").toLowerCase() === billLines.join("|").toLowerCase();
  const parties = isTransfer
    ? [
        { title: "Dispatch from (warehouse)", name: fromWarehouseName(data) || "—", lines: warehouseAddressLines(warehouseMap[String(data.from_warehouse_id)]), gstin: gstin || null },
        { title: "Deliver to (warehouse)", name: toWarehouseName(data) || "—", lines: warehouseAddressLines(warehouseMap[String(data.to_warehouse_id)]), gstin: gstin || null },
      ]
    : [
        { title: "Consignee (bill to)", name: data.customer_name || "—", lines: billLines, gstin: consigneeGstin || "Unregistered" },
        { title: "Ship to", name: data.customer_name || "—", lines: sameAddress ? [] : shipLines, empty: "Same as the billing address" },
      ];

  const lineValue = (it: any) => (it.value !== null && it.value !== undefined ? Number(it.value) : Number(it.quantity || 0) * Number(it.rate || 0));
  const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0);
  const totalValue = items.reduce((s, it) => s + lineValue(it), 0);

  const kit = await PdfKit.create("challan");
  kit.footNote = "Not a tax invoice";
  if (String(data.status || "").toUpperCase() === "CANCELLED") kit.stamp("CANCELLED", BAD);
  const cur = kit.cur;

  const cols: Column[] = showValues
    ? [
        { header: "#", width: 24, align: "center" },
        { header: "DESCRIPTION OF GOODS" },
        { header: "HSN", width: 62, align: "center" },
        { header: "QTY", width: 58, align: "right" },
        { header: "UNIT", width: 48, align: "center" },
        { header: `RATE (${cur})`, width: 70, align: "right" },
        { header: `VALUE (${cur})`, width: 84, align: "right" },
      ]
    : [
        { header: "#", width: 24, align: "center" },
        { header: "DESCRIPTION OF GOODS" },
        { header: "HSN", width: 76, align: "center" },
        { header: "QTY", width: 76, align: "right" },
        { header: "UNIT", width: 66, align: "center" },
      ];
  const rows = items.map((it, i) => {
    const row: (string | ItemCell)[] = [
      String(i + 1),
      {
        content: it.description ? `${it.item_name || ""}\n${it.description}` : String(it.item_name || ""),
        name: String(it.item_name || "—"),
        sub: it.description || null,
      },
      it.hsn_code || "—",
      qty(it.quantity),
      it.unit || "—",
    ];
    if (showValues) row.push(amount(it.rate), amount(lineValue(it)));
    return row;
  });
  const foot = ["", "Total", "", qty(data.total_quantity ?? totalQty), ""];
  if (showValues) foot.push("", amount(data.total_value ?? totalValue));

  // A lot of goods billed before dispatch (GST Rule 55(5)): what travels with it.
  const lotText =
    refs?.lot && refs.invoice
      ? refs.lot.last
        ? ` Last lot against invoice ${refs.invoice.number}: the original invoice travels with these goods.`
        : ` Lot ${refs.lot.number} against invoice ${refs.invoice.number}: a copy of the invoice travels with these goods.`
      : "";
  const declaration =
    `Not a tax invoice. Goods are moved under this delivery challan for: ${reasonLabel(data.reason)}. ` +
    (showValues ? "Values are stated for reference only; no GST is charged on this document." : "No GST is charged on this document.") +
    lotText;

  COPIES.forEach((copy) => {
    kit.beginCopy(copy);
    let y = kit.header({ seller, title: "DELIVERY CHALLAN", number: data.challan_number || "", subtitle: "Rule 55 · CGST Rules, 2017" });
    y =
      kit.facts(y, [
        { label: "Challan No.", value: data.challan_number || "—" },
        { label: "Challan Date", value: date(data.challan_date) || "—" },
        // "Sale (goods before invoice)" → "Sale": the full wording is in the declaration.
        { label: "Reason", value: reasonLabel(data.reason).replace(/\s*\(.*\)\s*$/, "") },
        { label: "Place of Supply", value: /\(\d{2}\)/.test(String(data.place_of_supply || "")) ? data.place_of_supply : stateWithCode(data.place_of_supply) || "—" },
      ]) + 12;
    y = kit.parties(y, parties) + 10;
    y = kit.refGrid(y, refCells, refCells.length === 4 ? 2 : 3) + 12;
    y = kit.table(y, cols, rows, { foot }) + 14;
    kit.closing(y, {
      terms: data.notes || null,
      termsTitle: "Notes",
      declaration,
      signFor: seller.name,
      receiver: true,
    });
  });

  kit.save(`delivery-challan-${data.challan_number || data.id}.pdf`);
}
