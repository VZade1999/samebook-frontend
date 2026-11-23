import React, { useEffect, useMemo, useState } from "react";
import { Drawer, Input, Spin, Tooltip } from "antd";
import { CheckOutlined, CrownOutlined, ExclamationCircleFilled, LockOutlined, SaveOutlined, SearchOutlined } from "@ant-design/icons";
import { levelInfo, roleLabel } from "@/permissions/standing";
import { apiError } from "@/modules/team/teamApi";
import { ADD_ON_OF, type CataloguePermission, type RoleView, type RolesOverview, actionLabel, setRolePermissions } from "./rolesApi";

/** Areas in reading order, grouped the way people think about the app. */
const AREAS: { section: string; keys: { key: string; label: string }[] }[] = [
  {
    section: "Billing",
    keys: [
      { key: "dashboard", label: "Dashboard" },
      { key: "customers", label: "Customers" },
      { key: "products", label: "Products" },
      { key: "categories", label: "Categories" },
      { key: "warehouses", label: "Warehouses" },
      { key: "quotations", label: "Quotations" },
      { key: "challans", label: "Delivery challans" },
      { key: "invoices", label: "Invoices" },
      { key: "reports", label: "Reports" },
    ],
  },
  {
    section: "Company & team",
    keys: [
      { key: "companies", label: "Company profile" },
      { key: "company", label: "Apps & add-ons" },
      { key: "users", label: "Team" },
      { key: "roles", label: "Roles" },
      { key: "permissions", label: "Permissions" },
    ],
  },
  {
    section: "Apps",
    keys: [
      { key: "purchases", label: "Purchases" },
      { key: "ai_agent", label: "AI Assistant" },
      { key: "attendance", label: "Attendance & leave" },
      { key: "leave", label: "Leave" },
      { key: "tasks", label: "Tasks" },
      { key: "crm", label: "CRM" },
      { key: "drive", label: "Drive" },
    ],
  },
];
const prefixOf = (name: string) => name.split(".")[0];

/** Tick what a role may do, area by area. The Admin role always has everything. */
const RolePermissionsDrawer: React.FC<{
  open: boolean;
  role: RoleView | null;
  data: RolesOverview;
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ open, role, data, onClose, onSaved }) => {
  const [on, setOn] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const original = useMemo(() => new Set(role?.permissions || []), [role]);
  useEffect(() => {
    if (!open) return;
    setOn(new Set(role?.permissions || []));
    setQ("");
    setError("");
  }, [open, role?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const readOnly = !role || role.admin || !role.can_edit || !data.me.can_edit;
  const mine = useMemo(() => new Set(data.me.permissions), [data.me.permissions]);
  // A non-Admin can only add what they hold themselves (taking away is fine).
  const blocked = (name: string) => !data.me.admin && !mine.has(name) && !original.has(name);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const byPrefix = new Map<string, CataloguePermission[]>();
    data.catalogue.forEach((p) => {
      if (term && !`${p.name} ${p.description || ""} ${p.module}`.toLowerCase().includes(term)) return;
      const k = prefixOf(p.name);
      byPrefix.set(k, [...(byPrefix.get(k) || []), p]);
    });
    const known = new Set(AREAS.flatMap((a) => a.keys.map((k) => k.key)));
    const extra = [...byPrefix.keys()].filter((k) => !known.has(k)).map((k) => ({ key: k, label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));
    return [...AREAS, ...(extra.length ? [{ section: "Other", keys: extra }] : [])]
      .map((s) => ({ section: s.section, areas: s.keys.filter((k) => byPrefix.has(k.key)).map((k) => ({ ...k, perms: byPrefix.get(k.key)! })) }))
      .filter((s) => s.areas.length);
  }, [data.catalogue, q]);

  const toggle = (name: string) => {
    if (readOnly || blocked(name)) return;
    setOn((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
    setError("");
  };
  const toggleArea = (perms: CataloguePermission[]) => {
    if (readOnly) return;
    const can = perms.filter((p) => !blocked(p.name));
    const all = can.every((p) => on.has(p.name));
    setOn((s) => {
      const n = new Set(s);
      can.forEach((p) => (all ? n.delete(p.name) : n.add(p.name)));
      return n;
    });
  };

  const changed = role ? on.size !== original.size || [...on].some((n) => !original.has(n)) : false;
  const total = data.catalogue.length;

  const save = async () => {
    if (!role) return;
    setSaving(true);
    try {
      const ids = data.catalogue.filter((p) => on.has(p.name)).map((p) => p.id);
      onSaved((await setRolePermissions(role.id, ids)).message);
    } catch (e) {
      setError(apiError(e, "Couldn't save the permissions"));
    } finally {
      setSaving(false);
    }
  };

  if (!role) return null;
  const tone = levelInfo(role.level).tone;

  return (
    <Drawer open={open} onClose={() => !saving && onClose()} size="min(680px, 100vw)" destroyOnHidden rootClassName="rl-portal" title={null} closable={false} styles={{ body: { padding: 0 } }}>
      <div className="rl-drawer">
        <div className="rl-drawer-head" style={{ ["--tone" as any]: tone }}>
          <span className="rl-level-badge">{role.admin ? <CrownOutlined /> : role.level}</span>
          <div className="rl-drawer-titles">
            <h3>{roleLabel(role.name)}</h3>
            <p>
              Level {role.level} · {levelInfo(role.level).name} · {role.people} {role.people === 1 ? "person" : "people"}
            </p>
          </div>
          <button type="button" className="tm-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {role.admin ? (
          <div className="rl-note good">
            <CrownOutlined /> The Admin always has every permission of your company's apps — new ones included. Nothing to tick.
          </div>
        ) : readOnly ? (
          <div className="rl-note">
            <LockOutlined /> {role.why_not || "You can look, but not change this role."}
          </div>
        ) : !data.me.admin ? (
          <div className="rl-note">
            <LockOutlined /> You can add only permissions you have yourself; taking any away is fine.
          </div>
        ) : null}

        <div className="rl-drawer-tools">
          <Input allowClear prefix={<SearchOutlined />} placeholder="Find a permission…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a permission" />
          <span className="rl-count">
            <b>{role.admin ? total : on.size}</b> of {total}
          </span>
        </div>

        <div className="rl-groups">
          {groups.map((g) => (
            <div key={g.section} className="rl-group">
              <div className="rl-group-h">{g.section}</div>
              {g.areas.map((a) => {
                const addOn = ADD_ON_OF[a.key];
                const off = addOn && !data.modules.includes(addOn);
                const allOn = a.perms.every((p) => role.admin || on.has(p.name));
                return (
                  <div key={a.key} className="rl-area">
                    <div className="rl-area-h">
                      <b>{a.label}</b>
                      {off && <span className="rl-addon">App not connected</span>}
                      {!readOnly && (
                        <button type="button" className={`rl-all${allOn ? " on" : ""}`} onClick={() => toggleArea(a.perms)}>
                          {allOn ? "None" : "All"}
                        </button>
                      )}
                    </div>
                    <div className="rl-chips">
                      {a.perms.map((p) => {
                        const isOn = role.admin || on.has(p.name);
                        const lock = !role.admin && blocked(p.name);
                        const chip = (
                          <button
                            key={p.id}
                            type="button"
                            className={`rl-chip${isOn ? " on" : ""}${lock ? " lock" : ""}`}
                            aria-pressed={isOn}
                            disabled={readOnly || lock}
                            onClick={() => toggle(p.name)}
                          >
                            {isOn ? <CheckOutlined /> : lock ? <LockOutlined /> : null} {actionLabel(p.name)}
                          </button>
                        );
                        return (
                          <Tooltip key={p.id} title={lock ? "You don't have this yourself" : p.description || p.name}>
                            {chip}
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {!groups.length && <div className="rl-none">No permission matches “{q}”.</div>}
        </div>

        {error && (
          <div className="tm-error" role="alert">
            <ExclamationCircleFilled /> {error}
          </div>
        )}
        <div className="rl-drawer-foot">
          <button type="button" className="tm-btn ghost" onClick={onClose} disabled={saving}>
            {readOnly ? "Close" : "Cancel"}
          </button>
          {!readOnly && (
            <button type="button" className="tm-btn primary" onClick={save} disabled={saving || !changed}>
              {saving ? <Spin size="small" /> : <SaveOutlined />} Save permissions
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default RolePermissionsDrawer;
