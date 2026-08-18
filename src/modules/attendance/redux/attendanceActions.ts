import { createAsyncThunk } from "@reduxjs/toolkit";
import { attendanceService } from "../services/attendanceService";

export const punchIn = createAsyncThunk(
  "attendance/punchIn",
  async (notes: string | undefined, { rejectWithValue }) => {
    try {
      const response = await attendanceService.punchIn(notes);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const punchOut = createAsyncThunk(
  "attendance/punchOut",
  async (notes: string | undefined, { rejectWithValue }) => {
    try {
      const response = await attendanceService.punchOut(notes);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const getTodayAttendance = createAsyncThunk(
  "attendance/getToday",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await attendanceService.getToday();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const getAttendanceHistory = createAsyncThunk(
  "attendance/getHistory",
  async (
    params: { page?: number; limit?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await attendanceService.getHistory(
        params?.page ?? 1,
        params?.limit ?? 20,
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);
