// Who the viewer is in the hierarchy (Super Admin / Admin / level), and how
// role levels are named and coloured everywhere (team, roles, platform).

import { useSelector } from "react-redux";
import { StorageService } from "@/storage";
import { STANDING_STORAGE_KEY } from "@/session/session";

export interface LevelInfo {
  level: number;
  name: string;
  hint: string;
  /** Identity colour (dots, strips) — text stays in normal ink. */
  tone: string;
}

export const LEVELS: Record<number, LevelInfo> = {
  0: { level: 0, name: "Super Admin", hint: "SameBook platform — every company", tone: "#7c3aed" },
  1: { level: 1, name: "Admin", hint: "Top of the company — everything, always", tone: "#4f46e5" },
  2: { level: 2, name: "Manager", hint: "Runs a team", tone: "#0891b2" },
  3: { level: 3, name: "Specialist", hint: "Accounts, sales and similar work", tone: "#0d9488" },
  4: { level: 4, name: "Staff", hint: "Day-to-day work", tone: "#d97706" },
  5: { level: 5, name: "View only", hint: "Can look, but not change", tone: "#64748b" },
};
export const levelInfo = (level: number | null | undefined): LevelInfo =>
  LEVELS[Number(level)] || { level: Number(level) || 99, name: "No role", hint: "No access yet", tone: "#94a3b8" };

/** "SALES" → "Sales", "SUPER_ADMIN" → "Super Admin"; short codes ("CA") and mixed case stay as typed. */
export const roleLabel = (name: string | null | undefined) => {
  const s = String(name || "").trim();
  if (s.length <= 3 || s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

export const initialsOf = (name: string | null | undefined) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "?";

export interface Standing {
  platform: boolean;
  admin: boolean;
  rank: number | null;
  roles: string[];
}

const stored = (): Standing => {
  try {
    const s = JSON.parse(new StorageService().getItem(STANDING_STORAGE_KEY) || "null");
    if (s && typeof s === "object") return { platform: !!s.platform, admin: !!s.admin, rank: s.rank ?? null, roles: Array.isArray(s.roles) ? s.roles : [] };
  } catch {
    // ignore
  }
  return { platform: false, admin: false, rank: null, roles: [] };
};

/** The viewer's standing: the live session first, else what the last sync stored. */
export const useStanding = (): Standing => {
  const s = useSelector((st: any) => st.session);
  if (s?.loaded && s.rank !== null) return { platform: !!s.platform, admin: !!s.admin, rank: s.rank, roles: s.roles || [] };
  return stored();
};

/** "Super Admin · Admin", "Manager", … for the header. */
export const standingLabel = (st: Standing) => {
  const company = st.rank !== null && st.rank < 99 ? (st.admin ? "Admin" : levelInfo(st.rank).name) : null;
  const named = st.roles.filter((r) => r !== "SUPER_ADMIN").map(roleLabel);
  const main = st.admin ? "Admin" : named[0] || company;
  return [st.platform ? "Super Admin" : null, main].filter(Boolean).join(" · ") || "Member";
};
