export type DocType = "quotation" | "challan" | "invoice";

export interface TrailQuotation {
  id: number;
  number: string;
  date: string | null;
  status: string | null;
  invoiced: boolean;
  customer_name: string | null;
  total: number | null;
  po_number: string | null;
  po_date: string | null;
  /** Share of the ordered value sent and billed (null when unknown). */
  progress: { sent_pct: number; billed_pct: number; to_bill_value: number } | null;
  fully_billed: boolean | null;
}

/** One ordered line: how much was sent on challans and billed on invoices. */
export interface BalanceLine {
  quotation_item_id: number;
  quotation_id: number;
  product_name: string;
  unit: string | null;
  ordered: number;
  sent: number;
  billed: number;
  to_send: number;
  to_bill: number;
  sent_not_billed: number;
  net_rate: number;
}

export interface TrailChallan {
  id: number;
  number: string;
  date: string | null;
  status: string;
  reason: string | null;
  quotation_id: number | null;
  quantity: number;
  value: number | null;
  vehicle_number: string | null;
  transporter_name: string | null;
  eway_bill_number: string | null;
  moved: boolean;
  /** The invoice its goods are billed on; linked=false when nobody linked it yet. */
  invoice: { id: number; number: string; date: string | null; linked: boolean } | null;
  /** Sent against an invoice made first (bill first, send in lots): its lot number, and whether it is the last. */
  lot?: Lot | null;
}

export interface Lot {
  number: number;
  last: boolean;
}

/** An invoice's own dispatch details, when it travels with the goods. */
export interface Dispatch {
  vehicle_number: string | null;
  transporter_name: string | null;
  lr_number: string | null;
  eway_bill_number: string | null;
}

export interface TrailInvoice {
  id: number;
  number: string;
  date: string | null;
  due_date: string | null;
  status: string | null;
  live: boolean;
  total: number | null;
  paid: number | null;
  balance: number | null;
  payments: number | null;
}

/** What the focused document prints in its reference boxes. */
export interface TrailReferences {
  po: { number: string; date: string | null } | null;
  quotation: { number: string; date: string | null } | null;
  /** Every quotation (and PO) an invoice bills — one invoice can bill several. */
  quotations?: { number: string; date: string | null }[];
  pos?: { number: string; date: string | null }[];
  challans: { number: string; date: string | null; vehicle_number: string | null; transporter_name: string | null; eway_bill_number: string | null }[];
  invoice: { number: string; date: string | null } | null;
  /** A challan sent against an invoice made first: "Lot N" (the last one carries the original invoice). */
  lot?: Lot | null;
  /** The invoice's own vehicle / transporter / LR / e-way bill. */
  dispatch?: Dispatch | null;
}

export interface Trail {
  focus: { type: DocType; id: number };
  access: Record<DocType, boolean>;
  quotation: TrailQuotation | null;
  /** Further quotations an invoice of this family bills. */
  other_quotations?: TrailQuotation[];
  challans: TrailChallan[];
  invoices: TrailInvoice[];
  payments: { count: number; amount: number; last_date: string | null } | null;
  /** The order balance, per quotation of the family. */
  balance?: { quotation_id: number; quotation_number: string; lines: BalanceLine[] }[];
  references: TrailReferences;
  place_of_supply: { state: string; code: string | null } | null;
}

export interface SearchResult {
  type: DocType;
  id: number;
  number: string;
  date: string | null;
  status: string | null;
  customer_name: string | null;
  amount: number | null;
  matched: "number" | "po" | "vehicle" | "eway";
  matched_value: string | null;
}
