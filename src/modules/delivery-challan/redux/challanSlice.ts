import { createSlice, isAnyOf } from "@reduxjs/toolkit";
import {
  getChallans,
  getChallanDetails,
  createChallan,
  updateChallan,
  dispatchChallan,
  deliverChallan,
  cancelChallan,
  convertChallanToInvoice,
  deleteChallan,
  getChallanActivity,
} from "./challanActions";
import { ASYNC_LOGOUT_SUCCESS } from "@/modules/auth/redux/authActions";

// ─── Stale-while-revalidate cache ───────────────────────────────────────────
// Lists (per filter/page) and details (per id) are remembered so revisiting
// them renders instantly, while a fresh request ALWAYS runs in the background
// and replaces the cached copy. Any successful mutation clears both caches
// (statuses/counts change, and converting one challan can invoice its
// siblings). The whole slice is reset on logout.
const LIST_CACHE_MAX = 15;
const DETAILS_CACHE_MAX = 25;

type ListEntry = { rows: any[]; pagination: any; statusCounts: Record<string, number> };
type DetailsEntry = { details: any; activity: any[] };

export const listCacheKey = (params: any) =>
  JSON.stringify(
    Object.keys(params || {})
      .sort()
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
      .map((k) => [k, params[k]]),
  );

const remember = <T,>(cache: Record<string, T>, order: string[], key: string, value: T, max: number) => {
  cache[key] = value;
  const i = order.indexOf(key);
  if (i !== -1) order.splice(i, 1);
  order.push(key);
  while (order.length > max) delete cache[order.shift() as string];
};

const forget = (cache: Record<string, any>, order: string[], key: string) => {
  delete cache[key];
  const i = order.indexOf(key);
  if (i !== -1) order.splice(i, 1);
};

// Read and drop the generation recorded for a request at pending time.
const takeGen = (state: { reqGen: Record<string, number> }, requestId: string) => {
  const gen = state.reqGen[requestId];
  delete state.reqGen[requestId];
  return gen;
};

const activityOfPayload =(p: any) => p?.activity || p?.activity_logs || p?.activities || [];

const initialState = {
  list: [] as any[],
  pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } as any,
  statusCounts: {} as Record<string, number>,
  loading: false,
  refreshing: false,
  error: null as any,
  listRequestId: null as string | null,

  details: null as any,
  detailsLoading: false,
  detailsError: null as any,
  activity: [] as any[],
  detailsRequestId: null as string | null,

  // Bumped on every invalidation and on logout. A response is cached only if
  // its request started in the current generation, so a slow request that
  // began before a mutation/logout can never write old data back.
  cacheGen: 0,
  reqGen: {} as Record<string, number>,
  listFromCache: false,

  listCache: {} as Record<string, ListEntry>,
  listCacheOrder: [] as string[],
  detailsCache: {} as Record<string, DetailsEntry>,
  detailsCacheOrder: [] as string[],

  saving: false,
  actionLoading: false,
};

const actionThunks = [
  dispatchChallan,
  deliverChallan,
  cancelChallan,
  convertChallanToInvoice,
  deleteChallan,
] as const;

const challanSlice = createSlice({
  name: "challans",
  initialState,
  reducers: {
    clearChallanDetails: (state) => {
      state.details = null;
      state.detailsError = null;
      state.activity = [];
      state.detailsRequestId = null;
    },
  },
  extraReducers: (builder) => {
    // ── List ──────────────────────────────────────────────────────────────
    builder.addCase(getChallans.pending, (state, action) => {
      state.reqGen[action.meta.requestId] = state.cacheGen;
      state.listRequestId = action.meta.requestId;
      state.error = null;
      const hit = state.listCache[listCacheKey(action.meta.arg)];
      if (hit) {
        state.list = hit.rows;
        state.pagination = hit.pagination;
        state.statusCounts = hit.statusCounts;
        state.loading = false;
        state.refreshing = true;
        state.listFromCache = true;
      } else {
        state.loading = true;
        state.refreshing = false;
        state.listFromCache = false;
      }
    });
    builder.addCase(getChallans.fulfilled, (state, action: any) => {
      const gen = takeGen(state, action.meta.requestId);
      const data = action.payload || {};
      const entry: ListEntry = {
        rows: data.rows || [],
        pagination: data.pagination || initialState.pagination,
        statusCounts: data.statusCounts || {},
      };
      if (gen === state.cacheGen) {
        remember(state.listCache, state.listCacheOrder, listCacheKey(action.meta.arg), entry, LIST_CACHE_MAX);
      }
      // Ignore responses that arrive after a newer request (fast filter changes).
      if (action.meta.requestId !== state.listRequestId) return;
      state.list = entry.rows;
      state.pagination = entry.pagination;
      state.statusCounts = entry.statusCounts;
      state.loading = false;
      state.refreshing = false;
      state.listFromCache = false;
    });
    builder.addCase(getChallans.rejected, (state, action) => {
      takeGen(state, action.meta.requestId);
      // A failed refresh must not leave cached rows on screen (e.g. 403).
      forget(state.listCache, state.listCacheOrder, listCacheKey(action.meta.arg));
      if (action.meta.requestId !== state.listRequestId) return;
      state.loading = false;
      state.refreshing = false;
      state.error = action.payload;
      if (state.listFromCache) {
        state.list = [];
        state.pagination = initialState.pagination;
        state.statusCounts = {};
        state.listFromCache = false;
      }
    });

    // ── Details ───────────────────────────────────────────────────────────
    builder.addCase(getChallanDetails.pending, (state, action) => {
      const id = String(action.meta.arg);
      state.reqGen[action.meta.requestId] = state.cacheGen;
      state.detailsRequestId = action.meta.requestId;
      state.detailsLoading = true;
      state.detailsError = null;
      const hit = state.detailsCache[id];
      if (hit && String(state.details?.id) !== id) {
        state.details = hit.details;
        state.activity = hit.activity;
      }
    });
    builder.addCase(getChallanDetails.fulfilled, (state, action: any) => {
      const id = String(action.meta.arg);
      const gen = takeGen(state, action.meta.requestId);
      const details = action.payload || null;
      const prev = state.detailsCache[id];
      const fromPayload = activityOfPayload(details);
      const entry: DetailsEntry = {
        details,
        // Activity may come separately (getChallanActivity); keep the last one.
        activity: fromPayload.length ? fromPayload : prev?.activity || [],
      };
      if (details && gen === state.cacheGen) remember(state.detailsCache, state.detailsCacheOrder, id, entry, DETAILS_CACHE_MAX);
      if (action.meta.requestId !== state.detailsRequestId) return;
      state.detailsLoading = false;
      state.details = details;
      state.activity = entry.activity;
    });
    builder.addCase(getChallanDetails.rejected, (state, action) => {
      // Never keep showing a cached copy of something the server refused
      // (deleted, no longer accessible, …).
      takeGen(state, action.meta.requestId);
      forget(state.detailsCache, state.detailsCacheOrder, String(action.meta.arg));
      if (action.meta.requestId !== state.detailsRequestId) return;
      state.detailsLoading = false;
      state.detailsError = action.payload;
      state.details = null;
      state.activity = [];
    });

    builder.addCase(getChallanActivity.fulfilled, (state, action: any) => {
      const p = action.payload;
      const activity = Array.isArray(p) ? p : p?.rows || p?.activity || [];
      const id = String(action.meta.arg);
      if (state.detailsCache[id]) state.detailsCache[id].activity = activity;
      if (String(state.details?.id) === id) state.activity = activity;
    });

    // ── Logout: drop everything (logout is client-side, no page reload) ────
    builder.addMatcher(
      (action: any) => action.type === ASYNC_LOGOUT_SUCCESS,
      // Keep counting generations so in-flight requests of the old session
      // can never be cached.
      (state) => ({ ...initialState, cacheGen: state.cacheGen + 1, reqGen: {} }),
    );

    // ── Mutations invalidate the caches ───────────────────────────────────
    builder.addMatcher(
      isAnyOf(
        createChallan.fulfilled,
        updateChallan.fulfilled,
        ...actionThunks.map((t) => t.fulfilled),
      ),
      (state) => {
        state.cacheGen += 1;
        state.listCache = {};
        state.listCacheOrder = [];
        state.detailsCache = {};
        state.detailsCacheOrder = [];
      },
    );

    builder.addMatcher(isAnyOf(createChallan.pending, updateChallan.pending), (state) => {
      state.saving = true;
    });
    builder.addMatcher(
      isAnyOf(
        createChallan.fulfilled,
        createChallan.rejected,
        updateChallan.fulfilled,
        updateChallan.rejected,
      ),
      (state) => {
        state.saving = false;
      },
    );

    builder.addMatcher(isAnyOf(...actionThunks.map((t) => t.pending)), (state) => {
      state.actionLoading = true;
    });
    builder.addMatcher(
      isAnyOf(
        ...actionThunks.map((t) => t.fulfilled),
        ...actionThunks.map((t) => t.rejected),
      ),
      (state) => {
        state.actionLoading = false;
      },
    );
  },
});

export const { clearChallanDetails } = challanSlice.actions;
export default challanSlice.reducer;
