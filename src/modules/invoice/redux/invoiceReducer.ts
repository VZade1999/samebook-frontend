import {
  ASYNC_GET_INVOICES,
  ASYNC_GET_INVOICES_SUCCESS,
  ASYNC_GET_INVOICES_FAILED,

  ASYNC_GET_INVOICE_DETAILS,
  ASYNC_GET_INVOICE_DETAILS_SUCCESS,
  ASYNC_GET_INVOICE_DETAILS_FAILED,

  ASYNC_GENERATE_INVOICE,
  ASYNC_GENERATE_INVOICE_SUCCESS,
  ASYNC_GENERATE_INVOICE_FAILED,

  ASYNC_SEND_INVOICE,
  ASYNC_SEND_INVOICE_SUCCESS,
  ASYNC_SEND_INVOICE_FAILED,

  ASYNC_ADD_PAYMENT,
  ASYNC_ADD_PAYMENT_SUCCESS,
  ASYNC_ADD_PAYMENT_FAILED,

  ASYNC_GET_INVOICE_TIMELINE,
  ASYNC_GET_INVOICE_TIMELINE_SUCCESS,
  ASYNC_GET_INVOICE_TIMELINE_FAILED,
} from './invoiceActions';

const initialState = {
  invoices: [],
  selectedInvoice: null,
  invoiceTimeline: [],
  loading: false,
  detailsLoading: false,
  actionLoading: false,
  error: null,
};

export const invoiceReducer = (
  state = initialState,
  action: any,
) => {
  switch (action.type) {
    case ASYNC_GET_INVOICES:
    case ASYNC_GET_INVOICE_DETAILS:
    case ASYNC_GET_INVOICE_TIMELINE:
      return {
        ...state,
        loading: true,
      };

    case ASYNC_GENERATE_INVOICE:
    case ASYNC_SEND_INVOICE:
    case ASYNC_ADD_PAYMENT:
      return {
        ...state,
        actionLoading: true,
      };

    case ASYNC_GET_INVOICES_SUCCESS:
      return {
        ...state,
        loading: false,
        invoices: action.data,
      };

    case ASYNC_GET_INVOICE_DETAILS_SUCCESS:
      return {
        ...state,
        loading: false,
        selectedInvoice: action.data,
      };

    case ASYNC_GET_INVOICE_TIMELINE_SUCCESS:
      return {
        ...state,
        loading: false,
        invoiceTimeline: action.data,
      };

    case ASYNC_GENERATE_INVOICE_SUCCESS:
    case ASYNC_SEND_INVOICE_SUCCESS:
    case ASYNC_ADD_PAYMENT_SUCCESS:
      return {
        ...state,
        actionLoading: false,
      };

    case ASYNC_GET_INVOICES_FAILED:
    case ASYNC_GET_INVOICE_DETAILS_FAILED:
    case ASYNC_GET_INVOICE_TIMELINE_FAILED:
    case ASYNC_GENERATE_INVOICE_FAILED:
    case ASYNC_SEND_INVOICE_FAILED:
    case ASYNC_ADD_PAYMENT_FAILED:
      return {
        ...state,
        loading: false,
        actionLoading: false,
        error: action.error,
      };

    default:
      return state;
  }
};