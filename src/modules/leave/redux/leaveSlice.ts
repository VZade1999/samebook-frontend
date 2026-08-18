import { createSlice } from "@reduxjs/toolkit";
import {
  requestLeave,
  getMyLeaves,
  getTeamLeaves,
  approveLeave,
  rejectLeave,
} from "./leaveActions";

const initialState = {
  myLeaves: [] as any[],
  myLeavesLoading: false,
  requesting: false,
  teamLeaves: [] as any[],
  teamLeavesLoading: false,
  reviewingId: null as number | null,
  error: null as any,
};

const leaveSlice = createSlice({
  name: "leave",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(requestLeave.pending, (state) => {
      state.requesting = true;
      state.error = null;
    });
    builder.addCase(requestLeave.fulfilled, (state, action) => {
      state.requesting = false;
      state.myLeaves = [action.payload, ...state.myLeaves];
    });
    builder.addCase(requestLeave.rejected, (state, action) => {
      state.requesting = false;
      state.error = action.payload as any;
    });

    builder.addCase(getMyLeaves.pending, (state) => {
      state.myLeavesLoading = true;
    });
    builder.addCase(getMyLeaves.fulfilled, (state, action) => {
      state.myLeavesLoading = false;
      state.myLeaves = action.payload;
    });
    builder.addCase(getMyLeaves.rejected, (state) => {
      state.myLeavesLoading = false;
    });

    builder.addCase(getTeamLeaves.pending, (state) => {
      state.teamLeavesLoading = true;
    });
    builder.addCase(getTeamLeaves.fulfilled, (state, action) => {
      state.teamLeavesLoading = false;
      state.teamLeaves = action.payload;
    });
    builder.addCase(getTeamLeaves.rejected, (state) => {
      state.teamLeavesLoading = false;
    });

    builder.addCase(approveLeave.pending, (state, action) => {
      state.reviewingId = action.meta.arg;
    });
    builder.addCase(approveLeave.fulfilled, (state, action) => {
      state.reviewingId = null;
      const index = state.teamLeaves.findIndex((l) => l.id === action.payload.id);
      if (index !== -1) state.teamLeaves[index] = { ...state.teamLeaves[index], ...action.payload };
    });
    builder.addCase(approveLeave.rejected, (state) => {
      state.reviewingId = null;
    });

    builder.addCase(rejectLeave.pending, (state, action) => {
      state.reviewingId = action.meta.arg.id;
    });
    builder.addCase(rejectLeave.fulfilled, (state, action) => {
      state.reviewingId = null;
      const index = state.teamLeaves.findIndex((l) => l.id === action.payload.id);
      if (index !== -1) state.teamLeaves[index] = { ...state.teamLeaves[index], ...action.payload };
    });
    builder.addCase(rejectLeave.rejected, (state) => {
      state.reviewingId = null;
    });
  },
});

export default leaveSlice.reducer;
