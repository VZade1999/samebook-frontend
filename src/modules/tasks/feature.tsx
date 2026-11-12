import React, { lazy, useEffect, useRef } from "react";
import { Badge, notification } from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { FeatureManifest } from "@/features/types";
import { useTaskSummary } from "./hooks";

const MyTasksPage = lazy(() => import("./pages/MyTasksPage"));
const EpicsPage = lazy(() => import("./pages/EpicsPage"));
const TasksCalendarPage = lazy(() => import("./pages/TasksCalendarPage"));
const TasksOverviewPage = lazy(() => import("./pages/TasksOverviewPage"));

/** Sidebar label with a live count of my overdue + due-today items. */
const TasksLabel: React.FC = () => {
  const { summary } = useTaskSummary();
  const urgent = (summary?.overdue || 0) + (summary?.due_today || 0);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      Tasks
      {urgent > 0 && (
        <Badge count={urgent} size="small" color={summary?.overdue ? "#DC2626" : "#2563EB"} title={`${summary?.overdue || 0} overdue, ${summary?.due_today || 0} due today`} />
      )}
    </span>
  );
};

const REMINDER_KEY = "tasks_reminder_shown";

/** Once per browser session: "You have 2 overdue and 3 due today". */
const TasksReminder: React.FC = () => {
  const navigate = useNavigate();
  const { summary } = useTaskSummary();
  const shown = useRef(false);
  useEffect(() => {
    if (!summary || shown.current) return;
    try {
      if (sessionStorage.getItem(REMINDER_KEY)) return;
      sessionStorage.setItem(REMINDER_KEY, "1");
    } catch {
      // private mode: show once per page load instead
    }
    shown.current = true;
    const { overdue, due_today } = summary;
    if (!overdue && !due_today) return;
    const parts = [
      overdue ? `${overdue} overdue` : null,
      due_today ? `${due_today} due today` : null,
    ].filter(Boolean);
    notification.open({
      key: "tasks-reminder",
      message: "Your tasks",
      description: `You have ${parts.join(" and ")}.`,
      icon: <CheckSquareOutlined style={{ color: overdue ? "#DC2626" : "#2563EB" }} />,
      placement: "bottomRight",
      duration: 8,
      onClick: () => {
        navigate("/app/tasks");
        notification.destroy("tasks-reminder");
      },
      style: { cursor: "pointer" },
    });
  }, [summary, navigate]);
  return null;
};

const tasksFeature: FeatureManifest = {
  key: "tasks",
  module: "tasks",
  name: "Tasks",
  routes: [
    { path: "/tasks", element: <MyTasksPage />, permission: "tasks.view" },
    { path: "/tasks/epics", element: <EpicsPage />, permission: "tasks.view" },
    { path: "/tasks/calendar", element: <TasksCalendarPage />, permission: "tasks.view" },
    { path: "/tasks/overview", element: <TasksOverviewPage />, permission: "tasks.manage" },
  ],
  sidebar: [
    {
      key: "tasks-group",
      label: <TasksLabel />,
      icon: <CheckSquareOutlined />,
      permission: "tasks.view",
      children: [
        { key: "/app/tasks", label: "My Tasks", icon: <CheckSquareOutlined />, permission: "tasks.view" },
        { key: "/app/tasks/epics", label: "Epics", icon: <ThunderboltOutlined />, permission: "tasks.view" },
        { key: "/app/tasks/calendar", label: "Calendar", icon: <CalendarOutlined />, permission: "tasks.view" },
        { key: "/app/tasks/overview", label: "Team overview", icon: <BarChartOutlined />, permission: "tasks.manage" },
      ],
    },
  ],
  globals: [TasksReminder],
};

export default tasksFeature;
