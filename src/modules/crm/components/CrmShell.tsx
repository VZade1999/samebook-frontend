import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ApiOutlined,
  BarChartOutlined,
  CalendarOutlined,
  FunnelPlotOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { StorageService } from "@/storage";
import { useCrmMeta, useCrmSummary } from "../hooks";
import "../styles/crm.scss";

const NAV = [
  { path: "/app/crm/leads", label: "Leads", icon: <FunnelPlotOutlined /> },
  { path: "/app/crm/follow-ups", label: "Follow-ups", icon: <CalendarOutlined /> },
  { path: "/app/crm/insights", label: "Insights", icon: <BarChartOutlined /> },
  { path: "/app/crm/sources", label: "Lead sources", icon: <ApiOutlined />, manager: true },
];

export const companyName = () => {
  try {
    const raw = new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
    return raw ? JSON.parse(raw)?.name || null : null;
  } catch {
    return null;
  }
};

interface Props {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  onNew?: () => void;
  onImport?: () => void;
  /** Extra hero content on the right (replaces the follow-up stats). */
  aside?: React.ReactNode;
  children: React.ReactNode;
}

/** Shared gradient hero, live follow-up counts and sub-navigation for every CRM page. */
const CrmShell: React.FC<Props> = ({ title, subtitle, icon, onNew, onImport, aside, children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meta = useCrmMeta();
  const { summary } = useCrmSummary();
  const company = useMemo(companyName, []);

  const stats = summary
    ? [
        { key: "overdue", label: "Overdue", value: summary.overdue, tone: "red", to: "/app/crm/follow-ups?tab=overdue" },
        { key: "today", label: "Due today", value: summary.due_today, tone: "amber", to: "/app/crm/follow-ups?tab=today" },
        { key: "new", label: "New, untouched", value: summary.untouched, tone: "sky", to: "/app/crm/leads?scope=mine&stage=NEW" },
        { key: "pool", label: "Unassigned", value: summary.pool, tone: "violet", to: "/app/crm/leads?scope=pool" },
      ]
    : [];

  return (
    <div className="crm-root">
      <div className="crm-hero">
        <div className="crm-hero-orb a" />
        <div className="crm-hero-orb b" />
        <div className="crm-hero-grid" />
        <div className="crm-hero-inner">
          <div className="crm-hero-left">
            <div className="crm-hero-eyebrow">
              <span>CRM</span>
              {company && <span className="crm-hero-company">{company}</span>}
            </div>
            <h1 className="crm-hero-title">
              <span className="crm-hero-icon">{icon || <FunnelPlotOutlined />}</span>
              {title}
            </h1>
            <p className="crm-hero-sub">{subtitle}</p>
            {(onNew || onImport) && (meta?.can.create ?? false) && (
              <div className="crm-hero-actions">
                {onNew && (
                  <button className="crm-btn white" onClick={onNew}>
                    <PlusOutlined /> New lead
                  </button>
                )}
                {onImport && (
                  <button className="crm-btn glass" onClick={onImport}>
                    <UploadOutlined /> Import CSV
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="crm-hero-right">
            {aside ??
              (stats.length > 0 && (
                <div className="crm-hstats">
                  {stats.map((s) => (
                    <button key={s.key} className={`crm-hstat ${s.tone}${s.value ? "" : " zero"}`} onClick={() => navigate(s.to)}>
                      <b>{s.value}</b>
                      <span>
                        <i />
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </div>
        <nav className="crm-nav" aria-label="CRM sections">
          {NAV.filter((n) => !n.manager || meta?.can.manage).map((n) => (
            <button
              key={n.path}
              className={`crm-nav-btn${pathname.startsWith(n.path) ? " active" : ""}`}
              onClick={() => navigate(n.path)}
              aria-current={pathname.startsWith(n.path) ? "page" : undefined}
            >
              {n.icon} {n.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="crm-body">{children}</div>
    </div>
  );
};

export default CrmShell;
