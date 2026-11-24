import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, DatePicker, Drawer, InputNumber, Modal, Segmented, Spin, message } from "antd";
import { BookOutlined, DownloadOutlined, EditOutlined, ShopOutlined, UserOutlined, WhatsAppOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { waOf } from "@/modules/customers/directory/customersApi";
import { day, rs2 } from "@/modules/purchases/format";
import { type Balance, type RangePreset, type Side, type Statement, type StatementRow, apiError, applyAdvance, getStatement, saveOpenings } from "./api";
import { downloadStatementPdf } from "./statementPdf";
import { ReceiveModal, RefundModal } from "./MoneyDialogs";
import { getOpenInvoices } from "./api";
import { MoneyCollectOutlined } from "@ant-design/icons";
import "@/modules/purchases/purchases.scss";
import "./accounts.scss";

export type PartyRef = { type: "customer" | "supplier"; id: number };

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "fy", label: "This FY" },
  { key: "last_fy", label: "Last FY" },
  { key: "month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "all", label: "All" },
  { key: "custom", label: "Pick dates" },
];

/** "₹12,345.00 Dr" */
export const balText = (b: Balance) => (b.amount ? `${rs2(b.amount)} ${b.side}` : rs2(0));
/** The chip tone for a balance's words. */
export const balTone = (type: "CUSTOMER" | "SUPPLIER", b: Balance) => {
  if (!b.value) return "neutral";
  if (type === "CUSTOMER") return b.value > 0 ? "warn" : "violet";
  return b.value < 0 ? "warn" : "violet";
};

/** Where a ledger line's document opens. */
const docLink = (r: StatementRow) => {
  if (!r.doc_id) return null;
  if (r.source_type === "INVOICE" || r.source_type === "INVOICE_PAYMENT") return `/app/invoice?open=${r.doc_id}`;
  if (r.source_type === "PURCHASE_BILL") return `/app/purchase-bills?open=${r.doc_id}`;
  if (r.source_type === "EXPENSE") return "/app/expenses";
  if (r.source_type === "CREDIT_NOTE") return `/app/notes?open=credit:${r.doc_id}`;
  if (r.source_type === "DEBIT_NOTE") return `/app/notes?tab=debit&open=debit:${r.doc_id}`;
  if (r.source_type === "CUSTOMER_REFUND") return "/app/cash-bank?tab=daybook";
  if (r.source_type === "CUSTOMER_RECEIPT") return "/app/cash-bank?tab=receipts";
  return null;
};

/**
 * One customer's or supplier's ledger (statement of account): the period,
 * opening balance, each entry with the balance after it, closing balance —
 * plus PDF, WhatsApp and their opening balance.
 */
const StatementDrawer: React.FC<{ party: PartyRef | null; canRecord: boolean; onClose: () => void; onChanged?: () => void }> = ({ party, canRecord, onClose, onChanged }) => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<RangePreset>("fy");
  const [dates, setDates] = useState<[Dayjs, Dayjs] | null>(null);
  const [st, setSt] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [opening, setOpening] = useState<{ open: boolean; amount: number | null; side: Side }>({ open: false, amount: null, side: "Dr" });
  const [savingOpening, setSavingOpening] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [advBusy, setAdvBusy] = useState(false);
  const [refunding, setRefunding] = useState<{ id: number; name: string; advance: number } | null>(null);

  // Only the newest request's answer is shown (changing the period quickly can finish out of order).
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!party) return;
    if (preset === "custom" && !dates) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const q = preset === "custom" && dates ? { from: dates[0].format("YYYY-MM-DD"), to: dates[1].format("YYYY-MM-DD") } : { range: preset };
      const r = await getStatement(party.type, party.id, q);
      if (mine === seq.current) setSt(r);
    } catch (e) {
      if (mine !== seq.current) return;
      message.error(apiError(e, "Couldn't load the ledger"));
      if (!st) onClose();
    } finally {
      if (mine === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party, preset, dates]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setSt(null);
    setPreset("fy");
    setDates(null);
  }, [party?.type, party?.id]);

  const isCustomer = party?.type === "customer";
  const share = () => {
    if (!st) return;
    const who = st.party.name;
    const owes = st.closing.value;
    const line = isCustomer
      ? owes > 0
        ? `your balance with us is ${rs2(st.closing.amount)} (due to us)`
        : owes < 0
          ? `you have ${rs2(st.closing.amount)} paid in advance with us`
          : "your account with us is settled — nothing is due"
      : owes < 0
        ? `we owe you ${rs2(st.closing.amount)}`
        : owes > 0
          ? `we have ${rs2(st.closing.amount)} paid in advance with you`
          : "our account with you is settled";
    const text = `Dear ${who},\nAs per our books for ${day(st.period.from)} to ${day(st.period.to)}, ${line}.\nI'm sending the statement of account (PDF) with this message — please check it and let us know if anything differs.\n— ${st.company.name}`;
    const to = waOf(st.party.phone);
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const openOpening = () => {
    if (!st) return;
    setOpening({ open: true, amount: st.party_opening.amount || null, side: st.party_opening.side });
  };
  const saveOpening = async () => {
    if (!party) return;
    setSavingOpening(true);
    try {
      const r = await saveOpenings([{ kind: party.type, id: party.id, amount: opening.amount || 0, side: opening.side }]);
      message.success(r.message);
      setOpening((o) => ({ ...o, open: false }));
      load();
      onChanged?.();
    } catch (e) {
      message.error(apiError(e, "Couldn't save the opening balance"));
    } finally {
      setSavingOpening(false);
    }
  };

  const tone = st ? balTone(st.party.type, st.closing) : "neutral";
  return (
    <Drawer open={!!party} onClose={onClose} size="min(900px, 100vw)" title={null} rootClassName="pu-drawer ac-drawer" destroyOnHidden>
      {!st ? (
        <div className="pu-empty">
          <Spin />
        </div>
      ) : (
        <>
          <div className="pu-dhead">
            <div className="pu-dhead-top">
              <span className="pu-chip accent">
                {isCustomer ? <UserOutlined /> : <ShopOutlined />} {isCustomer ? "Customer ledger" : "Supplier ledger"}
              </span>
              <span className={`pu-chip ${tone}`}>{st.closing.words || "Settled"}</span>
            </div>
            <h3>{st.party.name}</h3>
            <p>{[st.party.gstin ? `GSTIN ${st.party.gstin}` : "No GSTIN", st.party.phone].filter(Boolean).join(" · ")}</p>
            <div className="pu-big">
              {balText(st.closing)} <span className="pu-muted" style={{ fontSize: 13 }}>on {day(st.period.to)}</span>
            </div>
            <div className="pu-actions">
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={pdfBusy}
                onClick={async () => {
                  setPdfBusy(true);
                  try {
                    await downloadStatementPdf(st);
                  } finally {
                    setPdfBusy(false);
                  }
                }}
              >
                Statement PDF
              </Button>
              <Button icon={<WhatsAppOutlined />} disabled={!st.party.phone} title={st.party.phone ? "" : "No phone number saved"} onClick={share}>
                WhatsApp
              </Button>
              {canRecord && isCustomer && (
                <Button icon={<MoneyCollectOutlined />} onClick={() => setReceiving(true)}>
                  Receive payment
                </Button>
              )}
              {canRecord && isCustomer && st.closing.value < 0 && (
                <Button
                  loading={advBusy}
                  onClick={async () => {
                    setAdvBusy(true);
                    try {
                      const r = await applyAdvance(st.party.id);
                      message.success(r.message);
                      load();
                      onChanged?.();
                    } catch (e) {
                      message.error(apiError(e, "Couldn't use the advance"));
                    } finally {
                      setAdvBusy(false);
                    }
                  }}
                >
                  Use advance on invoices
                </Button>
              )}
              {canRecord && isCustomer && st.closing.value < 0 && (
                <Button
                  onClick={async () => {
                    try {
                      const o = await getOpenInvoices(st.party.id);
                      if (!o.advance) return message.info("Nothing to refund — their credit isn't from a payment or credit note (e.g. an opening balance)");
                      setRefunding({ id: st.party.id, name: st.party.name, advance: o.advance });
                    } catch (e) {
                      message.error(apiError(e, "Couldn't check their advance"));
                    }
                  }}
                >
                  Refund
                </Button>
              )}
              {canRecord && (
                <Button icon={<EditOutlined />} onClick={openOpening}>
                  Opening balance
                </Button>
              )}
              <Button icon={<BookOutlined />} onClick={() => navigate(isCustomer ? `/app/customers?open=${st.party.id}` : `/app/suppliers?open=${st.party.id}`)}>
                {isCustomer ? "Customer" : "Supplier"}
              </Button>
            </div>
          </div>

          <div className="ac-period">
            <Segmented size="small" value={preset} onChange={(v) => setPreset(v as RangePreset)} options={PRESETS.map((p) => ({ value: p.key, label: p.label }))} />
            {preset === "custom" && (
              <DatePicker.RangePicker
                size="small"
                format="D MMM YYYY"
                value={dates}
                onChange={(v) => setDates(v && v[0] && v[1] ? [v[0], v[1]] : null)}
                disabledDate={(d) => d.isAfter(dayjs(), "day")}
              />
            )}
            <span className="ac-period-text">
              {day(st.period.from)} – {day(st.period.to)}
              {loading && <Spin size="small" style={{ marginLeft: 8 }} />}
            </span>
          </div>

          <div className={`ac-st${loading ? " loading" : ""}`} role="table" aria-label="Ledger">
            <div className="ac-st-row head" role="row">
              <span role="columnheader">Date</span>
              <span role="columnheader">Particulars</span>
              <span role="columnheader" className="num">
                Debit
              </span>
              <span role="columnheader" className="num">
                Credit
              </span>
              <span role="columnheader" className="num">
                Balance
              </span>
            </div>
            <div className="ac-st-row opening" role="row">
              <span className="ac-st-date">{day(st.period.from)}</span>
              <span className="ac-st-what">
                <b>Opening balance</b>
                <small>{st.period.from === st.books_start ? "on the day your books start" : `brought forward to ${day(st.period.from)}`}</small>
              </span>
              <span className="num" />
              <span className="num" />
              <span className="num bal">{balText(st.opening)}</span>
            </div>
            {!st.rows.length && (
              <div className="ac-st-empty">
                Nothing in this period.
                {st.opening.amount ? "" : isCustomer ? " Invoices and payments for them appear here by themselves." : " Supplier bills and payments appear here by themselves."}
              </div>
            )}
            {st.rows.map((r) => {
              const to = docLink(r);
              return (
                <div
                  key={r.entry_id}
                  role="row"
                  className={`ac-st-row${to ? " link" : ""}${r.type === "OPENING" ? " opening" : ""}`}
                  tabIndex={to ? 0 : undefined}
                  onClick={to ? () => navigate(to) : undefined}
                  onKeyDown={to ? (e) => e.key === "Enter" && navigate(to) : undefined}
                >
                  <span className="ac-st-date">{day(r.date)}</span>
                  <span className="ac-st-what">
                    <b>
                      {r.type_word}
                      {r.number ? <em> {r.number}</em> : null}
                    </b>
                    {r.narration && r.type !== "OPENING" && <small>{r.narration}</small>}
                  </span>
                  <span className="num" data-label="Debit">
                    {r.debit ? rs2(r.debit) : ""}
                  </span>
                  <span className="num" data-label="Credit">
                    {r.credit ? rs2(r.credit) : ""}
                  </span>
                  <span className="num bal" data-label="Balance">
                    {balText(r.balance)}
                  </span>
                </div>
              );
            })}
            <div className="ac-st-row foot" role="row">
              <span />
              <span className="ac-st-what">
                <b>Closing balance</b>
                <small>{st.closing.words || "Settled"}</small>
              </span>
              <span className="num" data-label="Debits">
                {rs2(st.totals.debit)}
              </span>
              <span className="num" data-label="Credits">
                {rs2(st.totals.credit)}
              </span>
              <span className="num bal">{balText(st.closing)}</span>
            </div>
          </div>
          <p className="ac-st-note">
            {isCustomer
              ? "Debit = you billed them · Credit = they paid you. Dr balance = they owe you."
              : "Credit = their bill · Debit = you paid them. Cr balance = you owe them."}{" "}
            Click a line to open its document.
          </p>

          <RefundModal
            customer={refunding}
            onClose={(saved) => {
              setRefunding(null);
              if (saved) {
                load();
                onChanged?.();
              }
            }}
          />
          <ReceiveModal
            open={receiving}
            customerId={st.party.id}
            onClose={(saved) => {
              setReceiving(false);
              if (saved) {
                load();
                onChanged?.();
              }
            }}
          />
          <Modal
            open={opening.open}
            title={`Opening balance — ${st.party.name}`}
            okText="Save"
            onOk={saveOpening}
            confirmLoading={savingOpening}
            onCancel={() => setOpening((o) => ({ ...o, open: false }))}
            destroyOnHidden
          >
            <p className="ac-help">
              What {isCustomer ? "they owed you" : "you owed them"} on the day your books start ({day(st.books_start)}) — from your old books or Tally. Enter 0 to remove it.
            </p>
            <div className="ac-opening-edit">
              <InputNumber
                autoFocus
                min={0}
                precision={2}
                prefix="₹"
                style={{ width: 200 }}
                value={opening.amount}
                onChange={(v) => setOpening((o) => ({ ...o, amount: v === null ? null : Number(v) }))}
              />
              <Segmented
                value={opening.side}
                onChange={(v) => setOpening((o) => ({ ...o, side: v as Side }))}
                options={
                  isCustomer
                    ? [
                        { value: "Dr", label: "They owe you (Dr)" },
                        { value: "Cr", label: "Paid in advance (Cr)" },
                      ]
                    : [
                        { value: "Cr", label: "You owe them (Cr)" },
                        { value: "Dr", label: "Advance paid (Dr)" },
                      ]
                }
              />
            </div>
          </Modal>
        </>
      )}
    </Drawer>
  );
};

export default StatementDrawer;
