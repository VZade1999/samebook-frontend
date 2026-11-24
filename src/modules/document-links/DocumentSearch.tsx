import React, { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { Modal } from "antd";
import { useNavigate } from "react-router-dom";
import { CarOutlined, FileDoneOutlined, FileTextOutlined, ImportOutlined, LoadingOutlined, MinusCircleOutlined, MoneyCollectOutlined, RollbackOutlined, SearchOutlined, ShoppingCartOutlined, UndoOutlined, WalletOutlined } from "@ant-design/icons";
import { inr } from "@/modules/dashboard/utils/format";
import { useAccess } from "@/permissions/useAccess";
import { DOC_LABEL, docPath, searchDocuments } from "./documentLinksService";
import type { SearchResult, SearchType } from "./types";
import "./documentLinks.scss";

const ICON: Record<SearchType, React.ReactNode> = {
  quotation: <FileTextOutlined />,
  challan: <CarOutlined />,
  invoice: <FileDoneOutlined />,
  purchase_order: <ShoppingCartOutlined />,
  grn: <ImportOutlined />,
  supplier_bill: <WalletOutlined />,
  receipt: <MoneyCollectOutlined />,
  expense: <MinusCircleOutlined />,
  refund: <UndoOutlined />,
  credit_note: <RollbackOutlined />,
  debit_note: <RollbackOutlined />,
};

const STATUS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
  PARTIALLY_DISPATCHED: "Approved",
  FULLY_DISPATCHED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  DISPATCHED: "On the road",
  DELIVERED: "Delivered",
  INVOICED: "Invoiced",
  CANCELLED: "Cancelled",
  SUPERSEDED: "Replaced",
  GENERATED: "Unpaid",
  PAID: "Paid",
  PARTIAL: "Part paid",
  PARTIALLY_PAID: "Part paid",
  OVERDUE: "Overdue",
  PENDING_APPROVAL: "Waiting approval",
  PARTLY_RECEIVED: "Part received",
  RECEIVED: "Received",
  CLOSED: "Closed",
  UNPAID: "Unpaid",
  PARTLY_PAID: "Part paid",
};

const MATCHED: Record<string, string> = { po: "PO", vehicle: "Vehicle", eway: "E-way bill", ref: "Supplier ref", bill: "Supplier bill", challan: "Supplier challan" };

/** What matched, in words (a receipt's or expense's reference is its own, not a supplier's). */
const matchedWord = (r: SearchResult) =>
  r.type === "expense" && r.matched === "bill" ? "Bill" : (r.type === "receipt" || r.type === "refund" || r.type === "expense") && r.matched === "ref" ? "Ref" : MATCHED[r.matched];

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

/**
 * "Find any number" in the top bar: one box for quotation, challan and
 * invoice numbers, the customer's PO, vehicle and e-way bill numbers. A
 * result opens that document with its linked documents. Ctrl/⌘ + K opens it.
 */
const DocumentSearch: React.FC = () => {
  const { can } = useAccess();
  const navigate = useNavigate();
  const buys = can("purchases.view") || can("purchases.receive") || can("purchases.bills");
  const books = can("accounts.view") || can("accounts.record") || can("accounts.reports");
  const allowed = can("quotations.view") || can("challans.view") || can("invoices.view") || buys || books;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Ctrl/⌘ + K from anywhere.
  useEffect(() => {
    if (!allowed) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allowed]);

  // Search as you type (after a short pause); the newest request wins.
  useEffect(() => {
    if (!open) return;
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched("");
      setError("");
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const data = await searchDocuments(q, ctrl.signal);
        setResults(data.results || []);
        setSearched(q);
        setError("");
        setActive(0);
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.code === "ERR_CANCELED") return;
        setError(e?.response?.data?.message || e?.message || "The search didn't work. Please try again.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [text, open]);

  const close = useCallback(() => setOpen(false), []);
  const go = useCallback(
    (r: SearchResult) => {
      setOpen(false);
      navigate(docPath(r.type, r.id));
    },
    [navigate],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      setActive(next);
      listRef.current?.querySelectorAll("li")[next]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) go(r);
    }
  };

  if (!allowed) return null;

  const q = text.trim();
  return (
    <>
      <button type="button" className="dl-find" onClick={() => setOpen(true)} aria-label="Find a quotation, challan or invoice" title={`Find any document (${isMac ? "⌘" : "Ctrl"} K)`}>
        <SearchOutlined />
        <span className="dl-find-label">Find</span>
        <kbd>{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </button>
      <Modal
        open={open}
        onCancel={close}
        footer={null}
        title={null}
        closable={false}
        width={640}
        style={{ top: 72 }}
        rootClassName="dl-portal"
        destroyOnHidden
        afterOpenChange={(v) => {
          if (v) inputRef.current?.focus();
          else {
            setText("");
            setResults([]);
            setSearched("");
            setError("");
          }
        }}
      >
        <div className="dl-palette" onKeyDown={onKeyDown}>
          <label className="dl-input">
            {loading ? <LoadingOutlined /> : <SearchOutlined />}
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={buys || books ? "Any document no. · PO · GRN · bill · receipt · credit note · vehicle" : "Quotation, challan or invoice no. · PO · vehicle · e-way bill"}
              aria-label="Find a document by any number"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="dl-results"
              aria-activedescendant={results[active] ? `dl-r-${active}` : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="dl-esc" onClick={close}>
              Esc
            </kbd>
          </label>

          {error ? (
            <div className="dl-empty bad" role="alert">
              {error}
            </div>
          ) : q.length < 2 ? (
            <div className="dl-empty">
              <b>Type any number from a document</b>
              <span>
                For example the invoice's running number (0150), the customer's PO number, a vehicle number (MH12AB1234) or an e-way bill number
                {buys ? " — and your purchase orders, goods received (GRN) and supplier bill numbers" : ""}
                {books ? `${buys ? "," : " — and"} receipts (RCT), expenses (EXP), refunds (RFD), credit notes (CN) and debit notes (DN).` : buys ? "." : "."}
              </span>
            </div>
          ) : results.length ? (
            <ul className="dl-results" id="dl-results" role="listbox" ref={listRef}>
              {results.map((r, i) => (
                <li key={`${r.type}${r.id}`} id={`dl-r-${i}`} role="option" aria-selected={i === active}>
                  <button type="button" className={`dl-result${i === active ? " active" : ""}`} onMouseEnter={() => setActive(i)} onClick={() => go(r)}>
                    <span className={`dl-ico ${r.type}`} aria-hidden>
                      {ICON[r.type]}
                    </span>
                    <span className="dl-main">
                      <span className="dl-line">
                        <b className="dl-num">{r.number}</b>
                        <span className="dl-kind">{DOC_LABEL[r.type]}</span>
                        {r.matched !== "number" && r.matched_value ? (
                          <span className="dl-hit">
                            {matchedWord(r)} {r.matched_value}
                          </span>
                        ) : null}
                      </span>
                      <small>{[r.customer_name, r.date ? dayjs(r.date).format("D MMM YYYY") : null, r.status ? STATUS[r.status] || r.status : null].filter(Boolean).join(" · ")}</small>
                    </span>
                    {r.amount !== null ? <b className="dl-amt">{inr(r.amount)}</b> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : searched === q && !loading ? (
            <div className="dl-empty">
              <b>Nothing found for “{q}”</b>
              <span>Check the number, or search a part of it (the last few digits work).</span>
            </div>
          ) : (
            <div className="dl-empty">Searching…</div>
          )}
          <div className="dl-palette-foot">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open
            </span>
            <span>Opens with all its linked documents</span>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DocumentSearch;
