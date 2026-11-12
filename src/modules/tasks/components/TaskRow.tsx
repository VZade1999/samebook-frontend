import React from "react";
import { Checkbox, Tooltip } from "antd";
import { BellOutlined, LinkOutlined, MessageOutlined } from "@ant-design/icons";
import { LINK_META, TaskItem, fmtDue } from "../constants";
import { Avatar, PriorityFlag, ProgressBar, StatusPill, TypeIcon } from "./TaskBits";

interface Props {
  task: TaskItem;
  onOpen: (id: number) => void;
  onToggleDone?: (task: TaskItem, done: boolean) => void;
  onFollowUp?: (task: TaskItem) => void;
  showAssignee?: boolean;
}

const TaskRow: React.FC<Props> = ({ task, onOpen, onToggleDone, onFollowUp, showAssignee = true }) => {
  const done = task.status === "DONE";
  return (
    <div className={`tk-row${done ? " is-done" : ""}${task.overdue ? " is-overdue" : ""}`} onClick={() => onOpen(task.id)}>
      <span className="tk-row-check" onClick={(e) => e.stopPropagation()}>
        <Tooltip title={task.can.status ? (done ? "Reopen" : "Mark done") : "Only the assignee, creator or a manager can change this"}>
          <Checkbox checked={done} disabled={!task.can.status || !onToggleDone} onChange={(e) => onToggleDone?.(task, e.target.checked)} />
        </Tooltip>
      </span>
      <TypeIcon type={task.type} />
      <div className="tk-row-main">
        <div className="tk-row-title">
          <span className="tk-key small">{task.key}</span>
          <span className="tk-row-text">{task.title}</span>
        </div>
        {(task.breadcrumb.length > 0 || task.link) && (
          <div className="tk-row-sub">
            {task.breadcrumb.length > 0 && (
              <span className="tk-muted">{task.breadcrumb.map((b) => b.title).join(" › ")}</span>
            )}
            {task.link && (
              <span className="tk-link-chip small">
                <LinkOutlined /> {LINK_META[task.link.type]?.label}: {task.link.label || `#${task.link.id}`}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="tk-row-meta">
        <ProgressBar progress={task.progress} compact />
        <PriorityFlag priority={task.priority} />
        <span className={`tk-due${task.overdue ? " tk-overdue" : ""}`}>{fmtDue(task)}</span>
        {showAssignee && <Avatar name={task.assignee?.name} />}
        <StatusPill status={task.status} />
        {onFollowUp && !done && task.assignee && (
          <span onClick={(e) => e.stopPropagation()}>
            <Tooltip title={`Ask ${task.assignee.name} for an update`}>
              <button className="tk-icon-btn" onClick={() => onFollowUp(task)}>
                <BellOutlined />
              </button>
            </Tooltip>
          </span>
        )}
        <Tooltip title="Open">
          <span className="tk-open-hint"><MessageOutlined /></span>
        </Tooltip>
      </div>
    </div>
  );
};

export default TaskRow;
