// Attendance module — shared types, status palette and formatters.
// Times are always rendered in the company timezone returned by the API
// (settings.timezone), never the browser's local zone.

export type DayStatusCode =
  | "PRESENT"
  | "LATE"
  | "HALF_DAY"
  | "ABSENT"
  | "ON_LEAVE"
  | "HALF_DAY_LEAVE"
  | "HOLIDAY"
  | "WEEKLY_OFF"
  | "NOT_MARKED"
  | "UPCOMING"
  | "NA";

export interface AttendanceSettings {
  timezone: string;
  shift_start: string; // HH:mm
  shift_end: string; // HH:mm
  grace_minutes: number;
  half_day_minutes: number;
  full_day_minutes: number;
  weekly_offs: number[];
  shift_minutes: number;
  is_default: boolean;
}

export interface Holiday {
  id: number;
  holiday_date: string; // YYYY-MM-DD
  name: string;
}

export interface DayLeave {
  id: number;
  leave_type: "FULL_DAY" | "HALF_DAY";
  half_day_period: string | null;
}

export interface DayStatus {
  date: string;
  weekday: number;
  status: DayStatusCode;
  punch_in: string | null;
  punch_out: string | null;
  worked_minutes: number;
  late_minutes: number;
  overtime_minutes: number;
  in_progress: boolean;
  missed_punch_out: boolean;
  worked_on_off: boolean;
  holiday_name: string | null;
  leave: DayLeave | null;
}

export interface AttendanceStats {
  working_days: number;
  elapsed_working_days: number;
  present: number;
  late: number;
  half_day: number;
  absent: number;
  on_leave: number;
  holidays: number;
  weekly_offs: number;
  total_worked_minutes: number;
  overtime_minutes: number;
  avg_worked_minutes: number;
  attendance_percent: number;
}

export interface TeamTodayRow {
  user_id: number;
  name: string;
  email: string;
  status: DayStatusCode;
  punch_in: string | null;
  punch_out: string | null;
  worked_minutes: number;
  late_minutes: number;
  in_progress: boolean;
  missed_punch_out: boolean;
  leave: DayLeave | null;
}

export interface TeamTodayCounts {
  total: number;
  present: number;
  late: number;
  half_day: number;
  not_marked: number;
  absent: number;
  on_leave: number;
  half_day_leave: number;
  off: number;
}

// ─── Defaults (mirror the backend defaults when no settings row exists) ─────
export const DEFAULT_SETTINGS: AttendanceSettings = {
  timezone: "Asia/Kolkata",
  shift_start: "09:30",
  shift_end: "18:30",
  grace_minutes: 15,
  half_day_minutes: 240,
  full_day_minutes: 480,
  weekly_offs: [0],
  shift_minutes: 540,
  is_default: true,
};

const num = (v: any, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const hhmm = (v: any, fallback: string) => {
  if (typeof v !== "string") return fallback;
  const m = v.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : fallback;
};

/** Read a settings payload defensively, filling any gaps with defaults. */
export const normalizeSettings = (raw: any): AttendanceSettings => {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const shift_start = hhmm(raw.shift_start, DEFAULT_SETTINGS.shift_start);
  const shift_end = hhmm(raw.shift_end, DEFAULT_SETTINGS.shift_end);
  let weekly_offs: number[] = DEFAULT_SETTINGS.weekly_offs;
  if (Array.isArray(raw.weekly_offs)) weekly_offs = raw.weekly_offs.map(Number).filter((n: number) => n >= 0 && n <= 6);
  else if (typeof raw.weekly_offs === "string")
    weekly_offs = raw.weekly_offs.split(",").filter(Boolean).map(Number).filter((n: number) => n >= 0 && n <= 6);
  return {
    timezone: typeof raw.timezone === "string" && raw.timezone ? raw.timezone : DEFAULT_SETTINGS.timezone,
    shift_start,
    shift_end,
    grace_minutes: num(raw.grace_minutes, DEFAULT_SETTINGS.grace_minutes),
    half_day_minutes: num(raw.half_day_minutes, DEFAULT_SETTINGS.half_day_minutes),
    full_day_minutes: num(raw.full_day_minutes, DEFAULT_SETTINGS.full_day_minutes),
    weekly_offs,
    shift_minutes: num(raw.shift_minutes, toMinutes(shift_end) - toMinutes(shift_start)),
    is_default: !!raw.is_default,
  };
};

export const EMPTY_STATS: AttendanceStats = {
  working_days: 0,
  elapsed_working_days: 0,
  present: 0,
  late: 0,
  half_day: 0,
  absent: 0,
  on_leave: 0,
  holidays: 0,
  weekly_offs: 0,
  total_worked_minutes: 0,
  overtime_minutes: 0,
  avg_worked_minutes: 0,
  attendance_percent: 0,
};

export const normalizeStats = (raw: any): AttendanceStats => {
  const out: any = { ...EMPTY_STATS };
  if (raw && typeof raw === "object") {
    (Object.keys(EMPTY_STATS) as (keyof AttendanceStats)[]).forEach((k) => {
      out[k] = num(raw[k], 0);
    });
  }
  return out;
};

// ─── Status palette ─────────────────────────────────────────────────────────
// Tinted backgrounds use rgba so the cells read correctly in dark mode too.
export interface StatusMeta {
  label: string;
  short: string;
  color: string;
  bg: string;
}

export const STATUS_META: Record<DayStatusCode, StatusMeta> = {
  PRESENT: { label: "Present", short: "P", color: "#059669", bg: "rgba(5,150,105,.13)" },
  LATE: { label: "Late", short: "L", color: "#D97706", bg: "rgba(217,119,6,.14)" },
  HALF_DAY: { label: "Half day", short: "HD", color: "#EA580C", bg: "rgba(234,88,12,.13)" },
  ABSENT: { label: "Absent", short: "A", color: "#DC2626", bg: "rgba(220,38,38,.12)" },
  ON_LEAVE: { label: "On leave", short: "LV", color: "#7C3AED", bg: "rgba(124,58,237,.13)" },
  HALF_DAY_LEAVE: { label: "Half-day leave", short: "½L", color: "#A855F7", bg: "rgba(168,85,247,.13)" },
  HOLIDAY: { label: "Holiday", short: "H", color: "#0891B2", bg: "rgba(8,145,178,.13)" },
  WEEKLY_OFF: { label: "Weekly off", short: "WO", color: "#64748B", bg: "rgba(100,116,139,.12)" },
  NOT_MARKED: { label: "Not marked", short: "–", color: "#6B7280", bg: "rgba(107,114,128,.10)" },
  UPCOMING: { label: "Upcoming", short: "", color: "#9CA3AF", bg: "transparent" },
  NA: { label: "N/A", short: "", color: "#9CA3AF", bg: "transparent" },
};

export const statusMeta = (status?: string): StatusMeta =>
  STATUS_META[(status || "") as DayStatusCode] || { label: status || "—", short: "?", color: "#6B7280", bg: "rgba(107,114,128,.10)" };

export const LEGEND: DayStatusCode[] = [
  "PRESENT",
  "LATE",
  "HALF_DAY",
  "ABSENT",
  "ON_LEAVE",
  "HALF_DAY_LEAVE",
  "HOLIDAY",
  "WEEKLY_OFF",
  "NOT_MARKED",
];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

// ─── Formatters ─────────────────────────────────────────────────────────────
export function toMinutes(hm: string): number {
  const [h, m] = (hm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 465 -> "7h 45m", 45 -> "45m", 0 -> "0m". */
export const fmtMinutes = (mins?: number | null, empty = "0m") => {
  if (mins === null || mins === undefined || !Number.isFinite(Number(mins))) return empty;
  const total = Math.max(0, Math.round(Number(mins)));
  if (total === 0) return empty;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

/** Hours with one decimal, used in dense grids: 465 -> "7.8". */
export const fmtHoursShort = (mins?: number | null) => {
  const n = Number(mins) || 0;
  if (n <= 0) return "";
  return (n / 60).toFixed(1).replace(/\.0$/, "");
};

const safeTz = (tz?: string) => {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
};

/** ISO timestamp -> "09:42 AM" in the company timezone. */
export const fmtTime = (iso?: string | null, tz?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: safeTz(tz) });
};

/** "09:30" -> "9:30 AM". */
export const fmtShiftTime = (hm: string) => {
  const mins = toMinutes(hm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
};

const parts = (date: Date, tz?: string, opts: Intl.DateTimeFormatOptions = {}) => {
  const out: Record<string, string> = {};
  new Intl.DateTimeFormat("en-US", { timeZone: safeTz(tz), ...opts })
    .formatToParts(date)
    .forEach((p) => {
      out[p.type] = p.value;
    });
  return out;
};

/** Current date (YYYY-MM-DD) in the given timezone. */
export const todayInTz = (tz?: string, now: Date = new Date()) => {
  const p = parts(now, tz, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
};

export const monthInTz = (tz?: string, now: Date = new Date()) => todayInTz(tz, now).slice(0, 7);

/** Live clock text in the company timezone. */
export const clockInTz = (now: Date, tz?: string) =>
  now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: safeTz(tz) });

export const longDateInTz = (now: Date, tz?: string) =>
  now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: safeTz(tz) });

/** "YYYY-MM-DD" -> "Mon, 12 Nov" (date-only, no tz shift). */
export const fmtDay = (date: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) => {
  if (!date) return "—";
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
};

/** "YYYY-MM" -> "November 2026". */
export const fmtMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

export const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const daysInMonth = (month: string): string[] => {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
};

/** Monday-first calendar cells for a month; null = padding cell. */
export const monthGrid = (month: string): (string | null)[] => {
  const days = daysInMonth(month);
  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const lead = (firstWeekday + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export const initials = (name?: string, email?: string) => {
  const src = (name || "").trim() || (email || "").trim();
  if (!src) return "?";
  const words = src.split(/[\s@._-]+/).filter(Boolean);
  return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase() || "?";
};

const AVATAR_COLORS = ["#4F46E5", "#0891B2", "#059669", "#D97706", "#DB2777", "#7C3AED", "#2563EB", "#EA580C"];
export const avatarColor = (seed: string | number) => {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

export const leaveLabel = (leave?: DayLeave | null) => {
  if (!leave) return "";
  if (leave.leave_type === "HALF_DAY") return `Half-day leave${leave.half_day_period ? ` (${leave.half_day_period})` : ""}`;
  return "Full-day leave";
};
