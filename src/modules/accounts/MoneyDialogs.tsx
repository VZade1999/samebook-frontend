import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Checkbox, DatePicker, Drawer, Input, InputNumber, Modal, Select, Spin, message } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { day, rs2 } from "@/modules/purchases/format";
import { askReason } from "@/modules/purchases/PoDrawer";
import {
  type AccountRow,
  type EntryView,
  type ExpenseHead,
  type OpenInvoices,
  type PayMode,
  PAY_MODES,
  addAccount,
  addExpense,
  addJournal,
  addTransfer,
  apiError,
  cancelEntry,
  getAccounts,
  getBooksSettings,
  getEntry,
  getEntryOf,
  getExpenseHeads,
  getOpenInvoices,
  getParties,
  receivePayment,
  refundCustomer,
} from "./api";
import "@/modules/purchases/purchases.scss";
import "./accounts.scss";

const today = () => dayjs().format("YYYY-MM-DD");
const paise = (v: number | null | undefined) => Math.round((Number(v) || 0) * 100);

/** The company's active bank accounts, for "which bank" pickers. */
export const useBanks = (open: boolean) => {
  const [banks, setBanks] = useState<{ id: number; label: string; is_default: boolean }[]>([]);
  useEffect(() => {
    if (!open) return;
    getBooksSettings()
      .then((s) => setBanks(s.banks.filter((b) => b.is_active).map((b) => ({ id: b.id, label: b.label, is_default: b.is_default }))))
      .catch(() => setBanks([]));
  }, [open]);
  return banks;
};

/** A customer or supplier picker that searches as you type (with their balance). */
export const PartyPicker: React.FC<{ type: "customer" | "supplier"; value: number | null; onChange: (id: number | null, name: string) => void; placeholder?: string; style?: React.CSSProperties }> = ({
  type,
  value,
  onChange,
  placeholder,
  style,
}) => {
  const [opts, setOpts] = useState<{ value: number; label: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const search = useCallback(
    (q: string) => {
      const mine = ++seq.current;
      setLoading(true);
      getParties({ type, q, filter: "all", limit: 20 })
        .then((r) => {
          if (mine !== seq.current) return;
          setOpts(r.rows.map((p) => ({ value: p.id, name: p.name, label: `${p.name}${p.balance.amount ? ` · ${rs2(p.balance.amount)} ${p.balance.side}` : ""}` })));
        })
        .catch(() => mine === seq.current && setOpts([]))
        .finally(() => mine === seq.current && setLoading(false));
    },
    [type],
  );
  useEffect(() => search(""), [search]);
  return (
    <Select
      showSearch
      allowClear
      value={value ?? undefined}
      placeholder={placeholder || (type === "customer" ? "Search a customer" : "Search a supplier")}
      filterOption={false}
      onSearch={search}
      loading={loading}
      options={opts}
      style={style || { width: "100%" }}
      onChange={(v) => onChange(v ?? null, opts.find((o) => o.value === v)?.name || "")}
      notFoundContent={loading ? <Spin size="small" /> : "No one found"}
    />
  );
};

/** Cash or one of the banks. */
const ModeBank: React.FC<{ mode: PayMode; bank: number | null; banks: { id: number; label: string; is_default: boolean }[]; onMode: (m: PayMode) => void; onBank: (b: number | null) => void }> = ({
  mode,
  bank,
  banks,
  onMode,
  onBank,
}) => (
  <div className="ac-grid2">
    <label className="ac-field">
      <b>How</b>
      <Select value={mode} options={PAY_MODES} onChange={onMode} />
    </label>
    {mode !== "CASH" && (
      <label className="ac-field">
        <b>Bank account</b>
        <Select
          value={bank ?? 0}
          onChange={(v) => onBank(v || null)}
          options={[{ value: 0, label: banks.find((b) => b.is_default) ? `Default (${banks.find((b) => b.is_default)!.label})` : "Your default bank" }, ...banks.map((b) => ({ value: b.id, label: b.label }))]}
        />
      </label>
    )}
  </div>
);

// ── Receive a payment ────────────────────────────────────────────────────────

/**
 * Money received from a customer: settles their invoices oldest first (or the
 * ones you choose); what's left over stays as an advance.
 */
export const ReceiveModal: React.FC<{ open: boolean; customerId?: number | null; onClose: (saved: boolean) => void }> = ({ open, customerId, onClose }) => {
  const banks = useBanks(open);
  const [cust, setCust] = useState<number | null>(null);
  const [inv, setInv] = useState<OpenInvoices | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState<PayMode>("UPI");
  const [bank, setBank] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [choose, setChoose] = useState(false);
  const [picked, setPicked] = useState<Record<number, number | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCust(customerId ?? null);
    setInv(null);
    setAmount(null);
    setDate(today());
    setMode("UPI");
    setBank(null);
    setReference("");
    setNotes("");
    setChoose(false);
    setPicked({});
  }, [open, customerId]);
  useEffect(() => {
    if (!open || !cust) return setInv(null);
    getOpenInvoices(cust)
      .then(setInv)
      .catch((e) => message.error(apiError(e, "Couldn't load their invoices")));
  }, [open, cust]);

  // What the payment settles, oldest first (or as chosen).
  const plan = useMemo(() => {
    const list = inv?.invoices || [];
    let left = paise(amount);
    const rows = list.map((i) => {
      const bal = paise(i.balance);
      const p = choose ? Math.min(paise(picked[i.id]), bal) : Math.min(Math.max(left, 0), bal);
      if (!choose) left -= p;
      return { ...i, pay: p };
    });
    const used = rows.reduce((s, r) => s + r.pay, 0);
    return { rows, used, advance: paise(amount) - used };
  }, [inv, amount, choose, picked]);
  const over = choose && plan.used > paise(amount);

  const save = async () => {
    if (!cust) return message.warning("Choose the customer");
    if (!amount) return message.warning("Enter the amount received");
    if (over) return message.warning("The amounts against the invoices add up to more than the payment");
    setSaving(true);
    try {
      const r = await receivePayment({
        customer_id: cust,
        amount,
        date,
        mode,
        bank_account_id: mode === "CASH" ? null : bank,
        reference: reference || undefined,
        notes: notes || undefined,
        ...(choose ? { allocations: plan.rows.filter((x) => x.pay > 0).map((x) => ({ invoice_id: x.id, amount: x.pay / 100 })) } : {}),
      });
      message.success(r.message, 6);
      if (r.warning) Modal.warning({ title: "Cash limit (Section 269ST)", content: r.warning });
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the payment"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Receive a payment" okText="Save receipt" onOk={save} confirmLoading={saving} onCancel={() => onClose(false)} width={680} rootClassName="ac-modal" destroyOnHidden>
      <label className="ac-field">
        <b>From</b>
        <PartyPicker type="customer" value={cust} onChange={(id) => setCust(id)} />
      </label>
      <div className="ac-grid2">
        <label className="ac-field">
          <b>Amount received</b>
          <InputNumber min={0.01} precision={2} prefix="₹" style={{ width: "100%" }} value={amount} onChange={(v) => setAmount(v === null ? null : Number(v))} />
        </label>
        <label className="ac-field">
          <b>Date</b>
          <DatePicker value={dayjs(date)} onChange={(d) => setDate(d ? d.format("YYYY-MM-DD") : today())} format="D MMM YYYY" allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} style={{ width: "100%" }} />
        </label>
      </div>
      <ModeBank mode={mode} bank={bank} banks={banks} onMode={setMode} onBank={setBank} />
      {mode === "CASH" && paise(amount) >= 200_000_00 && (
        <Alert type="error" showIcon style={{ marginBottom: 12 }} title="₹2 lakh or more in cash from one person in a day isn't allowed (Section 269ST — the penalty equals the amount). Take it by bank or UPI." />
      )}
      <div className="ac-grid2">
        <label className="ac-field">
          <b>Reference (optional)</b>
          <Input maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no." />
        </label>
        <label className="ac-field">
          <b>Note (optional)</b>
          <Input maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      {cust && (
        <div className="ac-alloc">
          <div className="ac-alloc-head">
            <b>{inv ? (inv.invoices.length ? "It pays" : "Nothing is due — it will be an advance") : "Loading their invoices…"}</b>
            {inv && inv.invoices.length > 0 && (
              <Checkbox checked={choose} onChange={(e) => setChoose(e.target.checked)}>
                Choose the invoices myself
              </Checkbox>
            )}
          </div>
          {plan.rows.map((r) => (
            <div key={r.id} className={`ac-alloc-row${r.pay ? " on" : ""}`}>
              <span>
                <b>{r.number}</b>
                <small>
                  {day(r.date)} · due {rs2(r.balance)}
                </small>
              </span>
              {choose ? (
                <InputNumber min={0} max={r.balance} precision={2} prefix="₹" value={picked[r.id] ?? null} onChange={(v) => setPicked((p) => ({ ...p, [r.id]: v === null ? null : Number(v) }))} style={{ width: 150 }} />
              ) : (
                <em>{r.pay ? (r.pay >= paise(r.balance) ? `${rs2(r.pay / 100)} · paid` : `${rs2(r.pay / 100)} · part`) : "—"}</em>
              )}
            </div>
          ))}
          {inv && (
            <div className="ac-alloc-foot">
              {over ? <span className="bad">More than the payment by {rs2((plan.used - paise(amount)) / 100)}</span> : <span>{plan.advance > 0 ? `${rs2(plan.advance / 100)} stays as an advance` : amount ? "Nothing left over" : ""}</span>}
              {inv.advance > 0 && <span>They already have {rs2(inv.advance)} in advance</span>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

// ── Refund a customer ────────────────────────────────────────────────────────

/** Pay a customer back out of their advance (unused payments or credit notes). */
export const RefundModal: React.FC<{ customer: { id: number; name: string; advance: number } | null; onClose: (saved: boolean) => void }> = ({ customer, onClose }) => {
  const open = !!customer;
  const banks = useBanks(open);
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState<PayMode>("BANK_TRANSFER");
  const [bank, setBank] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setAmount(customer?.advance || null);
    setDate(today());
    setMode("BANK_TRANSFER");
    setBank(null);
    setReference("");
  }, [open, customer]);
  const save = async () => {
    if (!customer || !amount) return message.warning("Enter the amount paid back");
    setSaving(true);
    try {
      const r = await refundCustomer({ customer_id: customer.id, amount, date, mode, bank_account_id: mode === "CASH" ? null : bank, reference: reference || undefined });
      message.success(r.message);
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the refund"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} title={`Refund to ${customer?.name || ""}`} okText="Save refund" onOk={save} confirmLoading={saving} onCancel={() => onClose(false)} rootClassName="ac-modal" destroyOnHidden>
      <p className="ac-help">They have {rs2(customer?.advance || 0)} with you in advance. Pay back all of it or part.</p>
      <div className="ac-grid2">
        <label className="ac-field">
          <b>Amount</b>
          <InputNumber min={0.01} max={customer?.advance || undefined} precision={2} prefix="₹" style={{ width: "100%" }} value={amount} onChange={(v) => setAmount(v === null ? null : Number(v))} />
        </label>
        <label className="ac-field">
          <b>Date</b>
          <DatePicker value={dayjs(date)} onChange={(d) => setDate(d ? d.format("YYYY-MM-DD") : today())} format="D MMM YYYY" allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} style={{ width: "100%" }} />
        </label>
      </div>
      <ModeBank mode={mode} bank={bank} banks={banks} onMode={setMode} onBank={setBank} />
      <label className="ac-field">
        <b>Reference (optional)</b>
        <Input maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no." />
      </label>
    </Modal>
  );
};

// ── Add an expense ───────────────────────────────────────────────────────────

const GROUP_OPTIONS = [
  { value: "INDIRECT_EXPENSES", label: "Indirect expenses (rent, salary, office…)" },
  { value: "DIRECT_EXPENSES", label: "Direct expenses (labour, factory power…)" },
  { value: "FIXED_ASSETS", label: "Fixed assets (computer, furniture, vehicle…)" },
];

/** An expense paid now, under an expense head, with GST credit when the payee has a GSTIN. */
export const ExpenseModal: React.FC<{ open: boolean; onClose: (saved: boolean) => void }> = ({ open, onClose }) => {
  const banks = useBanks(open);
  const [heads, setHeads] = useState<ExpenseHead[]>([]);
  const [f, setF] = useState({ account_id: null as number | null, date: today(), payee: "", payee_gstin: "", bill_number: "", amount: null as number | null, gst_rate: 0, mode: "CASH" as PayMode, bank: null as number | null, reference: "", notes: "" });
  const [newHead, setNewHead] = useState<{ open: boolean; name: string; group: string }>({ open: false, name: "", group: "INDIRECT_EXPENSES" });
  const [saving, setSaving] = useState(false);
  const loadHeads = useCallback(() => getExpenseHeads().then((r) => setHeads(r.rows)).catch(() => setHeads([])), []);
  useEffect(() => {
    if (!open) return;
    loadHeads();
    setF({ account_id: null, date: today(), payee: "", payee_gstin: "", bill_number: "", amount: null, gst_rate: 0, mode: "CASH", bank: null, reference: "", notes: "" });
  }, [open, loadHeads]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const gstin = f.payee_gstin.trim().toUpperCase();
  const gst = gstin.length === 15 && f.gst_rate ? Math.round(paise(f.amount) * f.gst_rate) / 100 : 0;
  const total = paise(f.amount) + gst;

  const makeHead = async () => {
    try {
      const r = await addAccount({ name: newHead.name, group_code: newHead.group });
      message.success(r.message);
      await loadHeads();
      set({ account_id: r.id });
      setNewHead({ open: false, name: "", group: "INDIRECT_EXPENSES" });
    } catch (e) {
      message.error(apiError(e, "Couldn't add the head"));
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      const r = await addExpense({
        account_id: f.account_id,
        date: f.date,
        payee: f.payee || undefined,
        payee_gstin: gstin || undefined,
        bill_number: f.bill_number || undefined,
        amount: f.amount,
        gst_rate: gstin ? f.gst_rate : 0,
        mode: f.mode,
        bank_account_id: f.mode === "CASH" ? null : f.bank,
        reference: f.reference || undefined,
        notes: f.notes || undefined,
      });
      message.success(r.message);
      if (r.warning) Modal.warning({ title: "Cash limit (Section 40A(3))", content: r.warning });
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the expense"));
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(heads.map((h) => h.group_name))];
  return (
    <Modal open={open} title="Add an expense" okText="Save expense" onOk={save} confirmLoading={saving} onCancel={() => onClose(false)} width={640} rootClassName="ac-modal" destroyOnHidden>
      <label className="ac-field">
        <b>What for</b>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Rent, electricity, salary…"
          value={f.account_id ?? undefined}
          onChange={(v) => set({ account_id: v })}
          options={groups.map((g) => ({ label: g, options: heads.filter((h) => h.group_name === g).map((h) => ({ value: h.id, label: h.name })) }))}
          popupRender={(menu) => (
            <>
              {menu}
              <Button type="link" icon={<PlusOutlined />} onClick={() => setNewHead((n) => ({ ...n, open: true }))}>
                New expense head
              </Button>
            </>
          )}
        />
      </label>
      {newHead.open && (
        <div className="ac-newhead">
          <Input autoFocus placeholder="e.g. Security guard" value={newHead.name} onChange={(e) => setNewHead((n) => ({ ...n, name: e.target.value }))} />
          <Select value={newHead.group} options={GROUP_OPTIONS} onChange={(g) => setNewHead((n) => ({ ...n, group: g }))} style={{ minWidth: 240 }} />
          <Button type="primary" onClick={makeHead} disabled={newHead.name.trim().length < 2}>
            Add
          </Button>
        </div>
      )}
      <div className="ac-grid2">
        <label className="ac-field">
          <b>Paid to (optional)</b>
          <Input maxLength={150} value={f.payee} onChange={(e) => set({ payee: e.target.value })} placeholder="e.g. MSEDCL" />
        </label>
        <label className="ac-field">
          <b>Date</b>
          <DatePicker value={dayjs(f.date)} onChange={(d) => set({ date: d ? d.format("YYYY-MM-DD") : today() })} format="D MMM YYYY" allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} style={{ width: "100%" }} />
        </label>
      </div>
      <div className="ac-grid2">
        <label className="ac-field">
          <b>Their GSTIN (for GST credit)</b>
          <Input maxLength={15} value={f.payee_gstin} onChange={(e) => set({ payee_gstin: e.target.value.toUpperCase(), gst_rate: e.target.value ? f.gst_rate : 0 })} placeholder="Leave empty if none" />
        </label>
        <label className="ac-field">
          <b>Their bill no. (optional)</b>
          <Input maxLength={60} value={f.bill_number} onChange={(e) => set({ bill_number: e.target.value })} />
        </label>
      </div>
      <div className="ac-grid2">
        <label className="ac-field">
          <b>{gstin ? "Amount before GST" : "Amount paid"}</b>
          <InputNumber min={0.01} precision={2} prefix="₹" style={{ width: "100%" }} value={f.amount} onChange={(v) => set({ amount: v === null ? null : Number(v) })} />
        </label>
        <label className="ac-field">
          <b>GST rate</b>
          <Select value={gstin ? f.gst_rate : 0} disabled={!gstin} onChange={(v) => set({ gst_rate: v })} options={[0, 5, 12, 18, 28].map((r) => ({ value: r, label: `${r}%` }))} />
          <small>{gstin ? (gst ? `GST ${rs2(gst / 100)} — you can claim it as input credit` : "No GST on this bill") : "GST credit needs their GSTIN"}</small>
        </label>
      </div>
      <ModeBank mode={f.mode} bank={f.bank} banks={banks} onMode={(m) => set({ mode: m })} onBank={(b) => set({ bank: b })} />
      {f.mode === "CASH" && total > 10_000_00 && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} title="Above ₹10,000 in cash to one person in a day isn't tax-deductible (Section 40A(3)). Pay by bank or UPI." />
      )}
      <div className="ac-grid2">
        <label className="ac-field">
          <b>Reference (optional)</b>
          <Input maxLength={100} value={f.reference} onChange={(e) => set({ reference: e.target.value })} placeholder="UTR / cheque no." />
        </label>
        <label className="ac-field">
          <b>Note (optional)</b>
          <Input maxLength={500} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </div>
      <div className="ac-total">
        Total paid <b>{rs2(total / 100)}</b>
      </div>
    </Modal>
  );
};

// ── Transfer between cash and banks ─────────────────────────────────────────

/** Money moved between cash and a bank, or between banks (a contra entry). */
export const TransferModal: React.FC<{ open: boolean; onClose: (saved: boolean) => void }> = ({ open, onClose }) => {
  const banks = useBanks(open);
  const [from, setFrom] = useState<string>("cash");
  const [to, setTo] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setFrom("cash");
    setTo(null);
    setAmount(null);
    setDate(today());
    setReference("");
  }, [open]);
  const places = [{ value: "cash", label: "Cash in hand" }, ...banks.map((b) => ({ value: String(b.id), label: b.label }))];
  const asPlace = (v: string) => (v === "cash" ? ("cash" as const) : { id: Number(v) });
  const save = async () => {
    if (!to || !amount) return message.warning("Choose where it went and the amount");
    setSaving(true);
    try {
      const r = await addTransfer({ from: asPlace(from), to: asPlace(to), amount, date, reference: reference || undefined });
      message.success(r.message);
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the transfer"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} title="Move money" okText="Save transfer" onOk={save} confirmLoading={saving} onCancel={() => onClose(false)} rootClassName="ac-modal" destroyOnHidden>
      <p className="ac-help">Cash deposited in the bank, cash taken out, or money moved between your banks.</p>
      <div className="ac-grid2">
        <label className="ac-field">
          <b>From</b>
          <Select value={from} options={places} onChange={setFrom} />
        </label>
        <label className="ac-field">
          <b>To</b>
          <Select value={to ?? undefined} placeholder="Choose" options={places.filter((p) => p.value !== from)} onChange={setTo} />
        </label>
      </div>
      <div className="ac-grid2">
        <label className="ac-field">
          <b>Amount</b>
          <InputNumber min={0.01} precision={2} prefix="₹" style={{ width: "100%" }} value={amount} onChange={(v) => setAmount(v === null ? null : Number(v))} />
        </label>
        <label className="ac-field">
          <b>Date</b>
          <DatePicker value={dayjs(date)} onChange={(d) => setDate(d ? d.format("YYYY-MM-DD") : today())} format="D MMM YYYY" allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} style={{ width: "100%" }} />
        </label>
      </div>
      <label className="ac-field">
        <b>Reference (optional)</b>
        <Input maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Deposit slip / cheque no." />
      </label>
    </Modal>
  );
};

// ── Journal ──────────────────────────────────────────────────────────────────

type JLine = { kind: "account" | "customer" | "supplier"; id: number | null; debit: number | null; credit: number | null };
const blankLine = (): JLine => ({ kind: "account", id: null, debit: null, credit: null });

/** A journal entry for the accountant: any accounts, customers or suppliers; debits must equal credits. */
export const JournalModal: React.FC<{ open: boolean; onClose: (saved: boolean) => void }> = ({ open, onClose }) => {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [date, setDate] = useState(today());
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<JLine[]>([blankLine(), blankLine()]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    getAccounts()
      .then((r) => setAccounts(r.rows.filter((a) => a.is_active && !a.is_party_control)))
      .catch(() => setAccounts([]));
    setDate(today());
    setNarration("");
    setLines([blankLine(), blankLine()]);
  }, [open]);
  const dr = lines.reduce((s, l) => s + paise(l.debit), 0);
  const cr = lines.reduce((s, l) => s + paise(l.credit), 0);
  const setLine = (i: number, p: Partial<JLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const save = async () => {
    setSaving(true);
    try {
      const r = await addJournal({
        date,
        narration,
        lines: lines
          .filter((l) => l.id && (l.debit || l.credit))
          .map((l) => ({ ...(l.kind === "account" ? { account_id: l.id! } : { party_type: l.kind, party_id: l.id! }), debit: l.debit || 0, credit: l.credit || 0 })),
      });
      message.success(r.message);
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the journal"));
    } finally {
      setSaving(false);
    }
  };
  const groups = [...new Set(accounts.map((a) => a.group))];
  return (
    <Modal open={open} title="Journal entry" okText="Save journal" onOk={save} confirmLoading={saving} onCancel={() => onClose(false)} width={820} rootClassName="ac-modal" destroyOnHidden>
      <p className="ac-help">For your accountant: adjustments, capital, loans, discounts, write-offs. Debits must equal credits.</p>
      <div className="ac-grid2">
        <label className="ac-field">
          <b>Date</b>
          <DatePicker value={dayjs(date)} onChange={(d) => setDate(d ? d.format("YYYY-MM-DD") : today())} format="D MMM YYYY" allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} style={{ width: "100%" }} />
        </label>
        <label className="ac-field">
          <b>What it's for</b>
          <Input maxLength={300} value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. Discount allowed to Ravi Traders" />
        </label>
      </div>
      <div className="ac-jv">
        {lines.map((l, i) => (
          <div key={i} className="ac-jv-row">
            <Select
              value={l.kind}
              onChange={(k) => setLine(i, { kind: k, id: null })}
              options={[
                { value: "account", label: "Account" },
                { value: "customer", label: "Customer" },
                { value: "supplier", label: "Supplier" },
              ]}
              style={{ width: 120 }}
            />
            {l.kind === "account" ? (
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Choose an account"
                value={l.id ?? undefined}
                onChange={(v) => setLine(i, { id: v })}
                options={groups.map((g) => ({ label: g.replace(/_/g, " ").toLowerCase(), options: accounts.filter((a) => a.group === g).map((a) => ({ value: a.id, label: a.name })) }))}
                style={{ flex: 1, minWidth: 0 }}
              />
            ) : (
              <PartyPicker type={l.kind} value={l.id} onChange={(id) => setLine(i, { id })} style={{ flex: 1, minWidth: 0 }} />
            )}
            <InputNumber min={0} precision={2} placeholder="Debit" value={l.debit} onChange={(v) => setLine(i, { debit: v === null ? null : Number(v), credit: v ? null : l.credit })} style={{ width: 120 }} />
            <InputNumber min={0} precision={2} placeholder="Credit" value={l.credit} onChange={(v) => setLine(i, { credit: v === null ? null : Number(v), debit: v ? null : l.debit })} style={{ width: 120 }} />
            <Button type="text" icon={<DeleteOutlined />} disabled={lines.length <= 2} onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} aria-label="Remove line" />
          </div>
        ))}
        <div className="ac-jv-foot">
          <Button icon={<PlusOutlined />} onClick={() => setLines((ls) => [...ls, blankLine()])} disabled={lines.length >= 50}>
            Add a line
          </Button>
          <span className={dr === cr && dr > 0 ? "good" : "bad"}>
            Debit {rs2(dr / 100)} · Credit {rs2(cr / 100)}
            {dr !== cr ? ` · differ by ${rs2(Math.abs(dr - cr) / 100)}` : ""}
          </span>
        </div>
      </div>
    </Modal>
  );
};

// ── One entry (voucher) ──────────────────────────────────────────────────────

/**
 * Opens the voucher named in the link (?open=receipt:ID, expense:ID or
 * refund:ID — Find uses these), then drops the parameter. Returns the entry
 * to show and a setter for the page's own clicks.
 */
export const useLinkedEntry = (): [number | null, (id: number | null) => void] => {
  const [params, setParams] = useSearchParams();
  const [entryId, setEntryId] = useState<number | null>(null);
  const open = params.get("open") || "";
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const m = /^(receipt|expense|refund):(\d+)$/.exec(open);
    if (!m) return;
    // Not cancelled when the parameter is dropped below (that re-runs this effect).
    getEntryOf(m[1] as "receipt" | "expense" | "refund", Number(m[2]))
      .then((r) => mounted.current && setEntryId(r.id))
      .catch((e) => message.error(apiError(e, "Couldn't open it")));
    setParams(
      (p) => {
        p.delete("open");
        return p;
      },
      { replace: true },
    );
  }, [open, setParams]);
  return [entryId, setEntryId];
};

/** An entry with its lines (account, Dr, Cr); transfers and journals can be cancelled here. */
export const EntryDrawer: React.FC<{ id: number | null; canRecord: boolean; onClose: () => void; onChanged: () => void }> = ({ id, canRecord, onClose, onChanged }) => {
  const [e, setE] = useState<EntryView | null>(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    setE(null);
    if (!id) return;
    getEntry(id)
      .then(setE)
      .catch((err) => {
        message.error(apiError(err, "Couldn't open the entry"));
        closeRef.current();
      });
  }, [id]);
  return (
    <Drawer open={!!id} onClose={onClose} size="min(560px, 100vw)" title={null} rootClassName="pu-drawer ac-drawer" destroyOnHidden>
      {!e ? (
        <div className="pu-empty">
          <Spin />
        </div>
      ) : (
        <>
          <div className="pu-dhead">
            <div className="pu-dhead-top">
              <span className="pu-chip accent">{e.type_word}</span>
              {e.status !== "ACTIVE" && <span className="pu-chip bad">Cancelled</span>}
            </div>
            <h3>{e.number || e.type_word}</h3>
            <p>
              {day(e.date)}
              {e.party_name ? ` · ${e.party_name}` : ""}
            </p>
            <div className="pu-big">{rs2(e.amount)}</div>
            {e.can_cancel && canRecord && (
              <div className="pu-actions">
                <Button
                  danger
                  loading={busy}
                  onClick={async () => {
                    const why = await askReason(`Cancel ${e.number || "this entry"}?`, "Why? e.g. entered by mistake", "Cancel entry");
                    if (!why) return;
                    setBusy(true);
                    try {
                      const r = await cancelEntry(e.id, why);
                      message.success(r.message);
                      onChanged();
                      onClose();
                    } catch (err) {
                      message.error(apiError(err, "Couldn't cancel it"));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Cancel entry
                </Button>
              </div>
            )}
          </div>
          {e.narration && (
            <div className="pu-sec">
              <h4>Narration</h4>
              <p style={{ margin: 0 }}>{e.narration}</p>
            </div>
          )}
          <div className="pu-sec">
            <h4>Lines</h4>
            <div className="ac-vlines">
              <div className="head">
                <span>Account</span>
                <span>Debit</span>
                <span>Credit</span>
              </div>
              {e.lines.map((l, i) => (
                <div key={i}>
                  <span>{l.account}</span>
                  <span>{l.debit ? rs2(l.debit) : ""}</span>
                  <span>{l.credit ? rs2(l.credit) : ""}</span>
                </div>
              ))}
              {e.lines.length > 0 && (
                <div className="foot">
                  <span>Total</span>
                  <span>{rs2(e.lines.reduce((s, l) => s + l.debit, 0))}</span>
                  <span>{rs2(e.lines.reduce((s, l) => s + l.credit, 0))}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
};
