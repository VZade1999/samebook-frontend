import React, { useCallback, useEffect, useState } from "react";
import { Drawer, Input, message, Popconfirm, Select, Spin, Switch } from "antd";
import {
  AppstoreAddOutlined,
  CrownOutlined,
  ExclamationCircleFilled,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ShopOutlined,
  TeamOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { initialsOf, levelInfo, roleLabel } from "@/permissions/standing";
import { ago, apiError } from "@/modules/team/teamApi";
import { type CompanyDetail, addAdmin, getCompany, setAddOn, setCompanyStatus } from "./platformApi";

const pw = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (x, i) => (i === 4 || i === 8 ? "-" : "") + chars[x % chars.length]).join("");
};

/** One company on the platform: its people, Admins, add-ons and status. */
const CompanyDrawer: React.FC<{ companyId: number | null; onClose: () => void; onChanged: () => void }> = ({ companyId, onClose, onChanged }) => {
  const [c, setC] = useState<CompanyDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState<"none" | "promote" | "new">("none");
  const [promoteId, setPromoteId] = useState<number | null>(null);
  const [na, setNa] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      setC(await getCompany(companyId));
      setFailed(false);
    } catch (e) {
      setFailed(true);
      message.error(apiError(e, "Couldn't load the company"));
    }
  }, [companyId]);

  useEffect(() => {
    setC(null);
    setAdminMode("none");
    setError("");
    setNa({ first_name: "", last_name: "", email: "", phone: "", password: "" });
    load();
  }, [load]);

  const act = async (key: string, fn: () => Promise<{ message: string }>) => {
    setBusy(key);
    setError("");
    try {
      message.success((await fn()).message);
      await load();
      onChanged();
      return true;
    } catch (e) {
      const m = apiError(e, "Couldn't do that");
      setError(m);
      message.error(m);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveAdmin = async () => {
    if (!c) return;
    if (adminMode === "promote" && promoteId) {
      if (await act("admin", () => addAdmin(c.id, { user_id: promoteId }))) setAdminMode("none");
      return;
    }
    if (await act("admin", () => addAdmin(c.id, { ...na }))) setAdminMode("none");
  };

  const suspended = c?.status === "suspended";
  const nonAdmins = (c?.people || []).filter((p) => !p.admin);

  return (
    <Drawer open={!!companyId} onClose={onClose} size="min(760px, 100vw)" destroyOnHidden rootClassName="tm-portal pf-portal" title={null} closable={false} styles={{ body: { padding: 0 } }}>
      {!c ? (
        <div className="pf-loading">
          {failed ? (
            <button type="button" className="tm-btn ghost" onClick={load}>
              <ReloadOutlined /> Try again
            </button>
          ) : (
            <Spin />
          )}
        </div>
      ) : (
        <div className="tm-drawer">
          <div className="tm-drawer-head pf-head">
            <span className="tm-avatar lg company">
              <ShopOutlined />
            </span>
            <div className="tm-drawer-titles">
              <h3>
                {c.name} {c.yours && <em className="tm-you">Your company</em>}
              </h3>
              <p>
                <span className={`pf-status ${c.status}`}>{suspended ? "Suspended" : "Active"}</span> · prefix <b className="tm-mono">{c.prefix}</b> · on SameBook since{" "}
                {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <button type="button" className="tm-x" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="pf-facts">
            <div>
              <span>People</span>
              <b>
                {c.counts.active} <em>active</em> · {c.counts.total - c.counts.active} <em>deactivated</em>
              </b>
            </div>
            <div>
              <span>Documents</span>
              <b>
                {c.documents.quotations} <em>quotations</em> · {c.documents.invoices} <em>invoices</em> · {c.documents.challans} <em>challans</em>
              </b>
            </div>
            <div>
              <span>Last active</span>
              <b>{ago(c.last_active)}</b>
            </div>
            <div>
              <span>GSTIN · contact</span>
              <b>{[c.gst_no, c.email, c.phone].filter(Boolean).join(" · ") || "—"}</b>
            </div>
          </div>

          {error && (
            <div className="tm-error" role="alert">
              <ExclamationCircleFilled /> {error}
            </div>
          )}

          {/* Admins */}
          <section className="pf-sec">
            <div className="pf-sec-h">
              <CrownOutlined /> Admins <em>top of the company — they manage everyone there</em>
              {adminMode === "none" && (
                <button type="button" className="tm-tool" onClick={() => setAdminMode(nonAdmins.some((p) => p.is_active) ? "promote" : "new")}>
                  <UserAddOutlined /> Add an Admin
                </button>
              )}
            </div>
            {c.admins.length ? (
              <div className="pf-admins">
                {c.admins.map((a) => (
                  <span key={a.id} className="pf-admin">
                    <span className="tm-avatar xs" style={{ ["--tone" as any]: levelInfo(1).tone }}>
                      {initialsOf(a.name)}
                    </span>
                    <b>{a.name}</b>
                    <em>{a.email}</em>
                  </span>
                ))}
              </div>
            ) : (
              <div className="pf-warnbox">
                <ExclamationCircleFilled /> No Admin yet — nobody can run this company. Add one.
              </div>
            )}
            {adminMode !== "none" && (
              <div className="pf-adminform">
                <div className="tm-seg sm">
                  <button type="button" className={adminMode === "promote" ? "on" : ""} onClick={() => setAdminMode("promote")} disabled={!nonAdmins.some((p) => p.is_active)}>
                    Someone already there
                  </button>
                  <button type="button" className={adminMode === "new" ? "on" : ""} onClick={() => setAdminMode("new")}>
                    A new person
                  </button>
                </div>
                {adminMode === "promote" ? (
                  <Select
                    value={promoteId ?? undefined}
                    onChange={(v) => setPromoteId(Number(v))}
                    placeholder="Pick a person"
                    style={{ width: "100%" }}
                    options={nonAdmins.filter((p) => p.is_active).map((p) => ({ value: p.id, label: `${p.name} — ${p.email}` }))}
                  />
                ) : (
                  <div className="pf-grid2">
                    <Input placeholder="First name *" value={na.first_name} onChange={(e) => setNa({ ...na, first_name: e.target.value })} />
                    <Input placeholder="Last name" value={na.last_name} onChange={(e) => setNa({ ...na, last_name: e.target.value })} />
                    <Input placeholder="Email (to sign in) *" value={na.email} onChange={(e) => setNa({ ...na, email: e.target.value })} />
                    <Input placeholder="Phone" value={na.phone} onChange={(e) => setNa({ ...na, phone: e.target.value })} />
                    <Input.Password placeholder="Password * (8+)" value={na.password} onChange={(e) => setNa({ ...na, password: e.target.value })} autoComplete="new-password" />
                    <button type="button" className="tm-tool" onClick={() => setNa({ ...na, password: pw() })}>
                      Generate password
                    </button>
                  </div>
                )}
                {adminMode === "new" && na.password && <em className="tm-hint">Password: <b className="tm-mono">{na.password}</b> — share it with them.</em>}
                <div className="pf-row-end">
                  <button type="button" className="tm-btn ghost" onClick={() => setAdminMode("none")} disabled={busy === "admin"}>
                    Cancel
                  </button>
                  <button type="button" className="tm-btn primary" onClick={saveAdmin} disabled={busy === "admin" || (adminMode === "promote" && !promoteId)}>
                    {busy === "admin" ? <Spin size="small" /> : <CrownOutlined />} Make Admin
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Add-ons */}
          <section className="pf-sec">
            <div className="pf-sec-h">
              <AppstoreAddOutlined /> Add-ons <em>switch an app on or off for this company</em>
            </div>
            <div className="pf-mods">
              {c.modules.map((m) => (
                <div key={m.key} className={`pf-mod${m.enabled ? " on" : ""}`}>
                  <div>
                    <b>{m.name}</b>
                    <span>{m.core ? "Always included" : m.enabled ? `On since ${new Date(m.enabled_at || c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Off"}</span>
                  </div>
                  <Switch
                    checked={m.enabled}
                    disabled={m.core || busy === `mod:${m.key}`}
                    loading={busy === `mod:${m.key}`}
                    onChange={(v) => act(`mod:${m.key}`, () => setAddOn(c.id, m.key, v))}
                    aria-label={`${m.name} ${m.enabled ? "on" : "off"}`}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* People */}
          <section className="pf-sec">
            <div className="pf-sec-h">
              <TeamOutlined /> People <em>{c.counts.active} can sign in</em>
            </div>
            <ul className="pf-people">
              {c.people.map((p) => (
                <li key={p.id} className={p.is_active ? "" : "off"}>
                  <span className="tm-avatar" style={{ ["--tone" as any]: levelInfo(p.admin ? 1 : Math.min(...p.roles.filter((r) => r.scope !== "PLATFORM").map((r) => r.level), 99)).tone }}>
                    {initialsOf(p.name)}
                  </span>
                  <span className="pf-person">
                    <b>
                      {p.name}
                      {p.platform && <em className="tm-chip platform">SameBook</em>}
                      {!p.is_active && <em className="tm-chip off">Deactivated</em>}
                    </b>
                    <span>{[p.designation, p.department, p.manager ? `reports to ${p.manager}` : null].filter(Boolean).join(" · ") || p.email}</span>
                  </span>
                  <span className="pf-roles">
                    {p.roles
                      .filter((r) => r.scope !== "PLATFORM")
                      .map((r) => (
                        <span key={r.name} className="tm-chip" style={{ ["--tone" as any]: levelInfo(r.level).tone }}>
                          <i /> {roleLabel(r.name)}
                        </span>
                      ))}
                  </span>
                  <span className="pf-seen">{ago(p.last_login)}</span>
                </li>
              ))}
              {!c.people.length && <li className="pf-none">Nobody yet — add an Admin above.</li>}
            </ul>
          </section>

          {/* Status */}
          <section className={`pf-sec pf-danger${suspended ? " back" : ""}`}>
            <div className="pf-sec-h">{suspended ? <PlayCircleOutlined /> : <PauseCircleOutlined />} {suspended ? "Reactivate" : "Suspend"}</div>
            <p>
              {suspended
                ? "Everyone in this company can sign in again. Nothing was deleted."
                : "Nobody in this company can sign in until it's reactivated; open sessions end. Their data stays as it is."}
            </p>
            {c.yours && !suspended ? (
              <em className="tm-hint">You can't suspend your own company.</em>
            ) : (
              <Popconfirm
                title={suspended ? `Reactivate ${c.name}?` : `Suspend ${c.name}?`}
                okText={suspended ? "Reactivate" : "Suspend"}
                okButtonProps={{ danger: !suspended }}
                onConfirm={() => act("status", () => setCompanyStatus(c.id, suspended ? "active" : "suspended"))}
              >
                <button type="button" className={`tm-btn ${suspended ? "primary" : "danger"}`} disabled={busy === "status"}>
                  {busy === "status" ? <Spin size="small" /> : suspended ? <PlayCircleOutlined /> : <PauseCircleOutlined />} {suspended ? "Reactivate company" : "Suspend company"}
                </button>
              </Popconfirm>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
};

export default CompanyDrawer;
