import React from "react";
import dayjs from "dayjs";
import { Popconfirm, Spin, Tooltip } from "antd";
import {
  BarChartOutlined,
  CarFilled,
  CarOutlined,
  CheckCircleFilled,
  CheckOutlined,
  DownOutlined,
  EditFilled,
  ExclamationCircleFilled,
  FieldTimeOutlined,
  FileDoneOutlined,
  FileSyncOutlined,
  FileTextOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { AsOfToday, Card, Delta, Empty, StatTile, useCountUp } from "@/modules/dashboard/components/Bits";
import RankedList from "@/modules/dashboard/components/charts/RankedList";
import MonthColumns from "./MonthColumns";
import { dispatchHint } from "./ChallanList";
import { count, inr, inrCompact, pct, relDays } from "./shared";
import type { ChallanSummaryData, DraftItem, ReadyItem } from "./types";

const rangeText = (from: string, to: string) => {
  const a = dayjs(from);
  const b = dayjs(to);
  return a.isSame(b, "day") ? a.format("D MMM") : `${a.format("D")}–${b.format("D MMM")}`;
};

const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

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

/** Heading of one group on the dispatch desk, with a link when more are waiting than shown. */
const DeskHead: React.FC<{ label: string; n: number; shown: number; onAll: () => void }> = ({ label, n, shown, onAll }) => (
  <div className="dc-desk-head">
    <span>
      {label} <em>{count(n)}</em>
    </span>
    {n > shown && (
      <button type="button" className="qp-link-btn" onClick={onAll}>
        See all {count(n)}
      </button>
    )}
  </div>
);

// ── Hero ─────────────────────────────────────────────────────────────────────

export const ChallanHero: React.FC<{
  s: ChallanSummaryData | null;
  failed: boolean;
  companyName?: string;
  canCreate: boolean;
  canQuotations: boolean;
  onNew: () => void;
  onFilter: (key: string) => void;
  onQuotations: () => void;
  onRetry: () => void;
  /** Pick one of the approved quotations with goods still to send (omit = no permission). */
  onBacklog?: () => void;
}> = ({ s, failed, companyName, canCreate, canQuotations, onNew, onFilter, onQuotations, onRetry, onBacklog }) => {
  const tm = s?.this_month;
  const confirmedShare = tm && tm.count ? Math.min(100, (tm.confirmed / tm.count) * 100) : 0;
  return (
    <div className="db-hero dc-hero">
      <div className="db-hero-orb a" />
      <div className="db-hero-orb b" />
      <div className="db-hero-orb c" />
      <div className="db-hero-grid" />
      <div className="db-hero-inner">
        <div className="db-hero-left">
          <div className="db-hero-eyebrow">
            <span className="qp-live" aria-hidden />
            Sales · Delivery challans
            {companyName && <span className="db-hero-company">{companyName}</span>}
          </div>
          <h1 className="db-hero-title" style={{ margin: "8px 0 0" }}>
            <span className="db-hero-icon">
              <CarOutlined />
            </span>
            Delivery challans
          </h1>
          <div className="db-hero-sub">Send goods, follow them on the road and turn deliveries into invoices. Every figure here is live.</div>
          {s ? (
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">Delivered, not invoiced yet</span>
              <HeroNumber value={s.to_invoice.value} />
              <span className="db-hero-figure-foot">
                {s.to_invoice.count > 0 ? (
                  <button type="button" className="dc-hero-pill" onClick={() => onFilter("TO_INVOICE")}>
                    <FileSyncOutlined /> {plural(s.to_invoice.count, "challan")} ready to invoice
                  </button>
                ) : (
                  <span className="ip-hero-ok">
                    <CheckCircleFilled /> {s.total.count ? "Every delivery is invoiced" : "No challans yet"}
                  </span>
                )}
                <span>
                  {count(s.on_road.count)} on the road · {count(s.drafts.count)} not sent yet
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
          {s && tm && (
            <div className="db-hero-meter">
              <div className="db-hero-meter-top">
                <span className="db-hero-meter-label">Sent this month</span>
                <b>{inrCompact(tm.value)}</b>
              </div>
              <div className="qp-hero-meter-big">
                <b>{count(tm.count)}</b>
                <span>
                  challan{tm.count === 1 ? "" : "s"} · {count(tm.confirmed)} confirmed delivered
                </span>
              </div>
              <div className="db-hero-track" role="img" aria-label={`${count(tm.confirmed)} of ${count(tm.count)} challans sent this month are confirmed delivered`}>
                <span style={{ width: `${confirmedShare}%` }} />
              </div>
              <div className="db-hero-meter-foot">
                <span>{rangeText(tm.from, tm.to)}</span>
                <span className="dc-hero-delta">
                  <Delta change={s.sent_change} current={tm.count} vs={rangeText(s.last_month.from, s.last_month.to)} onDark /> vs {rangeText(s.last_month.from, s.last_month.to)}
                </span>
              </div>
            </div>
          )}
          {s && (
            <div className="db-hero-stats">
              <HeroStat label="Not sent yet" value={count(s.drafts.count)} onClick={() => onFilter("DRAFT")} />
              <HeroStat label="On the road" value={count(s.on_road.count)} onClick={() => onFilter("DISPATCHED")} />
              <HeroStat
                label={s.backlog.quotations === 1 ? "Quotation to send" : "Quotations to send"}
                value={count(s.backlog.quotations)}
                onClick={onBacklog}
                title={s.backlog.quotations ? `${plural(s.backlog.items, "line")} worth ${inr(s.backlog.value)} still to send on approved quotations` : "Every approved quotation is fully sent"}
              />
            </div>
          )}
          <div className="db-hero-btns">
            {canCreate && (
              <button className="db-btn white" onClick={onNew}>
                <PlusOutlined /> New challan
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
};

// ── KPI tiles ────────────────────────────────────────────────────────────────

export const ChallanTiles: React.FC<{ s: ChallanSummaryData | null; onFilter: (key: string) => void }> = ({ s, onFilter }) => {
  if (!s) {
    return (
      <div className="db-tiles" style={{ marginTop: 18 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="db-stat sk" style={{ ["--i" as any]: i }} />
        ))}
      </div>
    );
  }
  const st = s.statuses;
  const oldest = s.on_road.oldest_days;
  return (
    <div className="db-tiles" style={{ marginTop: 18 }}>
      <StatTile index={0} icon={<CarOutlined />} tint="var(--db-s3)" label="All challans" value={count(s.total.count)}
        sub={`${inrCompact(s.total.value)} of goods`} spark={s.months.map((m) => m.count)} onClick={() => onFilter("")} />
      <StatTile index={1} icon={<EditFilled />} tint="var(--dc-draft)" label="Not sent yet" value={count(st.draft.count)}
        sub={s.drafts.stale ? `${count(s.drafts.stale)} over a week old` : st.draft.count ? `${inrCompact(st.draft.value)} of goods waiting` : "Nothing waiting"}
        onClick={() => onFilter("DRAFT")} />
      <StatTile index={2} icon={<CarFilled />} tint="var(--dc-transit)" label="On the road" value={count(st.dispatched.count)}
        sub={oldest === null ? "Nothing on the road" : oldest === 0 ? "All sent today" : `Oldest sent ${relDays(oldest)} ago`}
        onClick={() => onFilter("DISPATCHED")} />
      <StatTile index={3} icon={<CheckCircleFilled />} tint="var(--dc-delivered)" label="Delivered" value={count(st.delivered.count)}
        sub={`${inrCompact(st.delivered.value)} of goods`} onClick={() => onFilter("DELIVERED")} />
      <StatTile index={4} icon={<FileSyncOutlined />} tint="var(--db-serious)" label="Ready to invoice" value={count(s.to_invoice.count)}
        sub={s.to_invoice.count ? `${inrCompact(s.to_invoice.value)} not billed yet` : "Nothing waiting"} onClick={() => onFilter("TO_INVOICE")} />
      <StatTile index={5} icon={<FileDoneOutlined />} tint="var(--dc-invoiced)" label="Invoiced" value={count(st.invoiced.count)}
        sub={`${inrCompact(st.invoiced.value)} of goods`} onClick={() => onFilter("INVOICED")} />
    </div>
  );
};

// ── Insights ─────────────────────────────────────────────────────────────────

export const ChallanInsights: React.FC<{
  s: ChallanSummaryData;
  open: boolean;
  onToggle: () => void;
  onFilter: (key: string) => void;
  onOpenChallan: (id: number) => void;
  /** Mark an on-the-road challan delivered (omit = no permission). */
  onDeliver?: (item: { id: number; challan_number: string }) => void;
  /** Dispatch a draft from the desk (omit = no permission). */
  onDispatch?: (item: DraftItem) => void;
  /** The challan an action is running for (spinner on its button). */
  deliveringId?: number | null;
  /** Make or link the invoice for a ready challan (omit = no permission). */
  onInvoice?: (item: ReadyItem) => void;
  /** Start a challan from a quotation with goods still to send. */
  onSendQuotation: (quotationId: number, quotationNumber: string) => void;
  /** Everything still to send, in the "new challan" picker (omit = no permission). */
  onAllBacklog?: () => void;
}> = ({ s, open, onToggle, onFilter, onOpenChallan, onDeliver, onDispatch, deliveringId, onInvoice, onSendQuotation, onAllBacklog }) => {
  const six = s.months.reduce((a, m) => ({ n: a.n + m.count, v: a.v + m.value }), { n: 0, v: 0 });
  const monthsTable = (
    <table className="db-table">
      <thead>
        <tr>
          <th>Month</th>
          <th>Challans sent</th>
          <th>Goods value</th>
          <th>Confirmed delivered</th>
        </tr>
      </thead>
      <tbody>
        {s.months.map((m) => (
          <tr key={m.key}>
            <td>{dayjs(`${m.key}-01`).format("MMM YYYY")}</td>
            <td>{count(m.count)}</td>
            <td>{inr(m.value)}</td>
            <td>{count(m.confirmed)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const avg = s.avg_days_to_deliver;
  // Older backends send no draft list; the desk then shows just the count.
  const draftItems = s.drafts.items || [];

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
              <Card icon={<BarChartOutlined />} tint="var(--db-s3)" title="Goods sent each month" sub="Last 6 months · by the day each challan was dispatched · values before GST" table={monthsTable}>
                <div className="db-figure">
                  <b>{inr(six.v)}</b>
                  <span>
                    of goods in {plural(six.n, "challan")}
                    {avg !== null && s.delivered_count > 0 && (
                      <> · delivery confirmed {avg < 1 ? "the same day" : `${avg} day${avg === 1 ? "" : "s"} after dispatch`} on average</>
                    )}
                  </span>
                </div>
                <MonthColumns months={s.months} />
                {s.reasons.length > 0 && (
                  <div className="ip-modes" aria-label="Why goods moved in the last 6 months">
                    <span className="ip-modes-title">Why goods moved</span>
                    {s.reasons.map((r) => (
                      <span key={r.reason} className="ip-mode-chip">
                        {r.label} <b>{count(r.count)}</b>
                        <em>{pct(r.share, 0)}</em>
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </div>
            <div className="db-cell" style={{ gridColumn: "span 5" }}>
              <Card
                icon={<FileSyncOutlined />}
                tint="var(--db-serious)"
                title="Ready to invoice"
                badge={<AsOfToday />}
                sub="Sent from a quotation, no invoice yet · waiting longest first"
                link={s.to_invoice.count > s.to_invoice.items.length ? { label: `All ${count(s.to_invoice.count)} ready to invoice`, onClick: () => onFilter("TO_INVOICE") } : undefined}
              >
                {s.to_invoice.items.length ? (
                  <ul className="qp-due" aria-label="Challans ready to invoice">
                    {s.to_invoice.items.map((it, i) => (
                      <li key={it.id}>
                        <button type="button" className="qp-due-open" onClick={() => onOpenChallan(it.id)} style={{ ["--i" as any]: i }}>
                          <span className={`qp-due-days dc-wait${it.days >= 7 ? " long" : ""}`}>
                            <b>{it.days === 0 ? "Today" : it.days}</b>
                            {it.days !== 0 && <small>{it.days === 1 ? "day" : "days"}</small>}
                          </span>
                          <span className="qp-due-main">
                            <b>{it.customer_name}</b>
                            <small>
                              {it.challan_number}
                              {it.quotation_number ? ` · ${it.quotation_number}` : ""} · {it.status === "DELIVERED" ? "delivered" : "sent"}
                              {it.since ? ` ${dayjs(it.since).format("D MMM")}` : ""}
                            </small>
                          </span>
                          <span className="qp-due-amt">{inrCompact(it.total_value)}</span>
                        </button>
                        {onInvoice && (
                          <Tooltip title={it.invoice_number ? `Link to invoice ${it.invoice_number}` : "Make the invoice"}>
                            <button type="button" className="qp-due-close dc-due-act invoice" aria-label={`Invoice ${it.challan_number}`} onClick={() => onInvoice(it)}>
                              <FileDoneOutlined />
                            </button>
                          </Tooltip>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty icon={<CheckCircleFilled />} title="Nothing waiting to be invoiced" sub="Challans made from a quotation show up here once the goods are sent." />
                )}
                {s.to_invoice.link_count > 0 && (
                  <div className="db-mini-foot">
                    <span>
                      {s.to_invoice.link_count === 1
                        ? "1 of them belongs to a quotation already billed in full — link it to that invoice."
                        : `${count(s.to_invoice.link_count)} of them belong to quotations already billed in full — link them to those invoices.`}
                    </span>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <div className="db-row">
            <div className="db-cell" style={{ gridColumn: "span 5" }}>
              <Card icon={<CarOutlined />} tint="var(--dc-transit)" title="Dispatch desk" badge={<AsOfToday />} sub="Goods on the road, and drafts not sent yet · waiting longest first">
                <DeskHead label="On the road" n={s.on_road.count} shown={s.on_road.items.length} onAll={() => onFilter("DISPATCHED")} />
                {s.on_road.items.length ? (
                  <ul className="qp-due" aria-label="Challans on the road">
                    {s.on_road.items.map((it, i) => (
                      <li key={it.id}>
                        <button type="button" className="qp-due-open" onClick={() => onOpenChallan(it.id)} style={{ ["--i" as any]: i }}>
                          <span className={`qp-due-days dc-road${it.days >= 7 ? " long" : ""}`}>
                            <b>{it.days === 0 ? "Today" : it.days}</b>
                            {it.days !== 0 && <small>{it.days === 1 ? "day" : "days"}</small>}
                          </span>
                          <span className="qp-due-main">
                            <b>{it.customer_name || it.route || "—"}</b>
                            <small>
                              {it.challan_number} · {it.reason_label}
                              {it.vehicle_number ? ` · ${it.vehicle_number}` : ""}
                            </small>
                          </span>
                          <span className="qp-due-amt">{inrCompact(it.total_value)}</span>
                        </button>
                        {onDeliver && (
                          <Popconfirm
                            title={`Mark ${it.challan_number} as delivered?`}
                            description={`Confirms the goods reached ${it.customer_name || "the destination"}.`}
                            okText="Mark delivered"
                            onConfirm={() => onDeliver(it)}
                          >
                            <Tooltip title="Mark as delivered">
                              <button
                                type="button"
                                className="qp-due-close dc-due-act deliver"
                                aria-label={`Mark ${it.challan_number} as delivered`}
                                disabled={deliveringId === it.id}
                              >
                                {deliveringId === it.id ? <Spin size="small" /> : <CheckOutlined />}
                              </button>
                            </Tooltip>
                          </Popconfirm>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="dc-desk-empty">
                    <CheckCircleFilled /> Nothing on the road — dispatched challans wait here until you confirm the goods arrived.
                  </div>
                )}

                <DeskHead label="Not sent yet" n={s.drafts.count} shown={draftItems.length} onAll={() => onFilter("DRAFT")} />
                {draftItems.length ? (
                  <ul className="qp-due" aria-label="Drafts not sent yet">
                    {draftItems.map((it, i) => (
                      <li key={it.id}>
                        <button type="button" className="qp-due-open" onClick={() => onOpenChallan(it.id)} style={{ ["--i" as any]: i }}>
                          <span className={`qp-due-days dc-made${it.days >= s.drafts.stale_days ? " long" : ""}`}>
                            <b>{it.days === 0 ? "New" : it.days}</b>
                            {it.days !== 0 && <small>{it.days === 1 ? "day old" : "days old"}</small>}
                          </span>
                          <span className="qp-due-main">
                            <b>{it.customer_name || it.route || "—"}</b>
                            <small>
                              {it.challan_number} · {it.reason_label}
                              {it.made_on ? ` · made ${dayjs(it.made_on).format("D MMM")}` : ""}
                            </small>
                          </span>
                          <span className="qp-due-amt">{inrCompact(it.total_value)}</span>
                        </button>
                        {onDispatch && (
                          <Popconfirm title={`Dispatch ${it.challan_number}?`} description={dispatchHint(it)} okText="Dispatch" onConfirm={() => onDispatch(it)}>
                            <Tooltip title="Dispatch">
                              <button type="button" className="qp-due-close dc-due-act go" aria-label={`Dispatch ${it.challan_number}`} disabled={deliveringId === it.id}>
                                {deliveringId === it.id ? <Spin size="small" /> : <SendOutlined />}
                              </button>
                            </Tooltip>
                          </Popconfirm>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : s.drafts.count ? null : (
                  <div className="dc-desk-empty">
                    <CheckCircleFilled /> No drafts waiting to go out.
                  </div>
                )}
                {s.drafts.stale > 0 && (
                  <div className="db-mini-foot" style={{ marginTop: 8 }}>
                    <span>
                      {s.drafts.stale === 1 ? "1 draft is" : `${count(s.drafts.stale)} drafts are`} over a week old — dispatch {s.drafts.stale === 1 ? "it" : "them"}, or delete what won't go.
                    </span>
                  </div>
                )}
                {s.eway_missing.count > 0 && (
                  <div className="db-callout dc-callout" role="note">
                    <ExclamationCircleFilled />
                    <span>
                      <b>{plural(s.eway_missing.count, "challan")}</b> worth {inr(s.eway_missing.threshold)} or more {s.eway_missing.count === 1 ? "has" : "have"} no e-way bill number. Goods of that value usually need one before they move.
                    </span>
                  </div>
                )}
              </Card>
            </div>
            <div className="db-cell" style={{ gridColumn: "span 7" }}>
              <Card
                icon={<InboxOutlined />}
                tint="var(--db-s7)"
                title="Still to send"
                sub="Approved quotations not fully sent · by the value still to go (before GST)"
                link={onAllBacklog && s.backlog.quotations > s.backlog.list.length ? { label: `All ${count(s.backlog.quotations)} quotations`, onClick: onAllBacklog } : undefined}
              >
                {s.backlog.list.length ? (
                  <>
                    <div className="db-figure" style={{ marginBottom: 12 }}>
                      <b>{inr(s.backlog.value)}</b>
                      <span>
                        {plural(s.backlog.items, "line")} on {plural(s.backlog.quotations, "approved quotation")} still to send
                      </span>
                    </div>
                    <RankedList
                      format={inrCompact}
                      total={s.backlog.value}
                      items={s.backlog.list.map((q) => ({
                        key: String(q.quotation_id),
                        name: q.customer_name,
                        value: q.pending_value,
                        onClick: () => onSendQuotation(q.quotation_id, q.quotation_number),
                        meta: (
                          <span>
                            <span className="qd-mono">{q.quotation_number}</span> · {count(q.pending_items)} of {plural(q.items, "line")} left
                            {q.challans ? ` · ${plural(q.challans, "challan")} so far` : " · nothing sent yet"}
                            {q.invoiced ? " · invoiced" : ""}
                          </span>
                        ),
                      }))}
                    />
                    <div className="db-mini-foot" style={{ marginTop: 10 }}>
                      <span>
                        <FieldTimeOutlined /> Click one to make its challan. Quotations invoiced without any challan aren't counted — their goods went with the invoice.
                      </span>
                    </div>
                  </>
                ) : (
                  <Empty icon={<CheckCircleFilled />} title="Every approved quotation is fully sent" sub="Approved quotations with goods still to send show up here." />
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
};
