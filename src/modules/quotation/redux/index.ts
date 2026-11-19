import instance from './instance';

class QuotationService {
  getQuotationListForInvoice(payload?: any) {
    return instance.get('/quotation/list-for-invoice', {
      params: payload,
    });
  }

    getQuotations(payload?: any) {
    return instance.get('/quotation/list', {
      params: payload,
    });
  }

  /** Close as REJECTED / EXPIRED with a reason and the customer's feedback. */
  closeQuotation(id: number, payload: { outcome: string; reason: string; remark?: string }) {
    return instance.post(`/quotation/${id}/close`, payload);
  }

  reopenQuotation(id: number) {
    return instance.post(`/quotation/${id}/reopen`, {});
  }

  /** Stage totals, pipeline, expiring soon, last 6 months, top customers. */
  getSummary(tz: number = -new Date().getTimezoneOffset()) {
    return instance.get('/quotation/summary', { params: { tz } });
  }

  getQuotationDetails(id: number) {
    return instance.get(`/quotation/${id}`);
  }

  getQuotationHistory(id: number) {
    return instance.get(`/quotation/${id}/history`);
  }

  getQuotationTimeline(id: number) {
    return instance.get(`/quotation/${id}/timeline`);
  }

  sendQuotation(payload: any) {
    console.log('Sending quotation with payload:', payload);
    const { id, user_id } = payload || {};
    return instance.post(`/quotation/${id}/send`, { user_id });
  }

  /** Approve, optionally with the customer's PO number & date. */
  approveQuotation(payload: { id: number; customer_po_number?: string | null; customer_po_date?: string | null }) {
    const { id, customer_po_number, customer_po_date } = payload || ({} as any);
    return instance.post(`/quotation/${id}/approve`, { customer_po_number, customer_po_date });
  }

  /** Add, change or clear the customer's PO on an approved quotation (locks once invoiced). */
  setCustomerPo(id: number, payload: { customer_po_number: string | null; customer_po_date: string | null }) {
    return instance.put(`/quotation/${id}/po`, payload);
  }

  downloadQuotation(id: number) {
    return instance.get(`/quotation/${id}/download`, {
      responseType: 'blob',
    });
  }

  createQuotation(payload: any) {
    return instance.post('/quotation', payload);
  }

  updateQuotation(payload: any) {
    const { id, ...rest } = payload;
    return instance.put(`/quotation/${id}`, rest);
  }

  deleteQuotation(id: any, user_id?: number) {
    return instance.delete(`/quotation/${id}`, {
      data: user_id ? { user_id } : undefined,
    });
  }
}

export default QuotationService;
