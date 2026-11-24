import { notification } from "antd";
import { PdfKit, type Column, type Seller } from "@/utils/pdf/pdfKit";
import { amount } from "@/utils/pdf/pdfFormat";
import { logoDataUrl, storedCompany } from "@/utils/pdf/pdfData";

/** A report as a table: headers, rows (text or numbers), and which columns are money. */
export interface ReportTable {
  title: string;
  subtitle: string;
  columns: { header: string; money?: boolean; width?: number }[];
  rows: (string | number | null)[][];
  foot?: (string | number | null)[];
  file: string;
}

const cell = (v: string | number | null, money?: boolean) => (v === null || v === undefined ? "" : money && typeof v === "number" ? amount(v) : String(v));

/** Download as CSV (opens in Excel; the BOM keeps ₹ and Indian names right). */
export function downloadCsv(t: ReportTable) {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const line = (r: (string | number | null)[]) => r.map((v, i) => esc(v === null || v === undefined ? "" : typeof v === "number" && t.columns[i]?.money ? v.toFixed(2) : String(v))).join(",");
  const csv = [t.title, t.subtitle, "", line(t.columns.map((c) => c.header)), ...t.rows.map(line), ...(t.foot ? [line(t.foot)] : [])].join("\r\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${t.file}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Download as a PDF in the books' style (letterhead, table, signature line). */
export async function downloadReportPdf(t: ReportTable) {
  try {
    const company = storedCompany();
    const seller: Seller = { name: company?.name || "Your company", lines: [], gstin: company?.gst_no || company?.gstin || null, logo: logoDataUrl(company?.logo) };
    const kit = await PdfKit.create("ledger");
    let y = kit.header({ seller, title: t.title.toUpperCase(), number: t.subtitle, subtitle: t.subtitle });
    y += 8;
    const cols: Column[] = t.columns.map((c, i) => ({ header: c.money ? `${c.header} (${kit.cur})` : c.header.toUpperCase(), width: i === 0 ? undefined : c.width || (c.money ? 78 : 70), align: c.money ? "right" : "left" }));
    const rows = t.rows.map((r) => r.map((v, i) => cell(v, t.columns[i]?.money)));
    kit.table(y, cols, rows, { itemCol: 0, ...(t.foot ? { foot: t.foot.map((v, i) => cell(v, t.columns[i]?.money)) } : {}) });
    kit.save(`${t.file}.pdf`);
  } catch (error: any) {
    notification.error({ title: "Download failed", description: error?.message || "Unable to make the PDF" });
  }
}
