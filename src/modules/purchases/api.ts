// Purchases: the calls and their shapes (server: customer-backend.service/src/purchases).
import api from "@/api/axios";

const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== "" && v !== undefined && v !== null));
const body = <T,>(r: any): T => r?.data?.data as T;
/** The server's message for a failed call, or the fallback. */
export const apiError = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return (Array.isArray(m) ? m.join(". ") : m) || e?.message || fallback;
};

// ── Shared ──────────────────────────────────────────────────────────────────
export type GstType = "REGISTERED" | "COMPOSITION" | "UNREGISTERED";
export type MsmeType = "MICRO" | "SMALL" | "MEDIUM";
export type TaxType = "INTRA_STATE" | "INTER_STATE" | "NO_GST";
export type PoStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SENT" | "PARTLY_RECEIVED" | "RECEIVED" | "CLOSED" | "CANCELLED";
export type BillStatus = "UNPAID" | "PARTLY_PAID" | "PAID" | "CANCELLED";
export type PaymentMode = "CASH" | "BANK_TRANSFER" | "CHEQUE" | "UPI" | "CARD";
export interface Paged<T> {
  page: number;
  limit: number;
  total?: number;
  rows: T[];
}
export interface HsnRow {
  hsn: string;
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
}

// ── Suppliers ───────────────────────────────────────────────────────────────
export interface SupplierRow {
  id: number;
  name: string;
  legal_name: string | null;
  gst_type: GstType;
  gstin: string | null;
  state: string | null;
  state_code: string | null;
  phone: string | null;
  email: string | null;
  msme_type: MsmeType | null;
  credit_days: number | null;
  is_active: boolean;
  open_pos: number;
  last_po_date: string | null;
  open_value: number | null;
  payable: number | null;
  overdue: number | null;
}
export interface SupplierAddress {
  id?: number;
  label: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  state_code?: string | null;
  postal_code: string | null;
  country: string | null;
  gstin: string | null;
  is_primary: boolean;
}
export interface SupplierContact {
  id?: number;
  name: string;
  designation: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
}
export interface Supplier extends Omit<SupplierRow, "open_pos" | "last_po_date" | "open_value" | "payable" | "overdue"> {
  pan: string | null;
  udyam_number: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  upi_id: string | null;
  notes: string | null;
  created_at: string;
  addresses: SupplierAddress[];
  contacts: SupplierContact[];
  stats: { on_order: number; payable: number; billed_this_year: number; advance: number } | null;
  purchase_orders: { id: number; po_number: string; po_date: string; expected_date: string | null; status: PoStatus; grand_total: number | null }[];
  bills: { id: number; bill_number: string; bill_date: string; pay_by: string; grand_total: number; balance_amount: number; status: BillStatus; overdue: boolean }[];
  payments: { id: number; payment_date: string; amount: number; mode: PaymentMode; reference: string | null; status: string }[];
}
export interface SupplierOption {
  id: number;
  name: string;
  legal_name: string | null;
  gst_type: GstType;
  gstin: string | null;
  state: string | null;
  state_code: string | null;
  msme_type: MsmeType | null;
  credit_days: number | null;
  addresses: { id: number; label: string | null; line: string; state: string | null; state_code: string | null; gstin: string | null; is_primary: boolean }[];
}
export interface SupplierSummary {
  suppliers: number;
  msme: number;
  payable: number | null;
  overdue: number | null;
  on_order: number | null;
}

export const getSuppliers = async (q: { q?: string; status?: string; sort?: string; page?: number; limit?: number }) =>
  body<Paged<SupplierRow>>(await api.get("/suppliers", { params: clean(q) }));
export const getSupplierSummary = async () => body<SupplierSummary>(await api.get("/suppliers/summary"));
export const getSupplier = async (id: number) => body<Supplier>(await api.get(`/suppliers/${id}`));
export const supplierOptions = async (q: { q?: string; id?: number }) => body<SupplierOption[]>(await api.get("/suppliers/options", { params: clean(q) }));
export const saveSupplier = async (id: number | null, s: any) => (id ? (await api.put(`/suppliers/${id}`, s)).data : (await api.post("/suppliers", s)).data) as { message: string; data: Supplier };
export const archiveSupplier = async (id: number) => (await api.post(`/suppliers/${id}/archive`)).data as { message: string };
export const restoreSupplier = async (id: number) => (await api.post(`/suppliers/${id}/restore`)).data as { message: string };

// ── Purchase orders ─────────────────────────────────────────────────────────
export interface PoRow {
  id: number;
  po_number: string;
  po_date: string;
  expected_date: string | null;
  status: PoStatus;
  revision: number;
  supplier_id: number;
  supplier_name: string;
  items: number;
  received_pct: number;
  late: boolean;
  grand_total: number | null;
}
export interface PoSummary {
  draft: number;
  pending: number;
  to_send: number;
  to_receive: number;
  late: number;
  total: number;
  open_value: number | null;
  ordered_this_month: number | null;
  can: { create: boolean; approve: boolean; receive: boolean; bills: boolean; view: boolean };
}
export interface PoLine {
  id: number;
  line_no: number;
  product_id: number | null;
  item_name: string;
  description: string | null;
  hsn_code: string | null;
  unit: string | null;
  qty: number;
  rate: number | null;
  discount_percent: number | null;
  gst_rate: number | null;
  amount: number | null;
  tax: number | null;
  received: number;
  billed: number;
  pending: number;
}
export interface Receipt {
  id: number;
  grn_number: string;
  receipt_date: string;
  status: "RECEIVED" | "CANCELLED";
  warehouse_name: string | null;
  supplier_challan_no: string | null;
  supplier_invoice_no: string | null;
  vehicle_number: string | null;
  eway_bill_number: string | null;
  transporter_name: string | null;
  notes: string | null;
  cancel_reason: string | null;
  received_by: string | null;
  created_at: string;
  lines: { item_name: string; unit: string | null; received_qty: number; accepted_qty: number; rejected_qty: number; reject_reason: string | null }[];
}
export interface PoDetail {
  id: number;
  po_number: string;
  po_date: string;
  expected_date: string | null;
  status: PoStatus;
  revision: number;
  supplier_id: number;
  supplier: any;
  supplier_ref: string | null;
  buyer: any;
  ship_to: any;
  warehouse_id: number | null;
  issuing_location_id: number | null;
  place_of_supply: string | null;
  place_of_supply_code: string | null;
  tax_type: TaxType;
  sub_total: number | null;
  discount_amount: number | null;
  freight_charges: number | null;
  freight_gst: boolean;
  taxable_amount: number | null;
  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;
  round_off: number | null;
  grand_total: number | null;
  payment_terms: string | null;
  delivery_terms: string | null;
  notes: string | null;
  terms_conditions: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  closed_at: string | null;
  close_reason: string | null;
  created_at: string;
  updated_at: string;
  money_hidden: boolean;
  lines: PoLine[];
  hsn_summary: HsnRow[];
  receipts: Receipt[];
  bills: { id: number; bill_number: string; bill_date: string; grand_total: number; balance_amount: number; status: BillStatus }[];
  activity: { id: number; action: string; note: string | null; user_name: string | null; created_at: string; has_snapshot: boolean }[];
  can: Record<"edit" | "submit" | "approve" | "send_back" | "mark_sent" | "amend" | "receive" | "undo_receipt" | "cancel" | "close" | "reopen" | "delete" | "bill" | "pdf", boolean>;
  message?: string;
  grn?: { id: number; grn_number: string };
}
export interface PoPreview {
  tax_type: TaxType;
  place_of_supply: string | null;
  freight_gst: boolean;
  sub_total: number;
  discount_amount: number;
  items_value: number;
  freight_charges: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  round_off: number;
  grand_total: number;
  lines: { amount: number; tax: number; gst_rate: number; hsn_code: string | null; unit: string | null }[];
  approval: "APPROVED" | "PENDING_APPROVAL";
  payment_terms: string | null;
  delivery_terms: string | null;
  terms_conditions: string | null;
}
export interface PurchaseSettings {
  approval_limit: number | null;
  over_receipt_percent: number;
  default_payment_terms: string | null;
  default_delivery_terms: string | null;
  default_terms: string | null;
  standard_terms: string;
  can_edit: boolean;
}

export const getPos = async (q: { q?: string; status?: string; supplier_id?: number; page?: number; limit?: number }) =>
  body<Paged<PoRow>>(await api.get("/purchase-orders", { params: clean(q) }));
export const getPoSummary = async () => body<PoSummary>(await api.get("/purchase-orders/summary"));
export const getPo = async (id: number) => body<PoDetail>(await api.get(`/purchase-orders/${id}`));
export const previewPo = async (b: any) => body<PoPreview>(await api.post("/purchase-orders/preview", b));
export const savePo = async (id: number | null, b: any) => body<PoDetail>(id ? await api.put(`/purchase-orders/${id}`, b) : await api.post("/purchase-orders", b));
export const amendPo = async (id: number, b: any) => body<PoDetail>(await api.put(`/purchase-orders/${id}/amend`, b));
export const poAction = async (id: number, action: "submit" | "approve" | "send-back" | "sent" | "cancel" | "close" | "reopen", b: any = {}) =>
  body<PoDetail>(await api.post(`/purchase-orders/${id}/${action}`, b));
export const deletePo = async (id: number) => body<{ message: string }>(await api.delete(`/purchase-orders/${id}`));
export const receiveGoods = async (id: number, b: any) => body<PoDetail>(await api.post(`/purchase-orders/${id}/receive`, b));
export const cancelReceipt = async (grnId: number, reason: string) => body<PoDetail>(await api.post(`/purchase-orders/receipts/${grnId}/cancel`, { reason }));
export const getSettings = async () => body<PurchaseSettings>(await api.get("/purchase-orders/settings"));
export const saveSettings = async (s: Partial<PurchaseSettings>) => body<PurchaseSettings>(await api.put("/purchase-orders/settings", s));
export const getOnOrder = async (ids: number[]) =>
  body<{ product_id: number; on_order: number; next_date: string | null; pos: number }[]>(await api.get("/purchase-orders/on-order", { params: { ids: ids.join(",") } }));
export const getLastBought = async (ids: number[]) =>
  body<{ product_id: number; supplier_id: number; supplier_name: string; rate: number; discount_percent: number; gst_rate: number; po_date: string }[]>(
    await api.get("/purchase-orders/last-bought", { params: { ids: ids.join(",") } }),
  );

// ── Bills and payments ──────────────────────────────────────────────────────
export interface BillAlerts {
  overdue_days: number;
  msme_due: string | null;
  msme_days_left: number | null;
  itc_due: string;
  itc_days_left: number;
}
export interface BillRow {
  id: number;
  bill_number: string;
  bill_date: string;
  due_date: string | null;
  pay_by: string;
  supplier_id: number;
  supplier_name: string;
  msme: boolean;
  po_id: number | null;
  po_number: string | null;
  grand_total: number;
  paid_amount: number;
  balance_amount: number;
  status: BillStatus;
  alerts: BillAlerts | null;
}
export interface BillDetail extends BillRow {
  supplier: any;
  tax_type: TaxType;
  sub_total: number;
  discount_amount: number;
  freight_charges: number;
  freight_gst: boolean;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  round_off: number;
  notes: string | null;
  cancel_reason: string | null;
  rate_warnings: string[];
  lines: { id: number; item_name: string; hsn_code: string | null; unit: string | null; qty: number; rate: number; discount_percent: number; gst_rate: number; amount: number; tax: number }[];
  hsn_summary: HsnRow[];
  payments: { id: number; payment_id: number; payment_date: string; mode: PaymentMode; reference: string | null; amount: number; status: string }[];
  advance_available: number;
  can: { pay: boolean; cancel: boolean };
  message?: string;
}
export interface BillSummary {
  to_pay: number;
  unpaid: number;
  overdue: number;
  overdue_bills: number;
  due_soon: number;
  msme: number;
  msme_urgent: number;
  itc_risk: number;
  paid_this_month: number;
  can: { bills: boolean };
}
export interface Billable {
  po_id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  freight_suggested: number;
  due_date_suggested: string | null;
  lines: { po_item_id: number; product_id: number | null; item_name: string; hsn_code: string | null; unit: string | null; ordered: number; received: number; billed: number; qty: number; rate: number; discount_percent: number; gst_rate: number }[];
}
export interface BillPreview {
  tax_type: TaxType;
  due_date: string | null;
  duplicate: string | null;
  warnings: string[];
  totals: { sub_total: number; discount_amount: number; items_value: number; freight_charges: number; taxable_amount: number; cgst_amount: number; sgst_amount: number; igst_amount: number; round_off: number; grand_total: number };
}
export interface PaymentRow {
  id: number;
  payment_date: string;
  amount: number;
  mode: PaymentMode;
  reference: string | null;
  status: "ACTIVE" | "CANCELLED";
  notes: string | null;
  supplier_id: number;
  supplier_name: string;
  po_id: number | null;
  po_number: string | null;
  paid_from: string | null;
  bills: string | null;
  advance: number;
}
export interface Unpaid {
  supplier: { id: number; name: string; msme: boolean; bank: { name: string | null; account: string; ifsc: string | null; bank: string | null } | null; upi_id: string | null };
  advance: number;
  bills: BillRow[];
}

export const getBills = async (q: { q?: string; status?: string; supplier_id?: number; page?: number; limit?: number }) =>
  body<Paged<BillRow>>(await api.get("/purchase-bills", { params: clean(q) }));
export const getBillSummary = async () => body<BillSummary>(await api.get("/purchase-bills/summary"));
export const getBill = async (id: number) => body<BillDetail>(await api.get(`/purchase-bills/${id}`));
export const getBillable = async (poId: number) => body<Billable>(await api.get("/purchase-bills/billable", { params: { po_id: poId } }));
export const previewBill = async (b: any) => body<BillPreview>(await api.post("/purchase-bills/preview", b));
export const saveBill = async (b: any) => body<BillDetail>(await api.post("/purchase-bills", b));
export const cancelBill = async (id: number, reason: string) => body<BillDetail>(await api.post(`/purchase-bills/${id}/cancel`, { reason }));
export const applyAdvance = async (id: number) => body<BillDetail>(await api.post(`/purchase-bills/${id}/apply-advance`));
export const getUnpaid = async (supplierId: number) => body<Unpaid>(await api.get("/purchase-bills/unpaid", { params: { supplier_id: supplierId } }));
export const getPayments = async (q: { q?: string; supplier_id?: number; page?: number; limit?: number }) =>
  body<Paged<PaymentRow>>(await api.get("/purchase-bills/payments", { params: clean(q) }));
export const pay = async (b: any) => body<{ id: number; advance: number; message: string }>(await api.post("/purchase-bills/payments", b));
export const cancelPayment = async (id: number, reason: string) => body<{ message: string }>(await api.post(`/purchase-bills/payments/${id}/cancel`, { reason }));
