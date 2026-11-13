import type { Stage } from "./shared";

/** GET /quotation/summary (see quotation-insights.rules.ts on the backend). */
export interface QuotationSummaryData {
  today: string;
  stages: Record<Stage, { count: number; value: number }>;
  total: { count: number; value: number };
  open: { count: number; value: number };
  pipeline: { count: number; value: number };
  lapsed: { count: number; value: number };
  expiring: {
    days: number;
    count: number;
    value: number;
    items: {
      id: number;
      quotation_number: string;
      customer_name: string;
      validity_date: string;
      days_left: number;
      grand_total: number;
      stage: Stage;
    }[];
  };
  win_rate: number | null;
  acceptance_rate: number | null;
  avg_value: number;
  this_month: { count: number; value: number; from: string; to: string };
  last_month: { count: number; value: number; from: string; to: string };
  count_change: number | null;
  value_change: number | null;
  months: { key: string; count: number; value: number; invoiced_count: number; invoiced_value: number }[];
  top_customers: { id: number | null; name: string; count: number; value: number; invoiced_value: number }[];
  /** Why quotations were closed, most common first. */
  close_reasons: { outcome: "REJECTED" | "EXPIRED"; reason: string | null; label: string; count: number; value: number }[];
}
