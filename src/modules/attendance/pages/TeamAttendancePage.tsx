import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Spin,
  Table,
  TimePicker,
  Tooltip,
  message,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CoffeeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  GiftOutlined,
  HourglassOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  TableOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
  createHoliday,
  deleteHoliday,
  getAttendanceSettings,
  getHolidays,
  getTeamAttendance,
  getTeamToday,
  updateAttendanceSettings,
} from "../redux/attendanceActions";
import { getTeamLeaves, approveLeave, rejectLeave } from "@/modules/leave/redux/leaveActions";
import {
  AttendanceSettings,
  DEFAULT_SETTINGS,
  DayStatus,
  DayStatusCode,
  Holiday,
  LEGEND,
  TIMEZONES,
  TeamTodayRow,
  WEEKDAYS,
  avatarColor,
  daysInMonth,
  normalizeSettings,
  fmtDay,
  fmtHoursShort,
  fmtMinutes,
  fmtMonth,
  fmtTime,
  initials,
  leaveLabel,
  monthInTz,
  statusMeta,
  todayInTz,
  toMinutes,
} from "../constants";
import { DayDetailsDrawer, EmptyState, StatusPill } from "../components/AttendanceUI";
import "../styles/attendance.scss";

type TabKey = "today" | "monthly" | "leave" | "settings";
const TAB_KEYS: TabKey[] = ["today", "monthly", "leave", "settings"];

type TodayFilter = "all" | "present" | "late" | "not_marked" | "leave" | "off";
const TODAY_FILTER_STATUSES: Record<TodayFilter, DayStatusCode[] | null> = {
  all: null,
  present: ["PRESENT"],
  late: ["LATE"],
  not_marked: ["NOT_MARKED"],
  leave: ["ON_LEAVE", "HALF_DAY_LEAVE"],
  off: ["HOLIDAY", "WEEKLY_OFF"],
};

const LEAVE_STYLE: Record<string, { color: string; bg: string }> = {
  pending: { color: "#D97706", bg: "rgba(217,119,6,.13)" },
  approved: { color: "#059669", bg: "rgba(5,150,105,.13)" },
  rejected: { color: "#DC2626", bg: "rgba(220,38,38,.12)" },
};

const pctClass = (p: number) => (p >= 90 ? "good" : p >= 75 ? "mid" : "low");

const hmToDayjs = (hm: string) => {
  const mins = toMinutes(hm);
  return dayjs().hour(Math.floor(mins / 60)).minute(mins % 60).second(0).millisecond(0);
};

const csvEscape = (v: any) => {
  let s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formula injection (=, +, -, @, tab, CR at start).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const Person: React.FC<{ id: number | string; name?: string; email?: string; sm?: boolean }> = ({ id, name, email, sm }) => (
  <div className="att-person">
    <span className={`att-avatar${sm ? " sm" : ""}`} style={{ background: avatarColor(id) }}>
      {initials(name, email)}
    </span>
    <div style={{ minWidth: 0 }}>
      <div className="att-person-name">{name || email || "—"}</div>
      {!sm && email && <div className="att-person-email">{email}</div>}
    </div>
  </div>
);

const TeamAttendancePage: React.FC = () => {
  const dispatch = useDispatch();
  const {
    team,
    teamLoading,
    teamToday,
    teamTodayLoading,
    teamTodayError,
    settings: storedSettings,
    settingsLoading,
    settingsSaving,
    holidays,
    holidaysLoading,
    holidayMutating,
  } = useSelector((state: any) => state.attendance);
  const { teamLeaves, teamLeavesLoading, reviewingId } = useSelector((state: any) => state.leave);

  const settings: AttendanceSettings = teamToday?.settings || storedSettings || DEFAULT_SETTINGS;
  const tz = settings.timezone;
  const todayDate = teamToday?.date || todayInTz(tz);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as TabKey | null;
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : "today";
  const setTab = (t: TabKey) => {
    const next = new URLSearchParams(searchParams);
    if (t === "today") next.delete("tab");
    else next.set("tab", t);
    setSearchParams(next, { replace: true });
  };

  const [month, setMonth] = useState<string>(() => monthInTz(DEFAULT_SETTINGS.timezone));
  const [todayFilter, setTodayFilter] = useState<TodayFilter>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>("pending");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [detail, setDetail] = useState<{ name: string; day: DayStatus } | null>(null);
  const [holidayYear, setHolidayYear] = useState<number>(() => Number(todayInTz(DEFAULT_SETTINGS.timezone).slice(0, 4)));
  const [holidayDate, setHolidayDate] = useState<Dayjs | null>(null);
  const [holidayName, setHolidayName] = useState("");
  const monthlyLoaded = useRef(false);
  const [form] = Form.useForm();

  // ── Data loading ────────────────────────────────────────────────────────
  const refreshToday = () => dispatch(getTeamToday() as any);
  const refreshMonth = () => {
    monthlyLoaded.current = true;
    dispatch(getTeamAttendance(month) as any);
  };
  const refreshTeamData = () => {
    refreshToday();
    if (monthlyLoaded.current) dispatch(getTeamAttendance(month) as any);
  };

  useEffect(() => {
    refreshToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh the "today" board every 2 minutes while it is visible.
  useEffect(() => {
    if (tab !== "today") return;
    const t = setInterval(() => dispatch(getTeamToday() as any), 120000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === "monthly") refreshMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, month]);

  useEffect(() => {
    dispatch(getTeamLeaves(statusFilter) as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (tab === "settings") dispatch(getAttendanceSettings() as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === "settings") dispatch(getHolidays(holidayYear) as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, holidayYear]);

  // Snap month / holiday year to the company timezone once it is known.
  const tzSynced = useRef(false);
  useEffect(() => {
    if (tzSynced.current || !teamToday) return;
    tzSynced.current = true;
    setMonth(monthInTz(tz));
    setHolidayYear(Number(todayInTz(tz).slice(0, 4)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamToday]);

  // Keep the settings form in sync with the stored settings.
  const formSettings: AttendanceSettings = storedSettings || settings;
  // `force` resets the form (clearing touched state); otherwise unsaved edits
  // are never overwritten by a late-arriving settings response.
  const syncForm = (s: AttendanceSettings, force: boolean) => {
    if (!force && form.isFieldsTouched()) return;
    form.resetFields();
    form.setFieldsValue({
      timezone: s.timezone,
      shift_start: hmToDayjs(s.shift_start),
      shift_end: hmToDayjs(s.shift_end),
      grace_minutes: s.grace_minutes,
      half_day_minutes: s.half_day_minutes,
      full_day_minutes: s.full_day_minutes,
      weekly_offs: s.weekly_offs,
    });
  };
  useEffect(() => {
    if (tab === "settings") syncForm(formSettings, true); // the form is only mounted on this tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  useEffect(() => {
    if (tab === "settings") syncForm(formSettings, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedSettings]);

  // ── Leave actions ───────────────────────────────────────────────────────
  const handleApprove = async (id: number) => {
    const response = await dispatch(approveLeave(id) as any);
    if (response.meta.requestStatus === "fulfilled") {
      message.success("Leave approved");
      dispatch(getTeamLeaves(statusFilter) as any);
      refreshTeamData();
    } else {
      message.error(response.payload?.message || "Failed to approve");
    }
  };

  const handleReject = async (id: number) => {
    const response = await dispatch(rejectLeave({ id, review_note: rejectNote.trim() || undefined }) as any);
    if (response.meta.requestStatus === "fulfilled") {
      message.success("Leave rejected");
      setRejectingId(null);
      setRejectNote("");
      dispatch(getTeamLeaves(statusFilter) as any);
      refreshTeamData();
    } else {
      message.error(response.payload?.message || "Failed to reject");
    }
  };

  // ── Settings actions ────────────────────────────────────────────────────
  const handleSaveSettings = async (values: any) => {
    const payload = {
      timezone: values.timezone,
      shift_start: (values.shift_start as Dayjs).format("HH:mm"),
      shift_end: (values.shift_end as Dayjs).format("HH:mm"),
      grace_minutes: Number(values.grace_minutes),
      half_day_minutes: Number(values.half_day_minutes),
      full_day_minutes: Number(values.full_day_minutes),
      weekly_offs: Array.from(new Set<number>((values.weekly_offs || []).map(Number))).sort(),
    };
    const response = await dispatch(updateAttendanceSettings(payload) as any);
    if (response.meta.requestStatus === "fulfilled") {
      message.success("Attendance rules saved");
      syncForm(normalizeSettings(response.payload), true);
      refreshTeamData();
    } else {
      message.error(response.payload?.message || "Failed to save settings");
    }
  };

  const handleAddHoliday = async () => {
    const name = holidayName.trim();
    if (!holidayDate || !name) return;
    const response = await dispatch(createHoliday({ holiday_date: holidayDate.format("YYYY-MM-DD"), name }) as any);
    if (response.meta.requestStatus === "fulfilled") {
      message.success("Holiday added");
      setHolidayDate(null);
      setHolidayName("");
      refreshTeamData();
    } else {
      message.error(response.payload?.message || "Failed to add holiday");
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    const response = await dispatch(deleteHoliday(id) as any);
    if (response.meta.requestStatus === "fulfilled") {
      message.success("Holiday removed");
      refreshTeamData();
    } else {
      message.error(response.payload?.message || "Failed to delete holiday");
    }
  };

  // ── Derived: today board ────────────────────────────────────────────────
  const employees: TeamTodayRow[] = teamToday?.employees || [];
  const counts = teamToday?.counts;
  const q = search.trim().toLowerCase();
  const matchesSearch = (name?: string, email?: string) =>
    !q || (name || "").toLowerCase().includes(q) || (email || "").toLowerCase().includes(q);

  const todayRows = useMemo(() => {
    const allowed = TODAY_FILTER_STATUSES[todayFilter];
    return employees.filter((e) => (!allowed || allowed.includes(e.status)) && matchesSearch(e.name, e.email));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, todayFilter, q]);

  const todayCards: { key: TodayFilter; label: string; icon: React.ReactNode; color: string; value: number }[] = [
    { key: "all", label: "Total", icon: <TeamOutlined />, color: "#4F46E5", value: counts?.total ?? employees.length },
    { key: "present", label: "Present", icon: <CheckCircleOutlined />, color: "#059669", value: counts?.present ?? 0 },
    { key: "late", label: "Late", icon: <ClockCircleOutlined />, color: "#D97706", value: counts?.late ?? 0 },
    { key: "not_marked", label: "Not in yet", icon: <HourglassOutlined />, color: "#6B7280", value: counts?.not_marked ?? 0 },
    {
      key: "leave",
      label: "On leave",
      icon: <CoffeeOutlined />,
      color: "#7C3AED",
      value: (counts?.on_leave ?? 0) + (counts?.half_day_leave ?? 0),
    },
    { key: "off", label: "Off / holiday", icon: <GiftOutlined />, color: "#0891B2", value: counts?.off ?? 0 },
  ];

  const todayColumns = [
    {
      title: "Employee",
      key: "name",
      render: (_: any, r: TeamTodayRow) => <Person id={r.user_id} name={r.name} email={r.email} />,
    },
    {
      title: "Status",
      key: "status",
      width: 200,
      render: (_: any, r: TeamTodayRow) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
          <StatusPill status={r.status} />
          {r.in_progress && <span className="att-live" style={{ fontSize: 11 }}>● Working now</span>}
          {r.missed_punch_out && <span className="att-late" style={{ fontSize: 11 }}>Missed punch-out</span>}
          {r.leave && r.status !== "ON_LEAVE" && <span className="att-person-email">{leaveLabel(r.leave)}</span>}
        </div>
      ),
    },
    {
      title: "Punch in",
      key: "in",
      width: 110,
      render: (_: any, r: TeamTodayRow) => <span className="att-num">{fmtTime(r.punch_in, tz)}</span>,
    },
    {
      title: "Punch out",
      key: "out",
      width: 110,
      render: (_: any, r: TeamTodayRow) =>
        r.in_progress ? <span className="att-dash">—</span> : <span className="att-num">{fmtTime(r.punch_out, tz)}</span>,
    },
    {
      title: "Hours",
      key: "hours",
      width: 100,
      render: (_: any, r: TeamTodayRow) => <span className="att-num" style={{ fontWeight: 600 }}>{fmtMinutes(r.worked_minutes, "—")}</span>,
    },
    {
      title: "Late by",
      key: "late",
      width: 100,
      render: (_: any, r: TeamTodayRow) =>
        r.late_minutes > 0 ? <span className="att-late">{fmtMinutes(r.late_minutes)}</span> : <span className="att-dash">—</span>,
    },
  ];

  // ── Derived: monthly grid ───────────────────────────────────────────────
  const monthDays = useMemo(() => daysInMonth(month), [month]);
  const monthRows = useMemo(
    () => (team || []).filter((e: any) => matchesSearch(e.name, e.email)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [team, q],
  );
  const dayIndex = useMemo(() => {
    const byUser = new Map<any, Map<string, DayStatus>>();
    (team || []).forEach((e: any) => {
      const m = new Map<string, DayStatus>();
      (e.days || []).forEach((d: DayStatus) => m.set(d.date, d));
      byUser.set(e.user_id, m);
    });
    return byUser;
  }, [team]);

  const monthTotals = (e: any) => {
    const s = e.stats;
    if (!s) {
      // Backend omitted stats — fall back to the legacy per-employee fields.
      return { p: e.days_present ?? 0, l: 0, hd: 0, a: 0, lv: 0, mins: e.total_minutes || 0, pct: 0 };
    }
    return {
      p: s.present ?? 0,
      l: s.late ?? 0,
      hd: s.half_day ?? 0,
      a: s.absent ?? 0,
      lv: s.on_leave ?? 0,
      mins: s.total_worked_minutes || e.total_minutes || 0,
      pct: s.attendance_percent ?? 0,
    };
  };

  const exportCsv = () => {
    if (!monthRows.length) {
      message.info("Nothing to export for this month");
      return;
    }
    const header = [
      "Employee",
      "Email",
      ...monthDays.map((d) => `${Number(d.slice(8))} ${WEEKDAYS[new Date(d + "T00:00:00Z").getUTCDay()]}`),
      "Present",
      "Late",
      "Half day",
      "Absent",
      "Leave",
      "Hours worked",
      "Overtime hours",
      "Attendance %",
    ];
    const lines = [header.map(csvEscape).join(",")];
    monthRows.forEach((e: any) => {
      const days = dayIndex.get(e.user_id) || new Map();
      const t = monthTotals(e);
      const cells = monthDays.map((d) => {
        const day = days.get(d);
        if (!day) return "";
        const code = statusMeta(day.status).short;
        return day.status === "UPCOMING" || day.status === "NA" ? "" : code;
      });
      lines.push(
        [
          e.name,
          e.email,
          ...cells,
          t.p,
          t.l,
          t.hd,
          t.a,
          t.lv,
          (t.mins / 60).toFixed(2),
          ((e.stats?.overtime_minutes || 0) / 60).toFixed(2),
          t.pct,
        ]
          .map(csvEscape)
          .join(","),
      );
    });
    lines.push("");
    lines.push(
      csvEscape(
        "Legend: " + LEGEND.map((s) => `${statusMeta(s).short}=${statusMeta(s).label}`).join("; "),
      ),
    );
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ── Derived: leave ──────────────────────────────────────────────────────
  const pendingCount = statusFilter === "pending" ? teamLeaves.length : undefined;

  const yearOptions = useMemo(() => {
    const y = Number(todayInTz(tz).slice(0, 4));
    return [y - 1, y, y + 1, y + 2].map((v) => ({ label: String(v), value: v }));
  }, [tz]);

  const tzOptions = useMemo(() => {
    const list = TIMEZONES.includes(formSettings.timezone) ? TIMEZONES : [formSettings.timezone, ...TIMEZONES];
    return list.map((z) => ({ label: z.replace(/_/g, " "), value: z }));
  }, [formSettings.timezone]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "today", label: "Today", icon: <FieldTimeOutlined /> },
    { key: "monthly", label: "Monthly", icon: <TableOutlined /> },
    { key: "leave", label: "Leave requests", icon: <FileTextOutlined />, count: pendingCount || undefined },
    { key: "settings", label: "Settings", icon: <SettingOutlined /> },
  ];

  const loadingForTab = tab === "today" ? teamTodayLoading : tab === "monthly" ? teamLoading : false;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="att-root">
      <div className="att-hero">
        <div className="att-hero-gradient" />
        <div className="att-hero-noise" />
        <div className="att-hero-orb one" />
        <div className="att-hero-orb two" />
        <div className="att-hero-inner">
          <div className="att-hero-row">
            <div>
              <div className="att-page-title">
                <div className="att-page-title-icon"><TeamOutlined /></div>
                Team Attendance
              </div>
              <div className="att-page-subtitle">
                Live presence, monthly registers, leave approvals and shift rules for your company.
                <span style={{ display: "block", marginTop: 4, color: "rgba(255,255,255,.45)" }}>
                  {fmtDay(todayDate, { weekday: "long", day: "numeric", month: "long" })} · Shift {settings.shift_start}–
                  {settings.shift_end} · {settings.grace_minutes}m grace · {tz}
                </span>
              </div>
            </div>
            <div className="att-hero-actions">
              {(tab === "today" || tab === "monthly") && (
                <button
                  className="att-hero-btn ghost"
                  onClick={() => (tab === "today" ? refreshToday() : refreshMonth())}
                  disabled={loadingForTab}
                >
                  <ReloadOutlined spin={loadingForTab} />
                  <span className="lbl">Refresh</span>
                </button>
              )}
              {tab === "monthly" && (
                <button className="att-hero-btn" onClick={exportCsv} disabled={teamLoading}>
                  <DownloadOutlined />
                  <span className="lbl">Export CSV</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs (float into the hero curve) ──────────────────────────────── */}
      <div className="att-toolbar float">
        <div className="att-toolbar-inner">
          <div className="att-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={`att-tab${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key)}
                title={t.label}
              >
                {t.icon}
                <span className="lbl">{t.label}</span>
                {t.count ? <span className="count">{t.count}</span> : null}
              </button>
            ))}
          </div>
          <div className="att-spacer" />
          {(tab === "today" || tab === "monthly") && (
            <div className="att-search-wrap">
              <SearchOutlined className="att-search-icon" />
              <input
                className="att-input"
                placeholder="Search employee or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          {tab === "monthly" && (
            <DatePicker
              picker="month"
              value={dayjs(month + "-01")}
              onChange={(v) => v && setMonth(v.format("YYYY-MM"))}
              allowClear={false}
              format="MMM YYYY"
            />
          )}
        </div>
      </div>

      {/* ══ TODAY ═══════════════════════════════════════════════════════════ */}
      {tab === "today" && (
        <>
          <div className="att-stats-wrap" style={{ marginTop: 0 }}>
            <div className="att-stats six">
              {todayCards.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`att-stat-card clickable${todayFilter === c.key ? " active" : ""}`}
                  style={{ borderLeftColor: c.color, ["--att-stat-color" as any]: c.color }}
                  onClick={() => setTodayFilter(c.key)}
                >
                  <div className="att-stat-label">
                    <span style={{ color: c.color }}>{c.icon}</span>
                    {c.label}
                  </div>
                  <div className="att-stat-value" style={{ color: c.color }}>
                    {teamTodayLoading && !teamToday ? "—" : c.value}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="att-body">
            <div className="att-card">
              <div className="att-card-header">
                <span className="att-card-icon"><FieldTimeOutlined /></span>
                <div className="att-card-title">
                  Who's in today
                  <div className="att-card-sub">
                    Auto-refreshes every 2 minutes
                    {teamTodayError && !teamTodayLoading && (
                      <span style={{ color: "#DC2626", marginLeft: 8 }}>
                        · Couldn't refresh{teamToday ? " — showing last loaded data" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <span className="att-badge">
                  {todayRows.length} of {employees.length}
                </span>
              </div>
              <div className="att-table-wrap">
                <Table
                  rowKey="user_id"
                  loading={teamTodayLoading && !!teamToday}
                  columns={todayColumns as any}
                  dataSource={todayRows}
                  scroll={{ x: "max-content" }}
                  locale={{
                    emptyText: teamTodayLoading ? (
                      <div className="att-center"><Spin /></div>
                    ) : (
                      <EmptyState icon={<TeamOutlined />} text="No employees match" sub="Try another filter or search." />
                    ),
                  }}
                  pagination={todayRows.length > 25 ? { pageSize: 25, showSizeChanger: false } : false}
                />
              </div>
              <div className="att-mobile-list">
                {teamTodayLoading && !teamToday ? (
                  <div className="att-center"><Spin /></div>
                ) : todayRows.length === 0 ? (
                  <EmptyState icon={<TeamOutlined />} text="No employees match" />
                ) : (
                  todayRows.map((r) => (
                    <div className="att-mobile-card" key={r.user_id}>
                      <div className="att-mobile-top">
                        <Person id={r.user_id} name={r.name} email={r.email} />
                        <StatusPill status={r.status} />
                      </div>
                      <div className="att-mobile-figs">
                        <div>
                          <div className="att-mobile-label">In</div>
                          <div className="att-mobile-val">{fmtTime(r.punch_in, tz)}</div>
                        </div>
                        <div>
                          <div className="att-mobile-label">Out</div>
                          <div className="att-mobile-val">{r.in_progress ? "Working" : fmtTime(r.punch_out, tz)}</div>
                        </div>
                        <div>
                          <div className="att-mobile-label">Hours</div>
                          <div className="att-mobile-val">{fmtMinutes(r.worked_minutes, "—")}</div>
                        </div>
                        <div>
                          <div className="att-mobile-label">Late</div>
                          <div className="att-mobile-val" style={{ color: r.late_minutes > 0 ? "#D97706" : undefined }}>
                            {r.late_minutes > 0 ? fmtMinutes(r.late_minutes) : "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ MONTHLY ═════════════════════════════════════════════════════════ */}
      {tab === "monthly" && (
        <div className="att-body">
          <div className="att-card">
            <div className="att-card-header">
              <span className="att-card-icon"><CalendarOutlined /></span>
              <div className="att-card-title">
                {fmtMonth(month)} register
                <div className="att-card-sub">Hover a cell for details · click to open the day</div>
              </div>
              <span className="att-badge">{monthRows.length} employees</span>
            </div>
            {teamLoading && team.length === 0 ? (
              <div className="att-center"><Spin /></div>
            ) : monthRows.length === 0 ? (
              <EmptyState icon={<TableOutlined />} text="No employees found" sub={q ? "Try a different search." : undefined} />
            ) : (
              <Spin spinning={teamLoading}>
                <div className="att-grid-scroll">
                  <table className="att-mgrid">
                    <thead>
                      <tr>
                        <th className="name-col">Employee</th>
                        {monthDays.map((d) => {
                          const wd = new Date(d + "T00:00:00Z").getUTCDay();
                          const isOff = settings.weekly_offs.includes(wd);
                          return (
                            <th key={d} className={`day-col${isOff ? " off" : ""}${d === todayDate ? " today" : ""}`}>
                              {Number(d.slice(8))}
                              <span className="wd">{WEEKDAYS[wd].slice(0, 2)}</span>
                            </th>
                          );
                        })}
                        <th className="tot-col first" title="Present">P</th>
                        <th className="tot-col" title="Late">L</th>
                        <th className="tot-col" title="Half day">HD</th>
                        <th className="tot-col" title="Absent">A</th>
                        <th className="tot-col" title="Leave">LV</th>
                        <th className="tot-col" title="Hours worked">Hours</th>
                        <th className="tot-col" title="Attendance %">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((e: any) => {
                        const days = dayIndex.get(e.user_id) || new Map<string, DayStatus>();
                        const t = monthTotals(e);
                        return (
                          <tr key={e.user_id}>
                            <td className="name-col">
                              <Person id={e.user_id} name={e.name} email={e.email} sm />
                            </td>
                            {monthDays.map((d) => {
                              const day = days.get(d);
                              if (!day) return <td key={d} className="day-col" />;
                              const m = statusMeta(day.status);
                              const quiet = day.status === "UPCOMING" || day.status === "NA";
                              const flagged = day.missed_punch_out || day.worked_on_off;
                              const tip = (
                                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                                  <div style={{ fontWeight: 700 }}>
                                    {fmtDay(d)} · {m.label}
                                  </div>
                                  {day.holiday_name && <div>{day.holiday_name}</div>}
                                  {day.leave && <div>{leaveLabel(day.leave)}</div>}
                                  {day.punch_in && (
                                    <div>
                                      {fmtTime(day.punch_in, tz)} – {day.in_progress ? "now" : fmtTime(day.punch_out, tz)} ·{" "}
                                      {fmtMinutes(day.worked_minutes)}
                                    </div>
                                  )}
                                  {day.late_minutes > 0 && <div>Late by {fmtMinutes(day.late_minutes)}</div>}
                                  {day.overtime_minutes > 0 && <div>Overtime {fmtMinutes(day.overtime_minutes)}</div>}
                                  {day.missed_punch_out && <div>Missed punch-out (auto closed)</div>}
                                  {day.worked_on_off && <div>Worked on an off day</div>}
                                </div>
                              );
                              return (
                                <td key={d} className="day-col">
                                  {quiet ? (
                                    <div className={`att-mcell${d === todayDate ? " today" : ""}`} />
                                  ) : (
                                    <Tooltip title={tip} mouseEnterDelay={0.15}>
                                      <div
                                        className={`att-mcell${d === todayDate ? " today" : ""}${flagged ? " flag" : ""}`}
                                        style={{ background: m.bg, color: m.color, cursor: "pointer" }}
                                        onClick={() => setDetail({ name: e.name || e.email, day })}
                                      >
                                        {m.short}
                                      </div>
                                    </Tooltip>
                                  )}
                                </td>
                              );
                            })}
                            <td className="tot-col first" style={{ color: "#059669" }}>{t.p}</td>
                            <td className="tot-col" style={{ color: "#D97706" }}>{t.l}</td>
                            <td className="tot-col" style={{ color: "#EA580C" }}>{t.hd}</td>
                            <td className="tot-col" style={{ color: "#DC2626" }}>{t.a}</td>
                            <td className="tot-col" style={{ color: "#7C3AED" }}>{t.lv}</td>
                            <td className="tot-col" title={fmtMinutes(t.mins)}>{fmtHoursShort(t.mins) || "0"}</td>
                            <td className="tot-col">
                              <span className={`att-pct ${pctClass(t.pct)}`}>{t.pct}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Spin>
            )}
            <div className="att-legend">
              {LEGEND.map((s) => {
                const m = statusMeta(s);
                return (
                  <span className="att-legend-item" key={s}>
                    <span className="att-mcell" style={{ background: m.bg, color: m.color, width: 22, height: 18, margin: 0, fontSize: 9 }}>
                      {m.short}
                    </span>
                    {m.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ LEAVE REQUESTS ══════════════════════════════════════════════════ */}
      {tab === "leave" && (
        <div className="att-body">
          <div className="att-card">
            <div className="att-card-header">
              <span className="att-card-icon"><FileTextOutlined /></span>
              <div className="att-card-title">Leave requests</div>
              <div className="att-chips">
                {[
                  { key: "pending", label: "Pending" },
                  { key: "approved", label: "Approved" },
                  { key: "rejected", label: "Rejected" },
                  { key: undefined, label: "All" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className={`att-chip${statusFilter === opt.key ? " active" : ""}`}
                    onClick={() => setStatusFilter(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {teamLeavesLoading && teamLeaves.length === 0 ? (
              <div className="att-center"><Spin /></div>
            ) : teamLeaves.length === 0 ? (
              <EmptyState icon={<FileTextOutlined />} text="No leave requests" sub={statusFilter === "pending" ? "You're all caught up." : undefined} />
            ) : (
              <Spin spinning={teamLeavesLoading}>
                {teamLeaves.map((leave: any) => {
                  const name =
                    [leave.user?.first_name, leave.user?.last_name].filter(Boolean).join(" ") || leave.user?.email || "—";
                  const ls = LEAVE_STYLE[leave.status] || LEAVE_STYLE.pending;
                  const busy = reviewingId === leave.id;
                  return (
                    <div className="att-leave-row" key={leave.id}>
                      <div className="att-leave-main">
                        <span className="att-avatar" style={{ background: avatarColor(leave.user?.id ?? name) }}>
                          {initials(name, leave.user?.email)}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="att-list-title">
                            {name}
                            {leave.leave_type === "HALF_DAY" && (
                              <span className="att-mini-tag">
                                Half day{leave.half_day_period ? ` · ${leave.half_day_period}` : ""}
                              </span>
                            )}
                          </div>
                          <div className="att-list-sub">
                            <CalendarOutlined /> {fmtDay(leave.from_date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                            {leave.from_date !== leave.to_date &&
                              ` – ${fmtDay(leave.to_date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`}
                          </div>
                          <div className="att-leave-reason">{leave.reason}</div>
                          {leave.status !== "pending" && (
                            <div className="att-list-sub" style={{ marginTop: 4 }}>
                              Reviewed by {[leave.reviewer?.first_name, leave.reviewer?.last_name].filter(Boolean).join(" ") || "—"}
                              {leave.review_note ? ` — “${leave.review_note}”` : ""}
                            </div>
                          )}
                          {rejectingId === leave.id && (
                            <div className="att-reject-box">
                              <Input
                                size="small"
                                placeholder="Optional note for rejection"
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                onPressEnter={() => handleReject(leave.id)}
                                autoFocus
                              />
                              <button className="att-btn sm reject" disabled={busy} onClick={() => handleReject(leave.id)}>
                                Confirm reject
                              </button>
                              <button
                                className="att-btn sm"
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectNote("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {leave.status === "pending" && rejectingId !== leave.id && (
                        <div className="att-leave-actions">
                          <Popconfirm title="Approve this leave?" onConfirm={() => handleApprove(leave.id)}>
                            <button className="att-btn sm approve" disabled={busy}>
                              <CheckOutlined /> Approve
                            </button>
                          </Popconfirm>
                          <button className="att-btn sm reject" disabled={busy} onClick={() => setRejectingId(leave.id)}>
                            <CloseOutlined /> Reject
                          </button>
                        </div>
                      )}
                      {leave.status !== "pending" && (
                        <span className="att-status" style={{ background: ls.bg, color: ls.color, textTransform: "capitalize" }}>
                          <span className="att-status-dot" style={{ background: ls.color }} />
                          {leave.status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </Spin>
            )}
          </div>
        </div>
      )}

      {/* ══ SETTINGS ════════════════════════════════════════════════════════ */}
      {tab === "settings" && (
        <div className="att-body">
          <div className="att-grid-2">
            <div className="att-card">
              <div className="att-card-header">
                <span className="att-card-icon"><ClockCircleOutlined /></span>
                <div className="att-card-title">
                  Shift rules
                  <div className="att-card-sub">
                    {formSettings.is_default ? "Using default rules — save to customise" : "Applies to every employee in the company"}
                  </div>
                </div>
              </div>
              <div className="att-card-body">
                <Spin spinning={settingsLoading}>
                  <Form form={form} layout="vertical" onFinish={handleSaveSettings} requiredMark={false}>
                    <Form.Item name="timezone" label="Timezone" rules={[{ required: true, message: "Pick a timezone" }]}>
                      <Select options={tzOptions} showSearch />
                    </Form.Item>
                    <div className="att-form-grid">
                      <Form.Item name="shift_start" label="Shift start" rules={[{ required: true, message: "Required" }]}>
                        <TimePicker format="HH:mm" minuteStep={5} style={{ width: "100%" }} allowClear={false} />
                      </Form.Item>
                      <Form.Item
                        name="shift_end"
                        label="Shift end"
                        dependencies={["shift_start"]}
                        rules={[
                          { required: true, message: "Required" },
                          ({ getFieldValue }) => ({
                            validator(_, value: Dayjs) {
                              const start: Dayjs = getFieldValue("shift_start");
                              if (!value || !start) return Promise.resolve();
                              return value.hour() * 60 + value.minute() > start.hour() * 60 + start.minute()
                                ? Promise.resolve()
                                : Promise.reject(new Error("Must be after shift start"));
                            },
                          }),
                        ]}
                      >
                        <TimePicker format="HH:mm" minuteStep={5} style={{ width: "100%" }} allowClear={false} />
                      </Form.Item>
                      <Form.Item
                        name="grace_minutes"
                        label="Grace period (min)"
                        rules={[{ required: true, type: "number", min: 0, max: 240, message: "0 – 240 minutes" }]}
                      >
                        <InputNumber min={0} max={240} precision={0} style={{ width: "100%" }} />
                      </Form.Item>
                      <Form.Item
                        name="half_day_minutes"
                        label="Half-day minimum (min)"
                        dependencies={["full_day_minutes"]}
                        rules={[
                          { required: true, type: "number", min: 30, max: 1440, message: "30 – 1440 minutes" },
                          ({ getFieldValue }) => ({
                            validator(_, value: number) {
                              const full = getFieldValue("full_day_minutes");
                              if (value == null || full == null || value < full) return Promise.resolve();
                              return Promise.reject(new Error("Must be less than full-day minimum"));
                            },
                          }),
                        ]}
                      >
                        <InputNumber min={30} max={1440} precision={0} style={{ width: "100%" }} />
                      </Form.Item>
                      <Form.Item
                        name="full_day_minutes"
                        label="Full-day minimum (min)"
                        rules={[{ required: true, type: "number", min: 60, max: 1440, message: "60 – 1440 minutes" }]}
                      >
                        <InputNumber min={60} max={1440} precision={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </div>
                    <Form.Item name="weekly_offs" label="Weekly off days">
                      <Checkbox.Group
                        options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ label: WEEKDAYS[d], value: d }))}
                      />
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate>
                      {({ getFieldsValue }) => {
                        const v = getFieldsValue();
                        const start: Dayjs | undefined = v.shift_start;
                        const grace = Number(v.grace_minutes) || 0;
                        const lateAfter = start ? start.add(grace, "minute").format("HH:mm") : "—";
                        return (
                          <div className="att-preview">
                            Punch-in after <b>{lateAfter}</b> is marked <b>Late</b>. A closed day with at least{" "}
                            <b>{fmtMinutes(v.full_day_minutes)}</b> worked is a full day, at least{" "}
                            <b>{fmtMinutes(v.half_day_minutes)}</b> is a <b>Half day</b>, anything less is <b>Absent</b>.
                            Hours beyond the shift length count as overtime.
                          </div>
                        );
                      }}
                    </Form.Item>

                    <button type="submit" className="att-btn primary" disabled={settingsSaving}>
                      {settingsSaving ? <Spin size="small" /> : <CheckOutlined />} Save rules
                    </button>
                  </Form>
                </Spin>
              </div>
            </div>

            <div className="att-card">
              <div className="att-card-header">
                <span className="att-card-icon"><GiftOutlined /></span>
                <div className="att-card-title">
                  Holidays
                  <div className="att-card-sub">Company-wide days off — not counted as absent</div>
                </div>
                <Select
                  size="small"
                  value={holidayYear}
                  options={yearOptions}
                  onChange={(v) => setHolidayYear(v)}
                  style={{ width: 90 }}
                />
              </div>
              <div className="att-card-body">
                <div className="att-holiday-add">
                  <DatePicker
                    value={holidayDate}
                    onChange={(v) => setHolidayDate(v)}
                    format="DD MMM YYYY"
                    placeholder="Date"
                    defaultPickerValue={dayjs(`${holidayYear}-01-01`)}
                    disabledDate={(d) => d.year() !== holidayYear}
                  />
                  <Input
                    placeholder="Holiday name (e.g. Diwali)"
                    value={holidayName}
                    maxLength={100}
                    onChange={(e) => setHolidayName(e.target.value)}
                    onPressEnter={handleAddHoliday}
                  />
                  <button
                    className="att-btn primary"
                    onClick={handleAddHoliday}
                    disabled={!holidayDate || !holidayName.trim() || holidayMutating}
                  >
                    <PlusOutlined /> Add
                  </button>
                </div>

                {holidaysLoading && holidays.length === 0 ? (
                  <div className="att-center"><Spin /></div>
                ) : holidays.length === 0 ? (
                  <EmptyState icon={<GiftOutlined />} text={`No holidays for ${holidayYear}`} sub="Add public holidays and company days off." />
                ) : (
                  <Spin spinning={holidaysLoading}>
                    {holidays.map((h: Holiday) => {
                      const date = String(h.holiday_date).slice(0, 10);
                      const past = date < todayDate;
                      return (
                        <div className="att-list-row" key={h.id} style={{ alignItems: "center" }}>
                          <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                            <div className={`att-holiday-date${past ? " past" : ""}`}>
                              <div className="d">{Number(date.slice(8))}</div>
                              <div className="m">{fmtDay(date, { month: "short" })}</div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="att-list-title">{h.name}</div>
                              <div className="att-list-sub">
                                {fmtDay(date, { weekday: "long" })}
                                {settings.weekly_offs.includes(new Date(date + "T00:00:00Z").getUTCDay()) && " · falls on a weekly off"}
                                {past && " · passed"}
                              </div>
                            </div>
                          </div>
                          <Popconfirm title={`Delete "${h.name}"?`} onConfirm={() => handleDeleteHoliday(h.id)}>
                            <button className="att-btn sm icon" disabled={holidayMutating} aria-label="Delete holiday">
                              <DeleteOutlined />
                            </button>
                          </Popconfirm>
                        </div>
                      );
                    })}
                  </Spin>
                )}
              </div>
              {holidays.length > 0 && (
                <div className="att-card-footer">
                  {holidays.length} holiday{holidays.length === 1 ? "" : "s"} in {holidayYear}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DayDetailsDrawer
        open={!!detail}
        day={detail?.day || null}
        person={detail?.name}
        timezone={tz}
        onClose={() => setDetail(null)}
      />
    </div>
  );
};

export default TeamAttendancePage;
