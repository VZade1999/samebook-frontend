import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CarOutlined,
  CheckSquareOutlined,
  CloudOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  ScheduleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { Overview } from "../types";
import { ago, bytes, count, dateTime, duration, inr, inrCompact, pct, share, titleCase, PAYMENT_MODE_LABEL } from "../utils/format";
import { Card, Delta, Empty } from "./Bits";
import SegmentBar from "./charts/SegmentBar";

// ── Recent activity ─────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; tint: string }> = {
  invoice: { label: "Invoice", icon: <FileDoneOutlined />, tint: "var(--db-s1)" },
  payment: { label: "Payment", icon: <WalletOutlined />, tint: "var(--db-good)" },
  quotation: { label: "Quotation", icon: <FileTextOutlined />, tint: "var(--db-s7)" },
  challan: { label: "Challan", icon: <CarOutlined />, tint: "var(--db-s2)" },
};

export const RecentActivity: React.FC<{ items: NonNullable<Overview["recent"]>; showAmounts: boolean }> = ({ items, showAmounts }) => {
  const navigate = useNavigate();
  const open = (r: (typeof items)[number]) => {
    if (r.type === "invoice" || r.type === "payment") navigate(`/app/invoice-details/${r.ref_id}`);
    else if (r.type === "challan") navigate(`/app/delivery-challans/${r.id}`);
    else navigate("/app/quotation");
  };
  if (!items.length) return <Empty icon={<FileTextOutlined />} title="Nothing created in this period" sub="New quotations, invoices, payments and challans show up here." />;
  return (
    <ul className="db-recent">
      {items.map((r, i) => {
        const m = TYPE_META[r.type];
        return (
          <li key={`${r.type}-${r.id}`} style={{ ["--tint" as any]: m.tint, ["--i" as any]: i }} onClick={() => open(r)} tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && open(r)}>
            <span className="db-recent-icon">{m.icon}</span>
            <span className="db-recent-main">
              <b>
                {r.type === "payment" ? `Payment for ${r.number}` : r.number || m.label}
              </b>
              <small>{r.name || "—"}</small>
            </span>
            <span className="db-recent-status">
              {r.type === "payment" ? PAYMENT_MODE_LABEL[r.status] || titleCase(r.status) : titleCase(r.status)}
            </span>
            {showAmounts || r.type === "quotation" || r.type === "challan" ? (
              <b className="db-recent-amt">{inr(r.amount)}</b>
            ) : (
              <span />
            )}
            <span className="db-recent-time" title={dateTime(r.at)}>
              {ago(r.at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

// ── Add-ons ─────────────────────────────────────────────────────────────────

export const TasksCard: React.FC<{ t: NonNullable<Overview["tasks"]>; vs: string }> = ({ t, vs }) => {
  const navigate = useNavigate();
  return (
    <Card
      icon={<CheckSquareOutlined />}
      tint="var(--db-s7)"
      title={t.scope === "company" ? "Team tasks" : "My tasks"}
      sub={t.scope === "company" ? "Everything open across the company" : "Assigned to you"}
      link={{ label: "Open tasks", onClick: () => navigate(t.scope === "company" ? "/app/tasks/overview" : "/app/tasks") }}
    >
      <div className="db-mini-stats">
        <div>
          <b>{count(t.open)}</b>
          <span>Open</span>
        </div>
        <div className={t.overdue ? "alert" : ""}>
          <b>{count(t.overdue)}</b>
          <span>Overdue</span>
        </div>
        <div>
          <b>{count(t.due_today)}</b>
          <span>Due today</span>
        </div>
      </div>
      <SegmentBar
        ariaLabel="Open tasks by status"
        format={count}
        segments={[
          { key: "TODO", label: "To do", value: t.by_status.TODO, color: "var(--db-o2)" },
          { key: "IN_PROGRESS", label: "In progress", value: t.by_status.IN_PROGRESS, color: "var(--db-o3)" },
          { key: "IN_REVIEW", label: "In review", value: t.by_status.IN_REVIEW, color: "var(--db-o4)" },
          { key: "ON_HOLD", label: "On hold", value: t.by_status.ON_HOLD, color: "var(--db-neutral)" },
        ]}
      />
      <div className="db-mini-foot">
        <span>
          <b>{count(t.done)}</b> completed this period
        </span>
        <Delta change={t.done_change} current={t.done} vs={vs} />
      </div>
    </Card>
  );
};

export const AttendanceCard: React.FC<{ a: NonNullable<Overview["attendance"]> }> = ({ a }) => {
  const navigate = useNavigate();
  if (a.scope === "me") {
    return (
      <Card icon={<ScheduleOutlined />} tint="var(--db-s3)" title="My attendance" sub="This period"
        link={{ label: "Open attendance", onClick: () => navigate("/app/attendance") }}>
        <div className="db-mini-stats">
          <div><b>{count(a.days)}</b><span>Days present</span></div>
          <div><b>{duration(a.minutes)}</b><span>Hours logged</span></div>
          <div><b>{count(a.pending_leaves)}</b><span>Leaves pending</span></div>
        </div>
        <div className={`db-presence ${a.working ? "in" : a.punched_today ? "out" : "none"}`}>
          <i /> {a.working ? "You're punched in right now" : a.punched_today ? "You've punched out for today" : "You haven't punched in today"}
        </div>
      </Card>
    );
  }
  const ratio = share(a.present, a.staff);
  const maxDay = Math.max(1, ...a.daily.map((d) => d[1]));
  return (
    <Card icon={<ScheduleOutlined />} tint="var(--db-s3)" title="Team attendance" sub="Today, and presence across the period"
      link={{ label: "Team attendance", onClick: () => navigate("/app/attendance/team") }}>
      <div className="db-att-head">
        <div className="db-att-big">
          <b>{count(a.present)}</b>
          <span>of {count(a.staff)} in today</span>
        </div>
        <div className="db-meter" role="img" aria-label={`${pct(ratio, 0)} of staff present today`}>
          <span style={{ width: `${ratio}%` }} />
        </div>
      </div>
      <div className="db-mini-stats">
        <div><b>{count(a.working)}</b><span>Working now</span></div>
        <div><b>{count(a.on_leave)}</b><span>On leave</span></div>
        <div className={a.pending_leaves ? "warn" : ""}><b>{count(a.pending_leaves)}</b><span>Leave requests</span></div>
      </div>
      {a.daily.length > 1 && (
        <div className="db-att-cols" role="img" aria-label="People present per day">
          {a.daily.slice(-31).map(([d, n]) => (
            <span key={d} title={`${d}: ${n} present`} style={{ height: `${Math.max(6, (n / maxDay) * 100)}%` }} />
          ))}
        </div>
      )}
      {a.avg_minutes !== null && <div className="db-mini-foot"><span>Average day: <b>{duration(a.avg_minutes)}</b></span></div>}
    </Card>
  );
};

export const DriveCard: React.FC<{ d: NonNullable<Overview["drive"]> }> = ({ d }) => {
  const navigate = useNavigate();
  return (
    <Card icon={<CloudOutlined />} tint="var(--db-s1)" title="Drive" sub="Company files"
      link={{ label: "Open Drive", onClick: () => navigate("/app/drive") }}>
      <div className="db-mini-stats">
        <div><b>{count(d.files)}</b><span>Files</span></div>
        <div><b>{count(d.folders)}</b><span>Folders</span></div>
        <div><b>{bytes(d.bytes)}</b><span>Stored</span></div>
      </div>
      <div className="db-mini-foot">
        <span>
          <b>{count(d.uploads)}</b> upload{d.uploads === 1 ? "" : "s"} this period by <b>{count(d.contributors)}</b>{" "}
          {d.contributors === 1 ? "person" : "people"}
        </span>
      </div>
    </Card>
  );
};

export const fmtMoneyOrCount = (insights: boolean) => (insights ? inrCompact : count);
