// SameBook document kit: one design shared by the quotation, delivery challan
// and tax invoice PDFs — the Poppins font (with a real ₹ sign), a colour per
// document, a letterhead band with the seller's identity, a key-facts card,
// customer cards, a references grid, a styled items table, a totals card with
// the amount in words, bank / terms / signature, and on every page a footer
// with page numbers and a small SameBook QR code to the landing page.
//
// A4 portrait, points. White pages with colour only in small areas, so the
// documents print well in black and white too.

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import regularUrl from "@/assets/fonts/poppins/Poppins-Regular.ttf?url";
import mediumUrl from "@/assets/fonts/poppins/Poppins-Medium.ttf?url";
import semiboldUrl from "@/assets/fonts/poppins/Poppins-SemiBold.ttf?url";
import boldUrl from "@/assets/fonts/poppins/Poppins-Bold.ttf?url";
import { drawQr, promoUrl } from "./pdfQr";
import { amount, amountInWords, initials, money } from "./pdfFormat";
import { loadCompanySignature } from "@/modules/companies/signature/signatureStore";

export type RGB = [number, number, number];
export type DocKind = "quotation" | "invoice" | "challan";
export type Weight = "regular" | "medium" | "semibold" | "bold";

export const INK: RGB = [15, 23, 42];
export const TEXT: RGB = [51, 65, 85];
export const MUTED: RGB = [100, 116, 139];
export const FAINT: RGB = [148, 163, 184];
export const LINE: RGB = [226, 232, 240];
export const PANEL: RGB = [248, 250, 252];
export const WHITE: RGB = [255, 255, 255];
export const GOOD: RGB = [4, 120, 87];
export const BAD: RGB = [185, 28, 28];

interface Theme {
  primary: RGB;
  deep: RGB;
  soft: RGB;
  tint: RGB;
  grad: [RGB, RGB];
}
const THEMES: Record<DocKind, Theme> = {
  quotation: { primary: [79, 70, 229], deep: [55, 48, 163], soft: [238, 242, 255], tint: [199, 210, 254], grad: [[79, 70, 229], [139, 92, 246]] },
  invoice: { primary: [15, 118, 110], deep: [17, 94, 89], soft: [240, 253, 250], tint: [153, 246, 228], grad: [[15, 118, 110], [45, 212, 191]] },
  challan: { primary: [194, 65, 12], deep: [154, 52, 18], soft: [255, 247, 237], tint: [254, 215, 170], grad: [[194, 65, 12], [245, 158, 11]] },
};

// ── Fonts ───────────────────────────────────────────────────────────────────
const FONT_FILES = [
  { url: regularUrl, file: "Poppins-Regular.ttf", family: "Poppins", style: "normal" },
  { url: boldUrl, file: "Poppins-Bold.ttf", family: "Poppins", style: "bold" },
  { url: mediumUrl, file: "Poppins-Medium.ttf", family: "PoppinsMedium", style: "normal" },
  { url: semiboldUrl, file: "Poppins-SemiBold.ttf", family: "PoppinsSemiBold", style: "normal" },
];
type LoadedFont = (typeof FONT_FILES)[number] & { data: string };
let fontsPromise: Promise<LoadedFont[] | null> | null = null;

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Fetched once per session; null (built-in Helvetica, "Rs.") if they can't be loaded. */
const loadFonts = () => {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_FILES.map(async (f) => {
        const res = await fetch(f.url);
        if (!res.ok) throw new Error(`${f.file}: ${res.status}`);
        return { ...f, data: toBase64(await res.arrayBuffer()) };
      }),
    ).catch((e) => {
      console.warn("PDF fonts not loaded — using the built-in font", e);
      fontsPromise = null;
      return null;
    });
  }
  return fontsPromise;
};

const FACES: Record<"custom" | "builtin", Record<Weight, [string, string]>> = {
  custom: { regular: ["Poppins", "normal"], medium: ["PoppinsMedium", "normal"], semibold: ["PoppinsSemiBold", "normal"], bold: ["Poppins", "bold"] },
  builtin: { regular: ["helvetica", "normal"], medium: ["helvetica", "normal"], semibold: ["helvetica", "bold"], bold: ["helvetica", "bold"] },
};

// ── Shapes of the content ───────────────────────────────────────────────────
export interface Seller {
  name: string;
  lines: string[];
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Custom fields such as "FSSAI: 1234". */
  extra?: string[];
  /** A data URL. */
  logo?: string | null;
}

export interface Party {
  title: string;
  name: string;
  lines: string[];
  /** Printed as "GSTIN …" (pass "Unregistered" for none); undefined hides the line. */
  gstin?: string | null;
  meta?: string[];
  /** Shown in place of the address when there is none (e.g. "Same as billing address"). */
  empty?: string;
}

export interface Fact {
  label: string;
  value: string;
  accent?: boolean;
}

export interface Column {
  header: string;
  /** Fixed width; the column without one takes the rest (the item column). */
  width?: number;
  align?: "left" | "right" | "center";
}

/** The item cell: name on top, a lighter second line (description) under it. */
export interface ItemCell {
  content: string;
  name: string;
  sub?: string | null;
}

export interface TotalRow {
  label: string;
  value: string;
  tone?: "accent" | "good" | "bad";
}

const chunk = <T,>(list: T[], n: number) => list.reduce<T[][]>((rows, x, i) => (i % n ? rows[rows.length - 1].push(x) : rows.push([x]), rows), []);

export class PdfKit {
  readonly doc: jsPDF;
  readonly kind: DocKind;
  readonly t: Theme;
  /** Poppins loaded (₹ available); otherwise Helvetica and "Rs.". */
  readonly custom: boolean;
  readonly W: number;
  readonly H: number;
  readonly M = 36;
  readonly CW: number;
  /** Kept free at the bottom of every page for the footer. */
  readonly FOOT = 68;
  /** Where content starts on a continuation page. */
  readonly CONT_TOP = 60;

  private title = "";
  private number = "";
  private copy: string | null = null;
  private seller: Seller = { name: "", lines: [] };
  private copies: { label: string | null; first: number }[] = [];
  private mark: { text: string; color: RGB } | null = null;
  /** A short note printed in every page's footer line (e.g. "Not a tax invoice"). */
  footNote = "";
  /** The company's signature / stamp (PNG data URL) for the signature box; null leaves it blank. */
  signature: string | null = null;

  private constructor(doc: jsPDF, kind: DocKind, custom: boolean) {
    this.doc = doc;
    this.kind = kind;
    this.t = THEMES[kind];
    this.custom = custom;
    this.W = doc.internal.pageSize.getWidth();
    this.H = doc.internal.pageSize.getHeight();
    this.CW = this.W - this.M * 2;
  }

  static async create(kind: DocKind) {
    // The signature never stops a document: if it can't be read, the box is blank.
    const [fonts, signature] = await Promise.all([loadFonts(), loadCompanySignature().catch(() => null)]);
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
    if (fonts) {
      fonts.forEach((f) => {
        doc.addFileToVFS(f.file, f.data);
        doc.addFont(f.file, f.family, f.style);
      });
    }
    const kit = new PdfKit(doc, kind, !!fonts);
    kit.signature = signature;
    return kit;
  }

  // ── Small helpers ─────────────────────────────────────────────────────────
  font(w: Weight, size: number, color: RGB = INK) {
    const [family, style] = FACES[this.custom ? "custom" : "builtin"][w];
    this.doc.setFont(family, style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(color[0], color[1], color[2]);
  }

  /** "₹" or "Rs." */
  get cur() {
    return this.custom ? "₹" : "Rs.";
  }

  /** A true minus sign, or "-" in the built-in font. */
  get minus() {
    return this.custom ? "−" : "-";
  }

  money(v: unknown) {
    return money(v, this.custom);
  }

  width(s: string, space = 0) {
    return this.doc.getTextWidth(s) + space * Math.max(0, s.length - 1);
  }

  /** Text with optional letter spacing; right / centre alignment measured with that spacing. */
  text(s: string, x: number, y: number, o: { align?: "left" | "right" | "center"; space?: number } = {}) {
    const space = o.space || 0;
    const w = this.width(s, space);
    const x0 = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x;
    this.doc.text(s, x0, y, space ? { charSpace: space } : undefined);
    return w;
  }

  wrap(s: unknown, width: number): string[] {
    const str = String(s ?? "").trim();
    return str ? (this.doc.splitTextToSize(str, width) as string[]) : [];
  }

  /** Shrinks the text (down to minSize) and then shortens it with "…" to fit. */
  fit(s: string, maxW: number, w: Weight, size: number, color: RGB, minSize = size - 1.5) {
    let fs = size;
    this.font(w, fs, color);
    while (fs > minSize && this.width(s) > maxW) {
      fs -= 0.25;
      this.font(w, fs, color);
    }
    if (this.width(s) <= maxW) return s;
    let cut = s;
    while (cut.length > 1 && this.width(`${cut}…`) > maxW) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}…`;
  }

  fill(c: RGB) {
    this.doc.setFillColor(c[0], c[1], c[2]);
  }

  stroke(c: RGB, w = 0.6) {
    this.doc.setDrawColor(c[0], c[1], c[2]);
    this.doc.setLineWidth(w);
  }

  box(x: number, y: number, w: number, h: number, o: { fill?: RGB; stroke?: RGB; r?: number; lw?: number } = {}) {
    const r = o.r ?? 6;
    if (o.fill) this.fill(o.fill);
    if (o.stroke) this.stroke(o.stroke, o.lw ?? 0.6);
    const mode = o.fill && o.stroke ? "FD" : o.fill ? "F" : "S";
    this.doc.roundedRect(x, y, w, h, r, r, mode);
  }

  hr(y: number, x1 = this.M, x2 = this.W - this.M, c: RGB = LINE, w = 0.6) {
    this.stroke(c, w);
    this.doc.line(x1, y, x2, y);
  }

  vr(x: number, y1: number, y2: number, c: RGB = LINE, w = 0.6) {
    this.stroke(c, w);
    this.doc.line(x, y1, x, y2);
  }

  mix(a: RGB, b: RGB, t: number): RGB {
    return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
  }

  /** A left-to-right gradient, drawn as thin overlapping strips (works in every viewer). */
  gradient(x: number, y: number, w: number, h: number, from: RGB, to: RGB, steps = 90) {
    const sw = w / steps;
    for (let i = 0; i < steps; i++) {
      this.fill(this.mix(from, to, i / (steps - 1)));
      this.doc.rect(x + i * sw, y, sw + 0.8, h, "F");
    }
  }

  /** A small rounded label: outline or filled. */
  pill(label: string, right: number, top: number, o: { color?: RGB; filled?: boolean; size?: number } = {}) {
    const color = o.color || this.t.primary;
    const size = o.size || 6.2;
    this.font("semibold", size, o.filled ? WHITE : color);
    const tw = this.width(label, 0.5);
    const w = tw + 14;
    const h = size + 8.5;
    this.box(right - w, top, w, h, o.filled ? { fill: color, r: h / 2 } : { fill: WHITE, stroke: this.mix(color, WHITE, 0.55), r: h / 2, lw: 0.7 });
    this.font("semibold", size, o.filled ? WHITE : color);
    this.text(label, right - w + 7, top + h / 2 + size * 0.36, { space: 0.5 });
    return w;
  }

  private sectionLabel(label: string, x: number, y: number, color: RGB = this.t.primary) {
    this.fill(color);
    this.doc.circle(x + 2.1, y - 2.2, 2.1, "F");
    this.font("semibold", 6.4, color);
    this.text(label.toUpperCase(), x + 8, y, { space: 0.6 });
  }

  page() {
    return this.doc.getNumberOfPages();
  }

  // ── Copies and stamps ─────────────────────────────────────────────────────
  /** Starts a copy (a new page after the first); page numbers count within each copy. */
  beginCopy(label: string | null) {
    if (this.copies.length) this.doc.addPage();
    this.copies.push({ label, first: this.page() });
    this.copy = label;
  }

  /** A large faint diagonal word over every page ("PAID", "CANCELLED"). */
  stamp(text: string | null, color: RGB = BAD) {
    this.mark = text ? { text, color } : null;
  }

  // ── Letterhead ────────────────────────────────────────────────────────────
  /** The first page of a copy: letterhead band with the seller and the document title. Returns the band's bottom. */
  header(o: { seller: Seller; title: string; number: string; subtitle?: string | null }) {
    const { doc, M, W, t } = this;
    this.seller = o.seller;
    this.title = o.title;
    this.number = o.number;
    const s = o.seller;

    // Right block: copy pill, title, subtitle.
    this.font("bold", 21, t.deep);
    const titleW = this.width(o.title, 0.8);
    const rightW = Math.max(titleW, 150);
    const textX = M + 60;
    const leftW = W - M - rightW - 26 - textX;

    // Left block: measured first so the band fits it.
    this.font("semibold", 14.5);
    const nameL = this.wrap(s.name || "Your Company", leftW).slice(0, 2);
    this.font("regular", 7.6);
    const addrL = s.lines.flatMap((l) => this.wrap(l, leftW)).slice(0, 5);
    const contact = [s.phone, s.email].filter(Boolean).join("   ·   ");
    // GSTIN and contact share a line when they fit beside the title; otherwise contact goes under it.
    this.font("semibold", 7.8);
    const gstinW = s.gstin ? this.width("GSTIN", 0.5) + 4 + this.doc.getTextWidth(s.gstin) + 10 : 0;
    this.font("regular", 7.4);
    const contactSplit = !!(s.gstin && contact && gstinW + this.doc.getTextWidth(contact) > leftW);
    const extraL = (s.extra || []).length ? this.wrap((s.extra || []).join("   ·   "), leftW).slice(0, 2) : [];
    let leftBottom = 30 + nameL.length * 17 + addrL.length * 10.6 + (s.gstin || contact ? 16 : 0) + (contactSplit ? 11 : 0) + extraL.length * 10;
    leftBottom = Math.max(leftBottom, 30 + 48);
    const bandH = Math.max(leftBottom + 26, 118);

    // Band, then the gradient strip on top of it.
    this.fill(t.soft);
    doc.rect(0, 0, W, bandH, "F");
    this.gradient(0, 0, W, 5, t.grad[0], t.grad[1]);
    // A few faint rings tucked into the band's top-right corner (clear of the title).
    this.stroke(this.mix(t.soft, t.tint, 0.6), 0.8);
    [40, 58, 76].forEach((r) => doc.circle(W + 12, -34, r, "S"));

    // Logo, or a monogram in the document colour.
    const LOGO = 46;
    if (s.logo) {
      this.box(M, 28, LOGO, LOGO, { fill: WHITE, stroke: LINE, r: 10 });
      try {
        const p = (doc as any).getImageProperties(s.logo);
        const k = Math.min((LOGO - 8) / p.width, (LOGO - 8) / p.height);
        const iw = p.width * k;
        const ih = p.height * k;
        doc.addImage(s.logo, p.fileType, M + (LOGO - iw) / 2, 28 + (LOGO - ih) / 2, iw, ih);
      } catch {
        this.monogram(s.name, M, 28, LOGO);
      }
    } else {
      this.monogram(s.name, M, 28, LOGO);
    }

    let y = 41;
    this.font("semibold", 14.5, INK);
    nameL.forEach((l) => {
      doc.text(l, textX, y);
      y += 17;
    });
    y -= 4;
    this.font("regular", 7.6, TEXT);
    addrL.forEach((l) => {
      doc.text(l, textX, y);
      y += 10.6;
    });
    if (s.gstin || contact) {
      y += 4;
      let x = textX;
      if (s.gstin) {
        this.font("semibold", 6.6, t.primary);
        x += this.text("GSTIN", x, y, { space: 0.5 }) + 4;
        this.font("semibold", 7.8, INK);
        x += this.text(s.gstin, x, y) + 10;
      }
      if (contact) {
        if (contactSplit) {
          y += 11;
          x = textX;
        }
        this.font("regular", 7.4, MUTED);
        this.text(this.fit(contact, leftW, "regular", 7.4, MUTED, 6.6), x, y);
      }
      y += 11;
    }
    if (extraL.length) {
      this.font("regular", 7, MUTED);
      extraL.forEach((l) => {
        doc.text(l, textX, y);
        y += 10;
      });
    }

    // Title block on the right.
    let ry = 30;
    if (this.copy) {
      this.pill(this.copy.toUpperCase(), W - M, ry - 2);
      ry += 22;
    } else {
      ry += 10;
    }
    this.font("bold", 21, t.deep);
    this.text(o.title, W - M, ry + 16, { align: "right", space: 0.8 });
    if (o.subtitle) {
      this.font("medium", 7, MUTED);
      this.text(o.subtitle, W - M, ry + 30, { align: "right" });
    }
    return bandH;
  }

  /** No logo: the company's initials on a tile in the document colour. */
  private monogram(name: string, x: number, y: number, size: number) {
    const { t } = this;
    this.box(x, y, size, size, { fill: t.primary, r: 11 });
    // a thin lighter inner ring for depth
    this.box(x + 3, y + 3, size - 6, size - 6, { stroke: this.mix(t.primary, WHITE, 0.28), r: 8.5, lw: 0.8 });
    this.font("bold", 15.5, WHITE);
    this.text(initials(name), x + size / 2, y + size / 2 + 5.6, { align: "center" });
  }

  /** The header on pages 2+ of a copy (and of a long table). */
  continuation() {
    const { M, W, t } = this;
    this.gradient(0, 0, W, 4, t.grad[0], t.grad[1]);
    this.font("bold", 10, t.deep);
    const tw = this.text(this.title, M, 31, { space: 0.6 });
    this.font("medium", 8.2, MUTED);
    this.text(`${this.number}   ·   continued`, M + tw + 10, 31);
    if (this.copy) this.pill(this.copy.toUpperCase(), W - M, 20);
    this.hr(44);
  }

  /** Room for `h` more points? Otherwise a new page (with the continuation header). */
  ensure(y: number, h: number) {
    if (y + h <= this.H - this.FOOT - 4) return y;
    this.doc.addPage();
    this.continuation();
    return this.CONT_TOP;
  }

  // ── Key facts ─────────────────────────────────────────────────────────────
  /** A white card of 3–4 facts, overlapping the band's lower edge. */
  facts(bandBottom: number, list: Fact[]) {
    const { doc, M, CW, t } = this;
    const top = bandBottom - 22;
    const h = 44;
    this.fill(this.mix(LINE, t.tint, 0.25));
    doc.roundedRect(M + 1.5, top + 2.2, CW - 3, h, 8, 8, "F");
    this.box(M, top, CW, h, { fill: WHITE, stroke: LINE, r: 8 });
    const cw = CW / list.length;
    list.forEach((f, i) => {
      const x = M + i * cw;
      if (i) this.vr(x, top + 10, top + h - 10);
      this.font("semibold", 6.2, MUTED);
      this.text(f.label.toUpperCase(), x + 14, top + 16.5, { space: 0.55 });
      const v = this.fit(f.value || "—", cw - 26, "semibold", 9.6, f.accent ? t.deep : INK, 7.6);
      this.doc.text(v, x + 14, top + 31.5);
    });
    return top + h;
  }

  // ── Customer cards ────────────────────────────────────────────────────────
  parties(top: number, list: Party[]) {
    const { doc, M, CW } = this;
    const gap = 12;
    const w = (CW - gap * (list.length - 1)) / list.length;
    const pad = 13;
    const inner = w - pad * 2;
    const blocks = list.map((p) => {
      this.font("semibold", 10.4);
      const nameL = this.wrap(p.name || "—", inner).slice(0, 2);
      this.font("regular", 8);
      const addrL = p.lines.flatMap((l) => this.wrap(l, inner));
      const emptyL = !addrL.length && p.empty ? [p.empty] : [];
      this.font("regular", 7.5);
      const metaL = (p.meta || []).filter(Boolean).flatMap((l) => this.wrap(l, inner));
      const h = pad + 9 + 9 + nameL.length * 13.5 + (addrL.length + emptyL.length) * 11 + (p.gstin !== undefined ? 13 : 0) + metaL.length * 10.5 + pad - 2;
      return { p, nameL, addrL, emptyL, metaL, h };
    });
    const h = Math.max(78, ...blocks.map((b) => b.h));
    blocks.forEach((b, i) => {
      const x = M + i * (w + gap);
      this.box(x, top, w, h, { fill: WHITE, stroke: LINE, r: 8 });
      let y = top + pad + 6;
      this.sectionLabel(b.p.title, x + pad, y);
      y += 18;
      this.font("semibold", 10.4, INK);
      b.nameL.forEach((l) => {
        doc.text(l, x + pad, y);
        y += 13.5;
      });
      y -= 1.5;
      this.font("regular", 8, TEXT);
      b.addrL.forEach((l) => {
        doc.text(l, x + pad, y);
        y += 11;
      });
      if (b.emptyL.length) {
        this.font("regular", 8, MUTED);
        doc.text(b.emptyL[0], x + pad, y);
        y += 11;
      }
      if (b.p.gstin !== undefined) {
        y += 2;
        this.font("semibold", 6.4, MUTED);
        const lw = this.text("GSTIN", x + pad, y, { space: 0.5 });
        this.font("semibold", 7.8, INK);
        doc.text(b.p.gstin || "Unregistered", x + pad + lw + 5, y);
        y += 11;
      }
      this.font("regular", 7.5, MUTED);
      b.metaL.forEach((l) => {
        doc.text(l, x + pad, y);
        y += 10.5;
      });
    });
    return top + h;
  }

  // ── References grid ───────────────────────────────────────────────────────
  /** Label / value cells, `cols` per row; the last cell of a short row spans the rest. */
  refGrid(top: number, cells: [string, string][], cols = 3) {
    if (!cells.length) return top;
    const { doc, M, CW } = this;
    const pad = 11;
    const rows = chunk(cells, cols).map((row) => {
      const cw = CW / cols;
      const widths = row.map((_, i) => (i === row.length - 1 ? CW - cw * (row.length - 1) : cw));
      this.font("medium", 8);
      const lines = row.map(([, v], i) => this.wrap(v || "—", widths[i] - pad * 2));
      const h = pad + 8 + 5 + Math.max(...lines.map((l) => l.length)) * 10.6 + pad - 3;
      return { row, widths, lines, h };
    });
    const total = rows.reduce((s, r) => s + r.h, 0);
    this.box(M, top, CW, total, { fill: PANEL, stroke: LINE, r: 8 });
    let y = top;
    rows.forEach((r, ri) => {
      if (ri) this.hr(y, M + 8, M + CW - 8);
      let x = M;
      r.row.forEach(([label], i) => {
        if (i) this.vr(x, y + 8, y + r.h - 8);
        this.font("semibold", 6.2, MUTED);
        this.text(label.toUpperCase(), x + pad, y + pad + 6, { space: 0.5 });
        this.font("medium", 8, INK);
        r.lines[i].forEach((l, li) => doc.text(l, x + pad, y + pad + 18.5 + li * 10.6));
        x += r.widths[i];
      });
      y += r.h;
    });
    return top + total;
  }

  // ── Items table ───────────────────────────────────────────────────────────
  table(top: number, cols: Column[], rows: (string | ItemCell)[][], o: { itemCol?: number; foot?: string[] } = {}) {
    const { doc, M, CW, t } = this;
    const itemCol = o.itemCol ?? 1;
    const fixed = cols.reduce((s, c) => s + (c.width || 0), 0);
    const widths = cols.map((c) => c.width || Math.max(80, CW - fixed));
    const face = (w: Weight) => FACES[this.custom ? "custom" : "builtin"][w];
    const BODY = 8.2;
    autoTable(doc, {
      startY: top,
      margin: { left: M, right: M, top: this.CONT_TOP, bottom: this.FOOT + 6 },
      head: [cols.map((c) => c.header)],
      body: rows as any,
      foot: o.foot ? [o.foot] : undefined,
      showFoot: "lastPage",
      showHead: "everyPage",
      theme: "plain",
      tableWidth: CW,
      styles: {
        font: face("regular")[0],
        fontStyle: face("regular")[1],
        fontSize: BODY,
        textColor: TEXT,
        cellPadding: { top: 6.5, bottom: 6.5, left: 6, right: 6 },
        overflow: "linebreak",
        valign: "top",
        lineWidth: 0,
      },
      headStyles: {
        font: face("semibold")[0],
        fontStyle: face("semibold")[1],
        fontSize: 6.6,
        textColor: WHITE,
        fillColor: false as any,
        cellPadding: { top: 7.5, bottom: 7, left: 6, right: 6 },
        valign: "middle",
      },
      bodyStyles: { fillColor: WHITE },
      alternateRowStyles: { fillColor: PANEL },
      footStyles: {
        font: face("semibold")[0],
        fontStyle: face("semibold")[1],
        fontSize: 8.2,
        textColor: t.deep,
        fillColor: t.soft,
        cellPadding: { top: 7, bottom: 7, left: 6, right: 6 },
      },
      columnStyles: Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w, halign: cols[i].align || "left" }])),
      didParseCell: (d: any) => {
        if (d.section === "head" || d.section === "foot") d.cell.styles.halign = cols[d.column.index]?.align || "left";
        if (d.section === "body") {
          d.cell.styles.lineWidth = { bottom: 0.5 };
          d.cell.styles.lineColor = LINE;
          if (d.column.index === itemCol) {
            d.cell.styles.font = face("medium")[0];
            d.cell.styles.fontStyle = face("medium")[1];
          }
          if (d.column.index === 0) d.cell.styles.textColor = FAINT;
        }
      },
      willDrawCell: (d: any) => {
        if (d.section === "head" && d.column.index === 0) {
          this.gradientRow(M, d.cell.y, CW, d.cell.height);
        }
        if (d.section === "body" && d.column.index === itemCol && d.cell.raw && typeof d.cell.raw === "object") {
          d.cell.text = [];
        }
      },
      didDrawCell: (d: any) => {
        if (d.section !== "body" || d.column.index !== itemCol || !d.cell.raw || typeof d.cell.raw !== "object") return;
        const raw = d.cell.raw as ItemCell;
        const x = d.cell.x + d.cell.padding("left");
        const w = d.cell.width - d.cell.padding("left") - d.cell.padding("right");
        const lh = BODY * doc.getLineHeightFactor();
        let y = d.cell.y + d.cell.padding("top");
        this.font("medium", BODY, INK);
        this.wrap(raw.name, w).forEach((l) => {
          doc.text(l, x, y, { baseline: "top" });
          y += lh;
        });
        if (raw.sub) {
          this.font("regular", 7.1, MUTED);
          this.wrap(raw.sub, w).forEach((l) => {
            doc.text(l, x, y + 0.6, { baseline: "top" });
            y += 7.1 * doc.getLineHeightFactor();
          });
        }
      },
      willDrawPage: (d: any) => {
        if (d.pageNumber > 1) this.continuation();
      },
    } as any);
    return (doc as any).lastAutoTable.finalY as number;
  }

  /** The table's header row: a rounded bar in the document colour. */
  private gradientRow(x: number, y: number, w: number, h: number) {
    const { t } = this;
    this.box(x, y, w, h, { fill: t.deep, r: 6 });
    // a soft highlight toward the left
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      this.fill(this.mix(t.primary, t.deep, i / (steps - 1)));
      this.doc.rect(x + 6 + ((w - 12) / steps) * i, y, (w - 12) / steps + 0.8, h, "F");
    }
    this.fill(t.primary);
    this.doc.roundedRect(x, y, 12, h, 6, 6, "F");
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  /**
   * The totals card on the right (rows, the grand total bar, rows after it)
   * and, on the left, whatever `left` draws (amount in words, tax summary…).
   */
  totals(
    top: number,
    o: {
      rows: TotalRow[];
      grand: { label: string; value: string };
      after?: TotalRow[];
      leftHeight: (w: number) => number;
      left: (x: number, y: number, w: number) => void;
    },
  ) {
    const { doc, W, M, CW, t } = this;
    const RW = 240;
    const LW = CW - RW - 16;
    const rx = W - M - RW;
    const ROW = 15.5;
    const after = o.after || [];
    const cardH = 12 + o.rows.length * ROW + 6 + 34 + (after.length ? 8 + after.length * ROW : 0) + 10;
    const h = Math.max(cardH, o.leftHeight(LW));
    top = this.ensure(top, h);

    this.box(rx, top, RW, cardH, { fill: PANEL, stroke: LINE, r: 9 });
    let y = top + 12 + 10;
    const row = (r: TotalRow) => {
      this.font("regular", 8, MUTED);
      doc.text(r.label, rx + 14, y);
      const color = r.tone === "good" ? GOOD : r.tone === "bad" ? BAD : r.tone === "accent" ? t.deep : INK;
      this.font(r.tone ? "semibold" : "medium", 8.6, color);
      this.text(r.value, rx + RW - 14, y, { align: "right" });
      y += ROW;
    };
    o.rows.forEach(row);
    // Grand total bar.
    const by = y - 10 + 6;
    this.gradientBar(rx + 6, by, RW - 12, 34);
    this.font("semibold", 7, [255, 255, 255]);
    this.text(o.grand.label.toUpperCase(), rx + 18, by + 21, { space: 0.6 });
    const gv = this.fit(o.grand.value, RW - 120, "bold", 13.5, WHITE, 10);
    this.text(gv, rx + RW - 18, by + 22.5, { align: "right" });
    y = by + 34 + 8 + 10;
    if (after.length) after.forEach(row);

    o.left(M, top, LW);
    return top + h;
  }

  private gradientBar(x: number, y: number, w: number, h: number) {
    const { t } = this;
    this.box(x, y, w, h, { fill: t.deep, r: 7 });
    const steps = 40;
    for (let i = 0; i < steps; i++) {
      this.fill(this.mix(t.primary, t.deep, i / (steps - 1)));
      this.doc.rect(x + 7 + ((w - 14) / steps) * i, y, (w - 14) / steps + 0.8, h, "F");
    }
    this.fill(t.primary);
    this.doc.roundedRect(x, y, 14, h, 7, 7, "F");
  }

  /** "Amount in words" card; returns its height (draws only when `draw`). */
  words(x: number, y: number, w: number, total: unknown, draw = true) {
    const pad = 12;
    this.font("medium", 8.4);
    const lines = this.wrap(amountInWords(total), w - pad * 2);
    const h = pad + 8 + 6 + lines.length * 11.5 + pad - 4;
    if (!draw) return h;
    this.box(x, y, w, h, { fill: WHITE, stroke: LINE, r: 8 });
    this.sectionLabel("Amount in words", x + pad, y + pad + 6);
    this.font("medium", 8.4, INK);
    lines.forEach((l, i) => this.doc.text(l, x + pad, y + pad + 22 + i * 11.5));
    return h;
  }

  /** A compact table inside a card (tax summary). Returns its height (draws only when `draw`). */
  miniTable(x: number, y: number, w: number, title: string, head: string[], rows: string[][], widths: number[], draw = true) {
    const pad = 12;
    const ROW = 13;
    const h = pad + 8 + 9 + ROW + rows.length * ROW + pad - 6;
    if (!draw) return h;
    const { doc } = this;
    this.box(x, y, w, h, { fill: WHITE, stroke: LINE, r: 8 });
    this.sectionLabel(title, x + pad, y + pad + 6);
    const inner = w - pad * 2;
    const scale = inner / widths.reduce((s, v) => s + v, 0);
    const xs: number[] = [];
    widths.reduce((acc, v) => (xs.push(acc), acc + v * scale), x + pad);
    let ty = y + pad + 24;
    this.fill(PANEL);
    doc.roundedRect(x + pad - 4, ty - 9, inner + 8, ROW, 3, 3, "F");
    this.font("semibold", 6.2, MUTED);
    head.forEach((hd, i) => {
      const right = i > 0;
      this.text(hd.toUpperCase(), right ? xs[i] + widths[i] * scale : xs[i], ty, { align: right ? "right" : "left", space: 0.3 });
    });
    ty += ROW;
    rows.forEach((r, ri) => {
      const last = ri === rows.length - 1 && r[0] === "Total";
      this.font(last ? "semibold" : "regular", 7.6, last ? INK : TEXT);
      r.forEach((c, i) => this.text(c, i > 0 ? xs[i] + widths[i] * scale : xs[i], ty, { align: i > 0 ? "right" : "left" }));
      ty += ROW;
    });
    return h;
  }

  // ── Bank, terms, signature ────────────────────────────────────────────────
  closing(
    top: number,
    o: {
      bank?: [string, string][];
      terms?: string | null;
      /** The terms card's label ("Terms & conditions" by default; "Notes" on a challan). */
      termsTitle?: string;
      /** A short line in the document colour under the cards ("Thank you for your business!"). */
      thanks?: string | null;
      /** Under the cards (e.g. the invoice declaration, a quotation's validity). */
      note?: string | null;
      /** Full width above the signature row (e.g. a challan's "Not a tax invoice…"). */
      declaration?: string | null;
      signFor: string;
      /** Challans: a receiver's box on the left. */
      receiver?: boolean;
    },
  ) {
    const { doc, M, CW } = this;
    const gap = 12;
    const pad = 12;
    const SIGN_W = 176;
    // Taller with a signature, so it prints about 2 cm high.
    const SIGN_MIN = this.signature ? 96 : 80;
    const BANK_W = 196;
    const bank = (o.bank || []).filter(([, v]) => v);
    const termsText = String(o.terms || "").trim();
    const termLines = (w: number) => {
      this.font("regular", 7.5);
      return termsText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .flatMap((l) => this.wrap(l, w - pad * 2));
    };
    const bankH = pad + 16 + bank.length * 12 + pad - 3;
    const termsH = (w: number) => pad + 16 + termLines(w).length * 10.4 + pad - 2;
    this.font("regular", 7.3);
    const noteL = o.note ? this.wrap(o.note, CW) : [];
    const declL = o.declaration ? this.wrap(o.declaration, CW) : [];
    const textH = (l: string[]) => (l.length ? l.length * 10.2 + 8 : 0);
    const termsTitle = o.termsTitle || "Terms & conditions";

    // Challan: its notes, the declaration, then the receiver's box beside the signature.
    if (o.receiver) {
      const notesH = termsText ? termsH(CW) : 0;
      let y = this.ensure(top, (notesH ? notesH + gap : 0) + textH(declL) + SIGN_MIN);
      if (notesH) {
        this.termsCard(M, y, CW, notesH, termsTitle, termLines(CW));
        y += notesH + gap;
      }
      if (declL.length) {
        this.font("regular", 7.3, MUTED);
        declL.forEach((l, i) => doc.text(l, M, y + 4 + i * 10.2));
        y += textH(declL);
      }
      this.receiverCard(M, y, CW - SIGN_W - gap, SIGN_MIN);
      this.signCard(M + CW - SIGN_W, y, SIGN_W, SIGN_MIN, o.signFor);
      return y + SIGN_MIN;
    }

    // Invoice / quotation: one row — bank | terms | signature — then the thank-you and note.
    const after = (o.thanks ? 16 : 0) + textH(noteL);
    const termsW = CW - SIGN_W - gap - (bank.length ? BANK_W + gap : 0);
    if (!termsText || termLines(termsW).length <= 9) {
      const rowH = Math.max(SIGN_MIN, bank.length ? bankH : 0, termsText ? termsH(termsW) : 0);
      let y = this.ensure(top, rowH + (after ? gap - 2 + after : 0));
      let x = M;
      if (bank.length) {
        const w = termsText ? BANK_W : CW - SIGN_W - gap;
        this.bankCard(x, y, w, rowH, bank);
        x += w + gap;
      }
      if (termsText) this.termsCard(x, y, termsW, rowH, termsTitle, termLines(termsW));
      this.signCard(M + CW - SIGN_W, y, SIGN_W, rowH, o.signFor);
      y += rowH;
      return after ? this.closingText(y + gap - 2, o.thanks, noteL) : y;
    }
    // Long terms: bank beside the signature, then the terms across the page.
    const row1 = Math.max(SIGN_MIN, bank.length ? bankH : 0);
    const tH = termsH(CW);
    let y = this.ensure(top, row1 + gap + Math.min(tH, 300));
    if (bank.length) this.bankCard(M, y, CW - SIGN_W - gap, row1, bank);
    this.signCard(M + CW - SIGN_W, y, SIGN_W, row1, o.signFor);
    y = this.ensure(y + row1 + gap, tH);
    this.termsCard(M, y, CW, tH, termsTitle, termLines(CW));
    y += tH;
    return after ? this.closingText(this.ensure(y + gap - 2, after), o.thanks, noteL) : y;
  }

  private closingText(y: number, thanks: string | null | undefined, noteL: string[]) {
    const { doc, M } = this;
    if (thanks) {
      this.font("semibold", 8.6, this.t.deep);
      doc.text(thanks, M, y + 9);
      y += 16;
    }
    if (noteL.length) {
      this.font("regular", 7.3, MUTED);
      noteL.forEach((l, i) => doc.text(l, M, y + 6 + i * 10.2));
      y += noteL.length * 10.2 + 8;
    }
    return y;
  }

  private bankCard(x: number, y: number, w: number, h: number, bank: [string, string][]) {
    const { doc } = this;
    this.box(x, y, w, h, { fill: WHITE, stroke: LINE, r: 8 });
    this.sectionLabel("Bank details", x + 12, y + 18);
    let by = y + 34;
    bank.forEach(([k, v]) => {
      this.font("regular", 7.4, MUTED);
      doc.text(k, x + 12, by);
      const value = this.fit(v, w - 24 - 58, "semibold", 7.7, INK, 6.6);
      doc.text(value, x + 12 + 58, by);
      by += 12;
    });
  }

  private termsCard(x: number, y: number, w: number, h: number, title: string, lines: string[]) {
    this.box(x, y, w, h, { fill: WHITE, stroke: LINE, r: 8 });
    this.sectionLabel(title, x + 12, y + 18);
    this.font("regular", 7.5, TEXT);
    lines.forEach((l, i) => this.doc.text(l, x + 12, y + 34 + i * 10.4));
  }

  /** "For <company>", the company's signature / stamp on the line (or room to sign), "Authorised Signatory". */
  private signCard(x: number, y: number, w: number, h: number, signFor: string) {
    const { t } = this;
    this.box(x, y, w, h, { fill: this.mix(t.soft, WHITE, 0.45), stroke: this.mix(LINE, t.tint, 0.35), r: 8 });
    const label = this.fit(`For ${signFor}`, w - 24, "semibold", 7.8, INK, 6.6);
    this.text(label, x + w - 12, y + 19, { align: "right" });
    const lineY = y + h - 23;
    this.hr(lineY, x + 26, x + w - 12, FAINT, 0.6);
    this.signatureImage(x + 12, y + 25, w - 24, lineY + 4);
    this.font("medium", 7, MUTED);
    this.text("Authorised Signatory", x + w - 12, y + h - 10, { align: "right" });
  }

  /**
   * The signature / stamp between the label and the line, centred over the
   * line and sitting on it — crossing it a little, like ink. No image (or one
   * that can't be read) leaves the box blank to sign by hand.
   */
  private signatureImage(left: number, top: number, maxW: number, bottom: number) {
    if (!this.signature) return;
    try {
      const p = (this.doc as any).getImageProperties(this.signature);
      const maxH = Math.min(bottom - top, 58);
      const k = Math.min(maxW / p.width, maxH / p.height);
      const iw = p.width * k;
      const ih = p.height * k;
      const centre = left + maxW / 2 + 7;
      const ix = Math.min(Math.max(centre - iw / 2, left), left + maxW - iw);
      // One alias: embedded once however many copies / pages print it.
      this.doc.addImage(this.signature, "PNG", ix, bottom - ih, iw, ih, "company-signature", "FAST");
    } catch {
      /* unreadable: blank, as without a signature */
    }
  }

  private receiverCard(x: number, y: number, w: number, h: number) {
    this.box(x, y, w, h, { fill: WHITE, stroke: LINE, r: 8 });
    this.sectionLabel("Received in good condition", x + 12, y + 18);
    this.hr(y + h - 23, x + 12, x + w - 12, FAINT, 0.6);
    this.font("medium", 7, MUTED);
    this.doc.text("Receiver's signature, name & date", x + 12, y + h - 10);
  }

  // ── Finishing: stamps, footers, save ──────────────────────────────────────
  private drawStamp() {
    if (!this.mark) return;
    const { doc, W, H } = this;
    const GState = (doc as any).GState;
    const set = (opacity: number) => {
      try {
        (doc as any).setGState(new GState({ opacity }));
      } catch {
        /* viewers without transparency just skip the stamp's fade */
      }
    };
    set(0.075);
    this.font("bold", 92, this.mark.color);
    const angle = 30;
    const rad = (angle * Math.PI) / 180;
    const w = this.width(this.mark.text, 6);
    const cx = W / 2;
    const cy = H / 2 + 30;
    const lift = 92 * 0.35;
    doc.text(this.mark.text, cx - (w / 2) * Math.cos(rad) + lift * Math.sin(rad), cy + (w / 2) * Math.sin(rad) + lift * Math.cos(rad), {
      angle,
      charSpace: 6,
    } as any);
    set(1);
  }

  private footer(pageNo: number, pages: number) {
    const { doc, M, W, H, kind } = this;
    const y0 = H - this.FOOT + 8;
    this.hr(y0, M, W - M, LINE, 0.7);
    // Left: who issued it, and where this page sits.
    const s = this.seller;
    this.font("semibold", 7.4, INK);
    doc.text(this.fit(s.name || "", 300, "semibold", 7.4, INK, 6.6), M, y0 + 17);
    const contact = [s.phone, s.email].filter(Boolean).join("   ·   ");
    if (contact) {
      this.font("regular", 7, MUTED);
      doc.text(contact, M, y0 + 27.5);
    }
    this.font("medium", 6.6, FAINT);
    const title = this.title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const line = [`${title} ${this.number}`.trim(), `Page ${pageNo} of ${pages}`, this.footNote].filter(Boolean).join("   ·   ");
    doc.text(line, M, y0 + (contact ? 38.5 : 28));

    // Right: the SameBook QR code to the landing page (kept 16pt clear of the page edge for printers).
    const QS = 38;
    const qx = W - M - QS;
    const qy = y0 + 6;
    this.box(qx - 2, qy - 2, QS + 4, QS + 4, { fill: WHITE, stroke: LINE, r: 5, lw: 0.5 });
    drawQr(doc, promoUrl(kind), qx, qy, QS, INK);
    const tx = qx - 9;
    this.font("regular", 6.2, FAINT);
    this.text("Created with", tx, qy + 10, { align: "right" });
    this.logotype(tx, qy + 22.5);
    this.font("regular", 6.2, MUTED);
    this.text("Billing & GST, simplified · scan to see", tx, qy + 33, { align: "right" });
  }

  /** The SameBook mark (four squares) and name, right-aligned at `right`. */
  private logotype(right: number, baseline: number) {
    const { doc } = this;
    this.font("semibold", 9, INK);
    const ws = doc.getTextWidth("Same");
    const wb = doc.getTextWidth("Book");
    const sq = 3.3;
    const gap = 1.2;
    const mark = sq * 2 + gap;
    let x = right - (mark + 4 + ws + wb);
    const top = baseline - 7;
    const colors: RGB[] = [
      [239, 68, 68],
      [34, 197, 94],
      [59, 130, 246],
      [250, 204, 21],
    ];
    colors.forEach((c, i) => {
      this.fill(c);
      doc.roundedRect(x + (i % 2) * (sq + gap), top + Math.floor(i / 2) * (sq + gap), sq, sq, 0.9, 0.9, "F");
    });
    x += mark + 4;
    this.font("semibold", 9, INK);
    doc.text("Same", x, baseline);
    this.font("semibold", 9, [230, 145, 56]);
    doc.text("Book", x + ws, baseline);
  }

  /** Stamps and footers on every page (page numbers within each copy), then download. */
  save(filename: string) {
    const total = this.page();
    const copies = this.copies.length ? this.copies : [{ label: null, first: 1 }];
    copies.forEach((c, i) => {
      const last = i < copies.length - 1 ? copies[i + 1].first - 1 : total;
      for (let p = c.first; p <= last; p++) {
        this.doc.setPage(p);
        this.drawStamp();
        this.footer(p - c.first + 1, last - c.first + 1);
      }
    });
    this.doc.save(filename);
  }
}

/** Plain number for table cells (the column header carries ₹). */
export const cellAmount = amount;
