import {
  ASYNC_GET_PRODUCTS,
  ASYNC_GET_PRODUCTS_SUCCESS,
  ASYNC_GET_PRODUCTS_FAILED,
  ASYNC_CREATE_PRODUCT,
  ASYNC_CREATE_PRODUCT_SUCCESS,
  ASYNC_CREATE_PRODUCT_FAILED,
  ASYNC_UPDATE_PRODUCT,
  ASYNC_UPDATE_PRODUCT_SUCCESS,
  ASYNC_UPDATE_PRODUCT_FAILED,
  ASYNC_DELETE_PRODUCT,
  ASYNC_DELETE_PRODUCT_FAILED,
} from "./productActions";

const initialState = {
  products: [],
  loading: false,
  createLoading: false,
  deleteLoading: false,
  deleteError: null,
  error: null,
};

export const productReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case ASYNC_GET_PRODUCTS:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case ASYNC_GET_PRODUCTS_SUCCESS:
      return {
        ...state,
        loading: false,
        products: action.data,
        error: null,
      };

    case ASYNC_GET_PRODUCTS_FAILED:
      return {
        ...state,
        loading: false,
        error: action.error,
      };

    case ASYNC_CREATE_PRODUCT:
      return {
        ...state,
        createLoading: true,
        error: null,
      };

    case ASYNC_CREATE_PRODUCT_SUCCESS:
      return {
        ...state,
        createLoading: false,
        products: state.products,
        error: null,
      };

    case ASYNC_CREATE_PRODUCT_FAILED:
      return {
        ...state,
        createLoading: false,
        error: action.error,
      };

    case ASYNC_UPDATE_PRODUCT:
      return {
        ...state,
        createLoading: true,
        error: null,
      };

    case ASYNC_UPDATE_PRODUCT_SUCCESS:
      return {
        ...state,
        createLoading: false,
        products: state.products,
        error: null,
      };

    case ASYNC_UPDATE_PRODUCT_FAILED:
      return {
        ...state,
        createLoading: false,
        error: action.error,
      };

    case ASYNC_DELETE_PRODUCT:
      return {
        ...state,
        deleteLoading: true,
        deleteError: null,
      };

    case ASYNC_DELETE_PRODUCT_FAILED:
      return {
        ...state,
        deleteLoading: false,
        deleteError:
          typeof action.error === "string"
            ? action.error
            : action.error?.message || "Delete failed",
      };

    default:
      return state;
  }
};
