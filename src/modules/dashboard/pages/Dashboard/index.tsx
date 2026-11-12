import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  AlertOutlined,
  BarChartOutlined,
  CarOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  DashboardOutlined,
  ExclamationCircleFilled,
  FileDoneOutlined,
  FileTextOutlined,
  FireOutlined,
  FunnelPlotOutlined,
  HistoryOutlined,
  InboxOutlined,
  LineChartOutlined,
  MinusCircleFilled,
  PercentageOutlined,
  PlusOutlined,
  ShoppingOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserAddOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { StorageService } from "@/storage";
import { dashboardService, overviewKey } from "../../services/dashboardService";
import { forgetOverview, rememberOverview } from "../../redux/dashboardSlice";
import type { Overview, SeriesKey } from "../../types";
import {
  type Granularity,
  type PresetKey,
  PRESETS,
  allowedGranularities,
  autoGranularity,
  buildBuckets,
  rangeText,
  resolvePreset,
  toQuery,
} from "../../utils/dates";
import {
  PAYMENT_MODE_LABEL,
  axisCount,
  axisInr,
  count,
  decimal,
  greeting,
  inr,
  inrCompact,
  pct,
  share,
  titleCase,
} from "../../utils/format";
import { AsOfToday, Card, Delta, Empty, StatTile, useCountUp } from "../../components/Bits";
import FilterBar from "../../components/FilterBar";
import TrendChart from "../../components/charts/TrendChart";
import SegmentBar from "../../components/charts/SegmentBar";
import Funnel from "../../components/charts/Funnel";
import RankedList from "../../components/charts/RankedList";
import Heatmap, { DAYS, busiest, hourRange } from "../../components/charts/Heatmap";
import { AttendanceCard, DriveCard, RecentActivity, TasksCard } from "../../components/Sections";
import "../../styles/dashboard.scss";

const PRESET_KEY = "dashboard_preset";
const readStoredPreset = (): PresetKey => {
  try {
    const v = localStorage.getItem(PRESET_KEY) as PresetKey | null;
    return v && PRESETS.some((p) => p.key === v) ? v : "30d";
  } catch {
    return "30d";
  }
};

// Fixed colour per payment mode: colour follows the entity, never its rank.
const MODE_COLOR: Record<string, string> = {
  UPI: "var(--db-s1)",
  BANK_TRANSFER: "var(--db-s2)",
  CASH: "var(--db-s3)",
  CHEQUE: "var(--db-s4)",
  CARD: "var(--db-s5)",
};

type TrendTab = "sales" | "quotations" | "challans" | "customers";

/** Lays a row of optional cards out on the 12-column grid, sharing the row fairly when some are hidden. */
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

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => dayjs().startOf("day"), []);

  // ── period (kept in the URL so refresh/back keep it) ──────────────────────
  const urlPreset = params.get("range") as PresetKey | null;
  const preset: PresetKey =
    urlPreset === "custom" || PRESETS.some((p) => p.key === urlPreset) ? (urlPreset as PresetKey) : readStoredPreset();
  const custom: [string, string] | null =
    preset === "custom" && params.get("from") && params.get("to") ? [params.get("from")!, params.get("to")!] : null;
  const resolved = useMemo(() => resolvePreset(preset, today, custom || undefined), [preset, today, custom?.[0], custom?.[1]]);
  const query = useMemo(() => toQuery(resolved, today), [resolved, today]);
  const key = overviewKey(query);

  const setPreset = (k: PresetKey) => {
    try {
      localStorage.setItem(PRESET_KEY, k);
    } catch {
      /* not remembered */
    }
    setParams({ range: k }, { replace: true });
  };
  const setCustom = (r: [string, string]) => setParams({ range: "custom", from: r[0], to: r[1] }, { replace: true });

  // ── data: cached copy first, fresh copy always ────────────────────────────
  const cached: Overview | undefined = useSelector((s: any) => s.dashboard?.cache?.[key]);
  const [data, setData] = useState<Overview | null>(cached || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const reqId = useRef(0);

  const load = useCallback(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setLoading(true);
    dashboardService
      .overview(query, ctrl.signal)
      .then((d) => {
        if (id !== reqId.current) return;
        setData(d);
        setError(null);
        dispatch(rememberOverview({ key, data: d }));
      })
      .catch((e) => {
        if (id !== reqId.current || e?.code === "ERR_CANCELED") return;
        const status = e?.response?.status;
        if (status === 403 || status === 401) {
          dispatch(forgetOverview(key));
          setData(null);
        }
        setError({ status, message: e?.response?.data?.message || "Couldn't load the dashboard" });
      })
      .finally(() => id === reqId.current && setLoading(false));
    return () => ctrl.abort();
  }, [query, key, dispatch]);

  useEffect(() => {
    if (cached) setData(cached);
    return load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // ── trend controls ────────────────────────────────────────────────────────
  const days = data?.range.days ?? 30;
  const grans = allowedGranularities(days);
  const [granPick, setGranPick] = useState<Granularity | null>(null);
  const gran: Granularity = granPick && grans.includes(granPick) ? granPick : autoGranularity(days);
  const [tab, setTab] = useState<TrendTab>("sales");

  const access = data?.access;
  const tabs = useMemo(() => {
    const t: { key: TrendTab; label: string }[] = [];
    if (access?.invoices) t.push({ key: "sales", label: access.insights ? "Sales & collections" : "Invoices" });
    if (access?.quotations) t.push({ key: "quotations", label: "Quotations" });
    if (access?.challans) t.push({ key: "challans", label: "Challans" });
    if (access?.customers) t.push({ key: "customers", label: "New customers" });
    return t;
  }, [access]);
  const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  const buckets = useMemo(
    () => (data ? buildBuckets(data.series, data.range, gran) : []),
    [data, gran],
  );
  const sparkBuckets = useMemo(
    () => (data ? buildBuckets(data.series, data.range, autoGranularity(data.range.days)) : []),
    [data],
  );
  const spark = (k: SeriesKey, by: "n" | "v") => sparkBuckets.map((b) => b.cur[k]?.[by] || 0);

  if (!data && error) {
    return <NoAccess status={error.status} message={error.message} onRetry={load} />;
  }
  if (!data) return <Skeleton />;

  const { totals, snapshot } = data;
  const ins = data.access.insights;
  const vs = rangeText(data.range.prev_from, data.range.prev_to);
  const failed = (name: string) => data.errors.includes(name);
  const user = (() => {
    try {
      return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.USER_DETAILS) || "{}");
    } catch {
      return {};
    }
  })();
  const company = (() => {
    try {
      return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}");
    } catch {
      return {};
    }
  })();

  const nothingVisible =
    !data.access.invoices && !data.access.quotations && !data.access.challans && !data.access.customers &&
    !data.access.products && !data.access.tasks && !data.access.attendance && !data.access.drive;

  // ── trend data for the active tab ─────────────────────────────────────────
  const trend = (() => {
    const cur = (k: SeriesKey, by: "n" | "v") => buckets.map((b) => b.cur[k]?.[by] || 0);
    const prev = (k: SeriesKey, by: "n" | "v") => buckets.map((b) => b.prev[k]?.[by] || 0);
    if (activeTab === "sales") {
      return ins
        ? {
            series: [
              { key: "invoiced", label: "Invoiced", color: "var(--db-s1)", values: cur("invoiced", "v"), area: true },
              { key: "collected", label: "Collected", color: "var(--db-s2)", values: cur("collected", "v") },
            ],
            prev: null,
            money: true,
          }
        : { series: [{ key: "invoiced", label: "Invoices", color: "var(--db-s1)", values: cur("invoiced", "n"), area: true }], prev: { label: "Previous period", values: prev("invoiced", "n") }, money: false };
    }
    const k: SeriesKey = activeTab === "quotations" ? "quotations" : activeTab === "challans" ? "challans" : "customers";
    const by = activeTab === "customers" ? "n" : "n";
    return {
      series: [{ key: k, label: activeTab === "customers" ? "New customers" : titleCase(k), color: "var(--db-s1)", values: cur(k, by), area: true }],
      prev: { label: "Previous period", values: prev(k, by) },
      money: false,
    };
  })();

  const trendTable = (
    <table className="db-table">
      <thead>
        <tr>
          <th>Period</th>
          {trend.series.map((s) => (
            <th key={s.key}>{s.label}</th>
          ))}
          {trend.prev && <th>{trend.prev.label}</th>}
        </tr>
      </thead>
      <tbody>
        {buckets.map((b, i) => (
          <tr key={b.key}>
            <td>{b.title}</td>
            {trend.series.map((s) => (
              <td key={s.key}>{trend.money ? inr(s.values[i]) : count(s.values[i])}</td>
            ))}
            {trend.prev && <td>{count(trend.prev.values[i])}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // ── hero ──────────────────────────────────────────────────────────────────
  const inv = totals.invoiced;
  const col = totals.collected;
  const heroValue = ins ? inv?.amount || 0 : data.access.quotations ? totals.quotations?.amount || 0 : inv?.count || 0;
  const heroLabel = ins ? "Revenue invoiced" : data.access.quotations ? "Value quoted" : "Invoices issued";
  const heroChange = ins ? inv?.amount_change : data.access.quotations ? totals.quotations?.amount_change : inv?.count_change;
  const heroIsMoney = ins || data.access.quotations;
  const collectedRate = data.invoice_summary?.collection_rate ?? null;

  const rec = data.receivables;
  const isum = data.invoice_summary;
  const hm = data.heatmap;
  const peak = hm ? busiest(hm.cells) : null;

  // ── KPI tiles ─────────────────────────────────────────────────────────────
  const tiles: React.ReactNode[] = [];
  let ti = 0;
  if (ins && inv) {
    tiles.push(
      <StatTile key="inv" index={ti++} icon={<FileDoneOutlined />} tint="var(--db-s1)" label="Invoiced" value={inrCompact(inv.amount)}
        change={inv.amount_change} current={inv.amount} vs={vs}
        sub={`${count(inv.count)} invoice${inv.count === 1 ? "" : "s"}${inv.count ? ` · avg ${inrCompact(inv.amount / inv.count)}` : ""}`}
        spark={spark("invoiced", "v")} onClick={() => navigate("/app/invoice")} />,
    );
  } else if (data.access.invoices && inv) {
    tiles.push(
      <StatTile key="inv" index={ti++} icon={<FileDoneOutlined />} tint="var(--db-s1)" label="Invoices issued" value={count(inv.count)}
        change={inv.count_change} current={inv.count} vs={vs} spark={spark("invoiced", "n")} onClick={() => navigate("/app/invoice")} />,
    );
  }
  if (ins && col) {
    tiles.push(
      <StatTile key="col" index={ti++} icon={<WalletOutlined />} tint="var(--db-s2)" label="Collected" value={inrCompact(col.amount)}
        change={col.amount_change} current={col.amount} vs={vs}
        sub={`${count(col.count)} payment${col.count === 1 ? "" : "s"} received`} spark={spark("collected", "v")}
        onClick={() => navigate("/app/invoice")} />,
    );
  }
  if (ins && rec) {
    tiles.push(
      <StatTile key="rec" index={ti++} icon={<ClockCircleFilled />} tint="var(--db-serious)" label="Outstanding" value={inrCompact(rec.total)}
        sub={rec.overdue ? <><b className="db-text-bad">{inrCompact(rec.overdue)}</b> overdue · as of today</> : `${count(rec.count)} unpaid · as of today`}
        footer={
          <span className="db-stat-mini-seg" aria-hidden>
            {rec.buckets.filter((b) => b.amount > 0).map((b) => (
              <i key={b.key} style={{ flexGrow: b.amount, background: agingColor(b.key) }} />
            ))}
          </span>
        }
        onClick={() => navigate("/app/invoice")} />,
    );
  }
  if (data.access.quotations && totals.quotations) {
    const q = totals.quotations;
    tiles.push(
      <StatTile key="qt" index={ti++} icon={<FileTextOutlined />} tint="var(--db-s7)" label="Quotations" value={count(q.count)}
        change={q.count_change} current={q.count} vs={vs}
        sub={`${inrCompact(q.amount)} quoted${data.funnel?.win_rate != null ? ` · ${pct(data.funnel.win_rate)} won` : ""}`}
        spark={spark("quotations", "n")} onClick={() => navigate("/app/quotation")} />,
    );
  }
  if (data.access.challans && totals.challans) {
    const c = totals.challans;
    tiles.push(
      <StatTile key="dc" index={ti++} icon={<CarOutlined />} tint="var(--db-s3)" label="Delivery challans" value={count(c.count)}
        change={c.count_change} current={c.count} vs={vs}
        sub={snapshot.challans_awaiting ? `${count(snapshot.challans_awaiting)} waiting to be invoiced` : `${inrCompact(c.amount)} in goods`}
        spark={spark("challans", "n")} onClick={() => navigate("/app/delivery-challans")} />,
    );
  }
  if (data.access.customers && totals.customers) {
    const c = totals.customers;
    tiles.push(
      <StatTile key="cu" index={ti++} icon={<UserAddOutlined />} tint="var(--db-s5)" label="New customers" value={count(c.count)}
        change={c.count_change} current={c.count} vs={vs}
        sub={`${count(snapshot.customers_active)} active in total`} spark={spark("customers", "n")}
        onClick={() => navigate("/app/customers")} />,
    );
  }

  // ── cards ─────────────────────────────────────────────────────────────────
  const trendCard = tabs.length ? (
    <Card
      icon={<LineChartOutlined />}
      title="Trend"
      sub={`${trend.money ? "Amounts" : "Counts"} per ${gran}${trend.prev ? ", against the previous period" : ""}`}
      table={trendTable}
      failed={failed("series")}
      onRetry={load}
      extra={
        grans.length > 1 ? (
          <div className="db-seg-ctl" role="group" aria-label="Group by">
            {grans.map((g) => (
              <button key={g} className={gran === g ? "active" : ""} aria-pressed={gran === g} onClick={() => setGranPick(g)}>
                {g === "day" ? "Day" : g === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
        ) : null
      }
    >
      {tabs.length > 1 && (
        <div className="db-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={activeTab === t.key} className={activeTab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="db-legend">
        {trend.series.map((s) => (
          <span key={s.key}>
            <i className="db-key-line" style={{ background: s.color }} />
            {s.label}
            <b>{trend.money ? inrCompact(s.values.reduce((a, v) => a + v, 0)) : count(s.values.reduce((a, v) => a + v, 0))}</b>
          </span>
        ))}
        {trend.prev && (
          <span className="muted">
            <i className="db-key-line prev" />
            {trend.prev.label}
            <b>{count(trend.prev.values.reduce((a, v) => a + v, 0))}</b>
          </span>
        )}
      </div>
      {buckets.length > 1 ? (
        <TrendChart
          key={`${activeTab}-${gran}-${key}`}
          buckets={buckets}
          series={trend.series}
          prev={trend.prev}
          format={trend.money ? inr : count}
          axis={trend.money ? axisInr : axisCount}
          ariaLabel={`Trend of ${trend.series.map((s) => s.label).join(" and ")} for ${resolved.label}. Use the left and right arrow keys to read each ${gran}.`}
        />
      ) : (
        <div className="db-oneday">
          {trend.series.map((s) => (
            <div key={s.key}>
              <span>{s.label}</span>
              <b>{trend.money ? inr(s.values[0] || 0) : count(s.values[0] || 0)}</b>
            </div>
          ))}
          <p>Pick a longer period to see how this moves over time.</p>
        </div>
      )}
    </Card>
  ) : null;

  const funnelCard = data.funnel ? (
    <Card icon={<FunnelPlotOutlined />} tint="var(--db-s7)" title="Quotation funnel" sub="Quotations dated in this period" failed={failed("funnel")} onRetry={load}
      link={{ label: "All quotations", onClick: () => navigate("/app/quotation") }}>
      {data.funnel.stages[0]?.count ? (
        <>
          <Funnel stages={data.funnel.stages} showAmounts />
          <div className="db-funnel-foot">
            <span><b>{pct(data.funnel.win_rate)}</b> became invoices</span>
            {snapshot.pipeline_count ? (
              <span title="Shared or approved, not invoiced yet, still valid">
                Open pipeline <b>{inrCompact(snapshot.pipeline_value)}</b> · {count(snapshot.pipeline_count)}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <Empty icon={<FileTextOutlined />} title="No quotations in this period" />
      )}
    </Card>
  ) : null;

  const receivablesCard = rec ? (
    <Card icon={<ClockCircleFilled />} tint="var(--db-serious)" title="Receivables" badge={<AsOfToday />} sub="Unpaid balances by how late they are"
      failed={failed("receivables")} onRetry={load} link={{ label: "Chase payments", onClick: () => navigate("/app/invoice") }}>
      <div className="db-figure">
        <b>{inr(rec.total)}</b>
        <span>across {count(rec.count)} invoice{rec.count === 1 ? "" : "s"}{rec.overdue ? <> · <b className="db-text-bad">{inrCompact(rec.overdue)} overdue</b></> : null}</span>
      </div>
      <SegmentBar
        ariaLabel="Receivables by age"
        format={inrCompact}
        segments={rec.buckets.map((b) => ({
          key: b.key,
          label: b.key === "current" ? "Not due yet" : `${b.label} late`,
          value: b.amount,
          color: agingColor(b.key),
          icon: agingIcon(b.key),
          note: `${count(b.count)} inv.`,
        }))}
      />
    </Card>
  ) : null;

  const statusCard = isum ? (
    <Card icon={<PercentageOutlined />} tint="var(--db-good)" title="Invoice payments" sub="Invoices dated in this period" failed={failed("invoice_summary")} onRetry={load}>
      <div className="db-figure">
        <b>{pct(isum.collection_rate, 0)}</b>
        <span>of the amount invoiced is already paid</span>
      </div>
      <SegmentBar
        ariaLabel="Invoices by payment state"
        format={inrCompact}
        segments={[
          { key: "paid", label: "Paid", value: isum.state.paid.amount, color: "var(--db-good)", icon: <CheckCircleFilled />, note: `${count(isum.state.paid.count)}` },
          { key: "partial", label: "Part paid", value: isum.state.partial.amount, color: "var(--db-warn)", icon: <MinusCircleFilled />, note: `${count(isum.state.partial.count)}` },
          { key: "unpaid", label: "Not due yet", value: isum.state.unpaid.amount, color: "var(--db-neutral)", icon: <ClockCircleFilled />, note: `${count(isum.state.unpaid.count)}` },
          { key: "overdue", label: "Overdue", value: isum.state.overdue.amount, color: "var(--db-critical)", icon: <ExclamationCircleFilled />, note: `${count(isum.state.overdue.count)}` },
        ]}
      />
      {isum.avg_days_to_pay !== null && (
        <div className="db-mini-foot">
          <span>Customers paid in <b>{decimal(isum.avg_days_to_pay)} days</b> on average</span>
          <small>{count(isum.settled_count)} settled</small>
        </div>
      )}
    </Card>
  ) : null;

  const modesCard = data.payment_modes ? (
    <Card icon={<WalletOutlined />} tint="var(--db-s2)" title="How customers paid" sub="Payments received in this period" failed={failed("payment_modes")} onRetry={load}>
      {data.payment_modes.length ? (
        <>
          <div className="db-figure">
            <b>{inr(col?.amount || 0)}</b>
            <span>in {count(col?.count || 0)} payment{col?.count === 1 ? "" : "s"}</span>
          </div>
          <SegmentBar
            ariaLabel="Payments by mode"
            format={inrCompact}
            segments={data.payment_modes.map((m) => ({
              key: m.mode,
              label: PAYMENT_MODE_LABEL[m.mode] || titleCase(m.mode),
              value: m.amount,
              color: MODE_COLOR[m.mode] || "var(--db-neutral)",
              note: `${count(m.count)}`,
            }))}
          />
        </>
      ) : (
        <Empty icon={<WalletOutlined />} title="No payments recorded" sub="Payments added to invoices show up here." />
      )}
    </Card>
  ) : null;

  const customersCard = data.top_customers ? (
    <Card icon={<TrophyOutlined />} tint="var(--db-s4)" title="Top customers" sub={`By amount invoiced · ${count(data.top_customers.customers_billed)} billed`}
      failed={failed("top_customers")} onRetry={load} link={data.access.customers ? { label: "All customers", onClick: () => navigate("/app/customers") } : undefined}>
      {data.top_customers.items.length ? (
        <RankedList
          format={inrCompact}
          total={inv?.amount}
          items={data.top_customers.items.map((c) => ({
            key: String(c.id ?? c.name),
            name: c.name,
            value: c.amount,
            meta: (
              <>
                {count(c.invoices)} invoice{c.invoices === 1 ? "" : "s"}
                {c.balance > 0 && <span className="db-text-bad"> · {inrCompact(c.balance)} due</span>}
              </>
            ),
          }))}
        />
      ) : (
        <Empty icon={<TeamOutlined />} title="No invoices in this period" />
      )}
    </Card>
  ) : null;

  const productsCard = data.top_products ? (
    <Card icon={<ShoppingOutlined />} tint="var(--db-s3)" title="Best-selling items" sub="By amount invoiced" failed={failed("top_products")} onRetry={load}
      link={data.access.products ? { label: "All products", onClick: () => navigate("/app/products") } : undefined}>
      {data.top_products.length ? (
        <RankedList
          format={inrCompact}
          total={isum?.gst.before_tax}
          items={data.top_products.map((p) => ({
            key: p.name,
            name: p.name,
            value: p.amount,
            meta: <>{decimal(p.qty)} {p.unit || "units"} · {count(p.invoices)} invoice{p.invoices === 1 ? "" : "s"}</>,
          }))}
        />
      ) : (
        <Empty icon={<ShoppingOutlined />} title="Nothing sold in this period" />
      )}
    </Card>
  ) : null;

  const heatCard = hm ? (
    <Card icon={<FireOutlined />} tint="var(--db-s2)" title="When work happens" sub={peak ? `Busiest: ${peak.dayFull}s · peak hour ${peak.hour}` : "Documents created by weekday and hour"}
      failed={failed("heatmap")} onRetry={load}
      table={
        <table className="db-table compact">
          <thead><tr><th>Hour</th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
          <tbody>
            {Array.from({ length: 24 }, (_, h) => (
              <tr key={h}><td>{hourRange(h)}</td>{hm.cells.map((row, d) => <td key={d}>{row[h] || ""}</td>)}</tr>
            ))}
          </tbody>
        </table>
      }>
      {hm.total ? <Heatmap cells={hm.cells} /> : <Empty icon={<FireOutlined />} title="No documents created in this period" />}
    </Card>
  ) : null;

  const gstCard = isum ? (
    <Card icon={<BarChartOutlined />} tint="var(--db-s1)" title="GST on sales" sub="Output tax on invoices in this period">
      <div className="db-figure">
        <b>{inr(isum.gst.total)}</b>
        <span><Delta change={isum.gst.change} current={isum.gst.total} upIsGood vs={vs} /> on {inrCompact(isum.gst.before_tax)} before tax</span>
      </div>
      <SegmentBar
        ariaLabel="GST by type"
        format={inrCompact}
        segments={[
          { key: "cgst", label: "CGST", value: isum.gst.cgst, color: "var(--db-s1)" },
          { key: "sgst", label: "SGST", value: isum.gst.sgst, color: "var(--db-s2)" },
          { key: "igst", label: "IGST", value: isum.gst.igst, color: "var(--db-s3)" },
        ]}
      />
    </Card>
  ) : null;

  const challanCard = data.challans ? (
    <Card icon={<CarOutlined />} tint="var(--db-s3)" title="Deliveries" sub="Challans dated in this period" failed={failed("challans")} onRetry={load}
      link={{ label: "All challans", onClick: () => navigate("/app/delivery-challans") }}>
      <div className="db-pipeline">
        {data.challans.statuses.filter((s) => s.status !== "CANCELLED" || s.count).map((s, i) => (
          <div key={s.status} className={`db-pipe-step${s.count ? "" : " zero"}`} style={{ ["--i" as any]: i }}>
            <b>{count(s.count)}</b>
            <span>{titleCase(s.status)}</span>
            <small>{inrCompact(s.value)}</small>
          </div>
        ))}
      </div>
      {snapshot.challans_awaiting ? (
        <button className="db-callout" onClick={() => navigate("/app/delivery-challans")}>
          <AlertOutlined /> <span><b>{count(snapshot.challans_awaiting)}</b> delivered challan{snapshot.challans_awaiting === 1 ? "" : "s"} worth <b>{inrCompact(snapshot.challans_awaiting_value)}</b> not invoiced yet</span>
        </button>
      ) : (
        <div className="db-mini-foot"><span>Every delivered challan has been invoiced.</span></div>
      )}
    </Card>
  ) : null;

  const stockCard = data.low_stock ? (
    <Card icon={<InboxOutlined />} tint="var(--db-critical)" title="Low stock" badge={<AsOfToday />} sub="At or below the minimum you set"
      failed={failed("low_stock")} onRetry={load} link={{ label: "Products", onClick: () => navigate("/app/products") }}>
      {data.low_stock.items.length ? (
        <>
          <ul className="db-stock">
            {data.low_stock.items.map((p) => {
              const ratio = Math.min(100, share(p.stock, p.minimum));
              return (
                <li key={p.id}>
                  <span className="db-stock-name" title={p.name}>{p.name}</span>
                  <span className="db-stock-qty"><b>{decimal(p.stock)}</b> / {decimal(p.minimum)} {p.unit || ""}</span>
                  <span className="db-stock-track"><i className={p.stock <= 0 ? "out" : ""} style={{ width: `${Math.max(3, ratio)}%` }} /></span>
                </li>
              );
            })}
          </ul>
          {data.low_stock.count > data.low_stock.items.length && (
            <div className="db-mini-foot"><span>+{count(data.low_stock.count - data.low_stock.items.length)} more products below minimum</span></div>
          )}
        </>
      ) : (
        <Empty icon={<CheckCircleFilled />} title="All stocked up" sub="No product is below its minimum level." />
      )}
    </Card>
  ) : null;

  const addOns = [
    data.tasks ? <TasksCard key="t" t={data.tasks} vs={vs} /> : null,
    data.attendance ? <AttendanceCard key="a" a={data.attendance} /> : null,
    data.drive ? <DriveCard key="d" d={data.drive} /> : null,
  ];

  const recentCard = data.recent ? (
    <Card icon={<HistoryOutlined />} title="Latest activity" sub="Newest documents in this period" failed={failed("recent")} onRetry={load}>
      <RecentActivity items={data.recent} showAmounts={data.access.invoices} />
    </Card>
  ) : null;

  const firstName = user?.firstName || "";

  return (
    <div className={`db-root${loading ? " refreshing" : ""}`}>
      {/* ── Hero ── */}
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              {greeting()}
              {firstName ? `, ${firstName}` : ""} 👋
              {company?.name && <span className="db-hero-company">{company.name}</span>}
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <DashboardOutlined />
              </span>
              Business overview
            </div>
            <div className="db-hero-sub">
              {resolved.label} · {rangeText(data.range.from, data.range.to)}
            </div>
            {!nothingVisible && (
              <div className="db-hero-figure">
                <span className="db-hero-figure-label">{heroLabel}</span>
                <HeroNumber value={heroValue} money={!!heroIsMoney} />
                <span className="db-hero-figure-foot">
                  <Delta change={heroChange} current={heroValue} vs={vs} onDark />
                  <span>vs {vs}</span>
                </span>
              </div>
            )}
          </div>

          <div className="db-hero-right">
            {ins && col && inv && (
              <div className="db-hero-meter">
                <div className="db-hero-meter-top">
                  <span className="db-hero-meter-label">Collected this period</span>
                  <b>{inrCompact(col.amount)}</b>
                </div>
                <div className="db-hero-track" role="img" aria-label={`${pct(collectedRate, 0)} of this period's invoices are paid`}>
                  <span style={{ width: `${Math.min(100, collectedRate || 0)}%` }} />
                </div>
                <div className="db-hero-meter-foot">
                  <span>{pct(collectedRate, 0)} of this period's invoices paid</span>
                  {rec && <span>{inrCompact(rec.total)} outstanding</span>}
                </div>
              </div>
            )}
            <div className="db-hero-stats">
              {ins && isum && <HeroStat label="Customers billed" value={count(data.top_customers?.customers_billed || 0)} />}
              {ins && inv && inv.count > 0 && <HeroStat label="Avg. invoice" value={inrCompact(inv.amount / inv.count)} />}
              {data.access.quotations && snapshot.pipeline_value !== undefined && <HeroStat label="Open pipeline" value={inrCompact(snapshot.pipeline_value)} />}
              {!ins && data.access.customers && <HeroStat label="Customers" value={count(snapshot.customers_total)} />}
            </div>
            <div className="db-hero-btns">
              {data.access.quotations && (
                <button className="db-btn glass" onClick={() => navigate("/app/quotation")}>
                  <PlusOutlined /> Quotation
                </button>
              )}
              {data.access.invoices && (
                <button className="db-btn white" onClick={() => navigate("/app/invoice")}>
                  <FileDoneOutlined /> Invoices
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <FilterBar
        preset={preset}
        custom={custom}
        onPreset={setPreset}
        onCustom={setCustom}
        compare={{ from: data.range.prev_from, to: data.range.prev_to }}
        loading={loading}
        updatedAt={data.generated_at}
        onRefresh={load}
        today={today}
      />

      {error && (
        <div className="db-banner-error">
          {error.message}. Showing the last figures loaded. <button onClick={load}>Retry</button>
        </div>
      )}

      <main className="db-main">
        {nothingVisible ? (
          <Empty icon={<DashboardOutlined />} title="Nothing to show yet" sub="Your role doesn't include any of the areas this dashboard summarises. Ask an admin for access to invoices, quotations or other modules." />
        ) : (
          <>
            {tiles.length > 0 && <div className="db-tiles">{tiles}</div>}
            <Row spans={[8, 4]}>{[trendCard, funnelCard]}</Row>
            <Row spans={[4, 4, 4]}>{[receivablesCard, statusCard, modesCard]}</Row>
            <Row spans={[6, 6]}>{[customersCard, productsCard]}</Row>
            <Row spans={[8, 4]}>{[heatCard, gstCard]}</Row>
            <Row spans={[6, 6]}>{[challanCard, stockCard]}</Row>
            {addOns.some(Boolean) && (
              <>
                <div className="db-section-head">Workspace</div>
                <Row spans={[4, 4, 4]}>{addOns}</Row>
              </>
            )}
            <Row spans={[12]}>{[recentCard]}</Row>
          </>
        )}
      </main>
    </div>
  );
};

// ── small pieces ─────────────────────────────────────────────────────────────

const agingColor = (k: string) =>
  k === "current" ? "var(--db-good)" : k === "d30" ? "var(--db-warn)" : k === "d60" ? "var(--db-serious)" : "var(--db-critical)";
const agingIcon = (k: string) =>
  k === "current" ? <CheckCircleFilled /> : k === "d30" ? <ClockCircleFilled /> : <ExclamationCircleFilled />;

const HeroNumber: React.FC<{ value: number; money: boolean }> = ({ value, money }) => {
  const v = useCountUp(value);
  return <div className="db-hero-number">{money ? inr(Math.round(v)) : count(Math.round(v))}</div>;
};

const HeroStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="db-hero-stat">
    <b>{value}</b>
    <span>{label}</span>
  </div>
);

const Skeleton: React.FC = () => (
  <div className="db-root">
    <div className="db-hero skeleton">
      <div className="db-hero-grid" />
      <div className="db-hero-inner">
        <div className="db-hero-left">
          <div className="db-sk w30" />
          <div className="db-sk w50 tall" />
          <div className="db-sk w40 huge" />
        </div>
      </div>
    </div>
    <div className="db-main">
      <div className="db-tiles">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="db-stat sk" style={{ ["--i" as any]: i }} />
        ))}
      </div>
      <div className="db-row">
        <div className="db-cell" style={{ gridColumn: "span 8" }}><div className="db-card sk tall" /></div>
        <div className="db-cell" style={{ gridColumn: "span 4" }}><div className="db-card sk tall" /></div>
      </div>
    </div>
  </div>
);

const NoAccess: React.FC<{ status?: number; message: string; onRetry: () => void }> = ({ status, message, onRetry }) => {
  const user = (() => {
    try {
      return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.USER_DETAILS) || "{}");
    } catch {
      return {};
    }
  })();
  return (
    <div className="db-root">
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              {greeting()}
              {user?.firstName ? `, ${user.firstName}` : ""} 👋
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon"><DashboardOutlined /></span>
              Welcome to SameBook
            </div>
            <div className="db-hero-sub">
              {status === 403
                ? "The business dashboard isn't part of your role. Use the menu to open the areas you work in."
                : message}
            </div>
            {status !== 403 && (
              <button className="db-btn white" style={{ marginTop: 16 }} onClick={onRetry}>
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
