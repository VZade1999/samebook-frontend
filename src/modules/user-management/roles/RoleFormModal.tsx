import React, { useEffect, useState } from "react";
import { Input, Modal, Select, Spin } from "antd";
import { ExclamationCircleFilled, SafetyCertificateOutlined, SaveOutlined } from "@ant-design/icons";
import { LEVELS, roleLabel } from "@/permissions/standing";
import { apiError } from "@/modules/team/teamApi";
import { type RoleView, type RolesOverview, createRole, updateRole } from "./rolesApi";

/** New role (optionally starting from another role's permissions), or rename / re-level one. */
const RoleFormModal: React.FC<{
  open: boolean;
  role: RoleView | null;
  copyFrom?: RoleView | null;
  data: RolesOverview;
  onClose: () => void;
  onSaved: (msg: string, newId?: number) => void;
}> = ({ open, role, copyFrom, data, onClose, onSaved }) => {
  const creating = !role;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState(4);
  const [from, setFrom] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(role ? role.name : copyFrom ? `${roleLabel(copyFrom.name)} (copy)` : "");
    setDescription(role?.description || copyFrom?.description || "");
    setLevel(role?.level ?? (copyFrom && !copyFrom.admin ? copyFrom.level : Math.max(4, Math.min(5, data.me.admin ? 4 : data.me.rank + 1))));
    setFrom(copyFrom ? copyFrom.id : null);
    setError("");
  }, [open, role?.id, copyFrom?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Levels you may use: 2–5 for an Admin; only below your own otherwise.
  const levels = [2, 3, 4, 5].filter((l) => data.me.admin || l > data.me.rank);
  const lockedAdmin = !!role?.admin;

  const save = async () => {
    const n = name.trim();
    if (!lockedAdmin && !n) {
      setError("Enter a role name");
      return;
    }
    setSaving(true);
    try {
      if (creating) {
        const r = await createRole({ name: n, description: description.trim(), level, copy_from: from });
        onSaved(r.message, r.id);
      } else {
        const r = await updateRole(role!.id, lockedAdmin ? { description: description.trim() } : { name: n, description: description.trim(), level });
        onSaved(r.message);
      }
    } catch (e) {
      setError(apiError(e, "Couldn't save the role"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onCancel={() => !saving && onClose()} title={null} footer={null} width={520} centered destroyOnHidden rootClassName="rl-portal">
      <div className="rl-form">
        <div className="rl-form-head">
          <span className="rl-form-icon">
            <SafetyCertificateOutlined />
          </span>
          <div>
            <h3>{creating ? (copyFrom ? `Duplicate ${roleLabel(copyFrom.name)}` : "New role") : `Edit ${roleLabel(role!.name)}`}</h3>
            <p>{lockedAdmin ? "The Admin role is locked — only its description can change." : "A role is a set of permissions at a level. People get one or more roles."}</p>
          </div>
        </div>
        <label>
          <span>Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} disabled={lockedAdmin} placeholder="e.g. Store Manager" autoFocus={creating} />
        </label>
        <label>
          <span>What it's for</span>
          <Input.TextArea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} autoSize={{ minRows: 2, maxRows: 4 }} placeholder="e.g. Runs the store: stock, challans and dispatch" />
        </label>
        {!lockedAdmin && (
          <label>
            <span>Level</span>
            <Select
              value={level}
              onChange={setLevel}
              options={levels.map((l) => ({ value: l, label: `Level ${l} · ${LEVELS[l].name} — ${LEVELS[l].hint}` }))}
            />
            <em className="rl-help">People can manage only those at lower levels (a higher number). Level 1 is the Admin's.</em>
          </label>
        )}
        {creating && (
          <label>
            <span>Start with the permissions of</span>
            <Select
              value={from ?? 0}
              onChange={(v) => setFrom(v ? Number(v) : null)}
              options={[{ value: 0, label: "Nothing — I'll pick them" }, ...data.roles.map((r) => ({ value: r.id, label: `${roleLabel(r.name)} (${r.permission_count} permissions)` }))]}
            />
            {!data.me.admin && <em className="rl-help">Only permissions you have yourself are copied.</em>}
          </label>
        )}
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
            {saving ? <Spin size="small" /> : <SaveOutlined />} {creating ? "Create role" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RoleFormModal;
