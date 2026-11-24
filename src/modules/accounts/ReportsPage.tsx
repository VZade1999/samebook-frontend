import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, DatePicker, Segmented, Spin, message } from "antd";
import { BarChartOutlined, DownloadOutlined, FilePdfOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { StorageService } from "@/storage";
import { day, rs, rs2 } from "@/modules/purchases/format";
import { type BalanceSheet, type GstReport, type Outstanding, type ProfitLoss, type RangePreset, type ReportRow, type TrialBalance, apiError, getReport } from "./api";
import { type ReportTable, downloadCsv, downloadReportPdf } from "./reportExport";
import "@/modules/purchases/purchases.scss";
import "./accounts.scss";

type Name = "profit-loss" | "balance-sheet" | "trial-balance" | "gst" | "outstanding";
const REPORTS: { key: Name; label: string }[] = [
  { key: "profit-loss", label: "Profit & loss" },
  { key: "balance-sheet", label: "Balance sheet" },
  { key: "trial-balance", label: "Trial balance" },
  { key: "gst", label: "GST summary" },
  { key: "outstanding", label: "Outstanding" },
];
const PERIODS: { value: RangePreset; label: string }[] = [
  { value: "fy", label: "This FY" },
  { value: "last_fy", label: "Last FY" },
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "all", label: "All" },
];
const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};
const monthWord = (ym: string) => dayjs(`${ym}-01`).format("MMM YYYY");
const signed = (v: number) => (v < 0 ? `−${rs2(-v)}` : rs2(v));

/** A titled block of rows with a total (P&L, balance sheet). */
const Block: React.FC<{ title: string; rows: ReportRow[]; total?: number; totalLabel?: string; extra?: React.ReactNode }> = ({ title, rows, total, totalLabel, extra }) => (
  <div className="ac-rep-block">
    <h4>{title}</h4>
    {rows.map((r) => (
      <div key={`${r.code}-${r.id}-${r.name}`} className="ac-rep-line">
        <span>{r.name}</span>
        <b>{signed(r.amount)}</b>
      </div>
    ))}
    {extra}
    {total !== undefined && (
      <div className="ac-rep-line total">
        <span>{totalLabel || `Total ${title.toLowerCase()}`}</span>
        <b>{signed(total)}</b>
      </div>
    )}
  </div>
);

/** Accounts → Reports: profit & loss, balance sheet, trial balance, GST by month, outstanding. */
const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [name, setName] = useState<Name>((params.get("r") as Name) || "profit-loss");
  const [period, setPeriod] = useState<RangePreset>("fy");
  const [asOn, setAsOn] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [who, setWho] = useState<"customer" | "supplier">("customer");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const company = useMemo(companyName, []);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const q = name === "balance-sheet" ? { date: asOn } : name === "outstanding" ? { kind: who } : { range: period };
      const r = await getReport<any>(name, q);
      if (mine === seq.current) setData({ name, ...r });
    } catch (e) {
      if (mine === seq.current) {
        message.error(apiError(e, "Couldn't make the report"));
        setData({ name, error: true });
      }
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [name, period, asOn, who]);
  useEffect(() => {
    load();
  }, [load]);
  const pick = (n: Name) => {
    setName(n);
    setData(null);
    params.set("r", n);
    setParams(params, { replace: true });
  };

  // The current report as a table, for CSV / PDF.
  const table = (): ReportTable | null => {
    if (!data || data.name !== name || data.error) return null;
    if (name === "profit-loss") {
      const p = data as ProfitLoss;
      const rows: (string | number | null)[][] = [];
      const add = (title: string, list: ReportRow[], total: number) => {
        rows.push([title, null]);
        list.forEach((r) => rows.push([`   ${r.name}`, r.amount]));
        rows.push([`Total ${title.toLowerCase()}`, total]);
      };
      add("Sales", p.sales, p.totals.sales);
      if (p.direct_incomes.length) add("Direct incomes", p.direct_incomes, p.totals.direct_incomes);
      if (p.stock_counted) rows.push(["Opening stock", p.opening_stock]);
      add("Purchases", p.purchases, p.totals.purchases);
      if (p.direct_expenses.length) add("Direct expenses", p.direct_expenses, p.totals.direct_expenses);
      if (p.stock_counted) rows.push(["Less: closing stock", p.closing_stock]);
      rows.push(["Gross profit", p.gross_profit]);
      if (p.indirect_incomes.length) add("Other incomes", p.indirect_incomes, p.totals.indirect_incomes);
      add("Expenses", p.indirect_expenses, p.totals.indirect_expenses);
      return { title: "Profit & loss", subtitle: `${day(p.period.from)} – ${day(p.period.to)}`, columns: [{ header: "Particulars" }, { header: "Amount", money: true }], rows, foot: [p.net_profit >= 0 ? "Net profit" : "Net loss", p.net_profit], file: `profit-loss-${p.period.from}-to-${p.period.to}` };
    }
    if (name === "balance-sheet") {
      const b = data as BalanceSheet;
      const rows: (string | number | null)[][] = [];
      const side = (title: string, groups: BalanceSheet["assets"]) => {
        rows.push([title.toUpperCase(), null]);
        groups.forEach((g) => {
          rows.push([g.name, g.total]);
          g.rows.forEach((r) => rows.push([`   ${r.name}`, r.amount]));
        });
      };
      side("Liabilities", b.liabilities);
      rows.push(["Total liabilities", b.total_liabilities]);
      side("Assets", b.assets);
      return { title: "Balance sheet", subtitle: `As on ${day(b.as_on)}`, columns: [{ header: "Particulars" }, { header: "Amount", money: true }], rows, foot: ["Total assets", b.total_assets], file: `balance-sheet-${b.as_on}` };
    }
    if (name === "trial-balance") {
      const t = data as TrialBalance;
      const rows: (string | number | null)[][] = [];
      t.groups.forEach((g) => {
        rows.push([g.name, null, null, null, null]);
        g.rows.forEach((r) => rows.push([`   ${r.name}`, r.closing > 0 ? r.closing : null, r.closing < 0 ? -r.closing : null, r.debit || null, r.credit || null]));
      });
      return {
        title: "Trial balance",
        subtitle: `${day(t.period.from)} – ${day(t.period.to)}`,
        columns: [{ header: "Account" }, { header: "Closing Dr", money: true }, { header: "Closing Cr", money: true }, { header: "Debits in period", money: true }, { header: "Credits in period", money: true }],
        rows,
        foot: ["Total", t.totals.closing_dr, t.totals.closing_cr, t.totals.debit, t.totals.credit],
        file: `trial-balance-${t.period.from}-to-${t.period.to}`,
      };
    }
    if (name === "gst") {
      const g = data as GstReport;
      return {
        title: "GST summary",
        subtitle: `${day(g.period.from)} – ${day(g.period.to)}`,
        columns: [{ header: "Month" }, { header: "Sales", money: true }, { header: "Output GST", money: true }, { header: "Input credit", money: true }, { header: "To pay", money: true }],
        rows: g.months.map((m) => [monthWord(m.month), m.sales, m.output_total, m.input_total, m.net]),
        foot: ["Total", g.totals.sales, g.totals.output, g.totals.input, g.totals.net],
        file: `gst-summary-${g.period.from}-to-${g.period.to}`,
      };
    }
    const o = data as Outstanding;
    return {
      title: o.kind === "customer" ? "Outstanding — customers" : "Outstanding — suppliers",
      subtitle: `As on ${day(o.as_on)}`,
      columns: [{ header: o.kind === "customer" ? "Customer" : "Supplier" }, { header: "Not due", money: true }, { header: "1–30 days", money: true }, { header: "31–60", money: true }, { header: "61–90", money: true }, { header: "90+", money: true }, { header: "Total", money: true }],
      rows: o.rows.map((r) => [r.name, r.not_due, r.d1_30, r.d31_60, r.d61_90, r.d90_plus, r.total]),
      foot: ["Total", o.totals.not_due, o.totals.d1_30, o.totals.d31_60, o.totals.d61_90, o.totals.d90_plus, o.totals.total],
      file: `outstanding-${o.kind}s-${o.as_on}`,
    };
  };

  const ready = data && data.name === name && !data.error;
  const p = ready && name === "profit-loss" ? (data as ProfitLoss) : null;
  const b = ready && name === "balance-sheet" ? (data as BalanceSheet) : null;
  const t = ready && name === "trial-balance" ? (data as TrialBalance) : null;
  const g = ready && name === "gst" ? (data as GstReport) : null;
  const o = ready && name === "outstanding" ? (data as Outstanding) : null;
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
                <BarChartOutlined />
              </span>
              Reports
            </div>
            <div className="db-hero-sub">Profit & loss, balance sheet, trial balance, GST and who owes what — straight from your books, ready for your CA.</div>
            {p && (
              <div className="db-hero-figure">
                <span className="db-hero-figure-label">{p.net_profit >= 0 ? "Net profit" : "Net loss"}</span>
                <span className="db-hero-number">{rs(Math.abs(p.net_profit))}</span>
                <span className="db-hero-figure-foot">
                  <span>
                    {day(p.period.from)} – {day(p.period.to)}
                  </span>
                </span>
              </div>
            )}
          </div>
          <div className="db-hero-right">
            <div className="db-hero-btns">
              <button type="button" className="db-btn glass" disabled={!ready} onClick={() => table() && downloadCsv(table()!)}>
                <DownloadOutlined /> Excel (CSV)
              </button>
              <button type="button" className="db-btn white" disabled={!ready} onClick={() => table() && downloadReportPdf(table()!)}>
                <FilePdfOutlined /> PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`db-filter${loading ? " loading" : ""}`}>
        <div className="pu-tabs" role="tablist" aria-label="Report">
          {REPORTS.map((r) => (
            <button key={r.key} type="button" className={name === r.key ? "on" : ""} onClick={() => pick(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
        {name === "balance-sheet" ? (
          <DatePicker value={dayjs(asOn)} onChange={(d) => setAsOn(d ? d.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"))} format="[As on] D MMM YYYY" allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} />
        ) : name === "outstanding" ? (
          <Segmented
            size="small"
            value={who}
            onChange={(v) => setWho(v as "customer" | "supplier")}
            options={[
              { value: "customer", label: "Customers" },
              { value: "supplier", label: "Suppliers" },
            ]}
          />
        ) : (
          <Segmented size="small" value={period} onChange={(v) => setPeriod(v as RangePreset)} options={PERIODS} />
        )}
        <div className="db-filter-right">
          <Button icon={<ReloadOutlined />} onClick={load} aria-label="Refresh" />
        </div>
        <div className="db-filter-progress" />
      </div>

      <div className="ac-panel ac-report">
        {!ready ? (
          <div className="pu-empty">{data?.error ? <b>The report couldn't be made — try again</b> : <Spin />}</div>
        ) : p ? (
          <>
            {!p.stock_counted && <Alert type="info" showIcon style={{ marginBottom: 12 }} title="Stock isn't counted for this period — purchases count in full. Choose “This FY” (from your books' first day up to today) to value opening and closing stock." />}
            {p.stock_counted && p.unvalued_products > 0 && (
              <Alert type="warning" showIcon style={{ marginBottom: 12 }} title={`${p.unvalued_products} product${p.unvalued_products === 1 ? "" : "s"} in stock have no cost price, so they aren't in closing stock. Set their cost on Products (it's set by itself when goods arrive on a PO).`} />
            )}
            <div className="ac-rep-grid">
              <div>
                <Block title="Sales" rows={p.sales} total={p.totals.sales} />
                {p.direct_incomes.length > 0 && <Block title="Direct incomes" rows={p.direct_incomes} total={p.totals.direct_incomes} />}
                {p.indirect_incomes.length > 0 && <Block title="Other incomes" rows={p.indirect_incomes} total={p.totals.indirect_incomes} />}
              </div>
              <div>
                <Block
                  title="Cost of goods sold"
                  rows={[
                    ...(p.stock_counted ? [{ id: -1, code: "OS", name: "Opening stock", amount: p.opening_stock || 0 }] : []),
                    ...p.purchases,
                    ...p.direct_expenses,
                    ...(p.stock_counted ? [{ id: -2, code: "CS", name: "Less: closing stock (at cost)", amount: -(p.closing_stock || 0) }] : []),
                  ]}
                  total={(p.opening_stock || 0) + p.totals.purchases + p.totals.direct_expenses - (p.closing_stock || 0)}
                  totalLabel="Cost of goods sold"
                />
                <Block title="Expenses" rows={p.indirect_expenses} total={p.totals.indirect_expenses} />
              </div>
            </div>
            <div className="ac-rep-result">
              <div>
                <span>Gross profit</span>
                <b className={p.gross_profit < 0 ? "bad" : "good"}>{signed(p.gross_profit)}</b>
              </div>
              <div className="big">
                <span>{p.net_profit >= 0 ? "Net profit" : "Net loss"}</span>
                <b className={p.net_profit < 0 ? "bad" : "good"}>{signed(p.net_profit)}</b>
              </div>
            </div>
          </>
        ) : b ? (
          <>
            {b.difference !== 0 && <Alert type="error" showIcon style={{ marginBottom: 12 }} title={`The two sides differ by ${rs2(Math.abs(b.difference))} — use “Recheck books” in Ledgers → Settings.`} />}
            {b.opening_difference !== 0 && (
              <Alert type="warning" showIcon style={{ marginBottom: 12 }} title={`Opening balances differ by ${rs2(Math.abs(b.opening_difference))} (shown under Suspense) — enter your capital, loans and other openings in Ledgers → Opening balances.`} />
            )}
            {!b.stock_counted && <Alert type="info" showIcon style={{ marginBottom: 12 }} title="Stock is valued for today only; on past dates the opening stock you entered is shown." />}
            <div className="ac-rep-grid">
              <div>
                <h3 className="ac-rep-side">Liabilities &amp; capital</h3>
                {b.liabilities.map((s) => (
                  <Block key={s.name} title={s.name} rows={s.rows} total={s.total} totalLabel={s.name} />
                ))}
                <div className="ac-rep-line grand">
                  <span>Total</span>
                  <b>{rs2(b.total_liabilities)}</b>
                </div>
              </div>
              <div>
                <h3 className="ac-rep-side">Assets</h3>
                {b.assets.map((s) => (
                  <Block key={s.name} title={s.name} rows={s.rows} total={s.total} totalLabel={s.name} />
                ))}
                <div className="ac-rep-line grand">
                  <span>Total</span>
                  <b>{rs2(b.total_assets)}</b>
                </div>
              </div>
            </div>
          </>
        ) : t ? (
          <>
            <div className={`ac-tb-ok ${t.balanced ? "good" : "bad"}`}>{t.balanced ? `Balanced — closing debits and credits are both ${rs2(t.totals.closing_dr)}` : "Not balanced — use “Recheck books” in Ledgers → Settings"}</div>
            <div className="ac-table" role="table">
              <div className="ac-tr head">
                <span>Account</span>
                <span>Opening</span>
                <span>Debits</span>
                <span>Credits</span>
                <span>Closing</span>
              </div>
              {t.groups.map((gr) => (
                <React.Fragment key={gr.group}>
                  <div className="ac-tr group">
                    <span>{gr.name}</span>
                    <span data-label="Opening">{gr.opening ? `${rs2(Math.abs(gr.opening))} ${gr.opening > 0 ? "Dr" : "Cr"}` : ""}</span>
                    <span data-label="Debits">{rs2(gr.debit)}</span>
                    <span data-label="Credits">{rs2(gr.credit)}</span>
                    <span>{gr.closing ? `${rs2(Math.abs(gr.closing))} ${gr.closing > 0 ? "Dr" : "Cr"}` : "—"}</span>
                  </div>
                  {gr.rows.map((r) => (
                    <div key={r.id} className="ac-tr">
                      <span>{r.name}</span>
                      <span data-label="Opening">{r.opening ? `${rs2(Math.abs(r.opening))} ${r.opening > 0 ? "Dr" : "Cr"}` : ""}</span>
                      <span data-label="Debits">{r.debit ? rs2(r.debit) : ""}</span>
                      <span data-label="Credits">{r.credit ? rs2(r.credit) : ""}</span>
                      <span>{r.closing ? `${rs2(Math.abs(r.closing))} ${r.closing > 0 ? "Dr" : "Cr"}` : "—"}</span>
                    </div>
                  ))}
                </React.Fragment>
              ))}
              <div className="ac-tr foot">
                <span>Total</span>
                <span />
                <span data-label="Debits">{rs2(t.totals.debit)}</span>
                <span data-label="Credits">{rs2(t.totals.credit)}</span>
                <span>
                  {rs2(t.totals.closing_dr)} Dr = {rs2(t.totals.closing_cr)} Cr
                </span>
              </div>
            </div>
          </>
        ) : g ? (
          <>
            <Alert type="info" showIcon style={{ marginBottom: 12 }} title="Output GST on your sales less input credit on purchases and expenses (net of credit and debit notes) — the GSTR-3B view. A minus “credit” carries forward to next month. Check the exact set-off with your CA before filing." />
            <div className="ac-table gst" role="table">
              <div className="ac-tr head">
                <span>Month</span>
                <span>Sales</span>
                <span>Output CGST · SGST · IGST</span>
                <span>Input CGST · SGST · IGST</span>
                <span>To pay</span>
              </div>
              {!g.months.length && <div className="ac-st-empty">No GST in this period.</div>}
              {g.months.map((m) => (
                <div key={m.month} className="ac-tr">
                  <span>{monthWord(m.month)}</span>
                  <span data-label="Sales">{rs2(m.sales)}</span>
                  <span data-label="Output CGST · SGST · IGST">
                    {rs2(m.output.cgst)} · {rs2(m.output.sgst)} · {rs2(m.output.igst)}
                  </span>
                  <span data-label="Input CGST · SGST · IGST">
                    {rs2(m.input.cgst)} · {rs2(m.input.sgst)} · {rs2(m.input.igst)}
                  </span>
                  <span className={m.net > 0 ? "warn" : "good"}>{m.net >= 0 ? rs2(m.net) : `${rs2(-m.net)} credit`}</span>
                </div>
              ))}
              <div className="ac-tr foot">
                <span>Total</span>
                <span data-label="Sales">{rs2(g.totals.sales)}</span>
                <span data-label="Output">{rs2(g.totals.output)}</span>
                <span data-label="Input">{rs2(g.totals.input)}</span>
                <span>{g.totals.net >= 0 ? rs2(g.totals.net) : `${rs2(-g.totals.net)} credit`}</span>
              </div>
            </div>
          </>
        ) : o ? (
          <div className="ac-table age" role="table">
            <div className="ac-tr head">
              <span>{o.kind === "customer" ? "Customer" : "Supplier"}</span>
              <span>Not due</span>
              <span>1–30 days</span>
              <span>31–60</span>
              <span>61–90</span>
              <span>90+</span>
              <span>Total</span>
            </div>
            {!o.rows.length && <div className="ac-st-empty">{o.kind === "customer" ? "No one owes you on invoices." : "You don't owe any supplier on bills."}</div>}
            {o.rows.map((r) => (
              <div key={r.id} className="ac-tr link" role="row" tabIndex={0} onClick={() => navigate(`/app/ledger?party=${o.kind}:${r.id}`)} onKeyDown={(e) => e.key === "Enter" && navigate(`/app/ledger?party=${o.kind}:${r.id}`)}>
                <span>
                  {r.name}
                  <small>
                    {r.docs} {o.kind === "customer" ? "invoice" : "bill"}
                    {r.docs === 1 ? "" : "s"}
                    {r.oldest_days ? ` · oldest ${r.oldest_days} days late` : ""}
                  </small>
                </span>
                <span data-label="Not due">{r.not_due ? rs2(r.not_due) : ""}</span>
                <span data-label="1–30 days">{r.d1_30 ? rs2(r.d1_30) : ""}</span>
                <span data-label="31–60" className={r.d31_60 ? "warn" : ""}>{r.d31_60 ? rs2(r.d31_60) : ""}</span>
                <span data-label="61–90" className={r.d61_90 ? "warn" : ""}>{r.d61_90 ? rs2(r.d61_90) : ""}</span>
                <span data-label="90+" className={r.d90_plus ? "bad" : ""}>{r.d90_plus ? rs2(r.d90_plus) : ""}</span>
                <span>
                  <b>{rs2(r.total)}</b>
                </span>
              </div>
            ))}
            <div className="ac-tr foot">
              <span>Total</span>
              <span data-label="Not due">{rs2(o.totals.not_due)}</span>
              <span data-label="1–30 days">{rs2(o.totals.d1_30)}</span>
              <span data-label="31–60">{rs2(o.totals.d31_60)}</span>
              <span data-label="61–90">{rs2(o.totals.d61_90)}</span>
              <span data-label="90+">{rs2(o.totals.d90_plus)}</span>
              <span>{rs2(o.totals.total)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ReportsPage;
