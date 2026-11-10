import { createAsyncThunk } from "@reduxjs/toolkit";
import { attendanceService, AttendanceSettingsPayload } from "../services/attendanceService";

// Responses come back as { success, message, data }. A non-2xx status lands in
// the catch; a 2xx with success:false is treated the same way.
const unwrap = (response: any) => {
  if (response?.data && response.data.success === false) {
    const err: any = new Error(response.data.message || "Request failed");
    err.response = { data: response.data };
    throw err;
  }
  return response?.data?.data;
};

const errPayload = (error: any) => {
  const d = error?.response?.data;
  if (!d) return { success: false, message: error?.message || "Request failed" };
  // Nest's ValidationPipe returns `message` as an array of strings.
  return Array.isArray(d.message) ? { ...d, message: d.message.join(", ") } : d;
};

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

export const getTeamAttendance = createAsyncThunk(
  "attendance/getTeam",
  async (month: string, { rejectWithValue }) => {
    try {
      const response = await attendanceService.getTeam(month);
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

// ─── Enhancement: calendar, team today, settings, holidays ────────────────

export const getAttendanceCalendar = createAsyncThunk(
  "attendance/getCalendar",
  async (month: string | undefined, { rejectWithValue }) => {
    try {
      return unwrap(await attendanceService.getCalendar(month));
    } catch (error: any) {
      return rejectWithValue(errPayload(error));
    }
  },
);

export const getTeamToday = createAsyncThunk(
  "attendance/getTeamToday",
  async (_: void, { rejectWithValue }) => {
    try {
      return unwrap(await attendanceService.getTeamToday());
    } catch (error: any) {
      return rejectWithValue(errPayload(error));
    }
  },
);

export const getAttendanceSettings = createAsyncThunk(
  "attendance/getSettings",
  async (_: void, { rejectWithValue }) => {
    try {
      return unwrap(await attendanceService.getSettings());
    } catch (error: any) {
      return rejectWithValue(errPayload(error));
    }
  },
);

export const updateAttendanceSettings = createAsyncThunk(
  "attendance/updateSettings",
  async (payload: AttendanceSettingsPayload, { rejectWithValue }) => {
    try {
      return unwrap(await attendanceService.updateSettings(payload));
    } catch (error: any) {
      return rejectWithValue(errPayload(error));
    }
  },
);

export const getHolidays = createAsyncThunk(
  "attendance/getHolidays",
  async (year: number | undefined, { rejectWithValue }) => {
    try {
      return unwrap(await attendanceService.getHolidays(year));
    } catch (error: any) {
      return rejectWithValue(errPayload(error));
    }
  },
);

export const createHoliday = createAsyncThunk(
  "attendance/createHoliday",
  async (payload: { holiday_date: string; name: string }, { rejectWithValue }) => {
    try {
      return unwrap(await attendanceService.createHoliday(payload));
    } catch (error: any) {
      return rejectWithValue(errPayload(error));
    }
  },
);

export const deleteHoliday = createAsyncThunk(
  "attendance/deleteHoliday",
  async (id: number, { rejectWithValue }) => {
    try {
      unwrap(await attendanceService.deleteHoliday(id));
      return { id };
    } catch (error: any) {
      return rejectWithValue(errPayload(error));
    }
  },
);
