import instance from './instance'

class InvoiceService {
  getInvoices(params?: any) {
    return instance.get('/invoice/list', {
      params,
    });
  }

  getInvoiceDetails(id: number) {
    return instance.get(`/invoice/${id}`);
  }

  generateInvoice(payload: any) {
    return instance.post(`/invoice/generate/${payload.quotation_id}`,{
        quotationId: payload.quottionId,
        invoice_date: payload.invoice_date,
        payment_due_date: payload.payment_due_date
      
    });
  }

  sendInvoice(id: number) {
    return instance.post(`/invoice/${id}/send`);
  }

  addPayment(id: number, payload: any) {
    return instance.post(
      `/invoice/${id}/payments`,
      payload,
    );
  }

  getTimeline(id: number) {
    return instance.get(
      `/invoice/${id}/timeline`,
    );
  }
}

export default InvoiceService;