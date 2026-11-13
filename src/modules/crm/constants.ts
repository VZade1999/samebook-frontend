import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/** Fired after any lead changes so badges, boards and lists refresh. */
export const CRM_CHANGED_EVENT = "crm:changed";
export const emitCrmChanged = () => window.dispatchEvent(new Event(CRM_CHANGED_EVENT));

/** Minutes east of UTC, sent with every request so "today" is the user's day. */
export const tzOffset = () => -new Date().getTimezoneOffset();

export type StageKey = "NEW" | "CONTACTED" | "QUALIFIED" | "QUOTED" | "NEGOTIATION" | "WON" | "LOST";

export interface StageDef {
  key: StageKey;
  label: string;
  /** Short description shown as a tooltip on the stepper / board. */
  hint: string;
  color: string;
}

// Ordered hues so the board reads left → right as progress; won is green, lost red.
export const STAGES: StageDef[] = [
  { key: "NEW", label: "New", hint: "Just came in — nobody has spoken to them yet", color: "#64748b" },
  { key: "CONTACTED", label: "Contacted", hint: "We've reached them at least once", color: "#2a78d6" },
  { key: "QUALIFIED", label: "Qualified", hint: "Genuine need, budget and timeline confirmed", color: "#6250d6" },
  { key: "QUOTED", label: "Quoted", hint: "A quotation has been sent", color: "#c98500" },
  { key: "NEGOTIATION", label: "Negotiation", hint: "Discussing price, terms or delivery", color: "#e0622c" },
  { key: "WON", label: "Won", hint: "Order confirmed", color: "#0ca30c" },
  { key: "LOST", label: "Lost", hint: "Didn't work out — the reason is recorded", color: "#d03b3b" },
];
export const STAGE: Record<StageKey, StageDef> = Object.fromEntries(STAGES.map((s) => [s.key, s])) as any;
export const OPEN_STAGES: StageKey[] = ["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "NEGOTIATION"];
export const isOpen = (s?: string | null) => OPEN_STAGES.includes(s as StageKey);

export type SourceKey =
  | "INDIAMART"
  | "WEBSITE"
  | "FACEBOOK"
  | "GOOGLE"
  | "JUSTDIAL"
  | "TRADEINDIA"
  | "WHATSAPP"
  | "PHONE"
  | "WALK_IN"
  | "REFERRAL"
  | "EXHIBITION"
  | "EMAIL"
  | "OTHER";

export const SOURCES: { key: SourceKey; label: string; color: string }[] = [
  { key: "INDIAMART", label: "IndiaMART", color: "#d03b3b" },
  { key: "WEBSITE", label: "Website", color: "#2a78d6" },
  { key: "FACEBOOK", label: "Facebook / Instagram", color: "#6250d6" },
  { key: "GOOGLE", label: "Google Ads", color: "#1baf7a" },
  { key: "JUSTDIAL", label: "JustDial", color: "#eb6834" },
  { key: "TRADEINDIA", label: "TradeIndia", color: "#c98500" },
  { key: "WHATSAPP", label: "WhatsApp", color: "#0ca30c" },
  { key: "PHONE", label: "Phone call", color: "#0891b2" },
  { key: "WALK_IN", label: "Walk-in", color: "#a16207" },
  { key: "REFERRAL", label: "Referral", color: "#db2777" },
  { key: "EXHIBITION", label: "Exhibition", color: "#7c3aed" },
  { key: "EMAIL", label: "Email", color: "#475569" },
  { key: "OTHER", label: "Other", color: "#64748b" },
];
export const SOURCE: Record<string, { key: SourceKey; label: string; color: string }> = Object.fromEntries(
  SOURCES.map((s) => [s.key, s]),
);
export const sourceLabel = (k?: string | null) => (k ? SOURCE[k]?.label ?? k : "—");

export type Rating = "HOT" | "WARM" | "COLD";
export const RATINGS: { key: Rating; label: string; color: string; hint: string }[] = [
  { key: "HOT", label: "Hot", color: "#e0362c", hint: "Ready to buy soon" },
  { key: "WARM", label: "Warm", color: "#d98a00", hint: "Interested, needs nudging" },
  { key: "COLD", label: "Cold", color: "#2a78d6", hint: "Just exploring" },
];
export const RATING: Record<string, (typeof RATINGS)[number]> = Object.fromEntries(RATINGS.map((r) => [r.key, r]));

export type LogType = "CALL" | "WHATSAPP" | "EMAIL" | "MEETING" | "NOTE";
export const LOG_TYPES: { key: LogType; label: string; verb: string }[] = [
  { key: "CALL", label: "Call", verb: "called" },
  { key: "WHATSAPP", label: "WhatsApp", verb: "messaged on WhatsApp" },
  { key: "EMAIL", label: "Email", verb: "emailed" },
  { key: "MEETING", label: "Meeting", verb: "met" },
  { key: "NOTE", label: "Note", verb: "added a note" },
];

export const CALL_OUTCOMES: { key: string; label: string; reached: boolean }[] = [
  { key: "CONNECTED", label: "Spoke to them", reached: true },
  { key: "CALL_BACK", label: "Asked to call back", reached: true },
  { key: "NO_ANSWER", label: "No answer", reached: false },
  { key: "BUSY", label: "Busy", reached: false },
  { key: "SWITCHED_OFF", label: "Switched off", reached: false },
  { key: "WRONG_NUMBER", label: "Wrong number", reached: false },
  { key: "NOT_INTERESTED", label: "Not interested", reached: true },
];
export const OUTCOME_LABEL: Record<string, string> = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.key, o.label]));

export const LOST_REASONS = [
  "Price too high",
  "Bought from someone else",
  "No response",
  "Not interested any more",
  "Requirement doesn't match",
  "Budget or timing",
  "Fake / spam enquiry",
];

export interface UserRef {
  id: number;
  name: string;
}

export interface Lead {
  id: number;
  key: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  alt_phone: string | null;
  email: string | null;
  gst_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  requirement: string | null;
  message: string | null;
  estimated_value: number | null;
  source: SourceKey;
  source_detail: string | null;
  integration: { id: number; name: string; type: string } | null;
  stage: StageKey;
  rating: Rating | null;
  owner: UserRef | null;
  creator: UserRef | null;
  next_follow_up_at: string | null;
  follow_up_note: string | null;
  follow_up_state: "OVERDUE" | "TODAY" | "UPCOMING" | null;
  last_activity_at: string | null;
  first_response_at: string | null;
  received_at: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  customer: { id: number; name: string | null; company_name: string | null } | null;
  converted_at: string | null;
  enquiry_count: number;
  created_at: string;
  updated_at: string;
  can: { work: boolean; assign: boolean; claim: boolean; delete: boolean };
}

export interface Activity {
  id: number;
  type: string;
  outcome: string | null;
  body: string | null;
  meta: any;
  user: UserRef | null;
  created_at: string;
}

export interface Enquiry {
  id: number;
  source: SourceKey;
  source_detail: string | null;
  source_ref: string | null;
  integration: { id: number; name: string; type: string } | null;
  subject: string | null;
  message: string | null;
  received_at: string;
  has_raw: boolean;
}

export interface LeadDetail extends Lead {
  activities: Activity[];
  enquiries: Enquiry[];
  related: { id: number; key: string; stage: StageKey; requirement: string | null; owner: UserRef | null; created_at: string; visible: boolean }[];
  deals: {
    visible: boolean;
    count: number;
    quotations: { id: number; number: string; status: string; total: number; has_invoice: boolean; created_at: string }[];
    suggest_won: { id: number; number: string | null } | null;
  } | null;
}

export interface CrmMeta {
  me: number;
  users: (UserRef & { manager: boolean })[];
  integrations: { id: number; name: string; type: string; is_active: boolean }[];
  can: {
    create: boolean;
    manage: boolean;
    quotations_view: boolean;
    quotations_create: boolean;
    customers_view: boolean;
    customers_create: boolean;
  };
}

export interface CrmSummary {
  open: number;
  overdue: number;
  due_today: number;
  untouched: number;
  pool: number;
}

// ── Formatting helpers ──────────────────────────────────────────────────────

export const initials = (name?: string | null) =>
  (name || "?")
    .replace(/[^A-Za-z0-9ऀ-ॿ ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const AVATAR_COLORS = ["#2a78d6", "#7c3aed", "#0891b2", "#db2777", "#c2410c", "#059669", "#4f46e5", "#a16207"];
export const avatarColor = (seed?: string | number | null) => {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

/** "98765 43210" for Indian mobiles, otherwise as stored. */
export const prettyPhone = (p?: string | null) => (p && /^[6-9]\d{9}$/.test(p) ? `${p.slice(0, 5)} ${p.slice(5)}` : p || "");
export const telHref = (p: string) => `tel:${/^[6-9]\d{9}$/.test(p) ? `+91${p}` : p}`;

export const whatsappHref = (p: string, text?: string) => {
  const digits = /^[6-9]\d{9}$/.test(p) ? `91${p}` : p.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

export const greetingFor = (lead: Pick<Lead, "name" | "requirement">, company?: string | null) => {
  const first = (lead.name || "").split(/\s+/)[0];
  const hello = first && !/buyer|visitor|unnamed/i.test(lead.name) ? `Hi ${first}` : "Hello";
  const about = lead.requirement ? ` regarding your enquiry for ${lead.requirement}` : " regarding your enquiry";
  return `${hello}, this is from ${company || "our team"}${about}.`;
};

export const ago = (iso?: string | null) => (iso ? dayjs(iso).fromNow() : "");

/** "Today, 4:30 PM" / "Tomorrow, 11:00 AM" / "Wed, 18 Nov, 11:00 AM" / "Overdue · 2 days". */
export const whenLabel = (iso?: string | null) => {
  if (!iso) return "";
  const d = dayjs(iso);
  const now = dayjs();
  const time = d.format("h:mm A");
  if (d.isSame(now, "day")) return `Today, ${time}`;
  if (d.isSame(now.add(1, "day"), "day")) return `Tomorrow, ${time}`;
  if (d.isSame(now.subtract(1, "day"), "day")) return `Yesterday, ${time}`;
  if (d.isAfter(now) && d.diff(now, "day") < 6) return d.format("ddd, h:mm A");
  return d.format(d.year() === now.year() ? "D MMM, h:mm A" : "D MMM YYYY, h:mm A");
};

export const overdueBy = (iso: string) => {
  const mins = dayjs().diff(dayjs(iso), "minute");
  if (mins < 60) return `${Math.max(1, mins)} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} hr`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
};

export const errText = (err: any, fallback: string) => {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : m || fallback;
};
