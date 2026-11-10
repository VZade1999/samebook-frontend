import { createSlice } from "@reduxjs/toolkit";
import { ASYNC_LOGOUT_SUCCESS } from "@/modules/auth/redux/authActions";
import {
  punchIn,
  punchOut,
  getTodayAttendance,
  getAttendanceHistory,
  getTeamAttendance,
  getAttendanceCalendar,
  getTeamToday,
  getAttendanceSettings,
  updateAttendanceSettings,
  getHolidays,
  createHoliday,
  deleteHoliday,
} from "./attendanceActions";
import {
  AttendanceSettings,
  AttendanceStats,
  DayStatus,
  Holiday,
  TeamTodayCounts,
  TeamTodayRow,
  normalizeSettings,
  normalizeStats,
} from "../constants";

export interface CalendarData {
  month: string;
  settings: AttendanceSettings;
  days: DayStatus[];
  stats: AttendanceStats;
  today: DayStatus | null;
}

export interface TeamTodayData {
  date: string;
  settings: AttendanceSettings;
  counts: TeamTodayCounts;
  employees: TeamTodayRow[];
}

const EMPTY_COUNTS: TeamTodayCounts = {
  total: 0,
  present: 0,
  late: 0,
  half_day: 0,
  not_marked: 0,
  absent: 0,
  on_leave: 0,
  half_day_leave: 0,
  off: 0,
};

const sortByDate = (list: Holiday[]) =>
  [...list].sort((a, b) => String(a.holiday_date).localeCompare(String(b.holiday_date)));

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

  // Enhancement state
  calendar: null as CalendarData | null,
  calendarLoading: false,
  calendarError: null as string | null,

  teamToday: null as TeamTodayData | null,
  teamTodayLoading: false,
  teamTodayError: null as string | null,

  settings: null as AttendanceSettings | null,
  settingsLoading: false,
  settingsSaving: false,

  holidays: [] as Holiday[],
  holidaysYear: null as number | null,
  holidaysLoading: false,
  holidayMutating: false,

  // Latest in-flight request ids — a response is stored only if it belongs to
  // the most recent request, so a slow reply for an older month (or one that
  // started before logout) can never overwrite newer data.
  reqIds: {
    today: null as string | null,
    history: null as string | null,
    team: null as string | null,
    calendar: null as string | null,
    teamToday: null as string | null,
    settings: null as string | null,
    holidays: null as string | null,
  },
};

type State = typeof initialState;

const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getTodayAttendance.pending, (state, action) => {
      state.todayLoading = true;
      state.reqIds.today = action.meta.requestId;
    });
    builder.addCase(getTodayAttendance.fulfilled, (state, action) => {
      if (state.reqIds.today !== action.meta.requestId) return;
      state.todayLoading = false;
      state.today = action.payload;
    });
    builder.addCase(getTodayAttendance.rejected, (state, action) => {
      if (state.reqIds.today !== action.meta.requestId) return;
      state.todayLoading = false;
      state.error = action.payload as any;
    });

    builder.addCase(punchIn.pending, (state) => {
      state.punching = true;
      state.error = null;
      state.reqIds.today = null;
      state.todayLoading = false;
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
      state.reqIds.today = null;
      state.todayLoading = false;
    });
    builder.addCase(punchOut.fulfilled, (state, action) => {
      state.punching = false;
      state.today = action.payload;
    });
    builder.addCase(punchOut.rejected, (state, action) => {
      state.punching = false;
      state.error = action.payload as any;
    });

    builder.addCase(getAttendanceHistory.pending, (state, action) => {
      state.historyLoading = true;
      state.reqIds.history = action.meta.requestId;
    });
    builder.addCase(getAttendanceHistory.fulfilled, (state, action) => {
      if (state.reqIds.history !== action.meta.requestId) return;
      state.historyLoading = false;
      const rows = action.payload?.rows || [];
      const pagination = action.payload?.pagination || { total: rows.length, page: 1, limit: 20, pages: 1 };
      state.history = pagination.page === 1 ? rows : [...state.history, ...rows];
      state.historyPagination = pagination;
    });
    builder.addCase(getAttendanceHistory.rejected, (state, action) => {
      if (state.reqIds.history !== action.meta.requestId) return;
      state.historyLoading = false;
      state.error = action.payload as any;
    });

    builder.addCase(getTeamAttendance.pending, (state, action) => {
      state.teamLoading = true;
      state.reqIds.team = action.meta.requestId;
    });
    builder.addCase(getTeamAttendance.fulfilled, (state, action) => {
      if (state.reqIds.team !== action.meta.requestId) return;
      state.teamLoading = false;
      const list = Array.isArray(action.payload) ? action.payload : [];
      state.team = list.map((emp: any) => ({
        ...emp,
        sessions: Array.isArray(emp?.sessions) ? emp.sessions : [],
        days: Array.isArray(emp?.days) ? emp.days : [],
        stats: emp?.stats ? normalizeStats(emp.stats) : null,
      }));
    });
    builder.addCase(getTeamAttendance.rejected, (state, action) => {
      if (state.reqIds.team !== action.meta.requestId) return;
      state.teamLoading = false;
      state.team = [];
      state.error = action.payload as any;
    });

    // ── Calendar (own month view) ─────────────────────────────────────────
    builder.addCase(getAttendanceCalendar.pending, (state, action) => {
      state.calendarLoading = true;
      state.calendarError = null;
      state.reqIds.calendar = action.meta.requestId;
    });
    builder.addCase(getAttendanceCalendar.fulfilled, (state, action) => {
      if (state.reqIds.calendar !== action.meta.requestId) return;
      state.calendarLoading = false;
      const p: any = action.payload || {};
      const settings = normalizeSettings(p.settings);
      state.calendar = {
        month: p.month || action.meta.arg || "",
        settings,
        days: Array.isArray(p.days) ? p.days : [],
        stats: normalizeStats(p.stats),
        today: p.today || null,
      };
      state.settings = settings;
    });
    builder.addCase(getAttendanceCalendar.rejected, (state, action) => {
      if (state.reqIds.calendar !== action.meta.requestId) return;
      state.calendarLoading = false;
      state.calendarError = (action.payload as any)?.message || "Failed to load calendar";
    });

    // ── Team today ────────────────────────────────────────────────────────
    builder.addCase(getTeamToday.pending, (state, action) => {
      state.teamTodayLoading = true;
      state.reqIds.teamToday = action.meta.requestId;
    });
    builder.addCase(getTeamToday.fulfilled, (state, action) => {
      if (state.reqIds.teamToday !== action.meta.requestId) return;
      state.teamTodayLoading = false;
      state.teamTodayError = null;
      const p: any = action.payload || {};
      state.teamToday = {
        date: p.date || "",
        settings: normalizeSettings(p.settings),
        counts: { ...EMPTY_COUNTS, ...(p.counts || {}) },
        employees: Array.isArray(p.employees) ? p.employees : [],
      };
    });
    builder.addCase(getTeamToday.rejected, (state, action) => {
      if (state.reqIds.teamToday !== action.meta.requestId) return;
      state.teamTodayLoading = false;
      // Keep the last good board; just flag the failed refresh.
      state.teamTodayError = (action.payload as any)?.message || "Couldn't refresh";
    });

    // ── Settings ──────────────────────────────────────────────────────────
    builder.addCase(getAttendanceSettings.pending, (state, action) => {
      state.settingsLoading = true;
      state.reqIds.settings = action.meta.requestId;
    });
    builder.addCase(getAttendanceSettings.fulfilled, (state, action) => {
      if (state.reqIds.settings !== action.meta.requestId) return;
      state.settingsLoading = false;
      state.settings = normalizeSettings(action.payload);
    });
    builder.addCase(getAttendanceSettings.rejected, (state, action) => {
      if (state.reqIds.settings !== action.meta.requestId) return;
      state.settingsLoading = false;
    });

    builder.addCase(updateAttendanceSettings.pending, (state) => {
      state.settingsSaving = true;
      state.reqIds.settings = null; // drop any in-flight GET
      state.settingsLoading = false;
    });
    builder.addCase(updateAttendanceSettings.fulfilled, (state, action) => {
      state.settingsSaving = false;
      state.settings = normalizeSettings(action.payload);
    });
    builder.addCase(updateAttendanceSettings.rejected, (state) => {
      state.settingsSaving = false;
    });

    // ── Holidays ──────────────────────────────────────────────────────────
    builder.addCase(getHolidays.pending, (state, action) => {
      state.holidaysLoading = true;
      state.holidaysYear = action.meta.arg ?? null;
      state.reqIds.holidays = action.meta.requestId;
    });
    builder.addCase(getHolidays.fulfilled, (state, action) => {
      if (state.reqIds.holidays !== action.meta.requestId) return;
      state.holidaysLoading = false;
      state.holidays = sortByDate(Array.isArray(action.payload) ? action.payload : []);
    });
    builder.addCase(getHolidays.rejected, (state, action) => {
      if (state.reqIds.holidays !== action.meta.requestId) return;
      state.holidaysLoading = false;
      state.holidays = [];
    });

    builder.addCase(createHoliday.pending, (state) => {
      state.holidayMutating = true;
    });
    builder.addCase(createHoliday.fulfilled, (state, action) => {
      state.holidayMutating = false;
      const h: any = action.payload;
      if (!h || !h.holiday_date) return;
      const year = Number(String(h.holiday_date).slice(0, 4));
      if (state.holidaysYear && year !== state.holidaysYear) return;
      state.holidays = sortByDate([...state.holidays.filter((x) => x.id !== h.id), h]);
    });
    builder.addCase(createHoliday.rejected, (state) => {
      state.holidayMutating = false;
    });

    builder.addCase(deleteHoliday.pending, (state) => {
      state.holidayMutating = true;
    });
    builder.addCase(deleteHoliday.fulfilled, (state, action) => {
      state.holidayMutating = false;
      state.holidays = state.holidays.filter((h) => h.id !== action.payload.id);
    });
    builder.addCase(deleteHoliday.rejected, (state) => {
      state.holidayMutating = false;
    });

    // ── Logout: drop everything (in-flight replies no longer match reqIds) ─
    builder.addMatcher(
      (action: any) => action.type === ASYNC_LOGOUT_SUCCESS,
      (): State => initialState,
    );
  },
});

export default attendanceSlice.reducer;
