// The Products page's calls. The quotation and challan pickers still share
// /product/list; this page reads /product/catalog, which adds how each
// product sells and counts over every product.

import api from "@/api/axios";
import type { Movement } from "@/modules/stock/stockApi";

export type CatalogFilter = "all" | "quoted" | "never" | "no_price" | "no_hsn" | "duplicates" | "low_stock" | "new" | "archived";
export type CatalogSort = "recent" | "name" | "quoted" | "last_quoted" | "price_high" | "price_low";
export type PriceMode = "percent" | "amount" | "set";

export interface CatalogProduct {
  id: number;
  name: string;
  hsn: string | null;
  unit: string | null;
  price: number;
  gst: number;
  cost: number;
  sku: string | null;
  barcode: string | null;
  category_id: number | null;
  category: string | null;
  stock: number;
  min_stock: number;
  description: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
  quoted: number;
  quoted_qty: number;
  customers: number;
  last_quoted: string | null;
  last_rate: number | null;
  invoiced: number;
  sold_qty: number;
  billed: number;
  last_invoiced: string | null;
  challans: number;
  dispatched_qty: number;
  last_dispatched: string | null;
  duplicate: boolean;
  /** Where it's kept: stock per warehouse, with rack / shelf. */
  places: { warehouse_id: number; name: string; qty: number; bin: string | null }[];
}

export interface CatalogStats {
  total: number;
  new_30d: number;
  priced: number;
  with_hsn: number;
  ready: number;
  quoted_90d: number;
  never_used: number;
  no_price: number;
  no_hsn: number;
  duplicates: number;
  tracks_stock: number;
  low_stock: number;
  out_of_stock: number;
  archived: number;
  units: { unit: string; n: number }[];
  categories: { id: number; name: string; n: number }[];
  warehouses: { id: number; name: string; n: number }[];
  unplaced: number;
}

export interface CatalogAccess {
  invoices: boolean;
  money: boolean;
  quotations: boolean;
  challans: boolean;
}

export interface Catalog {
  products: CatalogProduct[];
  pagination: { total: number; page: number; limit: number; pages: number };
  stats: CatalogStats;
  access: CatalogAccess;
}

export interface CatalogQuery {
  search?: string;
  filter?: CatalogFilter;
  unit?: string;
  category?: string;
  warehouse?: string;
  id?: number;
  sort?: CatalogSort;
  page?: number;
  limit?: number;
  all?: 1;
}

export interface ProductActivity {
  access: CatalogAccess;
  quotations: {
    count: number;
    customers: number;
    qty: number;
    rates: { low: number | null; high: number | null; avg: number | null; last: number | null; discount: number | null; discounted: number };
    first: string | null;
    last: string | null;
    buyers: { id: number; name: string; count: number; qty: number; last: string }[];
    recent: {
      id: number;
      number: string;
      date: string;
      status: string;
      invoiced: boolean;
      customer: string | null;
      qty: number;
      unit: string | null;
      rate: number;
      discount: number;
      net_rate: number;
    }[];
  } | null;
  invoices: {
    count: number;
    qty: number;
    amount: number | null;
    last: string | null;
    recent: { id: number; number: string; date: string; status: string; customer: string | null; qty: number; unit: string | null; rate: number }[];
  } | null;
  challans: {
    count: number;
    qty: number;
    recent: { id: number; number: string; date: string; status: string; customer: string | null; qty: number; unit: string | null }[];
  } | null;
  variants: { id: number; sku: string | null; attributes: any; price: number; compare_at_price: number; cost_price: number; is_default: boolean }[];
  images: { id: number; url: string }[];
  /** Stock in each warehouse it's kept in. */
  stock: { warehouse_id: number; name: string; known: boolean; active: boolean; is_default: boolean; qty: number; bin: string | null }[];
  /** Its latest stock changes. */
  history: Movement[];
}

/** What the Add / Edit form sends. */
export interface ProductInput {
  name: string;
  product_code?: string;
  unit?: string;
  price: number;
  tax_percentage?: number;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: number | null;
  cost_price?: number;
  /** Opening stock (Add only — after that, stock changes through Receive / Move / Count). */
  stock_quantity?: number;
  minimum_stock?: number;
  image_url?: string;
  /** Where it's kept (Add only). */
  warehouse_id?: number;
  bin_location?: string;
}

const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export const getCatalog = async (q: CatalogQuery): Promise<Catalog> => (await api.get("/product/catalog", { params: clean(q) })).data;
export const getActivity = async (id: number): Promise<ProductActivity> => (await api.get(`/product/${id}/activity`)).data;
export const nameCheck = async (name: string, except?: number): Promise<{ id: number; name: string } | null> =>
  (await api.get("/product/name-check", { params: clean({ name, except }) })).data?.taken ?? null;
/** The full product (variants, images, stock) — the old shape, used to fill the Edit form. */
export const getProduct = async (id: number): Promise<any> => (await api.get(`/product/${id}`)).data?.data;
export const createProduct = async (p: ProductInput) => (await api.post("/product/create", p)).data as { success?: boolean; message?: string; data?: { id: number } };
export const updateProduct = async (id: number, p: Partial<ProductInput>) => (await api.put(`/product/${id}`, p)).data as { success?: boolean; message?: string };
export const bulkPrice = async (body: { ids: number[]; mode: PriceMode; value: number; round: 0 | 1 | 5 | 10 }) =>
  (await api.post("/product/bulk-price", body)).data as { updated: number; unchanged: number; missing: number };
export const bulkArchive = async (ids: number[]) => (await api.post("/product/bulk-archive", { ids })).data as { archived: number };
export const restoreProduct = async (id: number) => (await api.post(`/product/${id}/restore`)).data as { restored: boolean };
export const getCategories = async (): Promise<{ id: number; name: string }[]> => {
  const d = (await api.get("/categories/list")).data;
  const list = d?.data?.categories ?? d?.data ?? d?.categories ?? d;
  return Array.isArray(list) ? list.map((c: any) => ({ id: Number(c.id), name: String(c.name) })) : [];
};

/** The server's message, else the fallback. */
export const apiError = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return (Array.isArray(m) ? m.join(". ") : m) || e?.message || fallback;
};

/** ₹4,255 or ₹2,404.07 — paise (both digits) only when there are any. */
const wholeFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const paiseFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const rupees = (n: number | null | undefined) => {
  if (n === null || n === undefined) return "—";
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return (Number.isInteger(v) ? wholeFmt : paiseFmt).format(v);
};
/** 12, 2.5, 0.125 — no trailing zeros. */
export const qtyText = (n: number) => String(Math.round((Number(n) || 0) * 1000) / 1000);

/** The same formula the server uses, so the preview matches what gets saved. */
export const newPrice = (old: number, mode: PriceMode, value: number, round: 0 | 1 | 5 | 10) => {
  const base = Number(old) || 0;
  let p = mode === "percent" ? base * (1 + value / 100) : mode === "amount" ? base + value : value;
  p = Math.max(0, p);
  if (round > 0) p = Math.round(p / round) * round;
  return Math.round(p * 100) / 100;
};

/** Selling price less cost, as a share of the selling price. */
export const marginOf = (price: number, cost: number) => (price > 0 && cost > 0 ? ((price - cost) / price) * 100 : null);

/** "23 Nov", "5 Jan 2025" — the year only when it isn't this year. */
export const shortDate = (v: string | null | undefined) => {
  if (!v) return "—";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};

/** "Today", "3 days ago", "2 months ago". */
export const sinceText = (v: string | null | undefined) => {
  if (!v) return "Never";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (!Number.isFinite(days)) return "—";
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

/** A CSV of the given products, Excel-friendly (BOM, quoted cells). */
export const toCsv = (rows: CatalogProduct[], money: boolean) => {
  const head = ["Name", "HSN", "Unit", "Price", "GST %", "Cost", "SKU", "Barcode", "Category", "Stock", "Min stock", "Kept in", "Quoted (quotations)", "Customers", "Last quoted", "Last rate given", "Invoiced", "Qty sold", ...(money ? ["Billed"] : []), "Challans", "Qty dispatched", "Added", "Status"];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((p) =>
    [
      p.name, p.hsn, p.unit, p.price, p.gst, p.cost || "", p.sku, p.barcode, p.category,
      p.min_stock > 0 || p.places.length ? p.stock : "", p.min_stock || "",
      p.places.map((w) => `${w.name}: ${w.qty}${w.bin ? ` (${w.bin})` : ""}`).join("; "),
      p.quoted, p.customers, p.last_quoted, p.last_rate ?? "", p.invoiced, p.sold_qty, ...(money ? [p.billed] : []), p.challans, p.dispatched_qty,
      (p.created_at || "").slice(0, 10), p.active ? "Active" : "Archived",
    ]
      .map(cell)
      .join(","),
  );
  return "﻿" + [head.join(","), ...lines].join("\r\n");
};
