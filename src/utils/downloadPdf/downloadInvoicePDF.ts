import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { notification } from "antd";
import { StorageService } from "@/storage";
import { getTrail } from "@/modules/document-links/documentLinksService";
import type { Trail } from "@/modules/document-links/types";

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

/** Indian document style for references: 18-Nov-2026. */
const refDate = (date: string | null | undefined) => {
  if (!date) return "";
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `${String(d.getDate()).padStart(2, "0")}-${m}-${d.getFullYear()}`;
};
const withDate = (no: string, date?: string | null) => (date ? `${no} dt. ${refDate(date)}` : no);
const uniq = (list: (string | null | undefined)[]) => [...new Set(list.map((s) => (s || "").trim()).filter(Boolean))];

/** GST Rule 48: an invoice for goods is made in triplicate. */
export const INVOICE_COPIES = ["ORIGINAL FOR RECIPIENT", "DUPLICATE FOR TRANSPORTER", "TRIPLICATE FOR SUPPLIER"] as const;

export interface InvoicePdfOptions {
  /** "original" (default — the copy you email) or all three copies for printing. */
  copies?: "original" | "all";
}

// Normalizes a company logo into a data URL, regardless of which backend
// endpoint produced it: login returns a raw Buffer (serialized as
// { type: "Buffer", data: number[] }), while GET /companies/:id already
// pre-encodes it as a "data:image/...;base64,..." string.
const bufferToImageDataUrl = (logo: any): string | null => {
  if (!logo) return null;

  if (typeof logo === "string") {
    if (logo.startsWith("data:image")) return logo;
    // Plain base64 without a data: prefix — wrap it.
    return logo.length > 0 ? `data:image/png;base64,${logo}` : null;
  }

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

export async function downloadInvoicePDF(
  invoice: any,
  fetchInvoiceDetails?: (id: number) => Promise<any>,
  options: InvoicePdfOptions = {},
): Promise<void> {
  const storageService = new StorageService();

  try {
    const data =
      invoice.items?.length > 0
        ? invoice
        : await fetchInvoiceDetails?.(invoice.id).then(
            (res) => res?.data?.data || invoice,
          );

    // The linked documents: the customer's PO, the quotation, the delivery
    // challans with their vehicle / e-way bill, and the place of supply. If
    // they can't be loaded the invoice still prints, without these boxes.
    let trail: Trail | null = null;
    try {
      trail = data?.id ? await getTrail("invoice", Number(data.id)) : null;
    } catch (e) {
      console.warn("Invoice PDF: linked documents not loaded", e);
    }

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
    // Same address twice prints once ("Same as billing address").
    const sameAsBilling = shippingAddressLines.join("|").toLowerCase() === billingAddressLines.join("|").toLowerCase();
    const hasShippingData = shippingAddressLines.length > 0 && !sameAsBilling;

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

    // ─── Reference boxes (the standard Indian invoice header) ─────────────────
    const refs = trail?.references;
    const pos = trail?.place_of_supply;
    const placeOfSupply = pos
      ? `${pos.state}${pos.code ? ` (${pos.code})` : ""}`
      : shippingAddress.state || billingAddress.state || "-";
    const challans = refs?.challans || [];
    // The invoice's own dispatch details (when it travels with the goods),
    // then those of the challans it bills.
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
    const dispatchLines = [
      vehicles.length ? `Vehicle: ${vehicles.join(", ")}` : null,
      transporters.length ? `Transporter: ${transporters.join(", ")}` : null,
      lrs.length ? `LR No.: ${lrs.join(", ")}` : null,
      eways.length ? `E-way bill: ${eways.join(", ")}` : null,
    ].filter(Boolean) as string[];
    // One invoice can bill several quotations (monthly billing): print them all.
    const buyerOrders = refs?.pos?.length ? refs.pos : refs?.po ? [refs.po] : [];
    const quotationRefs = refs?.quotations?.length ? refs.quotations : refs?.quotation ? [refs.quotation] : [];
    const refRow1: [string, string][] = [
      [
        buyerOrders.length > 1 ? "BUYER'S ORDER NOS. & DATES" : "BUYER'S ORDER NO. & DATE",
        buyerOrders.map((p) => withDate(p.number, p.date)).join(", ") || "-",
      ],
      [
        quotationRefs.length > 1 ? "QUOTATION NOS. & DATES" : "QUOTATION NO. & DATE",
        quotationRefs.map((q) => withDate(q.number, q.date)).join(", ") || data.quotation_number || "-",
      ],
      ["PLACE OF SUPPLY", placeOfSupply],
    ];
    const refRow2: [string, string, number][] = challans.length
      ? [
          ["DELIVERY CHALLAN NO(S). & DATE(S)", challans.map((c) => withDate(c.number, c.date)).join(", "), 2],
          ["DISPATCH DETAILS", dispatchLines.join("\n") || "-", 1],
        ]
      : dispatchLines.length
        ? // No challan: the invoice itself travels with the goods.
          [["DISPATCH DETAILS", dispatchLines.join("   ·   "), 3]]
        : [];

    // ─── Footer business info ─────────────────────────────────────────────────
    const businessAddrParts =
      typeof businessSnapshot.businessAddress === "string"
        ? businessSnapshot.businessAddress
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];
    const businessLocation = businessAddrParts[businessAddrParts.length - 1] || "";

    const footerEmail = businessSnapshot.businessEmail || "sales@yourcompany.com";
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

    // The copy's name in a small box, top right of every page of that copy.
    const drawCopyTag = (label: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const w = doc.getTextWidth(label) + 14;
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.6);
      doc.roundedRect(marginR - w, 12, w, 15, 3, 3, "S");
      setGray();
      doc.text(label, marginR - w / 2, 22.5, { align: "center" });
    };

    // Label/value cells in a bordered grid; returns the height used.
    const drawRefRow = (top: number, cells: [string, string, number][], dryRun = false) => {
      const totalW = marginR - marginL;
      const unit = totalW / 3;
      const PAD = 8;
      const LABEL_H = 11;
      const LINE = 11.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const wrapped = cells.map(([, value, span]) => doc.splitTextToSize(value, unit * span - PAD * 2) as string[]);
      const rowH = PAD + LABEL_H + Math.max(...wrapped.map((w) => w.length)) * LINE + PAD - 3;
      if (dryRun) return rowH;
      let x = marginL;
      cells.forEach(([label, , span], i) => {
        const w = unit * span;
        if (i > 0) {
          doc.setDrawColor(210, 210, 210);
          doc.setLineWidth(0.5);
          doc.line(x, top + 6, x, top + rowH - 6);
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        setGray();
        doc.text(label, x + PAD, top + PAD + 7);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        setBlack();
        wrapped[i].forEach((line, j) => doc.text(line, x + PAD, top + PAD + LABEL_H + 8 + j * LINE));
        x += w;
      });
      return rowH;
    };

    const copies = options.copies === "all" ? [...INVOICE_COPIES] : [INVOICE_COPIES[0]];
    const copyPages: [number, number][] = [];

    const renderCopy = (copyLabel: string) => {
      const pageBase = () => {
        drawPageBase();
        drawCopyTag(copyLabel);
      };

      // ─── PAGE 1 BASE ─────────────────────────────────────────────────────────
      pageBase();

      // ─── HEADER ──────────────────────────────────────────────────────────────
      const LOGO_SIZE = 46;
      const LOGO_Y = 42;

      if (companyLogoDataUrl) {
        try {
          const imgProps = (doc as any).getImageProperties(companyLogoDataUrl);
          const aspect = imgProps.width / imgProps.height;
          const logoH = LOGO_SIZE;
          const logoW = logoH * aspect;
          doc.addImage(companyLogoDataUrl, imgProps.fileType, marginL, LOGO_Y, logoW, logoH);
        } catch (e) {
          console.error("Failed to add company logo to PDF", e);
          doc.setFillColor(30, 30, 30);
          doc.rect(marginL, 38, 18, 18, "F");
        }
      } else {
        doc.setFillColor(30, 30, 30);
        doc.rect(marginL, 38, 18, 18, "F");
      }

      // ── "TAX INVOICE" title (mirrors "QUOTATION" in the quotation PDF) ────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(30);
      setBlack();
      doc.text("TAX INVOICE", marginR, 55, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setBlack();
      doc.text(`INVOICE NO: ${data.invoice_number || "-"}`, marginR, 80, {
        align: "right",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setGray();
      doc.text(`INVOICE DATE: ${formatDate(data.invoice_date)}`, marginR, 96, {
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
      const midX = pageWidth / 2;
      const col1 = marginL + 18;
      const col2 = midX + 10;
      const maxColWidth = midX - marginL - 28;

      // Count lines as printed (long lines wrap), so the card always fits them.
      const wrappedCount = (lines: string[], size: number, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        return lines.reduce((n, l) => n + (doc.splitTextToSize(l, maxColWidth) as string[]).length, 0);
      };
      const billingLineCount = wrappedCount(billingAddressLines, 9);
      const shippingBlockLineCount = hasShippingData ? wrappedCount(shippingAddressLines, 9) : 1;
      const businessLineCount =
        (businessDetailsLines.length ? wrappedCount(businessDetailsLines.slice(0, 1), 11, true) : 0) + wrappedCount(businessDetailsLines.slice(1), 9);

      const leftContentH =
        TOP_PAD +
        NAME_H +
        billingLineCount * LINE_H +
        PHONE_H +
        SHIP_GAP +
        SHIP_LABEL_H +
        shippingBlockLineCount * LINE_H +
        BOTTOM_PAD;

      const rightContentH =
        TOP_PAD + NAME_H + Math.max(0, businessLineCount - 1) * LINE_H + BOTTOM_PAD;

      const cardH = Math.max(leftContentH, rightContentH, 100);

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(marginL, cardTop, pageWidth - 90, cardH, 4, 4, "F");

      // ── Left: Customer (Billing + Shipping) ───────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setGray();
      doc.text("BILL TO", col1, cardTop + 22);

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

      // ─── REFERENCES: buyer's order, quotation, challans, dispatch ─────────────
      const refTop = cardTop + cardH + 12;
      const row1Cells = refRow1.map(([l, v]) => [l, v, 1] as [string, string, number]);
      const row1H = drawRefRow(refTop, row1Cells, true);
      const row2H = refRow2.length ? drawRefRow(refTop + row1H, refRow2, true) : 0;
      const refH = row1H + row2H;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.6);
      doc.roundedRect(marginL, refTop, marginR - marginL, refH, 4, 4, "S");
      drawRefRow(refTop, row1Cells);
      if (row2H) {
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.5);
        doc.line(marginL, refTop + row1H, marginR, refTop + row1H);
        drawRefRow(refTop + row1H, refRow2);
      }

      // ─── ITEMS TABLE ─────────────────────────────────────────────────────────
      // (The reference box's border separates it from the table.)
      const metaY = refTop + refH + 4;

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
        startY: metaY + 12,
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
        // Runs before the table draws on a new page: white page + the copy's tag.
        willDrawPage: (hook: any) => {
          if (hook.pageNumber > 1) pageBase();
        },
      } as any);

      // ─── SUMMARY SECTION ─────────────────────────────────────────────────────
      let finalY = (doc as any).lastAutoTable.finalY + 10;

      hLine(finalY, marginL, marginR, false);
      finalY += 20;

      // How much vertical room the summary block (Subtotal → Grand Total →
      // Paid → Balance) and the footer below it actually need, derived from
      // the same constants used to draw them further down — not a guessed
      // number. With many items (or items spilling onto a later page),
      // `finalY` grows and this reliably forces the summary onto a fresh
      // page instead of letting it collide with the footer.
      const SUMMARY_ROW_H = 17;
      const SUMMARY_ROWS_COUNT = 6; // Subtotal, Discount, CGST, SGST, IGST, Transport
      const SUMMARY_DIVIDER_GAP = 14;
      const GRAND_TOTAL_ROW_H = 20; // grand total line + breathing room
      const EXTRA_ROWS_COUNT = 2; // Paid Amount, Balance Amount (invoice-only)
      const FOOTER_HEIGHT = 145; // matches `footerTop = pageHeight - 145` below
      const SAFETY_BUFFER = 20;

      const SUMMARY_BLOCK_HEIGHT =
        SUMMARY_ROWS_COUNT * SUMMARY_ROW_H +
        SUMMARY_DIVIDER_GAP +
        GRAND_TOTAL_ROW_H +
        EXTRA_ROWS_COUNT * SUMMARY_ROW_H;

      const BOTTOM_MARGIN = SUMMARY_BLOCK_HEIGHT + FOOTER_HEIGHT + SAFETY_BUFFER;

      if (finalY + BOTTOM_MARGIN > pageHeight) {
        doc.addPage();
        pageBase();
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
      doc.text("GRAND TOTAL", marginL + 12, finalY + 8);

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

      // ── Paid / Balance rows (invoice-specific, below grand total) ─────────────
      sumY += 17;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setGray();
      doc.text("PAID AMOUNT:", sumLabelX, sumY);
      setBlack();
      doc.text(formatCurrency(data.paid_amount), sumValueX, sumY, { align: "right" });

      sumY += 17;
      setGray();
      doc.text("BALANCE AMOUNT:", sumLabelX, sumY);
      setBlack();
      doc.text(formatCurrency(data.balance_amount), sumValueX, sumY, { align: "right" });

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
        if (paymentSnapshot.bank_name) paymentLines.push(`${paymentSnapshot.bank_name}`);
        if (paymentSnapshot.account_holder_name) paymentLines.push(`Account Holder: ${paymentSnapshot.account_holder_name}`);
        if (paymentSnapshot.account_number) paymentLines.push(`Account #: ${paymentSnapshot.account_number}`);
        if (paymentSnapshot.ifsc_code) paymentLines.push(`IFSC: ${paymentSnapshot.ifsc_code}`);
        if (paymentSnapshot.branch_name) paymentLines.push(`Branch: ${paymentSnapshot.branch_name}`);
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
        data.notes || companyDetails?.default_terms_conditions || "Payment due within 30 days of invoice date.",
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
    };

    copies.forEach((label, i) => {
      if (i > 0) doc.addPage();
      const first = (doc as any).internal.getNumberOfPages();
      renderCopy(label);
      copyPages.push([first, (doc as any).internal.getNumberOfPages()]);
    });

    // ─── PAGE NUMBERS (counted within each copy) ──────────────────────────────
    copyPages.forEach(([first, last]) => {
      const n = last - first + 1;
      for (let p = first; p <= last; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setGray();
        doc.text(`Page ${p - first + 1} of ${n}`, marginR, pageHeight - 14, {
          align: "right",
        });
      }
    });

    doc.save(`invoice-${data.invoice_number}${options.copies === "all" ? "-3-copies" : ""}.pdf`);
  } catch (error: any) {
    notification.error({
      title: "Download Failed",
      description: error?.message || "Unable to generate invoice PDF",
    });
  }
}
