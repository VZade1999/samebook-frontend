import React, { useEffect, useMemo, useState } from "react";
import { Table, Tabs, Tag, Empty, Spin, DatePicker, Popconfirm, Input, message } from "antd";
import dayjs, { Dayjs } from "dayjs";
import {
  TeamOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { getTeamAttendance } from "../redux/attendanceActions";
import { getTeamLeaves, approveLeave, rejectLeave } from "@/modules/leave/redux/leaveActions";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Same elevated-indigo system as the rest of the Attendance module (--att-*).
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --team-bg: var(--background);
      --team-surface: var(--card);
      --team-border: var(--border);
      --team-accent: #4F46E5;
      --team-accent-2: #818CF8;
      --team-accent-light: #EEF2FF;
      --team-text: var(--foreground);
      --team-muted: var(--muted-foreground);
      --team-radius: 14px;
      --team-radius-sm: 8px;
      --team-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --team-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }

    .team-root { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--team-bg); min-height: 100vh; color: var(--team-text); }

    .team-header {
      background: #1E1B4B; padding: 28px 28px 52px; position: relative; overflow: hidden;
    }
    .team-header::after {
      content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 28px;
      background: var(--team-bg); border-radius: 24px 24px 0 0;
    }
    .team-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .team-header-content { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
    .team-page-title { font-size: clamp(22px, 4vw, 30px); font-weight: 700; color: #fff; letter-spacing: -0.5px; display: flex; align-items: center; gap: 12px; }
    .team-page-title-icon { width: 36px; height: 36px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .team-page-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 6px; padding-left: 48px; }

    .team-toolbar { padding: 0 24px; margin-top: -18px; position: relative; z-index: 2; margin-bottom: 16px; }
    .team-toolbar-inner {
      background: var(--team-surface); border: 1px solid var(--team-border); border-radius: var(--team-radius);
      box-shadow: var(--team-shadow); padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }

    .team-body { padding: 0 24px 40px; }
    .team-card { background: var(--team-surface); border: 1px solid var(--team-border); border-radius: var(--team-radius); box-shadow: var(--team-shadow); overflow: hidden; }

    .team-name-cell { font-weight: 700; color: var(--team-accent); }
    .team-muted-cell { color: var(--team-muted); }

    .team-leave-row {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding: 14px 16px; border-bottom: 1px solid var(--team-border);
    }
    .team-leave-row:last-child { border-bottom: none; }
    .team-leave-user { font-weight: 700; color: var(--team-text); font-size: 13.5px; }
    .team-leave-dates { font-size: 12px; color: var(--team-muted); margin-top: 2px; }
    .team-leave-reason { font-size: 13px; color: var(--team-text); margin-top: 6px; line-height: 1.5; }
    .team-leave-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .team-action-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      height: 30px; padding: 0 12px; border-radius: 7px; border: 1px solid var(--team-border);
      background: var(--team-surface); cursor: pointer; font-size: 12px; font-weight: 600; font-family: 'Inter', sans-serif;
      transition: all .15s;
    }
    .team-action-btn.approve { background: #ECFDF5; border-color: #A7F3D0; color: #059669; }
    .team-action-btn.approve:hover { background: #D1FAE5; }
    .team-action-btn.reject { background: #FFF5F5; border-color: #FCA5A5; color: #DC2626; }
    .team-action-btn.reject:hover { background: #FEE2E2; }

    .team-status-filter { display: flex; gap: 6px; padding: 12px 16px 0; }
    .team-status-chip {
      padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer;
      border: 1px solid var(--team-border); background: var(--muted); color: var(--team-muted);
    }
    .team-status-chip.active { background: var(--team-accent); border-color: var(--team-accent); color: #fff; }

    @media (max-width: 640px) {
      .team-header { padding: 20px 16px 44px; }
      .team-toolbar { padding: 0 16px; }
      .team-body { padding: 0 16px 40px; }
      .team-page-subtitle { padding-left: 0; }
    }
  `}</style>
);

const formatMinutes = (mins?: number) => {
  if (!mins) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatTime = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const TeamAttendancePage: React.FC = () => {
  const dispatch = useDispatch();
  const { team, teamLoading } = useSelector((state: any) => state.attendance);
  const { teamLeaves, teamLeavesLoading, reviewingId } = useSelector((state: any) => state.leave);

  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [statusFilter, setStatusFilter] = useState<string | undefined>("pending");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    dispatch(getTeamAttendance(month.format("YYYY-MM")) as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    dispatch(getTeamLeaves(statusFilter) as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleApprove = async (id: number) => {
    const response = await dispatch(approveLeave(id) as any);
    if (response.meta.requestStatus === "fulfilled") {
      message.success("Leave approved");
      dispatch(getTeamLeaves(statusFilter) as any);
    } else {
      message.error(response.payload?.message || "Failed to approve");
    }
  };

  const handleReject = async (id: number) => {
    const response = await dispatch(rejectLeave({ id, review_note: rejectNote.trim() || undefined }) as any);
    if (response.meta.requestStatus === "fulfilled") {
      message.success("Leave rejected");
      setRejectingId(null);
      setRejectNote("");
      dispatch(getTeamLeaves(statusFilter) as any);
    } else {
      message.error(response.payload?.message || "Failed to reject");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Employee",
        dataIndex: "name",
        render: (name: string, record: any) => (
          <div>
            <div className="team-name-cell">{name}</div>
            <div className="team-muted-cell" style={{ fontSize: 12 }}>{record.email}</div>
          </div>
        ),
      },
      {
        title: "Days Present",
        dataIndex: "days_present",
        width: 130,
      },
      {
        title: "Total Hours",
        dataIndex: "total_minutes",
        width: 130,
        render: (mins: number) => formatMinutes(mins),
      },
    ],
    [],
  );

  return (
    <div className="team-root">
      <GlobalStyles />

      <div className="team-header">
        <div className="team-header-noise" />
        <div className="team-header-content">
          <div>
            <div className="team-page-title">
              <div className="team-page-title-icon"><TeamOutlined /></div>
              Team Attendance
            </div>
            <div className="team-page-subtitle">Month-wise attendance and leave approvals for your company</div>
          </div>
        </div>
      </div>

      <div className="team-toolbar">
        <div className="team-toolbar-inner">
          <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} allowClear={false} />
        </div>
      </div>

      <div className="team-body">
        <Tabs
          defaultActiveKey="attendance"
          items={[
            {
              key: "attendance",
              label: (
                <span><FieldTimeOutlined /> Attendance</span>
              ),
              children: (
                <div className="team-card">
                  <Table
                    rowKey="user_id"
                    loading={teamLoading}
                    columns={columns}
                    dataSource={team}
                    scroll={{ x: "max-content" }}
                    locale={{ emptyText: <Empty description="No employees found" /> }}
                    expandable={{
                      expandedRowRender: (record: any) =>
                        record.sessions.length === 0 ? (
                          <Empty description="No sessions this month" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {record.sessions.map((s: any) => (
                              <div key={s.id} style={{ fontSize: 12.5 }}>
                                <b>{s.work_date}</b>: {formatTime(s.punch_in)} – {s.punch_out ? formatTime(s.punch_out) : "in progress"}
                                {s.punch_out ? ` (${formatMinutes(s.total_minutes)})` : ""}
                              </div>
                            ))}
                          </div>
                        ),
                    }}
                    pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "25", "50"] }}
                  />
                </div>
              ),
            },
            {
              key: "leave",
              label: (
                <span><FileTextOutlined /> Leave Requests</span>
              ),
              children: (
                <div className="team-card">
                  <div className="team-status-filter">
                    {[
                      { key: "pending", label: "Pending" },
                      { key: "approved", label: "Approved" },
                      { key: "rejected", label: "Rejected" },
                      { key: undefined, label: "All" },
                    ].map((opt) => (
                      <span
                        key={opt.label}
                        className={`team-status-chip${statusFilter === opt.key ? " active" : ""}`}
                        onClick={() => setStatusFilter(opt.key)}
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>

                  {teamLeavesLoading && teamLeaves.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0" }}><Spin /></div>
                  ) : teamLeaves.length === 0 ? (
                    <Empty description="No leave requests" style={{ padding: 32 }} />
                  ) : (
                    teamLeaves.map((leave: any) => (
                      <div className="team-leave-row" key={leave.id}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="team-leave-user">
                            {[leave.user?.first_name, leave.user?.last_name].filter(Boolean).join(" ") || leave.user?.email}
                          </div>
                          <div className="team-leave-dates">
                            {leave.from_date}{leave.from_date !== leave.to_date ? ` – ${leave.to_date}` : ""}
                            {leave.leave_type === "HALF_DAY" && (
                              <Tag style={{ marginLeft: 6, fontSize: 10, lineHeight: "16px", padding: "0 5px" }}>
                                Half Day{leave.half_day_period ? ` · ${leave.half_day_period}` : ""}
                              </Tag>
                            )}
                          </div>
                          <div className="team-leave-reason">{leave.reason}</div>
                          {leave.status !== "pending" && (
                            <div className="team-leave-dates" style={{ marginTop: 4 }}>
                              Reviewed by {[leave.reviewer?.first_name, leave.reviewer?.last_name].filter(Boolean).join(" ") || "—"}
                              {leave.review_note ? ` — "${leave.review_note}"` : ""}
                            </div>
                          )}
                          {rejectingId === leave.id && (
                            <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                              <Input
                                size="small"
                                placeholder="Optional note for rejection"
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                              />
                              <button className="team-action-btn reject" onClick={() => handleReject(leave.id)}>
                                Confirm
                              </button>
                              <button className="team-action-btn" onClick={() => { setRejectingId(null); setRejectNote(""); }}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                        {leave.status === "pending" && rejectingId !== leave.id && (
                          <div className="team-leave-actions">
                            <Popconfirm title="Approve this leave?" onConfirm={() => handleApprove(leave.id)}>
                              <button className="team-action-btn approve" disabled={reviewingId === leave.id}>
                                <CheckOutlined /> Approve
                              </button>
                            </Popconfirm>
                            <button
                              className="team-action-btn reject"
                              disabled={reviewingId === leave.id}
                              onClick={() => setRejectingId(leave.id)}
                            >
                              <CloseOutlined /> Reject
                            </button>
                          </div>
                        )}
                        {leave.status !== "pending" && (
                          <Tag color={leave.status === "approved" ? "success" : "error"} style={{ textTransform: "capitalize" }}>
                            {leave.status}
                          </Tag>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default TeamAttendancePage;
