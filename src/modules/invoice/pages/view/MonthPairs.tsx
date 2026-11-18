import React, { useState } from "react";
import dayjs from "dayjs";
import { niceScale, useMeasure } from "@/modules/dashboard/components/charts/useMeasure";
import { axisInr } from "@/modules/dashboard/utils/format";
import { count, inr, inrCompact } from "./shared";
import type { InvoiceSummaryData } from "./types";

const H = 236; // whole chart, x-axis band included
const TOP = 24; // room for the cap label
const BOTTOM = 28; // x-axis labels
const LEFT = 50; // y-axis ticks

/** Column from yTop down to the baseline: 4px rounded cap, square base. */
const colPath = (x: number, w: number, yTop: number, yBot: number) => {
  const h = yBot - yTop;
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return `M${x},${yBot}V${yTop + r}A${r},${r} 0 0 1 ${x + r},${yTop}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${yTop + r}V${yBot}Z`;
};

/**
 * Billed (invoices dated in the month) next to collected (payments received
 * in the month), per month. Two series on one axis, in the validated
 * categorical pair the dashboard uses for the same two measures (s1 billed,
 * s2 collected). ≤24px columns with a 2px gap between the pair; one cap label
 * on the busiest month; hover or keyboard focus shows every figure, and the
 * card's table view repeats them.
 */
const MonthPairs: React.FC<{ months: InvoiceSummaryData["months"] }> = ({ months }) => {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hot, setHot] = useState<number | null>(null);
  const W = Math.max(width, 280);
  const plotH = H - TOP - BOTTOM;
  const scale = niceScale(Math.max(1, ...months.map((m) => Math.max(m.billed, m.collected))), 4);
  const y = (v: number) => TOP + plotH - (v / scale.max) * plotH;
  const tick = axisInr(scale.max);
  const ticks = Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step);
  const band = (W - LEFT) / Math.max(1, months.length);
  const barW = Math.max(6, Math.min(20, band * 0.24));
  const last = months.length - 1;
  const peak = months.reduce((best, m, i) => (Math.max(m.billed, m.collected) > Math.max(months[best].billed, months[best].collected) ? i : best), 0);
  const monthName = (key: string, fmt: string) => dayjs(`${key}-01`).format(fmt);

  const tip = hot !== null ? months[hot] : null;
  const tipX = hot !== null ? LEFT + band * hot + band / 2 : 0;
  const flip = tipX > W - 220;

  return (
    <div className={`qp-months${hot !== null ? " hovering" : ""}`} ref={ref}>
      {width > 0 && (
        <svg width={W} height={H} role="list" aria-label="Billed and collected per month">
          {ticks.map((t) => (
            <g key={t} aria-hidden>
              <line className={t === 0 ? "db-axis-base" : "db-grid"} x1={LEFT} x2={W} y1={y(t)} y2={y(t)} />
              <text className="db-tick" x={LEFT - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {tick(t)}
              </text>
            </g>
          ))}
          {months.map((m, i) => {
            const cx = LEFT + band * i + band / 2;
            const base = y(0);
            const xb = cx - barW - 1; // billed on the left
            const xc = cx + 1; // collected on the right (2px gap)
            const bTop = y(m.billed);
            const cTop = y(m.collected);
            const capOn = i === peak && Math.max(m.billed, m.collected) > 0;
            const capVal = m.billed >= m.collected ? m.billed : m.collected;
            const capX = m.billed >= m.collected ? xb + barW / 2 : xc + barW / 2;
            return (
              <g
                key={m.key}
                className={`qp-col${hot === i ? " on" : ""}`}
                role="listitem"
                tabIndex={0}
                aria-label={`${monthName(m.key, "MMMM YYYY")}: ${inr(m.billed)} billed in ${count(m.billed_count)} invoice${m.billed_count === 1 ? "" : "s"}; ${inr(m.collected)} collected in ${count(m.collected_count)} payment${m.collected_count === 1 ? "" : "s"}`}
                onPointerEnter={() => setHot(i)}
                onPointerLeave={() => setHot(null)}
                onFocus={() => setHot(i)}
                onBlur={() => setHot(null)}
              >
                <rect className="qp-col-band" x={LEFT + band * i + 3} y={TOP - 10} width={Math.max(0, band - 6)} height={plotH + 10} rx={8} />
                {/* Any non-zero month keeps a 2px sliver so it never reads as nothing. */}
                {m.billed > 0 && <path d={colPath(xb, barW, Math.min(bTop, base - 2), base)} style={{ fill: "var(--db-s1)" }} />}
                {m.collected > 0 && <path d={colPath(xc, barW, Math.min(cTop, base - 2), base)} style={{ fill: "var(--db-s2)" }} />}
                {capOn && (
                  <text className="qp-col-label" x={capX} y={Math.min(bTop, cTop) - 8} textAnchor="middle">
                    {inrCompact(capVal)}
                  </text>
                )}
                <text className={`qp-col-x${i === last ? " cur" : ""}`} x={cx} y={H - 8} textAnchor="middle">
                  {monthName(m.key, "MMM")}
                </text>
                <rect className="qp-col-hit" x={LEFT + band * i} y={0} width={band} height={H} />
              </g>
            );
          })}
        </svg>
      )}
      {tip && (
        <div className={`db-tip${flip ? " flip" : ""}`} style={{ left: flip ? tipX - 14 : tipX + 14, top: 6 }} role="presentation">
          <div className="db-tip-title">
            {monthName(tip.key, "MMMM YYYY")}
            {hot === last ? " · so far" : ""}
          </div>
          <div className="db-tip-row">
            <i className="db-key-line" style={{ background: "var(--db-s1)" }} />
            <b>{inr(tip.billed)}</b>
            <span>
              billed · {count(tip.billed_count)} invoice{tip.billed_count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="db-tip-row">
            <i className="db-key-line" style={{ background: "var(--db-s2)" }} />
            <b>{inr(tip.collected)}</b>
            <span>
              collected · {count(tip.collected_count)} payment{tip.collected_count === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthPairs;
