import React, { useEffect, useRef, useState } from "react";
import { ArrowRightOutlined, ReloadOutlined, TableOutlined, LineChartOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { pct } from "../utils/format";
import Sparkline from "./charts/Sparkline";

// ── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  icon: React.ReactNode;
  /** Icon tint (a CSS colour/var). */
  tint?: string;
  title: string;
  sub?: React.ReactNode;
  badge?: React.ReactNode;
  extra?: React.ReactNode;
  /** Accessible twin of the chart; adds a chart/table toggle to the header. */
  table?: React.ReactNode;
  link?: { label: string; onClick: () => void };
  failed?: boolean;
  onRetry?: () => void;
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  icon,
  tint = "var(--db-accent)",
  title,
  sub,
  badge,
  extra,
  table,
  link,
  failed,
  onRetry,
  className = "",
  children,
}) => {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`db-card ${className}`} style={{ ["--tint" as any]: tint }}>
      <header className="db-card-head">
        <span className="db-card-icon">{icon}</span>
        <div className="db-card-titles">
          <h3>
            {title}
            {badge}
          </h3>
          {sub && <p>{sub}</p>}
        </div>
        <div className="db-card-actions">
          {extra}
          {table && !failed && (
            <Tooltip title={asTable ? "Show chart" : "Show as table"}>
              <button
                className={`db-icon-btn${asTable ? " on" : ""}`}
                aria-pressed={asTable}
                aria-label={asTable ? "Show chart" : "Show as table"}
                onClick={() => setAsTable((v) => !v)}
              >
                {asTable ? <LineChartOutlined /> : <TableOutlined />}
              </button>
            </Tooltip>
          )}
        </div>
      </header>
      <div className="db-card-body">
        {failed ? (
          <div className="db-failed">
            <span>Couldn't load this section.</span>
            {onRetry && (
              <button className="db-chip-btn" onClick={onRetry}>
                <ReloadOutlined /> Try again
              </button>
            )}
          </div>
        ) : asTable && table ? (
          <div className="db-table-wrap">{table}</div>
        ) : (
          children
        )}
      </div>
      {link && !failed && (
        <button className="db-card-link" onClick={link.onClick}>
          {link.label} <ArrowRightOutlined />
        </button>
      )}
    </section>
  );
};

export const AsOfToday: React.FC<{ text?: string }> = ({ text = "As of today" }) => (
  <span className="db-asof">{text}</span>
);

// ── Delta pill ──────────────────────────────────────────────────────────────

/** Signed change vs the comparison period; colour = direction × whether up is good. */
export const Delta: React.FC<{ change: number | null | undefined; current?: number; upIsGood?: boolean; vs?: string; onDark?: boolean }> = ({
  change,
  current,
  upIsGood = true,
  vs,
  onDark,
}) => {
  const cls = onDark ? " dark" : "";
  if (change === null || change === undefined) {
    return current ? (
      <span className={`db-delta new${cls}`} title={vs ? `Nothing in ${vs}` : undefined}>
        New
      </span>
    ) : (
      <span className={`db-delta flat${cls}`}>—</span>
    );
  }
  if (change === 0) return <span className={`db-delta flat${cls}`}>No change</span>;
  const up = change > 0;
  const good = up === upIsGood;
  return (
    <span className={`db-delta ${good ? "good" : "bad"}${cls}`} title={vs ? `Compared with ${vs}` : undefined}>
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Up" : "Down"}</span> {pct(Math.abs(change))}
    </span>
  );
};

// ── Stat tile ───────────────────────────────────────────────────────────────

interface TileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: string;
  change?: number | null;
  current?: number;
  upIsGood?: boolean;
  vs?: string;
  sub?: React.ReactNode;
  spark?: number[];
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  index: number;
}

export const StatTile: React.FC<TileProps> = ({
  icon,
  label,
  value,
  tint,
  change,
  current,
  upIsGood,
  vs,
  sub,
  spark,
  badge,
  footer,
  onClick,
  index,
}) => (
  <button
    className="db-stat"
    style={{ ["--tint" as any]: tint, ["--i" as any]: index }}
    onClick={onClick}
    disabled={!onClick}
    type="button"
  >
    <span className="db-stat-top">
      <span className="db-stat-icon">{icon}</span>
      <span className="db-stat-label">{label}</span>
      {badge}
    </span>
    <span className="db-stat-value">{value}</span>
    <span className="db-stat-foot">
      {change !== undefined && <Delta change={change} current={current} upIsGood={upIsGood} vs={vs} />}
      {sub && <span className="db-stat-sub">{sub}</span>}
    </span>
    {spark && <Sparkline values={spark} color={tint} />}
    {footer}
    {onClick && <ArrowRightOutlined className="db-stat-go" />}
  </button>
);

// ── Count-up for the hero figure ────────────────────────────────────────────

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const useCountUp = (target: number, ms = 900) => {
  const [v, setV] = useState(target);
  const from = useRef(0);
  useEffect(() => {
    if (reduceMotion()) {
      setV(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(a + (target - a) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = target;
    };
  }, [target, ms]);
  return v;
};

// ── Small empty state inside a card ─────────────────────────────────────────

export const Empty: React.FC<{ icon: React.ReactNode; title: string; sub?: string }> = ({ icon, title, sub }) => (
  <div className="db-empty">
    <span className="db-empty-icon">{icon}</span>
    <b>{title}</b>
    {sub && <span>{sub}</span>}
  </div>
);
