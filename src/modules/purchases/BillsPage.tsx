import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Drawer, Dropdown, Input, Pagination, Spin, message } from "antd";
import {
  AlertOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  EllipsisOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { StatTile } from "@/modules/dashboard/components/Bits";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";
import { type BillDetail, type BillRow, type BillSummary, type PaymentRow, apiError, applyAdvance, cancelBill, cancelPayment, getBill, getBillSummary, getBills, getPayments } from "./api";
import { BILL_STATUS, PAY_MODE_SHORT, TAX_TYPE, day, qtyText, rs, rs2 } from "./format";
import { BillForm, PayModal } from "./BillDialogs";
import { askReason } from "./PoDrawer";
import "./purchases.scss";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "UNPAID", label: "To pay" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "DUE_SOON", label: "Due in 7 days" },
  { key: "MSME", label: "MSME" },
  { key: "PAID", label: "Paid" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};

/** What a row's warnings say, shortest first. */
const alertText = (b: BillRow) => {
  const a = b.alerts;
  if (!a) return null;
  if (a.overdue_days > 0) return { tone: "bad", text: `${a.overdue_days} day${a.overdue_days === 1 ? "" : "s"} overdue` };
  if (a.msme_days_left !== null && a.msme_days_left <= 7) return { tone: "warn", text: `MSME: pay within ${Math.max(0, a.msme_days_left)} days` };
  if (a.itc_days_left <= 30) return { tone: "warn", text: `GST credit: pay within ${Math.max(0, a.itc_days_left)} days` };
  return null;
};

const BillDrawer: React.FC<{ id: number | null; onClose: () => void; onChanged: () => void; onPay: (supplierId: number, billId: number) => void; reloadKey: number }> = ({ id, onClose, onChanged, onPay, reloadKey }) => {
  const navigate = useNavigate();
  const [b, setB] = useState<BillDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => {
    if (!id) return;
    getBill(id)
      .then(setB)
      .catch((e) => {
        message.error(apiError(e, "Couldn't open the bill"));
        onClose();
      });
  }, [id, onClose]);
  useEffect(() => {
    setB(null);
    load();
  }, [load, reloadKey]);
  const run = async (k: string, fn: () => Promise<any>) => {
    setBusy(k);
    try {
      const r = await fn();
      message.success(r?.message || "Done");
      if (r?.lines) setB(r);
      else load();
      onChanged();
    } catch (e) {
      message.error(apiError(e, "That didn't work"));
    } finally {
      setBusy(null);
    }
  };
  const st = b ? BILL_STATUS[b.status] : null;
  const a = b?.alerts;
  return (
    <Drawer open={!!id} onClose={onClose} size="min(720px, 100vw)" title={null} rootClassName="pu-drawer" destroyOnHidden>
      {!b ? (
        <div className="pu-empty">
          <Spin />
        </div>
      ) : (
        <>
          <div className="pu-dhead">
            <div className="pu-dhead-top">
              <span className={`pu-chip ${st?.tone}`}>{st?.label}</span>
              {b.msme && <span className="pu-chip violet">MSME supplier</span>}
            </div>
            <h3>
              Bill {b.bill_number} · {b.supplier_name}
            </h3>
            <p>
              {day(b.bill_date)} · pay by {day(b.pay_by)} · {TAX_TYPE[b.tax_type]}
            </p>
            <div className="pu-big">
              {rs2(b.balance_amount)} <span className="pu-muted" style={{ fontSize: 13 }}>due of {rs2(b.grand_total)}</span>
            </div>
            <div className="pu-actions">
              {b.can.pay && (
                <Button type="primary" icon={<WalletOutlined />} onClick={() => onPay(b.supplier_id, b.id)}>
                  Pay
                </Button>
              )}
              {b.can.pay && b.advance_available > 0 && (
                <Button loading={busy === "adv"} onClick={() => run("adv", () => applyAdvance(b.id))}>
                  Use advance ({rs(b.advance_available)})
                </Button>
              )}
              {b.po_id && (
                <Button icon={<FileDoneOutlined />} onClick={() => navigate(`/app/purchase-orders?open=${b.po_id}`)}>
                  {b.po_number}
                </Button>
              )}
              {b.can.cancel && (
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={busy === "cancel"}
                  onClick={async () => {
                    const why = await askReason(`Cancel bill ${b.bill_number}?`, "Why? e.g. entered by mistake", "Cancel bill");
                    if (why) run("cancel", () => cancelBill(b.id, why));
                  }}
                >
                  Cancel bill
                </Button>
              )}
            </div>
          </div>
          {(a || b.rate_warnings.length > 0 || b.cancel_reason) && (
            <div className="pu-sec">
              <div className="pu-notes" style={{ marginBottom: 0 }}>
                {b.cancel_reason && <div className="pu-note bad">Cancelled: {b.cancel_reason}</div>}
                {a && a.overdue_days > 0 && (
                  <div className="pu-note bad">
                    <WarningOutlined /> {a.overdue_days} day{a.overdue_days === 1 ? "" : "s"} past the pay-by date.
                  </div>
                )}
                {a?.msme_due && (
                  <div className={`pu-note ${a.msme_days_left !== null && a.msme_days_left < 0 ? "bad" : "warn"}`}>
                    <SafetyCertificateOutlined /> MSME supplier: pay by {day(a.msme_due)} (45 days) — after that the amount isn't tax-deductible this year (income-tax rule 43B(h)).
                  </div>
                )}
                {a && a.itc_days_left <= 60 && (
                  <div className="pu-note warn">
                    <AlertOutlined /> GST input credit on this bill must be reversed if it is still unpaid on {day(a.itc_due)} (180 days).
                  </div>
                )}
                {b.rate_warnings.map((w) => (
                  <div className="pu-note warn" key={w}>
                    <WarningOutlined /> {w}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="pu-sec">
            <h4>Items</h4>
            <div className="pu-scroll">
              <table className="pu-lines">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="r">Qty</th>
                    <th className="r">Rate</th>
                    <th className="r">GST</th>
                    <th className="r">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {b.lines.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.item_name}
                        {l.hsn_code && <span className="sub">HSN {l.hsn_code}</span>}
                      </td>
                      <td className="r">{qtyText(l.qty, l.unit)}</td>
                      <td className="r">
                        {rs2(l.rate)}
                        {l.discount_percent ? <span className="sub">−{l.discount_percent}%</span> : null}
                      </td>
                      <td className="r">{l.gst_rate}%</td>
                      <td className="r">{rs2(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pu-totals" style={{ marginTop: 10 }}>
              {b.freight_charges > 0 && (
                <div>
                  <span>Freight / packing{b.freight_gst ? "" : " (no GST)"}</span>
                  <b>{rs2(b.freight_charges)}</b>
                </div>
              )}
              <div>
                <span>Taxable value</span>
                <b>{rs2(b.taxable_amount)}</b>
              </div>
              {b.cgst_amount > 0 && (
                <div>
                  <span>CGST + SGST</span>
                  <b>{rs2(b.cgst_amount + b.sgst_amount)}</b>
                </div>
              )}
              {b.igst_amount > 0 && (
                <div>
                  <span>IGST</span>
                  <b>{rs2(b.igst_amount)}</b>
                </div>
              )}
              {b.round_off !== 0 && (
                <div>
                  <span>Round off</span>
                  <b>{rs2(b.round_off)}</b>
                </div>
              )}
              <div className="grand">
                <span>Bill total</span>
                <b>{rs2(b.grand_total)}</b>
              </div>
              <div>
                <span>Paid</span>
                <b>{rs2(b.paid_amount)}</b>
              </div>
            </div>
          </div>
          <div className="pu-sec">
            <h4>Payments</h4>
            {b.payments.length ? (
              <ul className="pu-timeline">
                {b.payments.map((p) => (
                  <li key={p.id}>
                    <b>{rs2(p.amount)}</b> · {PAY_MODE_SHORT[p.mode]}
                    {p.reference ? ` · ${p.reference}` : ""} · {day(p.payment_date)}
                    {p.status !== "ACTIVE" && (
                      <span className="pu-chip bad" style={{ marginLeft: 6 }}>
                        Cancelled
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pu-muted">Nothing paid yet.</p>
            )}
          </div>
          {b.notes && (
            <div className="pu-sec">
              <h4>Notes</h4>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{b.notes}</p>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
};

const BillsPage: React.FC = () => {
  const { can } = useAccess();
  const [params, setParams] = useSearchParams();
  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [tab, setTab] = useState<"bills" | "payments">("bills");
  const [rows, setRows] = useState<BillRow[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>(params.get("status") || "UNPAID");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [billForm, setBillForm] = useState<{ open: boolean; poId: number | null; supplierId: number | null }>({ open: false, poId: null, supplierId: null });
  const [payModal, setPayModal] = useState<{ open: boolean; supplierId: number | null; billId: number | null }>({ open: false, supplierId: null, billId: null });
  const [reloadKey, setReloadKey] = useState(0);
  const openId = Number(params.get("open")) || null;
  const company = useMemo(companyName, []);
  const canBills = can("purchases.bills");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getBillSummary();
      setSummary(s);
      if (tab === "bills") {
        const list = await getBills({ q, status: filter, page, limit: 25 });
        setRows(list.rows);
        setTotal(list.total || 0);
      } else {
        const list = await getPayments({ q, page, limit: 25 });
        setPayments(list.rows);
        setTotal(list.rows.length < 25 && page === 1 ? list.rows.length : page * 25 + 1);
      }
    } catch (e) {
      message.error(apiError(e, "Couldn't load bills"));
      setRows([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [q, filter, page, tab]);
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Deep links: ?new=1&po=ID, ?pay=SUPPLIER, ?open=ID.
  useEffect(() => {
    if (!canBills) return;
    if (params.get("new") === "1") {
      setBillForm({ open: true, poId: Number(params.get("po")) || null, supplierId: Number(params.get("supplier")) || null });
      params.delete("new");
      params.delete("po");
      params.delete("supplier");
      setParams(params, { replace: true });
    } else if (params.get("pay")) {
      setPayModal({ open: true, supplierId: Number(params.get("pay")) || null, billId: null });
      params.delete("pay");
      setParams(params, { replace: true });
    }
  }, [params, setParams, canBills]);

  const open = (id: number | null) => {
    if (id) params.set("open", String(id));
    else params.delete("open");
    setParams(params, { replace: true });
  };
  const refresh = () => {
    load();
    setReloadKey((k) => k + 1);
  };

  return (
    <div className={`db-root pu-root${loading ? " refreshing" : ""}`}>
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Purchases
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <WalletOutlined />
              </span>
              Supplier bills
            </div>
            <div className="db-hero-sub">What you owe suppliers and by when — with the MSME 45-day rule and the GST 180-day credit rule watched for you.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">You owe</span>
              <span className="db-hero-number">{rs(summary?.to_pay ?? 0)}</span>
              <span className="db-hero-figure-foot">
                <span>
                  {summary ? `${summary.unpaid} unpaid bill${summary.unpaid === 1 ? "" : "s"}` : "…"}
                  {summary?.paid_this_month ? ` · ${rs(summary.paid_this_month)} paid this month` : ""}
                </span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{rs(summary?.overdue ?? 0)}</b>
                <span>Overdue</span>
              </div>
              <div className="db-hero-stat">
                <b>{rs(summary?.due_soon ?? 0)}</b>
                <span>Next 7 days</span>
              </div>
            </div>
            {canBills && (
              <div className="db-hero-btns">
                <button type="button" className="db-btn glass" onClick={() => setPayModal({ open: true, supplierId: null, billId: null })}>
                  <WalletOutlined /> Pay a supplier
                </button>
                <button type="button" className="db-btn white" onClick={() => setBillForm({ open: true, poId: null, supplierId: null })}>
                  <FileDoneOutlined /> Enter a bill
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {summary && (
        <div className="db-tiles">
          <StatTile index={0} icon={<WarningOutlined />} label="Overdue" value={rs(summary.overdue)} tint="var(--db-critical)" sub={`${summary.overdue_bills} bill${summary.overdue_bills === 1 ? "" : "s"}`} onClick={() => (setTab("bills"), setFilter("OVERDUE"), setPage(1))} />
          <StatTile index={1} icon={<CalendarOutlined />} label="Due in 7 days" value={rs(summary.due_soon)} tint="var(--db-s4)" sub="plan the payments" onClick={() => (setTab("bills"), setFilter("DUE_SOON"), setPage(1))} />
          <StatTile index={2} icon={<SafetyCertificateOutlined />} label="Owed to MSME suppliers" value={rs(summary.msme)} tint="var(--db-s7)" sub={summary.msme_urgent ? `${summary.msme_urgent} near the 45-day limit` : "pay within 45 days"} onClick={() => (setTab("bills"), setFilter("MSME"), setPage(1))} />
          <StatTile index={3} icon={<AlertOutlined />} label="GST credit at risk" value={rs(summary.itc_risk)} tint="var(--db-s2)" sub="unpaid 150+ days (reverse at 180)" />
        </div>
      )}

      <div className={`db-filter${loading ? " loading" : ""}`}>
        <div className="pu-tabs" role="tablist" aria-label="Show">
          <button type="button" className={tab === "bills" ? "on" : ""} onClick={() => (setTab("bills"), setPage(1))}>
            Bills
          </button>
          <button type="button" className={tab === "payments" ? "on" : ""} onClick={() => (setTab("payments"), setPage(1))}>
            Payments
          </button>
        </div>
        {tab === "bills" && (
          <div className="pu-tabs" role="tablist" aria-label="Which bills">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" className={filter === f.key ? "on" : ""} onClick={() => (setFilter(f.key), setPage(1))}>
                {f.label}
              </button>
            ))}
          </div>
        )}
        <div className="db-filter-right">
          <Input className="pu-search" allowClear prefix={<SearchOutlined />} placeholder={tab === "bills" ? "Bill no., supplier or PO" : "Supplier or reference"} value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          <Button icon={<ReloadOutlined />} onClick={load} aria-label="Refresh" />
        </div>
        <div className="db-filter-progress" />
      </div>

      {tab === "bills" ? (
        <div className="pu-list" role="list">
          {rows === null ? (
            <div className="pu-empty">
              <Spin />
            </div>
          ) : !rows.length ? (
            <div className="pu-empty">
              <b>{filter === "UNPAID" && !q ? "Nothing to pay" : "No bills here"}</b>
              {canBills && !q && "Enter a supplier's bill from a purchase order once the goods arrive — or on its own."}
            </div>
          ) : (
            rows.map((r) => {
              const st = BILL_STATUS[r.status];
              const al = alertText(r);
              return (
                <div key={r.id} className="pu-row" role="listitem" tabIndex={0} onClick={() => open(r.id)} onKeyDown={(e) => e.key === "Enter" && open(r.id)}>
                  <div className="pu-row-main">
                    <div className="pu-row-title">
                      {r.bill_number}
                      {r.msme && <span className="pu-chip violet">MSME</span>}
                    </div>
                    <div className="pu-row-sub">
                      {r.supplier_name}
                      {r.po_number ? ` · ${r.po_number}` : ""}
                    </div>
                  </div>
                  <div className="pu-row-sub pu-hide-sm">
                    {day(r.bill_date)} · pay by {day(r.pay_by)}
                  </div>
                  <div className="pu-hide-sm">
                    <span className={`pu-chip ${st.tone}`}>{st.label}</span>
                    {al && (
                      <span className={`pu-chip ${al.tone}`} style={{ marginLeft: 6 }}>
                        {al.text}
                      </span>
                    )}
                  </div>
                  <div className="pu-num">
                    {rs(r.status === "PAID" || r.status === "CANCELLED" ? r.grand_total : r.balance_amount)}
                    <small>{r.status === "PARTLY_PAID" ? `of ${rs(r.grand_total)}` : r.status === "UNPAID" ? "due" : st.label.toLowerCase()}</small>
                  </div>
                  <span className="pu-hide-sm" aria-hidden>
                    ›
                  </span>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="pu-list" role="list">
          {payments === null ? (
            <div className="pu-empty">
              <Spin />
            </div>
          ) : !payments.length ? (
            <div className="pu-empty">
              <b>No payments yet</b>
            </div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="pu-row" role="listitem" style={{ cursor: "default" }}>
                <div className="pu-row-main">
                  <div className="pu-row-title">
                    {p.supplier_name}
                    {p.status === "CANCELLED" && <span className="pu-chip bad">Cancelled</span>}
                  </div>
                  <div className="pu-row-sub">
                    {PAY_MODE_SHORT[p.mode]}
                    {p.reference ? ` · ${p.reference}` : ""}
                    {p.paid_from ? ` · from ${p.paid_from}` : ""}
                  </div>
                </div>
                <div className="pu-row-sub pu-hide-sm">{day(p.payment_date)}</div>
                <div className="pu-row-sub pu-hide-sm">{p.bills ? `Bills ${p.bills}` : p.po_number ? `Advance on ${p.po_number}` : "Advance"}</div>
                <div className="pu-num">
                  {rs2(p.amount)}
                  <small>{p.advance > 0 ? `${rs(p.advance)} advance left` : " "}</small>
                </div>
                {canBills && p.status === "ACTIVE" ? (
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        {
                          key: "cancel",
                          danger: true,
                          label: "Cancel payment",
                          onClick: async () => {
                            const why = await askReason("Cancel this payment?", "Why? e.g. wrong amount", "Cancel payment");
                            if (!why) return;
                            try {
                              const r = await cancelPayment(p.id, why);
                              message.success(r.message);
                              refresh();
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
      )}
      {total > 25 && (
        <div className="pu-pager">
          <Pagination current={page} total={total} pageSize={25} onChange={setPage} showSizeChanger={false} />
        </div>
      )}

      <BillDrawer id={openId} reloadKey={reloadKey} onClose={() => open(null)} onChanged={load} onPay={(supplierId, billId) => setPayModal({ open: true, supplierId, billId })} />
      <BillForm
        open={billForm.open}
        poId={billForm.poId}
        supplierId={billForm.supplierId}
        onClose={(saved) => {
          setBillForm({ open: false, poId: null, supplierId: null });
          if (saved) {
            refresh();
            open(saved.id);
          }
        }}
      />
      <PayModal
        open={payModal.open}
        supplierId={payModal.supplierId}
        billId={payModal.billId}
        onClose={(paid) => {
          setPayModal({ open: false, supplierId: null, billId: null });
          if (paid) refresh();
        }}
      />
    </div>
  );
};

export default BillsPage;
