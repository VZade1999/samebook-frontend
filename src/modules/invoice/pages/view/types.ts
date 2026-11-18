import type { InvState } from "./shared";

type Money = { count: number; value: number };

/** GET /invoice/summary (see invoice-insights.rules.ts on the backend). */
export interface InvoiceSummaryData {
  today: string;
  states: Record<InvState, { count: number; value: number; paid: number; balance: number }>;
  total: { count: number; value: number; paid: number; balance: number };
  outstanding: Money;
  overdue: Money;
  due_soon: Money & { days: number };
  no_due_date: Money;
  attention: {
    id: number;
    invoice_number: string;
    customer_name: string;
    due_date: string;
    /** Days until due; negative once late. */
    days: number;
    grand_total: number;
    paid_amount: number;
    balance_amount: number;
    state: InvState;
  }[];
  aging: { key: string; label: string; count: number; value: number }[];
  collection_rate: number | null;
  avg_days_to_pay: number | null;
  settled_count: number;
  this_month: { from: string; to: string; billed: Money; collected: Money };
  last_month: { from: string; to: string; billed: Money; collected: Money };
  billed_change: number | null;
  collected_change: number | null;
  months: { key: string; billed_count: number; billed: number; collected_count: number; collected: number }[];
  top_debtors: { id: number | null; name: string; count: number; balance: number; overdue: number; oldest_due: string | null }[];
  payment_modes: { mode: string; label: string; count: number; value: number; share: number | null }[];
}
