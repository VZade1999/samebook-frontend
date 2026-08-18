import api from "@/api/axios";

export const attendanceService = {
  punchIn: (notes?: string) => api.post("/attendance/punch-in", { notes }),

  punchOut: (notes?: string) => api.post("/attendance/punch-out", { notes }),

  getToday: () => api.get("/attendance/today"),

  getHistory: (page: number = 1, limit: number = 20) =>
    api.get(`/attendance/history?page=${page}&limit=${limit}`),

  getTeam: (month: string) => api.get(`/attendance/team?month=${month}`),
};
