import api from "@/api/axios";

export const leaveService = {
  requestLeave: (payload: { from_date: string; to_date: string; reason: string }) =>
    api.post("/leave/request", payload),

  getMyLeaves: () => api.get("/leave/my"),

  getTeamLeaves: (status?: string) =>
    api.get(`/leave/team${status ? `?status=${status}` : ""}`),

  approveLeave: (id: number) => api.post(`/leave/${id}/approve`),

  rejectLeave: (id: number, review_note?: string) =>
    api.post(`/leave/${id}/reject`, { review_note }),
};
