import api from "@/api/axios";
import { tzOffset } from "../constants";

const withTz = (params: Record<string, any> = {}) => ({ tz: tzOffset(), ...params });
const tzParams = () => ({ params: { tz: tzOffset() } });

export const crmService = {
  meta: () => api.get("/crm/meta"),
  summary: () => api.get("/crm/summary", { params: withTz() }),
  overview: (params: Record<string, any>) => api.get("/crm/overview", { params: withTz(params) }),
  pipeline: (params: Record<string, any>) => api.get("/crm/pipeline", { params: withTz(params) }),
  list: (params: Record<string, any>) => api.get("/crm/leads", { params: withTz(params) }),
  duplicates: (params: { phone?: string; email?: string; exclude_id?: number }) => api.get("/crm/leads/duplicates", { params }),
  get: (id: number) => api.get(`/crm/leads/${id}`, tzParams()),
  create: (payload: any) => api.post("/crm/leads", payload, tzParams()),
  update: (id: number, payload: any) => api.patch(`/crm/leads/${id}`, payload, tzParams()),
  remove: (id: number) => api.delete(`/crm/leads/${id}`),
  stage: (id: number, payload: { stage: string; lost_reason?: string; value?: number }) =>
    api.post(`/crm/leads/${id}/stage`, payload, tzParams()),
  assign: (id: number, owner_id: number | null) => api.post(`/crm/leads/${id}/assign`, { owner_id }, tzParams()),
  claim: (id: number) => api.post(`/crm/leads/${id}/claim`, {}, tzParams()),
  followUp: (id: number, at: string | null, note?: string | null) =>
    api.post(`/crm/leads/${id}/follow-up`, { at, ...(note !== undefined ? { note } : {}) }, tzParams()),
  log: (id: number, payload: any) => api.post(`/crm/leads/${id}/activities`, payload, tzParams()),
  matches: (id: number) => api.get(`/crm/leads/${id}/customer-matches`),
  convert: (id: number, payload: any) => api.post(`/crm/leads/${id}/convert`, payload, tzParams()),
  raw: (id: number, enquiryId: number) => api.get(`/crm/leads/${id}/enquiries/${enquiryId}/raw`),
  importRows: (payload: any) => api.post("/crm/leads/import", payload, { timeout: 120_000 }),

  sources: () => api.get("/crm/sources"),
  createSource: (payload: any) => api.post("/crm/sources", payload, { timeout: 60_000 }),
  updateSource: (id: number, payload: any) => api.patch(`/crm/sources/${id}`, payload, { timeout: 60_000 }),
  regenerateSource: (id: number) => api.post(`/crm/sources/${id}/regenerate`),
  syncSource: (id: number) => api.post(`/crm/sources/${id}/sync`, {}, { timeout: 60_000 }),
  removeSource: (id: number) => api.delete(`/crm/sources/${id}`),
  autoSync: () => api.post("/crm/sources/auto-sync", {}, { timeout: 60_000 }),
};

/** The public URL a lead source receives leads on (same origin, through /api). */
export const intakeUrl = (token: string) => `${window.location.origin}/api/crm/intake/${token}`;
