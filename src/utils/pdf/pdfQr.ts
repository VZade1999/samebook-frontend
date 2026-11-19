import type { jsPDF } from "jspdf";
import QRCode from "qrcode";

type RGB = [number, number, number];

/**
 * Draws a QR code as vector squares (crisp at any zoom or print size), with
 * the white quiet zone scanners need around it. `size` includes that zone.
 */
export const drawQr = (doc: jsPDF, text: string, x: number, y: number, size: number, color: RGB = [15, 23, 42]) => {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 2;
  const cell = size / (n + quiet * 2);
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, size, size, "F");
  doc.setFillColor(color[0], color[1], color[2]);
  // One rectangle per run of dark modules in a row (fewer seams, smaller file);
  // a hair of overlap so no white lines show between neighbours.
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) {
        c++;
        continue;
      }
      let end = c;
      while (end < n && qr.modules.get(r, end)) end++;
      doc.rect(x + (quiet + c) * cell, y + (quiet + r) * cell, (end - c) * cell + 0.06, cell + 0.06, "F");
      c = end;
    }
  }
};

/** Where the QR code on every document leads: the SameBook landing page. */
export const promoUrl = (kind: string) => {
  let configured = "";
  try {
    // Set REACT_APP_PUBLIC_SITE_URL when documents are made on a different site
    // than the landing page; otherwise the site the PDF was made on is used.
    configured = String(process.env.REACT_APP_PUBLIC_SITE_URL || "");
  } catch {
    configured = "";
  }
  const base = (configured || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/+$/, "");
  return `${base}/?ref=pdf-${kind}`;
};
