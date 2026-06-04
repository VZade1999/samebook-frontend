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
// INITIAL STATE
// ======================================

const initialState = {
  // CUSTOMER LIST

  list: [],

  pagination: {
    total: 0,

    page: 1,

    limit: 10,

    totalPages: 0,

    hasNextPage: false,

    hasPrevPage: false,
  },

  // CUSTOMER DETAILS

  details: null,

  // LOADING STATES

  loading: false,

  createLoading: false,

  updateLoading: false,

  deleteLoading: false,

  detailsLoading: false,

  // ERRORS

  error: null,

  createError: null,

  updateError: null,

  deleteError: null,

  detailsError: null,
};

// ======================================
// REDUCER
// ======================================

export const customerReducer = (
  state = initialState,
  action: any,
) => {
  switch (action.type) {
    // ======================================
    // GET CUSTOMERS
    // ======================================

    case ASYNC_GET_CUSTOMERS:
      return {
        ...state,

        loading: true,

        error: null,
      };

    case ASYNC_GET_CUSTOMERS_SUCCESS:
      return {
        ...state,

        loading: false,

        list:
          action.data
            ?.customers || [],

        pagination:
          action.data
            ?.pagination ||
          initialState.pagination,

        error: null,
      };

    case ASYNC_GET_CUSTOMERS_FAILED:
      return {
        ...state,

        loading: false,

        error:
          action.error ||
          "Failed to fetch customers",
      };

    // ======================================
    // CREATE CUSTOMER
    // ======================================

    case ASYNC_CREATE_CUSTOMER:
      return {
        ...state,

        createLoading: true,

        createError: null,
      };

    case ASYNC_CREATE_CUSTOMER_SUCCESS:
      return {
        ...state,

        createLoading: false,

        createError: null,
      };

    case ASYNC_CREATE_CUSTOMER_FAILED:
      return {
        ...state,

        createLoading: false,

        createError:
          action.error ||
          "Failed to create customer",
      };

    // ======================================
    // UPDATE CUSTOMER
    // ======================================

    case ASYNC_UPDATE_CUSTOMER:
      return {
        ...state,

        updateLoading: true,

        updateError: null,
      };

    case ASYNC_UPDATE_CUSTOMER_SUCCESS:
      return {
        ...state,

        updateLoading: false,

        updateError: null,
      };

    case ASYNC_UPDATE_CUSTOMER_FAILED:
      return {
        ...state,

        updateLoading: false,

        updateError:
          action.error ||
          "Failed to update customer",
      };

    // ======================================
    // DELETE CUSTOMER
    // ======================================

    case ASYNC_DELETE_CUSTOMER:
      return {
        ...state,

        deleteLoading: true,

        deleteError: null,
      };

    case ASYNC_DELETE_CUSTOMER_SUCCESS:
      return {
        ...state,

        deleteLoading: false,

        deleteError: null,
      };

    case ASYNC_DELETE_CUSTOMER_FAILED:
      return {
        ...state,

        deleteLoading: false,

        deleteError:
          action.error ||
          "Failed to delete customer",
      };

    // ======================================
    // GET CUSTOMER DETAILS
    // ======================================

    case ASYNC_GET_CUSTOMER_DETAILS:
      return {
        ...state,

        detailsLoading: true,

        detailsError: null,
      };

    case ASYNC_GET_CUSTOMER_DETAILS_SUCCESS:
      return {
        ...state,

        detailsLoading: false,

        details:
          action.data || null,

        detailsError: null,
      };

    case ASYNC_GET_CUSTOMER_DETAILS_FAILED:
      return {
        ...state,

        detailsLoading: false,

        detailsError:
          action.error ||
          "Failed to fetch customer details",
      };

    // ======================================
    // DEFAULT
    // ======================================

    default:
      return state;
  }
};