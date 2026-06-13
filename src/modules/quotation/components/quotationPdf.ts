import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { notification } from "antd";

const formatCurrency = (value: any) => {
  return `Rs.${Number(value || 0).toFixed(2)}`;
};

const formatDate = (date: string) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export async function downloadQuotationPDF(
  quotation: any,
  fetchQuotationDetails?: (id: number) => Promise<any>,
): Promise<void> {
  try {
    const data =
      quotation.items?.length > 0
        ? quotation
        : await fetchQuotationDetails?.(quotation.id).then(
            (res) => res?.data?.data || quotation,
          );

    const billingAddress =
      typeof data.billing_address_snapshot === "string"
        ? JSON.parse(data.billing_address_snapshot)
        : data.billing_address_snapshot || {};

    const billingAddressLines = [
      billingAddress.address_line_1,
      billingAddress.address_line_2,
      [billingAddress.city, billingAddress.state].filter(Boolean).join(", "),
      [billingAddress.country, billingAddress.postal_code]
        .filter(Boolean)
        .join(" - "),
    ].filter(Boolean);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginL = 45;
    const marginR = pageWidth - 45;

    // ─── helpers ──────────────────────────────────────────────────────────────
    const drawPageBase = () => {
      // White background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
    };

    const setBlack = () => doc.setTextColor(30, 30, 30);
    const setGray = () => doc.setTextColor(120, 120, 120);
    const hLine = (y: number, x1 = marginL, x2 = marginR, gray = false) => {
      doc.setDrawColor(gray ? 200 : 30, gray ? 200 : 30, gray ? 200 : 30);
      doc.setLineWidth(gray ? 0.4 : 0.8);
      doc.line(x1, y, x2, y);
    };

    // ─── PAGE 1 BASE ─────────────────────────────────────────────────────────
    drawPageBase();

    // ─── HEADER ──────────────────────────────────────────────────────────────
    // Company logo placeholder (small black square like in the design)
    doc.setFillColor(30, 30, 30);
    doc.rect(marginL, 38, 18, 18, "F");

    // Company name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    setBlack();
    doc.text("YOUR COMPANY", marginL + 26, 49);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setGray();
    doc.text("Your slogan or tagline here", marginL + 26, 60);

    // "QUOTATION" title – top right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    setBlack();
    doc.text("QUOTATION", marginR, 55, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setGray();
    doc.text(
      `DATE. ${formatDate(data.quotation_date)}`,
      marginR,
      70,
      { align: "right" },
    );

    // ─── ADDRESS CARD ────────────────────────────────────────────────────────
    const cardTop = 100;
    const cardH = 130;
    const midX = pageWidth / 2;

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(marginL, cardTop, pageWidth - 90, cardH, 4, 4, "F");

    const col1 = marginL + 18;
    const col2 = midX + 10;

    // LEFT – Bill To
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setGray();
    doc.text("QUOTATION TO", col1, cardTop + 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setBlack();
    doc.text((data.customer_name || "-").toUpperCase(), col1, cardTop + 40);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setBlack();
    let addrY = cardTop + 57;
    billingAddressLines.forEach((line) => {
      doc.text(line, col1, addrY);
      addrY += 14;
    });
    if (data.contact_person_phone) {
      doc.text(`(${data.contact_person_phone})`, col1, addrY);
    }

    // Divider
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.5);
    doc.line(midX, cardTop + 12, midX, cardTop + cardH - 12);

    // RIGHT – Ship To / Quotation Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setGray();
    doc.text("QUOTATION DETAILS", col2, cardTop + 22);

    const detailsData = [
      ["Quotation No", data.quotation_number || "-"],
      ["Date", formatDate(data.quotation_date)],
      ["Valid Until", formatDate(data.validity_date)],
      ["Status", data.status || "-"],
      ["Total Items", String(data.items?.length || 0)],
    ];

    let detY = cardTop + 40;
    detailsData.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setBlack();
      doc.text(label, col2, detY);
      doc.setFont("helvetica", "normal");
      setGray();
      doc.text(String(value), col2 + 90, detY);
      detY += 16;
    });

    // ─── DATE + INVOICE NO ROW ───────────────────────────────────────────────
    const metaY = cardTop + cardH + 28;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setGray();
    doc.text(`DATE: ${formatDate(data.quotation_date).toUpperCase()}`, marginL, metaY);

    doc.setFont("helvetica", "bold");
    setBlack();
    doc.text(
      `QUOTATION NO: ${data.quotation_number || ""}`,
      marginR,
      metaY,
      { align: "right" },
    );

    hLine(metaY + 8);

    // ─── ITEMS TABLE ─────────────────────────────────────────────────────────
    const rows =
      data.items?.map((item: any, index: number) => [
        `${index + 1}.`,
        item.product_name || "",
        item.hsn_code || "-",
        Number(item.qty || 0).toFixed(2),
        formatCurrency(item.rate),
        formatCurrency(item.discount_amount),
        formatCurrency(item.total),
      ]) || [];

    autoTable(doc, {
      startY: metaY + 18,
      margin: { left: marginL, right: 45 },
      head: [["NO", "ITEM DESCRIPTION", "HSN", "QTY", "PRICE", "DISCOUNT", "TOTAL"]],
      body: rows,
      theme: "plain",
      headStyles: {
        fillColor: false,
        textColor: [30, 30, 30],
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
      },
      bodyStyles: {
        fillColor: false,
        textColor: [30, 30, 30],
        fontSize: 9,
        cellPadding: { top: 8, bottom: 8, left: 4, right: 4 },
      },
      alternateRowStyles: {
        fillColor: false,
      },
      columnStyles: {
        0: { cellWidth: 26 },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
      },
      // Top border below header only, and bottom border at end
      didParseCell: (data) => {
        if (data.row.section === "head") {
          data.cell.styles.lineWidth = { bottom: 0.8 };
          data.cell.styles.lineColor = [30, 30, 30];
        } else {
          data.cell.styles.lineWidth = { bottom: 0.3 };
          data.cell.styles.lineColor = [200, 200, 200];
        }
      },
      didAddPage: () => {
        drawPageBase();
      },
    });

    // ─── SUMMARY SECTION ─────────────────────────────────────────────────────
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    hLine(finalY, marginL, marginR, false);
    finalY += 20;

    const BOTTOM_MARGIN = 190;
    if (finalY + BOTTOM_MARGIN > pageHeight) {
      doc.addPage();
      drawPageBase();
      finalY = 50;
    }

    // Grand total – left (big display)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setBlack();
    doc.text("TOTAL AMOUNT", marginL, finalY + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    setBlack();
    doc.text(formatCurrency(data.grand_total), marginL, finalY + 46);

    // Summary table – right side
    const summaryRows: [string, any][] = [
      ["SUBTOTAL:", data.sub_total],
      [`DISCOUNT (${data.discount_percent || 0}%):`, data.discount_amount],
      [`CGST (${data.cgst_percent || 0}%):`, data.cgst_amount],
      [`SGST (${data.sgst_percent || 0}%):`, data.sgst_amount],
      [`IGST (${data.igst_percent || 0}%):`, data.igst_amount],
      ["TRANSPORT:", data.transport_charges],
    ];

    const sumLabelX = pageWidth - 220;
    const sumValueX = marginR;
    let sumY = finalY + 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    summaryRows.forEach(([label, value]) => {
      setGray();
      doc.text(label, sumLabelX, sumY);
      setBlack();
      doc.text(formatCurrency(value), sumValueX, sumY, { align: "right" });
      sumY += 17;
    });

    // Grand total row
    hLine(sumY + 2, sumLabelX, sumValueX, false);
    sumY += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setBlack();
    doc.text("GRAND TOTAL:", sumLabelX, sumY);
    doc.text(formatCurrency(data.grand_total), sumValueX, sumY, {
      align: "right",
    });

    // ─── FOOTER CONTENT ──────────────────────────────────────────────────────
    const footerTop = pageHeight - 145;
    hLine(footerTop, marginL, marginR, true);

    // Payment Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setBlack();
    doc.text("Payment Info:", marginL, footerTop + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setGray();
    const paymentLines = [
      `Account: ${data.customer_name || "-"}`,
      `GST No: ${data.customer_gst_number || "N/A"}`,
      `Email: ${data.contact_person_email || "-"}`,
    ];
    paymentLines.forEach((line, i) => {
      doc.text(line, marginL, footerTop + 34 + i * 14);
    });

    // Terms
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setBlack();
    doc.text("Terms & Conditions:", pageWidth / 2 - 40, footerTop + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setGray();
    const termsText = doc.splitTextToSize(
      data.notes || "Payment due within 30 days of quotation date.",
      160,
    );
    doc.text(termsText, pageWidth / 2 - 40, footerTop + 34);

    // Authorized Signature
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setBlack();
    doc.text("Authorized Signature", marginR, footerTop + 18, { align: "right" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(15);
    setGray();
    doc.text("Your Company", marginR, footerTop + 50, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setBlack();
    doc.text("AUTHORIZED SIGNATORY", marginR, footerTop + 65, { align: "right" });

    // Bottom strip
    hLine(pageHeight - 42, marginL, marginR, true);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setGray();
    doc.text(
      "Questions? Email us at sales@yourcompany.com  |  Call: 9999999999  |  Pune, Maharashtra",
      pageWidth / 2,
      pageHeight - 28,
      { align: "center" },
    );

    // ─── FOOTER ON EVERY PAGE ─────────────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setGray();
      doc.text(
        `Page ${i} of ${totalPages}`,
        marginR,
        pageHeight - 14,
        { align: "right" },
      );
    }

    // ─── SAVE ─────────────────────────────────────────────────────────────────
    doc.save(`quotation-${data.quotation_number}.pdf`);
  } catch (error: any) {
    notification.error({
      message: "Download Failed",
      description: error?.message || "Unable to generate quotation PDF",
    });
  }
}