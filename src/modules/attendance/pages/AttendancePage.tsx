import React, { useEffect, useMemo, useState } from "react";
import { Spin, Tooltip, message } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LeftOutlined,
  LoginOutlined,
  LogoutOutlined,
  PercentageOutlined,
  RightOutlined,
  RiseOutlined,
  ScheduleOutlined,
  WarningOutlined,
  CoffeeOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  punchIn,
  punchOut,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceCalendar,
} from "../redux/attendanceActions";
import { getMyLeaves } from "@/modules/leave/redux/leaveActions";
import RequestLeaveModal from "@/modules/leave/components/RequestLeaveModal";
import {
  DEFAULT_SETTINGS,
  DayStatus,
  DayStatusCode,
  LEGEND,
  WEEKDAYS,
  WEEKDAYS_MON_FIRST,
  clockInTz,
  fmtDay,
  fmtMinutes,
  fmtMonth,
  fmtTime,
  longDateInTz,
  monthGrid,
  monthInTz,
  shiftMonth,
  statusMeta,
  toMinutes,
  todayInTz,
} from "../constants";
import { DayDetailsDrawer, EmptyState } from "../components/AttendanceUI";
import "../styles/attendance.scss";

const LEAVE_STYLE: Record<string, { color: string; bg: string }> = {
  pending: { color: "#D97706", bg: "rgba(217,119,6,.13)" },
  approved: { color: "#059669", bg: "rgba(5,150,105,.13)" },
  rejected: { color: "#DC2626", bg: "rgba(220,38,38,.12)" },
};

const compactTime = (iso: string | null | undefined, tz: string) =>
  iso ? fmtTime(iso, tz).replace(/^0/, "").replace(" AM", "a").replace(" PM", "p") : "";

/** Minutes past midnight of an instant, in the given timezone. */
const localMinutes = (iso: string, tz: string) => {
  try {
    const p: Record<string, string> = {};
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .forEach((x) => (p[x.type] = x.value));
    return (Number(p.hour) % 24) * 60 + Number(p.minute);
  } catch {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  }
};

// Highlightable stat cards: clicking dims every calendar day of another status.
type Highlight = "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT" | "LEAVE" | null;
const matchesHighlight = (status: DayStatusCode, h: Highlight) => {
  if (!h) return true;
  if (h === "LEAVE") return status === "ON_LEAVE" || status === "HALF_DAY_LEAVE";
  return status === h;
};

const AttendancePage: React.FC = () => {
  const dispatch = useDispatch();
  const {
    today,
    todayLoading,
    punching,
    history,
    historyPagination,
    historyLoading,
    calendar,
    calendarLoading,
    calendarError,
    settings: storedSettings,
  } = useSelector((state: any) => state.attendance);
  const { myLeaves, myLeavesLoading } = useSelector((state: any) => state.leave);

  const settings = calendar?.settings || storedSettings || DEFAULT_SETTINGS;
  const tz: string = settings.timezone;

  const [now, setNow] = useState(new Date());
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [month, setMonth] = useState<string>(() => monthInTz(DEFAULT_SETTINGS.timezone));
  const [monthTouched, setMonthTouched] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayStatus | null>(null);
  const [highlight, setHighlight] = useState<Highlight>(null);
  // Last known status of *today* (the calendar only returns it for the current month).
  const [todayStatus, setTodayStatus] = useState<DayStatus | null>(null);

  useEffect(() => {
    dispatch(getTodayAttendance() as any);
    dispatch(getAttendanceHistory({ page: 1 }) as any);
    dispatch(getMyLeaves() as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch(getAttendanceCalendar(month) as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // Once the company timezone is known, snap the default month to it (only
  // if the user hasn't navigated yet — e.g. near midnight on the 1st).
  useEffect(() => {
    if (monthTouched || !calendar) return;
    const m = monthInTz(tz);
    if (m !== month) setMonth(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tz, calendar]);

  useEffect(() => {
    if (calendar?.today) setTodayStatus(calendar.today);
  }, [calendar]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isPunchedIn = !!today && !today.punch_out;
  const todayDate = todayInTz(tz, now);

  const elapsed = useMemo(() => {
    if (!isPunchedIn || !today?.punch_in) return null;
    const diffMs = now.getTime() - new Date(today.punch_in).getTime();
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [isPunchedIn, today, now]);

  const handlePunch = async () => {
    const action = isPunchedIn ? punchOut(undefined) : punchIn(undefined);
    const response = await dispatch(action as any);
    if (response.meta.requestStatus === "fulfilled") {
      message.success(isPunchedIn ? "Punched out" : "Punched in");
      dispatch(getAttendanceHistory({ page: 1 }) as any);
      dispatch(getAttendanceCalendar(month) as any);
    } else {
      message.error(response.payload?.message || `Failed to punch ${isPunchedIn ? "out" : "in"}`);
    }
  };

  // ── Today's status pill ────────────────────────────────────────────────
  const todayPill = useMemo(() => {
    const ts: DayStatus | null = todayStatus && todayStatus.date === todayDate ? todayStatus : null;
    const firstPunch = ts?.punch_in || today?.punch_in || null;
    if (firstPunch) {
      let late = ts && ts.punch_in ? ts.late_minutes : 0;
      if (!ts || !ts.punch_in) {
        const local = localMinutes(firstPunch, tz);
        const start = toMinutes(settings.shift_start);
        late = local > start + settings.grace_minutes ? local - start : 0;
      }
      const done = !!today && !!today.punch_out;
      if (late > 0)
        return { status: "LATE", label: `Late by ${fmtMinutes(late)}${done ? " · Done for today" : ""}` };
      return { status: "PRESENT", label: `On time${done ? " · Done for today" : ""}` };
    }
    if (ts) {
      if (ts.status === "HOLIDAY") return { status: "HOLIDAY", label: ts.holiday_name ? `Holiday · ${ts.holiday_name}` : "Holiday" };
      if (ts.status === "WEEKLY_OFF") return { status: "WEEKLY_OFF", label: "Weekly off" };
      if (ts.status === "ON_LEAVE") return { status: "ON_LEAVE", label: "On leave today" };
      if (ts.status === "HALF_DAY_LEAVE") return { status: "HALF_DAY_LEAVE", label: "Half-day leave" };
    }
    return { status: "NOT_MARKED", label: "Not punched in" };
  }, [todayStatus, today, todayDate, tz, settings]);

  const offDays = (settings.weekly_offs || []).map((d: number) => WEEKDAYS[d]).join(", ");
  const shiftLine = `Shift ${settings.shift_start}–${settings.shift_end} · ${settings.grace_minutes}m grace${
    offDays ? ` · ${offDays} off` : ""
  }`;

  // Worked today: closed sessions + live time of the open one.
  const workedToday = useMemo(() => {
    const todays = (history || []).filter((r: any) => r.work_date === todayDate);
    let mins = todays.reduce((sum: number, r: any) => sum + (r.punch_out ? r.total_minutes || 0 : 0), 0);
    if (isPunchedIn && today?.punch_in) {
      mins += Math.max(0, Math.floor((now.getTime() - new Date(today.punch_in).getTime()) / 60000));
    } else if (todays.length === 0 && today?.total_minutes) {
      mins = today.total_minutes;
    }
    return mins;
  }, [history, todayDate, isPunchedIn, today, now]);

  // ── Calendar ───────────────────────────────────────────────────────────
  const calendarMatches = calendar && calendar.month === month;
  const dayMap = useMemo(() => {
    const map = new Map<string, DayStatus>();
    if (calendarMatches) (calendar.days || []).forEach((d: DayStatus) => map.set(d.date, d));
    return map;
  }, [calendar, calendarMatches]);
  const cells = useMemo(() => monthGrid(month), [month]);
  const stats = calendarMatches ? calendar.stats : null;

  const goMonth = (delta: number) => {
    setMonthTouched(true);
    setHighlight(null);
    setMonth((m) => shiftMonth(m, delta));
  };
  const isCurrentMonth = month === monthInTz(tz, now);

  const sessionsFor = (date: string) => (history || []).filter((r: any) => r.work_date === date);

  // ── Recent sessions (grouped by day) ───────────────────────────────────
  const groupedHistory = useMemo(() => {
    const groups: { work_date: string; total: number; sessions: any[] }[] = [];
    const byDate = new Map<string, { work_date: string; total: number; sessions: any[] }>();
    (history || []).forEach((row: any) => {
      if (!byDate.has(row.work_date)) {
        const group = { work_date: row.work_date, total: 0, sessions: [] as any[] };
        byDate.set(row.work_date, group);
        groups.push(group);
      }
      const group = byDate.get(row.work_date)!;
      group.total += row.total_minutes || 0;
      group.sessions.push(row);
    });
    return groups;
  }, [history]);
  const hasMore = historyPagination.page < historyPagination.pages;

  const statCards: {
    key: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    value: React.ReactNode;
    note?: string;
    highlight?: Highlight;
    progress?: number;
  }[] = [
    { key: "present", label: "Present", icon: <CheckCircleOutlined />, color: "#059669", value: stats?.present ?? "—", highlight: "PRESENT", note: stats ? `of ${stats.elapsed_working_days} working days` : undefined },
    { key: "late", label: "Late", icon: <ClockCircleOutlined />, color: "#D97706", value: stats?.late ?? "—", highlight: "LATE", note: `after ${settings.grace_minutes}m grace` },
    { key: "half", label: "Half day", icon: <FieldTimeOutlined />, color: "#EA580C", value: stats?.half_day ?? "—", highlight: "HALF_DAY", note: `< ${fmtMinutes(settings.full_day_minutes)} worked` },
    { key: "absent", label: "Absent", icon: <CloseCircleOutlined />, color: "#DC2626", value: stats?.absent ?? "—", highlight: "ABSENT" },
    { key: "leave", label: "Leave", icon: <CoffeeOutlined />, color: "#7C3AED", value: stats?.on_leave ?? "—", highlight: "LEAVE", note: "approved days" },
    { key: "avg", label: "Avg / day", icon: <ScheduleOutlined />, color: "#4F46E5", value: stats ? fmtMinutes(stats.avg_worked_minutes, "—") : "—", note: stats ? `${fmtMinutes(stats.total_worked_minutes)} total` : undefined },
    { key: "ot", label: "Overtime", icon: <RiseOutlined />, color: "#0891B2", value: stats ? fmtMinutes(stats.overtime_minutes, "0h") : "—", note: "beyond shift length" },
    {
      key: "pct",
      label: "Attendance",
      icon: <PercentageOutlined />,
      color: "#059669",
      value: stats ? `${stats.attendance_percent}%` : "—",
      progress: stats ? Math.max(0, Math.min(100, stats.attendance_percent)) : 0,
    },
  ];

  return (
    <div className="att-root">
      {/* ── Hero: clock + punch ─────────────────────────────────────────── */}
      <div className="att-hero">
        <div className="att-hero-gradient" />
        <div className="att-hero-noise" />
        <div className={`att-hero-orb one${isPunchedIn ? " live" : ""}`} />
        <div className="att-hero-orb two" />
        <div className="att-hero-inner">
          <div className="att-hero-row">
            <div style={{ minWidth: 0 }}>
              <div className="att-eyebrow">
                <span className={`att-eyebrow-dot${isPunchedIn ? " live" : ""}`} />
                {isPunchedIn ? "You're clocked in" : "My Attendance"}
              </div>
              <div className="att-clock">{clockInTz(now, tz)}</div>
              <div className="att-date">
                <CalendarOutlined /> {longDateInTz(now, tz)}
              </div>
              <div className="att-hero-pills">
                <span className="att-hero-chip strong">
                  <span className="dot" style={{ background: statusMeta(todayPill.status).color }} />
                  {todayPill.label}
                </span>
                <span className="att-hero-chip">
                  <ClockCircleOutlined /> {shiftLine}
                </span>
              </div>
              <div className="att-hero-figs">
                <div className="att-fig">
                  <div className="att-fig-label">Punched in</div>
                  <div className="att-fig-value">{today?.punch_in ? fmtTime(today.punch_in, tz) : "—"}</div>
                </div>
                <div className="att-fig">
                  <div className="att-fig-label">Punched out</div>
                  <div className="att-fig-value">{today?.punch_out ? fmtTime(today.punch_out, tz) : "—"}</div>
                </div>
                <div className="att-fig">
                  <div className="att-fig-label">Worked today</div>
                  <div className={`att-fig-value${isPunchedIn ? " live" : ""}`}>{fmtMinutes(workedToday, "—")}</div>
                </div>
              </div>
            </div>

            <div className="att-punch-col">
              <button
                className={`att-punch-btn ${isPunchedIn ? "punched" : "idle"}`}
                onClick={handlePunch}
                disabled={punching || todayLoading}
              >
                {punching || todayLoading ? (
                  <Spin size="small" style={{ filter: "invert(1) brightness(2)" }} />
                ) : isPunchedIn ? (
                  <LogoutOutlined />
                ) : (
                  <LoginOutlined />
                )}
                {isPunchedIn ? "Punch Out" : "Punch In"}
                {elapsed && <span className="sub">{elapsed}</span>}
              </button>
              <div className="att-punch-hint">
                {isPunchedIn ? "Elapsed since punch-in" : `Shift starts ${settings.shift_start}`}
              </div>
              <button className="att-hero-btn ghost" onClick={() => setLeaveModalOpen(true)}>
                <FileTextOutlined /> Request Leave
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Month stats ─────────────────────────────────────────────────── */}
      <div className="att-stats-wrap">
        <div className="att-stats">
          {statCards.map((c) => {
            const clickable = !!c.highlight;
            const active = clickable && highlight === c.highlight;
            return (
              <button
                key={c.key}
                type="button"
                className={`att-stat-card${clickable ? " clickable" : ""}${active ? " active" : ""}`}
                style={{ borderLeftColor: c.color, ["--att-stat-color" as any]: c.color }}
                onClick={clickable ? () => setHighlight(active ? null : c.highlight!) : undefined}
                title={clickable ? "Highlight these days in the calendar" : undefined}
              >
                <div className="att-stat-label">
                  <span style={{ color: c.color }}>{c.icon}</span>
                  {c.label}
                </div>
                <div className="att-stat-value" style={{ color: c.color }}>{c.value}</div>
                {c.progress !== undefined ? (
                  <div className="att-progress">
                    <span style={{ width: `${c.progress}%`, background: c.color }} />
                  </div>
                ) : (
                  c.note && <div className="att-stat-note">{c.note}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="att-body">
        <div className="att-grid-main">
          {/* ── Calendar ──────────────────────────────────────────────── */}
          <div className="att-card">
            <div className="att-card-header">
              <span className="att-card-icon"><CalendarOutlined /></span>
              <div className="att-card-title">
                Attendance calendar
                <div className="att-card-sub">
                  {stats ? `${stats.working_days} working days · ${stats.holidays} holidays · ${stats.weekly_offs} weekly offs` : " "}
                </div>
              </div>
              <div className="att-cal-nav">
                <button className="att-btn sm icon" onClick={() => goMonth(-1)} aria-label="Previous month">
                  <LeftOutlined />
                </button>
                <span className="att-cal-month">{fmtMonth(month)}</span>
                <button className="att-btn sm icon" onClick={() => goMonth(1)} aria-label="Next month">
                  <RightOutlined />
                </button>
                {!isCurrentMonth && (
                  <button
                    className="att-btn sm"
                    onClick={() => {
                      setMonthTouched(true);
                      setHighlight(null);
                      setMonth(monthInTz(tz));
                    }}
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
            <div className="att-card-body">
              {calendarError && !calendarLoading && <div className="att-error">{calendarError}</div>}
              <div className="att-cal-loading">
                {calendarLoading && (
                  <div className="att-cal-loading-mask"><Spin /></div>
                )}
                <div className="att-cal-weekdays">
                  {WEEKDAYS_MON_FIRST.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
                <div className="att-cal-grid" style={{ opacity: calendarLoading && !calendarMatches ? 0.4 : 1 }}>
                  {cells.map((date, i) => {
                    if (!date) return <div key={`pad-${i}`} className="att-cal-cell pad" />;
                    const d = dayMap.get(date);
                    const status = (d?.status || (date > todayDate ? "UPCOMING" : "NA")) as DayStatusCode;
                    const meta = statusMeta(status);
                    const quiet = status === "UPCOMING" || status === "NA";
                    const dim = !matchesHighlight(status, highlight);
                    const hasTimes = !!d?.punch_in;
                    const tag =
                      status === "HOLIDAY" ? "Holiday" : status === "WEEKLY_OFF" ? "Off" : quiet ? "" : meta.short;
                    const cell = (
                      <button
                        type="button"
                        key={date}
                        className={`att-cal-cell${date === todayDate ? " today" : ""}${quiet ? " muted" : ""}${dim ? " dim" : ""}`}
                        style={{
                          background: quiet ? undefined : meta.bg,
                          ["--att-cell-color" as any]: quiet ? "transparent" : meta.color,
                        }}
                        onClick={() =>
                          setSelectedDay(
                            d || {
                              date,
                              weekday: new Date(date + "T00:00:00Z").getUTCDay(),
                              status,
                              punch_in: null,
                              punch_out: null,
                              worked_minutes: 0,
                              late_minutes: 0,
                              overtime_minutes: 0,
                              in_progress: false,
                              missed_punch_out: false,
                              worked_on_off: false,
                              holiday_name: null,
                              leave: null,
                            },
                          )
                        }
                      >
                        <div className="att-cal-day">
                          <span className="att-cal-num">{Number(date.slice(8))}</span>
                          {tag && (
                            <span className="att-cal-tag" style={{ color: meta.color, background: quiet ? undefined : "var(--card)" }}>
                              {tag}
                            </span>
                          )}
                        </div>
                        {hasTimes ? (
                          <>
                            <div className="att-cal-times">
                              {compactTime(d!.punch_in, tz)}–{d!.in_progress ? "now" : compactTime(d!.punch_out, tz)}
                            </div>
                            <div className="att-cal-hours" style={{ color: meta.color }}>
                              {fmtMinutes(d!.worked_minutes, "0m")}
                            </div>
                            {d!.late_minutes > 0 && <div className="att-cal-flag">+{fmtMinutes(d!.late_minutes)} late</div>}
                            {d!.missed_punch_out && <div className="att-cal-flag">Missed punch-out</div>}
                          </>
                        ) : d?.holiday_name ? (
                          <div className="att-cal-label" style={{ color: meta.color }}>{d.holiday_name}</div>
                        ) : d?.leave ? (
                          <div className="att-cal-label" style={{ color: meta.color }}>
                            {d.leave.leave_type === "HALF_DAY" ? "Half-day leave" : "Leave"}
                          </div>
                        ) : null}
                      </button>
                    );
                    return d?.holiday_name ? (
                      <Tooltip key={date} title={d.holiday_name}>{cell}</Tooltip>
                    ) : (
                      cell
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="att-legend">
              {LEGEND.map((s) => {
                const m = statusMeta(s);
                return (
                  <span className="att-legend-item" key={s}>
                    <span className="att-legend-swatch" style={{ background: m.color }} />
                    {m.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="att-stack">
            {/* ── My leave requests ─────────────────────────────────────── */}
            <div className="att-card">
              <div className="att-card-header">
                <span className="att-card-icon"><FileTextOutlined /></span>
                <div className="att-card-title">My leave requests</div>
                {myLeaves.length > 0 && (
                  <span className="att-badge">
                    {myLeaves.filter((l: any) => l.status === "pending").length} pending
                  </span>
                )}
              </div>
              <div className="att-card-body">
                {myLeavesLoading && myLeaves.length === 0 ? (
                  <div className="att-center"><Spin /></div>
                ) : myLeaves.length === 0 ? (
                  <EmptyState icon={<FileTextOutlined />} text="No leave requests yet" sub="Use Request Leave above to apply." />
                ) : (
                  myLeaves.slice(0, 8).map((leave: any) => {
                    const ls = LEAVE_STYLE[leave.status] || LEAVE_STYLE.pending;
                    return (
                      <div className="att-list-row" key={leave.id}>
                        <div style={{ minWidth: 0 }}>
                          <div className="att-list-title">
                            {fmtDay(leave.from_date, { day: "numeric", month: "short" })}
                            {leave.from_date !== leave.to_date && ` – ${fmtDay(leave.to_date, { day: "numeric", month: "short" })}`}
                            {leave.leave_type === "HALF_DAY" && (
                              <span className="att-mini-tag">
                                Half day{leave.half_day_period ? ` · ${leave.half_day_period}` : ""}
                              </span>
                            )}
                          </div>
                          <div className="att-list-sub">{leave.reason}</div>
                          {leave.review_note && <div className="att-list-sub">Note: “{leave.review_note}”</div>}
                        </div>
                        <span className="att-status" style={{ background: ls.bg, color: ls.color, textTransform: "capitalize" }}>
                          <span className="att-status-dot" style={{ background: ls.color }} />
                          {leave.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Recent sessions ───────────────────────────────────────── */}
            <div className="att-card">
              <div className="att-card-header">
                <span className="att-card-icon"><HistoryOutlined /></span>
                <div className="att-card-title">Recent sessions</div>
              </div>
              <div className="att-card-body">
                {historyLoading && groupedHistory.length === 0 ? (
                  <div className="att-center"><Spin /></div>
                ) : groupedHistory.length === 0 ? (
                  <EmptyState icon={<HistoryOutlined />} text="No attendance recorded yet" />
                ) : (
                  <>
                    {groupedHistory.map((group) => (
                      <div className="att-list-row" key={group.work_date}>
                        <div style={{ minWidth: 0 }}>
                          <div className="att-list-title">
                            {group.work_date === todayDate ? "Today" : fmtDay(group.work_date)}
                          </div>
                          {group.sessions.map((s: any) => (
                            <div className="att-list-sub" key={s.id}>
                              {fmtTime(s.punch_in, tz)} – {s.punch_out ? fmtTime(s.punch_out, tz) : "now"}
                              {s.notes && String(s.notes).includes("Auto punched-out") && (
                                <span style={{ color: "#D97706", marginLeft: 6 }}>
                                  <WarningOutlined /> auto
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        {group.sessions.some((s: any) => !s.punch_out) ? (
                          <span className="att-live">In progress</span>
                        ) : (
                          <span className="att-hours">{fmtMinutes(group.total)}</span>
                        )}
                      </div>
                    ))}
                    {hasMore && (
                      <button
                        className="att-load-more"
                        onClick={() => dispatch(getAttendanceHistory({ page: historyPagination.page + 1 }) as any)}
                        disabled={historyLoading}
                      >
                        {historyLoading ? "Loading…" : "Load more"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DayDetailsDrawer
        open={!!selectedDay}
        day={selectedDay}
        timezone={tz}
        sessions={selectedDay ? sessionsFor(selectedDay.date) : undefined}
        onClose={() => setSelectedDay(null)}
      />

      <RequestLeaveModal
        visible={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onSuccess={() => {
          dispatch(getMyLeaves() as any);
        }}
      />
    </div>
  );
};

export default AttendancePage;
