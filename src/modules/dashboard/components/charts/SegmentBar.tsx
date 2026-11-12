import React, { useState } from "react";
import { pct, share } from "../../utils/format";

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Optional status icon (status colours never carry meaning alone). */
  icon?: React.ReactNode;
  /** Secondary text in the row, e.g. "4 invoices". */
  note?: string;
}

interface Props {
  segments: Segment[];
  format: (n: number) => string;
  ariaLabel: string;
}

/**
 * One whole split into parts: a thin segmented bar (2px surface gaps, no
 * text on it) above a list that carries the names, amounts and shares.
 * Hovering a row or a segment highlights its partner.
 */
const SegmentBar: React.FC<Props> = ({ segments, format, ariaLabel }) => {
  const [hot, setHot] = useState<string | null>(null);
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const visible = segments.filter((s) => s.value > 0);

  return (
    <div className="db-seg">
      <div
        className="db-seg-bar"
        role="img"
        aria-label={`${ariaLabel}: ${segments.map((s) => `${s.label} ${format(s.value)} (${pct(share(s.value, total), 0)})`).join(", ")}`}
      >
        {total > 0 ? (
          visible.map((s) => (
            <span
              key={s.key}
              className={`db-seg-part${hot && hot !== s.key ? " dim" : ""}`}
              style={{ flexGrow: s.value, background: s.color }}
              onPointerEnter={() => setHot(s.key)}
              onPointerLeave={() => setHot(null)}
            />
          ))
        ) : (
          <span className="db-seg-part empty" />
        )}
      </div>
      <ul className="db-seg-list">
        {segments.map((s) => (
          <li
            key={s.key}
            className={`${hot === s.key ? "hot" : ""}${hot && hot !== s.key ? " dim" : ""}`}
            onPointerEnter={() => setHot(s.key)}
            onPointerLeave={() => setHot(null)}
          >
            <i className="db-swatch" style={{ background: s.color }} />
            <span className="db-seg-name">
              {s.icon && <span className="db-seg-icon">{s.icon}</span>}
              {s.label}
              {s.note && <small>{s.note}</small>}
            </span>
            <b>{format(s.value)}</b>
            <em>{pct(share(s.value, total), 0)}</em>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SegmentBar;
