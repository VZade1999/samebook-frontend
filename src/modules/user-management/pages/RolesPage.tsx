import React, { useCallback, useEffect, useMemo, useState } from "react";
import { message, Popconfirm, Tooltip } from "antd";
import {
  ApartmentOutlined,
  CopyOutlined,
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import "@/modules/team/team.scss";
import { StorageService } from "@/storage";
import { LEVELS, initialsOf, levelInfo, roleLabel } from "@/permissions/standing";
import { apiError } from "@/modules/team/teamApi";
import { type RoleView, type RolesOverview, deleteRole, getRoles } from "../roles/rolesApi";
import RolePermissionsDrawer from "../roles/RolePermissionsDrawer";
import RoleFormModal from "../roles/RoleFormModal";
import "../roles/roles.scss";

const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};

/** The company's roles as a ladder of levels, each with its people and permissions. */
const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const company = useMemo(companyName, []);
  const [data, setData] = useState<RolesOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [perms, setPerms] = useState<RoleView | null>(null);
  const [form, setForm] = useState<{ open: boolean; role: RoleView | null; copyFrom: RoleView | null }>({ open: false, role: null, copyFrom: null });

  const load = useCallback(async () => {
    try {
      const d = await getRoles();
      setData(d);
      setFailed(false);
      return d;
    } catch (e) {
      setFailed(true);
      message.error(apiError(e, "Couldn't load the roles"));
      return null;
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const byLevel = useMemo(() => {
    const m = new Map<number, RoleView[]>();
    (data?.roles || []).forEach((r) => m.set(r.level, [...(m.get(r.level) || []), r]));
    return m;
  }, [data]);

  const remove = async (r: RoleView) => {
    try {
      message.success((await deleteRole(r.id)).message);
      load();
    } catch (e) {
      message.error(apiError(e, "Couldn't delete the role"));
    }
  };

  if (!data) {
    return (
      <div className="db-root tm-root">
        <div className="db-hero skeleton tm-hero-sk">
          {failed && (
            <div className="tm-failed">
              Couldn't load the roles.
              <button type="button" className="db-btn white" onClick={load}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { me } = data;
  const total = data.catalogue.length;
  const withRole = data.roles.reduce((s, r) => s + r.people, 0);
  const youLine = me.admin
    ? "You're an Admin — you can change every role except the Admin's"
    : me.can_edit
      ? `You can change roles below your level (levels ${me.rank + 1}–5)`
      : "You can see the roles";

  return (
    <div className="db-root tm-root rl-root">
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Team &amp; access
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <SafetyCertificateOutlined />
              </span>
              Roles &amp; access
            </div>
            <div className="db-hero-sub">A role is a set of permissions at a level. People manage only those below their own level.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">Roles in your company</span>
              <span className="db-hero-number">{data.roles.length}</span>
              <span className="db-hero-figure-foot">
                <SafetyCertificateOutlined /> {youLine}
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>5</b>
                <span>Levels</span>
              </div>
              <div className="db-hero-stat">
                <b>{withRole}</b>
                <span>Role holders</span>
              </div>
              <div className="db-hero-stat">
                <b>{total}</b>
                <span>Permissions</span>
              </div>
            </div>
            <div className="db-hero-btns">
              <button type="button" className="db-btn glass" onClick={() => navigate("/app/users")}>
                <ApartmentOutlined /> Team
              </button>
              {me.can_create && (
                <button type="button" className="db-btn white" onClick={() => setForm({ open: true, role: null, copyFrom: null })}>
                  <PlusOutlined /> New role
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rl-ladder">
        {[1, 2, 3, 4, 5].map((lvl, li) => {
          const info = LEVELS[lvl];
          const roles = byLevel.get(lvl) || [];
          const mineLevel = me.admin ? lvl === 1 : lvl === me.rank;
          return (
            <section key={lvl} className="rl-tier" style={{ ["--tone" as any]: info.tone, ["--i" as any]: li }}>
              <header className="rl-tier-h">
                <span className="rl-level-badge">{lvl === 1 ? <CrownOutlined /> : lvl}</span>
                <div className="rl-tier-titles">
                  <h3>
                    Level {lvl} · {info.name}
                    {mineLevel && <em className="tm-you">Your level</em>}
                  </h3>
                  <p>
                    {lvl === 1
                      ? "Top of the company — every permission, always. Manages everyone."
                      : `${info.hint}. Managed by ${lvl === 2 ? "the Admin" : `levels 1–${lvl - 1}`}.`}
                  </p>
                </div>
                {me.can_create && lvl > 1 && (me.admin || lvl > me.rank) && (
                  <button type="button" className="tm-tool" onClick={() => setForm({ open: true, role: null, copyFrom: null })}>
                    <PlusOutlined /> Role
                  </button>
                )}
              </header>
              <div className="rl-cards">
                {roles.map((r) => (
                  <article key={r.id} className={`rl-card${r.admin ? " admin" : ""}`}>
                    <div className="rl-card-top">
                      <b>{roleLabel(r.name)}</b>
                      {(r.admin || !r.can_edit) && (
                        <Tooltip title={r.why_not}>
                          <LockOutlined className="rl-lock" aria-label="Locked" />
                        </Tooltip>
                      )}
                    </div>
                    <p className="rl-desc">{r.admin ? "Runs the company: every app, every setting, every person." : r.description || "No description yet."}</p>
                    <div className="rl-meter" role="img" aria-label={`${r.permission_count} of ${total} permissions`}>
                      <span style={{ width: `${total ? Math.max(4, (r.permission_count / total) * 100) : 0}%` }} />
                    </div>
                    <div className="rl-card-meta">
                      <span>
                        <KeyOutlined /> {r.admin ? "All" : r.permission_count} permission{r.permission_count === 1 && !r.admin ? "" : "s"}
                      </span>
                      <span className="rl-people" title={r.people_preview.map((p) => p.name).join(", ")}>
                        {r.people_preview.slice(0, 4).map((p) => (
                          <span key={p.id} className="tm-avatar xs" style={{ ["--tone" as any]: levelInfo(r.level).tone }}>
                            {initialsOf(p.name)}
                          </span>
                        ))}
                        <em>
                          {r.people} {r.people === 1 ? "person" : "people"}
                        </em>
                      </span>
                    </div>
                    <div className="rl-card-actions">
                      <button type="button" className="tm-tool" onClick={() => setPerms(r)}>
                        <KeyOutlined /> {r.admin || !r.can_edit || !me.can_edit ? "See permissions" : "Permissions"}
                      </button>
                      {me.can_edit && (r.can_edit || (r.admin && me.admin)) && (
                        <Tooltip title={r.admin ? "Edit the description" : "Rename or change the level"}>
                          <button type="button" className="tm-icon" onClick={() => setForm({ open: true, role: r, copyFrom: null })} aria-label={`Edit ${r.name}`}>
                            <EditOutlined />
                          </button>
                        </Tooltip>
                      )}
                      {me.can_create && (
                        <Tooltip title="Duplicate — a new role with these permissions">
                          <button type="button" className="tm-icon" onClick={() => setForm({ open: true, role: null, copyFrom: r })} aria-label={`Duplicate ${r.name}`}>
                            <CopyOutlined />
                          </button>
                        </Tooltip>
                      )}
                      {me.can_delete && r.can_edit && !r.admin && (
                        <Popconfirm
                          title={`Delete ${roleLabel(r.name)}?`}
                          description={r.people ? `${r.people} ${r.people === 1 ? "person still has" : "people still have"} it — give them another role first.` : "Nobody has this role. It will be removed."}
                          okText="Delete"
                          okButtonProps={{ danger: true, disabled: r.people > 0 }}
                          cancelText="Keep"
                          onConfirm={() => remove(r)}
                        >
                          <button type="button" className="tm-icon danger" aria-label={`Delete ${r.name}`}>
                            <DeleteOutlined />
                          </button>
                        </Popconfirm>
                      )}
                    </div>
                  </article>
                ))}
                {!roles.length && <div className="rl-empty">No roles at this level{me.can_create && lvl > 1 && (me.admin || lvl > me.rank) ? " — add one with “+ Role”." : "."}</div>}
              </div>
            </section>
          );
        })}
      </div>

      <RolePermissionsDrawer
        open={!!perms}
        role={perms}
        data={data}
        onClose={() => setPerms(null)}
        onSaved={(msg) => {
          setPerms(null);
          message.success(msg);
          load();
        }}
      />
      <RoleFormModal
        open={form.open}
        role={form.role}
        copyFrom={form.copyFrom}
        data={data}
        onClose={() => setForm({ open: false, role: null, copyFrom: null })}
        onSaved={async (msg, newId) => {
          setForm({ open: false, role: null, copyFrom: null });
          message.success(msg);
          const d = await load();
          // A new role opens straight into its permissions.
          const created = newId ? d?.roles.find((r) => r.id === newId) : null;
          if (created && created.can_edit) setPerms(created);
        }}
      />
    </div>
  );
};

export default RolesPage;
