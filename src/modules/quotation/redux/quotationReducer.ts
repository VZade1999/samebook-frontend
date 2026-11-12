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
} from './quotationActions';
import { ASYNC_LOGOUT_SUCCESS } from '@/modules/auth/redux/authActions';
import { Bucket, bucketDrop, bucketPut, emptyBucket, isBillingMutation, stableKey } from '@/app/billingCache';

// Browser cache sizes (see app/billingCache.ts for how the cache works).
const LIST_MAX = 15;
const ITEM_MAX = 25;

const EMPTY_LIST = { rows: [], pagination: {}, statusCounts: {} };

const initialState = {
  // Shape matches what ASYNC_GET_QUOTATIONS_SUCCESS actually sets
  // (action.data === { rows, pagination, statusCounts }).
  quotations: EMPTY_LIST as any,
  selectedQuotation: null as any,
  quotationHistory: [] as any[],
  quotationTimeline: [] as any[],
  loading: false,
  detailsLoading: false,
  createLoading: false,
  deleteLoading: false,
  actionLoading: false,
  error: null as any,

  // ── stale-while-revalidate cache ──
  /** Rows on screen came from the cache; a fresh request is running. */
  listFromCache: false,
  /** The details shown came from the cache; never edit/act on them. */
  detailsFromCache: false,
  cacheGen: 0,
  listCache: emptyBucket() as Bucket,
  detailsCache: emptyBucket() as Bucket,
  historyCache: emptyBucket() as Bucket,
  timelineCache: emptyBucket() as Bucket,
};

type State = typeof initialState;

const fresh = (state: State, action: any) => action.gen === state.cacheGen;
const idKey = (payload: any) => String(payload?.id ?? payload);

export const quotationReducer = (state: State = initialState, action: any): State => {
  // Any successful quotation / invoice / challan change: drop every cached
  // copy (the three are linked). Falls through so the case below still runs.
  if (isBillingMutation(action)) {
    state = {
      ...state,
      cacheGen: state.cacheGen + 1,
      listCache: emptyBucket(),
      detailsCache: emptyBucket(),
      historyCache: emptyBucket(),
      timelineCache: emptyBucket(),
    };
  }

  switch (action.type) {
    case ASYNC_LOGOUT_SUCCESS:
      // Logout is client-side (no reload): forget everything, keep counting
      // generations so in-flight requests of the old session are never cached.
      return { ...initialState, cacheGen: state.cacheGen + 1 };

    // ── List ──────────────────────────────────────────────────────────────
    case ASYNC_GET_QUOTATIONS: {
      const hit = state.listCache.map[stableKey(action.payload)];
      return hit
        ? { ...state, quotations: hit, loading: false, listFromCache: true, error: null }
        : { ...state, loading: true, listFromCache: false, error: null };
    }

    case ASYNC_GET_QUOTATIONS_SUCCESS:
      return {
        ...state,
        loading: false,
        listFromCache: false,
        quotations: action.data,
        error: null,
        listCache: fresh(state, action) ? bucketPut(state.listCache, action.key, action.data, LIST_MAX) : state.listCache,
      };

    case ASYNC_GET_QUOTATIONS_FAILED:
      return {
        ...state,
        loading: false,
        error: action.error,
        // A failed refresh must not leave cached rows on screen (e.g. 403).
        listCache: action.key !== undefined ? bucketDrop(state.listCache, action.key) : state.listCache,
        ...(state.listFromCache ? { quotations: EMPTY_LIST, listFromCache: false } : {}),
      };

    // ── Details ───────────────────────────────────────────────────────────
    case ASYNC_GET_QUOTATION_DETAILS: {
      const id = idKey(action.payload);
      const hit = state.detailsCache.map[id];
      const showingOther = String(state.selectedQuotation?.id) !== id;
      return {
        ...state,
        detailsLoading: true,
        error: null,
        ...(hit && showingOther ? { selectedQuotation: hit, detailsFromCache: true } : {}),
      };
    }

    case ASYNC_GET_QUOTATION_DETAILS_SUCCESS:
      return {
        ...state,
        detailsLoading: false,
        detailsFromCache: false,
        selectedQuotation: action.data,
        error: null,
        detailsCache:
          action.data && fresh(state, action)
            ? bucketPut(state.detailsCache, String(action.key), action.data, ITEM_MAX)
            : state.detailsCache,
      };

    case ASYNC_GET_QUOTATION_DETAILS_FAILED:
      // Never keep showing a cached copy of something the server refused.
      return {
        ...state,
        detailsLoading: false,
        error: action.error,
        detailsCache: action.key !== undefined ? bucketDrop(state.detailsCache, String(action.key)) : state.detailsCache,
        ...(state.detailsFromCache ? { selectedQuotation: null, detailsFromCache: false } : {}),
      };

    // ── History / timeline (per quotation) ────────────────────────────────
    case ASYNC_GET_QUOTATION_HISTORY: {
      const hit = state.historyCache.map[idKey(action.payload)];
      return { ...state, detailsLoading: true, error: null, ...(hit ? { quotationHistory: hit } : {}) };
    }

    case ASYNC_GET_QUOTATION_HISTORY_SUCCESS:
      return {
        ...state,
        detailsLoading: false,
        quotationHistory: action.data,
        error: null,
        historyCache: fresh(state, action)
          ? bucketPut(state.historyCache, String(action.key), action.data, ITEM_MAX)
          : state.historyCache,
      };

    case ASYNC_GET_QUOTATION_HISTORY_FAILED:
      return {
        ...state,
        detailsLoading: false,
        error: action.error,
        historyCache: action.key !== undefined ? bucketDrop(state.historyCache, String(action.key)) : state.historyCache,
      };

    case ASYNC_GET_QUOTATION_TIMELINE: {
      const hit = state.timelineCache.map[idKey(action.payload)];
      return { ...state, detailsLoading: true, error: null, ...(hit ? { quotationTimeline: hit } : {}) };
    }

    case ASYNC_GET_QUOTATION_TIMELINE_SUCCESS:
      return {
        ...state,
        detailsLoading: false,
        quotationTimeline: action.data,
        error: null,
        timelineCache: fresh(state, action)
          ? bucketPut(state.timelineCache, String(action.key), action.data, ITEM_MAX)
          : state.timelineCache,
      };

    case ASYNC_GET_QUOTATION_TIMELINE_FAILED:
      return {
        ...state,
        detailsLoading: false,
        error: action.error,
        timelineCache: action.key !== undefined ? bucketDrop(state.timelineCache, String(action.key)) : state.timelineCache,
      };

    // ── Mutations (cache clearing happens above) ──────────────────────────
    case ASYNC_SEND_QUOTATION:
      return { ...state, actionLoading: true, error: null };
    case ASYNC_SEND_QUOTATION_SUCCESS:
      return { ...state, actionLoading: false, error: null };
    case ASYNC_SEND_QUOTATION_FAILED:
      return { ...state, actionLoading: false, error: action.error };

    case ASYNC_CREATE_QUOTATION:
      return { ...state, createLoading: true, error: null };
    case ASYNC_CREATE_QUOTATION_SUCCESS:
      return { ...state, createLoading: false, error: null };
    case ASYNC_CREATE_QUOTATION_FAILED:
      return { ...state, createLoading: false, error: action.error };

    case ASYNC_UPDATE_QUOTATION:
      return { ...state, createLoading: true, error: null };
    case ASYNC_UPDATE_QUOTATION_SUCCESS:
      return { ...state, createLoading: false, error: null };
    case ASYNC_UPDATE_QUOTATION_FAILED:
      return { ...state, createLoading: false, error: action.error };

    case ASYNC_DELETE_QUOTATION:
      return { ...state, deleteLoading: true, error: null };
    case ASYNC_DELETE_QUOTATION_SUCCESS:
      return { ...state, deleteLoading: false, error: null };
    case ASYNC_DELETE_QUOTATION_FAILED:
      return { ...state, deleteLoading: false, error: action.error };

    default:
      return state;
  }
};
