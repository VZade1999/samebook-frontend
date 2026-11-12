import React, { useMemo, useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hourLabel = (h: number) => (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`);
const hourRange = (h: number) => {
  const f = (x: number) => `${x % 12 === 0 ? 12 : x % 12}${x < 12 || x === 24 ? " AM" : " PM"}`;
  return `${f(h)} – ${f(h + 1)}`;
};

/**
 * Weekday × hour grid of how many documents were created. One hue, five
 * steps (sequential); empty hours sit on the muted track so the rhythm of
 * the week reads at a glance.
 */
const Heatmap: React.FC<{ cells: number[][]; unit?: string }> = ({ cells, unit = "documents" }) => {
  const [tip, setTip] = useState<{ d: number; h: number } | null>(null);
  const max = useMemo(() => Math.max(0, ...cells.flat()), [cells]);
  const level = (v: number) => (!v || !max ? 0 : Math.min(5, Math.max(1, Math.ceil((v / max) * 5))));

  return (
    <div className="db-heat" onPointerLeave={() => setTip(null)}>
      <div className="db-heat-grid" role="img" aria-label={`Documents created by weekday and hour. Busiest hour has ${max} ${unit}.`}>
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="db-heat-h">
            {h % 3 === 0 ? hourLabel(h) : ""}
          </span>
        ))}
        {cells.map((row, d) => (
          <React.Fragment key={d}>
            <span className="db-heat-d">{DAYS[d]}</span>
            {row.map((v, h) => (
              <span
                key={h}
                className={`db-heat-cell l${level(v)}${tip && tip.d === d && tip.h === h ? " on" : ""}`}
                onPointerEnter={() => setTip({ d, h })}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="db-heat-foot">
        <span className="db-heat-read">
          {tip ? (
            <>
              <b>{cells[tip.d][tip.h]}</b> {unit} · {DAYS[tip.d]}, {hourRange(tip.h)}
            </>
          ) : (
            "Hover a square to see the count"
          )}
        </span>
        <span className="db-heat-scale" aria-hidden>
          Less
          {[0, 1, 2, 3, 4, 5].map((l) => (
            <i key={l} className={`db-heat-cell l${l}`} />
          ))}
          More
        </span>
      </div>
    </div>
  );
};

export const busiest = (cells: number[][]) => {
  let best = { d: 0, h: 0, v: 0 };
  cells.forEach((row, d) => row.forEach((v, h) => v > best.v && (best = { d, h, v })));
  if (!best.v) return null;
  const byDay = cells.map((r) => r.reduce((s, v) => s + v, 0));
  const day = byDay.indexOf(Math.max(...byDay));
  return { day: DAYS[day], dayFull: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day], hour: hourRange(best.h), cell: best };
};

export { DAYS, hourRange };
export default Heatmap;
