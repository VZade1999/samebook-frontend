// The Roles page's calls (the company's own roles; the server checks levels).

import api from "@/api/axios";

export interface RoleView {
  id: number;
  name: string;
  description: string | null;
  level: number;
  is_system: number;
  admin: boolean;
  people: number;
  people_preview: { id: number; name: string }[];
  permissions: string[];
  permission_count: number;
  can_edit: boolean;
  why_not: string | null;
}

export interface CataloguePermission {
  id: number;
  name: string;
  module: string;
  description: string | null;
}

export interface RolesOverview {
  roles: RoleView[];
  catalogue: CataloguePermission[];
  modules: string[];
  me: { id: number; rank: number; admin: boolean; permissions: string[]; can_create: boolean; can_edit: boolean; can_delete: boolean };
}

export const getRoles = async (): Promise<RolesOverview> => (await api.get("/roles/overview")).data;
export const createRole = async (body: { name: string; description?: string; level: number; copy_from?: number | null }) =>
  (await api.post("/roles/create", body)).data as { id: number; message: string };
export const updateRole = async (id: number, body: { name?: string; description?: string; level?: number }) =>
  (await api.put(`/roles/${id}`, body)).data as { message: string };
export const deleteRole = async (id: number) => (await api.delete(`/roles/${id}`)).data as { message: string };
export const setRolePermissions = async (id: number, permissionIds: number[]) =>
  (await api.post(`/roles/${id}/permissions`, { permission_ids: permissionIds })).data as { message: string };

/** Add-on areas and the module that switches them on (permissions of a missing add-on do nothing). */
export const ADD_ON_OF: Record<string, string> = { attendance: "attendance", leave: "attendance", tasks: "tasks", drive: "drive", crm: "crm" };

const ACTION_LABEL: Record<string, string> = { insides: "Insights", ai: "AI" };
export const actionLabel = (name: string) => {
  const a = name.split(".").slice(1).join(" ").replace(/_/g, " ");
  return ACTION_LABEL[a] || a.charAt(0).toUpperCase() + a.slice(1);
};
export const areaLabel = (area: string) =>
  String(area || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAi\b/, "AI")
    .replace(/\bCrm\b/, "CRM");
