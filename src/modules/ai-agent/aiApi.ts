// AI Assistant: the calls, their shapes, and small helpers the page shares.

import api from "@/api/axios";

export type ActionStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED" | "CANCELLED" | "EXPIRED";
export type RecordType = "customer" | "product" | "quotation" | "challan" | "invoice" | "warehouse" | "company";

export interface AiRecord {
  type: RecordType;
  id: number;
  label: string;
}

export interface AiAction {
  id: number;
  tool: string;
  kind: "read" | "write" | "confirm";
  summary: string;
  details: string[];
  status: ActionStatus;
  result: string | null;
  record: (AiRecord & { link: string }) | null;
  created_at: string;
  decided_at: string | null;
  expires_at: string | null;
  /** Admin activity log only. */
  by?: string | null;
}

export interface AiMessageMeta {
  steps?: string[];
  actions?: number[];
  records?: AiRecord[];
  document?: { name: string };
  error?: boolean;
  /** A line saying how a confirmed / cancelled action ended. */
  outcome?: number;
}

export interface AiMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  meta: AiMessageMeta;
  created_at: string;
  /** Shown while a message is on its way (not saved yet). */
  pending?: boolean;
}

export interface AiChat {
  id: number;
  title: string;
  updated_at: string;
  messages: number;
}

export interface AiSettings {
  allow_changes: boolean;
  daily_limit: number;
}

export interface AiUsage {
  sent: number;
  limit: number;
  left: number;
  blocked: boolean;
}

export interface AiAbility {
  name: string;
  label: string;
  kind: "read" | "write" | "confirm";
  allowed: boolean;
  why?: string;
}

export interface AiMe {
  ready: boolean;
  can: { use: boolean; configure: boolean };
  settings: AiSettings;
  usage: AiUsage;
  abilities: { group: string; items: AiAbility[] }[];
  suggestions: { title: string; prompt: string }[];
}

export interface ChatReply {
  conversation: { id: number; title: string; created: boolean };
  user_message: AiMessage;
  reply: AiMessage & { tokens?: number | null };
  actions: AiAction[];
  usage: AiUsage;
  failed: { code?: string; message: string } | null;
}

export interface AiTeamUsage {
  settings: AiSettings;
  usage: {
    month_start: string | null;
    people: { user_id: number; name: string; messages: number; tokens: number; actions: number; last_at: string | null }[];
    totals: { messages: number; tokens: number; actions: number; people: number };
  };
  recent_actions: AiAction[];
}

/** Minutes east of UTC (the server's "today" follows the person's clock). */
export const tzOffset = () => -new Date().getTimezoneOffset();

const data = <T>(p: Promise<any>): Promise<T> => p.then((r) => r.data?.data as T);

export const getMe = () => data<AiMe>(api.get("/ai-agent/me", { params: { tz: tzOffset() } }));
export const listChats = () => data<AiChat[]>(api.get("/ai-agent/conversations"));
export const getChat = (id: number) =>
  data<{ conversation: { id: number; title: string }; messages: AiMessage[]; actions: AiAction[] }>(api.get(`/ai-agent/conversations/${id}`));
export const renameChat = (id: number, title: string) => data<{ id: number; title: string }>(api.patch(`/ai-agent/conversations/${id}`, { title }));
export const deleteChat = (id: number) => data<{ id: number }>(api.delete(`/ai-agent/conversations/${id}`));

export const sendMessage = (message: string, conversationId: number | null) =>
  data<ChatReply>(api.post("/ai-agent/chat", { message, ...(conversationId ? { conversation_id: conversationId } : {}), tz: tzOffset() }, { timeout: 120_000 }));

export const sendDocument = (file: { base64: string; type: string; name: string }, message: string, conversationId: number | null) =>
  data<ChatReply>(
    api.post(
      "/ai-agent/chat-with-document",
      {
        document: file.base64,
        document_mime_type: file.type,
        document_name: file.name,
        ...(message ? { message } : {}),
        ...(conversationId ? { conversation_id: conversationId } : {}),
        tz: tzOffset(),
      },
      { timeout: 180_000 },
    ),
  );

export const decideAction = (id: number, decision: "confirm" | "cancel") =>
  data<{ action: AiAction; message: AiMessage | null }>(api.post(`/ai-agent/actions/${id}/${decision}`, { tz: tzOffset() }, { timeout: 120_000 }));

export const getTeamUsage = () => data<AiTeamUsage>(api.get("/ai-agent/settings", { params: { tz: tzOffset() } }));
export const saveSettings = (s: Partial<AiSettings>) => data<AiSettings>(api.put("/ai-agent/settings", s));

export const apiError = (e: any, fallback: string) => {
  const m = e?.response?.data?.message;
  if (e?.code === "ECONNABORTED") return "That took too long. Try again.";
  return (Array.isArray(m) ? m.join(". ") : m) || fallback;
};

/** "just now", "5 min ago", "2 h ago", "Yesterday", "12 Nov". */
export const whenText = (iso?: string | null) => {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const s = (Date.now() - t.getTime()) / 1000;
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  const today = new Date();
  const sameDay = t.toDateString() === today.toDateString();
  if (sameDay) return `${Math.round(s / 3600)} h ago`;
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (t.toDateString() === y.toDateString()) return "Yesterday";
  return t.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(t.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) });
};

export const timeText = (iso?: string | null) => {
  if (!iso) return "";
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? "" : t.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
};

/** Minutes left before a waiting action expires. */
export const minutesLeft = (iso?: string | null) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.ceil((t - Date.now()) / 60000));
};

export const RECORD_WORD: Record<RecordType, string> = {
  customer: "Customer",
  product: "Product",
  quotation: "Quotation",
  challan: "Challan",
  invoice: "Invoice",
  warehouse: "Warehouse",
  company: "Company",
};

export const recordLink = (r: AiRecord) => {
  switch (r.type) {
    case "customer":
      return `/app/customers?open=${r.id}`;
    case "product":
      return `/app/products?open=${r.id}`;
    case "quotation":
      return `/app/quotation?open=${r.id}`;
    case "challan":
      return `/app/delivery-challans?open=${r.id}`;
    case "invoice":
      return `/app/invoice?open=${r.id}`;
    case "warehouse":
      return `/app/warehouses?warehouse=${r.id}`;
    default:
      return "/app/companies";
  }
};
