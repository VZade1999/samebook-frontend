import React from "react";
import { share } from "../../utils/format";

export interface RankedItem {
  key: string;
  name: string;
  value: number;
  /** Shown under the name ("3 invoices · ₹20K due"). */
  meta?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Ranked horizontal bars, largest first, one hue (the items are nominal, so
 * colour carries no meaning here: bar length does). Value at the bar tip.
 */
const RankedList: React.FC<{ items: RankedItem[]; format: (n: number) => string; total?: number }> = ({
  items,
  format,
  total,
}) => {
  const top = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="db-ranked">
      {items.map((it, i) => (
        <li
          key={it.key}
          className={it.onClick ? "clickable" : ""}
          onClick={it.onClick}
          style={{ ["--i" as any]: i }}
          tabIndex={it.onClick ? 0 : undefined}
          onKeyDown={(e) => it.onClick && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), it.onClick())}
        >
          <span className="db-rank-no">{i + 1}</span>
          <div className="db-rank-body">
            <div className="db-rank-top">
              <span className="db-rank-name" title={it.name}>
                {it.name}
              </span>
              <b className="db-rank-val">{format(it.value)}</b>
            </div>
            <div className="db-rank-track">
              <span className="db-rank-bar" style={{ width: `${Math.max(1.5, share(it.value, top))}%` }} />
            </div>
            <div className="db-rank-meta">
              {it.meta}
              {total ? <em>{Math.round(share(it.value, total))}% of total</em> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
};

export default RankedList;
