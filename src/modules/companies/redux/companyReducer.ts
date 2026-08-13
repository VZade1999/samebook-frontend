import {
  ASYNC_UPDATE_COMPANY,
  ASYNC_UPDATE_COMPANY_SUCCESS,
  ASYNC_UPDATE_COMPANY_FAILED,
  ASYNC_GET_COMPANY_DETAILS,
  ASYNC_GET_COMPANY_DETAILS_FAILED,
  ASYNC_GET_COMPANY_DETAILS_SUCCESS,
} from "./companyActions";

const initialState = {
  companyDetails: null,
  loading: false,
  updateLoading: false,
  error: null,
};

export const companyReducer = (state = initialState, action: any) => {
  switch (action.type) {
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
    default:
      return state;
  }
};
