import { call, put, takeLatest } from 'redux-saga/effects';
import { notification } from 'antd';

import InvoiceService from '../services/invoiceService';

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

const invoiceService = new InvoiceService();

/* ---------------------------------------------------------- */
/* GET INVOICES */
/* ---------------------------------------------------------- */

function* getInvoicesSaga(action: any): any {
  try {
    const response = yield call(
      invoiceService.getInvoices,
      action?.payload,
    );

    if (response.data?.success) {
      yield put({
        type: ASYNC_GET_INVOICES_SUCCESS,
        data: response.data.data,
      });
    } else {
      yield put({
        type: ASYNC_GET_INVOICES_FAILED,
        error: response.data?.message,
      });
    }
  } catch (error: any) {
    yield put({
      type: ASYNC_GET_INVOICES_FAILED,
      error: error?.message,
    });
  }
}

/* ---------------------------------------------------------- */
/* GET INVOICE DETAILS */
/* ---------------------------------------------------------- */

function* getInvoiceDetailsSaga(action: any): any {
  try {
    const response = yield call(
      invoiceService.getInvoiceDetails,
      action.payload,
    );

    if (response.data?.success) {
      yield put({
        type: ASYNC_GET_INVOICE_DETAILS_SUCCESS,
        data: response.data.data,
      });
    } else {
      yield put({
        type: ASYNC_GET_INVOICE_DETAILS_FAILED,
        error: response.data?.message,
      });
    }
  } catch (error: any) {
    yield put({
      type: ASYNC_GET_INVOICE_DETAILS_FAILED,
      error: error?.message,
    });
  }
}

/* ---------------------------------------------------------- */
/* GENERATE INVOICE */
/* ---------------------------------------------------------- */

function* generateInvoiceSaga(action: any): any {
  try {
    const response = yield call(
      invoiceService.generateInvoice,
      action.payload,
    );

    if (response.data?.success) {
      notification.success({
        message: 'Invoice Generated',
        description: response.data.message,
      });

      yield put({
        type: ASYNC_GENERATE_INVOICE_SUCCESS,
      });

      yield put({
        type: ASYNC_GET_INVOICES,
      });
    } else {
      notification.error({
        message: 'Generate Invoice Failed',
        description:
          response.data?.message ||
          'Unable to generate invoice',
      });

      yield put({
        type: ASYNC_GENERATE_INVOICE_FAILED,
        error: response.data?.message,
      });
    }
  } catch (error: any) {
    notification.error({
      message: 'Generate Invoice Failed',
      description:
        error?.message ||
        'Unable to generate invoice',
    });

    yield put({
      type: ASYNC_GENERATE_INVOICE_FAILED,
      error: error?.message,
    });
  }
}

/* ---------------------------------------------------------- */
/* SEND INVOICE */
/* ---------------------------------------------------------- */

function* sendInvoiceSaga(action: any): any {
  try {
    const response = yield call(
      invoiceService.sendInvoice,
      action.payload,
    );

    if (response.data?.success) {
      notification.success({
        message: 'Invoice Sent',
        description: response.data.message,
      });

      yield put({
        type: ASYNC_SEND_INVOICE_SUCCESS,
      });

      yield put({
        type: ASYNC_GET_INVOICE_DETAILS,
        payload: action.payload,
      });
    } else {
      notification.error({
        message: 'Send Invoice Failed',
        description:
          response.data?.message ||
          'Unable to send invoice',
      });

      yield put({
        type: ASYNC_SEND_INVOICE_FAILED,
        error: response.data?.message,
      });
    }
  } catch (error: any) {
    notification.error({
      message: 'Send Invoice Failed',
      description:
        error?.message ||
        'Unable to send invoice',
    });

    yield put({
      type: ASYNC_SEND_INVOICE_FAILED,
      error: error?.message,
    });
  }
}

/* ---------------------------------------------------------- */
/* ADD PAYMENT */
/* ---------------------------------------------------------- */

function* addPaymentSaga(action: any): any {
  try {
    const response = yield call(
      invoiceService.addPayment,
      action.payload.id,
      action.payload,
    );

    if (response.data?.success) {
      notification.success({
        message: 'Payment Added',
        description: response.data.message,
      });

      yield put({
        type: ASYNC_ADD_PAYMENT_SUCCESS,
      });

      yield put({
        type: ASYNC_GET_INVOICE_DETAILS,
        payload: action.payload.id,
      });

      yield put({
        type: ASYNC_GET_INVOICE_TIMELINE,
        payload: action.payload.id,
      });
    } else {
      notification.error({
        message: 'Payment Failed',
        description:
          response.data?.message ||
          'Unable to add payment',
      });

      yield put({
        type: ASYNC_ADD_PAYMENT_FAILED,
        error: response.data?.message,
      });
    }
  } catch (error: any) {
    notification.error({
      message: 'Payment Failed',
      description:
        error?.message ||
        'Unable to add payment',
    });

    yield put({
      type: ASYNC_ADD_PAYMENT_FAILED,
      error: error?.message,
    });
  }
}

/* ---------------------------------------------------------- */
/* TIMELINE */
/* ---------------------------------------------------------- */

function* getInvoiceTimelineSaga(action: any): any {
  try {
    const response = yield call(
      invoiceService.getTimeline,
      action.payload,
    );

    if (response.data?.success) {
      yield put({
        type: ASYNC_GET_INVOICE_TIMELINE_SUCCESS,
        data: response.data.data,
      });
    } else {
      yield put({
        type: ASYNC_GET_INVOICE_TIMELINE_FAILED,
        error: response.data?.message,
      });
    }
  } catch (error: any) {
    yield put({
      type: ASYNC_GET_INVOICE_TIMELINE_FAILED,
      error: error?.message,
    });
  }
}

/* ---------------------------------------------------------- */
/* WATCHERS */
/* ---------------------------------------------------------- */

export function* listenGetInvoices() {
  yield takeLatest(
    ASYNC_GET_INVOICES,
    getInvoicesSaga,
  );
}

export function* listenGetInvoiceDetails() {
  yield takeLatest(
    ASYNC_GET_INVOICE_DETAILS,
    getInvoiceDetailsSaga,
  );
}

export function* listenGenerateInvoice() {
  yield takeLatest(
    ASYNC_GENERATE_INVOICE,
    generateInvoiceSaga,
  );
}

export function* listenSendInvoice() {
  yield takeLatest(
    ASYNC_SEND_INVOICE,
    sendInvoiceSaga,
  );
}

export function* listenAddPayment() {
  yield takeLatest(
    ASYNC_ADD_PAYMENT,
    addPaymentSaga,
  );
}

export function* listenGetInvoiceTimeline() {
  yield takeLatest(
    ASYNC_GET_INVOICE_TIMELINE,
    getInvoiceTimelineSaga,
  );
}