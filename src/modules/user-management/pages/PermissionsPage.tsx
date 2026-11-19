import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Input, message, Modal, Popconfirm, Select, Spin, Tooltip } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  GlobalOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SafetyOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import "@/modules/dashboard/styles/dashboard.scss";
import "@/modules/team/team.scss";
import "../roles/roles.scss";
import "../roles/permissions.scss";
import { levelInfo, roleLabel } from "@/permissions/standing";
import { apiError } from "@/modules/team/teamApi";
import { actionLabel, areaLabel } from "../roles/rolesApi";

interface Perm {
  id: number;
  name: string;
  module_name: string | null;
  description: string | null;
  platform: boolean;
  roles: { id: number; name: string; level: number }[];
}
interface Catalogue {
  groups: { area: string; permissions: Perm[] }[];
  total: number;
  can_edit: boolean;
}

/** "What each permission allows", and which of your roles give it. Super Admins can edit the master list. */
const PermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<Catalogue | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<number | 0>(0);
  const [edit, setEdit] = useState<{ open: boolean; perm: Perm | null }>({ open: false, perm: null });

  const load = useCallback(async () => {
    try {
      setData((await api.get("/permissions/catalogue")).data);
      setFailed(false);
    } catch (e) {
      setFailed(true);
      message.error(apiError(e, "Couldn't load the permissions"));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const roles = useMemo(() => {
    const m = new Map<number, { id: number; name: string; level: number }>();
    data?.groups.forEach((g) => g.permissions.forEach((p) => p.roles.forEach((r) => m.set(r.id, r))));
    return [...m.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [data]);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.groups || [])
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            (!term || `${p.name} ${p.description || ""} ${g.area}`.toLowerCase().includes(term)) &&
            (!roleFilter || p.roles.some((r) => r.id === roleFilter)),
        ),
      }))
      .filter((g) => g.permissions.length)
      // The platform's own permissions last.
      .sort((a, b) => Number(a.area === "Platform") - Number(b.area === "Platform"));
  }, [data, q, roleFilter]);

  const remove = async (p: Perm) => {
    try {
      message.success((await api.delete(`/permissions/${p.id}`)).data?.message || "Deleted");
      load();
    } catch (e) {
      message.error(apiError(e, "Couldn't delete"));
    }
  };

  if (!data) {
    return (
      <div className="db-root tm-root">
        <div className="db-hero skeleton tm-hero-sk">
          {failed && (
            <div className="tm-failed">
              Couldn't load the permissions.
              <button type="button" className="db-btn white" onClick={load}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const shown = groups.reduce((s, g) => s + g.permissions.length, 0);

  return (
    <div className="db-root tm-root pm-root">
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Team &amp; access
              {data.can_edit && <span className="db-hero-company tm-sb">Editing as SameBook Super Admin</span>}
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <SafetyOutlined />
              </span>
              Permissions
            </div>
            <div className="db-hero-sub">
              {data.can_edit
                ? "The master list every company picks from. Changes here apply to every company."
                : "Everything a role can allow, and which of your roles give it. Tick them on the Roles page."}
            </div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">Permissions</span>
              <span className="db-hero-number">{data.total}</span>
              <span className="db-hero-figure-foot">
                <SafetyCertificateOutlined /> The Admin role always has every one of them
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{data.groups.length}</b>
                <span>Areas</span>
              </div>
              <div className="db-hero-stat">
                <b>{roles.length}</b>
                <span>Roles</span>
              </div>
            </div>
            <div className="db-hero-btns">
              <button type="button" className="db-btn glass" onClick={() => navigate("/app/roles")}>
                <SafetyCertificateOutlined /> Roles
              </button>
              {data.can_edit && (
                <button type="button" className="db-btn white" onClick={() => setEdit({ open: true, perm: null })}>
                  <PlusOutlined /> New permission
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="tm-bar">
        <Input allowClear prefix={<SearchOutlined />} placeholder="Search permissions…" value={q} onChange={(e) => setQ(e.target.value)} className="tm-search" aria-label="Search permissions" />
        <Select
          value={roleFilter}
          onChange={setRoleFilter}
          className="tm-filter"
          aria-label="Role"
          options={[{ value: 0, label: "Every role" }, ...roles.map((r) => ({ value: r.id, label: `${roleLabel(r.name)} gives…` }))]}
        />
        <span className="pm-count">
          {shown} of {data.total}
        </span>
      </div>

      <div className="pm-groups">
        {groups.map((g, gi) => (
          <section key={g.area} className={`pm-group${g.area === "Platform" ? " platform" : ""}`} style={{ ["--i" as any]: gi }}>
            <header>
              <span className="pm-group-icon">{g.area === "Platform" ? <GlobalOutlined /> : <KeyOutlined />}</span>
              <h3>{areaLabel(g.area)}</h3>
              <em>{g.permissions.length}</em>
            </header>
            <ul>
              {g.permissions.map((p) => (
                <li key={p.id}>
                  <div className="pm-what">
                    <b>{actionLabel(p.name)}</b>
                    <span>{p.description || "—"}</span>
                    <code>{p.name}</code>
                  </div>
                  <div className="pm-who">
                    {p.platform ? (
                      <span className="tm-chip platform">Super Admin only</span>
                    ) : (
                      p.roles.map((r) => (
                        <span key={r.id} className="tm-chip" style={{ ["--tone" as any]: levelInfo(r.level).tone }}>
                          <i /> {roleLabel(r.name)}
                        </span>
                      ))
                    )}
                  </div>
                  {data.can_edit && (
                    <div className="pm-act">
                      <Tooltip title="Edit">
                        <button type="button" className="tm-icon" onClick={() => setEdit({ open: true, perm: p })} aria-label={`Edit ${p.name}`}>
                          <EditOutlined />
                        </button>
                      </Tooltip>
                      <Popconfirm
                        title={`Delete ${p.name}?`}
                        description="Every company's roles lose it. Features that check it stop working for non-Admins."
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => remove(p)}
                      >
                        <button type="button" className="tm-icon danger" aria-label={`Delete ${p.name}`}>
                          <DeleteOutlined />
                        </button>
                      </Popconfirm>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length && (
          <div className="tm-card tm-empty">
            <SearchOutlined />
            <b>No permission matches</b>
            <span>Try another word or role.</span>
          </div>
        )}
      </div>

      {data.can_edit && <PermissionForm open={edit.open} perm={edit.perm} onClose={() => setEdit({ open: false, perm: null })} onSaved={(m) => { setEdit({ open: false, perm: null }); message.success(m); load(); }} />}
    </div>
  );
};

/** Super Admin: add or edit a permission in the master list. */
const PermissionForm: React.FC<{ open: boolean; perm: Perm | null; onClose: () => void; onSaved: (m: string) => void }> = ({ open, perm, onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setName(perm?.name || "");
    setArea(perm?.module_name || "");
    setDescription(perm?.description || "");
    setError("");
  }, [open, perm?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    try {
      const body = { name: name.trim(), module_name: area.trim(), description: description.trim() };
      const r = perm ? await api.put(`/permissions/${perm.id}`, body) : await api.post("/permissions/create", body);
      onSaved(r.data?.message || "Saved");
    } catch (e) {
      setError(apiError(e, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onCancel={() => !saving && onClose()} title={null} footer={null} width={500} centered destroyOnHidden rootClassName="rl-portal">
      <div className="rl-form">
        <div className="rl-form-head">
          <span className="rl-form-icon">
            <KeyOutlined />
          </span>
          <div>
            <h3>{perm ? "Edit permission" : "New permission"}</h3>
            <p>Applies to every company. The code checks it by name.</p>
          </div>
        </div>
        <label>
          <span>Name (area.action)</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. quotations.approve" maxLength={150} className="pm-mono" />
        </label>
        <label>
          <span>Area</span>
          <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Quotations" maxLength={100} />
        </label>
        <label>
          <span>What it allows</span>
          <Input.TextArea value={description} onChange={(e) => setDescription(e.target.value)} autoSize={{ minRows: 2, maxRows: 4 }} maxLength={300} />
        </label>
        {error && (
          <div className="tm-error flush" role="alert">
            <ExclamationCircleFilled /> {error}
          </div>
        )}
        <div className="rl-form-foot">
          <button type="button" className="tm-btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="tm-btn primary" onClick={save} disabled={saving}>
            {saving ? <Spin size="small" /> : <SaveOutlined />} Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PermissionsPage;
