import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Dropdown, Input, Pagination, Select, Spin, message } from "antd";
import { CrownOutlined, EllipsisOutlined, MinusCircleOutlined, PercentageOutlined, ReloadOutlined, SearchOutlined, WalletOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { StatTile } from "@/modules/dashboard/components/Bits";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";
import { askReason } from "@/modules/purchases/PoDrawer";
import { day, rs, rs2 } from "@/modules/purchases/format";
import { type ExpenseHead, type ExpenseList, type RangePreset, PAY_MODES, apiError, cancelExpense, getEntryOf, getExpenseHeads, getExpenses } from "./api";
import { EntryDrawer, ExpenseModal, useLinkedEntry } from "./MoneyDialogs";
import "@/modules/purchases/purchases.scss";
import "./accounts.scss";

const PERIODS: { key: RangePreset; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "fy", label: "This FY" },
  { key: "last_fy", label: "Last FY" },
];
const modeWord = (m: string) => PAY_MODES.find((p) => p.value === m)?.label.split(" (")[0] || m;
const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};

/**
 * Accounts → Expenses: what the business spent, by head (rent, salary,
 * electricity…), paid in cash or from a bank, with the GST input credit on
 * bills from GST-registered payees. Each expense records itself in the books.
 */
const ExpensesPage: React.FC = () => {
  const { can } = useAccess();
  const canRecord = can("accounts.record");
  const [params, setParams] = useSearchParams();
  const [period, setPeriod] = useState<RangePreset>("month");
  const [head, setHead] = useState<number | null>(null);
  const [heads, setHeads] = useState<ExpenseHead[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ExpenseList | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(params.get("new") === "1");
  // An expense opens its voucher (Dr expense, Dr GST, Cr cash or bank); Find links here with ?open=expense:ID.
  const [entryId, setEntryId] = useLinkedEntry();
  const openExpense = (id: number) =>
    getEntryOf("expense", id)
      .then((r) => setEntryId(r.id))
      .catch((e) => message.error(apiError(e, "Couldn't open it")));
  const company = useMemo(companyName, []);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const r = await getExpenses({ range: period, account_id: head || undefined, q: q || undefined, page, limit: 25 });
      if (mine === seq.current) setData(r);
    } catch (e) {
      if (mine === seq.current) message.error(apiError(e, "Couldn't load expenses"));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [period, head, q, page]);
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  const loadHeads = useCallback(() => getExpenseHeads().then((r) => setHeads(r.rows)).catch(() => setHeads([])), []);
  useEffect(() => {
    loadHeads();
  }, [loadHeads]);

  const t = data?.totals;
  const top = data?.by_head?.[0];
  return (
    <div className={`db-root pu-root ac-root${loading ? " refreshing" : ""}`}>
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Accounts
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <WalletOutlined />
              </span>
              Expenses
            </div>
            <div className="db-hero-sub">Rent, salaries, electricity, fuel and more — paid in cash or from the bank, with GST credit on bills that carry a GSTIN.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">Spent · {PERIODS.find((p) => p.key === period)?.label.toLowerCase()}</span>
              <span className="db-hero-number">{rs(t?.spent ?? 0)}</span>
              <span className="db-hero-figure-foot">
                <span>{data ? `${t?.count} expense${t?.count === 1 ? "" : "s"} · ${day(data.period.from)} – ${day(data.period.to)}` : "…"}</span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{rs(t?.gst_credit ?? 0)}</b>
                <span>GST credit</span>
              </div>
              <div className="db-hero-stat">
                <b>{rs(t?.cash ?? 0)}</b>
                <span>Paid in cash</span>
              </div>
            </div>
            {canRecord && (
              <div className="db-hero-btns">
                <button type="button" className="db-btn white" onClick={() => setAdding(true)}>
                  <MinusCircleOutlined /> Add expense
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {data && (
        <div className="db-tiles">
          <StatTile index={0} icon={<WalletOutlined />} label="Spent" value={rs(t?.spent ?? 0)} tint="var(--db-s4)" sub={`${t?.count ?? 0} expenses`} />
          <StatTile index={1} icon={<PercentageOutlined />} label="GST input credit" value={rs(t?.gst_credit ?? 0)} tint="var(--db-s1)" sub="claim it in your GST return" />
          <StatTile index={2} icon={<MinusCircleOutlined />} label="Paid in cash" value={rs(t?.cash ?? 0)} tint="var(--db-s2)" sub="above ₹10,000 per person a day isn't deductible" />
          <StatTile index={3} icon={<CrownOutlined />} label="Biggest head" value={top ? rs(top.total) : "—"} tint="var(--db-s7)" sub={top ? top.name : "nothing spent yet"} />
        </div>
      )}

      <div className={`db-filter${loading ? " loading" : ""}`}>
        <div className="pu-tabs" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" className={period === p.key ? "on" : ""} onClick={() => (setPeriod(p.key), setPage(1))}>
              {p.label}
            </button>
          ))}
        </div>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="All heads"
          value={head ?? undefined}
          onChange={(v) => (setHead(v ?? null), setPage(1))}
          options={heads.map((h) => ({ value: h.id, label: h.name }))}
          style={{ minWidth: 200 }}
        />
        <div className="db-filter-right">
          <Input className="pu-search" allowClear prefix={<SearchOutlined />} placeholder="Paid to, bill no., EXP no." value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          <Button icon={<ReloadOutlined />} onClick={load} aria-label="Refresh" />
        </div>
        <div className="db-filter-progress" />
      </div>

      <div className="pu-list" role="list">
        {!data ? (
          <div className="pu-empty">
            <Spin />
          </div>
        ) : !data.rows.length ? (
          <div className="pu-empty">
            <b>No expenses here</b>
            {canRecord && !q && "Add rent, salaries, electricity and other costs — each one is recorded in your books by itself."}
          </div>
        ) : (
          data.rows.map((x) => (
            <div key={x.id} className="pu-row" role="listitem" tabIndex={0} onClick={() => openExpense(x.id)} onKeyDown={(e) => e.key === "Enter" && openExpense(x.id)}>
              <div className="pu-row-main">
                <div className="pu-row-title">
                  {x.head}
                  <span className="pu-chip accent">{x.number}</span>
                  {x.status === "CANCELLED" && <span className="pu-chip bad">Cancelled</span>}
                </div>
                <div className="pu-row-sub">
                  {[x.payee, x.bill_number ? `bill ${x.bill_number}` : null, modeWord(x.mode), x.reference].filter(Boolean).join(" · ") || "—"}
                  {x.status === "CANCELLED" && x.cancel_reason ? ` · cancelled: ${x.cancel_reason}` : ""}
                </div>
              </div>
              <div className="pu-row-sub pu-hide-sm">{day(x.date)}</div>
              <div className="pu-row-sub pu-hide-sm">{x.gst ? `incl. GST ${rs2(x.gst)} (${x.gst_rate}%)` : "No GST credit"}</div>
              <div className="pu-num">
                {rs2(x.total)}
                <small>{x.mode === "CASH" ? "cash" : "bank"}</small>
              </div>
              {canRecord && x.status === "ACTIVE" ? (
                <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      {
                        key: "cancel",
                        danger: true,
                        label: "Cancel expense",
                        onClick: async () => {
                          const why = await askReason(`Cancel ${x.number}?`, "Why? e.g. entered twice", "Cancel expense");
                          if (!why) return;
                          try {
                            const r = await cancelExpense(x.id, why);
                            message.success(r.message);
                            load();
                            loadHeads();
                          } catch (e) {
                            message.error(apiError(e, "Couldn't cancel it"));
                          }
                        },
                      },
                    ],
                  }}
                >
                  <Button type="text" icon={<EllipsisOutlined />} aria-label="More" />
                </Dropdown>
                </span>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>
      {data && data.total > 25 && (
        <div className="pu-pager">
          <Pagination current={page} total={data.total} pageSize={25} onChange={setPage} showSizeChanger={false} />
        </div>
      )}

      <ExpenseModal
        open={adding}
        onClose={(saved) => {
          setAdding(false);
          if (params.get("new")) {
            params.delete("new");
            setParams(params, { replace: true });
          }
          if (saved) {
            load();
            loadHeads();
          }
        }}
      />
      <EntryDrawer id={entryId} canRecord={canRecord} onClose={() => setEntryId(null)} onChanged={load} />
    </div>
  );
};

export default ExpensesPage;
