/** GET /delivery-challan/summary (built by challan-insights.rules.ts on the backend). */
export interface ChallanSummaryData {
  today: string;
  statuses: Record<"draft" | "dispatched" | "delivered" | "invoiced" | "cancelled", { count: number; value: number }>;
  /** Every live challan (cancelled ones never count). */
  total: { count: number; value: number };
  drafts: {
    count: number;
    value: number;
    stale: number;
    stale_days: number;
    /** Oldest first, with what the dispatch prompt needs (absent from older backends). */
    items?: DraftItem[];
  };
  on_road: {
    count: number;
    value: number;
    oldest_days: number | null;
    items: {
      id: number;
      challan_number: string;
      customer_name: string | null;
      reason: string;
      reason_label: string;
      route: string | null;
      sent_on: string | null;
      days: number;
      total_value: number;
      vehicle_number: string | null;
    }[];
  };
  to_invoice: {
    count: number;
    value: number;
    /** Of those, how many get linked to an invoice their quotation already has. */
    link_count: number;
    items: ReadyItem[];
  };
  eway_missing: { count: number; value: number; threshold: number };
  backlog: {
    quotations: number;
    items: number;
    value: number;
    list: {
      quotation_id: number;
      quotation_number: string;
      customer_id: number | null;
      customer_name: string;
      items: number;
      pending_items: number;
      pending_value: number;
      challans: number;
      invoiced: boolean;
    }[];
  };
  months: { key: string; count: number; value: number; confirmed: number }[];
  this_month: { from: string; to: string; count: number; value: number; confirmed: number };
  last_month: { from: string; to: string; count: number; value: number };
  sent_change: number | null;
  reasons: { reason: string; label: string; count: number; value: number; share: number | null }[];
  avg_days_to_deliver: number | null;
  delivered_count: number;
}

export interface DraftItem {
  id: number;
  challan_number: string;
  status: "DRAFT";
  customer_name: string | null;
  reason: string;
  reason_label: string;
  route: string | null;
  made_on: string | null;
  days: number;
  total_value: number;
  affects_stock: boolean;
  from_warehouse_id: number | null;
  from_warehouse_name: string | null;
  to_warehouse_name: string | null;
  eway_bill_number: string | null;
}

export interface ReadyItem {
  id: number;
  challan_number: string;
  customer_name: string;
  /** Null for a sale made without a quotation (billed in the invoice editor). */
  quotation_id?: number | null;
  quotation_number: string | null;
  status: string;
  since: string | null;
  days: number;
  total_value: number;
  /** The quotation's live invoice, when it already has one (the challan gets linked to it). */
  invoice_number: string | null;
}

/** GET /delivery-challan/eligible-quotations rows. */
export interface EligibleQuotation {
  id: number;
  quotation_number: string;
  customer_id: number | null;
  customer_name: string | null;
  contact_person_name: string | null;
  quotation_date: string | null;
  items: number;
  pending_items: number;
  pending_qty: number;
  sent_qty: number;
  ordered_qty: number;
  pending_value: number;
  challans: number;
  invoiced: boolean;
}

/** What the "make invoice" dialog needs about a challan (a list row, a details object or a summary item). */
export interface InvoiceTarget {
  id: number;
  challan_number: string;
  customer_name?: string | null;
  quotation_number?: string | null;
  total_value?: number | string | null;
  /** The quotation's live invoice, when it already has one. */
  quotation_invoice_number?: string | null;
}
