import api from "@/api/axios";

export interface AttendanceSettingsPayload {
  timezone?: string;
  shift_start?: string; // HH:mm
  shift_end?: string; // HH:mm
  grace_minutes?: number;
  half_day_minutes?: number;
  full_day_minutes?: number;
  weekly_offs?: number[];
}

export const attendanceService = {
  punchIn: (notes?: string) => api.post("/attendance/punch-in", { notes }),

  punchOut: (notes?: string) => api.post("/attendance/punch-out", { notes }),

  getToday: () => api.get("/attendance/today"),

  getHistory: (page: number = 1, limit: number = 20) =>
    api.get(`/attendance/history?page=${page}&limit=${limit}`),

  getTeam: (month: string) => api.get(`/attendance/team?month=${month}`),

  getCalendar: (month?: string) =>
    api.get("/attendance/calendar", { params: month ? { month } : undefined }),

  getTeamToday: () => api.get("/attendance/team/today"),

  getSettings: () => api.get("/attendance/settings"),

  updateSettings: (payload: AttendanceSettingsPayload) => api.put("/attendance/settings", payload),

  getHolidays: (year?: number) =>
    api.get("/attendance/holidays", { params: year ? { year } : undefined }),

  createHoliday: (payload: { holiday_date: string; name: string }) =>
    api.post("/attendance/holidays", payload),

  deleteHoliday: (id: number) => api.delete(`/attendance/holidays/${id}`),
};
