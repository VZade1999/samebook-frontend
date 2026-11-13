import React, { useCallback, useEffect, useState } from "react";
import { Badge, Empty, Popover, Spin } from "antd";
import {
  BellOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  FunnelPlotOutlined,
  MessageOutlined,
  RetweetOutlined,
  SwapOutlined,
  TrophyOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import "./notificationBell.scss";

dayjs.extend(relativeTime);

interface Notice {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  actor: { id: number; name: string } | null;
}

const ICON: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  TASK_ASSIGNED: { icon: <UserAddOutlined />, color: "#4F46E5", bg: "#EEF2FF" },
  TASK_FOLLOW_UP: { icon: <BellOutlined />, color: "#D97706", bg: "#FFFBEB" },
  TASK_COMMENT: { icon: <MessageOutlined />, color: "#2563EB", bg: "#EFF6FF" },
  TASK_COMPLETED: { icon: <CheckCircleOutlined />, color: "#059669", bg: "#ECFDF5" },
  TASK_STATUS: { icon: <SwapOutlined />, color: "#64748B", bg: "#F1F5F9" },
  CRM_NEW_LEAD: { icon: <FunnelPlotOutlined />, color: "#7C3AED", bg: "#F5F3FF" },
  CRM_NEW_LEADS: { icon: <FunnelPlotOutlined />, color: "#7C3AED", bg: "#F5F3FF" },
  CRM_REPEAT_ENQUIRY: { icon: <RetweetOutlined />, color: "#EA580C", bg: "#FFF7ED" },
  CRM_LEAD_ASSIGNED: { icon: <UserAddOutlined />, color: "#7C3AED", bg: "#F5F3FF" },
  CRM_LEAD_WON: { icon: <TrophyOutlined />, color: "#059669", bg: "#ECFDF5" },
  CRM_LEAD_LOST: { icon: <CloseCircleOutlined />, color: "#DC2626", bg: "#FEF2F2" },
};
const FALLBACK = { icon: <BellOutlined />, color: "#64748B", bg: "#F1F5F9" };

const POLL_MS = 60_000;

/**
 * Header bell: in-app notifications from any module (tasks today; others can
 * write to the same table). Polls the unread count every minute and on focus;
 * loads the list when opened. Notifications of add-ons the company has
 * switched off are filtered out by the server.
 */
const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCount = useCallback(() => {
    api
      .get("/notifications/unread-count")
      .then((r) => setUnread(Number(r.data?.data?.unread || 0)))
      .catch(() => undefined);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/notifications", { params: { limit: 20 } });
      setItems(r.data?.data?.rows || []);
      setUnread(Number(r.data?.data?.unread || 0));
    } catch {
      // keep whatever we had
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, POLL_MS);
    window.addEventListener("focus", loadCount);
    window.addEventListener("samebook:tasks-changed", loadCount);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", loadCount);
      window.removeEventListener("samebook:tasks-changed", loadCount);
    };
  }, [loadCount]);

  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  const openNotice = (n: Notice) => {
    if (!n.is_read) {
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api.post(`/notifications/${n.id}/read`).catch(() => undefined);
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const readAll = () => {
    setItems((xs) => xs.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
    api.post("/notifications/read-all").catch(() => loadCount());
  };

  const content = (
    <div className="nb-panel">
      <div className="nb-head">
        <span>Notifications</span>
        {unread > 0 && (
          <button className="nb-readall" onClick={readAll}>
            <CheckOutlined /> Mark all read
          </button>
        )}
      </div>
      <div className="nb-list">
        {loading && !items.length ? (
          <div className="nb-center"><Spin size="small" /></div>
        ) : !items.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="You're all caught up" />
        ) : (
          items.map((n) => {
            const look = ICON[n.type] || FALLBACK;
            return (
              <div key={n.id} className={`nb-item${n.is_read ? "" : " unread"}`} onClick={() => openNotice(n)}>
                <span className="nb-icon" style={{ background: look.bg, color: look.color }}>{look.icon}</span>
                <div className="nb-text">
                  <div className="nb-title">{n.title}</div>
                  {n.body && <div className="nb-body">{n.body}</div>}
                  <div className="nb-time">{dayjs(n.created_at).fromNow()}</div>
                </div>
                {!n.is_read && <span className="nb-dot" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      content={content}
      overlayClassName="nb-popover"
    >
      <button className="header-icon-btn notif-btn" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
        <Badge count={unread} size="small" offset={[4, -4]} overflowCount={99}>
          <BellOutlined style={{ fontSize: 16, color: "inherit" }} />
        </Badge>
      </button>
    </Popover>
  );
};

export default NotificationBell;
