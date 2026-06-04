import {
  call,
  put,
  takeLatest,
} from "redux-saga/effects";

import { notification } from "antd";

import CustomerService from "./index";

import {
  ASYNC_GET_CUSTOMERS,
  ASYNC_GET_CUSTOMERS_SUCCESS,
  ASYNC_GET_CUSTOMERS_FAILED,

  ASYNC_CREATE_CUSTOMER,
  ASYNC_CREATE_CUSTOMER_SUCCESS,
  ASYNC_CREATE_CUSTOMER_FAILED,

  ASYNC_UPDATE_CUSTOMER,
  ASYNC_UPDATE_CUSTOMER_SUCCESS,
  ASYNC_UPDATE_CUSTOMER_FAILED,

  ASYNC_DELETE_CUSTOMER,
  ASYNC_DELETE_CUSTOMER_SUCCESS,
  ASYNC_DELETE_CUSTOMER_FAILED,

  ASYNC_GET_CUSTOMER_DETAILS,
  ASYNC_GET_CUSTOMER_DETAILS_SUCCESS,
  ASYNC_GET_CUSTOMER_DETAILS_FAILED,
} from "./customerActions";

// ======================================
// SERVICE INSTANCE
// ======================================

const customerService =
  new CustomerService();

// ======================================
// GET CUSTOMERS
// ======================================

function* getCustomersSaga(
  action: any,
): any {
  try {
    const response = yield call(
      customerService.getCustomers,
      action?.payload,
    );

    if (
      response?.data?.success
    ) {
      yield put({
        type:
          ASYNC_GET_CUSTOMERS_SUCCESS,

        data:
          response.data.data,
      });
    } else {
      yield put({
        type:
          ASYNC_GET_CUSTOMERS_FAILED,

        error:
          response?.data
            ?.message ||
          "Failed to fetch customers",
      });
    }
  } catch (error: any) {
    console.error(
      "GET CUSTOMERS ERROR =>",
      error,
    );

    notification.error({
      message:
        "Failed To Fetch Customers",

      description:
        error?.response?.data
          ?.message ||
        "Something went wrong",
    });

    yield put({
      type:
        ASYNC_GET_CUSTOMERS_FAILED,

      error:
        error?.response?.data
          ?.message ||
        "Something went wrong",
    });
  }
}

// ======================================
// CREATE CUSTOMER
// ======================================

function* createCustomerSaga(
  action: any,
): any {
  try {
    const response = yield call(
      customerService.createCustomer,
      action?.payload,
    );

    if (
      response?.data?.success
    ) {
      notification.success({
        message:
          "Customer Created",

        description:
          response?.data
            ?.message,
      });

      yield put({
        type:
          ASYNC_CREATE_CUSTOMER_SUCCESS,

        data:
          response?.data
            ?.data,
      });

      // REFRESH LIST

      yield put({
        type:
          ASYNC_GET_CUSTOMERS,
      });
    } else {
      notification.error({
        message:
          "Create Customer Failed",

        description:
          response?.data
            ?.message,
      });

      yield put({
        type:
          ASYNC_CREATE_CUSTOMER_FAILED,

        error:
          response?.data
            ?.message,
      });
    }
  } catch (error: any) {
    console.error(
      "CREATE CUSTOMER ERROR =>",
      error,
    );

    notification.error({
      message:
        "Create Customer Failed",

      description:
        error?.response?.data
          ?.message ||
        "Something went wrong",
    });

    yield put({
      type:
        ASYNC_CREATE_CUSTOMER_FAILED,

      error:
        error?.response?.data
          ?.message ||
        "Something went wrong",
    });
  }
}

// ======================================
// UPDATE CUSTOMER
// ======================================

function* updateCustomerSaga(
  action: any,
): any {
  try {
    const response = yield call(
      customerService.updateCustomer,
      action?.payload,
    );

    if (
      response?.data?.success
    ) {
      notification.success({
        message:
          "Customer Updated",

        description:
          response?.data
            ?.message,
      });

      yield put({
        type:
          ASYNC_UPDATE_CUSTOMER_SUCCESS,

        data:
          response?.data
            ?.data,
      });

      // REFRESH LIST

      yield put({
        type:
          ASYNC_GET_CUSTOMERS,
      });
    } else {
      notification.error({
        message:
          "Update Customer Failed",

        description:
          response?.data
            ?.message,
      });

      yield put({
        type:
          ASYNC_UPDATE_CUSTOMER_FAILED,

        error:
          response?.data
            ?.message,
      });
    }
  } catch (error: any) {
    console.error(
      "UPDATE CUSTOMER ERROR =>",
      error,
    );

    notification.error({
      message:
        "Update Customer Failed",

      description:
        error?.response?.data
          ?.message ||
        "Something went wrong",
    });

    yield put({
      type:
        ASYNC_UPDATE_CUSTOMER_FAILED,

      error:
        error?.response?.data
          ?.message ||
        "Something went wrong",
    });
  }
}

// ======================================
// DELETE CUSTOMER
// ======================================

function* deleteCustomerSaga(
  action: any,
): any {
  try {
    const response = yield call(
      customerService.deleteCustomer,
      action?.payload,
    );

    if (
      response?.data?.success
    ) {
      notification.success({
        message:
          "Customer Deleted",

        description:
          response?.data
            ?.message,
      });

      yield put({
        type:
          ASYNC_DELETE_CUSTOMER_SUCCESS,
      });

      // REFRESH LIST

      yield put({
        type:
          ASYNC_GET_CUSTOMERS,
      });
    } else {
      notification.error({
        message:
          "Delete Customer Failed",

        description:
          response?.data
            ?.message,
      });

      yield put({
        type:
          ASYNC_DELETE_CUSTOMER_FAILED,

        error:
          response?.data
            ?.message,
      });
    }
  } catch (error: any) {
    console.error(
      "DELETE CUSTOMER ERROR =>",
      error,
    );

    notification.error({
      message:
        "Delete Customer Failed",

      description:
        error?.response?.data
          ?.message ||
        "Something went wrong",
    });

    yield put({
      type:
        ASYNC_DELETE_CUSTOMER_FAILED,

      error:
        error?.response?.data
          ?.message ||
        "Something went wrong",
    });
  }
}

// ======================================
// GET CUSTOMER DETAILS
// ======================================

function* getCustomerDetailsSaga(
  action: any,
): any {
  try {
    const response = yield call(
      customerService.getCustomerDetails,
      action?.payload,
    );

    if (
      response?.data?.success
    ) {
      yield put({
        type:
          ASYNC_GET_CUSTOMER_DETAILS_SUCCESS,

        data:
          response?.data
            ?.data,
      });
    } else {
      yield put({
        type:
          ASYNC_GET_CUSTOMER_DETAILS_FAILED,

        error:
          response?.data
            ?.message,
      });
    }
  } catch (error: any) {
    console.error(
      "GET CUSTOMER DETAILS ERROR =>",
      error,
    );

    notification.error({
      message:
        "Failed To Fetch Customer Details",

      description:
        error?.response?.data
          ?.message ||
        "Something went wrong",
    });

    yield put({
      type:
        ASYNC_GET_CUSTOMER_DETAILS_FAILED,

      error:
        error?.response?.data
          ?.message ||
        "Something went wrong",
    });
  }
}

// ======================================
// WATCHERS
// ======================================

export function* listenGetCustomers() {
  yield takeLatest(
    ASYNC_GET_CUSTOMERS,
    getCustomersSaga,
  );
}

export function* listenCreateCustomer() {
  yield takeLatest(
    ASYNC_CREATE_CUSTOMER,
    createCustomerSaga,
  );
}

export function* listenUpdateCustomer() {
  yield takeLatest(
    ASYNC_UPDATE_CUSTOMER,
    updateCustomerSaga,
  );
}

export function* listenDeleteCustomer() {
  yield takeLatest(
    ASYNC_DELETE_CUSTOMER,
    deleteCustomerSaga,
  );
}

export function* listenGetCustomerDetails() {
  yield takeLatest(
    ASYNC_GET_CUSTOMER_DETAILS,
    getCustomerDetailsSaga,
  );
}