import React, { useState } from "react";
import dayjs from "dayjs";
import { niceScale, useMeasure } from "@/modules/dashboard/components/charts/useMeasure";
import { axisInr } from "@/modules/dashboard/utils/format";
import { count, inr, inrCompact } from "./shared";
import type { ChallanSummaryData } from "./types";

const H = 236; // whole chart, x-axis band included
const TOP = 24; // room for the cap labels
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
 * Value of the goods sent each month (challans by dispatch day), one series in
 * the dashboard's challan colour. One axis, ≤24px columns, cap labels only on
 * this month and the busiest month; hover or keyboard focus shows every
 * figure (challans, value, how many were confirmed delivered), and the card's
 * table view repeats them. A month with challans but no value (goods sent on
 * approval at ₹0) keeps a 2px sliver so it never reads as nothing.
 */
const MonthColumns: React.FC<{ months: ChallanSummaryData["months"] }> = ({ months }) => {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hot, setHot] = useState<number | null>(null);
  const W = Math.max(width, 280);
  const plotH = H - TOP - BOTTOM;
  const scale = niceScale(Math.max(1, ...months.map((m) => m.value)), 4);
  const y = (v: number) => TOP + plotH - (v / scale.max) * plotH;
  const tick = axisInr(scale.max);
  const ticks = Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step);
  const band = (W - LEFT) / Math.max(1, months.length);
  const barW = Math.min(24, band * 0.42);
  const last = months.length - 1;
  const peak = months.reduce((best, m, i) => (m.value > months[best].value ? i : best), 0);
  const monthName = (key: string, fmt: string) => dayjs(`${key}-01`).format(fmt);

  const tip = hot !== null ? months[hot] : null;
  const tipX = hot !== null ? LEFT + band * hot + band / 2 : 0;
  const flip = tipX > W - 210;

  return (
    <div className={`qp-months${hot !== null ? " hovering" : ""}`} ref={ref}>
      {width > 0 && (
        <svg width={W} height={H} role="list" aria-label="Value of goods sent each month">
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
            const top = m.count > 0 ? Math.min(y(m.value), base - 2) : base;
            const showCap = m.count > 0 && (i === last || i === peak);
            return (
              <g
                key={m.key}
                className={`qp-col${hot === i ? " on" : ""}`}
                role="listitem"
                tabIndex={0}
                aria-label={`${monthName(m.key, "MMMM YYYY")}: ${count(m.count)} challan${m.count === 1 ? "" : "s"} sent, goods worth ${inr(m.value)}; ${count(m.confirmed)} confirmed delivered`}
                onPointerEnter={() => setHot(i)}
                onPointerLeave={() => setHot(null)}
                onFocus={() => setHot(i)}
                onBlur={() => setHot(null)}
              >
                <rect className="qp-col-band" x={LEFT + band * i + 3} y={TOP - 10} width={Math.max(0, band - 6)} height={plotH + 10} rx={8} />
                {m.count > 0 && <path d={colPath(cx - barW / 2, barW, top, base)} style={{ fill: "var(--db-s3)" }} />}
                {showCap && (
                  <text className="qp-col-label" x={cx} y={top - 8} textAnchor="middle">
                    {inrCompact(m.value)}
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
            <i className="db-key-line" style={{ background: "var(--db-s3)" }} />
            <b>{inr(tip.value)}</b>
            <span>
              of goods · {count(tip.count)} challan{tip.count === 1 ? "" : "s"}
            </span>
          </div>
          {tip.count > 0 && (
            <div className="db-tip-row">
              <i className="db-key-line" style={{ background: "transparent" }} />
              <b>{count(tip.confirmed)}</b>
              <span>confirmed delivered</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthColumns;
