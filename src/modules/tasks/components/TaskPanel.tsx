import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Drawer,
  Empty,
  Input,
  Popconfirm,
  Select,
  Spin,
  TimePicker,
  Tooltip,
  message,
} from "antd";
import {
  AimOutlined,
  ApartmentOutlined,
  BellFilled,
  BellOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  FlagOutlined,
  HistoryOutlined,
  LinkOutlined,
  LockOutlined,
  MessageOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RightOutlined,
  SendOutlined,
  ThunderboltOutlined,
  UserOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useNavigate } from "react-router-dom";
import { tasksService } from "../services/tasksService";
import { useTasksMeta } from "../hooks";
import {
  LINK_META,
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  TYPE_META,
  TaskItem,
  TaskStatus,
  TaskType,
  emitTasksChanged,
  errText,
  fmtDateTime,
  fmtDue,
} from "../constants";
import { Avatar, PriorityFlag, ProgressBar, StatusPill, TypeIcon } from "./TaskBits";
import TaskFormModal from "./TaskFormModal";

dayjs.extend(relativeTime);

interface Detail extends TaskItem {
  allowed_child_types: string[];
  children: TaskItem[];
  comments: { id: number; kind: string; body: string; user: { id: number; name: string } | null; created_at: string }[];
  activity: {
    id: number;
    action: string;
    field: string | null;
    old_value: string | null;
    new_value: string | null;
    user: { id: number; name: string } | null;
    created_at: string;
  }[];
}

// Per-type hero gradient + icon.
const HERO: Record<TaskType, { from: string; to: string; glow: string; icon: React.ReactNode }> = {
  EPIC: { from: "#6D28D9", to: "#312E81", glow: "#A78BFA", icon: <ThunderboltOutlined /> },
  GOAL: { from: "#047857", to: "#064E3B", glow: "#6EE7B7", icon: <AimOutlined /> },
  TASK: { from: "#2563EB", to: "#1E3A8A", glow: "#93C5FD", icon: <CheckSquareOutlined /> },
  SUBTASK: { from: "#475569", to: "#1E293B", glow: "#CBD5E1", icon: <ApartmentOutlined /> },
};

const FLOW: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

const FIELD_LABEL: Record<string, string> = {
  status: "status",
  assignee_id: "assignee",
  priority: "priority",
  due_date: "due date",
  due_time: "due time",
  title: "title",
  description: "details",
  parent_id: "parent",
  link_type: "link",
  link_id: "linked record",
};

const HISTORY_TONE: Record<string, string> = {
  CREATED: "#059669",
  STATUS_CHANGED: "#2563EB",
  ASSIGNED: "#7C3AED",
  UPDATED: "#64748B",
  DELETED: "#DC2626",
};

/** Circular progress (SVG), used in the hero for items with children. */
const ProgressRing: React.FC<{ percent: number; done: number; total: number }> = ({ percent, done, total }) => {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="tp-ring" title={`${done} of ${total} done`}>
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} className="tp-ring-track" />
        <circle
          cx="38"
          cy="38"
          r={r}
          className="tp-ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c - (c * percent) / 100}
        />
      </svg>
      <div className="tp-ring-label">
        <b>{percent}%</b>
        <span>{done}/{total}</span>
      </div>
    </div>
  );
};

/** "Due in 3 days" / "Overdue by 2 days" / "Due today". */
const dueSentence = (t: TaskItem) => {
  if (!t.due_date) return null;
  const d = dayjs(t.due_date).startOf("day");
  const diff = d.diff(dayjs().startOf("day"), "day");
  if (t.status === "DONE") return `Was due ${d.format("DD MMM")}`;
  if (diff === 0) return `Due today${t.due_time ? ` at ${t.due_time}` : ""}`;
  if (diff === 1) return `Due tomorrow${t.due_time ? ` at ${t.due_time}` : ""}`;
  if (diff > 1) return `Due in ${diff} days`;
  return `Overdue by ${-diff} day${diff === -1 ? "" : "s"}`;
};

interface Props {
  taskId: number | null;
  onClose: () => void;
  onOpen: (id: number) => void;
  /** Called after any change so the page behind can refresh. */
  onChanged?: () => void;
}

const TaskPanel: React.FC<Props> = ({ taskId, onClose, onOpen, onChanged }) => {
  const navigate = useNavigate();
  const meta = useTasksMeta();
  const [task, setTask] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [addChild, setAddChild] = useState(false);
  const [tab, setTab] = useState<"comments" | "history">("comments");

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await tasksService.get(taskId);
      setTask(r.data.data);
    } catch (err: any) {
      setTask(null);
      setError(err?.response?.status === 404 ? "This item doesn't exist or you don't have access to it." : errText(err));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    setEditTitle(null);
    setEditDesc(null);
    setComment("");
    setTab("comments");
    if (taskId) load();
    else setTask(null);
  }, [taskId, load]);

  const changed = () => {
    emitTasksChanged();
    onChanged?.();
  };

  const patch = async (payload: any, okMsg?: string) => {
    if (!task) return;
    setSaving(true);
    try {
      const r = await tasksService.update(task.id, payload);
      setTask(r.data.data);
      if (okMsg) message.success(okMsg);
      changed();
      // Suggest closing the parent when its last open child is done.
      if (payload.status === "DONE" && task.parent_id) {
        try {
          const p = (await tasksService.get(task.parent_id)).data.data as Detail;
          if (p.status !== "DONE" && p.can.status && p.progress && p.progress.done === p.progress.total) {
            message.info({
              content: (
                <span>
                  Everything under {p.key} is done.{" "}
                  <a onClick={() => tasksService.update(p.id, { status: "DONE" }).then(() => { message.success(`${p.key} marked done`); changed(); })}>
                    Mark {p.key} done
                  </a>
                </span>
              ),
              duration: 8,
            });
          }
        } catch {
          // parent not readable — fine
        }
      }
    } catch (err) {
      message.error(errText(err, "Could not save"));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = (status: TaskStatus) => {
    if (!task || status === task.status) return;
    const openKids = (task.children || []).filter((c) => c.status !== "DONE").length;
    if (status === "DONE" && openKids) message.warning(`${openKids} item(s) under this are still open`);
    patch({ status });
  };

  const postComment = async () => {
    if (!task || !comment.trim()) return;
    setPosting(true);
    try {
      await tasksService.comment(task.id, comment.trim());
      setComment("");
      await load();
      changed();
    } catch (err) {
      message.error(errText(err, "Could not comment"));
    } finally {
      setPosting(false);
    }
  };

  const followUp = async () => {
    if (!task) return;
    try {
      await tasksService.followUp(task.id, comment.trim() || undefined);
      message.success(`Follow-up sent to ${task.assignee?.name || task.creator?.name}`);
      setComment("");
      await load();
    } catch (err) {
      message.error(errText(err, "Could not send follow-up"));
    }
  };

  const remove = async () => {
    if (!task) return;
    try {
      const r = await tasksService.remove(task.id);
      const n = r.data.data.deleted;
      message.success(n > 1 ? `Deleted ${task.key} and ${n - 1} item(s) under it` : `Deleted ${task.key}`);
      changed();
      onClose();
    } catch (err) {
      message.error(errText(err, "Could not delete"));
    }
  };

  const copyLink = () => {
    if (!task) return;
    const url = `${window.location.origin}/app/tasks?task=${task.id}`;
    navigator.clipboard?.writeText(url).then(
      () => message.success(`Link to ${task.key} copied`),
      () => message.error("Could not copy link"),
    );
  };

  const me = useMemo(() => {
    try {
      return Number(JSON.parse(sessionStorage.getItem("user_details") || "{}")?.id) || null;
    } catch {
      return null;
    }
  }, []);
  const followTarget = task ? task.assignee || task.creator : null;
  const canFollowUp = !!task && task.status !== "DONE" && !!followTarget && followTarget.id !== me;

  const activityText = (a: Detail["activity"][number]) => {
    if (a.action === "CREATED") return <>created this · <i>{a.new_value}</i></>;
    if (a.action === "DELETED") return <>deleted this {a.new_value}</>;
    const f = FIELD_LABEL[a.field || ""] || a.field;
    if (a.field === "status")
      return (
        <>
          moved it from <StatusPill status={(a.old_value as TaskStatus) || "TODO"} /> to{" "}
          <StatusPill status={(a.new_value as TaskStatus) || "TODO"} />
        </>
      );
    if (a.field === "assignee_id") {
      const name = (id: string | null) => (id ? meta?.assignees.find((u) => String(u.id) === id)?.name || `user #${id}` : "nobody");
      return <>assigned it to <b>{name(a.new_value)}</b>{a.old_value ? <> (was {name(a.old_value)})</> : null}</>;
    }
    if (a.field === "priority") return <>set priority to <PriorityFlag priority={a.new_value as any} showLabel /></>;
    if (a.field === "description") return <>edited the details</>;
    if (a.field === "due_date") return a.new_value ? <>set the due date to <b>{dayjs(a.new_value).format("DD MMM YYYY")}</b></> : <>removed the due date</>;
    return <>changed {f}{a.new_value ? <> to <b>{a.new_value}</b></> : " (cleared)"}</>;
  };

  const ro = task?.access === "read";
  const hero = task ? HERO[task.type] || HERO.TASK : HERO.TASK;
  const due = task ? dueSentence(task) : null;
  const flowIdx = task ? FLOW.indexOf(task.status) : -1;

  return (
    <Drawer
      open={!!taskId}
      onClose={onClose}
      width={Math.min(720, typeof window !== "undefined" ? window.innerWidth : 720)}
      rootClassName="tk-panel tp"
      closable={false}
      title={null}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      {loading && !task ? (
        <div className="tp-loading"><Spin size="large" /></div>
      ) : error ? (
        <div className="tp-loading">
          <Empty description={error} />
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : task ? (
        <>
          {/* ── Hero ───────────────────────────────────────────────────── */}
          <div
            className="tp-hero"
            style={{ ["--tp-from" as any]: hero.from, ["--tp-to" as any]: hero.to, ["--tp-glow" as any]: hero.glow }}
          >
            <div className="tp-hero-glow" />
            <div className="tp-hero-noise" />
            <div className="tp-hero-top">
              <span className="tp-type-chip">
                {hero.icon} {TYPE_META[task.type].label}
                <span className="tp-type-key">{task.key}</span>
              </span>
              {ro && (
                <Tooltip title="You can view and comment, but not edit this item">
                  <span className="tp-ro"><LockOutlined /> View only</span>
                </Tooltip>
              )}
              <span className="tp-hero-actions">
                <Tooltip title="Copy link"><button className="tp-hbtn" onClick={copyLink}><CopyOutlined /></button></Tooltip>
                {task.can.delete && (
                  <Popconfirm
                    title={`Delete ${task.key}?`}
                    description={task.child_count ? "Everything under it is deleted too." : "This can't be undone."}
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                    onConfirm={remove}
                  >
                    <Tooltip title="Delete"><button className="tp-hbtn danger"><DeleteOutlined /></button></Tooltip>
                  </Popconfirm>
                )}
                <Tooltip title="Close"><button className="tp-hbtn" onClick={onClose}><CloseOutlined /></button></Tooltip>
              </span>
            </div>

            {task.breadcrumb.length > 0 && (
              <div className="tp-crumbs">
                {task.breadcrumb.map((b) => (
                  <span key={b.id} className="tp-crumb" onClick={() => onOpen(b.id)}>
                    {HERO[b.type]?.icon} <b>{b.key}</b> <span className="tp-crumb-title">{b.title}</span>
                    <RightOutlined className="tp-crumb-sep" />
                  </span>
                ))}
              </div>
            )}

            <div className="tp-hero-main">
              <div className="tp-hero-text">
                {editTitle !== null ? (
                  <Input.TextArea
                    autoFocus
                    autoSize
                    maxLength={200}
                    value={editTitle}
                    className="tp-title-input"
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => {
                      const v = editTitle.trim();
                      setEditTitle(null);
                      if (v && v !== task.title) patch({ title: v });
                    }}
                    onPressEnter={(e) => {
                      e.preventDefault();
                      (e.target as HTMLTextAreaElement).blur();
                    }}
                  />
                ) : (
                  <h2 className={`tp-title${task.can.edit ? " editable" : ""}`} onClick={() => task.can.edit && setEditTitle(task.title)}>
                    {task.title}
                    {task.can.edit && <EditOutlined className="tp-title-edit" />}
                  </h2>
                )}
                <div className="tp-chips">
                  <span className="tp-chip solid" style={{ color: STATUS_META[task.status].color }}>
                    <span className="tp-chip-dot" style={{ background: STATUS_META[task.status].color }} />
                    {STATUS_META[task.status].label}
                  </span>
                  <span className="tp-chip"><FlagOutlined style={{ color: PRIORITY_META[task.priority].color }} /> {PRIORITY_META[task.priority].label}</span>
                  {due && (
                    <span className={`tp-chip${task.overdue ? " alert" : ""}`}><ClockCircleOutlined /> {due}</span>
                  )}
                  {task.assignee && (
                    <span className="tp-chip"><Avatar name={task.assignee.name} size={18} /> {task.assignee.name}</span>
                  )}
                </div>
              </div>
              {task.progress && <ProgressRing {...task.progress} />}
            </div>
          </div>

          <div className="tp-body">
            {/* ── Workflow stepper ───────────────────────────────────── */}
            <div className={`tp-flow${task.status === "ON_HOLD" ? " on-hold" : ""}`}>
              {FLOW.map((s, i) => {
                const state = task.status === "ON_HOLD" ? "" : i < flowIdx ? "done" : i === flowIdx ? "current" : "";
                return (
                  <React.Fragment key={s}>
                    {i > 0 && <span className={`tp-flow-line${i <= flowIdx ? " done" : ""}`} />}
                    <button
                      className={`tp-flow-step ${state}`}
                      disabled={!task.can.status || saving}
                      onClick={() => setStatus(s)}
                      style={{ ["--tp-step" as any]: STATUS_META[s].color }}
                    >
                      <span className="tp-flow-dot">{state === "done" ? <CheckOutlined /> : i + 1}</span>
                      <span className="tp-flow-label">{STATUS_META[s].label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
              {task.can.status && (
                <Tooltip title={task.status === "ON_HOLD" ? "Resume work" : "Pause this item"}>
                  <button
                    className={`tp-hold${task.status === "ON_HOLD" ? " active" : ""}`}
                    disabled={saving}
                    onClick={() => setStatus(task.status === "ON_HOLD" ? "IN_PROGRESS" : "ON_HOLD")}
                  >
                    {task.status === "ON_HOLD" ? <><PlayCircleOutlined /> Resume</> : <><PauseCircleOutlined /> Hold</>}
                  </button>
                </Tooltip>
              )}
            </div>

            {/* ── Properties ─────────────────────────────────────────── */}
            <div className="tp-props">
              <div className="tp-prop">
                <span className="tp-prop-label"><UserOutlined /> Assignee</span>
                <span className="tp-prop-value">
                  {task.can.assign ? (
                    <Select
                      variant="borderless"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="Unassigned"
                      value={task.assignee?.id}
                      disabled={saving}
                      onChange={(v) => patch({ assignee_id: v ?? null }, v ? "Reassigned" : undefined)}
                      options={(meta?.assignees || []).map((u) => ({
                        value: u.id,
                        label: u.name,
                      }))}
                      labelRender={(o) => (
                        <span className="tp-person"><Avatar name={String(o.label)} size={22} /> {o.label}</span>
                      )}
                      className="tp-select"
                      popupMatchSelectWidth={false}
                    />
                  ) : (
                    <span className="tp-person"><Avatar name={task.assignee?.name} size={22} /> {task.assignee?.name || "Unassigned"}</span>
                  )}
                </span>
              </div>

              <div className="tp-prop">
                <span className="tp-prop-label"><FlagOutlined /> Priority</span>
                <span className="tp-prop-value">
                  {task.can.edit ? (
                    <Select
                      variant="borderless"
                      value={task.priority}
                      disabled={saving}
                      onChange={(v) => patch({ priority: v })}
                      options={PRIORITIES.map((p) => ({ value: p, label: <PriorityFlag priority={p} showLabel /> }))}
                      className="tp-select"
                      popupMatchSelectWidth={false}
                    />
                  ) : (
                    <PriorityFlag priority={task.priority} showLabel />
                  )}
                </span>
              </div>

              <div className="tp-prop">
                <span className="tp-prop-label"><CalendarOutlined /> Due</span>
                <span className="tp-prop-value">
                  {task.can.edit ? (
                    <span className="tp-due">
                      <DatePicker
                        variant="borderless"
                        format="DD MMM YYYY"
                        placeholder="Set a date"
                        value={task.due_date ? dayjs(task.due_date) : null}
                        onChange={(d) => patch({ due_date: d ? d.format("YYYY-MM-DD") : null, ...(d ? {} : { due_time: null }) })}
                        className={task.overdue ? "tp-overdue-input" : ""}
                      />
                      {task.due_date && (
                        <TimePicker
                          variant="borderless"
                          format="HH:mm"
                          minuteStep={15}
                          placeholder="Time"
                          value={task.due_time ? dayjs(task.due_time, "HH:mm") : null}
                          onChange={(t) => patch({ due_time: t ? t.format("HH:mm") : null })}
                          style={{ width: 96 }}
                        />
                      )}
                    </span>
                  ) : (
                    <span className={task.overdue ? "tk-overdue" : ""}>{fmtDue(task)}</span>
                  )}
                </span>
              </div>

              <div className="tp-prop">
                <span className="tp-prop-label"><EditOutlined /> Created by</span>
                <span className="tp-prop-value">
                  <span className="tp-person"><Avatar name={task.creator?.name} size={22} /> {task.creator?.name}</span>
                  <span className="tp-sub">{dayjs(task.created_at).fromNow()}</span>
                </span>
              </div>

              {task.link && (
                <div className="tp-prop wide">
                  <span className="tp-prop-label"><LinkOutlined /> Linked to</span>
                  <span className="tp-prop-value">
                    <a className="tp-link-card" onClick={() => navigate(LINK_META[task.link!.type]?.path(task.link!.id) || "/app/dashboard")}>
                      <span className="tp-link-icon"><FileTextOutlined /></span>
                      <span>
                        <span className="tp-link-type">{LINK_META[task.link.type]?.label}</span>
                        <b>{task.link.label || `#${task.link.id}`}</b>
                      </span>
                      <RightOutlined className="tp-link-go" />
                    </a>
                  </span>
                </div>
              )}

              {task.completed_at && (
                <div className="tp-prop wide">
                  <span className="tp-prop-label"><CheckCircleFilled style={{ color: "#059669" }} /> Completed</span>
                  <span className="tp-prop-value">{fmtDateTime(task.completed_at)}</span>
                </div>
              )}
            </div>

            {/* ── Details ────────────────────────────────────────────── */}
            <section className="tp-section">
              <div className="tp-section-head">
                <span className="tp-section-icon"><FileTextOutlined /></span> Details
                {task.can.edit && editDesc === null && task.description && (
                  <button className="tp-text-btn" onClick={() => setEditDesc(task.description || "")}><EditOutlined /> Edit</button>
                )}
              </div>
              {editDesc !== null ? (
                <div className="tp-desc-edit">
                  <Input.TextArea
                    autoFocus
                    autoSize={{ minRows: 4 }}
                    maxLength={10000}
                    value={editDesc}
                    placeholder="Add context, steps, acceptance criteria, links…"
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                  <div className="tp-actions">
                    <Button onClick={() => setEditDesc(null)}>Cancel</Button>
                    <Button
                      type="primary"
                      loading={saving}
                      onClick={() => {
                        const v = editDesc.trim();
                        setEditDesc(null);
                        if (v !== (task.description || "")) patch({ description: v || null });
                      }}
                    >
                      Save details
                    </Button>
                  </div>
                </div>
              ) : task.description ? (
                <div className="tp-desc">{task.description}</div>
              ) : (
                <div
                  className={`tp-desc-empty${task.can.edit ? " editable" : ""}`}
                  onClick={() => task.can.edit && setEditDesc("")}
                >
                  <FileTextOutlined />
                  <div>
                    <b>{task.can.edit ? "Add details" : "No details yet"}</b>
                    {task.can.edit && <span>Context, steps or acceptance criteria help everyone stay aligned.</span>}
                  </div>
                </div>
              )}
            </section>

            {/* ── Children ───────────────────────────────────────────── */}
            {(task.allowed_child_types.length > 0 || task.children.length > 0) && (
              <section className="tp-section">
                <div className="tp-section-head">
                  <span className="tp-section-icon"><ApartmentOutlined /></span>
                  {task.type === "TASK" ? "Subtasks" : "Items under this"}
                  {task.children.length > 0 && <span className="tp-count">{task.children.length}</span>}
                  {task.progress && <span className="tp-head-progress"><ProgressBar progress={task.progress} compact /></span>}
                </div>
                {task.children.length > 0 && (
                  <div className="tp-children">
                    {task.children.map((c) => (
                      <div key={c.id} className={`tp-child${c.status === "DONE" ? " done" : ""}`} onClick={() => onOpen(c.id)}>
                        <span className="tp-child-check" style={{ color: STATUS_META[c.status].color }}>
                          {c.status === "DONE" ? <CheckCircleFilled /> : <TypeIcon type={c.type} size={20} />}
                        </span>
                        <div className="tp-child-main">
                          <div className="tp-child-title"><span className="tk-key small">{c.key}</span> {c.title}</div>
                          <div className="tp-child-meta">
                            <StatusPill status={c.status} />
                            {c.due_date && <span className={c.overdue ? "tk-overdue small" : "tk-muted small"}><CalendarOutlined /> {fmtDue(c)}</span>}
                            {c.progress && <ProgressBar progress={c.progress} compact />}
                          </div>
                        </div>
                        <Avatar name={c.assignee?.name} size={26} />
                        <RightOutlined className="tp-child-go" />
                      </div>
                    ))}
                  </div>
                )}
                {task.can.add_child ? (
                  <button className="tp-add" onClick={() => setAddChild(true)}>
                    <PlusOutlined /> Add {task.allowed_child_types.map((t) => TYPE_META[t as TaskType]?.label.toLowerCase()).join(" or ")}
                  </button>
                ) : (
                  !task.children.length && <div className="tk-muted small">Nothing under this yet.</div>
                )}
              </section>
            )}

            {/* ── Conversation / history ─────────────────────────────── */}
            <section className="tp-section">
              <div className="tp-tabs">
                <button className={tab === "comments" ? "active" : ""} onClick={() => setTab("comments")}>
                  <MessageOutlined /> Conversation {task.comments.length > 0 && <span className="tp-count">{task.comments.length}</span>}
                </button>
                <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
                  <HistoryOutlined /> History {task.activity.length > 0 && <span className="tp-count">{task.activity.length}</span>}
                </button>
              </div>

              {tab === "comments" ? (
                <>
                  {task.comments.length ? (
                    <div className="tp-thread">
                      {task.comments.map((c) =>
                        c.kind === "FOLLOW_UP" ? (
                          <div key={c.id} className="tp-nudge">
                            <span className="tp-nudge-icon"><BellFilled /></span>
                            <div className="tp-nudge-body">
                              <div className="tp-nudge-head">
                                <b>{c.user?.name}</b> asked for an update
                                <span className="tp-time">{dayjs(c.created_at).fromNow()}</span>
                              </div>
                              <div className="tp-nudge-text">“{c.body}”</div>
                            </div>
                          </div>
                        ) : (
                          <div key={c.id} className={`tp-msg${c.user?.id === me ? " mine" : ""}`}>
                            <Avatar name={c.user?.name} size={32} />
                            <div className="tp-bubble">
                              <div className="tp-bubble-head">
                                <b>{c.user?.name}</b>
                                <Tooltip title={fmtDateTime(c.created_at)}><span className="tp-time">{dayjs(c.created_at).fromNow()}</span></Tooltip>
                              </div>
                              <div className="tp-bubble-text">{c.body}</div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="tp-thread-empty">
                      <MessageOutlined />
                      <span>No conversation yet — share an update or ask a question.</span>
                    </div>
                  )}

                  <div className="tp-compose">
                    <Avatar name={(() => { try { const u = JSON.parse(sessionStorage.getItem("user_details") || "{}"); return [u.firstName, u.lastName].filter(Boolean).join(" ") || "Me"; } catch { return "Me"; } })()} size={32} />
                    <div className="tp-compose-box">
                      <Input.TextArea
                        variant="borderless"
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        maxLength={5000}
                        placeholder="Write an update… (Ctrl + Enter to send)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            postComment();
                          }
                        }}
                      />
                      <div className="tp-compose-bar">
                        {canFollowUp ? (
                          <Tooltip title={`Notify ${followTarget?.name} asking for an update${comment.trim() ? " — with your message" : ""}`}>
                            <button className="tp-nudge-btn" onClick={followUp}>
                              <BellOutlined /> Follow up with {followTarget?.name?.split(" ")[0]}
                            </button>
                          </Tooltip>
                        ) : <span />}
                        <Button type="primary" icon={<SendOutlined />} loading={posting} disabled={!comment.trim()} onClick={postComment}>
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="tp-timeline">
                  {task.activity.map((a) => (
                    <div key={a.id} className="tp-tl-item">
                      <span className="tp-tl-dot" style={{ background: HISTORY_TONE[a.action] || "#94A3B8" }} />
                      <div className="tp-tl-body">
                        <div className="tp-tl-text"><b>{a.user?.name || "System"}</b> {activityText(a)}</div>
                        <Tooltip title={fmtDateTime(a.created_at)}><span className="tp-time">{dayjs(a.created_at).fromNow()}</span></Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}

      {task && (
        <TaskFormModal
          open={addChild}
          onClose={() => setAddChild(false)}
          parent={{ id: task.id, key: task.key, type: task.type, title: task.title }}
          onCreated={() => {
            load();
            changed();
          }}
        />
      )}
    </Drawer>
  );
};

export default TaskPanel;
