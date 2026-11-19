import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ASYNC_LOGOUT_SUCCESS } from "@/modules/auth/redux/authActions";

// Live copy of the user's effective access, synced from GET /auth/session on
// app load and after an add-on is connected/disconnected. useAccess and
// useModules read it first (falling back to what login stored), and because
// it lives in Redux every consumer re-renders when access changes — no
// logout/login needed.
export interface SessionState {
  permissions: string[] | null;
  modules: string[] | null;
  roles: string[];
  /** SameBook Super Admin (sees the platform console). */
  platform: boolean;
  /** The company's Admin (top role). */
  admin: boolean;
  /** Highest company role level: 1 = Admin … 5; 99 = none; null = not known yet. */
  rank: number | null;
  loaded: boolean;
}

const initialState: SessionState = { permissions: null, modules: null, roles: [], platform: false, admin: false, rank: null, loaded: false };

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setSession: (
      state,
      action: PayloadAction<{ permissions: string[]; modules: string[]; roles?: string[]; platform?: boolean; admin?: boolean; rank?: number | null }>,
    ) => {
      state.permissions = action.payload.permissions;
      state.modules = action.payload.modules;
      state.roles = action.payload.roles || [];
      state.platform = !!action.payload.platform;
      state.admin = !!action.payload.admin;
      state.rank = action.payload.rank ?? null;
      state.loaded = true;
    },
    // Sync attempted but failed: stop waiting and use the stored copy.
    sessionChecked: (state) => {
      state.loaded = true;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      (a: any) => a.type === ASYNC_LOGOUT_SUCCESS,
      () => initialState,
    );
  },
});

export const { setSession, sessionChecked } = sessionSlice.actions;
export default sessionSlice.reducer;
