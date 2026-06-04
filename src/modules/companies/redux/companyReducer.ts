import {
  ASYNC_GET_COMPANIES,
  ASYNC_GET_COMPANIES_SUCCESS,
  ASYNC_GET_COMPANIES_FAILED,
  ASYNC_CREATE_COMPANY,
  ASYNC_CREATE_COMPANY_SUCCESS,
  ASYNC_CREATE_COMPANY_FAILED,
  ASYNC_UPDATE_COMPANY,
  ASYNC_UPDATE_COMPANY_SUCCESS,
  ASYNC_UPDATE_COMPANY_FAILED,
  ASYNC_DELETE_COMPANY,
  ASYNC_DELETE_COMPANY_FAILED,
  ASYNC_GET_COMPANY_DETAILS,
  ASYNC_GET_COMPANY_DETAILS_FAILED,
  ASYNC_GET_COMPANY_DETAILS_SUCCESS,
} from "./companyActions";

const initialState = {
  companies: {
    companies: [],
    pagination: {},
  },
  companyDetails: null,
  loading: false,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
  error: null,
};

export const companyReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case ASYNC_GET_COMPANIES:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case ASYNC_GET_COMPANIES_SUCCESS:
      return {
        ...state,
        loading: false,
        companies: action.data,
        error: null,
      };
    case ASYNC_GET_COMPANY_DETAILS:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case ASYNC_GET_COMPANY_DETAILS_SUCCESS:
      return {
        ...state,
        loading: false,
        companyDetails: action.data,
        error: null,
      };
    case ASYNC_GET_COMPANY_DETAILS_FAILED:
      return {
        ...state,
        loading: false,
        error: action.error,
      };
    case ASYNC_GET_COMPANIES_FAILED:
      return {
        ...state,
        loading: false,
        error: action.error,
      };
    case ASYNC_CREATE_COMPANY:
      return {
        ...state,
        createLoading: true,
        error: null,
      };
    case ASYNC_CREATE_COMPANY_SUCCESS:
      return {
        ...state,
        createLoading: false,
        error: null,
      };
    case ASYNC_CREATE_COMPANY_FAILED:
      return {
        ...state,
        createLoading: false,
        error: action.error,
      };
    case ASYNC_UPDATE_COMPANY:
      return {
        ...state,
        updateLoading: true,
        error: null,
      };
    case ASYNC_UPDATE_COMPANY_SUCCESS:
      return {
        ...state,
        updateLoading: false,
        error: null,
      };
    case ASYNC_UPDATE_COMPANY_FAILED:
      return {
        ...state,
        updateLoading: false,
        error: action.error,
      };
    case ASYNC_DELETE_COMPANY:
      return {
        ...state,
        deleteLoading: true,
        error: null,
      };
    case ASYNC_DELETE_COMPANY_FAILED:
      return {
        ...state,
        deleteLoading: false,
        error: action.error,
      };
    default:
      return state;
  }
};
