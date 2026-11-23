import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Checkbox, InputNumber, Spin } from "antd";
import { CarOutlined, ExclamationCircleFilled, InfoCircleOutlined, NumberOutlined, ReloadOutlined } from "@ant-design/icons";
import InvoiceService from "../../services/invoiceService";
import { inr, rupees } from "./shared";

const service = new InvoiceService();

export type BillRequest =
  | { kind: "challans"; challan_ids: number[]; transport_charges: number | null }
  | { kind: "quantities"; quotation_id: number; lines: { quotation_item_id: number; qty: number }[]; transport_charges: number | null };

export interface BillState {
  request: BillRequest | null;
  /** Grand total of the invoice as previewed, or null while it isn't known. */
  total: number | null;
  /** Why it can't be made yet (shown by the panel; the dialog disables "Create"). */
  problem: string | null;
  busy: boolean;
  customerName: string | null;
  /** The quotation picked or the challan's quotation, for date checks. */
  quotationDate: string | null;
  /** Latest challan date on the invoice — it can't be dated before it. */
  lastChallanDate: string | null;
}

interface Billable {
  customer: { id: number; name: string | null };
  quotation: { id: number; quotation_number: string; quotation_date: string | null; transport_charges: number; has_live_invoice: boolean };
  lines: { quotation_item_id: number; product_name: string; unit: string | null; ordered: number; sent: number; billed: number; to_bill: number; sent_not_billed: number; net_rate: number }[];
  fully_billed: boolean;
  focus_challan_id: number | null;
  focus_key: string | null;
  ready_challans: {
    id: number;
    challan_number: string;
    challan_date: string | null;
    status: string;
    quotation_id: number;
    quotation_number: string | null;
    total_value: number;
    items_count: number;
    billable: boolean;
    note: string | null;
    merge_key: string;
  }[];
}

interface Preview {
  lines: { product_name: string; qty: number; unit: string | null; total: number }[];
  /** `taxable` is the value GST is charged on — it includes transport when transport_gst is 1. */
  totals: { taxable: number; cgst_amount: number; sgst_amount: number; igst_amount: number; transport_charges: number; transport_gst?: number; grand_total: number };
  transport_suggested: number;
}

const qtyText = (n: number, unit?: string | null) => `${Number(n.toFixed(3))}${unit ? ` ${unit}` : ""}`;
const errText = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

/**
 * What an invoice bills: delivered challans (exactly what they carried, one
 * or several of the same customer) or chosen quantities of a quotation —
 * with a live preview of the totals from the server, the same maths it saves.
 */
const BillingPanel: React.FC<{
  source: { quotationId?: number | null; challanId?: number | null };
  onChange: (s: BillState) => void;
}> = ({ source, onChange }) => {
  const [data, setData] = useState<Billable | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"challans" | "quantities">("challans");
  const [picked, setPicked] = useState<number[]>([]);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [transport, setTransport] = useState<number | null>(null);
  const [transportTouched, setTransportTouched] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res: any = await service.getBillable(source.challanId ? { challan_id: source.challanId } : { quotation_id: source.quotationId as number });
      const d: Billable = res?.data?.data;
      setData(d);
      const ofQuotation = d.ready_challans.filter((c) => c.quotation_id === d.quotation.id && c.billable);
      if (source.challanId) {
        setMode("challans");
        setPicked([source.challanId]);
      } else if (ofQuotation.length) {
        // Delivered goods wait: bill them (and only them) by default.
        const key = ofQuotation[0].merge_key;
        setMode("challans");
        setPicked(ofQuotation.filter((c) => c.merge_key === key).map((c) => c.id));
      } else {
        setMode("quantities");
        setPicked([]);
      }
      setQty(Object.fromEntries(d.lines.map((l) => [l.quotation_item_id, l.to_bill])));
      setTransport(null);
      setTransportTouched(false);
    } catch (e) {
      setLoadError(errText(e, "Couldn't load what can be billed"));
    } finally {
      setLoading(false);
    }
  }, [source.challanId, source.quotationId]);

  useEffect(() => {
    setData(null);
    setPreview(null);
    if (source.challanId || source.quotationId) load();
  }, [load, source.challanId, source.quotationId]);

  // The request as it stands. Until transport is typed in, the server suggests it
  // (so showing its suggestion doesn't count as a change).
  const typedTransport = transportTouched ? transport : null;
  const request: BillRequest | null = useMemo(() => {
    if (!data) return null;
    if (mode === "challans") return picked.length ? { kind: "challans", challan_ids: picked, transport_charges: typedTransport } : null;
    const lines = data.lines
      .map((l) => ({ quotation_item_id: l.quotation_item_id, qty: Number(qty[l.quotation_item_id] || 0) }))
      .filter((l) => l.qty > 0);
    return lines.length ? { kind: "quantities", quotation_id: data.quotation.id, lines, transport_charges: typedTransport } : null;
  }, [data, mode, picked, qty, typedTransport]);

  // Live preview (the server's own maths), a moment after each change.
  useEffect(() => {
    if (!request) {
      setPreview(null);
      setPreviewError("");
      return;
    }
    const ctrl = new AbortController();
    setPreviewing(true);
    const timer = window.setTimeout(async () => {
      try {
        const body =
          request.kind === "challans"
            ? { challan_ids: request.challan_ids, transport_charges: request.transport_charges }
            : { quotation_id: request.quotation_id, lines: request.lines, transport_charges: request.transport_charges };
        const res: any = await service.previewBill(body, ctrl.signal);
        const p: Preview = res?.data?.data;
        setPreview(p);
        setPreviewError("");
        if (!transportTouched) setTransport(p.transport_suggested);
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.code === "ERR_CANCELED") return;
        setPreview(null);
        setPreviewError(errText(e, "Couldn't work out the invoice"));
      } finally {
        if (!ctrl.signal.aborted) setPreviewing(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  const challansById = useMemo(() => new Map((data?.ready_challans || []).map((c) => [c.id, c])), [data]);
  const lastChallanDate = picked.map((id) => challansById.get(id)?.challan_date || "").filter(Boolean).sort().pop() || null;
  const problem = !data
    ? loadError || null
    : !request
      ? mode === "challans"
        ? "Tick the challans to bill"
        : "Enter how much to bill of at least one item"
      : previewError || null;

  useEffect(() => {
    changeRef.current({
      request: problem ? null : request,
      total: preview?.totals.grand_total ?? null,
      problem,
      busy: loading || previewing,
      customerName: data?.customer.name || null,
      quotationDate: data?.quotation.quotation_date || null,
      lastChallanDate,
    });
  }, [request, preview, problem, loading, previewing, data, lastChallanDate]);

  if (loading && !data) {
    return (
      <div className="ip-ni-empty">
        <Spin size="small" /> Working out what can be billed…
      </div>
    );
  }
  if (loadError && !data) {
    return (
      <div className="ip-ni-empty">
        <span>{loadError}</span>
        <button type="button" className="qp-btn ghost sm" onClick={load}>
          <ReloadOutlined /> Try again
        </button>
      </div>
    );
  }
  if (!data) return null;

  const q = data.quotation;
  const firstKey = picked.length ? challansById.get(picked[0])?.merge_key : source.challanId ? data.focus_key : null;
  const ofQuotation = data.ready_challans.filter((c) => c.quotation_id === q.id);
  const others = data.ready_challans.filter((c) => c.quotation_id !== q.id);
  const canPickChallans = data.ready_challans.some((c) => c.billable);
  const tax = preview ? preview.totals.cgst_amount + preview.totals.sgst_amount + preview.totals.igst_amount : 0;

  const toggle = (id: number, on: boolean) => {
    if (source.challanId && id === source.challanId) return; // the one you started from stays
    setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));
  };

  const challanRow = (c: Billable["ready_challans"][number]) => {
    const locked = !!source.challanId && c.id === source.challanId;
    const otherGroup = !!firstKey && c.merge_key !== firstKey && !picked.includes(c.id);
    const disabled = !c.billable || locked || otherGroup;
    const why = !c.billable ? c.note : otherGroup ? "Different customer address or GST rate — bill it on its own invoice" : null;
    return (
      <label key={c.id} className={`ip-bp-row${picked.includes(c.id) ? " on" : ""}${disabled && !locked ? " off" : ""}`}>
        <Checkbox checked={picked.includes(c.id)} disabled={disabled} onChange={(e) => toggle(c.id, e.target.checked)} />
        <span className="ip-bp-main">
          <b className="qd-mono">{c.challan_number}</b>
          <small>
            {c.challan_date ? dayjs(c.challan_date).format("D MMM YYYY") : "—"} · {c.status === "DELIVERED" ? "Delivered" : "On the road"} · {c.items_count} item
            {c.items_count === 1 ? "" : "s"}
            {c.quotation_id !== q.id && c.quotation_number ? ` · from ${c.quotation_number}` : ""}
          </small>
          {why ? <small className="ip-bp-why">{why}</small> : null}
        </span>
        <span className="ip-bp-amt">{inr(c.total_value)}</span>
      </label>
    );
  };

  return (
    <div className="ip-bp">
      {!source.challanId && canPickChallans && (
        <div className="ip-pm-quick" role="radiogroup" aria-label="What to bill">
          <button type="button" role="radio" aria-checked={mode === "challans"} className={`ip-chip${mode === "challans" ? " on" : ""}`} onClick={() => setMode("challans")}>
            <CarOutlined /> Delivered challans
          </button>
          <button type="button" role="radio" aria-checked={mode === "quantities"} className={`ip-chip${mode === "quantities" ? " on" : ""}`} onClick={() => setMode("quantities")}>
            <NumberOutlined /> Choose quantities
          </button>
        </div>
      )}

      {mode === "challans" ? (
        <div className="ip-bp-list" role="group" aria-label="Challans to bill">
          {ofQuotation.length > 0 && <div className="ip-bp-group">From {q.quotation_number}</div>}
          {ofQuotation.map(challanRow)}
          {others.length > 0 && <div className="ip-bp-group">Other delivered challans of {data.customer.name || "this customer"}</div>}
          {others.map(challanRow)}
          {!data.ready_challans.length && <div className="ip-ni-empty">No delivered challan is waiting to be billed.</div>}
        </div>
      ) : (
        <div className="ip-bp-qty" role="group" aria-label="Quantities to bill">
          <div className="ip-bp-qhead">
            <span>Item</span>
            <span>Ordered</span>
            <span>Billed</span>
            <span>Bill now</span>
          </div>
          {data.lines.map((l) => (
            <div key={l.quotation_item_id} className={`ip-bp-qrow${l.to_bill <= 0 ? " done" : ""}`}>
              <span className="ip-bp-qname">
                <b>{l.product_name}</b>
                {l.sent_not_billed > 0 ? <small>{qtyText(l.sent_not_billed, l.unit)} sent on challans, not billed</small> : null}
              </span>
              <span>{qtyText(l.ordered, l.unit)}</span>
              <span>{qtyText(l.billed, l.unit)}</span>
              <span>
                {l.to_bill > 0 ? (
                  <InputNumber
                    size="small"
                    min={0}
                    max={l.to_bill}
                    value={qty[l.quotation_item_id] ?? 0}
                    onChange={(v) => setQty((p) => ({ ...p, [l.quotation_item_id]: Math.min(l.to_bill, Math.max(0, Number(v) || 0)) }))}
                    aria-label={`Quantity of ${l.product_name} to bill`}
                    style={{ width: "100%" }}
                  />
                ) : (
                  <em>Billed</em>
                )}
              </span>
            </div>
          ))}
          {ofQuotation.some((c) => c.billable) && (
            <div className="ip-pm-error soft">
              <InfoCircleOutlined />
              <span>
                {ofQuotation.filter((c) => c.billable).length} challan{ofQuotation.filter((c) => c.billable).length === 1 ? " is" : "s are"} delivered and not billed —
                billing quantities here doesn't mark them billed. Prefer “Delivered challans”.
              </span>
            </div>
          )}
        </div>
      )}

      <div className="ip-pm-grid">
        <div>
          <label className="ip-pm-label sub" htmlFor="ip-bp-transport">
            Transport charges
          </label>
          <InputNumber
            id="ip-bp-transport"
            min={0}
            prefix="₹"
            value={transport ?? undefined}
            onChange={(v) => {
              setTransportTouched(true);
              setTransport(v === null || v === undefined ? 0 : Number(v));
            }}
            style={{ width: "100%" }}
            placeholder="0"
          />
        </div>
        <div className="ip-bp-hint">
          {q.transport_charges > 0
            ? q.has_live_invoice
              ? `${q.quotation_number}'s transport (${inr(q.transport_charges)}) is on an earlier invoice.`
              : `Suggested: ${q.quotation_number}'s transport (${inr(q.transport_charges)}), on its first invoice.`
            : "Not taxed, the same as on the quotation."}
        </div>
      </div>

      <div className={`ip-pm-strip ip-bp-totals${previewing ? " busy" : ""}`} aria-live="polite">
        <div>
          <span>Items</span>
          <b>{preview ? preview.lines.length : "—"}</b>
        </div>
        <div>
          <span>{preview && Number(preview.totals.transport_gst) && Number(preview.totals.transport_charges) > 0 ? "Taxable (with transport) · GST" : "Taxable · GST"}</span>
          <b>{preview ? `${rupees(preview.totals.taxable)} · ${rupees(tax)}` : "—"}</b>
        </div>
        <div>
          <span>Invoice total</span>
          {/* Exact to the paisa: this is the amount the invoice will carry. */}
          <b>{preview ? rupees(preview.totals.grand_total) : "—"}</b>
        </div>
      </div>
      {previewError && (
        <div className="ip-pm-error" role="alert">
          <ExclamationCircleFilled /> {previewError}
        </div>
      )}
    </div>
  );
};

export default BillingPanel;
