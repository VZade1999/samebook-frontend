// Accounts (the ledger): the calls and their shapes (server: customer-backend.service/src/accounts).
import api from "@/api/axios";

const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== "" && v !== undefined && v !== null));
const body = <T,>(r: any): T => r?.data?.data as T;
/** The server's message for a failed call, or the fallback. */
export const apiError = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return (Array.isArray(m) ? m.join(". ") : m) || e?.message || fallback;
};

export type PartyType = "CUSTOMER" | "SUPPLIER";
export type Side = "Dr" | "Cr";
export type EntryType = "SALES" | "RECEIPT" | "PURCHASE" | "PAYMENT" | "EXPENSE" | "JOURNAL" | "CONTRA" | "CREDIT_NOTE" | "DEBIT_NOTE" | "OPENING";
export type RangePreset = "fy" | "last_fy" | "month" | "last_month" | "all" | "custom";

/** A balance: amount with its side, the signed value (debit − credit) and plain words. */
export interface Balance {
  amount: number;
  side: Side | "";
  value: number;
  words: string | null;
}

export interface MoneyAccount {
  id: number;
  code: string | null;
  name: string;
  group: "CASH_IN_HAND" | "BANK_ACCOUNTS";
  bank_account_id: number | null;
  balance: number;
}

export interface LedgerSummary {
  books_start: string;
  fy: string;
  today: string;
  you_get: number;
  customers_owing: number;
  advances_received: number;
  you_owe: number;
  suppliers_owed: number;
  advances_paid: number;
  cash: number;
  bank: number;
  money: MoneyAccount[];
  opening_difference: Balance;
  warnings: number;
  can: { record: boolean; reports: boolean };
}

export interface PartyRow {
  id: number;
  name: string;
  gstin: string | null;
  phone: string | null;
  is_active: boolean;
  last_date: string | null;
  balance: Balance;
}

export interface StatementRow {
  entry_id: number;
  date: string;
  type: EntryType;
  type_word: string;
  number: string | null;
  narration: string | null;
  source_type: string;
  doc_id: number | null;
  debit: number;
  credit: number;
  balance: Balance;
}

export interface Letterhead {
  name: string;
  legal_name: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  address_lines: string[];
}

export interface Statement {
  company: Letterhead;
  party_opening: { amount: number; side: Side };
  party: { type: PartyType; id: number; name: string; gstin: string | null; phone: string | null; email: string | null; address: string[] };
  period: { from: string; to: string; preset: RangePreset };
  books_start: string;
  opening: Balance;
  rows: StatementRow[];
  totals: { debit: number; credit: number };
  closing: Balance;
}

export interface CashWarning {
  rule: "269ST" | "40A(3)";
  date: string;
  party_type: PartyType | null;
  party_id: number | null;
  party_name: string | null;
  amount: number;
  message: string;
}

export interface BooksSettings {
  books_start: string;
  default_bank_account_id: number | null;
  bank_in_use: number | null;
  banks: { id: number; label: string; is_default: boolean; is_active: boolean }[];
  can_edit: boolean;
}

export type OpeningKind = "customer" | "supplier" | "cash" | "bank" | "account";
export interface OpeningRow {
  kind: OpeningKind;
  id: number | null;
  name: string;
  gstin?: string | null;
  inactive?: boolean;
  /** Other accounts: the group name (Capital, Loans…). */
  group?: string;
  amount: number;
  side: Side;
}

export const getSummary = () => api.get("/ledger/summary").then((r) => body<LedgerSummary>(r));
export const getParties = (q: { type: "customer" | "supplier"; q?: string; filter?: string; page?: number; limit?: number }) =>
  api.get("/ledger/parties", { params: clean(q) }).then((r) => body<{ type: PartyType; rows: PartyRow[]; total: number; page: number; limit: number }>(r));
export const getStatement = (type: "customer" | "supplier", id: number, q: { range?: RangePreset; from?: string; to?: string }) =>
  api.get(`/ledger/parties/${type}/${id}`, { params: clean(q) }).then((r) => body<Statement>(r));
export const getWarnings = () => api.get("/ledger/warnings").then((r) => body<{ rows: CashWarning[] }>(r));
export const getBooksSettings = () => api.get("/ledger/settings").then((r) => body<BooksSettings>(r));
export const saveBooksSettings = (b: { books_start: string; default_bank_account_id: number | null }) =>
  api.put("/ledger/settings", b).then((r) => ({ ...body<BooksSettings>(r), message: r?.data?.message as string }));
export const getOpenings = (q: { kind: OpeningKind | "money" | "accounts"; q?: string; page?: number; limit?: number }) =>
  api.get("/ledger/openings", { params: clean(q) }).then((r) => body<{ books_start: string; kind: string; rows: OpeningRow[]; total: number; page?: number; limit?: number }>(r));
export const saveOpenings = (items: { kind: OpeningKind; id: number | null; amount: number; side: Side }[]) =>
  api.put("/ledger/openings", { items }).then((r) => ({ ...body<{ saved: number; removed: number }>(r), message: r?.data?.message as string }));
export const recheckBooks = () => api.post("/ledger/recheck").then((r) => ({ message: r?.data?.message as string }));

// ── Step 2: money in & out ──────────────────────────────────────────────────
export type PayMode = "CASH" | "BANK_TRANSFER" | "CHEQUE" | "UPI" | "CARD";
export const PAY_MODES: { value: PayMode; label: string }[] = [
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer (NEFT/RTGS/IMPS)" },
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
];
const withMessage = <T,>(r: any) => ({ ...body<T>(r), message: r?.data?.message as string });

export interface OpenInvoices {
  customer: { id: number; name: string };
  invoices: { id: number; number: string; date: string; due_date: string | null; total: number; balance: number }[];
  advance: number;
}
export interface ReceiptResult {
  id: number;
  number: string;
  settled: { invoice_id: number; number: string; amount: number; status: string }[];
  advance: number;
  warning: string | null;
}
export interface ReceiptRow {
  id: number;
  number: string;
  date: string;
  customer_id: number;
  customer_name: string;
  amount: number;
  mode: PayMode;
  reference: string | null;
  status: "ACTIVE" | "CANCELLED";
  invoices: string | null;
  advance: number;
}
export interface ExpenseHead {
  id: number;
  code: string | null;
  name: string;
  group: string;
  group_name: string;
  fy_total: number;
}
export interface ExpenseRow {
  id: number;
  number: string;
  date: string;
  account_id: number;
  head: string;
  payee: string | null;
  payee_gstin: string | null;
  bill_number: string | null;
  amount: number;
  gst_rate: number;
  gst: number;
  total: number;
  mode: PayMode;
  reference: string | null;
  notes: string | null;
  status: "ACTIVE" | "CANCELLED";
  cancel_reason: string | null;
}
export interface ExpenseList {
  period: { from: string; to: string; preset: RangePreset };
  totals: { count: number; spent: number; gst_credit: number; cash: number };
  by_head: { name: string; total: number }[];
  rows: ExpenseRow[];
  total: number;
  page: number;
  limit: number;
}
export interface AccountRow {
  id: number;
  code: string | null;
  name: string;
  group: string;
  nature: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE" | null;
  is_system: boolean;
  is_active: boolean;
  bank_account_id: number | null;
  is_party_control: boolean;
  entries: number;
  balance: { amount: number; side: Side | ""; value: number };
}
export interface AccountStatementRow extends StatementRow {
  party_name: string | null;
}
export interface AccountStatement {
  account: { id: number; code: string | null; name: string; group: string; group_name: string; nature: string | null };
  period: { from: string; to: string; preset: RangePreset };
  books_start: string;
  opening: Balance;
  rows: AccountStatementRow[];
  totals: { debit: number; credit: number };
  closing: Balance;
}
export interface DayBookRow {
  id: number;
  date: string;
  type: EntryType;
  type_word: string;
  number: string | null;
  narration: string | null;
  party_name: string | null;
  amount: number;
  source_type: string;
  doc_id: number | null;
}
export interface EntryView {
  id: number;
  type: EntryType;
  type_word: string;
  date: string;
  number: string | null;
  narration: string | null;
  amount: number;
  status: string;
  source_type: string;
  source_id: number | null;
  party_name: string | null;
  can_cancel: boolean;
  lines: { account: string; debit: number; credit: number }[];
}

export const getOpenInvoices = (customerId: number) => api.get(`/ledger/customers/${customerId}/open-invoices`).then((r) => body<OpenInvoices>(r));
export const receivePayment = (b: { customer_id: number; amount: number; date?: string; mode: PayMode; bank_account_id?: number | null; reference?: string; notes?: string; allocations?: { invoice_id: number; amount: number }[] }) =>
  api.post("/ledger/receipts", b).then((r) => withMessage<ReceiptResult>(r));
export const applyAdvance = (customerId: number) => api.post("/ledger/receipts/apply-advance", { customer_id: customerId }).then((r) => withMessage<{ settled: unknown[] }>(r));
export const cancelReceipt = (id: number, reason: string) => api.post(`/ledger/receipts/${id}/cancel`, { reason }).then((r) => withMessage<{ id: number }>(r));
export const getReceipts = (q: { q?: string; customer_id?: number; page?: number; limit?: number }) =>
  api.get("/ledger/receipts", { params: clean(q) }).then((r) => body<{ rows: ReceiptRow[]; total: number; page: number; limit: number }>(r));
export const getExpenseHeads = () => api.get("/ledger/expense-heads").then((r) => body<{ rows: ExpenseHead[] }>(r));
export const getExpenses = (q: { range?: RangePreset; from?: string; to?: string; q?: string; account_id?: number; page?: number; limit?: number }) =>
  api.get("/ledger/expenses", { params: clean(q) }).then((r) => body<ExpenseList>(r));
export const addExpense = (b: Record<string, unknown>) => api.post("/ledger/expenses", b).then((r) => withMessage<{ id: number; number: string; total: number; gst_credit: number; warning: string | null }>(r));
export const cancelExpense = (id: number, reason: string) => api.post(`/ledger/expenses/${id}/cancel`, { reason }).then((r) => withMessage<{ id: number }>(r));
export const addTransfer = (b: { from: "cash" | { id: number }; to: "cash" | { id: number }; amount: number; date?: string; reference?: string; narration?: string }) =>
  api.post("/ledger/transfers", b).then((r) => withMessage<{ id: number; number: string }>(r));
export const addJournal = (b: { date?: string; narration: string; lines: { account_id?: number; party_type?: string; party_id?: number; debit?: number; credit?: number }[] }) =>
  api.post("/ledger/journals", b).then((r) => withMessage<{ id: number; number: string }>(r));
export const getEntry = (id: number) => api.get(`/ledger/entries/${id}`).then((r) => body<EntryView>(r));
/** The books entry of a receipt, expense or refund (Find opens these). */
export const getEntryOf = (kind: "receipt" | "expense" | "refund", id: number) => api.get(`/ledger/entries/of/${kind}/${id}`).then((r) => body<{ id: number }>(r));
export const cancelEntry = (id: number, reason: string) => api.post(`/ledger/entries/${id}/cancel`, { reason }).then((r) => withMessage<{ id: number }>(r));
export const getAccounts = () => api.get("/ledger/accounts").then((r) => body<{ groups: { code: string; name: string; nature: string }[]; rows: AccountRow[] }>(r));
export const addAccount = (b: { name: string; group_code: string; notes?: string }) => api.post("/ledger/accounts", b).then((r) => withMessage<{ id: number; name: string; group: string }>(r));
export const getAccountStatement = (id: number, q: { range?: RangePreset; from?: string; to?: string }) =>
  api.get(`/ledger/accounts/${id}/statement`, { params: clean(q) }).then((r) => body<AccountStatement>(r));
// ── Step 3: credit notes, debit notes, refunds ──────────────────────────────
export type NoteKind = "credit" | "debit";
export type NoteReason = "GOODS_RETURNED" | "PRICE_REDUCED" | "DEFICIENCY" | "CORRECTION" | "OTHER";
export const NOTE_REASONS: { value: NoteReason; label: string }[] = [
  { value: "GOODS_RETURNED", label: "Goods returned" },
  { value: "PRICE_REDUCED", label: "Price reduced / discount after the sale" },
  { value: "DEFICIENCY", label: "Short supply or deficiency" },
  { value: "CORRECTION", label: "Correction in the invoice" },
  { value: "OTHER", label: "Other" },
];
export interface NoteRow {
  id: number;
  number: string;
  date: string;
  reason: NoteReason;
  reason_word: string;
  total: number;
  status: "ACTIVE" | "CANCELLED";
  stock: boolean;
  doc_number: string | null;
  doc_id: number | null;
  party_name: string;
  party_id: number | null;
}
export interface NoteDocPick {
  id: number;
  number: string;
  date: string;
  customer_name?: string;
  supplier_name?: string;
  total: number;
  credited: number;
  balance: number;
}
export interface NoteFormLine {
  id: number;
  name: string;
  hsn_code: string | null;
  unit: string | null;
  qty: number;
  returned: number;
  left: number;
  unit_value: number;
  gst_rate?: number;
  product_id: number | null;
  from_challan?: boolean;
}
export interface InvoiceNoteForm {
  invoice: { id: number; number: string; date: string; customer_id: number; customer_name: string; gstin: string | null; total: number; paid: number; credited: number; balance: number; rates: { cgst: number; sgst: number; igst: number } };
  lines: NoteFormLine[];
  noted: number;
  can_note: number;
  gst_deadline: string;
  gst_late: boolean;
  warehouses: { id: number; name: string; is_default: boolean }[];
}
export interface BillNoteForm {
  bill: { id: number; number: string; date: string; supplier_id: number; supplier_name: string; gstin: string | null; tax_type: string; total: number; paid: number; credited: number; balance: number; gst_rates: number[] };
  lines: NoteFormLine[];
  noted: number;
  can_note: number;
  warehouses: { id: number; name: string; is_default: boolean }[];
}
export interface NoteView {
  kind: NoteKind;
  id: number;
  number: string;
  date: string;
  status: "ACTIVE" | "CANCELLED";
  cancel_reason: string | null;
  reason: NoteReason;
  reason_word: string;
  note: string | null;
  company: { name: string; gstin: string | null; phone: string | null; email: string | null; address_lines: string[] };
  party: { name: string; gstin: string | null; lines: string[] };
  against: { number: string; date: string; id: number };
  lines: { name: string; hsn_code: string | null; unit: string | null; qty: number | null; rate: number | null; gst_rate: number | null; taxable: number }[];
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  stock: boolean;
  warehouse: string | null;
  gst_deadline: string | null;
  rates?: { cgst: number; sgst: number; igst: number };
  applied?: number;
}

export const getNotes = (q: { kind: NoteKind; q?: string; page?: number; limit?: number }) =>
  api.get("/ledger/notes", { params: clean(q) }).then((r) => body<{ kind: NoteKind; rows: NoteRow[]; total: number; page: number; limit: number }>(r));
export const getNote = (kind: NoteKind, id: number) => api.get(`/ledger/notes/${kind}/${id}`).then((r) => body<NoteView>(r));
export const getNoteInvoices = (q: string) => api.get("/ledger/note-invoices", { params: clean({ q }) }).then((r) => body<{ rows: NoteDocPick[] }>(r));
export const getInvoiceForNote = (id: number) => api.get(`/ledger/note-invoices/${id}`).then((r) => body<InvoiceNoteForm>(r));
export const getNoteBills = (q: string) => api.get("/ledger/note-bills", { params: clean({ q }) }).then((r) => body<{ rows: NoteDocPick[] }>(r));
export const getBillForNote = (id: number) => api.get(`/ledger/note-bills/${id}`).then((r) => body<BillNoteForm>(r));
export const createNote = (kind: NoteKind, b: Record<string, unknown>) =>
  api.post(kind === "credit" ? "/ledger/credit-notes" : "/ledger/debit-notes", b).then((r) => withMessage<{ id: number; number: string; total: number; applied: number }>(r));
export const cancelNote = (kind: NoteKind, id: number, reason: string) =>
  api.post(`/ledger/${kind === "credit" ? "credit-notes" : "debit-notes"}/${id}/cancel`, { reason }).then((r) => withMessage<{ id: number }>(r));
export const refundCustomer = (b: { customer_id: number; amount: number; date?: string; mode: PayMode; bank_account_id?: number | null; reference?: string }) =>
  api.post("/ledger/refunds", b).then((r) => withMessage<{ id: number; number: string }>(r));

// ── Step 4: reports ─────────────────────────────────────────────────────────
export interface ReportRow {
  id: number;
  code: string | null;
  name: string;
  amount: number;
}
export interface ProfitLoss {
  period: { from: string; to: string; preset: RangePreset; fy: string };
  books_start: string;
  sales: ReportRow[];
  direct_incomes: ReportRow[];
  purchases: ReportRow[];
  direct_expenses: ReportRow[];
  indirect_incomes: ReportRow[];
  indirect_expenses: ReportRow[];
  opening_stock: number | null;
  closing_stock: number | null;
  stock_counted: boolean;
  unvalued_products: number;
  totals: { sales: number; direct_incomes: number; purchases: number; direct_expenses: number; indirect_incomes: number; indirect_expenses: number };
  gross_profit: number;
  net_profit: number;
}
export interface BalanceSheetSide {
  group: string;
  name: string;
  rows: ReportRow[];
  total: number;
}
export interface BalanceSheet {
  as_on: string;
  books_start: string;
  liabilities: BalanceSheetSide[];
  assets: BalanceSheetSide[];
  total_liabilities: number;
  total_assets: number;
  difference: number;
  stock_counted: boolean;
  unvalued_products: number;
  opening_difference: number;
}
export interface TrialBalance {
  period: { from: string; to: string; preset: RangePreset };
  groups: { group: string; name: string; nature: string; rows: { id: number; code: string | null; name: string; opening: number; debit: number; credit: number; closing: number }[]; opening: number; debit: number; credit: number; closing: number }[];
  totals: { debit: number; credit: number; closing_dr: number; closing_cr: number };
  balanced: boolean;
}
export interface GstReport {
  period: { from: string; to: string; preset: RangePreset };
  months: { month: string; sales: number; purchases: number; output: { cgst: number; sgst: number; igst: number }; input: { cgst: number; sgst: number; igst: number }; output_total: number; input_total: number; net: number }[];
  totals: { sales: number; purchases: number; output: number; input: number; net: number };
}
export interface Outstanding {
  kind: "customer" | "supplier";
  as_on: string;
  rows: { id: number; name: string; docs: number; oldest_days: number; not_due: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number; total: number }[];
  totals: { not_due: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number; total: number };
}
export const getReport = <T,>(name: "profit-loss" | "balance-sheet" | "trial-balance" | "gst" | "outstanding", q: Record<string, unknown>) =>
  api.get(`/ledger/reports/${name}`, { params: clean(q) }).then((r) => body<T>(r));

export const getDayBook = (q: { range?: RangePreset; from?: string; to?: string; type?: string; q?: string; page?: number; limit?: number }) =>
  api.get("/ledger/daybook", { params: clean(q) }).then((r) => body<{ period: { from: string; to: string; preset: RangePreset }; kinds: { type: string; word: string; count: number; total: number }[]; rows: DayBookRow[]; total: number; page: number; limit: number }>(r));
