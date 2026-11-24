import { notification } from "antd";
import { PdfKit, type Column, type ItemCell, type Seller } from "@/utils/pdf/pdfKit";
import { amount, date } from "@/utils/pdf/pdfFormat";
import { logoDataUrl, storedCompany } from "@/utils/pdf/pdfData";
import type { Balance, Statement } from "./api";

/** "12,345.00 Dr" — a balance as printed in a ledger. */
const bal = (b: Balance) => (b.amount ? `${amount(b.amount)} ${b.side}` : "0.00");

/** A file-safe piece of a name. */
const safe = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "party";

/**
 * A statement of account (the party's ledger) as a PDF: our letterhead, the
 * customer or supplier, the period, the opening balance, every entry with
 * the running balance, totals and the closing balance in figures and words —
 * signed by the company. Debit = they owe us / we paid them; credit = the
 * other way, as in the books.
 */
export async function downloadStatementPdf(st: Statement): Promise<void> {
  try {
    const company = storedCompany();
    const c = st.company;
    const seller: Seller = {
      name: c.name || company?.name || "Your company",
      lines: c.address_lines || [],
      gstin: c.gstin,
      phone: c.phone,
      email: c.email,
      logo: logoDataUrl(company?.logo),
    };
    const kit = await PdfKit.create("ledger");
    const cur = kit.cur;
    const p = st.party;
    const isCustomer = p.type === "CUSTOMER";
    const period = `${date(st.period.from)} – ${date(st.period.to)}`;

    let y = kit.header({ seller, title: "STATEMENT", number: p.name, subtitle: "Statement of account" });
    y =
      kit.facts(y, [
        { label: "Period", value: period },
        { label: "Opening balance", value: `${cur}${bal(st.opening)}` },
        { label: "Closing balance", value: `${cur}${bal(st.closing)}`, accent: true },
        { label: "In short", value: st.closing.words || "Settled" },
      ]) + 12;
    y =
      kit.parties(y, [
        {
          title: isCustomer ? "Customer" : "Supplier",
          name: p.name,
          lines: p.address || [],
          gstin: p.gstin || "Unregistered",
          meta: [[p.phone, p.email].filter(Boolean).join("   ·   ")].filter(Boolean),
        },
        {
          title: "How to read it",
          name: isCustomer ? "Debit = you bought · Credit = you paid" : "Credit = we bought · Debit = we paid",
          lines: [
            isCustomer ? "The balance after each line is what you owe us then (Dr)," : "The balance after each line is what we owe you then (Cr),",
            isCustomer ? "or what you've paid in advance (Cr)." : "or what we've paid in advance (Dr).",
          ],
        },
      ]) + 12;

    const cols: Column[] = [
      { header: "DATE", width: 62 },
      { header: "PARTICULARS" },
      { header: `DEBIT (${cur})`, width: 78, align: "right" },
      { header: `CREDIT (${cur})`, width: 78, align: "right" },
      { header: `BALANCE (${cur})`, width: 92, align: "right" },
    ];
    const rows: (string | ItemCell)[][] = [
      [date(st.period.from), { content: "Opening balance", name: "Opening balance", sub: null }, "", "", bal(st.opening)],
      ...st.rows.map((r) => {
        const title = `${r.type_word}${r.number ? ` ${r.number}` : ""}`;
        return [
          date(r.date),
          { content: r.narration ? `${title}\n${r.narration}` : title, name: title, sub: r.narration || null } as ItemCell,
          r.debit ? amount(r.debit) : "",
          r.credit ? amount(r.credit) : "",
          bal(r.balance),
        ];
      }),
    ];
    y = kit.table(y, cols, rows, { foot: ["", "Total", amount(st.totals.debit), amount(st.totals.credit), bal(st.closing)] }) + 12;

    const closingWords = st.closing.amount ? `${st.closing.words || ""}` : "Nothing is due either way";
    y = kit.totals(y, {
      rows: [
        { label: "Opening balance", value: `${cur}${bal(st.opening)}` },
        { label: "Debits", value: `+ ${kit.money(st.totals.debit)}` },
        { label: "Credits", value: `${kit.minus} ${kit.money(st.totals.credit)}` },
      ],
      grand: { label: `Closing · ${closingWords}`, value: `${cur}${bal(st.closing)}` },
      after: [],
      leftHeight: (w) => kit.words(0, 0, w, st.closing.amount, false),
      left: (x, top, w) => {
        kit.words(x, top, w, st.closing.amount);
      },
    });
    kit.closing(y + 12, {
      bank: [],
      terms: null,
      thanks: null,
      note: `This statement is made from our books for ${period}. Please check it and tell us within 15 days if anything differs.`,
      signFor: seller.name,
    });
    kit.save(`statement-${safe(p.name)}-${st.period.from}-to-${st.period.to}.pdf`);
  } catch (error: any) {
    notification.error({ title: "Download failed", description: error?.message || "Unable to make the statement PDF" });
  }
}
