import React, { useId, useMemo, useState } from "react";
import type { Bucket } from "../../utils/dates";
import { pct } from "../../utils/format";
import { monotonePath, niceScale, useMeasure } from "./useMeasure";

export interface TrendSeries {
  key: string;
  label: string;
  /** CSS colour (a var(--db-…) token). */
  color: string;
  values: number[];
  area?: boolean;
}

interface Props {
  buckets: Bucket[];
  series: TrendSeries[];
  /** Previous period, drawn as a quiet grey line behind the first series. */
  prev?: { label: string; values: number[] } | null;
  format: (n: number) => string;
  axis: (max: number) => (n: number) => string;
  height?: number;
  ariaLabel: string;
}

const M = { top: 14, right: 18, bottom: 30 };

/**
 * Line/area trend with a snapping crosshair: the pointer (or ←/→ keys) picks
 * the nearest bucket and one tooltip lists every series at that point.
 */
const TrendChart: React.FC<Props> = ({ buckets, series, prev, format, axis, height = 270, ariaLabel }) => {
  const [wrapRef, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const n = buckets.length;

  const geo = useMemo(() => {
    const all = [...series.flatMap((s) => s.values), ...(prev?.values || [])];
    const { max, step } = niceScale(Math.max(0, ...all));
    const fmt = axis(max);
    const ticks: number[] = [];
    for (let v = 0; v <= max + step / 2; v += step) ticks.push(v);
    const labelW = Math.max(...ticks.map((t) => fmt(t).length)) * 7 + 12;
    const left = Math.max(36, labelW);
    const plotW = Math.max(10, width - left - M.right);
    const plotH = height - M.top - M.bottom;
    const x = (i: number) => (n <= 1 ? left + plotW / 2 : left + (i * plotW) / (n - 1));
    const y = (v: number) => M.top + plotH - (max ? (v / max) * plotH : 0);
    const maxLabels = Math.max(2, Math.floor(plotW / 70));
    const every = Math.max(1, Math.ceil(n / maxLabels));
    return { max, ticks, fmt, left, plotW, plotH, x, y, every, base: M.top + plotH };
  }, [series, prev, axis, width, height, n]);

  const pts = (values: number[]) => values.map((v, i) => [geo.x(i), geo.y(v)] as [number, number]);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = n <= 1 ? 0 : Math.round(((px - geo.left) / geo.plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setHover((h) => {
        const cur = h === null ? (e.key === "ArrowRight" ? -1 : n) : h;
        return Math.max(0, Math.min(n - 1, cur + (e.key === "ArrowRight" ? 1 : -1)));
      });
    } else if (e.key === "Escape") setHover(null);
  };

  const main = series[0];
  const tipLeft = hover === null ? 0 : geo.x(hover);
  const flip = tipLeft > width * 0.6;

  return (
    <div className="db-trend" ref={wrapRef} style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
          className="db-trend-svg"
        >
          <defs>
            {series
              .filter((s) => s.area)
              .map((s) => (
                <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: s.color, stopOpacity: 0.22 }} />
                  <stop offset="100%" style={{ stopColor: s.color, stopOpacity: 0.01 }} />
                </linearGradient>
              ))}
          </defs>

          {/* Grid + y axis */}
          {geo.ticks.map((t) => (
            <g key={t}>
              <line
                x1={geo.left}
                x2={geo.left + geo.plotW}
                y1={geo.y(t)}
                y2={geo.y(t)}
                className={t === 0 ? "db-axis-base" : "db-grid"}
              />
              <text x={geo.left - 10} y={geo.y(t)} dy="0.32em" textAnchor="end" className="db-tick">
                {geo.fmt(t)}
              </text>
            </g>
          ))}
          {/* X labels */}
          {buckets.map((b, i) =>
            i % geo.every === 0 ? (
              <text key={b.key} x={geo.x(i)} y={height - 8} textAnchor="middle" className="db-tick">
                {b.label}
              </text>
            ) : null,
          )}

          {/* Previous period (behind) */}
          {prev && n > 1 && (
            <path d={monotonePath(pts(prev.values))} className="db-prev-line" pathLength={1} />
          )}

          {/* Areas then lines */}
          {series.map((s) =>
            s.area && n > 1 ? (
              <path
                key={`a-${s.key}`}
                className="db-area"
                d={`${monotonePath(pts(s.values))}L${geo.x(n - 1)},${geo.base}L${geo.x(0)},${geo.base}Z`}
                style={{ fill: `url(#${uid}-${s.key})` }}
              />
            ) : null,
          )}
          {series.map((s) =>
            n > 1 ? (
              <path
                key={`l-${s.key}`}
                className="db-line"
                d={monotonePath(pts(s.values))}
                pathLength={1}
                style={{ stroke: s.color }}
              />
            ) : (
              <circle key={`l-${s.key}`} cx={geo.x(0)} cy={geo.y(s.values[0] || 0)} r={5} style={{ fill: s.color }} />
            ),
          )}

          {/* Crosshair */}
          {hover !== null && (
            <g className="db-cross">
              <line x1={geo.x(hover)} x2={geo.x(hover)} y1={M.top} y2={geo.base} className="db-cross-line" />
              {prev && <circle cx={geo.x(hover)} cy={geo.y(prev.values[hover] || 0)} r={4} className="db-dot prev" />}
              {series.map((s) => (
                <circle
                  key={s.key}
                  cx={geo.x(hover)}
                  cy={geo.y(s.values[hover] || 0)}
                  r={5}
                  className="db-dot"
                  style={{ fill: s.color }}
                />
              ))}
            </g>
          )}

          <rect
            x={geo.left}
            y={M.top}
            width={geo.plotW}
            height={geo.plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hover !== null && buckets[hover] && (
        <div
          className={`db-tip${flip ? " flip" : ""}`}
          style={{ left: flip ? tipLeft - 14 : tipLeft + 14, top: 8 }}
          role="status"
        >
          <div className="db-tip-title">{buckets[hover].title}</div>
          {series.map((s) => (
            <div key={s.key} className="db-tip-row">
              <i className="db-key-line" style={{ background: s.color }} />
              <b>{format(s.values[hover] || 0)}</b>
              <span>{s.label}</span>
            </div>
          ))}
          {prev && main && (
            <div className="db-tip-row muted">
              <i className="db-key-line prev" />
              <b>{format(prev.values[hover] || 0)}</b>
              <span>{prev.label}</span>
              {prev.values[hover] ? (
                <em className={(main.values[hover] || 0) >= prev.values[hover] ? "up" : "down"}>
                  {(main.values[hover] || 0) >= prev.values[hover] ? "▲" : "▼"}{" "}
                  {pct(Math.abs((((main.values[hover] || 0) - prev.values[hover]) / prev.values[hover]) * 100), 0)}
                </em>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrendChart;
