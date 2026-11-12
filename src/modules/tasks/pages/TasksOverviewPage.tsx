import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker, Empty, Segmented, Spin, Tooltip, message } from "antd";
import {
  CheckCircleFilled,
  FireFilled,
  InboxOutlined,
  RiseOutlined,
  RightOutlined,
  ThunderboltFilled,
  TrophyFilled,
  UserDeleteOutlined,
  WarningFilled,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import TasksShell from "../components/TasksShell";
import { Avatar } from "../components/TaskBits";
import { tasksService } from "../services/tasksService";
import { STATUS_META, TASKS_CHANGED_EVENT, TYPE_META, TaskItem, TaskStatus, TaskType, errText, fmtDue } from "../constants";

interface Overview {
  from: string;
  to: string;
  totals: { open: number; overdue: number; unassigned: number; done_in_range: number; created_in_range: number };
  users: { id: number; name: string; open: number; overdue: number; due_today: number; done_in_range: number }[];
  days: { day: string; done: number; created: number }[];
  by_status?: Record<string, number>;
  by_type?: Record<string, { open: number; done: number }>;
  epics: (TaskItem & { overdue_items?: number })[];
}

type Preset = "7" | "30" | "90" | "month" | "custom";
const presetRange = (p: Preset): [Dayjs, Dayjs] => {
  if (p === "month") return [dayjs().startOf("month"), dayjs()];
  return [dayjs().subtract(Number(p) - 1, "day"), dayjs()];
};

// ─── Ring (health score / epic progress) ─────────────────────────────────────
const Ring: React.FC<{ value: number; size?: number; stroke?: number; color: string; track?: string; children?: React.ReactNode }> = ({
  value, size = 120, stroke = 10, color, track = "rgba(255,255,255,.18)", children,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="to-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * Math.max(0, Math.min(100, value))) / 100}
          style={{ transition: "stroke-dashoffset .8s ease" }}
        />
      </svg>
      <div className="to-ring-label">{children}</div>
    </div>
  );
};

// ─── Area chart (pure SVG) ───────────────────────────────────────────────────
const W = 720;
const H = 230;
const PAD = { l: 34, r: 12, t: 14, b: 28 };

const AreaChart: React.FC<{ days: Overview["days"] }> = ({ days }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(2, ...days.flatMap((d) => [d.created, d.done]));
  const niceMax = Math.ceil(max / 2) * 2;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (days.length <= 1 ? iw / 2 : (i / (days.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / niceMax) * ih;

  const line = (key: "created" | "done") =>
    days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const area = (key: "created" | "done") =>
    `${line(key)} L${x(days.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

  const ticks = [0, niceMax / 2, niceMax];
  const labelEvery = Math.max(1, Math.ceil(days.length / 10));
  const h = hover !== null ? days[hover] : null;

  return (
    <div className="to-chart">
      <svg viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="toCreated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818CF8" stopOpacity=".35" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="toDone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity=".35" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="to-grid" />
            <text x={PAD.l - 8} y={y(t) + 4} className="to-axis" textAnchor="end">{t}</text>
          </g>
        ))}
        {days.map((d, i) =>
          i % labelEvery === 0 || i === days.length - 1 ? (
            <text key={d.day} x={x(i)} y={H - 8} className="to-axis" textAnchor="middle">
              {dayjs(d.day).format(days.length > 31 ? "DD MMM" : "D")}
            </text>
          ) : null,
        )}
        <path d={area("created")} fill="url(#toCreated)" />
        <path d={area("done")} fill="url(#toDone)" />
        <path d={line("created")} className="to-line created" />
        <path d={line("done")} className="to-line done" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} className="to-cursor" />
            <circle cx={x(hover)} cy={y(days[hover].created)} r="4.5" className="to-dot created" />
            <circle cx={x(hover)} cy={y(days[hover].done)} r="4.5" className="to-dot done" />
          </>
        )}
        {days.map((d, i) => (
          <rect
            key={d.day}
            x={x(i) - iw / Math.max(1, days.length - 1) / 2}
            y={PAD.t}
            width={iw / Math.max(1, days.length - 1)}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {h && hover !== null && (
        <div className="to-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>{dayjs(h.day).format("ddd, DD MMM")}</b>
          <span><i style={{ background: "#818CF8" }} /> {h.created} created</span>
          <span><i style={{ background: "#10B981" }} /> {h.done} completed</span>
        </div>
      )}
    </div>
  );
};

// ─── Donut (status mix) ──────────────────────────────────────────────────────
const Donut: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const entries = (Object.keys(STATUS_META) as TaskStatus[]).map((s) => ({ s, v: data[s] || 0 }));
  const total = entries.reduce((a, e) => a + e.v, 0);
  const size = 150;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="to-donut-wrap">
      <div className="to-donut" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
          {total > 0 &&
            entries.filter((e) => e.v).map((e) => {
              const len = (e.v / total) * c;
              const seg = (
                <circle
                  key={e.s}
                  cx={size / 2} cy={size / 2} r={r} fill="none"
                  stroke={STATUS_META[e.s].color} strokeWidth={stroke}
                  strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset}
                />
              );
              offset += len;
              return seg;
            })}
        </svg>
        <div className="to-donut-label"><b>{total}</b><span>items</span></div>
      </div>
      <div className="to-donut-legend">
        {entries.map((e) => (
          <div key={e.s} className="to-donut-row">
            <i style={{ background: STATUS_META[e.s].color }} />
            <span>{STATUS_META[e.s].label}</span>
            <b>{e.v}</b>
            <em>{total ? Math.round((e.v / total) * 100) : 0}%</em>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────
const TasksOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<Preset>("30");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(presetRange("30"));
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await tasksService.overview({ from: range[0].format("YYYY-MM-DD"), to: range[1].format("YYYY-MM-DD") });
      setData(r.data.data);
    } catch (err) {
      message.error(errText(err, "Could not load overview"));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, load);
  }, [load]);

  const health = useMemo(() => {
    if (!data) return null;
    const { open, overdue } = data.totals;
    const score = open ? Math.round(((open - overdue) / open) * 100) : 100;
    const people = data.users.filter((u) => u.overdue > 0).length;
    const verdict =
      open === 0
        ? "Nothing open — the team is all clear."
        : overdue === 0
          ? "Everything is on schedule. Nice work!"
          : `${overdue} overdue item${overdue > 1 ? "s" : ""} across ${people} ${people === 1 ? "person" : "people"} need attention.`;
    const tone = score >= 90 ? "#34D399" : score >= 70 ? "#FBBF24" : "#F87171";
    const completion = data.totals.created_in_range
      ? Math.min(100, Math.round((data.totals.done_in_range / data.totals.created_in_range) * 100))
      : null;
    return { score, verdict, tone, completion };
  }, [data]);

  const maxLoad = useMemo(() => Math.max(1, ...(data?.users || []).map((u) => u.open)), [data]);
  const topPerformer = useMemo(() => {
    const best = [...(data?.users || [])].sort((a, b) => b.done_in_range - a.done_in_range)[0];
    return best && best.done_in_range > 0 ? best.id : null;
  }, [data]);
  const openPerson = (id: number) => navigate(`/app/tasks?scope=team&assignee=${id}`);
  const rangeLabel = `${range[0].format("DD MMM")} – ${range[1].format("DD MMM YYYY")}`;

  return (
    <TasksShell title="Team overview" subtitle="Who has what, what's overdue, and how work is moving.">
      <div className="to-toolbar">
        <Segmented
          value={preset}
          onChange={(v) => {
            const p = v as Preset;
            setPreset(p);
            if (p !== "custom") setRange(presetRange(p));
          }}
          options={[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
            { value: "month", label: "This month" },
            { value: "custom", label: "Custom" },
          ]}
        />
        {preset === "custom" && (
          <DatePicker.RangePicker
            value={range}
            format="DD MMM YYYY"
            allowClear={false}
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          />
        )}
        <span className="to-range">{rangeLabel}</span>
        {loading && <Spin size="small" />}
      </div>

      {!data || !health ? (
        <div className="tk-center"><Spin size="large" /></div>
      ) : (
        <>
          {/* ── Health banner ──────────────────────────────────────── */}
          <div className="to-banner">
            <div className="to-banner-glow" />
            <Ring value={health.score} color={health.tone} size={124} stroke={11}>
              <b>{health.score}</b>
              <span>health</span>
            </Ring>
            <div className="to-banner-text">
              <div className="to-banner-eyebrow">Team health</div>
              <div className="to-banner-title">{health.verdict}</div>
              <div className="to-banner-sub">
                {data.totals.open} open · {data.users.length} {data.users.length === 1 ? "person" : "people"} with access
                {health.completion !== null && <> · {health.completion}% of new work finished in this period</>}
              </div>
            </div>
            <div className="to-banner-mini">
              <div><b>{data.totals.created_in_range}</b><span>created</span></div>
              <div><b>{data.totals.done_in_range}</b><span>completed</span></div>
            </div>
          </div>

          {/* ── KPIs ───────────────────────────────────────────────── */}
          <div className="to-kpis">
            {[
              { label: "Open items", value: data.totals.open, icon: <InboxOutlined />, tone: "indigo", hint: "Not done yet" },
              { label: "Overdue", value: data.totals.overdue, icon: <WarningFilled />, tone: "red", hint: data.totals.overdue ? "Past their due date" : "Nothing late" },
              { label: "Unassigned", value: data.totals.unassigned, icon: <UserDeleteOutlined />, tone: "amber", hint: "Waiting for an owner" },
              { label: "Completed", value: data.totals.done_in_range, icon: <CheckCircleFilled />, tone: "green", hint: "In this period" },
              {
                label: "Completion rate",
                value: health.completion === null ? "—" : `${health.completion}%`,
                icon: <RiseOutlined />, tone: "blue", hint: "Completed ÷ created",
              },
            ].map((k) => (
              <div key={k.label} className={`to-kpi ${k.tone}`}>
                <span className="to-kpi-icon">{k.icon}</span>
                <div>
                  <div className="to-kpi-value">{k.value}</div>
                  <div className="to-kpi-label">{k.label}</div>
                  <div className="to-kpi-hint">{k.hint}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Trend + status mix ─────────────────────────────────── */}
          <div className="to-row">
            <div className="to-card grow">
              <div className="to-card-head">
                <div>
                  <div className="to-card-title">Created vs completed</div>
                  <div className="to-card-sub">Daily flow of work · {rangeLabel}</div>
                </div>
                <div className="to-chip-legend">
                  <span><i style={{ background: "#818CF8" }} /> Created <b>{data.totals.created_in_range}</b></span>
                  <span><i style={{ background: "#10B981" }} /> Completed <b>{data.totals.done_in_range}</b></span>
                </div>
              </div>
              <AreaChart days={data.days} />
            </div>

            <div className="to-card">
              <div className="to-card-head">
                <div>
                  <div className="to-card-title">Status mix</div>
                  <div className="to-card-sub">All items right now</div>
                </div>
              </div>
              <Donut data={data.by_status || {}} />
              {data.by_type && Object.keys(data.by_type).length > 0 && (
                <div className="to-types">
                  {(Object.keys(TYPE_META) as TaskType[]).filter((t) => data.by_type?.[t]).map((t) => {
                    const v = data.by_type![t];
                    const total = v.open + v.done;
                    return (
                      <div key={t} className="to-type-row">
                        <span className="to-type-name" style={{ color: TYPE_META[t].color }}>{TYPE_META[t].label}s</span>
                        <div className="to-type-bar">
                          <span style={{ width: `${(v.done / Math.max(1, total)) * 100}%`, background: TYPE_META[t].color }} />
                        </div>
                        <span className="to-type-num">{v.done}/{total}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── People + epics ─────────────────────────────────────── */}
          <div className="to-row">
            <div className="to-card grow">
              <div className="to-card-head">
                <div>
                  <div className="to-card-title">People & workload</div>
                  <div className="to-card-sub">Click a person to see their items</div>
                </div>
                <div className="to-chip-legend">
                  <span><i style={{ background: "#DC2626" }} /> Overdue</span>
                  <span><i style={{ background: "#2563EB" }} /> Due today</span>
                  <span><i style={{ background: "#A5B4FC" }} /> Other open</span>
                </div>
              </div>
              {data.users.length ? (
                <div className="to-people">
                  {data.users.map((u) => {
                    const rest = Math.max(0, u.open - u.overdue - u.due_today);
                    const pct = (v: number) => `${(v / maxLoad) * 100}%`;
                    return (
                      <div key={u.id} className="to-person" onClick={() => openPerson(u.id)}>
                        <div className="to-person-id">
                          <Avatar name={u.name} size={38} />
                          <div>
                            <div className="to-person-name">
                              {u.name}
                              {topPerformer === u.id && (
                                <Tooltip title="Most completed in this period"><TrophyFilled className="to-trophy" /></Tooltip>
                              )}
                            </div>
                            <div className="to-person-sub">
                              {u.open ? `${u.open} open` : "Nothing open"}
                              {u.overdue > 0 && <span className="to-bad"> · {u.overdue} overdue</span>}
                            </div>
                          </div>
                        </div>
                        <div className="to-person-bar">
                          <div className="to-stack">
                            {u.overdue > 0 && <span className="overdue" style={{ width: pct(u.overdue) }} />}
                            {u.due_today > 0 && <span className="today" style={{ width: pct(u.due_today) }} />}
                            {rest > 0 && <span className="rest" style={{ width: pct(rest) }} />}
                          </div>
                        </div>
                        <div className="to-person-done">
                          <b>{u.done_in_range}</b>
                          <span>done</span>
                        </div>
                        <RightOutlined className="to-go" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty description="Nobody has access to Tasks yet" />
              )}
            </div>

            <div className="to-card">
              <div className="to-card-head">
                <div>
                  <div className="to-card-title">Epic health</div>
                  <div className="to-card-sub">Active epics and their risk</div>
                </div>
              </div>
              {data.epics.length ? (
                <div className="to-epics">
                  {data.epics.map((e) => {
                    const p = e.progress?.percent ?? 0;
                    const atRisk = !!e.overdue_items || e.overdue;
                    return (
                      <div key={e.id} className={`to-epic${atRisk ? " risk" : ""}`} onClick={() => navigate(`/app/tasks/epics?epic=${e.id}`)}>
                        <Ring value={p} size={50} stroke={6} color={atRisk ? "#DC2626" : "#7C3AED"} track="var(--muted)">
                          <b className="small">{p}%</b>
                        </Ring>
                        <div className="to-epic-main">
                          <div className="to-epic-title"><ThunderboltFilled style={{ color: "#7C3AED" }} /> {e.title}</div>
                          <div className="to-epic-meta">
                            <span>{e.progress ? `${e.progress.done}/${e.progress.total} done` : "No items yet"}</span>
                            {e.due_date && <span className={e.overdue ? "to-bad" : ""}>· {fmtDue(e)}</span>}
                          </div>
                        </div>
                        <span className={`to-epic-badge${atRisk ? " risk" : ""}`}>
                          {atRisk ? <><FireFilled /> {e.overdue_items || 1} at risk</> : <><CheckCircleFilled /> On track</>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No active epics" />
              )}
            </div>
          </div>
        </>
      )}
    </TasksShell>
  );
};

export default TasksOverviewPage;
