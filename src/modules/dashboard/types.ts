// Shape of GET /dashboard/overview (see customer-backend.service/src/dashboard).

export type SeriesRow = [date: string, count: number, amount: number];
export type SeriesKey = "invoiced" | "collected" | "quotations" | "challans" | "customers";

export interface Total {
  count: number;
  amount: number;
  prev_count: number;
  prev_amount: number;
  count_change: number | null;
  amount_change: number | null;
}

export interface DashboardAccess {
  invoices: boolean;
  insights: boolean;
  quotations: boolean;
  challans: boolean;
  customers: boolean;
  products: boolean;
  tasks: false | "company" | "mine";
  attendance: false | "team" | "me";
  drive: boolean;
}

export interface Money {
  count: number;
  amount: number;
  paid: number;
  balance: number;
}

export interface Overview {
  range: { from: string; to: string; days: number; prev_from: string; prev_to: string; today: string; tz: number };
  access: DashboardAccess;
  generated_at: string;
  totals: Partial<Record<SeriesKey, Total>>;
  series: Partial<Record<SeriesKey, SeriesRow[]>>;
  snapshot: Partial<{
    customers_total: number;
    customers_active: number;
    products_active: number;
    challans_awaiting: number;
    challans_awaiting_value: number;
    pipeline_count: number;
    pipeline_value: number;
  }>;
  invoice_summary?: {
    state: Record<"paid" | "partial" | "unpaid" | "overdue", Money>;
    total: Money;
    collection_rate: number | null;
    gst: { before_tax: number; cgst: number; sgst: number; igst: number; total: number; prev_total: number; change: number | null };
    avg_days_to_pay: number | null;
    settled_count: number;
  };
  receivables?: {
    total: number;
    count: number;
    overdue: number;
    overdue_count: number;
    buckets: { key: string; label: string; count: number; amount: number }[];
  };
  payment_modes?: { mode: string; count: number; amount: number }[];
  top_customers?: {
    customers_billed: number;
    items: { id: number | null; name: string; invoices: number; amount: number; balance: number }[];
  };
  top_products?: { name: string; unit: string | null; qty: number; amount: number; invoices: number }[];
  funnel?: {
    stages: { key: string; label: string; count: number; amount: number }[];
    win_rate: number | null;
    draft: number;
    rejected: number;
    expired: number;
  };
  challans?: { statuses: { status: string; count: number; value: number }[] };
  low_stock?: { count: number; items: { id: number; name: string; unit: string | null; stock: number; minimum: number }[] };
  heatmap?: { cells: number[][]; total: number };
  recent?: {
    type: "invoice" | "payment" | "quotation" | "challan";
    id: number;
    ref_id: number;
    number: string;
    name: string;
    amount: number;
    status: string;
    at: string;
  }[];
  tasks?: {
    scope: "company" | "mine";
    open: number;
    overdue: number;
    due_today: number;
    by_status: Record<"TODO" | "IN_PROGRESS" | "IN_REVIEW" | "ON_HOLD", number>;
    done: number;
    done_prev: number;
    done_change: number | null;
    created: number;
  };
  attendance?:
    | {
        scope: "team";
        staff: number;
        present: number;
        working: number;
        on_leave: number;
        pending_leaves: number;
        avg_minutes: number | null;
        daily: [string, number][];
      }
    | { scope: "me"; days: number; minutes: number; punched_today: boolean; working: boolean; pending_leaves: number };
  drive?: { files: number; folders: number; bytes: number; uploads: number; contributors: number };
  errors: string[];
}

export interface RangeQuery {
  from: string;
  to: string;
  today: string;
  tz: number;
  cmp_from?: string;
}
