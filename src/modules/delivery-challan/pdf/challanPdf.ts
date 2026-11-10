import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { message } from "antd";
import {
  MISSING_CONSIGNOR_GSTIN,
  addressLines,
  companyAddressLines,
  companyGstin,
  formatQty,
  fromWarehouseName,
  loadCompanyDetails,
  loadWarehouseMap,
  warehouseAddressLines,
  parseJson,
  quotationNumber,
  reasonLabel,
  toWarehouseName,
} from "../constants";

// Printed in triplicate per CGST Rule 55.
const COPIES = [
  "ORIGINAL FOR CONSIGNEE",
  "DUPLICATE FOR TRANSPORTER",
  "TRIPLICATE FOR CONSIGNOR",
];

const money = (v: any) =>
  `Rs. ${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateText = (v?: string) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export interface ChallanPdfOptions {
  /**
   * Print Rate / Value columns. Off by default: the copy that travels with the
   * goods (driver, transporter, consignee) normally shows only item, HSN,
   * quantity and unit. Turn on for a valued copy (Rule 55 lists taxable value).
   */
  showValues?: boolean;
}

/**
 * Builds and downloads the delivery challan PDF. `fetchDetails` is used when
 * the passed challan is a list row without items.
 */
export async function downloadChallanPDF(
  challan: any,
  fetchDetails?: (id: number) => Promise<any>,
  options: ChallanPdfOptions = {},
): Promise<void> {
  const showValues = !!options.showValues;
  const data =
    Array.isArray(challan?.items) && challan.items.length > 0
      ? challan
      : (await fetchDetails?.(challan.id)) || challan;

  const company = await loadCompanyDetails();
  const companyName = company?.name || company?.company_name || "Company";
  const companyLines = companyAddressLines(company);
  const gstin = companyGstin(company);
  if (!gstin) message.warning(MISSING_CONSIGNOR_GSTIN);

  const isTransfer = data.reason === "STOCK_TRANSFER";
  const warehouseMap = isTransfer ? await loadWarehouseMap() : {};
  const fromWhLines = warehouseAddressLines(warehouseMap[String(data.from_warehouse_id)]);
  const toWhLines = warehouseAddressLines(warehouseMap[String(data.to_warehouse_id)]);
  const billing = parseJson(data.billing_address_snapshot);
  const shipping = parseJson(data.shipping_address_snapshot);
  const consigneeGstin = data.customer_gst_number || billing?.gst_number || shipping?.gst_number || "";
  const items: any[] = data.items || [];

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 36;
  const mR = pageW - 36;
  const innerW = mR - mL;
  const black = () => doc.setTextColor(25, 25, 25);
  const gray = () => doc.setTextColor(110, 110, 110);

  const drawCopy = (copyLabel: string) => {
    let y = 40;

    // ── Title band ────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    black();
    doc.text("DELIVERY CHALLAN", pageW / 2, y, { align: "center" });
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    gray();
    doc.text("(Rule 55 of the CGST Rules, 2017)", pageW / 2, y, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const labelW = doc.getTextWidth(copyLabel) + 14;
    doc.setDrawColor(25, 25, 25);
    doc.setLineWidth(0.6);
    doc.rect(mR - labelW, 26, labelW, 16);
    black();
    doc.text(copyLabel, mR - labelW / 2, 37, { align: "center" });
    y += 14;

    // ── Consignor + challan meta ──────────────────────────────────────────
    const half = innerW / 2;
    const boxTop = y;
    let ly = boxTop + 14;
    doc.setFontSize(8);
    gray();
    doc.text("CONSIGNOR", mL + 8, ly);
    ly += 13;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    black();
    doc.text(String(companyName), mL + 8, ly, { maxWidth: half - 16 });
    ly += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    companyLines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, half - 16);
      doc.text(wrapped, mL + 8, ly);
      ly += 11 * wrapped.length;
    });
    if (gstin) {
      doc.setFont("helvetica", "bold");
      doc.text(`GSTIN: ${gstin}`, mL + 8, ly);
      ly += 11;
    }

    const meta: [string, string][] = [
      ["Challan No.", data.challan_number || "-"],
      ["Challan Date", dateText(data.challan_date)],
      ["Reason", reasonLabel(data.reason)],
      ["Place of Supply", data.place_of_supply || "-"],
    ];
    const qn = quotationNumber(data);
    if (qn) meta.push(["Quotation No.", qn]);
    if (data.eway_bill_number) meta.push(["E-way Bill No.", data.eway_bill_number]);

    let ry = boxTop + 14;
    meta.forEach(([k, v]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      gray();
      doc.text(k, mL + half + 8, ry);
      doc.setFont("helvetica", "bold");
      black();
      doc.text(String(v), mL + half + 90, ry, { maxWidth: half - 98 });
      ry += 13;
    });

    const boxBottom = Math.max(ly, ry) + 4;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.rect(mL, boxTop, innerW, boxBottom - boxTop);
    doc.line(mL + half, boxTop, mL + half, boxBottom);
    y = boxBottom;

    // ── Consignee / Ship-to (or warehouses for a stock transfer) ───────────
    const block = (title: string, name: string, lines: string[], x: number, top: number, extra?: string) => {
      let by = top + 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      gray();
      doc.text(title, x + 8, by);
      by += 13;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      black();
      doc.text(name || "-", x + 8, by, { maxWidth: half - 16 });
      by += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      lines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, half - 16);
        doc.text(wrapped, x + 8, by);
        by += 11 * wrapped.length;
      });
      if (extra) {
        doc.setFont("helvetica", "bold");
        doc.text(extra, x + 8, by);
        by += 11;
      }
      return by;
    };

    const top2 = y;
    let leftEnd: number;
    let rightEnd: number;
    if (isTransfer) {
      leftEnd = block("DISPATCH FROM (WAREHOUSE)", fromWarehouseName(data) || "-", fromWhLines, mL, top2, gstin ? `GSTIN: ${gstin}` : undefined);
      rightEnd = block("DELIVER TO (WAREHOUSE)", toWarehouseName(data) || "-", toWhLines, mL + half, top2, gstin ? `GSTIN: ${gstin}` : undefined);
    } else {
      leftEnd = block(
        "CONSIGNEE (BILL TO)",
        data.customer_name || "-",
        addressLines(billing),
        mL,
        top2,
        consigneeGstin ? `GSTIN: ${consigneeGstin}` : "GSTIN: Unregistered",
      );
      const shipLines = addressLines(shipping);
      rightEnd = block(
        "SHIP TO",
        data.customer_name || "-",
        shipLines.length ? shipLines : addressLines(billing),
        mL + half,
        top2,
      );
    }
    const box2Bottom = Math.max(leftEnd, rightEnd) + 4;
    doc.setDrawColor(180, 180, 180);
    doc.rect(mL, top2, innerW, box2Bottom - top2);
    doc.line(mL + half, top2, mL + half, box2Bottom);
    y = box2Bottom;

    // ── Transport strip ───────────────────────────────────────────────────
    const transport = [
      `Transporter: ${data.transporter_name || "-"}`,
      `Vehicle No.: ${data.vehicle_number || "-"}`,
      !isTransfer && fromWarehouseName(data) ? `Dispatched from: ${fromWarehouseName(data)}` : null,
    ].filter(Boolean) as string[];
    doc.rect(mL, y, innerW, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    black();
    doc.text(transport.join("     |     "), mL + 8, y + 13, { maxWidth: innerW - 16 });
    y += 30;

    // ── Items (no tax columns — a challan is not a tax invoice; rate/value
    //    columns only on the valued copy) ─────────────────────────────────
    const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0);
    const totalValue = items.reduce(
      (s, it) => s + Number(it.value ?? Number(it.quantity || 0) * Number(it.rate || 0)),
      0,
    );
    const lineValue = (it: any) => it.value ?? Number(it.quantity || 0) * Number(it.rate || 0);
    const head = ["#", "Description of Goods", "HSN", "Qty", "Unit"];
    if (showValues) head.push("Rate", "Value");
    const foot = ["", "Total", "", formatQty(data.total_quantity ?? totalQty), ""];
    if (showValues) foot.push("", money(data.total_value ?? totalValue));
    autoTable(doc, {
      startY: y,
      margin: { left: mL, right: pageW - mR, top: 50, bottom: 60 },
      head: [head],
      body: items.map((it, i) => {
        const row = [
          String(i + 1),
          it.description ? `${it.item_name}\n${it.description}` : it.item_name || "",
          it.hsn_code || "-",
          formatQty(it.quantity),
          it.unit || "",
        ];
        if (showValues) row.push(money(it.rate), money(lineValue(it)));
        return row;
      }),
      foot: [foot],
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 4, lineColor: [180, 180, 180], lineWidth: 0.5, textColor: [25, 25, 25], overflow: "linebreak" },
      headStyles: { fillColor: [240, 240, 240], textColor: [25, 25, 25], fontStyle: "bold" },
      footStyles: { fillColor: [240, 240, 240], textColor: [25, 25, 25], fontStyle: "bold" },
      columnStyles: showValues
        ? {
            0: { cellWidth: 22, halign: "center" },
            2: { cellWidth: 58 },
            3: { cellWidth: 48, halign: "right" },
            4: { cellWidth: 40 },
            5: { cellWidth: 70, halign: "right" },
            6: { cellWidth: 80, halign: "right" },
          }
        : {
            0: { cellWidth: 26, halign: "center" },
            2: { cellWidth: 80 },
            3: { cellWidth: 70, halign: "right" },
            4: { cellWidth: 70 },
          },
      didDrawPage: () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        gray();
        doc.text(`${copyLabel} - ${data.challan_number || ""}`, mL, pageH - 20);
      },
    } as any);

    y = (doc as any).lastAutoTable.finalY + 14;

    // ── Notes, declaration, signatures ────────────────────────────────────
    const needed = 120;
    if (y + needed > pageH - 40) {
      doc.addPage();
      y = 50;
    }
    doc.setFontSize(8.5);
    if (data.notes) {
      doc.setFont("helvetica", "bold");
      black();
      doc.text("Notes:", mL, y);
      doc.setFont("helvetica", "normal");
      const noteLines = doc.splitTextToSize(String(data.notes), innerW - 40);
      doc.text(noteLines, mL + 34, y);
      y += 11 * noteLines.length + 6;
    }
    doc.setFont("helvetica", "italic");
    gray();
    const decl = doc.splitTextToSize(
      `Not a tax invoice. Goods are moved under this delivery challan for: ${reasonLabel(data.reason)}. ` +
        (showValues
          ? "Values are stated for reference only; no GST is charged on this document."
          : "No GST is charged on this document."),
      innerW,
    );
    doc.text(decl, mL, y);
    y += 11 * decl.length + 30;

    doc.setDrawColor(120, 120, 120);
    doc.line(mL, y, mL + 180, y);
    doc.line(mR - 180, y, mR, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    black();
    doc.text("Received by (Consignee signature & date)", mL, y + 12);
    doc.text(`For ${companyName}`, mR, y - 34, { align: "right" });
    doc.text("Authorised Signatory", mR, y + 12, { align: "right" });
  };

  COPIES.forEach((label, i) => {
    if (i > 0) doc.addPage();
    drawCopy(label);
  });

  // Footer on every page
  const total = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    gray();
    doc.text("Not a tax invoice", pageW / 2, pageH - 20, { align: "center" });
    doc.text(`Page ${i} of ${total}`, mR, pageH - 20, { align: "right" });
  }

  doc.save(`delivery-challan-${data.challan_number || data.id}.pdf`);
}
