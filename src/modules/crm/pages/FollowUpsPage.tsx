import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spin, Tooltip, message } from "antd";
import {
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  ExclamationCircleFilled,
  FieldTimeOutlined,
  PhoneOutlined,
  QuestionCircleOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { crmService } from "../services/crmService";
import { CRM_CHANGED_EVENT, Lead, LogType, ago, errText, greetingFor, overdueBy, prettyPhone, telHref, whatsappHref } from "../constants";
import { useCrmMeta } from "../hooks";
import CrmShell, { companyName } from "../components/CrmShell";
import LeadDrawer from "../components/LeadDrawer";
import { Avatar, EmptyState, Money, RatingBadge, SourceChip, StagePill } from "../components/Bits";

type Tab = "overdue" | "today" | "upcoming" | "none";
const TABS: { key: Tab; label: string; icon: React.ReactNode; empty: string }[] = [
  { key: "overdue", label: "Overdue", icon: <ExclamationCircleFilled />, empty: "Nothing overdue. Nice work." },
  { key: "today", label: "Today", icon: <ClockCircleOutlined />, empty: "No follow-ups left for today." },
  { key: "upcoming", label: "Coming up", icon: <CalendarOutlined />, empty: "Nothing planned yet. Plan follow-ups from a lead." },
  { key: "none", label: "No next step", icon: <QuestionCircleOutlined />, empty: "Every open lead has a next step planned." },
];

const dayHeading = (iso: string) => {
  const d = dayjs(iso);
  const now = dayjs();
  if (d.isSame(now.add(1, "day"), "day")) return "Tomorrow";
  if (d.diff(now.startOf("day"), "day") < 7) return d.format("dddd");
  return d.format("ddd, D MMM");
};

/** The salesperson's agenda: who to call now, today and next. */
const FollowUpsPage: React.FC = () => {
  const meta = useCrmMeta();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "today";
  const scope = params.get("scope") || "mine";
  const leadId = Number(params.get("lead")) || null;
  const [focus, setFocus] = useState<LogType | null>(null);
  const [counts, setCounts] = useState<Record<Tab, number> | null>(null);
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const company = useMemo(companyName, []);
  const req = useRef(0);

  const set = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => (v === null ? p.delete(k) : p.set(k, v)));
        return p;
      },
      { replace: true },
    );

  const load = useCallback(async () => {
    const my = ++req.current;
    setLoading(true);
    const base = { scope: scope === "team" ? undefined : scope, limit: 100 };
    try {
      const [main, ...countRes] = await Promise.all([
        crmService.list({ ...base, follow_up: tab, sort: tab === "none" ? "newest" : "follow_up" }),
        ...TABS.map((t) => crmService.list({ ...base, follow_up: t.key, limit: 1 })),
      ]);
      if (my !== req.current) return;
      setRows(main.data.data.rows);
      setCounts(Object.fromEntries(TABS.map((t, i) => [t.key, countRes[i].data.data.pagination.total])) as Record<Tab, number>);
    } catch (err) {
      if (my === req.current) message.error(errText(err, "Couldn't load follow-ups"));
    } finally {
      if (my === req.current) setLoading(false);
    }
  }, [tab, scope]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    let t: any;
    const on = () => {
      clearTimeout(t);
      t = setTimeout(load, 250);
    };
    window.addEventListener(CRM_CHANGED_EVENT, on);
    return () => {
      clearTimeout(t);
      window.removeEventListener(CRM_CHANGED_EVENT, on);
    };
  }, [load]);

  const groups = useMemo(() => {
    if (tab !== "upcoming") return [{ title: null as string | null, items: rows }];
    const out: { title: string | null; items: Lead[] }[] = [];
    rows.forEach((l) => {
      const t = l.next_follow_up_at ? dayHeading(l.next_follow_up_at) : "Later";
      if (!out.length || out[out.length - 1].title !== t) out.push({ title: t, items: [] });
      out[out.length - 1].items.push(l);
    });
    return out;
  }, [rows, tab]);

  const open = (id: number, f: LogType | null = null) => {
    setFocus(f);
    set({ lead: String(id) });
  };

  return (
    <CrmShell
      title="Follow-ups"
      subtitle="Who to call now, today and next — so no enquiry goes cold."
      icon={<FieldTimeOutlined />}
    >
      <div className="crm-agenda-tabs" role="tablist" aria-label="Follow-ups">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`crm-astat ${t.key}${tab === t.key ? " on" : ""}`}
            onClick={() => set({ tab: t.key })}
          >
            <span className="crm-astat-icon">{t.icon}</span>
            <b>{counts ? counts[t.key] : "–"}</b>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="crm-toolbar slim">
        <div className="crm-seg" role="tablist" aria-label="Whose follow-ups">
          {[
            { k: "mine", label: "Mine" },
            { k: "pool", label: "Unassigned" },
            ...(meta?.can.manage ? [{ k: "team", label: "Whole team" }] : [{ k: "team", label: "All I can see" }]),
          ].map((s) => (
            <button key={s.k} role="tab" aria-selected={scope === s.k} className={scope === s.k ? "on" : ""} onClick={() => set({ scope: s.k })}>
              {s.label}
            </button>
          ))}
        </div>
        {loading && <Spin size="small" />}
      </div>

      {!loading && rows.length === 0 ? (
        <EmptyState icon={<CheckCircleFilled />} title={TABS.find((t) => t.key === tab)!.empty} sub="Leads appear here when their follow-up date comes up." />
      ) : (
        <div className={`crm-agenda${loading ? " crm-loading-fade" : ""}`}>
          {groups.map((g, gi) => (
            <section key={gi} className="crm-agenda-group">
              {g.title && <h4>{g.title}</h4>}
              <ul>
                {g.items.map((l) => (
                  <li key={l.id} className={`crm-agenda-row ${(l.follow_up_state || "none").toLowerCase()}`}>
                    <button className="crm-agenda-time" onClick={() => open(l.id)}>
                      {l.next_follow_up_at ? (
                        <>
                          <b>{dayjs(l.next_follow_up_at).format("h:mm A")}</b>
                          <small>
                            {l.follow_up_state === "OVERDUE"
                              ? `${overdueBy(l.next_follow_up_at)} late`
                              : dayjs(l.next_follow_up_at).isSame(dayjs(), "day")
                                ? "today"
                                : dayjs(l.next_follow_up_at).format("D MMM")}
                          </small>
                        </>
                      ) : (
                        <>
                          <b>—</b>
                          <small>since {ago(l.last_activity_at || l.received_at)}</small>
                        </>
                      )}
                    </button>
                    <button className="crm-agenda-main" onClick={() => open(l.id)}>
                      <Avatar name={l.name} seed={l.id} size={36} />
                      <span className="crm-agenda-id">
                        <b>
                          {l.name} <RatingBadge rating={l.rating} />
                        </b>
                        <small>{[l.company_name, l.requirement].filter(Boolean).join(" · ") || l.key}</small>
                        {l.follow_up_note && <em>“{l.follow_up_note}”</em>}
                      </span>
                    </button>
                    <span className="crm-agenda-meta">
                      <StagePill stage={l.stage} small />
                      <SourceChip source={l.source} compact />
                      <Money value={l.estimated_value} compact />
                      {scope !== "mine" && (l.owner ? <Avatar name={l.owner.name} seed={l.owner.id} size={22} /> : <span className="crm-muted sm">Unassigned</span>)}
                    </span>
                    <span className="crm-agenda-actions">
                      {l.phone && (
                        <Tooltip title={`Call ${prettyPhone(l.phone)}`}>
                          <a className="crm-round call" href={telHref(l.phone)} aria-label="Call">
                            <PhoneOutlined />
                          </a>
                        </Tooltip>
                      )}
                      {l.phone && (
                        <Tooltip title="WhatsApp">
                          <a className="crm-round wa" href={whatsappHref(l.phone, greetingFor(l, company))} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                            <WhatsAppOutlined />
                          </a>
                        </Tooltip>
                      )}
                      <button className="crm-btn sm primary" onClick={() => open(l.id, "CALL")}>
                        Log
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {rows.length >= 100 && <p className="crm-hint center">Showing the first 100. Use Leads → List for more.</p>}
        </div>
      )}

      <LeadDrawer
        leadId={leadId}
        meta={meta}
        focus={focus}
        onClose={() => {
          setFocus(null);
          set({ lead: null });
        }}
        onOpenLead={(id) => open(id)}
      />
    </CrmShell>
  );
};

export default FollowUpsPage;
