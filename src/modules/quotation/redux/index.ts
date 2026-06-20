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

  approveQuotation(payload: any) {
    console.log('Approving quotation with payload:', payload);
    const { id, user_id } = payload || {};
    return instance.post(`/quotation/${id}/approve`, { user_id });
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
