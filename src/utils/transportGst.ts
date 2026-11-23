// GST on transport (the server's common/transport-gst.rules.ts): transport the
// seller charges on its own quotation or invoice is part of the sale, so it
// carries the document's GST rate. Each quotation and invoice stores how its
// totals were worked out (transport_gst); older ones added transport without GST.

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/** The value GST is charged on: the items after discounts, plus transport when it is taxed. */
export const gstBase = (itemsTaxable: unknown, transport: unknown, taxed: boolean) =>
  round2(num(itemsTaxable) + (taxed ? Math.max(0, num(transport)) : 0));

/**
 * Was GST charged on this document's transport? The stored flag when the
 * document carries it; otherwise (a row read without it) judged from its own
 * figures — whichever base its GST amounts match.
 */
export const docTaxesTransport = (doc: any): boolean => {
  const flag = doc?.transport_gst;
  if (flag === true || flag === false) return flag;
  if (flag !== undefined && flag !== null && flag !== "") return num(flag) !== 0;
  const transport = num(doc?.transport_charges);
  const rate = num(doc?.cgst_percent) + num(doc?.sgst_percent) + num(doc?.igst_percent);
  if (transport <= 0 || rate <= 0) return false;
  const items = num(doc?.sub_total) - num(doc?.discount_amount);
  const tax = num(doc?.cgst_amount) + num(doc?.sgst_amount) + num(doc?.igst_amount);
  return Math.abs(tax - ((items + transport) * rate) / 100) < Math.abs(tax - (items * rate) / 100);
};
