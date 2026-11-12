import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Empty, Input, Segmented, Select, Spin, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import TasksShell from "../components/TasksShell";
import TaskRow from "../components/TaskRow";
import TaskPanel from "../components/TaskPanel";
import TaskFormModal from "../components/TaskFormModal";
import { useTaskPanel, useTaskSummary, useTasksMeta } from "../hooks";
import { tasksService } from "../services/tasksService";
import {
  PRIORITIES,
  PRIORITY_META,
  STATUSES,
  STATUS_META,
  TASKS_CHANGED_EVENT,
  TYPE_META,
  TaskItem,
  emitTasksChanged,
  errText,
  todayStr,
} from "../constants";

type Scope = "mine" | "by_me" | "team";

const GROUPS = [
  { key: "overdue", label: "Overdue", tone: "danger" },
  { key: "today", label: "Today", tone: "accent" },
  { key: "upcoming", label: "Upcoming", tone: "" },
  { key: "nodate", label: "No date", tone: "" },
  { key: "done", label: "Done · last 7 days", tone: "success" },
] as const;

const groupOf = (t: TaskItem, today: string) => {
  if (t.status === "DONE") return "done";
  if (!t.due_date) return "nodate";
  if (t.due_date < today) return "overdue";
  if (t.due_date === today) return "today";
  return "upcoming";
};

const MyTasksPage: React.FC = () => {
  const meta = useTasksMeta();
  const panel = useTaskPanel();
  const [params, setParams] = useSearchParams();
  const { summary } = useTaskSummary();

  const scope = (params.get("scope") as Scope) || "mine";
  const [rows, setRows] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState<string | undefined>();
  const [priority, setPriority] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [assignee, setAssignee] = useState<number | undefined>(
    params.get("assignee") ? Number(params.get("assignee")) : undefined,
  );
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const setScope = (s: Scope) => {
    const next = new URLSearchParams(params);
    if (s === "mine") next.delete("scope");
    else next.set("scope", s);
    next.delete("assignee");
    setAssignee(undefined);
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await tasksService.list({
        scope,
        q: q || undefined,
        type,
        priority,
        status,
        assignee_id: scope === "team" ? assignee : undefined,
        done_days: status ? undefined : 7,
        limit: 200,
      });
      setRows(r.data.data.rows || []);
    } catch (err) {
      message.error(errText(err, "Could not load tasks"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope, q, type, priority, status, assignee]);

  useEffect(() => {
    load();
  }, [load]);

  // Another tab/panel changed something → refresh quietly.
  useEffect(() => {
    const on = () => load();
    window.addEventListener(TASKS_CHANGED_EVENT, on);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, on);
  }, [load]);

  const today = todayStr();
  const grouped = useMemo(() => {
    const g: Record<string, TaskItem[]> = { overdue: [], today: [], upcoming: [], nodate: [], done: [] };
    rows.forEach((t) => g[groupOf(t, today)].push(t));
    return g;
  }, [rows, today]);

  const toggleDone = async (t: TaskItem, done: boolean) => {
    setRows((rs) => rs.map((x) => (x.id === t.id ? { ...x, status: done ? "DONE" : "TODO" } : x)));
    try {
      await tasksService.update(t.id, { status: done ? "DONE" : "TODO" });
      if (done) message.success(`${t.key} done`);
      emitTasksChanged();
    } catch (err) {
      message.error(errText(err, "Could not update"));
      load();
    }
  };

  const followUp = async (t: TaskItem) => {
    try {
      await tasksService.followUp(t.id);
      message.success(`Asked ${t.assignee?.name} for an update`);
    } catch (err) {
      message.error(errText(err, "Could not send follow-up"));
    }
  };

  const scopes = [
    { value: "mine", label: "My tasks" },
    { value: "by_me", label: "Assigned by me" },
    ...(meta?.can.manage ? [{ value: "team", label: "Everyone" }] : []),
  ];

  return (
    <TasksShell
      title="Tasks"
      subtitle="Everything on your plate — and what you're waiting on from others."
      onNew={() => setCreating(true)}
    >
      <div className="tk-stats">
        <div className="tk-stat danger"><div className="tk-stat-label">Overdue</div><div className="tk-stat-value">{summary?.overdue ?? "–"}</div></div>
        <div className="tk-stat accent"><div className="tk-stat-label">Due today</div><div className="tk-stat-value">{summary?.due_today ?? "–"}</div></div>
        <div className="tk-stat"><div className="tk-stat-label">My open items</div><div className="tk-stat-value">{summary?.open ?? "–"}</div></div>
        <div className="tk-stat warn"><div className="tk-stat-label">Waiting on others</div><div className="tk-stat-value">{summary?.waiting_on_others ?? "–"}</div></div>
      </div>

      <div className="tk-toolbar">
        <Segmented value={scope} onChange={(v) => setScope(v as Scope)} options={scopes} />
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search title or key (e.g. TK-12)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="tk-search"
        />
        <Select allowClear placeholder="Type" value={type} onChange={setType} style={{ minWidth: 110 }}
          options={Object.entries(TYPE_META).map(([k, m]) => ({ value: k, label: m.label }))} />
        <Select allowClear placeholder="Priority" value={priority} onChange={setPriority} style={{ minWidth: 110 }}
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))} />
        <Select allowClear placeholder="Status" value={status} onChange={setStatus} style={{ minWidth: 120 }}
          options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))} />
        {scope === "team" && (
          <Select allowClear showSearch optionFilterProp="label" placeholder="Person" value={assignee} onChange={setAssignee} style={{ minWidth: 150 }}
            options={(meta?.assignees || []).map((u) => ({ value: u.id, label: u.name }))} />
        )}
      </div>

      {loading && !rows.length ? (
        <div className="tk-center"><Spin /></div>
      ) : !rows.length ? (
        <div className="tk-card">
          <Empty
            description={
              scope === "by_me"
                ? "You haven't assigned anything to others yet."
                : q || type || priority || status
                  ? "Nothing matches these filters."
                  : "All clear — nothing on your plate."
            }
          />
        </div>
      ) : status ? (
        <div className="tk-card">
          {rows.map((t) => (
            <TaskRow key={t.id} task={t} onOpen={panel.open} onToggleDone={toggleDone}
              onFollowUp={scope === "by_me" ? followUp : undefined} showAssignee={scope !== "mine"} />
          ))}
        </div>
      ) : (
        GROUPS.filter((g) => grouped[g.key].length).map((g) => (
          <div key={g.key} className={`tk-group ${g.tone}`}>
            <div className="tk-group-head">
              {g.label} <span className="tk-count">{grouped[g.key].length}</span>
              {g.key === "today" && <span className="tk-muted small"> · {dayjs().format("dddd, DD MMM")}</span>}
            </div>
            <div className="tk-card">
              {grouped[g.key].map((t) => (
                <TaskRow key={t.id} task={t} onOpen={panel.open} onToggleDone={toggleDone}
                  onFollowUp={scope === "by_me" ? followUp : undefined} showAssignee={scope !== "mine"} />
              ))}
            </div>
          </div>
        ))
      )}

      <TaskPanel taskId={panel.taskId} onClose={panel.close} onOpen={panel.open} />
      <TaskFormModal open={creating} onClose={() => setCreating(false)} onCreated={(t) => panel.open(t.id)} />
    </TasksShell>
  );
};

export default MyTasksPage;
