import React, { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { ApartmentOutlined, CarOutlined, FileDoneOutlined, FileTextOutlined, ReloadOutlined, RightOutlined, WalletOutlined } from "@ant-design/icons";
import { inr } from "@/modules/dashboard/utils/format";
import { docPath, getTrail } from "./documentLinksService";
import type { BalanceLine, DocType, Trail, TrailChallan, TrailInvoice, TrailQuotation } from "./types";
import "./documentLinks.scss";

const day = (v: string | null | undefined) => (v ? dayjs(v).format("D MMM YYYY") : null);
const dayShort = (v: string | null | undefined) => (v ? dayjs(v).format("D MMM") : null);

const QUOTATION_STATUS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
  PARTIALLY_DISPATCHED: "Approved · part sent",
  FULLY_DISPATCHED: "Approved · all sent",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};
const CHALLAN_STATUS: Record<string, string> = {
  DRAFT: "Draft · not sent",
  DISPATCHED: "On the road",
  DELIVERED: "Delivered",
  INVOICED: "Invoiced",
  CANCELLED: "Cancelled",
};

const quotationState = (q: TrailQuotation) =>
  q.invoiced ? (q.fully_billed === false ? "Part billed" : "Invoiced") : QUOTATION_STATUS[String(q.status || "").toUpperCase()] || "Quotation";

/** "Sent 60% · billed 30%" once anything moved or was billed. */
const progressText = (q: TrailQuotation) =>
  q.progress && (q.progress.sent_pct > 0 || q.progress.billed_pct > 0) ? `Sent ${q.progress.sent_pct}% · billed ${q.progress.billed_pct}%` : null;

const qtyText = (n: number, unit: string | null) => `${Number(Number(n).toFixed(3))}${unit ? ` ${unit}` : ""}`;

const invoiceState = (i: TrailInvoice): { text: string; tone: "good" | "warn" | "dead" | "" } => {
  if (!i.live) return { text: "Cancelled", tone: "dead" };
  if (i.total === null) return { text: "Invoice", tone: "" };
  const balance = Number(i.balance ?? 0);
  if (balance <= 0.005 && Number(i.total) > 0) return { text: "Paid", tone: "good" };
  if (Number(i.paid ?? 0) > 0) return { text: `Part paid · ${inr(balance)} due`, tone: "warn" };
  return { text: `Unpaid · ${inr(balance)} due`, tone: "warn" };
};

const challanBilling = (c: TrailChallan) => {
  // Bill first, send in lots: the goods were billed before they left.
  if (c.lot && c.invoice) return `Lot ${c.lot.number}${c.lot.last ? " (last)" : ""} against ${c.invoice.number}`;
  if (c.invoice) return c.invoice.linked ? `Billed on ${c.invoice.number}` : `Covered by ${c.invoice.number} · link it`;
  if (c.moved) return "Not billed yet";
  return null;
};

interface Node {
  key: string;
  type: DocType;
  id: number;
  icon: React.ReactNode;
  kind: string;
  number: string;
  meta: (string | null | false | undefined)[];
  amount: number | null;
  tone?: string;
  dead?: boolean;
  child?: boolean;
}

/**
 * The family of a quotation, delivery challan or invoice — the quotation it
 * came from, its challans, its invoice and payments — each one click away.
 * Fetched fresh on open and whenever `version` changes (billing data is
 * never cached).
 */
const LinkedDocuments: React.FC<{
  type: DocType;
  id: number | null | undefined;
  /** Change it (e.g. the document's status / updated_at) to refetch. */
  version?: unknown;
  /** Called with the loaded trail, e.g. to show its PO elsewhere. */
  onLoaded?: (t: Trail) => void;
  /** Also show the order balance (ordered / sent / billed per item) — on the quotation's panel. */
  showBalance?: boolean;
}> = ({ type, id, version, onLoaded, showBalance }) => {
  const navigate = useNavigate();
  const [trail, setTrail] = useState<Trail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const loadedRef = useRef(onLoaded);
  loadedRef.current = onLoaded;

  const load = useCallback(async () => {
    if (!id) return;
    const mine = ++seq.current;
    setLoading(true);
    setError("");
    try {
      const t = await getTrail(type, id);
      if (mine !== seq.current) return;
      setTrail(t);
      loadedRef.current?.(t);
    } catch (e: any) {
      if (mine !== seq.current) return;
      setError(e?.response?.data?.message || e?.message || "Couldn't load the linked documents");
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [type, id]);

  // A different document: forget the old family right away.
  useEffect(() => {
    setTrail(null);
  }, [type, id]);
  useEffect(() => {
    load();
  }, [load, version]);

  if (!id) return null;
  const mine = trail && trail.focus.type === type && trail.focus.id === id ? trail : null;

  const nodes: Node[] = [];
  [mine?.quotation, ...(mine?.other_quotations || [])].forEach((q) => {
    if (!q) return;
    nodes.push({
      key: `q${q.id}`,
      type: "quotation",
      id: q.id,
      icon: <FileTextOutlined />,
      kind: "Quotation",
      number: q.number,
      meta: [day(q.date), quotationState(q), progressText(q), q.po_number && `PO ${q.po_number}${q.po_date ? ` · ${dayShort(q.po_date)}` : ""}`],
      amount: q.total,
    });
  });
  const child = !!mine?.quotation;
  mine?.challans.forEach((c) =>
    nodes.push({
      key: `c${c.id}`,
      type: "challan",
      id: c.id,
      icon: <CarOutlined />,
      kind: "Challan",
      number: c.number,
      meta: [day(c.date), CHALLAN_STATUS[c.status] || c.status, challanBilling(c)],
      amount: c.value,
      dead: c.status === "CANCELLED",
      child,
    }),
  );
  mine?.invoices.forEach((i) => {
    const s = invoiceState(i);
    nodes.push({
      key: `i${i.id}`,
      type: "invoice",
      id: i.id,
      icon: <FileDoneOutlined />,
      kind: "Invoice",
      number: i.number,
      meta: [day(i.date), s.text],
      amount: i.total,
      tone: s.tone,
      dead: !i.live,
      child,
    });
  });

  const others = nodes.length - 1;
  const pay = mine?.payments;

  return (
    <div className="qd-card dl-card" aria-busy={loading}>
      <h4>
        <ApartmentOutlined /> Linked documents
        {mine && others > 0 ? <span className="dl-count">{others}</span> : null}
        {loading && mine ? <span className="dl-sync" aria-label="Refreshing" /> : null}
      </h4>

      {!mine && !error && (
        <div className="dl-skeleton" aria-label="Loading linked documents">
          <span />
          <span />
        </div>
      )}

      {error && !mine && (
        <div className="dl-error" role="alert">
          {error}
          <button type="button" className="dl-retry" onClick={load}>
            <ReloadOutlined /> Try again
          </button>
        </div>
      )}

      {mine && (
        <>
          <ol className="dl-trail">
            {nodes.map((n) => {
              const here = n.type === type && n.id === id;
              const canOpen = !here && mine.access[n.type];
              const body = (
                <>
                  <span className={`dl-ico ${n.type}`} aria-hidden>
                    {n.icon}
                  </span>
                  <span className="dl-main">
                    <span className="dl-line">
                      <span className="dl-kind">{n.kind}</span>
                      <b className="dl-num">{n.number}</b>
                    </span>
                    <small className={n.tone ? `dl-tone-${n.tone}` : undefined}>{n.meta.filter(Boolean).join(" · ")}</small>
                  </span>
                  <span className="dl-side">
                    {n.amount !== null && n.amount !== undefined ? <b className="dl-amt">{inr(n.amount)}</b> : null}
                    {here ? <em className="dl-here">This one</em> : canOpen ? <RightOutlined className="dl-go" /> : null}
                  </span>
                </>
              );
              const cls = `dl-node${n.child ? " child" : ""}${here ? " here" : ""}${n.dead ? " dead" : ""}`;
              return (
                <li key={n.key} className={cls}>
                  {canOpen ? (
                    <button type="button" className="dl-row" onClick={() => navigate(docPath(n.type, n.id))} title={`Open ${n.kind.toLowerCase()} ${n.number}`}>
                      {body}
                    </button>
                  ) : (
                    <div className="dl-row" title={here ? undefined : mine.access[n.type] ? undefined : "You don't have access to open this"}>
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
            {pay && mine.invoices.length > 0 && (
              <li className={`dl-node child pay${pay.count ? "" : " none"}`}>
                <div className="dl-row">
                  <span className="dl-ico pay" aria-hidden>
                    <WalletOutlined />
                  </span>
                  <span className="dl-main">
                    <span className="dl-line">
                      <span className="dl-kind">Payments</span>
                    </span>
                    <small>
                      {pay.count
                        ? `${pay.count} payment${pay.count === 1 ? "" : "s"} · ${inr(pay.amount)} received${pay.last_date ? ` · last ${day(pay.last_date)}` : ""}`
                        : "No payment received yet"}
                    </small>
                  </span>
                </div>
              </li>
            )}
          </ol>
          {!mine.quotation && type === "challan" && <p className="dl-note">Made without a quotation, so only its own invoice links here.</p>}
          {!mine.quotation && type === "invoice" && (
            <p className="dl-note">
              Made without a quotation{mine.challans.length ? ", for the challans above" : " — no challan or quotation links to it"}.
            </p>
          )}
          {mine.quotation && !mine.challans.length && !mine.invoices.length && <p className="dl-note">No challan or invoice yet.</p>}
          {mine.challans.some((c) => c.invoice && !c.invoice.linked) && (
            <p className="dl-note">
              “Covered” challans belong to a quotation that is billed in full, so their goods are on an invoice already. Use <b>Link to invoice</b> on the challan to
              record it.
            </p>
          )}
        </>
      )}
      {showBalance && mine?.balance?.[0] && mine.balance[0].lines.length > 0 && <OrderBalance lines={mine.balance[0].lines} />}
    </div>
  );
};

/** Ordered / sent / billed per item, and what's still to send or to bill. */
const OrderBalance: React.FC<{ lines: BalanceLine[] }> = ({ lines }) => {
  const toSend = lines.some((l) => l.to_send > 0);
  const toBill = lines.some((l) => l.sent_not_billed > 0);
  return (
    <div className="dl-bal">
      <div className="dl-bal-title">
        <b>Order balance</b>
        <span>{!toSend && !toBill ? "Everything sent and billed" : [toSend && "goods still to send", toBill && "sent goods to bill"].filter(Boolean).join(" · ")}</span>
      </div>
      <div className="dl-bal-table" role="table" aria-label="Order balance">
        <div className="dl-bal-row head" role="row">
          <span role="columnheader">Item</span>
          <span role="columnheader">Ordered</span>
          <span role="columnheader">Sent</span>
          <span role="columnheader">Billed</span>
          <span role="columnheader">To send</span>
          <span role="columnheader">Sent, not billed</span>
        </div>
        {lines.map((l) => (
          <div key={l.quotation_item_id} className="dl-bal-row" role="row">
            <span role="cell" className="dl-bal-name" title={l.product_name}>
              {l.product_name}
            </span>
            <span role="cell" data-label="Ordered">
              {qtyText(l.ordered, l.unit)}
            </span>
            <span role="cell" data-label="Sent">
              {qtyText(l.sent, l.unit)}
            </span>
            <span role="cell" data-label="Billed">
              {qtyText(l.billed, l.unit)}
            </span>
            <span role="cell" data-label="To send" className={l.to_send > 0 ? "warn" : "ok"}>
              {l.to_send > 0 ? qtyText(l.to_send, l.unit) : "—"}
            </span>
            <span role="cell" data-label="Sent, not billed" className={l.sent_not_billed > 0 ? "warn" : "ok"}>
              {l.sent_not_billed > 0 ? qtyText(l.sent_not_billed, l.unit) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LinkedDocuments;
