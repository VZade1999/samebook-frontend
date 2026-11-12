import React, { useId } from "react";
import { monotonePath } from "./useMeasure";

interface Props {
  values: number[];
  color: string;
  height?: number;
}

/**
 * Tiny trend for a stat tile. Drawn in a 100-wide viewBox stretched to the
 * tile; non-scaling strokes keep the line a crisp 1.5px at any width.
 */
const Sparkline: React.FC<Props> = ({ values, color, height = 34 }) => {
  const uid = useId().replace(/:/g, "");
  if (values.length < 2 || values.every((v) => !v)) {
    return <div className="db-spark empty" style={{ height }} aria-hidden />;
  }
  const max = Math.max(...values) || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 30 - (v / max) * 26 - 2] as [number, number]);
  const line = monotonePath(pts);
  return (
    <svg className="db-spark" viewBox="0 0 100 30" preserveAspectRatio="none" style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={`sp-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.25 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={`${line}L100,30L0,30Z`} style={{ fill: `url(#sp-${uid})` }} />
      <path d={line} className="db-spark-line" style={{ stroke: color }} vectorEffect="non-scaling-stroke" pathLength={1} />
    </svg>
  );
};

export default Sparkline;
