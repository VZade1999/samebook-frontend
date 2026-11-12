import React from "react";
import { count, inrCompact, pct, share } from "../../utils/format";

interface Stage {
  key: string;
  label: string;
  count: number;
  amount: number;
}

/**
 * Quotation funnel as ranked bars on one baseline: an ordinal blue ramp
 * (stages are ordered), stage-to-stage conversion between the rows.
 */
const Funnel: React.FC<{ stages: Stage[]; showAmounts: boolean }> = ({ stages, showAmounts }) => {
  const top = Math.max(1, stages[0]?.count || 0);
  return (
    <ol className="db-funnel">
      {stages.map((s, i) => {
        const prev = stages[i - 1];
        const conv = prev && prev.count ? share(s.count, prev.count) : null;
        return (
          <li key={s.key} style={{ ["--i" as any]: i }}>
            {i > 0 && (
              <div className="db-funnel-conv" title={`${pct(conv)} of ${prev.label.toLowerCase()} moved on to ${s.label.toLowerCase()}`}>
                <span>↓</span> {conv === null ? "—" : pct(conv, 0)}
              </div>
            )}
            <div className="db-funnel-row">
              <span className="db-funnel-label">{s.label}</span>
              <div className="db-funnel-track">
                <span
                  className={`db-funnel-bar o${i + 1}`}
                  style={{ width: `${Math.max(s.count ? 1.5 : 0, share(s.count, top))}%` }}
                />
              </div>
              <span className="db-funnel-val">
                <b>{count(s.count)}</b>
                {showAmounts && <small>{inrCompact(s.amount)}</small>}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default Funnel;
