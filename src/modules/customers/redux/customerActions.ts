export const ASYNC_GET_CUSTOMERS =
  "ASYNC_GET_CUSTOMERS";

export const ASYNC_GET_CUSTOMERS_SUCCESS =
  "ASYNC_GET_CUSTOMERS_SUCCESS";

export const ASYNC_GET_CUSTOMERS_FAILED =
  "ASYNC_GET_CUSTOMERS_FAILED";

// ======================================
// CREATE CUSTOMER
// ======================================

export const ASYNC_CREATE_CUSTOMER =
  "ASYNC_CREATE_CUSTOMER";

export const ASYNC_CREATE_CUSTOMER_SUCCESS =
  "ASYNC_CREATE_CUSTOMER_SUCCESS";

export const ASYNC_CREATE_CUSTOMER_FAILED =
  "ASYNC_CREATE_CUSTOMER_FAILED";

// ======================================
// UPDATE CUSTOMER
// ======================================

export const ASYNC_UPDATE_CUSTOMER =
  "ASYNC_UPDATE_CUSTOMER";

export const ASYNC_UPDATE_CUSTOMER_SUCCESS =
  "ASYNC_UPDATE_CUSTOMER_SUCCESS";

export const ASYNC_UPDATE_CUSTOMER_FAILED =
  "ASYNC_UPDATE_CUSTOMER_FAILED";

// ======================================
// DELETE CUSTOMER
// ======================================

export const ASYNC_DELETE_CUSTOMER =
  "ASYNC_DELETE_CUSTOMER";

export const ASYNC_DELETE_CUSTOMER_SUCCESS =
  "ASYNC_DELETE_CUSTOMER_SUCCESS";

export const ASYNC_DELETE_CUSTOMER_FAILED =
  "ASYNC_DELETE_CUSTOMER_FAILED";

// ======================================
// GET CUSTOMER DETAILS
// ======================================

export const ASYNC_GET_CUSTOMER_DETAILS =
  "ASYNC_GET_CUSTOMER_DETAILS";

export const ASYNC_GET_CUSTOMER_DETAILS_SUCCESS =
  "ASYNC_GET_CUSTOMER_DETAILS_SUCCESS";

export const ASYNC_GET_CUSTOMER_DETAILS_FAILED =
  "ASYNC_GET_CUSTOMER_DETAILS_FAILED";

// ======================================
// ACTIONS
// ======================================

// GET CUSTOMERS

export const getCustomers = (
  payload?: any,
) => {
  return {
    type: ASYNC_GET_CUSTOMERS,

    payload,
  };
};

// CREATE CUSTOMER

export const createCustomer = (
  payload: any,
) => {
  return {
    type: ASYNC_CREATE_CUSTOMER,

    payload,
  };
};

// UPDATE CUSTOMER

export const updateCustomer = (
  payload: any,
) => {
  return {
    type: ASYNC_UPDATE_CUSTOMER,

    payload,
  };
};

// DELETE CUSTOMER

export const deleteCustomer = (
  payload: number,
) => {
  return {
    type: ASYNC_DELETE_CUSTOMER,

    payload,
  };
};

// GET CUSTOMER DETAILS

export const getCustomerDetails = (
  payload: number,
) => {
  return {
    type:
      ASYNC_GET_CUSTOMER_DETAILS,

    payload,
  };
};