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
  loaded: boolean;
}

const initialState: SessionState = { permissions: null, modules: null, roles: [], loaded: false };

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setSession: (
      state,
      action: PayloadAction<{ permissions: string[]; modules: string[]; roles?: string[] }>,
    ) => {
      state.permissions = action.payload.permissions;
      state.modules = action.payload.modules;
      state.roles = action.payload.roles || [];
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
