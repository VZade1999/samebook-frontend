import api from "@/api/axios";
import { todayStr } from "../constants";

const withToday = (params: Record<string, any> = {}) => ({ today: todayStr(), ...params });

export const tasksService = {
  meta: () => api.get("/tasks/meta"),
  summary: () => api.get("/tasks/summary", { params: withToday() }),
  list: (params: Record<string, any>) => api.get("/tasks", { params: withToday(params) }),
  get: (id: number) => api.get(`/tasks/${id}`, { params: withToday() }),
  tree: (id: number) => api.get(`/tasks/${id}/tree`, { params: withToday() }),
  epics: (params: Record<string, any> = {}) => api.get("/tasks/epics", { params: withToday(params) }),
  calendar: (params: Record<string, any>) => api.get("/tasks/calendar", { params: withToday(params) }),
  overview: (params: Record<string, any>) => api.get("/tasks/overview", { params: withToday(params) }),
  linkSearch: (type: string, q: string) => api.get("/tasks/link-search", { params: { type, q } }),
  create: (payload: any) => api.post("/tasks", payload),
  update: (id: number, payload: any) => api.patch(`/tasks/${id}`, payload),
  remove: (id: number) => api.delete(`/tasks/${id}`),
  comment: (id: number, body: string) => api.post(`/tasks/${id}/comments`, { body }),
  followUp: (id: number, message?: string) => api.post(`/tasks/${id}/follow-up`, message ? { message } : {}),
};

export const notificationsService = {
  list: (limit = 20) => api.get("/notifications", { params: { limit } }),
  unreadCount: () => api.get("/notifications/unread-count"),
  read: (id: number) => api.post(`/notifications/${id}/read`),
  readAll: () => api.post("/notifications/read-all"),
};
