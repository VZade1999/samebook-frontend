// SameBook's platform console calls (Super Admins only; the server checks).

import api from "@/api/axios";

export interface PlatformCompany {
  id: number;
  name: string;
  prefix: string;
  status: "active" | "suspended";
  gst_no: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_active: string | null;
  people: { active: number; total: number };
  documents: { quotations: number; invoices: number; challans: number; invoices_30d: number };
  admins: { id: number; name: string; email: string; last_login: string | null }[];
  add_ons: string[];
  yours: boolean;
}

export interface PlatformOverview {
  companies: { total: number; active: number; suspended: number; without_admin: number; new_30d: number };
  people: { active: number; total: number };
  documents_30d: { quotations: number; invoices: number; challans: number };
  add_ons: { key: string; name: string; companies: number }[];
  super_admins: { id: number; name: string; email: string; company: string | null }[];
}

export interface CompanyDetail extends Omit<PlatformCompany, "people"> {
  people: {
    id: number;
    name: string;
    email: string;
    designation: string | null;
    department: string | null;
    manager: string | null;
    roles: { name: string; level: number; scope: string }[];
    admin: boolean;
    platform: boolean;
    is_active: boolean;
    last_login: string | null;
  }[];
  counts: { active: number; total: number };
  modules: { key: string; name: string; description: string; core: boolean; enabled: boolean; enabled_at: string | null }[];
}

export interface NewAdmin {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  password: string;
}

export const getOverview = async (): Promise<PlatformOverview> => (await api.get("/platform/overview")).data;
export const getCompanies = async (): Promise<PlatformCompany[]> => (await api.get("/platform/companies")).data;
export const getCompany = async (id: number): Promise<CompanyDetail> => (await api.get(`/platform/companies/${id}`)).data;
export const createCompany = async (body: { company_name: string; prefix?: string; admin: NewAdmin }) =>
  (await api.post("/platform/companies", body)).data as { message: string; company: { id: number; name: string } };
export const setCompanyStatus = async (id: number, status: "active" | "suspended") =>
  (await api.put(`/platform/companies/${id}/status`, { status })).data as { message: string };
export const setAddOn = async (id: number, key: string, enabled: boolean) =>
  (await api.put(`/platform/companies/${id}/add-ons/${key}`, { enabled })).data as { message: string };
export const addAdmin = async (id: number, body: { user_id: number } | NewAdmin) =>
  (await api.post(`/platform/companies/${id}/admins`, body)).data as { message: string };
