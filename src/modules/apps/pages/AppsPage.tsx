import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Checkbox, Modal, Spin, message } from "antd";
import {
  AppstoreAddOutlined,
  CheckCircleFilled,
  DisconnectOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  LinkOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { StorageService } from "@/storage";
import { useAccess } from "@/permissions/useAccess";
import { refreshAccess } from "@/session/session";
import "../styles/apps.scss";

interface CompanyModule {
  key: string;
  name: string;
  description: string;
  core: boolean;
  plan: string;
  enabled: boolean;
  enabled_at: string | null;
  enabled_by: { id: number; name: string } | null;
  disabled_at: string | null;
}

interface Role {
  id: number;
  name: string;
  company_id?: number;
  is_system?: number;
}

// Presentation per module; unknown modules fall back to a generic look.
interface ModuleLook {
  icon: React.ReactNode;
  color: string;
  bg: string;
  openPath?: string;
  features: string[];
}
const FALLBACK_LOOK: ModuleLook = { icon: <AppstoreAddOutlined />, color: "#4F46E5", bg: "#EEF2FF", features: [] };
const LOOK: Record<string, ModuleLook> = {
  billing: {
    icon: <FileTextOutlined />,
    color: "#4F46E5",
    bg: "#EEF2FF",
    features: ["Quotations & approvals", "GST invoices & payments", "Delivery challans", "Products, stock & customers"],
  },
  attendance: {
    icon: <FieldTimeOutlined />,
    color: "#059669",
    bg: "#ECFDF5",
    openPath: "/app/attendance",
    features: ["Punch in / out with live clock", "Shift rules, grace time & holidays", "Monthly calendar & team view", "Leave requests & approvals"],
  },
};

const errText = (err: any, fallback: string) => {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : m || fallback;
};

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

const AppsPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { can } = useAccess();

  const [modules, setModules] = useState<CompanyModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [connecting, setConnecting] = useState<CompanyModule | null>(null);
  const [disconnecting, setDisconnecting] = useState<CompanyModule | null>(null);
  const [grantIds, setGrantIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const companyId = useMemo(() => {
    try {
      const raw = new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
      return raw ? Number(JSON.parse(raw)?.id) : null;
    } catch {
      return null;
    }
  }, []);
  const isSuperAdmin = useMemo(() => {
    try {
      const raw = new StorageService().getItem(StorageService.STORAGE_KEYS.USER_DETAILS);
      const r = raw ? JSON.parse(raw)?.role : [];
      return Array.isArray(r) && r.includes("SUPER_ADMIN");
    } catch {
      return false;
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/companies/modules");
      setModules(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      message.error(errText(err, "Unable to load apps"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Roles the owner may give access to while connecting: only roles that
  // belong to this company (the server rejects others), and SUPER_ADMIN only
  // for super admins.
  const openConnect = async (m: CompanyModule) => {
    setConnecting(m);
    setGrantIds([]);
    if (roles === null && can("roles.view")) {
      try {
        const res = await api.get("/roles/all");
        const list: Role[] = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        setRoles(list);
      } catch {
        setRoles([]);
      }
    }
  };

  const grantable = useMemo(
    () =>
      (roles || []).filter(
        (r) =>
          (r.company_id === undefined || companyId === null || Number(r.company_id) === companyId) &&
          (r.name !== "SUPER_ADMIN" || isSuperAdmin),
      ),
    [roles, companyId, isSuperAdmin],
  );

  const doConnect = async () => {
    if (!connecting) return;
    setBusy(true);
    try {
      const res = await api.post(`/companies/modules/${connecting.key}/connect`, { grant_role_ids: grantIds });
      message.success(res?.data?.message || `${connecting.name} connected`);
      setConnecting(null);
      await refreshAccess(dispatch); // new JWT + live permissions/modules
      await load();
    } catch (err) {
      message.error(errText(err, "Could not connect"));
    } finally {
      setBusy(false);
    }
  };

  const doDisconnect = async () => {
    if (!disconnecting) return;
    setBusy(true);
    try {
      const res = await api.post(`/companies/modules/${disconnecting.key}/disconnect`);
      message.success(res?.data?.message || `${disconnecting.name} disconnected`);
      setDisconnecting(null);
      await refreshAccess(dispatch);
      await load();
    } catch (err) {
      message.error(errText(err, "Could not disconnect"));
    } finally {
      setBusy(false);
    }
  };

  const connectedCount = modules.filter((m) => !m.core && m.enabled).length;
  const addOnCount = modules.filter((m) => !m.core).length;

  return (
    <div className="apps-root">
      <div className="apps-hero">
        <div className="apps-hero-noise" />
        <div className="apps-hero-inner">
          <div>
            <div className="apps-title">
              <div className="apps-title-icon"><AppstoreAddOutlined /></div>
              Apps &amp; Add-ons
            </div>
            <div className="apps-subtitle">
              Billing is included with SameBook. Connect add-ons only when your team needs them.
            </div>
          </div>
          <button className="apps-hero-btn" onClick={load} disabled={loading}>
            <ReloadOutlined spin={loading} /> <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="apps-stats">
        <div className="apps-stat">
          <div className="apps-stat-label">Add-ons connected</div>
          <div className="apps-stat-value">{loading ? "–" : `${connectedCount} / ${addOnCount}`}</div>
        </div>
        <div className="apps-stat">
          <div className="apps-stat-label">Current plan</div>
          <div className="apps-stat-value small"><SafetyCertificateOutlined /> Free</div>
        </div>
      </div>

      <div className="apps-body">
        {loading && !modules.length ? (
          <div className="apps-loading"><Spin /></div>
        ) : (
          <div className="apps-grid">
            {modules.map((m) => {
              const look = LOOK[m.key] || FALLBACK_LOOK;
              return (
                <div key={m.key} className={`apps-card${m.enabled ? " is-on" : ""}`} style={{ ["--app-color" as any]: look.color }}>
                  <div className="apps-card-head">
                    <div className="apps-card-icon" style={{ background: look.bg, color: look.color }}>{look.icon}</div>
                    <div className="apps-card-titles">
                      <div className="apps-card-name">{m.name}</div>
                      <div className="apps-card-badges">
                        {m.core ? (
                          <span className="apps-badge included">Included</span>
                        ) : (
                          <span className="apps-badge free">Free</span>
                        )}
                        <span className={`apps-badge ${m.enabled ? "on" : "off"}`}>
                          <span className="dot" /> {m.core ? "Always on" : m.enabled ? "Connected" : "Not connected"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="apps-card-desc">{m.description}</p>
                  {look.features.length > 0 && (
                    <ul className="apps-card-features">
                      {look.features.map((f) => (
                        <li key={f}><CheckCircleFilled /> {f}</li>
                      ))}
                    </ul>
                  )}

                  <div className="apps-card-foot">
                    <div className="apps-card-meta">
                      {!m.core && m.enabled && m.enabled_at && (
                        <>Connected {fmtDate(m.enabled_at)}{m.enabled_by ? ` by ${m.enabled_by.name}` : ""}</>
                      )}
                      {!m.core && !m.enabled && m.disabled_at && <>Disconnected {fmtDate(m.disabled_at)} · data kept</>}
                    </div>
                    {!m.core && (
                      <div className="apps-card-actions">
                        {m.enabled ? (
                          <>
                            {look.openPath && (
                              <button className="apps-btn ghost" onClick={() => navigate(look.openPath!)}>Open</button>
                            )}
                            <button className="apps-btn danger" onClick={() => setDisconnecting(m)}>
                              <DisconnectOutlined /> Disconnect
                            </button>
                          </>
                        ) : (
                          <button className="apps-btn primary" onClick={() => openConnect(m)}>
                            <LinkOutlined /> Connect
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={!!connecting}
        title={connecting ? `Connect ${connecting.name}` : ""}
        onCancel={() => !busy && setConnecting(null)}
        onOk={doConnect}
        okText="Connect"
        okButtonProps={{ loading: busy }}
        cancelButtonProps={{ disabled: busy }}
        destroyOnHidden
      >
        {connecting && (
          <div className="apps-modal">
            <p>
              {connecting.description} It's <b>free</b>, and you can disconnect it at any time. Your data is
              kept.
            </p>
            <div className="apps-modal-label">Who should get access now?</div>
            <p className="apps-modal-hint">
              Roles that already have attendance permissions get access automatically. Tick any other roles that
              should be able to use My Attendance.
            </p>
            {roles === null && can("roles.view") ? (
              <Spin size="small" />
            ) : grantable.length ? (
              <Checkbox.Group
                className="apps-role-list"
                value={grantIds}
                onChange={(v) => setGrantIds(v as number[])}
                options={grantable.map((r) => ({ label: r.name, value: r.id }))}
              />
            ) : (
              <p className="apps-modal-hint">You can give roles access later from Roles &amp; Permissions.</p>
            )}
            <p className="apps-modal-hint" style={{ marginTop: 12 }}>
              Shift timings, grace minutes, weekly offs and holidays can be adjusted afterwards in Team
              Attendance → Settings.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!disconnecting}
        title={disconnecting ? `Disconnect ${disconnecting.name}?` : ""}
        onCancel={() => !busy && setDisconnecting(null)}
        onOk={doDisconnect}
        okText="Disconnect"
        okButtonProps={{ danger: true, loading: busy }}
        cancelButtonProps={{ disabled: busy }}
        destroyOnHidden
      >
        <div className="apps-modal">
          <p>Everyone in your company loses access to {disconnecting?.name} immediately.</p>
          <p>
            <b>No data is deleted.</b> Attendance records, settings, holidays and leave requests are kept and come
            back when you connect again.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AppsPage;
