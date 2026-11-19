import React, { useEffect, useMemo, useState } from "react";
import { Drawer, Input, Spin } from "antd";
import { ExclamationCircleFilled, PlusOutlined, ReloadOutlined, ShopOutlined } from "@ant-design/icons";
import { apiError } from "@/modules/team/teamApi";
import { createCompany } from "./platformApi";

const pw = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (x, i) => (i === 4 || i === 8 ? "-" : "") + chars[x % chars.length]).join("");
};

/** "Ek Plate Parcels" → EPP (the server picks a free one if it's taken). */
const suggestPrefix = (name: string) => {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] || "").slice(0, 4)).slice(0, 6);
};

/** A new company on SameBook with its first Admin (default roles are made for it). */
const NewCompanyDrawer: React.FC<{ open: boolean; onClose: () => void; onCreated: (id: number, msg: string) => void }> = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [a, setA] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setPrefix("");
    setA({ first_name: "", last_name: "", email: "", phone: "", password: pw() });
    setError("");
  }, [open]);

  const suggestion = useMemo(() => suggestPrefix(name), [name]);

  const save = async () => {
    if (name.trim().length < 2) return setError("Enter the business name");
    if (!a.first_name.trim()) return setError("Enter the Admin's first name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())) return setError("Enter a valid email for the Admin");
    if (a.password.length < 8) return setError("The password needs at least 8 characters");
    setSaving(true);
    setError("");
    try {
      const r = await createCompany({ company_name: name.trim(), prefix: prefix.trim() || undefined, admin: { ...a, email: a.email.trim() } });
      onCreated(r.company.id, `${r.message}. Their password: ${a.password}`);
    } catch (e) {
      setError(apiError(e, "Couldn't add the company"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={() => !saving && onClose()} size="min(520px, 100vw)" destroyOnHidden rootClassName="tm-portal pf-portal" title={null} closable={false} styles={{ body: { padding: 0 } }}>
      <div className="tm-drawer">
        <div className="tm-drawer-head pf-head">
          <span className="tm-avatar lg company">
            <ShopOutlined />
          </span>
          <div className="tm-drawer-titles">
            <h3>Add a company</h3>
            <p>It gets its own roles; the person below becomes its Admin.</p>
          </div>
          <button type="button" className="tm-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <fieldset className="tm-form" disabled={saving}>
          <div className="tm-sec">Company</div>
          <label>
            <span>Business name *</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} placeholder="e.g. Shree Ganesh Traders" autoFocus />
          </label>
          <label>
            <span>Prefix for document numbers</span>
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} placeholder={suggestion ? `${suggestion} (suggested)` : "e.g. SGT"} className="tm-mono" />
            <em className="tm-hint">Leave empty to use {suggestion || "a suggested one"} — a free one is picked if it's taken.</em>
          </label>
          <div className="tm-sec">Its Admin</div>
          <div className="tm-row2">
            <label>
              <span>First name *</span>
              <Input value={a.first_name} onChange={(e) => setA({ ...a, first_name: e.target.value })} maxLength={100} />
            </label>
            <label>
              <span>Last name</span>
              <Input value={a.last_name} onChange={(e) => setA({ ...a, last_name: e.target.value })} maxLength={100} />
            </label>
          </div>
          <div className="tm-row2">
            <label>
              <span>Email (to sign in) *</span>
              <Input value={a.email} onChange={(e) => setA({ ...a, email: e.target.value })} maxLength={255} inputMode="email" autoComplete="off" />
            </label>
            <label>
              <span>Phone</span>
              <Input value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value })} maxLength={30} inputMode="tel" />
            </label>
          </div>
          <label>
            <span>Password *</span>
            <div className="tm-pass">
              <Input value={a.password} onChange={(e) => setA({ ...a, password: e.target.value })} maxLength={100} className="tm-mono" />
              <button type="button" className="tm-tool" onClick={() => setA({ ...a, password: pw() })}>
                <ReloadOutlined /> New
              </button>
            </div>
            <em className="tm-hint">Share it with them; they can change it from their profile.</em>
          </label>
        </fieldset>
        {error && (
          <div className="tm-error" role="alert">
            <ExclamationCircleFilled /> {error}
          </div>
        )}
        <div className="tm-drawer-foot">
          <button type="button" className="tm-btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="tm-btn primary" onClick={save} disabled={saving}>
            {saving ? <Spin size="small" /> : <PlusOutlined />} Add company
          </button>
        </div>
      </div>
    </Drawer>
  );
};

export default NewCompanyDrawer;
