import React, { useEffect, useMemo, useState } from "react";
import { Empty, Spin, Tag } from "antd";
import {
  ClockCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  CalendarOutlined,
  HistoryOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  punchIn,
  punchOut,
  getTodayAttendance,
  getAttendanceHistory,
} from "../redux/attendanceActions";
import { getMyLeaves } from "@/modules/leave/redux/leaveActions";
import RequestLeaveModal from "@/modules/leave/components/RequestLeaveModal";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Same elevated-indigo system as Company/Profile pages (--comp-*/--prof-*),
// reused here under an --att-* prefix.
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --att-bg: var(--background);
      --att-surface: var(--card);
      --att-border: var(--border);
      --att-accent: #4F46E5;
      --att-accent-2: #818CF8;
      --att-accent-light: #EEF2FF;
      --att-text: var(--foreground);
      --att-muted: var(--muted-foreground);
      --att-radius: 14px;
      --att-radius-sm: 8px;
      --att-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --att-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      --att-shadow-lg: 0 24px 48px -12px rgba(30,27,75,.35);
    }

    .att-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--att-bg); min-height: 100vh; color: var(--att-text);
    }

    /* ── Hero ── */
    .att-hero {
      position: relative; overflow: hidden;
      padding: 40px 28px 64px;
      background:
        radial-gradient(120% 140% at 12% 0%, #4338CA 0%, transparent 55%),
        radial-gradient(90% 120% at 100% 10%, #6D28D9 0%, transparent 50%),
        linear-gradient(160deg, #14123A 0%, #1E1B4B 45%, #2A2470 100%);
    }
    .att-hero::after {
      content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 36px;
      background: var(--att-bg); border-radius: 32px 32px 0 0;
    }
    .att-hero-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .att-hero-grid {
      position: absolute; inset: 0; pointer-events: none; opacity: .35;
      background-image:
        linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
      background-size: 42px 42px;
      -webkit-mask-image: radial-gradient(70% 90% at 50% 0%, #000 30%, transparent 85%);
              mask-image: radial-gradient(70% 90% at 50% 0%, #000 30%, transparent 85%);
    }
    .att-glow { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }
    .att-glow-1 { width: 320px; height: 320px; top: -120px; right: 8%; background: radial-gradient(circle, rgba(129,140,248,.55), transparent 70%); }
    .att-glow-2 { width: 260px; height: 260px; bottom: -140px; left: 4%; background: radial-gradient(circle, rgba(99,102,241,.4), transparent 70%); }
    .att-glow-punched { background: radial-gradient(circle, rgba(52,211,153,.5), transparent 70%) !important; }

    .att-hero-inner { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; text-align: center; }
    .att-eyebrow {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
      color: rgba(224,224,255,.75); margin-bottom: 18px;
    }
    .att-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D399; box-shadow: 0 0 0 4px rgba(52,211,153,.18); }

    .att-clock {
      font-size: clamp(38px, 8vw, 64px); font-weight: 800; color: #fff; letter-spacing: 1px;
      font-variant-numeric: tabular-nums; line-height: 1;
    }
    .att-date { color: rgba(224,224,255,.65); font-size: 14px; margin-top: 8px; font-weight: 500; }

    /* ── Punch button ── */
    .att-punch-wrap { display: flex; justify-content: center; margin: 36px 0 8px; }
    .att-punch-btn {
      width: 168px; height: 168px; border-radius: 50%; border: none; cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      font-family: 'Inter', sans-serif; color: #fff; font-weight: 800; font-size: 15px;
      transition: transform .18s ease, box-shadow .18s ease;
      position: relative;
    }
    .att-punch-btn::before {
      content: ''; position: absolute; inset: -10px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.18); animation: att-pulse 2.4s ease-in-out infinite;
    }
    .att-punch-btn.idle { background: linear-gradient(150deg, #34D399, #059669); box-shadow: 0 16px 40px -6px rgba(5,150,105,.55); }
    .att-punch-btn.punched { background: linear-gradient(150deg, #F87171, #DC2626); box-shadow: 0 16px 40px -6px rgba(220,38,38,.55); }
    .att-punch-btn:hover { transform: translateY(-3px) scale(1.02); }
    .att-punch-btn:disabled { opacity: .7; cursor: not-allowed; transform: none; }
    .att-punch-btn .anticon { font-size: 30px; }
    .att-punch-elapsed { font-size: 12px; color: rgba(224,224,255,.7); margin-top: 14px; font-variant-numeric: tabular-nums; }

    @keyframes att-pulse {
      0%, 100% { transform: scale(1); opacity: .5; }
      50% { transform: scale(1.08); opacity: 0; }
    }

    .att-leave-btn {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 20px;
      padding: 8px 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,.2);
      background: rgba(255,255,255,.08); color: #fff; font-size: 12.5px; font-weight: 700;
      cursor: pointer; font-family: 'Inter', sans-serif; backdrop-filter: blur(10px); transition: all .15s;
    }
    .att-leave-btn:hover { background: rgba(255,255,255,.16); }

    /* ── Today summary chips ── */
    .att-summary-row { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 28px; }
    .att-summary-chip {
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px; padding: 10px 16px; backdrop-filter: blur(10px); min-width: 110px;
    }
    .att-summary-chip-value { font-size: 15px; font-weight: 800; color: #fff; }
    .att-summary-chip-label { font-size: 10.5px; color: rgba(224,224,255,.6); text-transform: uppercase; letter-spacing: .4px; margin-top: 3px; }

    /* ── Body / history ── */
    .att-body { padding: 0 24px 40px; max-width: 720px; margin: -16px auto 0; position: relative; z-index: 2; }
    .att-card {
      background: var(--att-surface); border: 1px solid var(--att-border);
      border-radius: var(--att-radius); box-shadow: var(--att-shadow-md); overflow: hidden;
    }
    .att-card::before {
      content: ''; display: block; height: 3px;
      background: linear-gradient(90deg, var(--att-accent), var(--att-accent-2));
    }
    .att-card-header {
      padding: 16px 20px; border-bottom: 1px solid var(--att-border);
      display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; color: var(--att-text);
    }
    .att-card-header .icon {
      width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 14px; background: linear-gradient(135deg, var(--att-accent), var(--att-accent-2));
      box-shadow: 0 4px 10px rgba(79,70,229,.35);
    }
    .att-card-body { padding: 10px 20px 18px; }

    .att-day-group { padding: 14px 0; border-bottom: 1px dashed var(--att-border); }
    .att-day-group:last-child { border-bottom: none; }
    .att-day-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .att-day-date { font-size: 13px; font-weight: 700; color: var(--att-text); }
    .att-day-total { font-size: 12px; font-weight: 700; color: var(--att-accent); background: var(--att-accent-light); padding: 2px 9px; border-radius: 20px; }
    .att-session-row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 7px 10px; border-radius: var(--att-radius-sm); background: var(--muted); margin-bottom: 6px; font-size: 12.5px;
    }
    .att-session-row:last-child { margin-bottom: 0; }
    .att-session-times { color: var(--att-text); font-weight: 600; }
    .att-session-duration { color: var(--att-muted); }
    .att-session-open { color: #059669; font-weight: 700; }

    .att-load-more {
      display: block; width: 100%; text-align: center; padding: 10px; margin-top: 10px;
      border: 1px dashed var(--att-border); border-radius: var(--att-radius-sm); background: transparent;
      color: var(--att-accent); font-weight: 700; font-size: 12.5px; cursor: pointer; font-family: 'Inter', sans-serif;
    }
    .att-load-more:hover { background: var(--att-accent-light); }
    .att-load-more:disabled { opacity: .6; cursor: not-allowed; }

    .att-leave-row {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
      padding: 10px; border-radius: var(--att-radius-sm); background: var(--muted); margin-bottom: 8px; font-size: 12.5px;
    }
    .att-leave-row:last-child { margin-bottom: 0; }
    .att-leave-dates { font-weight: 700; color: var(--att-text); }
    .att-leave-reason { color: var(--att-muted); margin-top: 2px; }

    @media (max-width: 640px) {
      .att-hero { padding: 28px 16px 48px; }
      .att-body { padding: 0 16px 40px; }
      .att-punch-btn { width: 140px; height: 140px; }
    }
  `}</style>
);

const formatTime = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const formatMinutes = (mins?: number) => {
  if (!mins && mins !== 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatDateHeading = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const AttendancePage: React.FC = () => {
  const dispatch = useDispatch();
  const { today, todayLoading, punching, history, historyPagination, historyLoading } =
    useSelector((state: any) => state.attendance);
  const { myLeaves, myLeavesLoading } = useSelector((state: any) => state.leave);

  const [now, setNow] = useState(new Date());
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  useEffect(() => {
    dispatch(getTodayAttendance() as any);
    dispatch(getAttendanceHistory({ page: 1 }) as any);
    dispatch(getMyLeaves() as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isPunchedIn = !!today && !today.punch_out;

  const elapsed = useMemo(() => {
    if (!isPunchedIn) return null;
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
      dispatch(getAttendanceHistory({ page: 1 }) as any);
    }
  };

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

  const loadMore = () => {
    dispatch(getAttendanceHistory({ page: historyPagination.page + 1 }) as any);
  };

  const hasMore = historyPagination.page < historyPagination.pages;

  return (
    <div className="att-root">
      <GlobalStyles />

      <div className="att-hero">
        <div className="att-hero-grid" />
        <div className={`att-glow att-glow-1${isPunchedIn ? " att-glow-punched" : ""}`} />
        <div className="att-glow att-glow-2" />
        <div className="att-hero-noise" />

        <div className="att-hero-inner">
          <div className="att-eyebrow">
            <span className="att-eyebrow-dot" />
            Attendance
          </div>

          <div className="att-clock">
            {now.toLocaleTimeString(undefined, { hour12: true })}
          </div>
          <div className="att-date">
            <CalendarOutlined />{" "}
            {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>

          <div className="att-punch-wrap">
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
            </button>
          </div>
          {elapsed && <div className="att-punch-elapsed">Elapsed since punch-in: {elapsed}</div>}

          {today && (
            <div className="att-summary-row">
              <div className="att-summary-chip">
                <div className="att-summary-chip-value">{formatTime(today.punch_in)}</div>
                <div className="att-summary-chip-label">Punched In</div>
              </div>
              <div className="att-summary-chip">
                <div className="att-summary-chip-value">{today.punch_out ? formatTime(today.punch_out) : "—"}</div>
                <div className="att-summary-chip-label">Punched Out</div>
              </div>
              <div className="att-summary-chip">
                <div className="att-summary-chip-value">
                  {today.total_minutes !== null && today.total_minutes !== undefined
                    ? formatMinutes(today.total_minutes)
                    : "In progress"}
                </div>
                <div className="att-summary-chip-label">Duration</div>
              </div>
            </div>
          )}

          <button className="att-leave-btn" onClick={() => setLeaveModalOpen(true)}>
            <FileTextOutlined /> Request Leave
          </button>
        </div>
      </div>

      <div className="att-body">
        <div className="att-card" style={{ marginBottom: 16 }}>
          <div className="att-card-header">
            <span className="icon"><FileTextOutlined /></span>
            My Leave Requests
          </div>
          <div className="att-card-body">
            {myLeavesLoading && myLeaves.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}><Spin /></div>
            ) : myLeaves.length === 0 ? (
              <Empty description="No leave requests yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "20px 0" }} />
            ) : (
              myLeaves.map((leave: any) => (
                <div className="att-leave-row" key={leave.id}>
                  <div>
                    <div className="att-leave-dates">
                      {new Date(leave.from_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {leave.from_date !== leave.to_date &&
                        ` – ${new Date(leave.to_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                    </div>
                    <div className="att-leave-reason">{leave.reason}</div>
                  </div>
                  <Tag
                    color={leave.status === "approved" ? "success" : leave.status === "rejected" ? "error" : "warning"}
                    style={{ textTransform: "capitalize", flexShrink: 0 }}
                  >
                    {leave.status}
                  </Tag>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="att-card">
          <div className="att-card-header">
            <span className="icon"><HistoryOutlined /></span>
            Recent History
          </div>
          <div className="att-card-body">
            {historyLoading && groupedHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}><Spin /></div>
            ) : groupedHistory.length === 0 ? (
              <Empty description="No attendance recorded yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "24px 0" }} />
            ) : (
              <>
                {groupedHistory.map((group) => (
                  <div className="att-day-group" key={group.work_date}>
                    <div className="att-day-head">
                      <span className="att-day-date"><ClockCircleOutlined style={{ marginRight: 6 }} />{formatDateHeading(group.work_date)}</span>
                      <span className="att-day-total">{formatMinutes(group.total)}</span>
                    </div>
                    {group.sessions.map((s: any) => (
                      <div className="att-session-row" key={s.id}>
                        <span className="att-session-times">{formatTime(s.punch_in)} – {s.punch_out ? formatTime(s.punch_out) : "now"}</span>
                        <span className={s.punch_out ? "att-session-duration" : "att-session-open"}>
                          {s.punch_out ? formatMinutes(s.total_minutes) : "In progress"}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {hasMore && (
                  <button className="att-load-more" onClick={loadMore} disabled={historyLoading}>
                    {historyLoading ? "Loading…" : "Load more"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <RequestLeaveModal
        visible={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onSuccess={() => dispatch(getMyLeaves() as any)}
      />
    </div>
  );
};

export default AttendancePage;
