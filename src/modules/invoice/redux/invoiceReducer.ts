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
import { ASYNC_LOGOUT_SUCCESS } from '@/modules/auth/redux/authActions';
import { Bucket, bucketDrop, bucketPut, emptyBucket, isBillingMutation, stableKey } from '@/app/billingCache';

// Browser cache sizes (see app/billingCache.ts for how the cache works).
const LIST_MAX = 15;
const ITEM_MAX = 25;

const initialState = {
  invoices: [] as any,
  selectedInvoice: null as any,
  invoiceTimeline: [] as any[],
  /** List request in flight with nothing (cached) to show yet. */
  loading: false,
  /** Details request in flight with nothing for THIS invoice to show yet. */
  detailsLoading: false,
  actionLoading: false,
  error: null as any,

  // ── stale-while-revalidate cache ──
  listFromCache: false,
  /** The details shown came from the cache; actions wait for fresh data. */
  detailsFromCache: false,
  timelineId: null as string | null,
  cacheGen: 0,
  listCache: emptyBucket() as Bucket,
  detailsCache: emptyBucket() as Bucket,
  timelineCache: emptyBucket() as Bucket,
};

type State = typeof initialState;

const fresh = (state: State, action: any) => action.gen === state.cacheGen;

export const invoiceReducer = (state: State = initialState, action: any): State => {
  // Any successful quotation / invoice / challan change: drop every cached
  // copy (the three are linked). Falls through so the case below still runs.
  if (isBillingMutation(action)) {
    state = {
      ...state,
      cacheGen: state.cacheGen + 1,
      listCache: emptyBucket(),
      detailsCache: emptyBucket(),
      timelineCache: emptyBucket(),
    };
  }

  switch (action.type) {
    case ASYNC_LOGOUT_SUCCESS:
      return { ...initialState, cacheGen: state.cacheGen + 1 };

    // ── List ──────────────────────────────────────────────────────────────
    case ASYNC_GET_INVOICES: {
      const hit = state.listCache.map[stableKey(action.payload)];
      return hit
        ? { ...state, invoices: hit, loading: false, listFromCache: true }
        : { ...state, loading: true, listFromCache: false };
    }

    case ASYNC_GET_INVOICES_SUCCESS:
      return {
        ...state,
        loading: false,
        listFromCache: false,
        invoices: action.data,
        listCache: fresh(state, action) ? bucketPut(state.listCache, action.key, action.data, LIST_MAX) : state.listCache,
      };

    case ASYNC_GET_INVOICES_FAILED:
      return {
        ...state,
        loading: false,
        error: action.error,
        listCache: action.key !== undefined ? bucketDrop(state.listCache, action.key) : state.listCache,
        ...(state.listFromCache ? { invoices: [], listFromCache: false } : {}),
      };

    // ── Details ───────────────────────────────────────────────────────────
    case ASYNC_GET_INVOICE_DETAILS: {
      const id = String(action.payload);
      const hit = state.detailsCache.map[id];
      if (hit) return { ...state, selectedInvoice: hit, detailsFromCache: true, detailsLoading: false };
      // Never show another invoice while this one loads.
      const same = String(state.selectedInvoice?.id) === id;
      return { ...state, detailsLoading: !same, detailsFromCache: false, ...(same ? {} : { selectedInvoice: null }) };
    }

    case ASYNC_GET_INVOICE_DETAILS_SUCCESS:
      return {
        ...state,
        detailsLoading: false,
        detailsFromCache: false,
        selectedInvoice: action.data,
        detailsCache:
          action.data && fresh(state, action)
            ? bucketPut(state.detailsCache, String(action.key), action.data, ITEM_MAX)
            : state.detailsCache,
      };

    case ASYNC_GET_INVOICE_DETAILS_FAILED:
      return {
        ...state,
        detailsLoading: false,
        error: action.error,
        detailsCache: action.key !== undefined ? bucketDrop(state.detailsCache, String(action.key)) : state.detailsCache,
        ...(state.detailsFromCache ? { selectedInvoice: null, detailsFromCache: false } : {}),
      };

    // ── Timeline ──────────────────────────────────────────────────────────
    case ASYNC_GET_INVOICE_TIMELINE: {
      const id = String(action.payload);
      const hit = state.timelineCache.map[id];
      if (hit) return { ...state, invoiceTimeline: hit, timelineId: id };
      return state.timelineId === id ? state : { ...state, invoiceTimeline: [], timelineId: id };
    }

    case ASYNC_GET_INVOICE_TIMELINE_SUCCESS:
      return {
        ...state,
        invoiceTimeline: action.data,
        timelineId: String(action.key),
        timelineCache: fresh(state, action)
          ? bucketPut(state.timelineCache, String(action.key), action.data, ITEM_MAX)
          : state.timelineCache,
      };

    case ASYNC_GET_INVOICE_TIMELINE_FAILED:
      return {
        ...state,
        error: action.error,
        timelineCache: action.key !== undefined ? bucketDrop(state.timelineCache, String(action.key)) : state.timelineCache,
      };

    // ── Mutations (cache clearing happens above) ──────────────────────────
    case ASYNC_GENERATE_INVOICE:
    case ASYNC_SEND_INVOICE:
    case ASYNC_ADD_PAYMENT:
      return { ...state, actionLoading: true };

    case ASYNC_GENERATE_INVOICE_SUCCESS:
    case ASYNC_SEND_INVOICE_SUCCESS:
    case ASYNC_ADD_PAYMENT_SUCCESS:
      return { ...state, actionLoading: false };

    case ASYNC_GENERATE_INVOICE_FAILED:
    case ASYNC_SEND_INVOICE_FAILED:
    case ASYNC_ADD_PAYMENT_FAILED:
      return { ...state, actionLoading: false, error: action.error };

    default:
      return state;
  }
};
