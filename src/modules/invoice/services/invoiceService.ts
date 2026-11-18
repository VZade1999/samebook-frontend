import instance from './instance'

class InvoiceService {
  getInvoices(params?: any) {
    return instance.get('/invoice/list', {
      params,
    });
  }

  /** Payment states, what is owed and how late, six months billed vs collected. */
  getSummary(tz: number = -new Date().getTimezoneOffset()) {
    return instance.get('/invoice/summary', { params: { tz } });
  }

  /** Approved quotations that can become invoices (newest first, up to 50). */
  getEligibleQuotations(search?: string) {
    return instance.get('/invoice/eligible-quotations', { params: search ? { search } : {} });
  }

  getInvoiceDetails(id: number) {
    return instance.get(`/invoice/${id}`);
  }

  generateInvoice(payload: any) {
    return instance.post(`/invoice/generate/${payload.quotation_id}`, {
      ...(payload.invoice_date ? { invoice_date: payload.invoice_date } : {}),
      payment_due_date: payload.payment_due_date,
      ...(payload.series_id ? { series_id: payload.series_id } : {}),
    });
  }

  /** Notes that the invoice was shared with the customer; nothing is emailed. */
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
