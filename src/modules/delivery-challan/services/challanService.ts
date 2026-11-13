import api from "@/api/axios";

export const challanService = {
  listChallans: (params: any) => api.get("/delivery-challan/list", { params }),

  getChallan: (id: number | string) => api.get(`/delivery-challan/${id}`),

  getQuotationRemaining: (quotationId: number | string) =>
    api.get(`/delivery-challan/quotation/${quotationId}/remaining`),

  createChallan: (payload: any) => api.post("/delivery-challan/create", payload),

  updateChallan: (id: number | string, payload: any) =>
    api.put(`/delivery-challan/${id}`, payload),

  dispatchChallan: (id: number | string) =>
    api.post(`/delivery-challan/${id}/dispatch`),

  deliverChallan: (id: number | string) =>
    api.post(`/delivery-challan/${id}/deliver`),

  cancelChallan: (id: number | string, reason?: string) =>
    api.post(`/delivery-challan/${id}/cancel`, reason ? { reason } : {}),

  convertToInvoice: (id: number | string, payment_due_date: string, series_id?: number) =>
    api.post(`/delivery-challan/${id}/convert-to-invoice`, {
      payment_due_date,
      ...(series_id ? { series_id } : {}),
    }),

  deleteChallan: (id: number | string) => api.delete(`/delivery-challan/${id}`),

  getActivity: (id: number | string) => api.get(`/delivery-challan/${id}/activity`),
};
