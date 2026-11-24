import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, DatePicker, Drawer, Input, InputNumber, Modal, Pagination, Popconfirm, Select, Spin, message } from "antd";
import { ReloadOutlined, SearchOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { day, rs2 } from "@/modules/purchases/format";
import {
  type BooksSettings,
  type OpeningKind,
  type OpeningRow,
  type Side,
  apiError,
  getBooksSettings,
  getOpenings,
  recheckBooks,
  saveBooksSettings,
  saveOpenings,
} from "./api";
import "@/modules/purchases/purchases.scss";
import "./accounts.scss";

type Tab = "customer" | "supplier" | "money" | "accounts";
const TABS: { key: Tab; label: string }[] = [
  { key: "customer", label: "Customers" },
  { key: "supplier", label: "Suppliers" },
  { key: "money", label: "Cash & bank" },
  { key: "accounts", label: "Capital, loans & assets" },
];
const SIDES: Record<OpeningKind, { value: Side; label: string }[]> = {
  customer: [
    { value: "Dr", label: "They owe you (Dr)" },
    { value: "Cr", label: "Paid in advance (Cr)" },
  ],
  supplier: [
    { value: "Cr", label: "You owe them (Cr)" },
    { value: "Dr", label: "Advance paid (Dr)" },
  ],
  cash: [{ value: "Dr", label: "In hand (Dr)" }],
  bank: [
    { value: "Dr", label: "In the bank (Dr)" },
    { value: "Cr", label: "Overdraft (Cr)" },
  ],
  account: [
    { value: "Dr", label: "Debit (Dr)" },
    { value: "Cr", label: "Credit (Cr)" },
  ],
};
const whole = (t: Tab) => t === "money" || t === "accounts";
const keyOf = (r: { kind: OpeningKind; id: number | null }) => `${r.kind}:${r.id ?? ""}`;
type Edit = { kind: OpeningKind; id: number | null; amount: number; side: Side };

/**
 * Opening balances on the day the books start: what each customer owed you,
 * what you owed each supplier, cash in hand and each bank. Edits on any tab
 * or page are kept until you press Save; 0 removes an opening.
 */
export const OpeningsDrawer: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void; onSettings: () => void; difference?: { amount: number; side: string } | null }> = ({
  open,
  onClose,
  onSaved,
  onSettings,
  difference,
}) => {
  const [tab, setTab] = useState<Tab>("customer");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ books_start: string; rows: OpeningRow[]; total: number } | null>(null);
  const [edits, setEdits] = useState<Map<string, Edit>>(new Map());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const r = await getOpenings({ kind: tab, q: whole(tab) ? undefined : q, page, limit: 50 });
      setData({ books_start: r.books_start, rows: r.rows, total: r.total });
    } catch (e) {
      message.error(apiError(e, "Couldn't load opening balances"));
    } finally {
      setLoading(false);
    }
  }, [open, tab, q, page]);
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  useEffect(() => {
    if (!open) {
      setEdits(new Map());
      setData(null);
      setTab("customer");
      setQ("");
      setPage(1);
    }
  }, [open]);

  const valueOf = (r: OpeningRow): Edit => edits.get(keyOf(r)) || { kind: r.kind, id: r.id, amount: r.amount, side: r.side };
  const change = (r: OpeningRow, patch: Partial<Edit>) => {
    const next = { ...valueOf(r), ...patch };
    setEdits((m) => {
      const copy = new Map(m);
      if (next.amount === r.amount && (next.side === r.side || !next.amount)) copy.delete(keyOf(r));
      else copy.set(keyOf(r), next);
      return copy;
    });
  };
  const save = async () => {
    setSaving(true);
    try {
      const r = await saveOpenings([...edits.values()].map((e) => ({ kind: e.kind, id: e.id, amount: e.amount || 0, side: e.side })));
      message.success(r.message);
      setEdits(new Map());
      load();
      onSaved();
    } catch (e) {
      message.error(apiError(e, "Couldn't save the opening balances"));
    } finally {
      setSaving(false);
    }
  };
  const close = () => {
    if (!edits.size) return onClose();
    Modal.confirm({ title: "Leave without saving?", content: `${edits.size} opening balance${edits.size === 1 ? "" : "s"} not saved yet.`, okText: "Leave", cancelText: "Stay", onOk: onClose });
  };

  return (
    <Drawer open={open} onClose={close} size="min(760px, 100vw)" title={null} rootClassName="pu-drawer ac-drawer" destroyOnHidden>
      <div className="pu-dhead">
        <div className="pu-dhead-top">
          <span className="pu-chip accent">Books start {data ? day(data.books_start) : "…"}</span>
        </div>
        <h3>Opening balances</h3>
        <p>What was owed, and the cash and bank you had, on the day your books start — copy them from your old books or Tally once. After that everything is recorded by itself.</p>
        <div className="pu-actions">
          <Button icon={<SettingOutlined />} onClick={onSettings}>
            Change the start date
          </Button>
        </div>
      </div>
      <div className="ac-open-bar">
        <div className="pu-tabs" role="tablist" aria-label="Whose openings">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={tab === t.key ? "on" : ""} onClick={() => (setTab(t.key), setPage(1), setQ(""))}>
              {t.label}
            </button>
          ))}
        </div>
        {!whole(tab) && (
          <Input className="pu-search" allowClear prefix={<SearchOutlined />} placeholder={tab === "customer" ? "Customer name or GSTIN" : "Supplier name or GSTIN"} value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
        )}
        {loading && <Spin size="small" />}
      </div>
      <div className="ac-open-list">
        {tab === "accounts" && (
          <p className="ac-help" style={{ margin: "8px 0 4px" }}>
            Your capital, loans, fixed assets, deposits and the stock you had on the first day. Capital and loans are normally Cr, assets and stock Dr. Need another one? Add it in Cash &amp; bank → All accounts.
          </p>
        )}
        {!data ? (
          <div className="pu-empty">
            <Spin />
          </div>
        ) : !data.rows.length ? (
          <div className="pu-empty">
            <b>{q ? "No one matches" : tab === "supplier" ? "No suppliers yet" : tab === "accounts" ? "No accounts yet" : "No customers yet"}</b>
          </div>
        ) : (
          data.rows.map((r) => {
            const v = valueOf(r);
            const changed = edits.has(keyOf(r));
            return (
              <div key={keyOf(r)} className={`ac-open-row${changed ? " changed" : ""}`}>
                <div className="ac-open-name">
                  <b>{r.name}</b>
                  <small>{r.kind === "account" ? r.group || "Account" : r.kind === "cash" ? "Notes and coins in your till or safe" : r.kind === "bank" ? (r.inactive ? "Bank account (not in use)" : "Bank account") : r.gstin ? `GSTIN ${r.gstin}` : "No GSTIN"}</small>
                </div>
                <InputNumber
                  min={0}
                  precision={2}
                  prefix="₹"
                  placeholder="0"
                  style={{ width: "100%" }}
                  value={v.amount || null}
                  onChange={(x) => change(r, { amount: x === null ? 0 : Number(x) })}
                  aria-label={`Opening balance for ${r.name}`}
                />
                <Select className="ac-open-side" value={v.side} options={SIDES[r.kind]} onChange={(s) => change(r, { side: s })} disabled={r.kind === "cash"} aria-label="Which side" />
              </div>
            );
          })
        )}
        {data && data.total > 50 && !whole(tab) && (
          <div className="pu-pager">
            <Pagination current={page} total={data.total} pageSize={50} onChange={setPage} showSizeChanger={false} size="small" />
          </div>
        )}
      </div>
      <div className="ac-open-foot">
        <span className="ac-open-count">
          {edits.size
            ? `${edits.size} change${edits.size === 1 ? "" : "s"} to save`
            : difference && difference.amount
              ? `Difference in opening balances: ${rs2(difference.amount)} ${difference.side} — normal until capital, loans and stock are in`
              : "Type an amount; 0 removes an opening."}
        </span>
        <Button onClick={() => setEdits(new Map())} disabled={!edits.size}>
          Undo changes
        </Button>
        <Button type="primary" onClick={save} loading={saving} disabled={!edits.size}>
          Save
        </Button>
      </div>
    </Drawer>
  );
};

/** When the books start and which bank payments go to when none is named; recheck the books. */
export const BooksSettingsModal: React.FC<{ open: boolean; onClose: (saved: boolean) => void }> = ({ open, onClose }) => {
  const [s, setS] = useState<BooksSettings | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [bank, setBank] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    setS(null);
    getBooksSettings()
      .then((r) => {
        setS(r);
        setStart(r.books_start);
        setBank(r.default_bank_account_id);
      })
      .catch((e) => {
        message.error(apiError(e, "Couldn't load the settings"));
        closeRef.current(false);
      });
  }, [open]);
  const save = async () => {
    if (!start) return;
    setSaving(true);
    try {
      const r = await saveBooksSettings({ books_start: start, default_bank_account_id: bank });
      message.success(r.message);
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };
  const inUse = s?.banks.find((b) => b.id === s.bank_in_use);
  return (
    <Modal open={open} title="Books settings" okText="Save" onOk={save} confirmLoading={saving} onCancel={() => onClose(false)} okButtonProps={{ disabled: !s?.can_edit }} rootClassName="ac-modal" destroyOnHidden>
      {!s ? (
        <div className="pu-empty">
          <Spin />
        </div>
      ) : (
        <>
          <label className="ac-field">
            <b>Books start on</b>
            <DatePicker
              value={start ? dayjs(start) : null}
              onChange={(d) => setStart(d ? d.format("YYYY-MM-DD") : null)}
              format="D MMM YYYY"
              allowClear={false}
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
              style={{ width: 220 }}
            />
            <small>Usually 1 April. Opening balances sit on this day, and nothing dated earlier is in the books.</small>
          </label>
          <label className="ac-field">
            <b>Payments go to</b>
            <Select
              value={bank ?? 0}
              onChange={(v) => setBank(v || null)}
              style={{ width: "100%" }}
              options={[
                { value: 0, label: inUse && !s.default_bank_account_id ? `Your default bank (${inUse.label})` : "Your default bank" },
                ...s.banks.filter((b) => b.is_active || b.id === s.default_bank_account_id).map((b) => ({ value: b.id, label: b.label })),
              ]}
            />
            <small>For UPI, card, cheque and bank payments that don't say which bank. Cash goes to Cash.</small>
          </label>
          <div className="ac-field">
            <b>Recheck the books</b>
            <small>Records every invoice, bill and payment again from scratch. Safe — your documents don't change.</small>
            <Popconfirm
              title="Recheck the books now?"
              okText="Recheck"
              onConfirm={async () => {
                setRechecking(true);
                try {
                  const r = await recheckBooks();
                  message.success(r.message);
                } catch (e) {
                  message.error(apiError(e, "Couldn't recheck"));
                } finally {
                  setRechecking(false);
                }
              }}
            >
              <Button icon={<ReloadOutlined />} loading={rechecking} disabled={!s.can_edit} style={{ width: "fit-content" }}>
                Recheck books
              </Button>
            </Popconfirm>
          </div>
        </>
      )}
    </Modal>
  );
};
