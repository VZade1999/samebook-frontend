// The Team page's calls. Every change is checked on the server too (you can
// only manage people below you and give roles below your own level).

import api from "@/api/axios";

export interface TeamRole {
  id: number;
  name: string;
  level: number;
  scope?: string;
}

export interface TeamPerson {
  id: number;
  first_name: string | null;
  last_name: string | null;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  reports_to: number | null;
  manager: { id: number; name: string; designation: string | null } | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string | null;
  roles: TeamRole[];
  rank: number;
  admin: boolean;
  platform: boolean;
  direct_reports: number;
  team_size: number;
  is_me: boolean;
  can_manage: boolean;
  why_not: string | null;
}

export interface AssignableRole {
  id: number;
  name: string;
  level: number;
  description: string | null;
  is_system: number;
}

export interface TeamData {
  people: TeamPerson[];
  me: {
    id: number;
    rank: number;
    admin: boolean;
    platform: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_deactivate: boolean;
    team: number[];
    manager_choices: number[];
    assignable_roles: AssignableRole[];
  };
  stats: { active: number; deactivated: number; admins: number; managers: number; departments: number; without_manager: number };
}

export interface PersonInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  designation?: string;
  department?: string;
  reports_to?: number | null;
  role_ids?: number[];
}

/** The server's message (Nest sends a string or a list), else the fallback. */
export const apiError = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(". ");
  return (typeof m === "string" && m) || e?.message || fallback;
};

export const getTeam = async (): Promise<TeamData> => (await api.get("/users/team")).data;
export const createPerson = async (p: PersonInput) => (await api.post("/users/create", p)).data as { id: number; message: string };
export const updatePerson = async (id: number, p: PersonInput) => (await api.put(`/users/${id}`, p)).data as { id: number; message: string };
export const deactivatePerson = async (id: number) => (await api.delete(`/users/${id}`)).data as { message: string; moved: number };
export const activatePerson = async (id: number) => (await api.post(`/users/${id}/activate`)).data as { message: string };

/** "just now", "5 min ago", "3 h ago", "2 days ago", "12 Nov". */
export const ago = (v: string | null | undefined) => {
  if (!v) return "Never";
  const t = new Date(v).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) {
    const d = Math.round(s / 86400);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: s > 86400 * 300 ? "numeric" : undefined });
};

/** Everyone below `id` in the reporting tree. */
export const below = (id: number, people: Pick<TeamPerson, "id" | "reports_to">[]) => {
  const kids = new Map<number, number[]>();
  people.forEach((p) => {
    if (p.reports_to == null) return;
    kids.set(p.reports_to, [...(kids.get(p.reports_to) || []), p.id]);
  });
  const out = new Set<number>();
  const stack = [...(kids.get(id) || [])];
  while (stack.length) {
    const x = stack.pop() as number;
    if (x === id || out.has(x)) continue;
    out.add(x);
    stack.push(...(kids.get(x) || []));
  }
  return out;
};
