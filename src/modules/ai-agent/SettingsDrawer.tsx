import React, { useEffect, useState } from "react";
import { Drawer, InputNumber, Spin, Switch, message as toast } from "antd";
import { CloseOutlined, ReloadOutlined, SaveOutlined, SettingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { type AiSettings, type AiTeamUsage, apiError, getTeamUsage, saveSettings, whenText } from "./aiApi";

const STATUS_WORD: Record<string, string> = {
  PENDING: "Waiting",
  RUNNING: "Running",
  DONE: "Done",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};
const count = (n: number) => n.toLocaleString("en-IN");

/** For people with "Configure AI Assistant": what it may do, the daily limit, and how the team uses it. */
const SettingsDrawer: React.FC<{ open: boolean; onClose: () => void; onSaved: (s: AiSettings) => void }> = ({ open, onClose, onSaved }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<AiTeamUsage | null>(null);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState<AiSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setFailed(false);
    try {
      const d = await getTeamUsage();
      setData(d);
      setForm(d.settings);
    } catch (e) {
      setFailed(true);
      toast.error(apiError(e, "Couldn't load the assistant settings"));
    }
  };
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dirty = !!form && !!data && (form.allow_changes !== data.settings.allow_changes || form.daily_limit !== data.settings.daily_limit);
  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const s = await saveSettings(form);
      setData((d) => (d ? { ...d, settings: s } : d));
      setForm(s);
      onSaved(s);
      toast.success("Assistant settings saved");
    } catch (e) {
      toast.error(apiError(e, "Couldn't save the settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} size="min(560px, 100vw)" closable={false} title={null} rootClassName="ai-portal" className="ai-drawer" destroyOnHidden>
      <div className="ai-set">
        <header className="ai-set-head">
          <span className="ai-set-icon">
            <SettingOutlined />
          </span>
          <div>
            <h2>AI Assistant settings</h2>
            <p>For your whole company. Everyone still only gets what their own role allows.</p>
          </div>
          <button type="button" className="ai-icon-btn" aria-label="Close" onClick={onClose}>
            <CloseOutlined />
          </button>
        </header>

        {!data || !form ? (
          <div className="ai-set-loading">
            {failed ? (
              <button type="button" className="ai-btn ghost" onClick={load}>
                <ReloadOutlined /> Try again
              </button>
            ) : (
              <Spin />
            )}
          </div>
        ) : (
          <>
            <section className="ai-set-card">
              <div className="ai-set-row">
                <div>
                  <b>Let the assistant make changes</b>
                  <span>Add customers, make quotations, record payments, move stock… Risky actions still wait for the person's Confirm. Turn off to allow look-ups only.</span>
                </div>
                <Switch checked={form.allow_changes} onChange={(v) => setForm({ ...form, allow_changes: v })} aria-label="Let the assistant make changes" />
              </div>
              <div className="ai-set-row">
                <div>
                  <b>Messages per person per day</b>
                  <span>Keeps AI use (and its cost) in check. Starts again at midnight.</span>
                </div>
                <InputNumber min={1} max={2000} precision={0} value={form.daily_limit} onChange={(v) => setForm({ ...form, daily_limit: Number(v) || 1 })} aria-label="Messages per person per day" />
              </div>
              <div className="ai-set-actions">
                <span className="ai-set-hint">
                  Who can use it: give <b>Use AI Assistant</b> to a role on the{" "}
                  <button type="button" className="ai-link-btn" onClick={() => navigate("/app/roles")}>
                    Roles page
                  </button>
                  .
                </span>
                <button type="button" className="ai-btn primary" disabled={!dirty || saving} onClick={save}>
                  <SaveOutlined /> {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </section>

            <section className="ai-set-block">
              <h3>This month</h3>
              <div className="ai-set-tiles">
                <div>
                  <b>{count(data.usage.totals.messages)}</b>
                  <span>Messages</span>
                </div>
                <div>
                  <b>{count(data.usage.totals.actions)}</b>
                  <span>Changes made</span>
                </div>
                <div>
                  <b>{count(data.usage.totals.people)}</b>
                  <span>People</span>
                </div>
                <div>
                  <b>{data.usage.totals.tokens >= 1000 ? `${Math.round(data.usage.totals.tokens / 1000).toLocaleString("en-IN")}k` : count(data.usage.totals.tokens)}</b>
                  <span>AI tokens</span>
                </div>
              </div>
              {data.usage.people.length ? (
                <div className="ai-set-table" role="table" aria-label="Use per person this month">
                  <div className="ai-set-tr head" role="row">
                    <span role="columnheader">Person</span>
                    <span role="columnheader">Messages</span>
                    <span role="columnheader">Changes</span>
                    <span role="columnheader">Last used</span>
                  </div>
                  {data.usage.people.map((p) => (
                    <div className="ai-set-tr" role="row" key={p.user_id}>
                      <span role="cell" className="name">
                        {p.name}
                      </span>
                      <span role="cell">{count(p.messages)}</span>
                      <span role="cell">{count(p.actions)}</span>
                      <span role="cell" className="muted">
                        {whenText(p.last_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ai-set-empty">Nobody has used the assistant this month yet.</p>
              )}
            </section>

            <section className="ai-set-block">
              <h3>Latest changes by the assistant</h3>
              {data.recent_actions.length ? (
                <ul className="ai-set-log">
                  {data.recent_actions.map((a) => (
                    <li key={a.id}>
                      <span className={`ai-pill s-${a.status.toLowerCase()}`}>{STATUS_WORD[a.status] || a.status}</span>
                      <div>
                        <b>{a.summary}</b>
                        <em>
                          {a.by || "Someone"} · {whenText(a.created_at)}
                          {a.result && a.status !== "DONE" ? ` · ${a.result}` : ""}
                        </em>
                      </div>
                      {a.record && a.status === "DONE" && (
                        <button type="button" className="ai-link-btn" onClick={() => navigate(a.record!.link)}>
                          Open
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ai-set-empty">No changes yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </Drawer>
  );
};

export default SettingsDrawer;
