import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select, Tooltip, message } from "antd";
import {
  BarChartOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FieldTimeOutlined,
  FunnelPlotOutlined,
  InboxOutlined,
  LineChartOutlined,
  MailOutlined,
  PercentageOutlined,
  PhoneOutlined,
  ProfileOutlined,
  RiseOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import FilterBar from "@/modules/dashboard/components/FilterBar";
import TrendChart from "@/modules/dashboard/components/charts/TrendChart";
import Funnel from "@/modules/dashboard/components/charts/Funnel";
import RankedList from "@/modules/dashboard/components/charts/RankedList";
import { Card, Empty, StatTile } from "@/modules/dashboard/components/Bits";
import { PresetKey, autoGranularity, buildBuckets, rangeText, resolvePreset } from "@/modules/dashboard/utils/dates";
import { axisCount, count, duration, inr, inrCompact, pct } from "@/modules/dashboard/utils/format";
import "@/modules/dashboard/styles/dashboard.scss";
import { crmService } from "../services/crmService";
import { CRM_CHANGED_EVENT, STAGE, errText, sourceLabel } from "../constants";
import { useCrmMeta } from "../hooks";
import CrmShell from "../components/CrmShell";
import { Avatar } from "../components/Bits";

const PRESET_KEY = "crm_insights_preset";
const readPreset = (): PresetKey => {
  try {
    return (localStorage.getItem(PRESET_KEY) as PresetKey) || "30d";
  } catch {
    return "30d";
  }
};

const change = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : null);

const Row: React.FC<{ spans: number[]; children: React.ReactNode[] }> = ({ spans, children }) => {
  const present = children.map((c, i) => ({ c, span: spans[i] })).filter((x) => x.c);
  if (!present.length) return null;
  const full = present.length === children.length;
  return (
    <div className="db-row">
      {present.map((x, i) => (
        <div key={i} className="db-cell" style={{ gridColumn: `span ${full ? x.span : Math.floor(12 / present.length)}` }}>
          {x.c}
        </div>
      ))}
    </div>
  );
};

const InsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const meta = useCrmMeta();
  const today = useMemo(() => dayjs(), []);
  const [preset, setPreset] = useState<PresetKey>(readPreset);
  const [custom, setCustom] = useState<[string, string] | null>(null);
  const [owner, setOwner] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const req = useRef(0);

  const range = useMemo(() => resolvePreset(preset, today, custom || undefined), [preset, today, custom]);

  const load = useCallback(async () => {
    const my = ++req.current;
    setLoading(true);
    try {
      const r = await crmService.overview({ from: range.from, to: range.to, ...(owner ? { owner_id: owner } : {}) });
      if (my !== req.current) return;
      setData(r.data.data);
      setUpdatedAt(new Date().toISOString());
    } catch (err) {
      if (my === req.current) message.error(errText(err, "Couldn't load insights"));
    } finally {
      if (my === req.current) setLoading(false);
    }
  }, [range.from, range.to, owner]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    window.addEventListener(CRM_CHANGED_EVENT, load);
    return () => window.removeEventListener(CRM_CHANGED_EVENT, load);
  }, [load]);

  const choosePreset = (k: PresetKey) => {
    setPreset(k);
    try {
      localStorage.setItem(PRESET_KEY, k);
    } catch {
      // ignore
    }
  };

  const t = data?.totals;
  const vs = data ? rangeText(data.range.prev_from, data.range.prev_to) : "";
  const buckets = useMemo(() => {
    if (!data) return [];
    const series = {
      leads: data.series.map((d: any) => [d.day, d.leads, 0]),
      won: data.series.map((d: any) => [d.day, d.won, d.won_value]),
    };
    return buildBuckets(series as any, { from: data.range.from, to: data.range.to, prev_from: data.range.prev_from }, autoGranularity(data.range.days));
  }, [data]);
  const spark = (k: "leads" | "won", by: "n" | "v" = "n") => buckets.map((b) => b.cur[k]?.[by] || 0);
  const isManager = !!meta?.can.manage;

  const tiles = t
    ? [
        <StatTile key="leads" index={0} icon={<InboxOutlined />} label="New leads" value={count(t.leads)} tint="var(--db-s1)"
          change={change(t.leads, t.leads_prev)} current={t.leads} vs={vs} spark={spark("leads")} onClick={() => navigate("/app/crm/leads?view=list")} />,
        <StatTile key="won" index={1} icon={<TrophyOutlined />} label="Won" value={count(t.won)} tint="var(--db-good)"
          change={change(t.won, t.won_prev)} current={t.won} vs={vs} sub={t.won_value ? `${inrCompact(t.won_value)} in orders` : undefined} spark={spark("won")} />,
        <StatTile key="rate" index={2} icon={<PercentageOutlined />} label="Win rate" value={t.win_rate === null ? "—" : `${t.win_rate}%`} tint="var(--db-s7)"
          sub={`${t.won} won · ${t.lost} lost`} />,
        <StatTile key="pipe" index={3} icon={<RiseOutlined />} label="Open pipeline" value={inrCompact(t.open_value)} tint="var(--db-s4)"
          sub={`${count(t.open)} open lead${t.open === 1 ? "" : "s"}${t.unassigned ? ` · ${t.unassigned} unassigned` : ""}`} onClick={() => navigate("/app/crm/leads")} />,
        <StatTile key="speed" index={4} icon={<ThunderboltOutlined />} label="Speed to lead" tint="var(--db-s2)"
          value={data.response.median_minutes === null ? "—" : duration(data.response.median_minutes)}
          sub={data.response.measured ? `${data.response.within_hour} of ${data.response.measured} answered within 1 hr` : "Measured on IndiaMART & website leads"} />,
        <StatTile key="fu" index={5} icon={<ClockCircleOutlined />} label="Overdue" value={count(t.overdue)} tint="var(--db-critical)"
          sub={`${t.due_today} due today · ${t.no_follow_up} with no next step`} onClick={() => navigate("/app/crm/follow-ups?tab=overdue")} />,
      ]
    : [];

  const trendCard = data && (
    <Card icon={<LineChartOutlined />} title="Leads and wins" sub={`${rangeText(data.range.from, data.range.to)} · by ${autoGranularity(data.range.days)}`}
      table={
        <table className="db-table">
          <thead><tr><th>Period</th><th>New leads</th><th>Won</th><th>Won value</th></tr></thead>
          <tbody>{buckets.map((b) => (<tr key={b.key}><td>{b.title}</td><td>{count(b.cur.leads?.n || 0)}</td><td>{count(b.cur.won?.n || 0)}</td><td>{inr(b.cur.won?.v || 0)}</td></tr>))}</tbody>
        </table>
      }>
      {t.leads || t.won ? (
        <TrendChart
          buckets={buckets}
          series={[
            { key: "leads", label: "New leads", color: "var(--db-s1)", values: spark("leads"), area: true },
            { key: "won", label: "Won", color: "var(--db-good)", values: spark("won") },
          ]}
          format={(n) => count(n)}
          axis={axisCount}
          ariaLabel="New leads and won deals over time"
        />
      ) : (
        <Empty icon={<LineChartOutlined />} title="No leads in this period" sub="Pick a longer range, or add leads to see the trend." />
      )}
    </Card>
  );

  const funnelCard = data && (
    <Card icon={<FunnelPlotOutlined />} title="How far leads get" sub="Leads received in this period, by the furthest stage they reached">
      {t.leads ? (
        <div className="crm-funnel">
          <Funnel stages={data.funnel.map((f: any) => ({ key: f.stage, label: f.label, count: f.count, amount: 0 }))} showAmounts={false} />
        </div>
      ) : (
        <Empty icon={<FunnelPlotOutlined />} title="No leads yet" />
      )}
    </Card>
  );

  const sourceCard = data && (
    <Card icon={<BarChartOutlined />} title="Where leads come from" sub="Leads received, and how many turned into orders"
      table={
        <table className="db-table">
          <thead><tr><th>Source</th><th>Leads</th><th>Won</th><th>Lost</th><th>Won value</th></tr></thead>
          <tbody>{data.sources.map((s: any) => (<tr key={s.source}><td>{sourceLabel(s.source)}</td><td>{s.leads}</td><td>{s.won}</td><td>{s.lost}</td><td>{inr(s.won_value)}</td></tr>))}</tbody>
        </table>
      }>
      {data.sources.length ? (
        <RankedList
          items={data.sources.map((s: any) => ({
            key: s.source,
            name: sourceLabel(s.source),
            value: s.leads,
            meta: (
              <span>
                {s.won} won{s.leads ? ` · ${pct((s.won / s.leads) * 100, 0)} converted` : ""}
                {s.won_value ? ` · ${inrCompact(s.won_value)}` : ""}
              </span>
            ),
            onClick: () => navigate(`/app/crm/leads?view=list&source=${s.source}`),
          }))}
          format={count}
          total={t.leads}
        />
      ) : (
        <Empty icon={<BarChartOutlined />} title="No leads in this period" />
      )}
    </Card>
  );

  const stageTotal = data ? data.stages.reduce((s: number, x: any) => s + x.count, 0) : 0;
  const stageCard = data && (
    <Card icon={<RiseOutlined />} title="Open pipeline" sub="Leads in progress right now, by stage" badge={<span className="db-asof">As of today</span>}>
      {stageTotal ? (
        <>
          <div className="crm-stack" role="img" aria-label={`Open leads by stage: ${data.stages.map((s: any) => `${s.label} ${s.count}`).join(", ")}`}>
            {data.stages
              .filter((s: any) => s.count > 0)
              .map((s: any) => (
                <span key={s.stage} style={{ flexGrow: s.count, background: STAGE[s.stage as keyof typeof STAGE]?.color }} title={`${s.label}: ${s.count}`} />
              ))}
          </div>
          <ul className="crm-stage-list">
            {data.stages.map((s: any) => (
              <li key={s.stage}>
                <button onClick={() => navigate(`/app/crm/leads?stage=${s.stage}`)}>
                  <i style={{ background: STAGE[s.stage as keyof typeof STAGE]?.color }} />
                  <span>{s.label}</span>
                  <b>{s.count}</b>
                  <em>{s.value ? inrCompact(s.value) : "—"}</em>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Empty icon={<RiseOutlined />} title="No open leads" sub="New enquiries will show up here." />
      )}
    </Card>
  );

  const lostCard = data && (
    <Card icon={<CloseCircleOutlined />} title="Why leads are lost" sub={`Leads marked lost in this period (${t.lost})`} tint="var(--db-critical)">
      {data.lost_reasons.length ? (
        <RankedList items={data.lost_reasons.map((r: any) => ({ key: r.reason, name: r.reason, value: r.count }))} format={count} total={t.lost} />
      ) : (
        <Empty icon={<CloseCircleOutlined />} title="No lost leads in this period" />
      )}
    </Card>
  );

  const acts = data?.activities || {};
  const actTotal = ["CALL", "WHATSAPP", "EMAIL", "MEETING", "NOTE"].reduce((s, k) => s + (acts[k] || 0), 0);
  const activityCard = data && (
    <Card icon={<FieldTimeOutlined />} title="Sales activity" sub={isManager && !owner ? "Everything the team logged in this period" : "What was logged in this period"}>
      {actTotal ? (
        <div className="crm-acts">
          {[
            { k: "CALL", label: "Calls", icon: <PhoneOutlined />, c: "#0891b2" },
            { k: "WHATSAPP", label: "WhatsApp", icon: <WhatsAppOutlined />, c: "#0ca30c" },
            { k: "EMAIL", label: "Emails", icon: <MailOutlined />, c: "#475569" },
            { k: "MEETING", label: "Meetings", icon: <TeamOutlined />, c: "#7c3aed" },
            { k: "NOTE", label: "Notes", icon: <ProfileOutlined />, c: "#64748b" },
          ].map((a) => (
            <div key={a.k} className="crm-act" style={{ ["--c" as any]: a.c }}>
              <span>{a.icon}</span>
              <b>{count(acts[a.k] || 0)}</b>
              <small>{a.label}</small>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon={<FieldTimeOutlined />} title="Nothing logged yet" sub="Calls, WhatsApps and meetings logged on leads are counted here." />
      )}
    </Card>
  );

  const teamCard = data?.owners && data.owners.length > 0 && (
    <Card icon={<TeamOutlined />} title="Team" sub="Open work and results per person in this period">
      <div className="crm-team-wrap">
        <table className="crm-team">
          <thead>
            <tr>
              <th>Person</th>
              <th>Open</th>
              <th>Untouched</th>
              <th>Overdue</th>
              <th>Received</th>
              <th>Won</th>
              <th>Won value</th>
              <th>Win rate</th>
              <th>
                <Tooltip title="Median time from a lead arriving (IndiaMART / website) to the first call or message">Response</Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.owners.map((o: any) => (
              <tr key={o.id ?? "none"} onClick={() => o.id && setOwner(String(o.id))} className={o.id ? "clickable" : ""}>
                <td>
                  <span className="crm-team-person">
                    {o.id ? <Avatar name={o.name} seed={o.id} size={26} /> : <span className="crm-avatar empty sm">?</span>}
                    {o.name}
                  </span>
                </td>
                <td>{o.open}</td>
                <td className={o.untouched ? "warn" : ""}>{o.untouched}</td>
                <td className={o.overdue ? "bad" : ""}>{o.overdue}</td>
                <td>{o.received}</td>
                <td>{o.won}</td>
                <td>{o.won_value ? inrCompact(o.won_value) : "—"}</td>
                <td>{o.win_rate === null ? "—" : `${o.win_rate}%`}</td>
                <td>{o.response_minutes === null ? "—" : duration(o.response_minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <CrmShell title="Insights" subtitle="How enquiries turn into orders — and where they slip." icon={<BarChartOutlined />}>
      <div className={`db-root crm-insights${loading && data ? " refreshing" : ""}`}>
        <div className="crm-insights-bar">
          <FilterBar
            preset={preset}
            custom={custom}
            onPreset={choosePreset}
            onCustom={(r) => {
              setCustom(r);
              choosePreset("custom");
            }}
            compare={data ? { from: data.range.prev_from, to: data.range.prev_to } : null}
            loading={loading}
            updatedAt={updatedAt}
            onRefresh={load}
            today={today}
          />
          {isManager && (
            <Select
              className="crm-insights-owner"
              value={owner}
              onChange={setOwner}
              showSearch
              optionFilterProp="label"
              options={[
                { value: "", label: "Whole team" },
                { value: "none", label: "Unassigned leads" },
                ...(meta?.users || []).map((u) => ({ value: String(u.id), label: u.name })),
              ]}
            />
          )}
        </div>
        {!data ? (
          <div className="db-tiles">{Array.from({ length: 6 }, (_, i) => <div key={i} className="db-stat sk" />)}</div>
        ) : (
          <main className="db-main">
            <div className="db-tiles">{tiles}</div>
            <Row spans={[8, 4]}>{[trendCard, funnelCard]}</Row>
            <Row spans={[6, 6]}>{[sourceCard, stageCard]}</Row>
            <Row spans={[6, 6]}>{[lostCard, activityCard]}</Row>
            {isManager && !owner && <Row spans={[12]}>{[teamCard]}</Row>}
          </main>
        )}
      </div>
    </CrmShell>
  );
};

export default InsightsPage;
