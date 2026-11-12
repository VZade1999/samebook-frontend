import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { ASYNC_LOGOUT_SUCCESS } from "@/modules/auth/redux/authActions";
import type { Overview } from "../types";

// Remembers the last few periods the user looked at, so coming back to the
// dashboard (or flipping between presets) paints instantly while a fresh
// request runs in the background. Cleared on logout: the next user must
// never see the previous user's figures.
const MAX_ENTRIES = 8;

interface State {
  cache: Record<string, Overview>;
  order: string[];
}

const initialState: State = { cache: {}, order: [] };

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    rememberOverview: (state, action: PayloadAction<{ key: string; data: Overview }>) => {
      const { key, data } = action.payload;
      state.cache[key] = data as any;
      state.order = [...state.order.filter((k) => k !== key), key];
      while (state.order.length > MAX_ENTRIES) delete state.cache[state.order.shift() as string];
    },
    forgetOverview: (state, action: PayloadAction<string>) => {
      delete state.cache[action.payload];
      state.order = state.order.filter((k) => k !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      (action: any) => action.type === ASYNC_LOGOUT_SUCCESS,
      () => initialState,
    );
  },
});

export const { rememberOverview, forgetOverview } = dashboardSlice.actions;
export default dashboardSlice.reducer;
