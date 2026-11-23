import React from "react";
import { AuditOutlined, CarOutlined, FlagOutlined, ImportOutlined, RollbackOutlined, SwapOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { type Movement, type MovementType, describeMovement, signed, whenText } from "./stockApi";

const ICON: Record<MovementType, React.ReactNode> = {
  OPENING: <FlagOutlined />,
  RECEIVED: <ImportOutlined />,
  COUNTED: <AuditOutlined />,
  MOVED: <SwapOutlined />,
  DISPATCHED: <CarOutlined />,
  DISPATCH_CANCELLED: <RollbackOutlined />,
};
const warehouseName = (m: Movement) => (typeof m.warehouse === "string" ? m.warehouse : m.warehouse?.name) || "—";

/**
 * Stock changes, newest first: what happened, where, by whom and when, the
 * change (+ / −) and what was left after. A challan opens on its page.
 */
const HistoryList: React.FC<{ movements: Movement[]; showProduct?: boolean; onProduct?: (id: number) => void; empty?: React.ReactNode }> = ({
  movements,
  showProduct = false,
  onProduct,
  empty,
}) => {
  const navigate = useNavigate();
  if (!movements.length) return <div className="st-empty-line">{empty ?? "No stock changes yet."}</div>;
  return (
    <ul className="st-history">
      {movements.map((m) => {
        const d = describeMovement(m);
        if (d.detail && d.detail.trim().toLowerCase() === d.title.trim().toLowerCase()) d.detail = null;
        const challan = m.reference?.type === "challan" && m.reference.id ? m.reference.id : null;
        return (
          <li key={m.id} className="st-move">
            <span className={`st-move-icon t-${m.type.toLowerCase()}`} aria-hidden>
              {ICON[m.type] ?? <AuditOutlined />}
            </span>
            <span className="st-move-text">
              <b>
                {challan ? (
                  <button type="button" className="pc-link" onClick={() => navigate(`/app/delivery-challans?open=${challan}`)}>
                    {d.title}
                  </button>
                ) : (
                  d.title
                )}
              </b>
              <em>
                {showProduct && m.product && (
                  <>
                    {onProduct ? (
                      <button type="button" className="st-prod-link" onClick={() => onProduct(m.product!.id)}>
                        {m.product.name}
                      </button>
                    ) : (
                      <span>{m.product.name}</span>
                    )}
                    {" · "}
                  </>
                )}
                {warehouseName(m)}
                {d.detail ? ` · ${d.detail}` : ""}
                {" · "}
                {whenText(m.at)}
                {m.by ? ` · ${m.by}` : ""}
              </em>
            </span>
            <span className="st-move-qty">
              <b className={m.quantity > 0 ? "up" : m.quantity < 0 ? "down" : ""}>{signed(m.quantity)}</b>
              <em>{m.balance_after} left</em>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default HistoryList;
