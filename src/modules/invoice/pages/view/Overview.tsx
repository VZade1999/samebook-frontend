import React from "react";
import dayjs from "dayjs";
import { Tooltip } from "antd";
import {
  AlertOutlined,
  BarChartOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  DownOutlined,
  ExclamationCircleFilled,
  FieldTimeOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  MinusCircleFilled,
  PieChartFilled,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { AsOfToday, Card, Delta, Empty, StatTile, useCountUp } from "@/modules/dashboard/components/Bits";
import SegmentBar from "@/modules/dashboard/components/charts/SegmentBar";
import RankedList from "@/modules/dashboard/components/charts/RankedList";
import MonthPairs from "./MonthPairs";
import { STATE_META, count, inr, inrCompact, pct } from "./shared";
import type { InvoiceSummaryData } from "./types";

const rangeText = (from: string, to: string) => {
  const a = dayjs(from);
  const b = dayjs(to);
  return a.isSame(b, "day") ? a.format("D MMM") : `${a.format("D")}–${b.format("D MMM")}`;
};

const HeroNumber: React.FC<{ value: number }> = ({ value }) => {
  const v = useCountUp(value);
  return <div className="db-hero-number">{inr(Math.round(v))}</div>;
};

const HeroStat: React.FC<{ label: string; value: React.ReactNode; onClick?: () => void; title?: string }> = ({ label, value, onClick, title }) => (
  <div
    className="db-hero-stat"
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    title={title}
    style={onClick ? { cursor: "pointer" } : undefined}
    onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
  >
    <b>{value}</b>
    <span>{label}</span>
  </div>
);

// Aging colours follow the dashboard's receivables card: status steps, each
// with its own icon so colour never carries the meaning alone.
export const agingColor = (k: string) =>
  k === "current" ? "var(--db-good)" : k === "d30" ? "var(--db-warn)" : k === "d60" ? "var(--db-serious)" : "var(--db-critical)";
const agingIcon = (k: string) => (k === "current" ? <CheckCircleFilled /> : k === "d30" ? <ClockCircleFilled /> : <ExclamationCircleFilled />);

// ── Hero ─────────────────────────────────────────────────────────────────────

export const InvoiceHero: React.FC<{
  s: InvoiceSummaryData | null;
  /** Money figures need invoices.insides; without it the hero is just the page title. */
  insights: boolean;
  failed: boolean;
  companyName?: string;
  canCreate: boolean;
  canQuotations: boolean;
  onNew: () => void;
  onFilter: (key: string) => void;
  onQuotations: () => void;
  onRetry: () => void;
}> = ({ s, insights, failed, companyName, canCreate, canQuotations, onNew, onFilter, onQuotations, onRetry }) => (
  <div className="db-hero ip-hero">
    <div className="db-hero-orb a" />
    <div className="db-hero-orb b" />
    <div className="db-hero-orb c" />
    <div className="db-hero-grid" />
    <div className="db-hero-inner">
      <div className="db-hero-left">
        <div className="db-hero-eyebrow">
          <span className="qp-live" aria-hidden />
          Sales · Invoices
          {companyName && <span className="db-hero-company">{companyName}</span>}
        </div>
        <h1 className="db-hero-title" style={{ margin: "8px 0 0" }}>
          <span className="db-hero-icon">
            <FileDoneOutlined />
          </span>
          Invoices
        </h1>
        <div className="db-hero-sub">Bill customers, record payments and follow up on what's due. Every figure here is live.</div>
        {!insights ? null : s ? (
          <div className="db-hero-figure">
            <span className="db-hero-figure-label">Owed to you · as of today</span>
            <HeroNumber value={s.outstanding.value} />
            <span className="db-hero-figure-foot">
              {s.overdue.count > 0 ? (
                <button type="button" className="ip-hero-late" onClick={() => onFilter("OVERDUE")}>
                  <ExclamationCircleFilled /> {inrCompact(s.overdue.value)} overdue
                </button>
              ) : (
                <span className="ip-hero-ok">
                  <CheckCircleFilled /> Nothing overdue
                </span>
              )}
              <span>
                across {count(s.outstanding.count)} open invoice{s.outstanding.count === 1 ? "" : "s"}
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
        {insights && s && (
          <div className="db-hero-meter">
            <div className="db-hero-meter-top">
              <span className="db-hero-meter-label">Collected so far</span>
              <b>{inrCompact(s.total.paid)}</b>
            </div>
            <div className="qp-hero-meter-big">
              <b>{pct(s.collection_rate)}</b>
              <span>of everything billed has come in</span>
            </div>
            <div className="db-hero-track" role="img" aria-label={`${pct(s.collection_rate)} of the amount billed has been collected`}>
              <span style={{ width: `${Math.min(100, s.collection_rate || 0)}%` }} />
            </div>
            <div className="db-hero-meter-foot">
              <span>{inrCompact(s.total.value)} billed</span>
              <span>{inrCompact(s.outstanding.value)} still due</span>
            </div>
          </div>
        )}
        {insights && s && (
          <div className="db-hero-stats">
            <HeroStat
              label={`Billed ${rangeText(s.this_month.from, s.this_month.to)}`}
              value={
                <>
                  {inrCompact(s.this_month.billed.value)} <Delta change={s.billed_change} current={s.this_month.billed.value} vs={rangeText(s.last_month.from, s.last_month.to)} onDark />
                </>
              }
              title={`${count(s.this_month.billed.count)} invoices; ${inr(s.last_month.billed.value)} in ${rangeText(s.last_month.from, s.last_month.to)}`}
            />
            <HeroStat
              label="Collected this month"
              value={
                <>
                  {inrCompact(s.this_month.collected.value)} <Delta change={s.collected_change} current={s.this_month.collected.value} vs={rangeText(s.last_month.from, s.last_month.to)} onDark />
                </>
              }
              title={`${count(s.this_month.collected.count)} payments; ${inr(s.last_month.collected.value)} in ${rangeText(s.last_month.from, s.last_month.to)}`}
            />
            <HeroStat label="Due this week" value={count(s.due_soon.count)} onClick={() => onFilter("DUE_SOON")} />
          </div>
        )}
        <div className="db-hero-btns">
          {canCreate && (
            <button className="db-btn white" onClick={onNew}>
              <PlusOutlined /> New invoice
            </button>
          )}
          {canQuotations && (
            <button className="db-btn glass" onClick={onQuotations}>
              <FileTextOutlined /> Quotations
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

// ── KPI tiles ────────────────────────────────────────────────────────────────

export const InvoiceTiles: React.FC<{ s: InvoiceSummaryData | null; onFilter: (key: string) => void }> = ({ s, onFilter }) => {
  if (!s) {
    return (
      <div className="db-tiles" style={{ marginTop: 18 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="db-stat sk" style={{ ["--i" as any]: i }} />
        ))}
      </div>
    );
  }
  const st = s.states;
  return (
    <div className="db-tiles" style={{ marginTop: 18 }}>
      <StatTile index={0} icon={<FileDoneOutlined />} tint="var(--db-s7)" label="Total billed" value={inrCompact(s.total.value)}
        sub={`${count(s.total.count)} invoices`} spark={s.months.map((m) => m.billed)} onClick={() => onFilter("")} />
      <StatTile index={1} icon={<MinusCircleFilled />} tint="var(--db-s1)" label={STATE_META.unpaid.label} value={count(st.unpaid.count)}
        sub={`${inrCompact(st.unpaid.balance)} not received yet`} onClick={() => onFilter("UNPAID")} />
      <StatTile index={2} icon={<PieChartFilled />} tint="var(--db-s5)" label={STATE_META.partial.label} value={count(st.partial.count)}
        sub={`${inrCompact(st.partial.balance)} still due`} onClick={() => onFilter("PARTIAL")} />
      <StatTile index={3} icon={<CheckCircleFilled />} tint="var(--db-good)" label="Paid in full" value={count(st.paid.count)}
        sub={`${inrCompact(st.paid.value)} settled`} spark={s.months.map((m) => m.collected)} onClick={() => onFilter("PAID")} />
      <StatTile index={4} icon={<ExclamationCircleFilled />} tint="var(--db-critical)" label="Overdue" value={count(s.overdue.count)}
        sub={s.overdue.count ? `${inrCompact(s.overdue.value)} past the due date` : "Nothing is late"} onClick={() => onFilter("OVERDUE")} />
      <StatTile index={5} icon={<FieldTimeOutlined />} tint="var(--db-serious)" label={`Due in ${s.due_soon.days} days`} value={count(s.due_soon.count)}
        sub={s.due_soon.count ? `${inrCompact(s.due_soon.value)} falling due` : "Nothing due this week"} onClick={() => onFilter("DUE_SOON")} />
    </div>
  );
};

// ── Insights ─────────────────────────────────────────────────────────────────

export const InvoiceInsights: React.FC<{
  s: InvoiceSummaryData;
  open: boolean;
  onToggle: () => void;
  onFilter: (key: string) => void;
  onOpenInvoice: (id: number) => void;
  onCustomer: (name: string) => void;
  /** Record a payment straight from the list (omit = no permission). */
  onPay?: (item: InvoiceSummaryData["attention"][number]) => void;
}> = ({ s, open, onToggle, onFilter, onOpenInvoice, onCustomer, onPay }) => {
  const sixMonths = s.months.reduce((a, m) => ({ b: a.b + m.billed, c: a.c + m.collected }), { b: 0, c: 0 });
  const monthsTable = (
    <table className="db-table">
      <thead>
        <tr>
          <th>Month</th>
          <th>Invoices</th>
          <th>Billed</th>
          <th>Payments</th>
          <th>Collected</th>
        </tr>
      </thead>
      <tbody>
        {s.months.map((m) => (
          <tr key={m.key}>
            <td>{dayjs(`${m.key}-01`).format("MMM YYYY")}</td>
            <td>{count(m.billed_count)}</td>
            <td>{inr(m.billed)}</td>
            <td>{count(m.collected_count)}</td>
            <td>{inr(m.collected)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const late = s.attention.filter((a) => a.days < 0).length;

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
              <Card icon={<BarChartOutlined />} tint="var(--db-s1)" title="Billed vs collected" sub="Last 6 months · payments count in the month they arrived" table={monthsTable}>
                <div className="db-legend">
                  <span>
                    <i className="qp-swatch" style={{ background: "var(--db-s1)" }} />
                    Billed <b>{inrCompact(sixMonths.b)}</b>
                  </span>
                  <span>
                    <i className="qp-swatch" style={{ background: "var(--db-s2)" }} />
                    Collected <b>{inrCompact(sixMonths.c)}</b>
                  </span>
                </div>
                <MonthPairs months={s.months} />
                {s.payment_modes.length > 0 && (
                  <div className="ip-modes" aria-label="How customers paid in the last 6 months">
                    <span className="ip-modes-title">How customers paid</span>
                    {s.payment_modes.map((m) => (
                      <span key={m.mode} className="ip-mode-chip">
                        {m.label} <b>{inrCompact(m.value)}</b>
                        <em>{pct(m.share, 0)}</em>
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </div>
            <div className="db-cell" style={{ gridColumn: "span 5" }}>
              <Card icon={<WalletOutlined />} tint="var(--db-serious)" title="Money owed to you" badge={<AsOfToday />} sub="Open balances by how late they are">
                <div className="db-figure">
                  <b>{inr(s.outstanding.value)}</b>
                  <span>
                    owed across {count(s.outstanding.count)} invoice{s.outstanding.count === 1 ? "" : "s"}
                  </span>
                </div>
                <SegmentBar
                  ariaLabel="Money owed by how late it is"
                  format={inrCompact}
                  segments={s.aging.map((b) => ({
                    key: b.key,
                    label: b.label,
                    value: b.value,
                    color: agingColor(b.key),
                    icon: agingIcon(b.key),
                    note: `${count(b.count)} inv.`,
                  }))}
                />
                {(s.avg_days_to_pay !== null || s.collection_rate !== null) && (
                  <div className="db-mini-foot">
                    {s.avg_days_to_pay !== null && (
                      <span>
                        Customers took <b>{s.avg_days_to_pay} day{s.avg_days_to_pay === 1 ? "" : "s"}</b> on average to pay in full ({count(s.settled_count)} invoice{s.settled_count === 1 ? "" : "s"}, last 6 months)
                      </span>
                    )}
                  </div>
                )}
                {s.no_due_date.count > 0 && (
                  <button type="button" className="db-callout" onClick={() => onFilter("NO_DUE")}>
                    <ClockCircleFilled />
                    <span>
                      <b>{count(s.no_due_date.count)}</b> open invoice{s.no_due_date.count === 1 ? " has" : "s have"} no due date ({inrCompact(s.no_due_date.value)}), so they can never show as overdue
                    </span>
                  </button>
                )}
              </Card>
            </div>
          </div>

          <div className="db-row">
            <div className="db-cell" style={{ gridColumn: "span 5" }}>
              <Card
                icon={<AlertOutlined />}
                tint="var(--db-critical)"
                title="Needs attention"
                badge={<AsOfToday />}
                sub={`Overdue, or due in the next ${s.due_soon.days} days`}
                link={
                  s.overdue.count + s.due_soon.count > s.attention.length
                    ? { label: s.overdue.count ? `All ${count(s.overdue.count)} overdue` : `All ${count(s.due_soon.count)} due this week`, onClick: () => onFilter(s.overdue.count ? "OVERDUE" : "DUE_SOON") }
                    : undefined
                }
              >
                {s.attention.length ? (
                  <ul className="qp-due" aria-label={`${late} overdue`}>
                    {s.attention.map((it, i) => (
                      <li key={it.id}>
                        <button type="button" className="qp-due-open" onClick={() => onOpenInvoice(it.id)} style={{ ["--i" as any]: i }}>
                          <span className={`qp-due-days${it.days < 0 ? " late" : it.days === 0 ? " today" : ""}`}>
                            <b>{it.days === 0 ? "Today" : Math.abs(it.days)}</b>
                            {it.days !== 0 && <small>{it.days < 0 ? "days late" : Math.abs(it.days) === 1 ? "day" : "days"}</small>}
                          </span>
                          <span className="qp-due-main">
                            <b>{it.customer_name}</b>
                            <small>
                              {it.invoice_number} · {STATE_META[it.state]?.label || "Open"} · due {dayjs(it.due_date).format("D MMM")}
                            </small>
                          </span>
                          <span className="qp-due-amt">{inrCompact(it.balance_amount)}</span>
                        </button>
                        {onPay && (
                          <Tooltip title="Record a payment">
                            <button type="button" className="qp-due-close ip-due-pay" aria-label={`Record a payment for ${it.invoice_number}`} onClick={() => onPay(it)}>
                              ₹
                            </button>
                          </Tooltip>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty icon={<CheckCircleFilled />} title="Nothing overdue or due this week" sub="Invoices past their due date, or due in the next 7 days, show up here." />
                )}
              </Card>
            </div>
            <div className="db-cell" style={{ gridColumn: "span 7" }}>
              <Card icon={<TeamOutlined />} tint="var(--db-s4)" title="Who owes you most" sub="Open balances by customer · click one to see their invoices">
                {s.top_debtors.length ? (
                  <RankedList
                    format={inrCompact}
                    total={s.outstanding.value}
                    items={s.top_debtors.map((c) => ({
                      key: String(c.id ?? c.name),
                      name: c.name,
                      value: c.balance,
                      onClick: () => onCustomer(c.name),
                      meta: (
                        <span>
                          {count(c.count)} invoice{c.count === 1 ? "" : "s"}
                          {c.overdue > 0 ? <> · <span className="ip-late-text">{inrCompact(c.overdue)} overdue</span></> : c.oldest_due ? <> · next due {dayjs(c.oldest_due).format("D MMM")}</> : null}
                        </span>
                      ),
                    }))}
                  />
                ) : (
                  <Empty icon={<CheckCircleFilled />} title="Nobody owes you anything right now" sub="Customers with unpaid balances show up here." />
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
};
