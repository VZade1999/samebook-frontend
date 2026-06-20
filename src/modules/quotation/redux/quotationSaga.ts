import { call, put, takeLatest } from 'redux-saga/effects';
import QuotationService from '.';
import {
  ASYNC_GET_QUOTATIONS,
  ASYNC_GET_QUOTATIONS_SUCCESS,
  ASYNC_GET_QUOTATIONS_FAILED,
  ASYNC_GET_QUOTATION_DETAILS,
  ASYNC_GET_QUOTATION_DETAILS_SUCCESS,
  ASYNC_GET_QUOTATION_DETAILS_FAILED,
  ASYNC_GET_QUOTATION_HISTORY,
  ASYNC_GET_QUOTATION_HISTORY_SUCCESS,
  ASYNC_GET_QUOTATION_HISTORY_FAILED,
  ASYNC_GET_QUOTATION_TIMELINE,
  ASYNC_GET_QUOTATION_TIMELINE_SUCCESS,
  ASYNC_GET_QUOTATION_TIMELINE_FAILED,
  ASYNC_SEND_QUOTATION,
  ASYNC_SEND_QUOTATION_SUCCESS,
  ASYNC_SEND_QUOTATION_FAILED,
  ASYNC_CREATE_QUOTATION,
  ASYNC_CREATE_QUOTATION_SUCCESS,
  ASYNC_CREATE_QUOTATION_FAILED,
  ASYNC_UPDATE_QUOTATION,
  ASYNC_UPDATE_QUOTATION_SUCCESS,
  ASYNC_UPDATE_QUOTATION_FAILED,
  ASYNC_DELETE_QUOTATION,
  ASYNC_DELETE_QUOTATION_SUCCESS,
  ASYNC_DELETE_QUOTATION_FAILED,
  ASYNC_APPROVE_QUOTATION,
  ASYNC_APPROVE_QUOTATION_SUCCESS,
  ASYNC_APPROVE_QUOTATION_FAILED,
  ASYNC_GET_QUOTATION_LIST_FOR_INVOICE,
  ASYNC_GET_QUOTATION_LIST_FOR_INVOICE_SUCCESS,
  ASYNC_GET_QUOTATION_LIST_FOR_INVOICE_FAILED,
} from './quotationActions';
import { notification } from 'antd';

const quotationService = new QuotationService();

function* getQuotationsSaga(action: any): any {
  try {
    const response = yield call(quotationService.getQuotations, action?.payload);
    if (response.data.success) {
      yield put({
        type: ASYNC_GET_QUOTATIONS_SUCCESS,
        data: response.data.data,
      });
    } else {
      yield put({ type: ASYNC_GET_QUOTATIONS_FAILED, error: response.data?.message });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_GET_QUOTATIONS_FAILED, error: error?.message });
  }
}

function* getQuotationListForInvoiceSaga(action: any): any {
  try {
    const response = yield call(quotationService.getQuotationListForInvoice, action?.payload);
    if (response.data.success) {
      yield put({
        type: ASYNC_GET_QUOTATION_LIST_FOR_INVOICE_SUCCESS,
        data: response.data.data,
      });
    } else {
      yield put({ type: ASYNC_GET_QUOTATION_LIST_FOR_INVOICE_FAILED, error: response.data?.message });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_GET_QUOTATION_LIST_FOR_INVOICE_FAILED, error: error?.message });
  }
}

function* getQuotationDetailsSaga(action: any): any {
  try {
    const response = yield call(quotationService.getQuotationDetails, action?.payload);
    if (response.data.success) {
      yield put({
        type: ASYNC_GET_QUOTATION_DETAILS_SUCCESS,
        data: response.data.data,
      });
    } else {
      notification.error({
        message: 'Quotation Details Failed',
        description: response.data?.message || 'Unable to load quotation details',
      });
      yield put({ type: ASYNC_GET_QUOTATION_DETAILS_FAILED, error: response.data?.message });
    }
  } catch (error: any) {
    notification.error({
      message: 'Quotation Details Failed',
      description: error?.message || 'Unable to load quotation details',
    });
    yield put({ type: ASYNC_GET_QUOTATION_DETAILS_FAILED, error: error?.message });
  }
}

function* getQuotationHistorySaga(action: any): any {
  try {
    const response = yield call(quotationService.getQuotationHistory, action?.payload);
    if (response.data.success) {
      yield put({
        type: ASYNC_GET_QUOTATION_HISTORY_SUCCESS,
        data: response.data.data,
      });
    } else {
      yield put({ type: ASYNC_GET_QUOTATION_HISTORY_FAILED, error: response.data?.message });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_GET_QUOTATION_HISTORY_FAILED, error: error?.message });
  }
}

function* getQuotationTimelineSaga(action: any): any {
  try {
    const response = yield call(quotationService.getQuotationTimeline, action?.payload);
    if (response.data.success) {
      yield put({
        type: ASYNC_GET_QUOTATION_TIMELINE_SUCCESS,
        data: response.data.data,
      });
    } else {
      yield put({ type: ASYNC_GET_QUOTATION_TIMELINE_FAILED, error: response.data?.message });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_GET_QUOTATION_TIMELINE_FAILED, error: error?.message });
  }
}

function* sendQuotationSaga(action: any): any {
  try {
    const response = yield call(quotationService.sendQuotation, action?.payload);
    if (response.data?.success) {
      notification.success({
        message: 'Quotation Sent',
        description: response.data.message,
      });
      yield put({ type: ASYNC_SEND_QUOTATION_SUCCESS });
      yield put({ type: ASYNC_GET_QUOTATIONS });
      if (action?.payload?.id) {
        yield put({ type: ASYNC_GET_QUOTATION_DETAILS, payload: action.payload.id });
      }
    } else {
      notification.error({
        message: 'Send Quotation Failed',
        description: response.data?.message || 'Unable to send quotation',
      });
      yield put({ type: ASYNC_SEND_QUOTATION_FAILED, error: response.data?.message });
    }
  } catch (error: any) {
    notification.error({
      message: 'Send Quotation Failed',
      description: error?.message || 'Unable to send quotation',
    });
    yield put({ type: ASYNC_SEND_QUOTATION_FAILED, error: error?.message });
  }
}

function* approveQuotationSaga(action: any): any {
  try {
    const response = yield call(quotationService.approveQuotation, action?.payload);
    if (response.data?.success) {
      notification.success({
        message: 'Quotation Approved',
        description: response.data.message,
      });
      yield put({ type: ASYNC_APPROVE_QUOTATION_SUCCESS });
      yield put({ type: ASYNC_GET_QUOTATIONS });
      if (action?.payload?.id) {
        yield put({ type: ASYNC_GET_QUOTATION_DETAILS, payload: action.payload.id });
      }
    } else {
      notification.error({
        message: 'Approve Quotation Failed',
        description: response.data?.message || 'Unable to approve quotation',
      });
      yield put({ type: ASYNC_APPROVE_QUOTATION_FAILED, error: response.data?.message });
    }
  } catch (error: any) {
    notification.error({
      message: 'Approve Quotation Failed',
      description: error?.message || 'Unable to approve quotation',
    });
    yield put({ type: ASYNC_APPROVE_QUOTATION_FAILED, error: error?.message });
  }
}



function* createQuotationSaga(action: any): any {
  try {
    const response = yield call(quotationService.createQuotation, action?.payload);
    if (response.data?.success) {
      notification.success({
        message: 'Quotation Created',
        description: response.data.message,
      });
      yield put({ type: ASYNC_CREATE_QUOTATION_SUCCESS });
      yield put({ type: ASYNC_GET_QUOTATIONS });
    } else {
      notification.error({
        message: 'Create Quotation Failed',
        description: response.data?.message || 'Unable to create quotation',
      });
      yield put({ type: ASYNC_CREATE_QUOTATION_FAILED, error: response.data?.message });
    }
  } catch (error: any) {
    notification.error({
      message: 'Create Quotation Failed',
      description: error?.message || 'Unable to create quotation',
    });
    yield put({ type: ASYNC_CREATE_QUOTATION_FAILED, error: error?.message });
  }
}

function* updateQuotationSaga(action: any): any {
  try {
    const response = yield call(quotationService.updateQuotation, action?.payload);

    if (response.data?.success && response.data?.data) {
      notification.success({
        message: 'Quotation Updated',
        description: response.data.message,
      });
      yield put({ type: ASYNC_UPDATE_QUOTATION_SUCCESS });
      yield put({ type: ASYNC_GET_QUOTATIONS });
      if (action?.payload?.id) {
        yield put({ type: ASYNC_GET_QUOTATION_DETAILS, payload: action.payload.id });
      }
    } else {

      notification.error({
        message: 'Update Quotation Failed',
        description: response.data?.message || 'Unable to update quotation',
      });
      yield put({ type: ASYNC_UPDATE_QUOTATION_FAILED, error: response.data?.message });
    }
  } catch (error: any) {

    notification.error({
      message: 'Update Quotation Failed',
      description: error?.message || 'Unable to update quotation',
    });
    yield put({ type: ASYNC_UPDATE_QUOTATION_FAILED, error: error?.message });
  }
}

function* deleteQuotationSaga(action: any): any {
  try {
    const response = yield call(quotationService.deleteQuotation, action?.payload);
    if (response.data?.success) {
      notification.success({
        message: 'Quotation Deleted',
        description: response.data.message,
      });
      yield put({ type: ASYNC_DELETE_QUOTATION_SUCCESS });
      yield put({ type: ASYNC_GET_QUOTATIONS });
    } else {
      notification.error({
        message: 'Delete Quotation Failed',
        description: response.data?.message || 'Unable to delete quotation',
      });
      yield put({ type: ASYNC_DELETE_QUOTATION_FAILED, error: response.data?.message });
    }
  } catch (error: any) {
    notification.error({
      message: 'Delete Quotation Failed',
      description: error?.message || 'Unable to delete quotation',
    });
    yield put({ type: ASYNC_DELETE_QUOTATION_FAILED, error: error?.message });
  }
}

export function* listenGetQuotations() {
  yield takeLatest(ASYNC_GET_QUOTATIONS, getQuotationsSaga);
}

export function* listenGetQuotationListForInvoice() {
  yield takeLatest(ASYNC_GET_QUOTATION_LIST_FOR_INVOICE, getQuotationListForInvoiceSaga);
}

export function* listenGetQuotationDetails() {
  yield takeLatest(ASYNC_GET_QUOTATION_DETAILS, getQuotationDetailsSaga);
}

export function* listenGetQuotationHistory() {
  yield takeLatest(ASYNC_GET_QUOTATION_HISTORY, getQuotationHistorySaga);
}

export function* listenGetQuotationTimeline() {
  yield takeLatest(ASYNC_GET_QUOTATION_TIMELINE, getQuotationTimelineSaga);
}

export function* listenSendQuotation() {
  yield takeLatest(ASYNC_SEND_QUOTATION, sendQuotationSaga);
}

export function* listenApproveQuotation() {
  yield takeLatest(ASYNC_APPROVE_QUOTATION, approveQuotationSaga);
}

export function* listenCreateQuotation() {
  yield takeLatest(ASYNC_CREATE_QUOTATION, createQuotationSaga);
}

export function* listenUpdateQuotation() {
  yield takeLatest(ASYNC_UPDATE_QUOTATION, updateQuotationSaga);
}

export function* listenDeleteQuotation() {
  yield takeLatest(ASYNC_DELETE_QUOTATION, deleteQuotationSaga);
}
