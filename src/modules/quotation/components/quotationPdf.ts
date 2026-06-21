import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { notification } from "antd";
import { StorageService } from "@/storage";

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

// Convert a Buffer-like object ({ type: "Buffer", data: number[] }) to a base64 data URL
const bufferToImageDataUrl = (logo: any): string | null => {
  if (!logo?.data || !Array.isArray(logo.data) || logo.data.length === 0) {
    return null;
  }
  try {
    const bytes = new Uint8Array(logo.data);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;

    const mime = isPng ? "image/png" : isJpeg ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.error("Failed to convert logo buffer to data URL", e);
    return null;
  }
};

export async function downloadQuotationPDF(
  quotation: any,
  fetchQuotationDetails?: (id: number) => Promise<any>,
): Promise<void> {
  const storageService = new StorageService();

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

    const shippingAddress =
      typeof data.shipping_address_snapshot === "string"
        ? JSON.parse(data.shipping_address_snapshot)
        : data.shipping_address_snapshot || {};

    const businessSnapshot =
      typeof data.business_details_snapshot === "string"
        ? JSON.parse(data.business_details_snapshot)
        : data.business_details_snapshot || {};

    // ─── Company Details (logo, name) from storage ────────────────────────────
    let companyDetails: any = null;
    try {
      const companyDetailsRaw = storageService.getItem(
        StorageService.STORAGE_KEYS.COMPANY_DETAILS,
      );
      if (companyDetailsRaw) {
        companyDetails = JSON.parse(companyDetailsRaw);
      }
    } catch (error) {
      console.error("Failed to parse stored company details", error);
    }

    const companyName =
      companyDetails?.name || businessSnapshot.businessName || "YOUR COMPANY";

    const companyLogoDataUrl = bufferToImageDataUrl(
      companyDetails?.logo || businessSnapshot.logo,
    );

    const billingAddressLines = [
      billingAddress.address_line_1,
      billingAddress.address_line_2,
      [billingAddress.city, billingAddress.state].filter(Boolean).join(", "),
      [billingAddress.country, billingAddress.postal_code]
        .filter(Boolean)
        .join(" - "),
    ].filter(Boolean);

    // Shipping address lines — rendered below the billing address in the
    // address card. Filtered the same way as billingAddressLines so empty
    // fields (e.g. no address_line_2) don't leave blank rows.
    const shippingAddressLines = [
      shippingAddress.address_line_1,
      shippingAddress.address_line_2,
      [shippingAddress.city, shippingAddress.state].filter(Boolean).join(", "),
      [shippingAddress.country, shippingAddress.postal_code]
        .filter(Boolean)
        .join(" - "),
    ].filter(Boolean);
    const hasShippingData = shippingAddressLines.length > 0;

    // Build business detail lines, filtering out undefined/empty entries
    const businessDetailsLines: string[] = [
      businessSnapshot.businessName,
      ...(typeof businessSnapshot.businessAddress === "string"
        ? businessSnapshot.businessAddress
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : []),
      businessSnapshot.businessPhone
        ? `Phone: ${businessSnapshot.businessPhone}`
        : undefined,
      businessSnapshot.businessEmail
        ? `Email: ${businessSnapshot.businessEmail}`
        : undefined,
      businessSnapshot.businessGST
        ? `GST: ${businessSnapshot.businessGST}`
        : undefined,
      ...(Array.isArray(businessSnapshot.businessMeta)
        ? businessSnapshot.businessMeta
            .filter(
              (meta: any) =>
                meta?.key &&
                meta?.value &&
                meta.key !== "undefined" &&
                meta.value !== "undefined",
            )
            .map((meta: any) => `${meta.key}: ${meta.value}`)
        : []),
    ].filter(Boolean) as string[];

    // ─── Footer business info ─────────────────────────────────────────────────
    const businessAddrParts =
      typeof businessSnapshot.businessAddress === "string"
        ? businessSnapshot.businessAddress
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];
    const businessLocation =
      businessAddrParts[businessAddrParts.length - 1] || "";

    const footerEmail =
      businessSnapshot.businessEmail || "sales@yourcompany.com";
    const footerPhone = businessSnapshot.businessPhone || "9999999999";

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
    const LOGO_SIZE = 46;
    const LOGO_Y = 42;
    let textStartX = marginL + 26;

    if (companyLogoDataUrl) {
      try {
        const imgProps = (doc as any).getImageProperties(companyLogoDataUrl);
        const aspect = imgProps.width / imgProps.height;
        const logoH = LOGO_SIZE;
        const logoW = logoH * aspect;
        doc.addImage(
          companyLogoDataUrl,
          imgProps.fileType,
          marginL,
          LOGO_Y,
          logoW,
          logoH,
        );
        textStartX = marginL + logoW + 12;
      } catch (e) {
        console.error("Failed to add company logo to PDF", e);
        doc.setFillColor(30, 30, 30);
        doc.rect(marginL, 38, 18, 18, "F");
        textStartX = marginL + 26;
      }
    } else {
      doc.setFillColor(30, 30, 30);
      doc.rect(marginL, 38, 18, 18, "F");
      textStartX = marginL + 26;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    setBlack();
    doc.text("QUOTATION", marginR, 55, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setBlack();
    doc.text(`QUOTATION NO: ${data.quotation_number || "-"}`, marginR, 80, {
      align: "right",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setGray();
    doc.text(`VALID UNTIL: ${formatDate(data.validity_date)}`, marginR, 96, {
      align: "right",
    });

    // ─── ADDRESS CARD ────────────────────────────────────────────────────────
    const cardTop = 100;
    const LINE_H = 14;
    const TOP_PAD = 22;
    const NAME_H = 20;
    const PHONE_H = data.contact_person_phone ? LINE_H : 0;
    const BOTTOM_PAD = 16;

    // Shipping address block sizing — a small gap, a bold label, then either
    // the address lines or a single "Same as billing address" fallback line.
    const SHIP_GAP = 10;
    const SHIP_LABEL_H = 14;
    const shippingBlockLineCount = hasShippingData
      ? shippingAddressLines.length
      : 1;

    const leftContentH =
      TOP_PAD +
      NAME_H +
      billingAddressLines.length * LINE_H +
      PHONE_H +
      SHIP_GAP +
      SHIP_LABEL_H +
      shippingBlockLineCount * LINE_H +
      BOTTOM_PAD;

    const rightContentH =
      TOP_PAD +
      NAME_H +
      (businessDetailsLines.length - 1) * LINE_H +
      BOTTOM_PAD;

    const cardH = Math.max(leftContentH, rightContentH, 100);
    const midX = pageWidth / 2;
    const col1 = marginL + 18;
    const col2 = midX + 10;
    const maxColWidth = midX - marginL - 28;

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(marginL, cardTop, pageWidth - 90, cardH, 4, 4, "F");

    // ── Left: Customer (Billing + Shipping) ───────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setGray();
    doc.text("QUOTATION TO", col1, cardTop + 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setBlack();
    doc.text((data.customer_name || "-").toUpperCase(), col1, cardTop + 40);

    // Customer number — printed directly below the customer name (was
    // previously shown after the full billing address instead).
    const NAME_TO_CONTENT_GAP = 17;
    let addrY = cardTop + 40 + NAME_TO_CONTENT_GAP;

    if (data.contact_person_phone) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setGray();
      doc.text(`Customer No: ${data.contact_person_phone}`, col1, addrY);
      addrY += LINE_H;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setBlack();
    billingAddressLines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, maxColWidth);
      wrapped.forEach((wl: string) => {
        doc.text(wl, col1, addrY);
        addrY += LINE_H;
      });
    });

    // ── Shipping Address (below billing) ──────────────────────────────────────
    addrY += SHIP_GAP;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setGray();
    doc.text("SHIPPING ADDRESS", col1, addrY);
    addrY += SHIP_LABEL_H;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (hasShippingData) {
      setBlack();
      shippingAddressLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, maxColWidth);
        wrapped.forEach((wl: string) => {
          doc.text(wl, col1, addrY);
          addrY += LINE_H;
        });
      });
    } else {
      setGray();
      doc.text("Same as billing address", col1, addrY);
      addrY += LINE_H;
    }

    // ── Divider ──────────────────────────────────────────────────────────────
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.5);
    doc.line(midX, cardTop + 12, midX, cardTop + cardH - 12);

    // ── Right: Business Details ───────────────────────────────────────────────
    let detY = cardTop + 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setGray();
    doc.text("BUSINESS DETAILS", col2, detY);
    detY += 18;

    businessDetailsLines.forEach((line, idx) => {
      if (idx === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        setBlack();
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setBlack();
      }
      const wrapped = doc.splitTextToSize(line, maxColWidth);
      wrapped.forEach((wl: string) => {
        doc.text(wl, col2, detY);
        detY += LINE_H;
      });
    });

    // ─── ITEMS TABLE ─────────────────────────────────────────────────────────
    const metaY = cardTop + cardH + 28;
    hLine(metaY - 6);

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

    // Shared column definitions so head & body align perfectly
    const tableColumnStyles = {
      0: { cellWidth: 26, halign: "left" as const },
      1: { cellWidth: "auto" as const, halign: "left" as const },
      2: { cellWidth: 60, halign: "center" as const },
      3: { cellWidth: 45, halign: "center" as const },
      4: { cellWidth: 75, halign: "right" as const },
      5: { cellWidth: 75, halign: "right" as const },
      6: { cellWidth: 75, halign: "right" as const },
    };

    autoTable(doc, {
      startY: metaY + 18,
      margin: { left: marginL, right: 45 },
      head: [
        ["NO", "ITEM DESCRIPTION", "HSN", "QTY", "PRICE", "DISCOUNT", "TOTAL"],
      ],
      body: rows,
      theme: "plain",
      tableWidth: marginR - marginL,
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
      columnStyles: tableColumnStyles,
      didParseCell: (data: any) => {
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
    } as any);

    // ─── SUMMARY SECTION ─────────────────────────────────────────────────────
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    hLine(finalY, marginL, marginR, false);
    finalY += 20;

    // How much vertical room the summary block (Subtotal → Grand Total)
    // and the footer below it actually need, derived from the same
    // constants used to draw them further down — not a guessed number.
    // This is what makes the page-break decision correct no matter how
    // many items push the table further down the page: with few items
    // `finalY` stays small and this check is a no-op; with many items (or
    // items spilling onto a later page), `finalY` grows and this reliably
    // forces the summary onto a fresh page instead of letting it collide
    // with the footer.
    const SUMMARY_ROW_H = 17;
    const SUMMARY_ROWS_COUNT = 6; // Subtotal, Discount, CGST, SGST, IGST, Transport
    const SUMMARY_DIVIDER_GAP = 14;
    const GRAND_TOTAL_ROW_H = 20; // grand total line + breathing room
    const FOOTER_HEIGHT = 145; // matches `footerTop = pageHeight - 145` below
    const SAFETY_BUFFER = 20;

    const SUMMARY_BLOCK_HEIGHT =
      SUMMARY_ROWS_COUNT * SUMMARY_ROW_H + SUMMARY_DIVIDER_GAP + GRAND_TOTAL_ROW_H;

    const BOTTOM_MARGIN = SUMMARY_BLOCK_HEIGHT + FOOTER_HEIGHT + SAFETY_BUFFER;

    if (finalY + BOTTOM_MARGIN > pageHeight) {
      doc.addPage();
      drawPageBase();
      finalY = 50;
    }

    // ── Total Amount — gray highlighted rectangle ─────────────────────────────
    const totalBoxW = 190;
    const totalBoxH = 58;
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(marginL, finalY - 8, totalBoxW, totalBoxH, 4, 4, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setGray();
    doc.text("TOTAL AMOUNT", marginL + 12, finalY + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    setBlack();
    doc.text(formatCurrency(data.grand_total), marginL + 12, finalY + 36);

    // ── Summary table — right side ────────────────────────────────────────────
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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setBlack();
    doc.text("Payment Info:", marginL, footerTop + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setGray();
    const paymentSnapshotRaw = data.payment_details_snapshot;
    const paymentSnapshot = paymentSnapshotRaw
      ? typeof paymentSnapshotRaw === "string"
        ? (JSON.parse(paymentSnapshotRaw) as any)
        : paymentSnapshotRaw
      : {};

    const paymentLines: string[] = [];

    if (paymentSnapshot && Object.keys(paymentSnapshot).length > 0) {
      if (paymentSnapshot.bank_name)
        paymentLines.push(`${paymentSnapshot.bank_name}`);
      if (paymentSnapshot.account_holder_name)
        paymentLines.push(
          `Account Holder: ${paymentSnapshot.account_holder_name}`,
        );
      if (paymentSnapshot.account_number)
        paymentLines.push(`Account #: ${paymentSnapshot.account_number}`);
      if (paymentSnapshot.ifsc_code)
        paymentLines.push(`IFSC: ${paymentSnapshot.ifsc_code}`);
      if (paymentSnapshot.branch_name)
        paymentLines.push(`Branch: ${paymentSnapshot.branch_name}`);
    } else {
      paymentLines.push(`Account: ${data.customer_name || "-"}`);
    }

    paymentLines.forEach((line, i) => {
      doc.text(line, marginL, footerTop + 34 + i * 14);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setBlack();
    doc.text("Terms & Conditions:", pageWidth / 2 - 40, footerTop + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setGray();
    const termsText = doc.splitTextToSize(
      data.notes ||
        companyDetails?.default_terms_conditions ||
        "Payment due within 30 days of quotation date.",
      160,
    );
    doc.text(termsText, pageWidth / 2 - 40, footerTop + 34);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setBlack();
    doc.text("Authorized Signature", marginR, footerTop + 18, {
      align: "right",
    });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(15);
    setGray();
    doc.text(companyName || "Your Company", marginR, footerTop + 50, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setBlack();
    doc.text("AUTHORIZED SIGNATORY", marginR, footerTop + 65, {
      align: "right",
    });

    hLine(pageHeight - 42, marginL, marginR, true);

    // ── Bottom strip — business email, phone, location ────────────────────────
    const footerLocation = businessLocation || "Pune, Maharashtra";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setGray();
    doc.text(
      `Questions? Email us at ${footerEmail}  |  Call: ${footerPhone}  |  ${footerLocation}`,
      pageWidth / 2,
      pageHeight - 28,
      { align: "center" },
    );

    // ─── PAGE NUMBERS ─────────────────────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setGray();
      doc.text(`Page ${i} of ${totalPages}`, marginR, pageHeight - 14, {
        align: "right",
      });
    }

    doc.save(`quotation-${data.quotation_number}.pdf`);
  } catch (error: any) {
    notification.error({
      message: "Download Failed",
      description: error?.message || "Unable to generate quotation PDF",
    });
  }
}