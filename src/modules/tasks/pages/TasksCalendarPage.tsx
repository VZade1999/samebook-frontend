import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Popover, Segmented, Spin, Tooltip, message } from "antd";
import {
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  FireOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  ScheduleOutlined,
  WarningFilled,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import TasksShell from "../components/TasksShell";
import TaskPanel from "../components/TaskPanel";
import TaskFormModal from "../components/TaskFormModal";
import { Avatar, PriorityFlag, StatusPill, TypeIcon } from "../components/TaskBits";
import { useTaskPanel, useTasksMeta } from "../hooks";
import { tasksService } from "../services/tasksService";
import { STATUS_META, TASKS_CHANGED_EVENT, TYPE_META, TaskItem, errText, todayStr } from "../constants";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_IN_CELL = 3;
const FMT = "YYYY-MM-DD";

type View = "month" | "week";

const mondayOf = (d: Dayjs) => d.subtract((d.day() + 6) % 7, "day").startOf("day");

/** One item inside a day cell / week column. */
const Chip: React.FC<{ t: TaskItem; onOpen: (id: number) => void; roomy?: boolean }> = ({ t, onOpen, roomy }) => {
  const s = STATUS_META[t.status];
  const type = TYPE_META[t.type];
  return (
    <Tooltip
      mouseEnterDelay={0.4}
      title={
        <div className="tc-tip">
          <div><b>{t.key}</b> · {type.label}</div>
          <div>{t.title}</div>
          <div className="tc-tip-meta">{s.label}{t.assignee ? ` · ${t.assignee.name}` : ""}{t.due_time ? ` · ${t.due_time}` : ""}</div>
        </div>
      }
    >
      <div
        className={`tc-chip${roomy ? " roomy" : ""}${t.status === "DONE" ? " done" : ""}${t.overdue ? " overdue" : ""}`}
        style={{ ["--tc-type" as any]: type.color, ["--tc-status" as any]: s.color }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(t.id);
        }}
      >
        <span className="tc-chip-dot" />
        {t.due_time && <span className="tc-chip-time">{t.due_time}</span>}
        <span className="tc-chip-text">{t.title}</span>
        {roomy && t.assignee && <Avatar name={t.assignee.name} size={18} />}
      </div>
    </Tooltip>
  );
};

const TasksCalendarPage: React.FC = () => {
  const meta = useTasksMeta();
  const panel = useTaskPanel();
  const today = todayStr();

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Dayjs>(dayjs().startOf("day"));
  const [selected, setSelected] = useState<string>(today);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [items, setItems] = useState<TaskItem[]>([]);
  const [upcoming, setUpcoming] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOn, setCreateOn] = useState<string | null>(null);

  // Visible range: a Monday-first month grid, or one week.
  const range = useMemo(() => {
    if (view === "week") {
      const start = mondayOf(cursor);
      return { start, end: start.add(6, "day") };
    }
    const first = cursor.startOf("month");
    const last = cursor.endOf("month");
    const start = mondayOf(first);
    const end = mondayOf(last).add(6, "day");
    return { start, end };
  }, [view, cursor]);

  const days = useMemo(() => {
    const out: Dayjs[] = [];
    for (let d = range.start; !d.isAfter(range.end, "day"); d = d.add(1, "day")) out.push(d);
    return out;
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    const scopeParam = scope === "mine" ? "mine" : undefined;
    try {
      const [grid, next] = await Promise.all([
        tasksService.calendar({ from: range.start.format(FMT), to: range.end.format(FMT), scope: scopeParam }),
        tasksService.calendar({ from: today, to: dayjs().add(6, "day").format(FMT), scope: scopeParam }),
      ]);
      setItems(grid.data.data || []);
      setUpcoming((next.data.data || []).filter((t: TaskItem) => t.status !== "DONE"));
    } catch (err) {
      message.error(errText(err, "Could not load calendar"));
    } finally {
      setLoading(false);
    }
  }, [range, scope, today]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, load);
  }, [load]);

  const byDay = useMemo(() => {
    const m = new Map<string, TaskItem[]>();
    items.forEach((t) => {
      if (!t.due_date) return;
      const list = m.get(t.due_date) || [];
      list.push(t);
      m.set(t.due_date, list);
    });
    // Open first, then by time.
    m.forEach((list) =>
      list.sort((a, b) => Number(a.status === "DONE") - Number(b.status === "DONE") || String(a.due_time || "99").localeCompare(String(b.due_time || "99"))),
    );
    return m;
  }, [items]);

  // Month (or week) summary.
  const stats = useMemo(() => {
    const inPeriod = items.filter((t) => {
      if (!t.due_date) return false;
      return view === "week" || dayjs(t.due_date).month() === cursor.month();
    });
    const busiest = [...byDay.entries()]
      .filter(([d]) => view === "week" || dayjs(d).month() === cursor.month())
      .sort((a, b) => b[1].length - a[1].length)[0];
    return {
      total: inPeriod.length,
      overdue: inPeriod.filter((t) => t.overdue).length,
      done: inPeriod.filter((t) => t.status === "DONE").length,
      busiest: busiest ? { day: busiest[0], count: busiest[1].length } : null,
    };
  }, [items, byDay, view, cursor]);
  const maxPerDay = useMemo(() => Math.max(1, ...[...byDay.values()].map((l) => l.length)), [byDay]);

  const move = (dir: 1 | -1) => setCursor((c) => (view === "week" ? c.add(dir, "week") : c.add(dir, "month").startOf("month")));
  const goToday = () => {
    setCursor(dayjs().startOf("day"));
    setSelected(today);
  };

  const periodLabel =
    view === "week"
      ? `${range.start.format("DD MMM")} – ${range.end.format(range.start.month() === range.end.month() ? "DD" : "DD MMM")} ${range.end.format("YYYY")}`
      : cursor.format("MMMM");
  const selectedItems = byDay.get(selected) || [];
  const selectedDay = dayjs(selected);
  const canCreate = !!meta?.can.create;

  const StatusDots: React.FC<{ list: TaskItem[] }> = ({ list }) => (
    <span className="tc-dots">
      {list.slice(0, 6).map((t) => (
        <i key={t.id} style={{ background: STATUS_META[t.status].color }} />
      ))}
    </span>
  );

  return (
    <TasksShell title="Calendar" subtitle="What's due when — plan the month, and never miss a deadline.">
      {/* ── Summary ─────────────────────────────────────────────────────── */}
      <div className="tc-stats">
        <div className="tc-stat">
          <span className="tc-stat-icon indigo"><ScheduleOutlined /></span>
          <div><div className="tc-stat-value">{stats.total}</div><div className="tc-stat-label">Due this {view}</div></div>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-icon red"><WarningFilled /></span>
          <div><div className="tc-stat-value">{stats.overdue}</div><div className="tc-stat-label">Overdue</div></div>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-icon green"><CheckCircleFilled /></span>
          <div>
            <div className="tc-stat-value">{stats.done}<small>/{stats.total}</small></div>
            <div className="tc-stat-label">Completed</div>
          </div>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-icon amber"><FireOutlined /></span>
          <div>
            <div className="tc-stat-value small">{stats.busiest ? dayjs(stats.busiest.day).format("ddd, DD MMM") : "—"}</div>
            <div className="tc-stat-label">Busiest day{stats.busiest ? ` · ${stats.busiest.count} items` : ""}</div>
          </div>
        </div>
      </div>

      <div className="tc-layout">
        {/* ── Calendar ───────────────────────────────────────────────── */}
        <div className="tc-main">
          <div className="tc-toolbar">
            <div className="tc-period">
              <div className="tc-period-text">
                <span className="tc-period-main">{periodLabel}</span>
                {view === "month" && <span className="tc-period-year">{cursor.format("YYYY")}</span>}
              </div>
              <div className="tc-nav">
                <button onClick={() => move(-1)} aria-label="Previous"><LeftOutlined /></button>
                <button className="tc-today" onClick={goToday}>Today</button>
                <button onClick={() => move(1)} aria-label="Next"><RightOutlined /></button>
              </div>
              {loading && <Spin size="small" />}
            </div>
            <div className="tc-controls">
              <Segmented
                value={view}
                onChange={(v) => setView(v as View)}
                options={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }]}
              />
              <Segmented
                value={scope}
                onChange={(v) => setScope(v as any)}
                options={[
                  { value: "mine", label: "My tasks" },
                  { value: "all", label: meta?.can.manage ? "Everyone" : "Incl. assigned by me" },
                ]}
              />
            </div>
          </div>

          <div className={`tc-calendar ${view}`}>
            <div className="tc-weekdays">
              {WEEKDAYS.map((w, i) => (
                <div key={w} className={i >= 5 ? "weekend" : ""}>
                  {view === "week" ? (
                    <>
                      <span>{w}</span>
                      <b className={days[i].format(FMT) === today ? "is-today" : ""}>{days[i].date()}</b>
                    </>
                  ) : (
                    w
                  )}
                </div>
              ))}
            </div>
            <div className="tc-grid">
              {days.map((d, i) => {
                const key = d.format(FMT);
                const list = byDay.get(key) || [];
                const outside = view === "month" && d.month() !== cursor.month();
                const isToday = key === today;
                const heat = list.length ? 0.04 + (list.length / maxPerDay) * 0.1 : 0;
                const extra = list.length - MAX_IN_CELL;
                const overdueHere = list.some((t) => t.overdue);
                return (
                  <div
                    key={key}
                    className={[
                      "tc-cell",
                      outside && "outside",
                      isToday && "today",
                      selected === key && "selected",
                      i % 7 >= 5 && "weekend",
                      d.isBefore(dayjs(), "day") && "past",
                    ].filter(Boolean).join(" ")}
                    style={{ ["--tc-heat" as any]: heat }}
                    onClick={() => setSelected(key)}
                  >
                    <div className="tc-cell-head">
                      {view === "month" && <span className="tc-date">{d.date()}</span>}
                      {overdueHere && <Tooltip title="Has overdue items"><WarningFilled className="tc-warn" /></Tooltip>}
                      {list.length > 0 && view === "month" && <StatusDots list={list} />}
                      {canCreate && (
                        <Tooltip title={`New task due ${d.format("DD MMM")}`}>
                          <button
                            className="tc-add"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreateOn(key);
                            }}
                          >
                            <PlusOutlined />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                    <div className="tc-cell-body">
                      {(view === "week" ? list : list.slice(0, MAX_IN_CELL)).map((t) => (
                        <Chip key={t.id} t={t} onOpen={panel.open} roomy={view === "week"} />
                      ))}
                      {view === "month" && extra > 0 && (
                        <Popover
                          trigger="click"
                          title={d.format("dddd, DD MMMM")}
                          content={<div className="tc-pop">{list.map((t) => <Chip key={t.id} t={t} onOpen={panel.open} roomy />)}</div>}
                        >
                          <button className="tc-more" onClick={(e) => e.stopPropagation()}>+{extra} more</button>
                        </Popover>
                      )}
                      {view === "week" && !list.length && <div className="tc-empty-day">Free</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="tc-legend">
            {Object.entries(STATUS_META).map(([k, s]) => (
              <span key={k}><i style={{ background: s.color }} /> {s.label}</span>
            ))}
            <span className="tc-legend-sep" />
            {Object.entries(TYPE_META).map(([k, t]) => (
              <span key={k}><i className="bar" style={{ background: t.color }} /> {t.label}</span>
            ))}
          </div>
        </div>

        {/* ── Agenda sidebar ─────────────────────────────────────────── */}
        <aside className="tc-side">
          <div className="tc-agenda">
            <div className="tc-agenda-head">
              <div className="tc-agenda-date">
                <span className="tc-agenda-day">{selectedDay.format("DD")}</span>
                <div>
                  <div className="tc-agenda-weekday">{selectedDay.format("dddd")}</div>
                  <div className="tc-agenda-month">{selectedDay.format("MMMM YYYY")}{selected === today ? " · Today" : ""}</div>
                </div>
              </div>
              {canCreate && (
                <Tooltip title="New task due this day">
                  <button className="tc-agenda-add" onClick={() => setCreateOn(selected)}><PlusOutlined /></button>
                </Tooltip>
              )}
            </div>
            {selectedItems.length ? (
              <div className="tc-agenda-list">
                {selectedItems.map((t) => (
                  <div
                    key={t.id}
                    className={`tc-agenda-item${t.status === "DONE" ? " done" : ""}`}
                    style={{ ["--tc-type" as any]: TYPE_META[t.type].color }}
                    onClick={() => panel.open(t.id)}
                  >
                    <div className="tc-agenda-time">
                      {t.due_time || <span className="tk-muted">All day</span>}
                    </div>
                    <div className="tc-agenda-main">
                      <div className="tc-agenda-title"><TypeIcon type={t.type} size={18} /> {t.title}</div>
                      <div className="tc-agenda-meta">
                        <span className="tk-key small">{t.key}</span>
                        <StatusPill status={t.status} />
                        <PriorityFlag priority={t.priority} />
                        {t.assignee && <span className="tk-person"><Avatar name={t.assignee.name} size={18} /> {t.assignee.name.split(" ")[0]}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tc-agenda-empty">
                <CalendarOutlined />
                <b>Nothing due</b>
                <span>{canCreate ? "Enjoy the free day — or plan something with +." : "Enjoy the free day."}</span>
              </div>
            )}
          </div>

          <div className="tc-upnext">
            <div className="tc-upnext-head"><ClockCircleOutlined /> Up next · 7 days</div>
            {upcoming.length ? (
              upcoming.slice(0, 8).map((t) => {
                const d = dayjs(t.due_date);
                return (
                  <div key={t.id} className="tc-upnext-item" onClick={() => panel.open(t.id)}>
                    <span className={`tc-upnext-date${t.due_date === today ? " today" : ""}`}>
                      <b>{d.format("DD")}</b>
                      <span>{d.format("ddd")}</span>
                    </span>
                    <div className="tc-upnext-main">
                      <div className="tc-upnext-title">{t.title}</div>
                      <div className="tk-muted small">{t.key}{t.assignee ? ` · ${t.assignee.name}` : ""}</div>
                    </div>
                    <span className="tc-upnext-status" style={{ background: STATUS_META[t.status].color }} />
                  </div>
                );
              })
            ) : (
              <div className="tk-muted small" style={{ padding: "6px 2px" }}>No deadlines in the next 7 days. 🎉</div>
            )}
          </div>
        </aside>
      </div>

      <TaskPanel taskId={panel.taskId} onClose={panel.close} onOpen={panel.open} />
      <TaskFormModal
        open={!!createOn}
        onClose={() => setCreateOn(null)}
        defaultDueDate={createOn || undefined}
        onCreated={(t) => {
          if (t?.due_date) setSelected(t.due_date);
        }}
      />
    </TasksShell>
  );
};

export default TasksCalendarPage;
