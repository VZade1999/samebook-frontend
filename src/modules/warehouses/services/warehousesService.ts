import api from "@/api/axios";

export const warehousesService = {
  listWarehouses: () => api.get("/warehouses/list"),

  createWarehouse: (payload: any) => api.post("/warehouses/create", payload),

  updateWarehouse: (id: number, payload: any) =>
    api.post(`/warehouses/update/${id}`, payload),

  deleteWarehouse: (id: number) => api.post(`/warehouses/delete/${id}`),
};
