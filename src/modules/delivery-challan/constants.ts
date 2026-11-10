import api from "@/api/axios";
import { StorageService } from "@/storage";
import { CACHE_TTL, cached } from "./cache";

// ─── Enums (must match the backend contract exactly) ─────────────────────────
export const CHALLAN_REASONS = [
  { value: "JOB_WORK", label: "Job Work" },
  { value: "STOCK_TRANSFER", label: "Stock Transfer" },
  { value: "SUPPLY_ON_APPROVAL", label: "Supply on Approval" },
  { value: "PARTIAL_SUPPLY", label: "Partial Supply" },
  { value: "SALE", label: "Sale (goods before invoice)" },
  { value: "EXHIBITION", label: "Exhibition" },
  { value: "REPAIR", label: "Repair" },
  { value: "OTHER", label: "Other" },
];

export const CHALLAN_STATUSES = [
  "DRAFT",
  "DISPATCHED",
  "DELIVERED",
  "INVOICED",
  "CANCELLED",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "default",
  DISPATCHED: "processing",
  DELIVERED: "success",
  INVOICED: "purple",
  CANCELLED: "error",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  INVOICED: "Invoiced",
  CANCELLED: "Cancelled",
};

// Pill colours — same palette as the Invoice / Quotation status pills.
export const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: "#D97706", bg: "#FFFBEB" },
  DISPATCHED: { color: "#0891B2", bg: "#ECFEFF" },
  DELIVERED: { color: "#059669", bg: "#ECFDF5" },
  INVOICED: { color: "#7C3AED", bg: "#F5F3FF" },
  CANCELLED: { color: "#DC2626", bg: "#FEF2F2" },
};

export const statusStyle = (status?: string) =>
  STATUS_STYLE[status || ""] || { color: "#6B7280", bg: "#F3F4F6" };

export const reasonLabel = (reason?: string) =>
  CHALLAN_REASONS.find((r) => r.value === reason)?.label || reason || "-";

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const errorMessage = (err: any, fallback = "Something went wrong") => {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  const msg = err?.response?.data?.message ?? err?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  return msg || fallback;
};

export const parseJson = (value: any): any => {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const addressLines = (addr: any): string[] => {
  const a = parseJson(addr);
  if (!a) return [];
  return [
    a.address_line_1 || a.line_1,
    a.address_line_2 || a.line_2,
    [a.city, a.state].filter(Boolean).join(", "),
    [a.country, a.postal_code].filter(Boolean).join(" - "),
  ].filter(Boolean);
};

export const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatMoney = (value: any) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatQty = (value: any) => {
  const n = Number(value || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, "");
};

// Field names below are read defensively because the backend is built
// concurrently — the contract only promises "warehouse names,
// quotation_number, invoice_number" without fixing their exact keys.
export const fromWarehouseName = (c: any) =>
  c?.from_warehouse_name || c?.from_warehouse?.name || c?.fromWarehouse?.name || null;

export const toWarehouseName = (c: any) =>
  c?.to_warehouse_name || c?.to_warehouse?.name || c?.toWarehouse?.name || null;

export const quotationNumber = (c: any) =>
  c?.quotation_number || c?.quotation?.quotation_number || null;

export const invoiceNumber = (c: any) =>
  c?.invoice_number || c?.invoice?.invoice_number || null;

export const activityOf = (c: any): any[] =>
  c?.activity || c?.activity_logs || c?.activities || [];

export const changedByName = (log: any) => {
  const u = log?.changed_by_user || log?.changedBy || log?.user || (typeof log?.changed_by === "object" ? log.changed_by : null);
  if (u) return `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "";
  return log?.changed_by_name || "";
};

// ─── Consignor (own company) details ─────────────────────────────────────────
// Stored at login; GET /companies/details/:id has the addresses + GSTIN if the
// stored copy is missing them.
// Cached for 10 min per company/user — it is read on every details page, PDF
// and form, but almost never changes.
// Only a successful /companies/details response is cached; when it fails the
// stored login copy is returned uncached, so the next call retries.
export const loadCompanyDetails = async (): Promise<any> => {
  const stored = storedCompany();
  if (!stored?.id || stored?.addresses) return stored || {};
  try {
    const full = await cached("company-details", CACHE_TTL.company, async () => {
      const res = await api.get(`/companies/details/${stored.id}`);
      if (!res?.data?.data) throw new Error("No company details");
      return res.data.data;
    });
    return { ...stored, ...full };
  } catch {
    return stored;
  }
};

const storedCompany = (): any => {
  try {
    const raw = new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const companyAddressLines = (company: any): string[] => {
  const addresses: any[] = Array.isArray(company?.addresses) ? company.addresses : [];
  const addr = addresses.find((a) => a.is_default) || addresses[0];
  if (!addr) {
    // Login copy only carries a flat `address` string (no addresses array)
    // when /companies/details is not accessible (needs companies.view).
    const flat = typeof company?.address === "string" ? company.address.trim() : "";
    return [
      flat,
      [company?.city, company?.state].filter(Boolean).join(", "),
    ].filter(Boolean);
  }
  return [
    addr.line_1 || addr.address_line_1,
    addr.line_2 || addr.address_line_2,
    [addr.city, addr.state].filter(Boolean).join(", "),
    [addr.country, addr.postal_code].filter(Boolean).join(" - "),
  ].filter(Boolean);
};

export const companyGstin = (company: any) =>
  company?.gst_no || company?.gst_number || company?.gstin || "";

export const MISSING_CONSIGNOR_GSTIN =
  "Consignor GSTIN could not be loaded (requires the companies.view permission or a GSTIN on the company profile). Rule 55 requires it on the challan.";

// Warehouse address lines (for stock-transfer consignor/consignee blocks).
// /warehouses/list needs warehouses.view, so this resolves to {} on failure.
// Cached for 5 min per company/user. Throws on failure (and is not cached), so
// the form can still show "Unable to load warehouses".
export const loadWarehouses = (): Promise<any[]> =>
  cached("warehouses", CACHE_TTL.warehouses, async () => {
    const res = await api.get("/warehouses/list");
    return Array.isArray(res?.data?.data) ? res.data.data : [];
  });

export const loadWarehouseMap = async (): Promise<Record<string, any>> => {
  try {
    const list = await loadWarehouses();
    return Object.fromEntries(list.map((w) => [String(w.id), w]));
  } catch {
    return {};
  }
};

export const warehouseAddressLines = (w: any): string[] => {
  if (!w) return [];
  return [
    typeof w.address === "string" ? w.address.trim() : "",
    [w.city, w.state].filter(Boolean).join(", "),
  ].filter(Boolean);
};
