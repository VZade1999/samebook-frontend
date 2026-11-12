import React, { useCallback, useEffect, useState } from "react";
import { Empty, Segmented, Spin, Tooltip, message } from "antd";
import { CaretDownOutlined, CaretRightOutlined, PlusOutlined, WarningOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import TasksShell from "../components/TasksShell";
import TaskPanel from "../components/TaskPanel";
import TaskFormModal, { ParentRef } from "../components/TaskFormModal";
import { Avatar, ProgressBar, StatusPill, TypeIcon } from "../components/TaskBits";
import { useTaskPanel, useTasksMeta } from "../hooks";
import { tasksService } from "../services/tasksService";
import { TASKS_CHANGED_EVENT, TaskItem, errText, fmtDue } from "../constants";

const TreeNode: React.FC<{
  node: TaskItem;
  depth: number;
  onOpen: (id: number) => void;
  onAdd: (parent: ParentRef) => void;
}> = ({ node, depth, onOpen, onAdd }) => {
  const [open, setOpen] = useState(depth < 2);
  const kids = node.children || [];
  return (
    <>
      <div className={`tk-tree-row${node.access === "read" ? " ro" : ""}`} style={{ paddingLeft: 12 + depth * 22 }} onClick={() => onOpen(node.id)}>
        <span className="tk-tree-caret" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
          {kids.length ? (open ? <CaretDownOutlined /> : <CaretRightOutlined />) : null}
        </span>
        <TypeIcon type={node.type} size={20} />
        <span className="tk-key small">{node.key}</span>
        <span className={`tk-tree-title${node.status === "DONE" ? " done" : ""}`}>{node.title}</span>
        <ProgressBar progress={node.progress} compact />
        <span className={node.overdue ? "tk-overdue small" : "tk-muted small"}>{node.due_date ? fmtDue(node) : ""}</span>
        <Avatar name={node.assignee?.name} size={20} />
        <StatusPill status={node.status} />
        {node.can.add_child && (
          <Tooltip title="Add an item under this">
            <button
              className="tk-icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAdd({ id: node.id, key: node.key, type: node.type, title: node.title });
              }}
            >
              <PlusOutlined />
            </button>
          </Tooltip>
        )}
      </div>
      {open && kids.map((k) => <TreeNode key={k.id} node={k} depth={depth + 1} onOpen={onOpen} onAdd={onAdd} />)}
    </>
  );
};

const EpicsPage: React.FC = () => {
  const meta = useTasksMeta();
  const panel = useTaskPanel();
  const [params, setParams] = useSearchParams();
  const selected = params.get("epic") ? Number(params.get("epic")) : null;

  const [epics, setEpics] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [tree, setTree] = useState<TaskItem | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [creating, setCreating] = useState<{ parent?: ParentRef | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await tasksService.epics({ include_done: showDone ? "true" : undefined });
      setEpics(r.data.data || []);
    } catch (err) {
      message.error(errText(err, "Could not load epics"));
    } finally {
      setLoading(false);
    }
  }, [showDone]);

  const loadTree = useCallback(async () => {
    if (!selected) return setTree(null);
    setTreeLoading(true);
    try {
      const r = await tasksService.tree(selected);
      setTree(r.data.data);
    } catch (err) {
      setTree(null);
      message.error(errText(err, "Could not load this epic"));
    } finally {
      setTreeLoading(false);
    }
  }, [selected]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadTree(); }, [loadTree]);
  useEffect(() => {
    const on = () => { load(); loadTree(); };
    window.addEventListener(TASKS_CHANGED_EVENT, on);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, on);
  }, [load, loadTree]);

  const pick = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("epic", String(id));
    next.delete("task");
    setParams(next);
  };

  return (
    <TasksShell
      title="Epics"
      subtitle="Big goals broken into goals, tasks and subtasks — with live progress."
      onNew={meta?.can.create_epic ? () => setCreating({ parent: null }) : undefined}
    >
      <div className="tk-toolbar">
        <Segmented
          value={showDone ? "all" : "open"}
          onChange={(v) => setShowDone(v === "all")}
          options={[{ value: "open", label: "Active" }, { value: "all", label: "Including done" }]}
        />
        {!meta?.can.create_epic && <span className="tk-muted small">Only managers create epics — you'll see the ones your work belongs to.</span>}
      </div>

      {loading && !epics.length ? (
        <div className="tk-center"><Spin /></div>
      ) : !epics.length ? (
        <div className="tk-card"><Empty description={meta?.can.create_epic ? "No epics yet. Create one to group bigger work." : "No epics include your work yet."} /></div>
      ) : (
        <div className="tk-epic-layout">
          <div className="tk-epic-list">
            {epics.map((e) => (
              <div key={e.id} className={`tk-epic-card${selected === e.id ? " active" : ""}`} onClick={() => pick(e.id)}>
                <div className="tk-epic-head">
                  <TypeIcon type="EPIC" />
                  <span className="tk-key small">{e.key}</span>
                  <StatusPill status={e.status} />
                </div>
                <div className="tk-epic-title">{e.title}</div>
                <ProgressBar progress={e.progress || { done: 0, total: 0, percent: 0 }} />
                <div className="tk-epic-foot">
                  <span className="tk-person"><Avatar name={e.assignee?.name} size={20} /> {e.assignee?.name || "No owner"}</span>
                  <span className={e.overdue ? "tk-overdue small" : "tk-muted small"}>{e.due_date ? fmtDue(e) : "No date"}</span>
                </div>
                {!!e.overdue_items && (
                  <div className="tk-risk"><WarningOutlined /> {e.overdue_items} overdue item{e.overdue_items > 1 ? "s" : ""}</div>
                )}
              </div>
            ))}
          </div>

          <div className="tk-card tk-tree">
            {!selected ? (
              <Empty description="Pick an epic to see everything under it" />
            ) : treeLoading && !tree ? (
              <div className="tk-center"><Spin /></div>
            ) : tree ? (
              <>
                <div className="tk-tree-head">
                  <div>
                    <div className="tk-tree-epic">{tree.title}</div>
                    <div className="tk-muted small">{tree.key} · {tree.progress ? `${tree.progress.done}/${tree.progress.total} done` : "nothing under it yet"}</div>
                  </div>
                  <ProgressBar progress={tree.progress} />
                </div>
                <TreeNode node={tree} depth={0} onOpen={panel.open} onAdd={(p) => setCreating({ parent: p })} />
              </>
            ) : null}
          </div>
        </div>
      )}

      <TaskPanel taskId={panel.taskId} onClose={panel.close} onOpen={panel.open} />
      <TaskFormModal
        open={!!creating}
        onClose={() => setCreating(null)}
        parent={creating?.parent || null}
        defaultType={creating?.parent ? undefined : "EPIC"}
        onCreated={(t) => { if (t.type === "EPIC") pick(t.id); }}
      />
    </TasksShell>
  );
};

export default EpicsPage;
