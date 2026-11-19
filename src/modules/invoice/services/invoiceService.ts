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

  /**
   * Invoice from a quotation: `lines` = how much of each line to bill (left
   * out = everything not billed yet). A quotation can have several invoices.
   */
  generateInvoice(payload: any) {
    return instance.post(`/invoice/generate/${payload.quotation_id}`, {
      ...(payload.invoice_date ? { invoice_date: payload.invoice_date } : {}),
      payment_due_date: payload.payment_due_date,
      ...(payload.series_id ? { series_id: payload.series_id } : {}),
      ...(Array.isArray(payload.lines) ? { lines: payload.lines } : {}),
      ...(payload.transport_charges !== undefined && payload.transport_charges !== null ? { transport_charges: payload.transport_charges } : {}),
    });
  }

  /** Invoice from one or more dispatched / delivered challans of one customer. */
  createFromChallans(payload: {
    challan_ids: number[];
    invoice_date?: string;
    payment_due_date: string;
    series_id?: number | string;
    transport_charges?: number | null;
  }) {
    return instance.post('/invoice/from-challans', {
      challan_ids: payload.challan_ids,
      ...(payload.invoice_date ? { invoice_date: payload.invoice_date } : {}),
      payment_due_date: payload.payment_due_date,
      ...(payload.series_id ? { series_id: payload.series_id } : {}),
      ...(payload.transport_charges !== undefined && payload.transport_charges !== null ? { transport_charges: payload.transport_charges } : {}),
    });
  }

  /** What can be billed for a quotation or a challan: lines left, challans waiting. */
  getBillable(params: { quotation_id?: number; challan_id?: number }) {
    return instance.get('/invoice/billable', { params });
  }

  /** The invoice a "Make invoice" would create — nothing is saved. */
  previewBill(body: { challan_ids?: number[]; quotation_id?: number; lines?: { quotation_item_id: number; qty: number }[]; transport_charges?: number | null }, signal?: AbortSignal) {
    return instance.post('/invoice/preview', body, { signal });
  }

  /** Cancel (no payments recorded); its challans go back to "ready to invoice". */
  cancelInvoice(id: number, reason: string) {
    return instance.post(`/invoice/${id}/cancel`, { reason });
  }

  /** Vehicle, transporter, LR and e-way bill of an invoice that travels with the goods ("" clears one). */
  updateDispatch(id: number, body: Partial<Record<"transporter_name" | "vehicle_number" | "lr_number" | "eway_bill_number", string>>) {
    return instance.put(`/invoice/${id}/dispatch`, body);
  }

  /**
   * An invoice without a quotation (a walk-in sale, or challans made without
   * one — pass their ids in `challan_ids` to bill them).
   */
  createDirect(body: any) {
    return instance.post('/invoice/direct', body);
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
