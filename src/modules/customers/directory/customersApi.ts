// The Customers page's calls. The list and the quotation / invoice pickers
// still share /customer/list; this page reads /customer/directory, which adds
// billing figures and counts over every customer.

import api from "@/api/axios";

export type CustomerType = "BUSINESS" | "INDIVIDUAL";
export type DirFilter = "all" | "due" | "billed" | "never" | "new" | "incomplete";
export type DirSort = "recent" | "name" | "billed" | "due" | "activity";

export interface DirCustomer {
  id: number;
  type: CustomerType;
  name: string;
  company_name: string | null;
  gst_number: string | null;
  industry: string | null;
  po_required: boolean;
  contact: { name: string; phone: string | null; email: string | null; designation: string | null } | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
  invoices: number;
  billed: number;
  due: number;
  last_invoice: string | null;
  quotations: number;
  last_quotation: string | null;
  challans: number;
  last_challan: string | null;
  last_activity: string | null;
}

export interface DirStats {
  total: number;
  business: number;
  individual: number;
  with_gst: number;
  new_30d: number;
  billed: number;
  never_billed: number;
  due_customers: number;
  due_total: number;
  billed_total: number;
  incomplete: number;
  states: { name: string; count: number }[];
}

export interface DirAccess {
  invoices: boolean;
  money: boolean;
  quotations: boolean;
  challans: boolean;
}

export interface Directory {
  customers: DirCustomer[];
  pagination: { total: number; page: number; limit: number; pages: number };
  stats: DirStats;
  access: DirAccess;
}

export interface DirQuery {
  search?: string;
  type?: CustomerType | "";
  filter?: DirFilter;
  state?: string;
  sort?: DirSort;
  page?: number;
  limit?: number;
  /** One customer by id (for ?open= links). */
  id?: number;
}

export interface Activity {
  access: DirAccess;
  invoices: {
    count: number;
    billed: number | null;
    paid: number | null;
    due: number | null;
    first: string | null;
    last: string | null;
    recent: { id: number; number: string; date: string; total: number; balance: number; status: string }[];
  } | null;
  quotations: {
    count: number;
    open: number;
    approved: number;
    recent: { id: number; number: string; date: string; total: number; status: string; invoiced: boolean }[];
  } | null;
  challans: { count: number; recent: { id: number; number: string; date: string; status: string; qty: number }[] } | null;
}

export const getDirectory = async (q: DirQuery): Promise<Directory> =>
  (await api.get("/customer/directory", { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v !== "" && v !== undefined && v !== null)) })).data;
export const getActivity = async (id: number): Promise<Activity> => (await api.get(`/customer/${id}/activity`)).data;
/** The full customer (contacts, addresses) — what the Edit dialog needs. */
export const getCustomer = async (id: number): Promise<any> => (await api.get(`/customer/${id}`)).data?.data;
export const removeCustomer = async (id: number) => (await api.delete(`/customer/${id}`)).data as { success?: boolean; message?: string };

/** The server's message, else the fallback. */
export const apiError = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  return (Array.isArray(m) ? m.join(". ") : m) || e?.message || fallback;
};

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

/** Digits for tel: / WhatsApp links; Indian 10-digit numbers get 91 in front for WhatsApp. */
export const telOf = (p: string | null | undefined) => String(p || "").replace(/[^\d+]/g, "");
export const waOf = (p: string | null | undefined) => {
  const d = String(p || "").replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  return d;
};
