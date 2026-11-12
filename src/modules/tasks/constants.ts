import dayjs from "dayjs";

export type TaskType = "EPIC" | "GOAL" | "TASK" | "SUBTASK";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "ON_HOLD";
export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export const TYPE_META: Record<TaskType, { label: string; color: string; bg: string; short: string }> = {
  EPIC: { label: "Epic", color: "#7C3AED", bg: "#F5F3FF", short: "EP" },
  GOAL: { label: "Goal", color: "#059669", bg: "#ECFDF5", short: "GL" },
  TASK: { label: "Task", color: "#2563EB", bg: "#EFF6FF", short: "TK" },
  SUBTASK: { label: "Subtask", color: "#64748B", bg: "#F1F5F9", short: "SB" },
};

export const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  TODO: { label: "To Do", color: "#64748B", bg: "#F1F5F9" },
  IN_PROGRESS: { label: "In Progress", color: "#2563EB", bg: "#EFF6FF" },
  IN_REVIEW: { label: "In Review", color: "#D97706", bg: "#FFFBEB" },
  DONE: { label: "Done", color: "#059669", bg: "#ECFDF5" },
  ON_HOLD: { label: "On Hold", color: "#DC2626", bg: "#FEF2F2" },
};
export const STATUSES = Object.keys(STATUS_META) as TaskStatus[];

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  URGENT: { label: "Urgent", color: "#DC2626" },
  HIGH: { label: "High", color: "#EA580C" },
  NORMAL: { label: "Normal", color: "#2563EB" },
  LOW: { label: "Low", color: "#64748B" },
};
export const PRIORITIES: TaskPriority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];

export const LINK_META: Record<string, { label: string; path: (id: number) => string }> = {
  CUSTOMER: { label: "Customer", path: () => "/app/customers" },
  QUOTATION: { label: "Quotation", path: () => "/app/quotation" },
  INVOICE: { label: "Invoice", path: (id) => `/app/invoice-details/${id}` },
};

export interface UserRef {
  id: number;
  name: string;
}

export interface TaskItem {
  id: number;
  key: string;
  type: TaskType;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  overdue: boolean;
  assignee: UserRef | null;
  creator: UserRef | null;
  parent_id: number | null;
  breadcrumb: { id: number; key: string; type: TaskType; title: string }[];
  progress: { done: number; total: number; percent: number } | null;
  child_count: number;
  link: { type: string; id: number; label: string | null } | null;
  completed_at: string | null;
  created_at: string;
  access: "full" | "read";
  can: {
    edit: boolean;
    status: boolean;
    assign: boolean;
    move: boolean;
    delete: boolean;
    add_child: boolean;
    comment: boolean;
  };
  overdue_items?: number;
  children?: TaskItem[];
}

export const todayStr = () => dayjs().format("YYYY-MM-DD");

export const fmtDue = (t: { due_date: string | null; due_time?: string | null }) => {
  if (!t.due_date) return "No date";
  const d = dayjs(t.due_date);
  const today = dayjs().startOf("day");
  const diff = d.diff(today, "day");
  const base =
    diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : d.format(d.year() === today.year() ? "DD MMM" : "DD MMM YYYY");
  return t.due_time ? `${base}, ${t.due_time}` : base;
};

export const fmtDateTime = (v?: string | null) => (v ? dayjs(v).format("DD MMM YYYY, hh:mm A") : "");

export const initials = (name?: string | null) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const errText = (err: any, fallback = "Something went wrong") => {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : m || err?.message || fallback;
};

/** Fired after any task mutation so badges/lists can refresh. */
export const TASKS_CHANGED_EVENT = "samebook:tasks-changed";
export const emitTasksChanged = () => window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT));
