import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown, Modal, Spin, Tooltip, message } from "antd";
import {
  ApiOutlined,
  CheckCircleFilled,
  CloudSyncOutlined,
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
  ExperimentOutlined,
  FileExcelOutlined,
  GlobalOutlined,
  KeyOutlined,
  LinkOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  ShopOutlined,
  ThunderboltFilled,
  UserAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { crmService, intakeUrl } from "../services/crmService";
import { CrmMeta, ago, emitCrmChanged, errText, sourceLabel } from "../constants";
import { refreshCrmMeta, useCrmMeta } from "../hooks";
import CrmShell from "../components/CrmShell";
import SourceModal, { LeadSource } from "../components/SourceModal";
import ImportModal from "../components/ImportModal";
import { EmptyState } from "../components/Bits";

const copy = async (text: string, what = "Link") => {
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${what} copied`);
  } catch {
    message.error("Couldn't copy — select it and copy by hand");
  }
};

const UrlBox: React.FC<{ url: string }> = ({ url }) => (
  <div className="crm-url">
    <LinkOutlined />
    <code title={url}>{url}</code>
    <button className="crm-btn sm ghost" onClick={() => copy(url)}>
      <CopyOutlined /> Copy
    </button>
  </div>
);

const assignText = (s: LeadSource, meta: CrmMeta | null) => {
  const name = (id: number) => meta?.users.find((u) => u.id === id)?.name || "someone";
  if (s.settings.assign_mode === "USER" && s.settings.assign_user_ids[0]) return `Go to ${name(s.settings.assign_user_ids[0])}`;
  if (s.settings.assign_mode === "ROUND_ROBIN") return `Shared in turns: ${s.settings.assign_user_ids.map(name).join(", ")}`;
  return "Arrive unassigned — anyone in sales can take them";
};

const status = (s: LeadSource) => {
  if (!s.is_active) return { tone: "paused", label: "Paused" };
  if (s.needs_reconnect) return { tone: "err", label: "Reconnect needed" };
  if (s.type === "INDIAMART" && s.sync?.status === "ERROR") return { tone: "err", label: "Needs attention" };
  return { tone: "ok", label: "Live" };
};

const htmlSnippet = (url: string) => `<form action="${url}" method="POST">
  <input name="name" placeholder="Your name" required>
  <input name="phone" placeholder="Mobile number" required>
  <input name="email" type="email" placeholder="Email">
  <textarea name="message" placeholder="What do you need?"></textarea>
  <!-- spam trap: keep it hidden and empty -->
  <input name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">
  <button type="submit">Send enquiry</button>
</form>`;

const jsSnippet = (url: string) => `await fetch("${url}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Rahul Sharma",
    phone: "9876543210",
    email: "rahul@example.com",
    company: "Sharma Traders",
    requirement: "MS pipes, 2 inch",
    message: "Need 500 kg, delivery in Pune",
  }),
});`;

const SourceCard: React.FC<{
  s: LeadSource;
  meta: CrmMeta | null;
  onEdit: (focusKey?: boolean) => void;
  onChanged: () => void;
}> = ({ s, meta, onEdit, onChanged }) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"html" | "js" | "apps" | "test">("html");
  const [now, setNow] = useState(Date.now());
  const st = status(s);
  const url = s.intake_token ? intakeUrl(s.intake_token) : null;
  const nextAt = s.sync?.next_allowed_at ? new Date(s.sync.next_allowed_at).getTime() : 0;
  const wait = Math.max(0, nextAt - now);

  useEffect(() => {
    if (!wait) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [wait]);

  const run = async (key: string, fn: () => Promise<any>, ok?: (r: any) => string | null) => {
    setBusy(key);
    try {
      const r = await fn();
      const text = ok?.(r);
      if (text) message.success(text);
      onChanged();
    } catch (err) {
      message.error(errText(err, "Something went wrong"));
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const sync = () =>
    run("sync", () => crmService.syncSource(s.id), (r) => {
      const rep = r.data?.data?.report;
      if (rep && (rep.created || rep.merged)) emitCrmChanged();
      return rep?.message || "Fetched";
    });

  const toggle = () =>
    run("toggle", () => crmService.updateSource(s.id, { is_active: !s.is_active }), () => (s.is_active ? "Paused" : "Turned on"));

  const regenerate = () =>
    Modal.confirm({
      title: "Create a new link?",
      content: "The current link stops working right away. Paste the new link everywhere the old one was used (IndiaMART, your website, Zapier…).",
      okText: "Create new link",
      onOk: () => run("regen", () => crmService.regenerateSource(s.id), () => "New link created"),
    });

  const remove = () =>
    Modal.confirm({
      title: `Remove ${s.name}?`,
      icon: <ExclamationCircleFilled />,
      content: "New leads will stop coming in from it. Leads it already brought in are kept.",
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: () => run("remove", () => crmService.removeSource(s.id), () => `${s.name} removed`),
    });

  const sendTest = async () => {
    if (!url) return;
    setBusy("test");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: "Test lead",
          email: `test+${Date.now().toString(36)}@example.com`,
          requirement: "Test enquiry from Lead sources",
          message: "Sent with the “Send a test lead” button. You can delete this lead.",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
      emitCrmChanged();
      Modal.success({
        title: "Test lead received",
        content: `${body?.data?.lead || "The lead"} is in your CRM, tagged ${sourceLabel(s.settings.lead_source)}.`,
        okText: "Open leads",
        onOk: () => navigate("/app/crm/leads?scope=all"),
      });
      onChanged();
    } catch (e: any) {
      message.error(`Test failed: ${e?.message || "no response"}`);
    } finally {
      setBusy(null);
    }
  };

  const menu = {
    items: [
      { key: "edit", icon: <SettingOutlined />, label: "Settings", onClick: () => onEdit() },
      { key: "toggle", icon: s.is_active ? <PauseCircleOutlined /> : <PlayCircleOutlined />, label: s.is_active ? "Pause" : "Turn on", onClick: toggle },
      { key: "regen", icon: <ReloadOutlined />, label: "New secret link", onClick: regenerate },
      { type: "divider" as const },
      { key: "remove", icon: <DeleteOutlined />, label: "Remove", danger: true, onClick: remove },
    ],
  };

  const im = s.type === "INDIAMART";
  return (
    <article className={`crm-scard ${im ? "im" : "wh"}${s.is_active ? "" : " paused"}`}>
      <header className="crm-scard-head">
        <span className="crm-scard-icon">{im ? <ShopOutlined /> : <GlobalOutlined />}</span>
        <div className="crm-scard-title">
          <b>{s.name}</b>
          <small>{im ? "IndiaMART Lead Manager" : `Tags leads as ${sourceLabel(s.settings.lead_source)}`}</small>
        </div>
        <span className={`crm-status ${st.tone}`}>
          <i /> {st.label}
        </span>
        <Dropdown trigger={["click"]} menu={menu}>
          <button className="crm-icon-btn" aria-label="Source actions">
            {busy && busy !== "sync" && busy !== "test" ? <Spin size="small" /> : <MoreOutlined />}
          </button>
        </Dropdown>
      </header>

      <div className="crm-scard-stats">
        <div>
          <b>{s.leads_total}</b>
          <small>leads brought in</small>
        </div>
        <div>
          <b>{s.last_lead_at ? ago(s.last_lead_at) : "—"}</b>
          <small>last lead</small>
        </div>
        <div className="wide">
          <small>New leads</small>
          <span>{assignText(s, meta)}</span>
        </div>
      </div>

      {s.needs_reconnect && (
        <div className="crm-banner bad">
          <ExclamationCircleFilled /> The saved key and link can't be read any more. Create a new link{im ? " and paste the IndiaMART key again" : ""}.
        </div>
      )}

      {im ? (
        <>
          <section className="crm-scard-part">
            <h5>
              <ThunderboltFilled /> Instant — Push API <span className="crm-tag">Recommended</span>
            </h5>
            <p>Leads arrive within seconds. In IndiaMART open <b>Lead Manager → ⋮ → Import/Export Leads → Push API</b>, choose <b>Other</b>, paste this link and confirm the OTP.</p>
            {url && <UrlBox url={url} />}
          </section>
          <section className="crm-scard-part">
            <h5>
              <CloudSyncOutlined /> Every few minutes — Pull API
            </h5>
            {s.has_api_key ? (
              <>
                <div className="crm-sync-line">
                  <span className={`crm-sync-dot ${s.sync?.status === "ERROR" ? "err" : s.sync?.status === "RATE_LIMITED" ? "warn" : "ok"}`} />
                  <span>
                    {s.sync?.last_at ? (
                      <>
                        Last fetched <b>{ago(s.sync.last_at)}</b> — {s.sync.message || s.sync.status}
                      </>
                    ) : (
                      "Not fetched yet"
                    )}
                  </span>
                </div>
                <div className="crm-scard-actions">
                  <Tooltip title={wait ? `IndiaMART allows one fetch every 5 minutes — ready ${dayjs(nextAt).fromNow()}` : "Fetch new enquiries now"}>
                    <button className="crm-btn sm primary" disabled={!!wait || busy === "sync" || !s.is_active} onClick={sync}>
                      {busy === "sync" ? <Spin size="small" /> : <CloudSyncOutlined />} Fetch now
                    </button>
                  </Tooltip>
                  <button className="crm-btn sm ghost" onClick={() => onEdit(true)}>
                    <KeyOutlined /> Key {s.api_key_hint}
                  </button>
                </div>
                <p className="crm-hint">
                  Fetched automatically when someone opens the CRM (and on the schedule, if set up). IndiaMART expires a key that isn't used for 7 days.
                </p>
              </>
            ) : (
              <>
                <p>Also fetch enquiries you got before connecting, and as a backup to Push. Generate a key in <b>Lead Manager → ⋮ → Import/Export Leads → Pull API</b>.</p>
                <button className="crm-btn sm ghost" onClick={() => onEdit(true)}>
                  <KeyOutlined /> Add CRM key
                </button>
              </>
            )}
          </section>
        </>
      ) : (
        <section className="crm-scard-part">
          <h5>
            <LinkOutlined /> Your secret link
          </h5>
          {url && <UrlBox url={url} />}
          <div className="crm-mini-tabs" role="tablist">
            {[
              { k: "html", label: "Website form", icon: <CodeOutlined /> },
              { k: "js", label: "JavaScript", icon: <CodeOutlined /> },
              { k: "apps", label: "Facebook, Google, Zapier", icon: <ApiOutlined /> },
              { k: "test", label: "Test", icon: <ExperimentOutlined /> },
            ].map((t) => (
              <button key={t.k} role="tab" aria-selected={tab === t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k as any)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {url && tab === "html" && (
            <div className="crm-snippet">
              <pre className="crm-code">{htmlSnippet(url)}</pre>
              <button className="crm-btn sm ghost" onClick={() => copy(htmlSnippet(url), "Form code")}>
                <CopyOutlined /> Copy code
              </button>
              <p className="crm-hint">Field names like name, phone, mobile, email, company, city, message are understood automatically. Anything else is kept in the lead's details.</p>
            </div>
          )}
          {url && tab === "js" && (
            <div className="crm-snippet">
              <pre className="crm-code">{jsSnippet(url)}</pre>
              <button className="crm-btn sm ghost" onClick={() => copy(jsSnippet(url), "Code")}>
                <CopyOutlined /> Copy code
              </button>
            </div>
          )}
          {tab === "apps" && (
            <ul className="crm-steps">
              <li>
                <b>Facebook / Instagram Lead Ads:</b> in Zapier or Make, trigger on “New lead” and add a <i>Webhook → POST</i> step to this link. Send full_name, phone_number and email.
              </li>
              <li>
                <b>Google Ads lead forms:</b> in the lead form, add a <i>Webhook integration</i> and paste this link — Google's format is understood directly.
              </li>
              <li>
                <b>Any other app</b> that can send a webhook (WordPress plugins, JustDial or TradeIndia lead forwarding, landing-page builders): POST JSON or form fields to this link.
              </li>
              <li>Create a separate link per channel (e.g. “Facebook ads”) so Insights shows which one brings orders.</li>
            </ul>
          )}
          {tab === "test" && (
            <div className="crm-snippet">
              <p>Send a sample enquiry to this link and check that it shows up in Leads.</p>
              <button className="crm-btn sm primary" onClick={sendTest} disabled={busy === "test" || !s.is_active}>
                {busy === "test" ? <Spin size="small" /> : <ExperimentOutlined />} Send a test lead
              </button>
            </div>
          )}
        </section>
      )}
    </article>
  );
};

const SourcesPage: React.FC = () => {
  const meta = useCrmMeta();
  const [sources, setSources] = useState<LeadSource[] | null>(null);
  const [modal, setModal] = useState<{ type?: "INDIAMART" | "WEBHOOK"; source?: LeadSource; focusKey?: boolean } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const r = await crmService.sources();
      setSources(r.data.data as LeadSource[]);
    } catch (err) {
      message.error(errText(err, "Couldn't load lead sources"));
      setSources([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasIndiaMart = useMemo(() => !!sources?.some((s) => s.type === "INDIAMART"), [sources]);

  const onSaved = (s: LeadSource, sync?: any) => {
    setModal(null);
    refreshCrmMeta();
    load();
    if (sync) {
      if (sync.status === "OK" || sync.status === "NO_DATA") {
        if (sync.created || sync.merged) emitCrmChanged();
        Modal.success({ title: `${s.name} connected`, content: `First fetch from IndiaMART: ${sync.message}.` });
      } else if (sync.status !== "SKIPPED") {
        Modal.warning({ title: `${s.name} saved, but the first fetch failed`, content: sync.message });
      }
    } else message.success(`${s.name} saved`);
  };

  return (
    <CrmShell
      title="Lead sources"
      subtitle="Enquiries from IndiaMART, your website and ad forms arrive here by themselves — no copy-pasting."
      icon={<ApiOutlined />}
      aside={
        <div className="crm-hero-pills">
          <span>
            <CheckCircleFilled /> Duplicates merged automatically
          </span>
          <span>
            <CheckCircleFilled /> Assigned &amp; notified instantly
          </span>
        </div>
      }
    >
      {!sources ? (
        <div className="crm-center tall">
          <Spin />
        </div>
      ) : (
        <>
          {sources.length === 0 && (
            <EmptyState
              icon={<ApiOutlined />}
              title="Connect where your enquiries come from"
              sub="Start with IndiaMART or your website. Every enquiry becomes a lead with a follow-up, assigned to the right person."
            />
          )}
          <div className="crm-src-grid">
            {sources.map((s) => (
              <SourceCard key={s.id} s={s} meta={meta} onEdit={(focusKey) => setModal({ source: s, focusKey })} onChanged={load} />
            ))}

            {!hasIndiaMart && (
              <button className="crm-add-tile im" onClick={() => setModal({ type: "INDIAMART" })}>
                <span className="crm-add-icon">
                  <ShopOutlined />
                </span>
                <b>Connect IndiaMART</b>
                <small>Instant push of every enquiry, plus the last 7 days with your CRM key.</small>
                <em>
                  <PlusOutlined /> Connect
                </em>
              </button>
            )}
            <button className="crm-add-tile wh" onClick={() => setModal({ type: "WEBHOOK" })}>
              <span className="crm-add-icon">
                <GlobalOutlined />
              </span>
              <b>Website form &amp; other apps</b>
              <small>A secure link for your website, Facebook &amp; Google lead forms, Zapier, Make and more.</small>
              <em>
                <PlusOutlined /> Create link
              </em>
            </button>
            <button className="crm-add-tile csv" onClick={() => setImportOpen(true)}>
              <span className="crm-add-icon">
                <FileExcelOutlined />
              </span>
              <b>Import a list</b>
              <small>Leads from Excel, Google Sheets, JustDial or TradeIndia exports, or your old CRM.</small>
              <em>
                <PlusOutlined /> Import CSV
              </em>
            </button>
            <button className="crm-add-tile manual" onClick={() => navigate("/app/crm/leads")}>
              <span className="crm-add-icon">
                <UserAddOutlined />
              </span>
              <b>Calls &amp; walk-ins</b>
              <small>Add them by hand with “New lead” — they get the same follow-ups and tracking.</small>
              <em>Go to Leads</em>
            </button>
          </div>
        </>
      )}

      <SourceModal
        open={!!modal}
        meta={meta}
        source={modal?.source || null}
        type={modal?.type}
        focusKey={modal?.focusKey}
        onClose={() => setModal(null)}
        onSaved={onSaved}
      />
      <ImportModal open={importOpen} meta={meta} onClose={() => setImportOpen(false)} />
    </CrmShell>
  );
};

export default SourcesPage;
