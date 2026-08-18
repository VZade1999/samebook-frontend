import api from "@/api/axios";

export const categoriesService = {
  listCategories: () => api.get("/categories/list"),

  createCategory: (payload: any) => api.post("/categories/create", payload),

  updateCategory: (id: number, payload: any) =>
    api.post(`/categories/update/${id}`, payload),

  deleteCategory: (id: number) => api.post(`/categories/delete/${id}`),
};
