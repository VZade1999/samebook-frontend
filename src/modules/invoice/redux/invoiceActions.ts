export const ASYNC_GET_INVOICES = 'ASYNC_GET_INVOICES';
export const ASYNC_GET_INVOICES_SUCCESS = 'ASYNC_GET_INVOICES_SUCCESS';
export const ASYNC_GET_INVOICES_FAILED = 'ASYNC_GET_INVOICES_FAILED';

export const ASYNC_GET_INVOICE_DETAILS = 'ASYNC_GET_INVOICE_DETAILS';
export const ASYNC_GET_INVOICE_DETAILS_SUCCESS =
  'ASYNC_GET_INVOICE_DETAILS_SUCCESS';
export const ASYNC_GET_INVOICE_DETAILS_FAILED =
  'ASYNC_GET_INVOICE_DETAILS_FAILED';

export const ASYNC_GENERATE_INVOICE = 'ASYNC_GENERATE_INVOICE';
export const ASYNC_GENERATE_INVOICE_SUCCESS =
  'ASYNC_GENERATE_INVOICE_SUCCESS';
export const ASYNC_GENERATE_INVOICE_FAILED =
  'ASYNC_GENERATE_INVOICE_FAILED';

export const ASYNC_SEND_INVOICE = 'ASYNC_SEND_INVOICE';
export const ASYNC_SEND_INVOICE_SUCCESS =
  'ASYNC_SEND_INVOICE_SUCCESS';
export const ASYNC_SEND_INVOICE_FAILED =
  'ASYNC_SEND_INVOICE_FAILED';

export const ASYNC_ADD_PAYMENT = 'ASYNC_ADD_PAYMENT';
export const ASYNC_ADD_PAYMENT_SUCCESS =
  'ASYNC_ADD_PAYMENT_SUCCESS';
export const ASYNC_ADD_PAYMENT_FAILED =
  'ASYNC_ADD_PAYMENT_FAILED';

export const ASYNC_GET_INVOICE_TIMELINE =
  'ASYNC_GET_INVOICE_TIMELINE';
export const ASYNC_GET_INVOICE_TIMELINE_SUCCESS =
  'ASYNC_GET_INVOICE_TIMELINE_SUCCESS';
export const ASYNC_GET_INVOICE_TIMELINE_FAILED =
  'ASYNC_GET_INVOICE_TIMELINE_FAILED';

export const getInvoices = (payload?: any) => ({
  type: ASYNC_GET_INVOICES,
  payload,
});

export const getInvoiceDetails = (payload: number) => ({
  type: ASYNC_GET_INVOICE_DETAILS,
  payload,
});

export const generateInvoice = (payload: any) => ({
  type: ASYNC_GENERATE_INVOICE,
  payload,
});

export const sendInvoice = (payload: any) => ({
  type: ASYNC_SEND_INVOICE,
  payload,
});

export const addInvoicePayment = (payload: any) => ({
  type: ASYNC_ADD_PAYMENT,
  payload,
});

export const getInvoiceTimeline = (payload: number) => ({
  type: ASYNC_GET_INVOICE_TIMELINE,
  payload,
});

export const addPayment = (payload: any) => ({
  type: ASYNC_ADD_PAYMENT,
  payload,
});