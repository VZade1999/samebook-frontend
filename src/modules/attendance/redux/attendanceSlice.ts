import { createSlice } from "@reduxjs/toolkit";
import {
  punchIn,
  punchOut,
  getTodayAttendance,
  getAttendanceHistory,
  getTeamAttendance,
} from "./attendanceActions";

const initialState = {
  today: null as any,
  todayLoading: false,
  punching: false,
  history: [] as any[],
  historyPagination: { total: 0, page: 1, limit: 20, pages: 0 },
  historyLoading: false,
  team: [] as any[],
  teamLoading: false,
  error: null as any,
};

const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getTodayAttendance.pending, (state) => {
      state.todayLoading = true;
    });
    builder.addCase(getTodayAttendance.fulfilled, (state, action) => {
      state.todayLoading = false;
      state.today = action.payload;
    });
    builder.addCase(getTodayAttendance.rejected, (state, action) => {
      state.todayLoading = false;
      state.error = action.payload as any;
    });

    builder.addCase(punchIn.pending, (state) => {
      state.punching = true;
      state.error = null;
    });
    builder.addCase(punchIn.fulfilled, (state, action) => {
      state.punching = false;
      state.today = action.payload;
    });
    builder.addCase(punchIn.rejected, (state, action) => {
      state.punching = false;
      state.error = action.payload as any;
    });

    builder.addCase(punchOut.pending, (state) => {
      state.punching = true;
      state.error = null;
    });
    builder.addCase(punchOut.fulfilled, (state, action) => {
      state.punching = false;
      state.today = action.payload;
    });
    builder.addCase(punchOut.rejected, (state, action) => {
      state.punching = false;
      state.error = action.payload as any;
    });

    builder.addCase(getAttendanceHistory.pending, (state) => {
      state.historyLoading = true;
    });
    builder.addCase(getAttendanceHistory.fulfilled, (state, action) => {
      state.historyLoading = false;
      const { rows, pagination } = action.payload;
      state.history = pagination.page === 1 ? rows : [...state.history, ...rows];
      state.historyPagination = pagination;
    });
    builder.addCase(getAttendanceHistory.rejected, (state, action) => {
      state.historyLoading = false;
      state.error = action.payload as any;
    });

    builder.addCase(getTeamAttendance.pending, (state) => {
      state.teamLoading = true;
    });
    builder.addCase(getTeamAttendance.fulfilled, (state, action) => {
      state.teamLoading = false;
      state.team = action.payload;
    });
    builder.addCase(getTeamAttendance.rejected, (state, action) => {
      state.teamLoading = false;
      state.error = action.payload as any;
    });
  },
});

export default attendanceSlice.reducer;
