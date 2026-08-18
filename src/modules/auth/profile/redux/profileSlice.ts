import { createSlice } from "@reduxjs/toolkit";
import { getProfile, updateProfile } from "./profileActions";

const initialState = {
  data: null as any,
  loading: false,
  saving: false,
  error: null as any,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.data = action.payload;
    });
    builder.addCase(getProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as any;
    });

    builder.addCase(updateProfile.pending, (state) => {
      state.saving = true;
      state.error = null;
    });
    builder.addCase(updateProfile.fulfilled, (state, action) => {
      state.saving = false;
      state.data = action.payload;
    });
    builder.addCase(updateProfile.rejected, (state, action) => {
      state.saving = false;
      state.error = action.payload as any;
    });
  },
});

export default profileSlice.reducer;
