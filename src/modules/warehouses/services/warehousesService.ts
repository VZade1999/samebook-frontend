import api from "@/api/axios";
import { invalidateCache } from "@/modules/delivery-challan/cache";

// Any warehouse change must drop the Delivery Challan warehouse cache.
const thenInvalidate = <T,>(p: Promise<T>) =>
  p.then((res) => {
    invalidateCache("warehouses");
    return res;
  });

export const warehousesService = {
  listWarehouses: () => api.get("/warehouses/list"),

  createWarehouse: (payload: any) => thenInvalidate(api.post("/warehouses/create", payload)),

  updateWarehouse: (id: number, payload: any) =>
    thenInvalidate(api.post(`/warehouses/update/${id}`, payload)),

  deleteWarehouse: (id: number) => thenInvalidate(api.post(`/warehouses/delete/${id}`)),
};
