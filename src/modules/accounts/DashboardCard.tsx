import React, { useCallback, useEffect, useState } from "react";
import { BookOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { Card } from "@/modules/dashboard/components/Bits";
import { useAccess } from "@/permissions/useAccess";
import { rs } from "@/modules/purchases/format";
import { type LedgerSummary, type ProfitLoss, getReport, getSummary } from "./api";
import "@/modules/purchases/purchases.scss";

/**
 * Dashboard: money in cash and banks, what customers owe you, what you owe
 * suppliers, and the profit so far this financial year — each opens its page.
 * Profit is for the year to date (stock counted), not one month: a month of
 * buying stock would otherwise look like a loss.
 */
const AccountsCard: React.FC = () => {
  const { can } = useAccess();
  const navigate = useNavigate();
  const seesReports = can("accounts.reports");
  const [s, setS] = useState<LedgerSummary | null>(null);
  const [pl, setPl] = useState<ProfitLoss | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    Promise.all([getSummary(), seesReports ? getReport<ProfitLoss>("profit-loss", { range: "fy" }).catch(() => null) : Promise.resolve(null)])
      .then(([a, b]) => {
        setS(a);
        setPl(b);
      })
      .catch(() => setFailed(true));
  }, [seesReports]);
  useEffect(load, [load]);

  const money = s ? s.cash + s.bank : 0;
  return (
    <Card
      icon={<BookOutlined />}
      tint="var(--db-s3)"
      title="Accounts"
      sub={s ? `Your books · ${s.fy}` : "Your books"}
      failed={failed}
      onRetry={load}
      link={{ label: "Ledgers", onClick: () => navigate("/app/ledger") }}
    >
      <div className="pu-dash">
        {s && (
          <button type="button" className={`pu-dash-tile${money < 0 || s.warnings ? " bad" : ""}`} onClick={() => navigate("/app/cash-bank")}>
            <span>Cash &amp; bank</span>
            <b>{rs(money)}</b>
            <small>{s.warnings ? `${s.warnings} cash-limit warning${s.warnings === 1 ? "" : "s"}` : `cash ${rs(s.cash)} · bank ${rs(s.bank)}`}</small>
          </button>
        )}
        {s && (
          <button type="button" className="pu-dash-tile" onClick={() => navigate("/app/ledger?type=customer&filter=due")}>
            <span>You&apos;ll get</span>
            <b>{rs(s.you_get)}</b>
            <small>
              from {s.customers_owing} customer{s.customers_owing === 1 ? "" : "s"}
            </small>
          </button>
        )}
        {s && (
          <button type="button" className="pu-dash-tile" onClick={() => navigate("/app/ledger?type=supplier&filter=due")}>
            <span>You owe</span>
            <b>{rs(s.you_owe)}</b>
            <small>
              to {s.suppliers_owed} supplier{s.suppliers_owed === 1 ? "" : "s"}
            </small>
          </button>
        )}
        {pl && (
          <button type="button" className={`pu-dash-tile${pl.net_profit < 0 ? " bad" : ""}`} onClick={() => navigate("/app/accounts-reports?r=profit-loss")}>
            <span>{pl.net_profit < 0 ? "Loss this FY" : "Profit this FY"}</span>
            <b>{rs(Math.abs(pl.net_profit))}</b>
            <small>{pl.stock_counted ? "so far, after stock" : "before stock — see the report"}</small>
          </button>
        )}
      </div>
    </Card>
  );
};

export default AccountsCard;
