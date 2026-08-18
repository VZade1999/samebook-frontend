import api from "@/api/axios";

export const profileService = {
  getProfile: () => api.get("/profile/me"),

  updateProfile: (payload: any) => api.post("/profile/update", payload),
};
