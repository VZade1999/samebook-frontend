import React, { useCallback, useEffect, useState } from "react";
import { ShoppingCartOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { Card } from "@/modules/dashboard/components/Bits";
import { useAccess } from "@/permissions/useAccess";
import { useModules } from "@/session/useModules";
import { type BillSummary, type PoSummary, getBillSummary, getPoSummary } from "./api";
import { rs } from "./format";
import "./purchases.scss";

/** Is the Purchases card for this person? (Add-on on, and some Purchases permission.) */
export const useShowsPurchases = () => {
  const { hasModule } = useModules();
  const { can } = useAccess();
  return hasModule("purchases") && (can("purchases.view") || can("purchases.receive") || can("purchases.bills"));
};

/**
 * Dashboard: what is on order from suppliers, what is late or waiting for
 * approval, and what you owe — each figure opens the matching list.
 */
const PurchasesCard: React.FC = () => {
  const { can } = useAccess();
  const navigate = useNavigate();
  const seesPo = can("purchases.view") || can("purchases.receive");
  const seesBills = can("purchases.view") || can("purchases.bills");
  const [po, setPo] = useState<PoSummary | null>(null);
  const [bills, setBills] = useState<BillSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    Promise.all([seesPo ? getPoSummary() : Promise.resolve(null), seesBills ? getBillSummary() : Promise.resolve(null)])
      .then(([a, b]) => {
        setPo(a);
        setBills(b);
      })
      .catch(() => setFailed(true));
  }, [seesPo, seesBills]);
  useEffect(load, [load]);

  return (
    <Card
      icon={<ShoppingCartOutlined />}
      tint="var(--db-s1)"
      title="Purchases"
      sub="Orders to suppliers and what you owe them"
      failed={failed}
      onRetry={load}
      link={{ label: "Purchase orders", onClick: () => navigate("/app/purchase-orders") }}
    >
      <div className="pu-dash">
        {po && (
          <button type="button" className="pu-dash-tile" onClick={() => navigate("/app/purchase-orders?status=TO_RECEIVE")}>
            <span>On order (to come)</span>
            <b>{po.open_value === null ? `${po.to_receive} PO${po.to_receive === 1 ? "" : "s"}` : rs(po.open_value)}</b>
            <small>
              {po.to_receive} open{po.to_send ? ` · ${po.to_send} to send` : ""}
            </small>
          </button>
        )}
        {po && (
          <button type="button" className={`pu-dash-tile${po.late ? " bad" : ""}`} onClick={() => navigate(`/app/purchase-orders?status=${po.pending && !po.late ? "PENDING_APPROVAL" : "LATE"}`)}>
            <span>{po.pending && !po.late ? "Waiting for approval" : "Late deliveries"}</span>
            <b>{po.pending && !po.late ? po.pending : po.late}</b>
            <small>{po.pending && !po.late ? "purchase orders to approve" : po.late ? "past the expected date" : "nothing late"}</small>
          </button>
        )}
        {bills && (
          <button type="button" className="pu-dash-tile" onClick={() => navigate("/app/purchase-bills?status=UNPAID")}>
            <span>You owe suppliers</span>
            <b>{rs(bills.to_pay)}</b>
            <small>
              {bills.unpaid} unpaid bill{bills.unpaid === 1 ? "" : "s"}
              {bills.due_soon ? ` · ${rs(bills.due_soon)} due this week` : ""}
            </small>
          </button>
        )}
        {bills && (
          <button type="button" className={`pu-dash-tile${bills.overdue > 0 ? " bad" : ""}`} onClick={() => navigate("/app/purchase-bills?status=OVERDUE")}>
            <span>Overdue to suppliers</span>
            <b>{rs(bills.overdue)}</b>
            <small>{bills.msme_urgent ? `${bills.msme_urgent} MSME bill${bills.msme_urgent === 1 ? "" : "s"} near the 45-day limit` : bills.itc_risk ? `${rs(bills.itc_risk)} near the 180-day GST limit` : "MSME and GST limits watched"}</small>
          </button>
        )}
      </div>
    </Card>
  );
};

export default PurchasesCard;
