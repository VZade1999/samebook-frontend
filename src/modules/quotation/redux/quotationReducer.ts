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
  ASYNC_GET_QUOTATION_LOGS_FAILED,
  ASYNC_GET_QUOTATION_LOGS,
  ASYNC_GET_QUOTATION_LOGS_SUCCESS,
} from './quotationActions';

const initialState = {
  quotations: [],
  selectedQuotation: null,
  quotationHistory: [],
  quotationTimeline: [],
  loading: false,
  detailsLoading: false,
  createLoading: false,
  deleteLoading: false,
  actionLoading: false,
  error: null,
};

export const quotationReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case ASYNC_GET_QUOTATIONS:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case ASYNC_GET_QUOTATIONS_SUCCESS:
      return {
        ...state,
        loading: false,
        quotations: action.data,
        error: null,
      };

    case ASYNC_GET_QUOTATIONS_FAILED:
      return {
        ...state,
        loading: false,
        error: action.error,
      };

    case ASYNC_GET_QUOTATION_DETAILS:
      return {
        ...state,
        detailsLoading: true,
        error: null,
      };

    case ASYNC_GET_QUOTATION_DETAILS_SUCCESS:
      return {
        ...state,
        detailsLoading: false,
        selectedQuotation: action.data,
        error: null,
      };

    case ASYNC_GET_QUOTATION_DETAILS_FAILED:
      return {
        ...state,
        detailsLoading: false,
        error: action.error,
      };

    case ASYNC_GET_QUOTATION_HISTORY:
      return {
        ...state,
        detailsLoading: true,
        error: null,
      };

    case ASYNC_GET_QUOTATION_HISTORY_SUCCESS:
      return {
        ...state,
        detailsLoading: false,
        quotationHistory: action.data,
        error: null,
      };

    case ASYNC_GET_QUOTATION_HISTORY_FAILED:
      return {
        ...state,
        detailsLoading: false,
        error: action.error,
      };

    case ASYNC_GET_QUOTATION_TIMELINE:
      return {
        ...state,
        detailsLoading: true,
        error: null,
      };

    case ASYNC_GET_QUOTATION_TIMELINE_SUCCESS:
      return {
        ...state,
        detailsLoading: false,
        quotationTimeline: action.data,
        error: null,
      };

    case ASYNC_GET_QUOTATION_TIMELINE_FAILED:
      return {
        ...state,
        detailsLoading: false,
        error: action.error,
      };

    case ASYNC_SEND_QUOTATION:
      return {
        ...state,
        actionLoading: true,
        error: null,
      };

    case ASYNC_SEND_QUOTATION_SUCCESS:
      return {
        ...state,
        actionLoading: false,
        error: null,
      };

    case ASYNC_SEND_QUOTATION_FAILED:
      return {
        ...state,
        actionLoading: false,
        error: action.error,
      };

    case ASYNC_CREATE_QUOTATION:
      return {
        ...state,
        createLoading: true,
        error: null,
      };

    case ASYNC_CREATE_QUOTATION_SUCCESS:
      return {
        ...state,
        createLoading: false,
        error: null,
      };

    case ASYNC_CREATE_QUOTATION_FAILED:
      return {
        ...state,
        createLoading: false,
        error: action.error,
      };

    case ASYNC_UPDATE_QUOTATION:
      return {
        ...state,
        createLoading: true,
        error: null,
      };

    case ASYNC_UPDATE_QUOTATION_SUCCESS:
      return {
        ...state,
        createLoading: false,
        error: null,
      };

    case ASYNC_UPDATE_QUOTATION_FAILED:
      return {
        ...state,
        createLoading: false,
        error: action.error,
      };

    case ASYNC_DELETE_QUOTATION:
      return {
        ...state,
        deleteLoading: true,
        error: null,
      };

    case ASYNC_DELETE_QUOTATION_SUCCESS:
      return {
        ...state,
        deleteLoading: false,
        error: null,
      };

    case ASYNC_DELETE_QUOTATION_FAILED:
      return {
        ...state,
        deleteLoading: false,
        error: action.error,
      };

    default:
      return state;
  }
};
