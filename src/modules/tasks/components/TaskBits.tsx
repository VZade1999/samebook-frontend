import React from "react";
import { Tooltip } from "antd";
import {
  AimOutlined,
  ApartmentOutlined,
  CheckSquareOutlined,
  FlagFilled,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { PRIORITY_META, STATUS_META, TYPE_META, TaskPriority, TaskStatus, TaskType, initials } from "../constants";

const TYPE_ICON: Record<TaskType, React.ReactNode> = {
  EPIC: <ThunderboltOutlined />,
  GOAL: <AimOutlined />,
  TASK: <CheckSquareOutlined />,
  SUBTASK: <ApartmentOutlined />,
};

export const TypeIcon: React.FC<{ type: TaskType; size?: number }> = ({ type, size = 22 }) => {
  const m = TYPE_META[type] || TYPE_META.TASK;
  return (
    <Tooltip title={m.label}>
      <span className="tk-type-icon" style={{ background: m.bg, color: m.color, width: size, height: size, fontSize: size * 0.55 }}>
        {TYPE_ICON[type] || TYPE_ICON.TASK}
      </span>
    </Tooltip>
  );
};

export const TypeBadge: React.FC<{ type: TaskType }> = ({ type }) => {
  const m = TYPE_META[type] || TYPE_META.TASK;
  return (
    <span className="tk-badge" style={{ background: m.bg, color: m.color }}>
      {TYPE_ICON[type]} {m.label}
    </span>
  );
};

export const StatusPill: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.TODO;
  return (
    <span className="tk-status" style={{ background: m.bg, color: m.color }}>
      <span className="tk-dot" style={{ background: m.color }} />
      {m.label}
    </span>
  );
};

export const PriorityFlag: React.FC<{ priority: TaskPriority; showLabel?: boolean }> = ({ priority, showLabel }) => {
  const m = PRIORITY_META[priority] || PRIORITY_META.NORMAL;
  return (
    <Tooltip title={`${m.label} priority`}>
      <span className="tk-priority" style={{ color: m.color }}>
        <FlagFilled /> {showLabel && m.label}
      </span>
    </Tooltip>
  );
};

export const Avatar: React.FC<{ name?: string | null; size?: number; title?: string }> = ({ name, size = 24, title }) => (
  <Tooltip title={title ?? name ?? "Unassigned"}>
    <span className={`tk-avatar${name ? "" : " empty"}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name ? initials(name) : "?"}
    </span>
  </Tooltip>
);

export const ProgressBar: React.FC<{ progress: { done: number; total: number; percent: number } | null; compact?: boolean }> = ({
  progress,
  compact,
}) => {
  if (!progress) return null;
  return (
    <Tooltip title={`${progress.done} of ${progress.total} done`}>
      <span className={`tk-progress${compact ? " compact" : ""}`}>
        <span className="tk-progress-track">
          <span
            className="tk-progress-fill"
            style={{ width: `${progress.percent}%`, background: progress.percent === 100 ? "#059669" : "#4F46E5" }}
          />
        </span>
        <span className="tk-progress-text">{progress.percent}%</span>
      </span>
    </Tooltip>
  );
};
