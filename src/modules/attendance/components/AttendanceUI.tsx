import React from "react";
import { Drawer } from "antd";
import { ExclamationCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import {
  DayStatus,
  fmtDay,
  fmtMinutes,
  fmtTime,
  leaveLabel,
  statusMeta,
} from "../constants";

export const StatusPill: React.FC<{ status?: string; label?: string; lg?: boolean }> = ({ status, label, lg }) => {
  const s = statusMeta(status);
  return (
    <span className={`att-status${lg ? " lg" : ""}`} style={{ background: s.bg, color: s.color }}>
      <span className="att-status-dot" style={{ background: s.color }} />
      {label || s.label}
    </span>
  );
};

export const EmptyState: React.FC<{ icon: React.ReactNode; text: string; sub?: string }> = ({ icon, text, sub }) => (
  <div className="att-empty">
    <div className="att-empty-icon">{icon}</div>
    <div className="att-empty-text">{text}</div>
    {sub && <div className="att-empty-sub">{sub}</div>}
  </div>
);

interface DayDrawerProps {
  open: boolean;
  day: DayStatus | null;
  timezone?: string;
  /** Optional heading above the date (e.g. the employee's name). */
  person?: string;
  /** Raw attendance rows for that date, when available. */
  sessions?: any[];
  onClose: () => void;
}

/** Side drawer with the full breakdown of one day. */
export const DayDetailsDrawer: React.FC<DayDrawerProps> = ({ open, day, timezone, person, sessions, onClose }) => {
  const width = typeof window !== "undefined" ? Math.min(400, window.innerWidth) : 400;
  const hasPunch = !!day?.punch_in;
  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={width}
      rootClassName="att-portal"
      title={person || "Day details"}
      destroyOnHidden
    >
      {day && (
        <div>
          <div className="att-detail-head">
            <div>
              <div className="att-detail-date">
                {fmtDay(day.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
              {day.holiday_name && <div className="att-detail-sub">{day.holiday_name}</div>}
            </div>
            <StatusPill status={day.status} lg />
          </div>

          {hasPunch && (
            <div className="att-detail-figs">
              <div className="att-detail-fig">
                <div className="k">In</div>
                <div className="v">{fmtTime(day.punch_in, timezone)}</div>
              </div>
              <div className="att-detail-fig">
                <div className="k">Out</div>
                <div className="v">{day.in_progress ? "Working" : fmtTime(day.punch_out, timezone)}</div>
              </div>
              <div className="att-detail-fig">
                <div className="k">Worked</div>
                <div className="v">{fmtMinutes(day.worked_minutes)}</div>
              </div>
            </div>
          )}

          <div>
            <div className="att-detail-row">
              <span className="k">Late by</span>
              <span className="v" style={{ color: day.late_minutes > 0 ? "#D97706" : undefined }}>
                {day.late_minutes > 0 ? fmtMinutes(day.late_minutes) : "—"}
              </span>
            </div>
            <div className="att-detail-row">
              <span className="k">Overtime</span>
              <span className="v">{day.overtime_minutes > 0 ? fmtMinutes(day.overtime_minutes) : "—"}</span>
            </div>
            {day.leave && (
              <div className="att-detail-row">
                <span className="k">Leave</span>
                <span className="v">{leaveLabel(day.leave)}</span>
              </div>
            )}
            {day.holiday_name && (
              <div className="att-detail-row">
                <span className="k">Holiday</span>
                <span className="v">{day.holiday_name}</span>
              </div>
            )}
          </div>

          {day.in_progress && (
            <div className="att-note info">
              <InfoCircleOutlined style={{ marginTop: 2 }} />
              Session in progress — hours update until punch-out.
            </div>
          )}
          {day.missed_punch_out && (
            <div className="att-note warn">
              <ExclamationCircleOutlined style={{ marginTop: 2 }} />
              Punch-out was missed and the system closed the session automatically. Hours are capped at the shift length
              and no overtime is counted.
            </div>
          )}
          {day.worked_on_off && (
            <div className="att-note info">
              <InfoCircleOutlined style={{ marginTop: 2 }} />
              Worked on a {day.status === "HOLIDAY" ? "holiday" : "weekly off"} — all hours count as overtime.
            </div>
          )}
          {!hasPunch && day.status === "ABSENT" && (
            <div className="att-note warn">
              <ExclamationCircleOutlined style={{ marginTop: 2 }} />
              No attendance was recorded on this working day.
            </div>
          )}

          {sessions && sessions.length > 1 && (
            <div className="att-detail-sessions">
              <div className="att-detail-sessions-title">Sessions</div>
              {sessions.map((s: any) => (
                <div className="att-detail-row" key={s.id}>
                  <span className="k">
                    {fmtTime(s.punch_in, timezone)} – {s.punch_out ? fmtTime(s.punch_out, timezone) : "now"}
                  </span>
                  <span className="v">{s.punch_out ? fmtMinutes(s.total_minutes) : "In progress"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};
