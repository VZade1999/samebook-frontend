import React from "react";
import dayjs from "dayjs";
import { Tooltip } from "antd";
import {
  AlertOutlined,
  BarChartOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  EditFilled,
  FieldTimeOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FunnelPlotOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { AsOfToday, Card, Delta, Empty, StatTile, useCountUp } from "@/modules/dashboard/components/Bits";
import SegmentBar from "@/modules/dashboard/components/charts/SegmentBar";
import RankedList from "@/modules/dashboard/components/charts/RankedList";
import MonthBars from "./MonthBars";
import { STAGE_META, count, inr, inrCompact, pct } from "./shared";
import type { QuotationSummaryData } from "./types";

const rangeText = (from: string, to: string) => {
  const a = dayjs(from);
  const b = dayjs(to);
  return a.isSame(b, "day") ? a.format("D MMM") : `${a.format("D")}–${b.format("D MMM")}`;
};

const HeroNumber: React.FC<{ value: number }> = ({ value }) => {
  const v = useCountUp(value);
  return <div className="db-hero-number">{inr(Math.round(v))}</div>;
};

const HeroStat: React.FC<{ label: string; value: string; onClick?: () => void }> = ({ label, value, onClick }) => (
  <div className="db-hero-stat" role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}
    onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}>
    <b>{value}</b>
    <span>{label}</span>
  </div>
);

// ── Hero ─────────────────────────────────────────────────────────────────────

export const QuotationHero: React.FC<{
  s: QuotationSummaryData | null;
  failed: boolean;
  companyName?: string;
  canCreate: boolean;
  canInvoices: boolean;
  onNew: () => void;
  onFilter: (key: string) => void;
  onInvoices: () => void;
  onRetry: () => void;
}> = ({ s, failed, companyName, canCreate, canInvoices, onNew, onFilter, onInvoices, onRetry }) => (
  <div className="db-hero qp-hero">
    <div className="db-hero-orb a" />
    <div className="db-hero-orb b" />
    <div className="db-hero-orb c" />
    <div className="db-hero-grid" />
    <div className="db-hero-inner">
      <div className="db-hero-left">
        <div className="db-hero-eyebrow">
          <span className="qp-live" aria-hidden />
          Sales · Quotations
          {companyName && <span className="db-hero-company">{companyName}</span>}
        </div>
        <h1 className="db-hero-title" style={{ margin: "8px 0 0" }}>
          <span className="db-hero-icon">
            <FileTextOutlined />
          </span>
          Quotations
        </h1>
        <div className="db-hero-sub">Create, share and turn quotations into invoices. Every figure here is live.</div>
        {s ? (
          <div className="db-hero-figure">
            <span className="db-hero-figure-label">Quoted this month · {rangeText(s.this_month.from, s.this_month.to)}</span>
            <HeroNumber value={s.this_month.value} />
            <span className="db-hero-figure-foot">
              <Delta change={s.value_change} current={s.this_month.value} vs={rangeText(s.last_month.from, s.last_month.to)} onDark />
              <span>
                vs {rangeText(s.last_month.from, s.last_month.to)} · {count(s.this_month.count)} quotation{s.this_month.count === 1 ? "" : "s"}
              </span>
            </span>
          </div>
        ) : failed ? (
          <div className="db-hero-figure">
            <span className="db-hero-figure-label">Figures didn't load</span>
            <button className="db-btn glass" style={{ alignSelf: "flex-start", marginTop: 6 }} onClick={onRetry}>
              <ReloadOutlined /> Try again
            </button>
          </div>
        ) : (
          <div className="db-hero-figure" aria-busy>
            <div className="db-sk w30" />
            <div className="db-sk w50 tall" />
          </div>
        )}
      </div>

      <div className="db-hero-right">
        {s && (
          <div className="db-hero-meter">
            <div className="db-hero-meter-top">
              <span className="db-hero-meter-label">Converted to invoices</span>
              <b>{inrCompact(s.stages.invoiced.value)}</b>
            </div>
            <div className="qp-hero-meter-big">
              <b>{pct(s.win_rate)}</b>
              <span>of all quotations · win rate</span>
            </div>
            <div className="db-hero-track" role="img" aria-label={`${pct(s.win_rate)} of quotations became invoices`}>
              <span style={{ width: `${Math.min(100, s.win_rate || 0)}%` }} />
            </div>
            <div className="db-hero-meter-foot">
              <span>{count(s.stages.invoiced.count)} invoiced</span>
              <span>{s.acceptance_rate != null ? `${pct(s.acceptance_rate)} of shared ones approved` : `${count(s.total.count)} in total`}</span>
            </div>
          </div>
        )}
        {s && (
          <div className="db-hero-stats">
            <HeroStat label="Open pipeline" value={inrCompact(s.pipeline.value)} />
            <HeroStat label="Awaiting reply" value={count(s.stages.sent.count)} onClick={() => onFilter("SENT")} />
            <HeroStat label="Ready to invoice" value={count(s.stages.approved.count)} onClick={() => onFilter("APPROVED")} />
          </div>
        )}
        <div className="db-hero-btns">
          {canCreate && (
            <button className="db-btn white" onClick={onNew}>
              <PlusOutlined /> New quotation
            </button>
          )}
          {canInvoices && (
            <button className="db-btn glass" onClick={onInvoices}>
              <FileDoneOutlined /> Invoices
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

// ── KPI tiles ────────────────────────────────────────────────────────────────

export const QuotationTiles: React.FC<{ s: QuotationSummaryData | null; onFilter: (key: string) => void }> = ({ s, onFilter }) => {
  if (!s) {
    return (
      <div className="db-tiles" style={{ marginTop: 18 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="db-stat sk" style={{ ["--i" as any]: i }} />
        ))}
      </div>
    );
  }
  const st = s.stages;
  return (
    <div className="db-tiles" style={{ marginTop: 18 }}>
      <StatTile index={0} icon={<FileTextOutlined />} tint="var(--db-s7)" label="Total quoted" value={inrCompact(s.total.value)}
        sub={`${count(s.total.count)} quotations · avg ${inrCompact(s.avg_value)}`} spark={s.months.map((m) => m.value)} onClick={() => onFilter("")} />
      <StatTile index={1} icon={<EditFilled />} tint="var(--db-neutral)" label="Drafts" value={count(st.draft.count)}
        sub={`${inrCompact(st.draft.value)} not shared yet`} onClick={() => onFilter("DRAFT")} />
      <StatTile index={2} icon={<SendOutlined />} tint="var(--db-s1)" label="Awaiting reply" value={count(st.sent.count)}
        sub={`${inrCompact(st.sent.value)} with customers`} onClick={() => onFilter("SENT")} />
      <StatTile index={3} icon={<CheckCircleFilled />} tint="var(--db-s3)" label="Ready to invoice" value={count(st.approved.count)}
        sub={`${inrCompact(st.approved.value)} approved`} onClick={() => onFilter("APPROVED")} />
      <StatTile index={4} icon={<FileDoneOutlined />} tint="var(--db-good)" label="Invoiced" value={count(st.invoiced.count)}
        sub={`${inrCompact(st.invoiced.value)} won`} spark={s.months.map((m) => m.invoiced_count)} onClick={() => onFilter("INVOICED")} />
      <StatTile index={5} icon={<FieldTimeOutlined />} tint="var(--db-serious)" label={`Expiring in ${s.expiring.days} days`} value={count(s.expiring.count)}
        sub={s.expiring.count ? `${inrCompact(s.expiring.value)} at stake` : "Nothing due this week"} onClick={() => onFilter("EXPIRING")} />
    </div>
  );
};

// ── Insights ─────────────────────────────────────────────────────────────────

export const QuotationInsights: React.FC<{
  s: QuotationSummaryData;
  open: boolean;
  onToggle: () => void;
  onFilter: (key: string) => void;
  onOpenQuotation: (id: number) => void;
  onCustomer: (name: string) => void;
  /** Close an expiring quotation straight from the list (omit = no permission). */
  onCloseQuotation?: (q: { id: number; quotation_number: string; customer_name: string; grand_total: number; validity_date: string }) => void;
}> = ({ s, open, onToggle, onFilter, onOpenQuotation, onCustomer, onCloseQuotation }) => {
  const st = s.stages;
  const monthsTable = (
    <table className="db-table">
      <thead>
        <tr>
          <th>Month</th>
          <th>Quotations</th>
          <th>Quoted</th>
          <th>Invoiced</th>
          <th>Became invoices</th>
        </tr>
      </thead>
      <tbody>
        {s.months.map((m) => (
          <tr key={m.key}>
            <td>{dayjs(`${m.key}-01`).format("MMM YYYY")}</td>
            <td>{count(m.count)}</td>
            <td>{inr(m.value)}</td>
            <td>{count(m.invoiced_count)}</td>
            <td>{inr(m.invoiced_value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const sixMonths = s.months.reduce((a, m) => ({ v: a.v + m.value, i: a.i + m.invoiced_value }), { v: 0, i: 0 });

  const stageSegments = [
    { key: "draft", label: STAGE_META.draft.label, value: st.draft.value, color: "var(--db-o1)", note: count(st.draft.count) },
    { key: "sent", label: STAGE_META.sent.label, value: st.sent.value, color: "var(--db-o2)", note: count(st.sent.count) },
    { key: "approved", label: STAGE_META.approved.label, value: st.approved.value, color: "var(--db-o3)", note: count(st.approved.count) },
    { key: "invoiced", label: STAGE_META.invoiced.label, value: st.invoiced.value, color: "var(--db-o4)", icon: <CheckCircleFilled />, note: count(st.invoiced.count) },
    ...(st.rejected.count ? [{ key: "rejected", label: STAGE_META.rejected.label, value: st.rejected.value, color: "var(--db-critical)", icon: <CloseCircleFilled />, note: count(st.rejected.count) }] : []),
    ...(st.expired.count ? [{ key: "expired", label: STAGE_META.expired.label, value: st.expired.value, color: "var(--db-neutral)", icon: <ClockCircleFilled />, note: count(st.expired.count) }] : []),
  ];

  return (
    <>
      <div className="qp-section-head">
        <span>Insights</span>
        <button type="button" className={`qp-link-btn${open ? "" : " closed"}`} onClick={onToggle} aria-expanded={open}>
          {open ? "Hide" : "Show"} <DownOutlined />
        </button>
      </div>
      {open && (
        <>
          <div className="db-row">
            <div className="db-cell" style={{ gridColumn: "span 7" }}>
              <Card icon={<BarChartOutlined />} tint="var(--db-o3)" title="Quoted per month" sub="Last 6 months, and how much of it became invoices" table={monthsTable}>
                <div className="db-legend">
                  <span>
                    <i className="qp-swatch" style={{ background: "var(--db-o2)" }} />
                    Not invoiced yet <b>{inrCompact(sixMonths.v - sixMonths.i)}</b>
                  </span>
                  <span>
                    <i className="qp-swatch" style={{ background: "var(--db-o4)" }} />
                    Became invoices <b>{inrCompact(sixMonths.i)}</b>
                  </span>
                </div>
                <MonthBars months={s.months} />
              </Card>
            </div>
            <div className="db-cell" style={{ gridColumn: "span 5" }}>
              <Card icon={<FunnelPlotOutlined />} tint="var(--db-o3)" title="Where quotations stand" sub="Every quotation by stage, by value">
                <div className="db-figure">
                  <b>{inr(s.open.value)}</b>
                  <span>
                    still open across {count(s.open.count)} quotation{s.open.count === 1 ? "" : "s"}
                  </span>
                </div>
                <SegmentBar ariaLabel="Quotation value by stage" format={inrCompact} segments={stageSegments} />
                {s.acceptance_rate != null && (
                  <div className="db-mini-foot">
                    <span>
                      <b>{pct(s.acceptance_rate)}</b> of quotations shared with customers were approved
                    </span>
                  </div>
                )}
                {s.close_reasons?.length > 0 && (
                  <ul className="qp-reasons" aria-label="Why quotations were closed">
                    <li className="qp-reasons-title">Why quotations were closed</li>
                    {s.close_reasons.slice(0, 4).map((r) => (
                      <li key={`${r.outcome}-${r.reason}`}>
                        {r.outcome === "REJECTED" ? <CloseCircleFilled style={{ color: "var(--db-critical)" }} /> : <ClockCircleFilled style={{ color: "var(--db-neutral)" }} />}
                        <span title={r.label}>{r.label}</span>
                        <b>{count(r.count)}</b>
                        <em>{inrCompact(r.value)}</em>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <div className="db-row">
            <div className="db-cell" style={{ gridColumn: "span 5" }}>
              <Card icon={<AlertOutlined />} tint="var(--db-serious)" title="Needs attention" badge={<AsOfToday />} sub={`Open quotations ending in the next ${s.expiring.days} days`}
                link={s.expiring.count > s.expiring.items.length ? { label: `All ${count(s.expiring.count)} expiring`, onClick: () => onFilter("EXPIRING") } : undefined}>
                {s.expiring.items.length ? (
                  <ul className="qp-due">
                    {s.expiring.items.map((it, i) => (
                      <li key={it.id}>
                        <button type="button" className="qp-due-open" onClick={() => onOpenQuotation(it.id)} style={{ ["--i" as any]: i }}>
                          <span className={`qp-due-days${it.days_left <= 0 ? " today" : ""}`}>
                            <b>{it.days_left <= 0 ? "Today" : it.days_left}</b>
                            {it.days_left > 0 && <small>{it.days_left === 1 ? "day" : "days"}</small>}
                          </span>
                          <span className="qp-due-main">
                            <b>{it.customer_name}</b>
                            <small>
                              {it.quotation_number} · {STAGE_META[it.stage]?.label || "Open"}
                            </small>
                          </span>
                          <span className="qp-due-amt">{inrCompact(it.grand_total)}</span>
                        </button>
                        {onCloseQuotation && (
                          <Tooltip title="Close with the customer's feedback">
                            <button
                              type="button"
                              className="qp-due-close"
                              aria-label={`Close quotation ${it.quotation_number}`}
                              onClick={() => onCloseQuotation(it)}
                            >
                              <StopOutlined />
                            </button>
                          </Tooltip>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty icon={<CheckCircleFilled />} title="Nothing expires this week" sub="Open quotations ending in the next 7 days show up here." />
                )}
                {s.lapsed.count > 0 && (
                  <button type="button" className="db-callout" onClick={() => onFilter("LAPSED")}>
                    <ClockCircleFilled />
                    <span>
                      <b>{count(s.lapsed.count)}</b> open quotation{s.lapsed.count === 1 ? " is" : "s are"} past the validity date ({inrCompact(s.lapsed.value)}) — review them: extend the date, or close with the customer's feedback
                    </span>
                  </button>
                )}
              </Card>
            </div>
            <div className="db-cell" style={{ gridColumn: "span 7" }}>
              <Card icon={<TrophyOutlined />} tint="var(--db-s4)" title="Top customers" sub="By value quoted · click one to see their quotations">
                {s.top_customers.length ? (
                  <RankedList
                    format={inrCompact}
                    total={s.total.value}
                    items={s.top_customers.map((c) => ({
                      key: String(c.id ?? c.name),
                      name: c.name,
                      value: c.value,
                      onClick: () => onCustomer(c.name),
                      meta: (
                        <span>
                          {count(c.count)} quotation{c.count === 1 ? "" : "s"}
                          {c.invoiced_value > 0 && <> · {inrCompact(c.invoiced_value)} invoiced</>}
                        </span>
                      ),
                    }))}
                  />
                ) : (
                  <Empty icon={<TrophyOutlined />} title="No quotations yet" />
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
};
