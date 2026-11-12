import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useTasksMeta } from "../hooks";
import "../styles/tasks.scss";

const NAV = [
  { path: "/app/tasks", label: "My Tasks", icon: <CheckSquareOutlined /> },
  { path: "/app/tasks/epics", label: "Epics", icon: <ThunderboltOutlined /> },
  { path: "/app/tasks/calendar", label: "Calendar", icon: <CalendarOutlined /> },
  { path: "/app/tasks/overview", label: "Team overview", icon: <BarChartOutlined />, manager: true },
];

/** Shared hero + sub-navigation for every Tasks page. */
const TasksShell: React.FC<{
  title: string;
  subtitle: string;
  onNew?: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, onNew, children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meta = useTasksMeta();

  return (
    <div className="tk-root">
      <div className="tk-hero">
        <div className="tk-hero-noise" />
        <div className="tk-hero-inner">
          <div>
            <div className="tk-hero-title">
              <div className="tk-hero-icon"><CheckSquareOutlined /></div>
              {title}
            </div>
            <div className="tk-hero-sub">{subtitle}</div>
          </div>
          {onNew && meta?.can.create && (
            <button className="tk-hero-btn" onClick={onNew}>
              <PlusOutlined /> <span>New</span>
            </button>
          )}
        </div>
        <div className="tk-nav">
          {NAV.filter((n) => !n.manager || meta?.can.manage).map((n) => (
            <button
              key={n.path}
              className={`tk-nav-btn${pathname === n.path ? " active" : ""}`}
              onClick={() => navigate(n.path)}
            >
              {n.icon} {n.label}
            </button>
          ))}
        </div>
      </div>
      <div className="tk-body">{children}</div>
    </div>
  );
};

export default TasksShell;
