import React, { lazy, useEffect, useRef } from "react";
import { Badge, notification } from "antd";
import { ApiOutlined, BarChartOutlined, CalendarOutlined, FunnelPlotOutlined } from "@ant-design/icons";
import { Navigate, useNavigate } from "react-router-dom";
import type { FeatureManifest } from "@/features/types";
import { useCrmSummary } from "./hooks";

const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const FollowUpsPage = lazy(() => import("./pages/FollowUpsPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const SourcesPage = lazy(() => import("./pages/SourcesPage"));

/** Sidebar label with a live count of follow-ups due and untouched new leads. */
const CrmLabel: React.FC = () => {
  const { summary } = useCrmSummary();
  const urgent = (summary?.overdue || 0) + (summary?.due_today || 0) + (summary?.untouched || 0);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      CRM
      {urgent > 0 && (
        <Badge
          count={urgent}
          size="small"
          color={summary?.overdue ? "#DC2626" : "#7C3AED"}
          title={`${summary?.overdue || 0} overdue, ${summary?.due_today || 0} due today, ${summary?.untouched || 0} new`}
        />
      )}
    </span>
  );
};

const REMINDER_KEY = "crm_reminder_shown";

/** Once per browser session: "2 follow-ups overdue, 3 due today, 4 new leads". */
const CrmReminder: React.FC = () => {
  const navigate = useNavigate();
  const { summary } = useCrmSummary();
  const shown = useRef(false);
  useEffect(() => {
    if (!summary || shown.current) return;
    try {
      if (sessionStorage.getItem(REMINDER_KEY)) return;
      sessionStorage.setItem(REMINDER_KEY, "1");
    } catch {
      // private mode: once per page load
    }
    shown.current = true;
    const { overdue, due_today, untouched } = summary;
    if (!overdue && !due_today && !untouched) return;
    const parts = [
      overdue ? `${overdue} follow-up${overdue === 1 ? "" : "s"} overdue` : null,
      due_today ? `${due_today} due today` : null,
      untouched ? `${untouched} new lead${untouched === 1 ? "" : "s"} to call` : null,
    ].filter(Boolean);
    notification.open({
      key: "crm-reminder",
      message: "Your leads",
      description: `${parts.join(", ")}.`,
      icon: <FunnelPlotOutlined style={{ color: overdue ? "#DC2626" : "#7C3AED" }} />,
      placement: "bottomRight",
      duration: 9,
      onClick: () => {
        navigate(overdue || due_today ? "/app/crm/follow-ups" : "/app/crm/leads?scope=mine&stage=NEW");
        notification.destroy("crm-reminder");
      },
      style: { cursor: "pointer" },
    });
  }, [summary, navigate]);
  return null;
};

const crmFeature: FeatureManifest = {
  key: "crm",
  module: "crm",
  name: "CRM",
  routes: [
    { path: "/crm", element: <Navigate to="/app/crm/leads" replace />, permission: "crm.view" },
    { path: "/crm/leads", element: <LeadsPage />, permission: "crm.view" },
    { path: "/crm/follow-ups", element: <FollowUpsPage />, permission: "crm.view" },
    { path: "/crm/insights", element: <InsightsPage />, permission: "crm.view" },
    { path: "/crm/sources", element: <SourcesPage />, permission: "crm.manage" },
  ],
  sidebar: [
    {
      key: "crm-group",
      label: <CrmLabel />,
      icon: <FunnelPlotOutlined />,
      permission: "crm.view",
      children: [
        { key: "/app/crm/leads", label: "Leads", icon: <FunnelPlotOutlined />, permission: "crm.view" },
        { key: "/app/crm/follow-ups", label: "Follow-ups", icon: <CalendarOutlined />, permission: "crm.view" },
        { key: "/app/crm/insights", label: "Insights", icon: <BarChartOutlined />, permission: "crm.view" },
        { key: "/app/crm/sources", label: "Lead sources", icon: <ApiOutlined />, permission: "crm.manage" },
      ],
    },
  ],
  globals: [CrmReminder],
};

export default crmFeature;
