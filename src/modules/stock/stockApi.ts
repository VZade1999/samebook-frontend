// Stock & warehouses and categories: the calls, their shapes, and the words
// the pages use for each kind of stock change.

import api from "@/api/axios";

export type MovementType = "OPENING" | "RECEIVED" | "COUNTED" | "MOVED" | "DISPATCHED" | "DISPATCH_CANCELLED" | "RECEIVE_CANCELLED";
export type CountReason = "COUNTED" | "DAMAGED" | "LOST" | "FOUND" | "RETURNED" | "OTHER";
export type StockStatus = "out" | "low" | "ok";
export type StockFilter = "all" | "in" | "low" | "out";
export type StockSort = "name" | "stock_high" | "stock_low" | "value";

export interface WarehouseCard {
  id: number;
  name: string;
  known: boolean;
  active: boolean;
  is_default: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
  products: number;
  stocked: number;
  units: number;
  value: number;
  alerts: number;
  last_change: string | null;
  changes_30d: number;
}
export interface WarehouseCards {
  warehouses: WarehouseCard[];
  /** Stock sitting in warehouses that are archived or no longer exist. */
  elsewhere: WarehouseCard[];
  archived: { id: number; name: string }[];
}

export interface StockRow {
  id: number;
  name: string;
  unit: string | null;
  hsn: string | null;
  category_id: number | null;
  category: string | null;
  min: number;
  cost: number;
  total: number;
  value: number;
  status: StockStatus;
  places: { warehouse_id: number; qty: number; bin: string | null }[];
}
export interface StockLevels {
  warehouses: { id: number; name: string; is_default: boolean; active: boolean }[];
  products: StockRow[];
  pagination: { total: number; page: number; limit: number; pages: number };
  stats: { tracked: number; untracked: number; units: number; value: number; priced: number; in_stock: number; low: number; out: number };
}

export interface Movement {
  id: number;
  type: MovementType;
  quantity: number;
  balance_after: number;
  unit_cost?: number | null;
  reason: string | null;
  reference: { type: string; id: number | null; no: string | null } | null;
  batch_id?: string | null;
  note: string | null;
  at: string;
  product?: { id: number; name: string; unit: string | null };
  warehouse: { id: number; name: string } | string | null;
  other_warehouse: string | null;
  by: string | null;
}
export interface History {
  movements: Movement[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface CategoryNode {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  products: number;
  units: number;
  created_at: string | null;
  children: number;
  total: number;
}
export interface CategoryDirectory {
  categories: CategoryNode[];
  total_products: number;
  uncategorised: number;
}

const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== "" && v !== undefined && v !== null));

// ── Stock ──
export const getWarehouseCards = async (): Promise<WarehouseCards> => (await api.get("/stock/warehouses")).data;
export const getLevels = async (q: { search?: string; warehouse?: string; category?: string; status?: StockFilter; sort?: StockSort; page?: number; limit?: number }): Promise<StockLevels> =>
  (await api.get("/stock/levels", { params: clean(q) })).data;
export const getHistory = async (q: { product?: number; warehouse?: number | string; type?: string; search?: string; days?: number; page?: number; limit?: number }): Promise<History> =>
  (await api.get("/stock/history", { params: clean(q) })).data;
export const receiveStock = async (body: { warehouse_id: number; reference_no?: string; note?: string; lines: { product_id: number; qty: number; unit_cost?: number | null }[] }) =>
  (await api.post("/stock/receive", body)).data as { warehouse: string; products: number; units: number };
export const moveStock = async (body: { from_warehouse_id: number; to_warehouse_id: number; note?: string; lines: { product_id: number; qty: number }[] }) =>
  (await api.post("/stock/move", body)).data as { from: string; to: string; products: number; units: number };
export const countStock = async (body: { warehouse_id: number; reason: CountReason; note?: string; lines: { product_id: number; counted: number }[] }) =>
  (await api.post("/stock/count", body)).data as { warehouse: string; counted: number; changed: number };
export const setLocation = async (body: { product_id: number; warehouse_id: number; bin_location?: string | null; remove?: boolean }) => (await api.put("/stock/location", body)).data;

// ── Warehouses ──
export interface WarehouseInput {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  is_default?: boolean;
}
export const createWarehouse = async (w: WarehouseInput) => (await api.post("/warehouses/create", w)).data as { message?: string; data?: { id: number; name: string } };
export const updateWarehouse = async (id: number, w: Partial<WarehouseInput>) => (await api.post(`/warehouses/update/${id}`, w)).data as { message?: string };
export const makeDefaultWarehouse = async (id: number) => (await api.post(`/warehouses/${id}/default`)).data as { message?: string };
export const archiveWarehouse = async (id: number) => (await api.post(`/warehouses/delete/${id}`)).data as { message?: string };

// ── Categories ──
export const getCategoryDirectory = async (): Promise<CategoryDirectory> => (await api.get("/categories/directory")).data;
export const createCategory = async (c: { name: string; description?: string; parent_category_id?: number | null }) =>
  (await api.post("/categories/create", clean(c))).data as { message?: string; data?: { id: number; name: string } };
export const updateCategory = async (id: number, c: { name?: string; description?: string; parent_category_id?: number | null }) =>
  (await api.post(`/categories/update/${id}`, c)).data as { message?: string };
export const removeCategory = async (id: number, moveTo: number | null) => (await api.post(`/categories/${id}/remove`, { move_to: moveTo })).data as { message?: string };
export const bulkCategory = async (ids: number[], categoryId: number | null) =>
  (await api.post("/product/bulk-category", { ids, category_id: categoryId })).data as { updated: number; category: string | null };

/** The server's message, else the fallback. */
export const apiError = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return (Array.isArray(m) ? m.join(". ") : m) || e?.message || fallback;
};

export const REASON_LABEL: Record<CountReason, string> = {
  COUNTED: "Counted",
  DAMAGED: "Damaged",
  LOST: "Lost / missing",
  FOUND: "Found",
  RETURNED: "Returned by customer",
  OTHER: "Correction",
};

/** "+5", "−3" (true minus sign). */
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

/** What a stock change was, in words: a title and the detail under it. */
export function describeMovement(m: Movement): { title: string; detail: string | null } {
  const no = m.reference?.no;
  switch (m.type) {
    case "OPENING":
      return { title: "Opening stock", detail: m.note };
    case "RECEIVED":
      // Goods received against a purchase order (GRN): the note names the PO.
      if (m.reference?.type === "grn") {
        return { title: `Received on ${no || "a GRN"}`, detail: [m.note, m.unit_cost ? `cost ₹${m.unit_cost}` : null].filter(Boolean).join(" · ") || null };
      }
      return {
        title: "Received",
        detail: [no ? `Bill ${no}` : null, m.unit_cost ? `cost ₹${m.unit_cost}` : null, m.note].filter(Boolean).join(" · ") || null,
      };
    case "COUNTED":
      return { title: REASON_LABEL[(m.reason as CountReason) || "COUNTED"] || "Counted", detail: m.note };
    case "MOVED":
      return { title: m.quantity < 0 ? `Moved to ${m.other_warehouse || "another warehouse"}` : `Moved from ${m.other_warehouse || "another warehouse"}`, detail: m.note };
    case "DISPATCHED":
      return { title: m.quantity < 0 ? `Sent on challan ${no || ""}`.trim() : `Arrived on challan ${no || ""}`.trim(), detail: null };
    case "DISPATCH_CANCELLED":
      return { title: `Challan ${no || ""} cancelled`.replace("  ", " "), detail: m.quantity > 0 ? "Stock back" : "Taken back out" };
    case "RECEIVE_CANCELLED":
      return { title: `${no || "Goods received"} undone`, detail: [m.note, m.reason].filter(Boolean).join(" · ") || "Taken back out" };
    default:
      return { title: m.type, detail: m.note };
  }
}

/** "Today, 2:15 pm", "Yesterday", "21 Nov", "5 Jan 2025". */
export const whenText = (v: string | null | undefined) => {
  if (!v) return "—";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  if (!Number.isFinite(d.getTime())) return "—";
  const today = new Date();
  const days = Math.floor((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};
