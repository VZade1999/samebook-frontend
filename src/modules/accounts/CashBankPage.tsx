import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Dropdown, Input, Pagination, Segmented, Spin, message } from "antd";
import { BankOutlined, EllipsisOutlined, FileTextOutlined, ReloadOutlined, SearchOutlined, SwapOutlined, WalletOutlined, MoneyCollectOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";
import { askReason } from "@/modules/purchases/PoDrawer";
import { day, rs, rs2 } from "@/modules/purchases/format";
import {
  type AccountRow,
  type AccountStatement,
  type DayBookRow,
  type RangePreset,
  type ReceiptRow,
  PAY_MODES,
  apiError,
  cancelReceipt,
  getAccountStatement,
  getAccounts,
  getDayBook,
  getReceipts,
} from "./api";
import { balText } from "./StatementDrawer";
import { EntryDrawer, ExpenseModal, JournalModal, ReceiveModal, TransferModal, useLinkedEntry } from "./MoneyDialogs";
import "@/modules/purchases/purchases.scss";
import "./accounts.scss";

type Tab = "book" | "daybook" | "receipts" | "accounts";
const PERIODS: { value: RangePreset; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "fy", label: "This FY" },
  { value: "last_fy", label: "Last FY" },
  { value: "all", label: "All" },
];
const GROUP_ORDER = ["CASH_IN_HAND", "BANK_ACCOUNTS", "SUNDRY_DEBTORS", "SUNDRY_CREDITORS", "SALES", "DIRECT_INCOMES", "INDIRECT_INCOMES", "PURCHASES", "DIRECT_EXPENSES", "INDIRECT_EXPENSES", "DUTIES_TAXES", "CAPITAL", "LOANS", "CURRENT_LIABILITIES", "FIXED_ASSETS", "CURRENT_ASSETS", "LOANS_ADVANCES", "SUSPENSE"];
const modeWord = (m: string) => PAY_MODES.find((p) => p.value === m)?.label.split(" (")[0] || m;
const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};

/**
 * Accounts → Cash & bank: what you have in cash and in each bank, each one's
 * book (money in, money out, balance), the day book, receipts and every
 * account — plus receiving payments, expenses, moving money and journals.
 */
const CashBankPage: React.FC = () => {
  const { can } = useAccess();
  const canRecord = can("accounts.record");
  const [params, setParams] = useSearchParams();
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null);
  const [groups, setGroups] = useState<{ code: string; name: string }[]>([]);
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "book");
  const [selected, setSelected] = useState<number | null>(Number(params.get("account")) || null);
  const [period, setPeriod] = useState<RangePreset>("month");
  const [book, setBook] = useState<AccountStatement | null>(null);
  const [days, setDays] = useState<{ rows: DayBookRow[]; total: number; kinds: { type: string; word: string; count: number; total: number }[] } | null>(null);
  const [receipts, setReceipts] = useState<{ rows: ReceiptRow[]; total: number } | null>(null);
  const [kind, setKind] = useState<string>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<null | "receive" | "expense" | "transfer" | "journal">(params.get("receive") === "1" ? "receive" : null);
  const [entryId, setEntryId] = useLinkedEntry();
  const company = useMemo(companyName, []);

  // Cash first, then each bank.
  const money = useMemo(
    () =>
      (accounts || [])
        .filter((a) => (a.group === "CASH_IN_HAND" || a.group === "BANK_ACCOUNTS") && (a.is_active || a.entries))
        .sort((a, b) => (a.group === b.group ? a.name.localeCompare(b.name) : a.group === "CASH_IN_HAND" ? -1 : 1)),
    [accounts],
  );
  const loadAccounts = useCallback(async () => {
    try {
      const r = await getAccounts();
      setAccounts(r.rows);
      setGroups(r.groups);
      setSelected((s) => s ?? r.rows.find((a) => a.code === "CASH")?.id ?? null);
    } catch (e) {
      message.error(apiError(e, "Couldn't load your accounts"));
      setAccounts([]);
    }
  }, []);
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const seq = useRef(0);
  const loadTab = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      if (tab === "book" && selected) {
        const r = await getAccountStatement(selected, { range: period });
        if (mine === seq.current) setBook(r);
      } else if (tab === "daybook") {
        const r = await getDayBook({ range: period, type: kind || undefined, q: q || undefined, page, limit: 50 });
        if (mine === seq.current) setDays(r);
      } else if (tab === "receipts") {
        const r = await getReceipts({ q: q || undefined, page, limit: 25 });
        if (mine === seq.current) setReceipts(r);
      }
    } catch (e) {
      if (mine === seq.current) message.error(apiError(e, "Couldn't load that"));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [tab, selected, period, kind, q, page]);
  useEffect(() => {
    const t = setTimeout(loadTab, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadTab, q]);
  const reload = () => {
    loadAccounts();
    loadTab();
  };
  const show = (t: Tab) => {
    setTab(t);
    setPage(1);
    setQ("");
    params.set("tab", t);
    setParams(params, { replace: true });
  };
  const closeDialog = (saved: boolean) => {
    setDialog(null);
    if (params.get("receive")) {
      params.delete("receive");
      params.delete("customer");
      setParams(params, { replace: true });
    }
    if (saved) reload();
  };

  const cash = money.filter((m) => m.group === "CASH_IN_HAND").reduce((s, m) => s + m.balance.value, 0);
  const bank = money.filter((m) => m.group === "BANK_ACCOUNTS").reduce((s, m) => s + m.balance.value, 0);
  const sel = (accounts || []).find((a) => a.id === selected);
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
                <BankOutlined />
              </span>
              Cash &amp; bank
            </div>
            <div className="db-hero-sub">Money in and out of your cash and every bank account — receipts, expenses, deposits — with the day book and all your accounts.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">You have</span>
              <span className="db-hero-number">{rs(cash + bank)}</span>
              <span className="db-hero-figure-foot">
                <span>
                  Cash {rs(cash)} · Bank {rs(bank)}
                </span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            {canRecord && (
              <>
                <div className="db-hero-btns">
                  <button type="button" className="db-btn white" onClick={() => setDialog("receive")}>
                    <MoneyCollectOutlined /> Receive payment
                  </button>
                  <button type="button" className="db-btn glass" onClick={() => setDialog("expense")}>
                    <MinusCircleOutlined /> Add expense
                  </button>
                </div>
                <div className="db-hero-btns">
                  <button type="button" className="db-btn glass" onClick={() => setDialog("transfer")}>
                    <SwapOutlined /> Move money
                  </button>
                  <button type="button" className="db-btn glass" onClick={() => setDialog("journal")}>
                    <FileTextOutlined /> Journal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="ac-money">
        {accounts === null ? (
          <Spin />
        ) : (
          money.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`ac-money-card${tab === "book" && selected === m.id ? " on" : ""}${m.balance.value < 0 ? " neg" : ""}`}
              onClick={() => (setSelected(m.id), show("book"))}
            >
              <span>
                {m.group === "CASH_IN_HAND" ? <WalletOutlined /> : <BankOutlined />} {m.name}
              </span>
              <b>{rs(m.balance.value)}</b>
              <small>{m.group === "BANK_ACCOUNTS" && m.balance.value < 0 ? "Overdraft" : `${m.entries} entr${m.entries === 1 ? "y" : "ies"}`}</small>
            </button>
          ))
        )}
      </div>

      <div className={`db-filter${loading ? " loading" : ""}`}>
        <div className="pu-tabs" role="tablist" aria-label="Show">
          {(
            [
              ["book", sel && tab === "book" ? `${sel.name} book` : "Book"],
              ["daybook", "Day book"],
              ["receipts", "Receipts"],
              ["accounts", "All accounts"],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => show(k)}>
              {label}
            </button>
          ))}
        </div>
        {(tab === "book" || tab === "daybook") && <Segmented size="small" value={period} onChange={(v) => (setPeriod(v as RangePreset), setPage(1))} options={PERIODS} />}
        <div className="db-filter-right">
          {(tab === "daybook" || tab === "receipts") && (
            <Input className="pu-search" allowClear prefix={<SearchOutlined />} placeholder={tab === "daybook" ? "Number or narration" : "Receipt no., customer, reference"} value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          )}
          <Button icon={<ReloadOutlined />} onClick={reload} aria-label="Refresh" />
        </div>
        <div className="db-filter-progress" />
      </div>

      {tab === "book" && (
        <div className="ac-panel">
          {!book ? (
            <div className="pu-empty">
              <Spin />
            </div>
          ) : (
            <>
              <div className="ac-book-head">
                <h3>
                  {book.account.name} <span className="pu-chip">{book.account.group_name}</span>
                </h3>
                <span className="ac-period-text">
                  {day(book.period.from)} – {day(book.period.to)}
                </span>
              </div>
              <div className="ac-st" role="table" aria-label="Book">
                <div className="ac-st-row head" role="row">
                  <span>Date</span>
                  <span>Particulars</span>
                  <span className="num">{book.account.nature === "ASSET" ? "In (Dr)" : "Debit"}</span>
                  <span className="num">{book.account.nature === "ASSET" ? "Out (Cr)" : "Credit"}</span>
                  <span className="num">Balance</span>
                </div>
                <div className="ac-st-row opening" role="row">
                  <span className="ac-st-date">{day(book.period.from)}</span>
                  <span className="ac-st-what">
                    <b>Opening balance</b>
                  </span>
                  <span className="num" />
                  <span className="num" />
                  <span className="num bal">{balText(book.opening)}</span>
                </div>
                {!book.rows.length && <div className="ac-st-empty">Nothing in this period.</div>}
                {book.rows.map((r) => (
                  <div key={`${r.entry_id}-${r.debit}-${r.credit}`} role="row" className="ac-st-row link" tabIndex={0} onClick={() => setEntryId(r.entry_id)} onKeyDown={(e) => e.key === "Enter" && setEntryId(r.entry_id)}>
                    <span className="ac-st-date">{day(r.date)}</span>
                    <span className="ac-st-what">
                      <b>
                        {r.type_word}
                        {r.number ? <em> {r.number}</em> : null}
                      </b>
                      <small>{[r.party_name, r.narration].filter(Boolean).join(" · ")}</small>
                    </span>
                    <span className="num" data-label="In">
                      {r.debit ? rs2(r.debit) : ""}
                    </span>
                    <span className="num" data-label="Out">
                      {r.credit ? rs2(r.credit) : ""}
                    </span>
                    <span className="num bal" data-label="Balance">
                      {balText(r.balance)}
                    </span>
                  </div>
                ))}
                <div className="ac-st-row foot" role="row">
                  <span />
                  <span className="ac-st-what">
                    <b>Closing balance</b>
                  </span>
                  <span className="num">{rs2(book.totals.debit)}</span>
                  <span className="num">{rs2(book.totals.credit)}</span>
                  <span className="num bal">{balText(book.closing)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "daybook" && (
        <>
          {days && days.kinds.length > 0 && (
            <div className="ac-kinds">
              <button type="button" className={`pu-chip${!kind ? " accent" : ""}`} onClick={() => (setKind(""), setPage(1))}>
                All · {days.kinds.reduce((s, k) => s + k.count, 0)}
              </button>
              {days.kinds.map((k) => (
                <button key={k.type} type="button" className={`pu-chip${kind === k.type ? " accent" : ""}`} onClick={() => (setKind(k.type), setPage(1))}>
                  {k.word} · {k.count} · {rs(k.total)}
                </button>
              ))}
            </div>
          )}
          <div className="pu-list" role="list">
            {!days ? (
              <div className="pu-empty">
                <Spin />
              </div>
            ) : !days.rows.length ? (
              <div className="pu-empty">
                <b>No entries in this period</b>
              </div>
            ) : (
              days.rows.map((r) => (
                <div key={r.id} className="pu-row" role="listitem" tabIndex={0} onClick={() => setEntryId(r.id)} onKeyDown={(e) => e.key === "Enter" && setEntryId(r.id)}>
                  <div className="pu-row-main">
                    <div className="pu-row-title">
                      {r.type_word}
                      {r.number && <span className="pu-chip accent">{r.number}</span>}
                    </div>
                    <div className="pu-row-sub">{[r.party_name, r.narration].filter(Boolean).join(" · ") || "—"}</div>
                  </div>
                  <div className="pu-row-sub pu-hide-sm">{day(r.date)}</div>
                  <div className="pu-hide-sm" />
                  <div className="pu-num">{rs2(r.amount)}</div>
                </div>
              ))
            )}
          </div>
          {days && days.total > 50 && (
            <div className="pu-pager">
              <Pagination current={page} total={days.total} pageSize={50} onChange={setPage} showSizeChanger={false} />
            </div>
          )}
        </>
      )}

      {tab === "receipts" && (
        <>
          <div className="pu-list" role="list">
            {!receipts ? (
              <div className="pu-empty">
                <Spin />
              </div>
            ) : !receipts.rows.length ? (
              <div className="pu-empty">
                <b>No receipts yet</b>
                {canRecord && "Use “Receive payment” when a customer pays for one or more invoices, or in advance."}
              </div>
            ) : (
              receipts.rows.map((r) => (
                <div key={r.id} className="pu-row" role="listitem" style={{ cursor: "default" }}>
                  <div className="pu-row-main">
                    <div className="pu-row-title">
                      {r.number}
                      {r.status === "CANCELLED" && <span className="pu-chip bad">Cancelled</span>}
                      {r.advance > 0 && <span className="pu-chip violet">{rs(r.advance)} advance</span>}
                    </div>
                    <div className="pu-row-sub">
                      {r.customer_name} · {modeWord(r.mode)}
                      {r.reference ? ` · ${r.reference}` : ""}
                    </div>
                  </div>
                  <div className="pu-row-sub pu-hide-sm">{day(r.date)}</div>
                  <div className="pu-row-sub pu-hide-sm">{r.invoices || "Advance"}</div>
                  <div className="pu-num">{rs2(r.amount)}</div>
                  {canRecord && r.status === "ACTIVE" ? (
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items: [
                          {
                            key: "cancel",
                            danger: true,
                            label: "Cancel receipt",
                            onClick: async () => {
                              const why = await askReason(`Cancel ${r.number}?`, "Why? e.g. the cheque bounced", "Cancel receipt");
                              if (!why) return;
                              try {
                                const x = await cancelReceipt(r.id, why);
                                message.success(x.message);
                                reload();
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
                  ) : (
                    <span />
                  )}
                </div>
              ))
            )}
          </div>
          {receipts && receipts.total > 25 && (
            <div className="pu-pager">
              <Pagination current={page} total={receipts.total} pageSize={25} onChange={setPage} showSizeChanger={false} />
            </div>
          )}
        </>
      )}

      {tab === "accounts" && (
        <div className="ac-panel ac-groups">
          {!accounts ? (
            <Spin />
          ) : (
            GROUP_ORDER.filter((g) => accounts.some((a) => a.group === g)).map((g) => (
              <div key={g}>
                <h4>{groups.find((x) => x.code === g)?.name || g}</h4>
                <div className="pu-list" role="list">
                  {accounts
                    .filter((a) => a.group === g)
                    .map((a) => (
                      <div key={a.id} className="pu-row" role="listitem" tabIndex={0} onClick={() => (setSelected(a.id), show("book"))} onKeyDown={(e) => e.key === "Enter" && (setSelected(a.id), show("book"))}>
                        <div className="pu-row-main">
                          <div className="pu-row-title">
                            {a.name}
                            {!a.is_active && <span className="pu-chip">Not in use</span>}
                          </div>
                          <div className="pu-row-sub">{a.is_party_control ? "Each customer / supplier has its own ledger" : `${a.entries} entr${a.entries === 1 ? "y" : "ies"}`}</div>
                        </div>
                        <div className="pu-hide-sm" />
                        <div className="pu-hide-sm" />
                        <div className={`ac-bal ${a.balance.side === "Dr" ? "dr" : a.balance.side === "Cr" ? "cr" : "zero"}`}>
                          {rs(a.balance.amount)}
                          <small>{a.balance.side || "—"}</small>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ReceiveModal open={dialog === "receive"} customerId={Number(params.get("customer")) || null} onClose={closeDialog} />
      <ExpenseModal open={dialog === "expense"} onClose={closeDialog} />
      <TransferModal open={dialog === "transfer"} onClose={closeDialog} />
      <JournalModal open={dialog === "journal"} onClose={closeDialog} />
      <EntryDrawer id={entryId} canRecord={canRecord} onClose={() => setEntryId(null)} onChanged={reload} />
    </div>
  );
};

export default CashBankPage;
