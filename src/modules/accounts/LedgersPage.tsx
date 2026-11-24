import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Pagination, Spin, message } from "antd";
import { BankOutlined, BookOutlined, EditOutlined, ReloadOutlined, RiseOutlined, SearchOutlined, SettingOutlined, ShopOutlined, WarningOutlined, WalletOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { StatTile } from "@/modules/dashboard/components/Bits";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";
import { day, rs } from "@/modules/purchases/format";
import { type CashWarning, type LedgerSummary, type PartyRow, apiError, getParties, getSummary, getWarnings } from "./api";
import StatementDrawer, { type PartyRef, balTone } from "./StatementDrawer";
import { BooksSettingsModal, OpeningsDrawer } from "./OpeningsDrawer";
import "@/modules/purchases/purchases.scss";
import "./accounts.scss";

type Who = "customer" | "supplier";
const FILTERS: Record<Who, { key: string; label: string }[]> = {
  customer: [
    { key: "all", label: "All" },
    { key: "due", label: "Owe you" },
    { key: "advance", label: "Paid in advance" },
    { key: "settled", label: "Settled" },
  ],
  supplier: [
    { key: "all", label: "All" },
    { key: "due", label: "You owe" },
    { key: "advance", label: "Advance paid" },
    { key: "settled", label: "Settled" },
  ],
};

const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};
/** ?party=customer:12 → { type, id } */
const partyFrom = (v: string | null): PartyRef | null => {
  const m = /^(customer|supplier):(\d+)$/.exec(v || "");
  return m ? { type: m[1] as Who, id: Number(m[2]) } : null;
};

/**
 * Accounts → Ledgers: what every customer owes you and what you owe each
 * supplier, from your books (kept from invoices, bills and payments), with
 * cash and bank, the Indian cash-limit warnings and opening balances. A row
 * opens that party's ledger (statement of account).
 */
const LedgersPage: React.FC = () => {
  const { can } = useAccess();
  const [params, setParams] = useSearchParams();
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [warnings, setWarnings] = useState<CashWarning[]>([]);
  const [who, setWho] = useState<Who>(params.get("type") === "supplier" ? "supplier" : "customer");
  const [filter, setFilter] = useState(params.get("filter") || "due");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PartyRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openings, setOpenings] = useState(params.get("openings") === "1");
  const [settings, setSettings] = useState(false);
  const party = partyFrom(params.get("party"));
  const company = useMemo(companyName, []);
  const canRecord = can("accounts.record");

  const loadSummary = useCallback(async () => {
    try {
      const s = await getSummary();
      setSummary(s);
      setWarnings(s.warnings ? (await getWarnings()).rows : []);
    } catch (e) {
      message.error(apiError(e, "Couldn't load your books"));
    }
  }, []);
  // Only the newest request's answer is shown (switching tabs quickly can finish out of order).
  const listSeq = useRef(0);
  const loadList = useCallback(async () => {
    const mine = ++listSeq.current;
    setLoading(true);
    try {
      const r = await getParties({ type: who, q, filter, page, limit: 25 });
      if (mine !== listSeq.current) return;
      setRows(r.rows);
      setTotal(r.total);
    } catch (e) {
      if (mine !== listSeq.current) return;
      message.error(apiError(e, "Couldn't load the ledgers"));
      setRows([]);
    } finally {
      if (mine === listSeq.current) setLoading(false);
    }
  }, [who, q, filter, page]);
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);
  useEffect(() => {
    const t = setTimeout(loadList, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadList, q]);
  const reload = () => {
    loadSummary();
    loadList();
  };

  const openParty = (p: PartyRef | null) => {
    if (p) params.set("party", `${p.type}:${p.id}`);
    else params.delete("party");
    setParams(params, { replace: true });
  };
  const show = (w: Who, f: string) => {
    setWho(w);
    setFilter(f);
    setPage(1);
  };

  const cashBank = (summary?.cash || 0) + (summary?.bank || 0);
  return (
    <div className={`db-root pu-root ac-root${loading ? " refreshing" : ""}`}>
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Accounts · {summary?.fy || "…"}
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <BookOutlined />
              </span>
              Ledgers
            </div>
            <div className="db-hero-sub">What every customer owes you and what you owe each supplier — kept from your invoices, bills and payments by themselves.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">You'll get</span>
              <span className="db-hero-number">{rs(summary?.you_get ?? 0)}</span>
              <span className="db-hero-figure-foot">
                <span>
                  {summary ? `from ${summary.customers_owing} customer${summary.customers_owing === 1 ? "" : "s"} · you owe ${rs(summary.you_owe)}` : "…"}
                  {summary ? ` · books from ${day(summary.books_start)}` : ""}
                </span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{rs(summary?.cash ?? 0)}</b>
                <span>Cash</span>
              </div>
              <div className="db-hero-stat">
                <b>{rs(summary?.bank ?? 0)}</b>
                <span>Bank</span>
              </div>
            </div>
            {canRecord && (
              <div className="db-hero-btns">
                <button type="button" className="db-btn glass" onClick={() => setSettings(true)}>
                  <SettingOutlined /> Settings
                </button>
                <button type="button" className="db-btn white" onClick={() => setOpenings(true)}>
                  <EditOutlined /> Opening balances
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {summary && (
        <div className="db-tiles">
          <StatTile index={0} icon={<RiseOutlined />} label="You'll get" value={rs(summary.you_get)} tint="var(--db-s1)" sub={`${summary.customers_owing} customer${summary.customers_owing === 1 ? "" : "s"} owe you`} onClick={() => show("customer", "due")} />
          <StatTile index={1} icon={<ShopOutlined />} label="You owe" value={rs(summary.you_owe)} tint="var(--db-s4)" sub={`to ${summary.suppliers_owed} supplier${summary.suppliers_owed === 1 ? "" : "s"}`} onClick={() => show("supplier", "due")} />
          <StatTile index={2} icon={<BankOutlined />} label="Cash & bank" value={rs(cashBank)} tint="var(--db-s7)" sub={`Cash ${rs(summary.cash)} · Bank ${rs(summary.bank)}`} />
          {summary.warnings ? (
            <StatTile index={3} icon={<WarningOutlined />} label="Cash-limit warnings" value={String(summary.warnings)} tint="var(--db-critical)" sub="income-tax rules — see below" />
          ) : (
            <StatTile index={3} icon={<WalletOutlined />} label="Advances" value={rs(summary.advances_received)} tint="var(--db-s2)" sub={`received · ${rs(summary.advances_paid)} paid to suppliers`} onClick={() => show("customer", "advance")} />
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="ac-warns" role="alert">
          <h4>
            <WarningOutlined /> Cash over the income-tax limits
          </h4>
          <ul>
            {warnings.slice(0, 6).map((w, i) => (
              <li key={i}>
                <span className="pu-chip bad">{w.rule}</span>
                {day(w.date)} — {w.message}{" "}
                {w.party_id && w.party_type && (
                  <button type="button" onClick={() => openParty({ type: w.party_type === "SUPPLIER" ? "supplier" : "customer", id: w.party_id! })}>
                    Open ledger
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`db-filter${loading ? " loading" : ""}`}>
        <div className="pu-tabs" role="tablist" aria-label="Whose ledgers">
          <button type="button" className={who === "customer" ? "on" : ""} onClick={() => show("customer", filter)}>
            Customers
          </button>
          <button type="button" className={who === "supplier" ? "on" : ""} onClick={() => show("supplier", filter)}>
            Suppliers
          </button>
        </div>
        <div className="pu-tabs" role="tablist" aria-label="Which">
          {FILTERS[who].map((f) => (
            <button key={f.key} type="button" className={filter === f.key ? "on" : ""} onClick={() => (setFilter(f.key), setPage(1))}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="db-filter-right">
          <Input className="pu-search" allowClear prefix={<SearchOutlined />} placeholder={who === "customer" ? "Customer, GSTIN or phone" : "Supplier, GSTIN or phone"} value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          <Button icon={<ReloadOutlined />} onClick={reload} aria-label="Refresh" />
        </div>
        <div className="db-filter-progress" />
      </div>

      <div className="pu-list" role="list">
        {rows === null ? (
          <div className="pu-empty">
            <Spin />
          </div>
        ) : !rows.length ? (
          <div className="pu-empty">
            <b>{q ? "No one matches" : filter === "due" ? (who === "customer" ? "No one owes you" : "You don't owe anyone") : "No one here"}</b>
            {!q && filter === "due" && (who === "customer" ? "Invoices you raise and payments you receive keep these ledgers by themselves." : "Supplier bills and payments keep these ledgers by themselves.")}
          </div>
        ) : (
          rows.map((r) => {
            const tone = balTone(who === "customer" ? "CUSTOMER" : "SUPPLIER", r.balance);
            return (
              <div key={r.id} className="pu-row" role="listitem" tabIndex={0} onClick={() => openParty({ type: who, id: r.id })} onKeyDown={(e) => e.key === "Enter" && openParty({ type: who, id: r.id })}>
                <div className="pu-row-main">
                  <div className="pu-row-title">
                    {r.name}
                    {!r.is_active && <span className="pu-chip">Archived</span>}
                  </div>
                  <div className="pu-row-sub">{[r.gstin ? `GSTIN ${r.gstin}` : null, r.phone].filter(Boolean).join(" · ") || "—"}</div>
                </div>
                <div className="pu-row-sub pu-hide-sm">{r.last_date ? `Last entry ${day(r.last_date)}` : "No entries yet"}</div>
                <div className="pu-hide-sm">{r.balance.value !== 0 && <span className={`pu-chip ${tone}`}>{r.balance.words}</span>}</div>
                <div className={`ac-bal ${r.balance.side === "Dr" ? "dr" : r.balance.side === "Cr" ? "cr" : "zero"}`}>
                  {rs(r.balance.amount)}
                  <small>
                    {r.balance.side || "Settled"}
                    {r.balance.side && <span className="ac-words"> · {r.balance.words}</span>}
                  </small>
                </div>
              </div>
            );
          })
        )}
      </div>
      {total > 25 && (
        <div className="pu-pager">
          <Pagination current={page} total={total} pageSize={25} onChange={setPage} showSizeChanger={false} />
        </div>
      )}

      <StatementDrawer party={party} canRecord={canRecord} onClose={() => openParty(null)} onChanged={reload} />
      <OpeningsDrawer
        open={openings}
        difference={summary?.opening_difference}
        onClose={() => {
          setOpenings(false);
          if (params.get("openings")) {
            params.delete("openings");
            setParams(params, { replace: true });
          }
        }}
        onSaved={reload}
        onSettings={() => setSettings(true)}
      />
      <BooksSettingsModal
        open={settings}
        onClose={(saved) => {
          setSettings(false);
          if (saved) reload();
        }}
      />
    </div>
  );
};

export default LedgersPage;
