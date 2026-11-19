import React, { useEffect, useMemo, useState } from "react";
import { AutoComplete, Drawer, Input, Select, Spin, Tooltip } from "antd";
import {
  CheckCircleFilled,
  CopyOutlined,
  ExclamationCircleFilled,
  LockOutlined,
  ReloadOutlined,
  SaveOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { message } from "antd";
import { levelInfo, roleLabel, initialsOf } from "@/permissions/standing";
import { type PersonInput, type TeamData, type TeamPerson, apiError, below, createPerson, updatePerson } from "./teamApi";

const TITLES = ["Owner", "Director", "General Manager", "Sales Manager", "Sales Executive", "Accountant", "Store Keeper", "Delivery Executive", "Office Assistant", "Technician"];
const DEPARTMENTS = ["Sales", "Accounts", "Operations", "Stores", "Service", "Admin"];

const strongPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const pick = (n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => chars[x % chars.length]).join("");
  return `${pick(4)}-${pick(4)}-${pick(4)}`;
};

const suggest = (values: (string | null)[], extra: string[]) =>
  [...new Set([...values.filter(Boolean).map((v) => String(v).trim()), ...extra])].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v }));

type Form = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  designation: string;
  department: string;
  reports_to: number | null;
  role_ids: number[];
};

const empty = (data: TeamData): Form => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  designation: "",
  department: "",
  // Someone added by a manager joins their team; an Admin picks.
  reports_to: data.me.admin ? null : data.me.id,
  role_ids: [],
});

const fromPerson = (p: TeamPerson): Form => ({
  first_name: p.first_name || "",
  last_name: p.last_name || "",
  email: p.email || "",
  phone: p.phone || "",
  password: "",
  designation: p.designation || "",
  department: p.department || "",
  reports_to: p.reports_to,
  role_ids: p.roles.filter((r) => (r.scope || "COMPANY") !== "PLATFORM").map((r) => r.id),
});

/** Add someone, or edit a person: details, job, who they report to and their roles. */
const PersonDrawer: React.FC<{
  open: boolean;
  person: TeamPerson | null;
  data: TeamData;
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ open, person, data, onClose, onSaved }) => {
  const adding = !person;
  const readOnly = !!person && !person.can_manage;
  const [f, setF] = useState<Form>(() => (person ? fromPerson(person) : empty(data)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [shownPassword, setShownPassword] = useState("");

  useEffect(() => {
    if (!open) return;
    setF(person ? fromPerson(person) : empty(data));
    setError("");
    setShownPassword("");
  }, [open, person?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map(data.people.map((p) => [p.id, p])), [data.people]);

  // Managers you may pick: yourself / your team (Admins: anyone), never the
  // person themselves or someone in their own team (that would be a loop).
  const managerOptions = useMemo(() => {
    const blocked = person ? new Set([person.id, ...below(person.id, data.people)]) : new Set<number>();
    const ids = data.me.manager_choices.filter((id) => !blocked.has(id));
    const opts = ids
      .map((id) => byId.get(id))
      .filter((p): p is TeamPerson => !!p && p.is_active)
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
      .map((p) => ({
        value: p.id,
        label: (
          <span className="tm-opt">
            <b>{p.name}</b>
            <em>{[p.designation, roleLabel(p.roles.find((r) => r.scope !== "PLATFORM")?.name)].filter(Boolean).join(" · ")}</em>
          </span>
        ),
        search: `${p.name} ${p.designation || ""}`.toLowerCase(),
      }));
    return data.me.admin ? [{ value: 0, label: <span className="tm-opt"><b>No one</b><em>Top of the company</em></span>, search: "no one top" }, ...opts] : opts;
  }, [data, person, byId]);

  const roleGroups = useMemo(() => {
    const groups = new Map<number, typeof data.me.assignable_roles>();
    data.me.assignable_roles.forEach((r) => groups.set(r.level, [...(groups.get(r.level) || []), r]));
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [data.me.assignable_roles]);

  // A person may also hold roles the viewer can't give (shown, locked).
  const lockedRoles = useMemo(
    () => (person ? person.roles.filter((r) => r.scope !== "PLATFORM" && !data.me.assignable_roles.some((a) => a.id === r.id)) : []),
    [person, data.me.assignable_roles],
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setError("");
  };
  const toggleRole = (id: number) => set("role_ids", f.role_ids.includes(id) ? f.role_ids.filter((x) => x !== id) : [...f.role_ids, id]);

  const problem = (): string | null => {
    if (!f.first_name.trim()) return "Enter a first name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return "Enter a valid email address";
    if (adding && f.password.length < 8) return "The password needs at least 8 characters (or press Generate)";
    if (!adding && f.password && f.password.length < 8) return "A new password needs at least 8 characters";
    if (!f.role_ids.length) return "Give them at least one role";
    if (!data.me.admin && f.reports_to == null) return "Pick who they report to";
    return null;
  };

  const save = async () => {
    const p = problem();
    if (p) {
      setError(p);
      return;
    }
    setSaving(true);
    try {
      const body: PersonInput = {
        first_name: f.first_name.trim(),
        last_name: f.last_name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        designation: f.designation.trim(),
        department: f.department.trim(),
        reports_to: f.reports_to,
        role_ids: f.role_ids,
        ...(f.password ? { password: f.password } : {}),
      };
      const r = adding ? await createPerson(body) : await updatePerson(person!.id, body);
      onSaved(
        adding && shownPassword
          ? `${r.message}. Share their password: ${shownPassword}`
          : r.message,
      );
    } catch (e) {
      setError(apiError(e, "Couldn't save — please try again"));
    } finally {
      setSaving(false);
    }
  };

  const title = adding ? "Add a person" : readOnly ? person!.name : `Edit ${person!.first_name || person!.name}`;

  return (
    <Drawer
      open={open}
      onClose={() => !saving && onClose()}
      size="min(520px, 100vw)"
      destroyOnHidden
      rootClassName="tm-portal"
      title={null}
      closable={false}
      styles={{ body: { padding: 0 } }}
    >
      <div className="tm-drawer">
        <div className="tm-drawer-head">
          <span className="tm-avatar lg" style={{ ["--tone" as any]: levelInfo(person?.rank ?? 4).tone }}>
            {adding ? <UserAddOutlined /> : initialsOf(person!.name)}
          </span>
          <div className="tm-drawer-titles">
            <h3>{title}</h3>
            <p>
              {adding
                ? data.me.admin
                  ? "They'll sign in with this email and password."
                  : "They'll join your team."
                : [person!.designation, person!.department].filter(Boolean).join(" · ") || person!.email}
            </p>
          </div>
          <button type="button" className="tm-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {readOnly && (
          <div className="tm-banner">
            <LockOutlined /> {person!.why_not}
          </div>
        )}

        <fieldset className="tm-form" disabled={readOnly || saving}>
          <div className="tm-sec">Person</div>
          <div className="tm-row2">
            <label>
              <span>First name *</span>
              <Input value={f.first_name} onChange={(e) => set("first_name", e.target.value)} maxLength={100} autoFocus={adding} prefix={<UserOutlined />} />
            </label>
            <label>
              <span>Last name</span>
              <Input value={f.last_name} onChange={(e) => set("last_name", e.target.value)} maxLength={100} />
            </label>
          </div>
          <div className="tm-row2">
            <label>
              <span>Email (to sign in) *</span>
              <Input value={f.email} onChange={(e) => set("email", e.target.value)} maxLength={255} inputMode="email" autoComplete="off" />
            </label>
            <label>
              <span>Phone</span>
              <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} maxLength={30} inputMode="tel" />
            </label>
          </div>
          <label>
            <span>{adding ? "Password *" : "New password (leave empty to keep the current one)"}</span>
            <div className="tm-pass">
              <Input.Password value={f.password} onChange={(e) => set("password", e.target.value)} maxLength={100} autoComplete="new-password" />
              <Tooltip title="Make a strong password">
                <button
                  type="button"
                  className="tm-tool"
                  onClick={() => {
                    const p = strongPassword();
                    set("password", p);
                    setShownPassword(p);
                  }}
                >
                  <ReloadOutlined /> Generate
                </button>
              </Tooltip>
            </div>
            {shownPassword && f.password === shownPassword && (
              <em className="tm-hint">
                Password: <b className="tm-mono">{shownPassword}</b>{" "}
                <button
                  type="button"
                  className="tm-linkbtn"
                  onClick={() => {
                    navigator.clipboard?.writeText(shownPassword);
                    message.success("Password copied");
                  }}
                >
                  <CopyOutlined /> Copy
                </button>{" "}
                — share it with them; they can change it from their profile.
              </em>
            )}
          </label>

          <div className="tm-sec">Job</div>
          <div className="tm-row2">
            <label>
              <span>Job title</span>
              <AutoComplete
                value={f.designation}
                options={suggest(data.people.map((p) => p.designation), TITLES)}
                onChange={(v) => set("designation", v)}
                filterOption={(input, o) => String(o?.value || "").toLowerCase().includes(input.toLowerCase())}
                placeholder="e.g. Sales Executive"
              />
            </label>
            <label>
              <span>Department</span>
              <AutoComplete
                value={f.department}
                options={suggest(data.people.map((p) => p.department), DEPARTMENTS)}
                onChange={(v) => set("department", v)}
                filterOption={(input, o) => String(o?.value || "").toLowerCase().includes(input.toLowerCase())}
                placeholder="e.g. Sales"
              />
            </label>
          </div>
          <label>
            <span>Reports to {data.me.admin ? "" : "*"}</span>
            <Select
              value={f.reports_to ?? (data.me.admin ? 0 : undefined)}
              onChange={(v) => set("reports_to", v === 0 ? null : Number(v))}
              options={managerOptions}
              showSearch
              filterOption={(input, o: any) => String(o?.search || "").includes(input.toLowerCase())}
              placeholder="Pick their manager"
            />
            {!data.me.admin && <em className="tm-hint">You can pick yourself or someone in your team.</em>}
          </label>

          <div className="tm-sec">
            Roles <em>what they can do</em>
          </div>
          {lockedRoles.length > 0 && (
            <div className="tm-locked">
              {lockedRoles.map((r) => (
                <span key={r.id} className="tm-chip" style={{ ["--tone" as any]: levelInfo(r.level).tone }}>
                  <i /> {roleLabel(r.name)} <LockOutlined />
                </span>
              ))}
              <em>Only someone above this level can change these.</em>
            </div>
          )}
          <div className="tm-roles">
            {roleGroups.map(([level, roles]) => (
              <div key={level} className="tm-rolegroup">
                <div className="tm-rolegroup-h" style={{ ["--tone" as any]: levelInfo(level).tone }}>
                  <i /> Level {level} · {levelInfo(level).name}
                </div>
                {roles.map((r) => {
                  const on = f.role_ids.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`tm-rolecard${on ? " on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggleRole(r.id)}
                      style={{ ["--tone" as any]: levelInfo(r.level).tone }}
                    >
                      <span className="tm-check">{on ? <CheckCircleFilled /> : <span />}</span>
                      <span className="tm-rolecard-text">
                        <b>{roleLabel(r.name)}</b>
                        <em>{r.level === 1 ? "Everything in the company, always" : r.description || levelInfo(r.level).hint}</em>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {!roleGroups.length && <em className="tm-hint">You can't give any roles.</em>}
          </div>
        </fieldset>

        {error && (
          <div className="tm-error" role="alert">
            <ExclamationCircleFilled /> {error}
          </div>
        )}

        <div className="tm-drawer-foot">
          <button type="button" className="tm-btn ghost" onClick={onClose} disabled={saving}>
            {readOnly ? "Close" : "Cancel"}
          </button>
          {!readOnly && (
            <button type="button" className="tm-btn primary" onClick={save} disabled={saving}>
              {saving ? <Spin size="small" /> : <SaveOutlined />} {adding ? "Add person" : "Save"}
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default PersonDrawer;
