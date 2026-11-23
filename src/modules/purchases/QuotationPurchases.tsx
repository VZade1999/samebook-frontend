import React, { useEffect, useState } from "react";
import { ShoppingCartOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAccess } from "@/permissions/useAccess";
import { useModules } from "@/session/useModules";
import { type PoRow, getPos } from "./api";
import { PO_STATUS, rs } from "./format";
import "./purchases.scss";

const APPROVED = ["APPROVED", "PARTIALLY_DISPATCHED", "FULLY_DISPATCHED"];

/** Can this person order from suppliers for this quotation? (Purchases on, Create, quotation approved.) */
export const useCanOrderFor = (q: { status?: string | null; has_invoice?: unknown } | null) => {
  const { hasModule } = useModules();
  const { can } = useAccess();
  if (!q || !hasModule("purchases") || !can("purchases.create")) return false;
  return APPROVED.includes(String(q.status || "").toUpperCase()) || q.has_invoice === true || Number(q.has_invoice) === 1;
};

/**
 * On a customer quotation's panel: the purchase orders placed for it with
 * "Order from supplier" (back-to-back buying). Shows nothing when there are none.
 */
const QuotationPurchases: React.FC<{ quotationId: number }> = ({ quotationId }) => {
  const { hasModule } = useModules();
  const { can } = useAccess();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PoRow[]>([]);
  const allowed = hasModule("purchases") && (can("purchases.view") || can("purchases.receive"));
  useEffect(() => {
    if (!allowed || !quotationId) return setRows([]);
    getPos({ quotation_id: quotationId, status: "ALL", limit: 20 })
      .then((r) => setRows(r.rows.filter((p) => p.status !== "CANCELLED")))
      .catch(() => setRows([]));
  }, [allowed, quotationId]);
  if (!rows.length) return null;
  return (
    <div className="pu-qpos">
      <h4>
        <ShoppingCartOutlined /> Ordered from suppliers
      </h4>
      <div className="pu-links">
        {rows.map((p) => (
          <button key={p.id} type="button" className="pu-link" onClick={() => navigate(`/app/purchase-orders?open=${p.id}`)}>
            {p.po_number} · {p.supplier_name}
            <small>
              {PO_STATUS[p.status]?.label}
              {p.received_pct ? ` · ${p.received_pct}% arrived` : ""}
              {p.grand_total !== null ? ` · ${rs(p.grand_total)}` : ""}
            </small>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuotationPurchases;
