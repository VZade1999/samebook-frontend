import React, { useCallback, useEffect, useState } from "react";
import { Drawer, Input, message, Popconfirm, Select, Spin } from "antd";
import {
  AppstoreOutlined,
  AuditOutlined,
  CarOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HomeOutlined,
  ImportOutlined,
  InboxOutlined,
  PercentageOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  StarFilled,
  SwapOutlined,
  TagsOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { initialsOf } from "@/permissions/standing";
import HistoryList from "@/modules/stock/HistoryList";
import type { StockMode } from "@/modules/stock/StockDialog";
import type { WarehouseOption } from "@/modules/stock/pickers";
import { setLocation } from "@/modules/stock/stockApi";
import "@/modules/stock/stock.scss";
import { type CatalogProduct, type ProductActivity, apiError, getActivity, marginOf, qtyText, rupees, shortDate, sinceText } from "./productsApi";

type Tone = "good" | "warn" | "bad" | "muted" | "accent";
const QUOTE: Record<string, [string, Tone]> = {
  DRAFT: ["Draft", "muted"],
  SENT: ["Sent", "accent"],
  APPROVED: ["Approved", "good"],
  PARTIALLY_DISPATCHED: ["Part sent", "warn"],
  FULLY_DISPATCHED: ["Sent out", "good"],
  INVOICED: ["Invoiced", "good"],
  REJECTED: ["Declined", "bad"],
  EXPIRED: ["Expired", "muted"],
};
const CHALLAN: Record<string, [string, Tone]> = {
  DRAFT: ["Draft", "muted"],
  DISPATCHED: ["On the way", "accent"],
  DELIVERED: ["Delivered", "good"],
  INVOICED: ["Invoiced", "good"],
  CANCELLED: ["Cancelled", "muted"],
};
const INVOICE: Record<string, [string, Tone]> = {
  PAID: ["Paid", "good"],
  PARTIAL_PAID: ["Part paid", "warn"],
  GENERATED: ["Unpaid", "bad"],
  CANCELLED: ["Cancelled", "muted"],
  SUPERSEDED: ["Replaced", "muted"],
};
const Pill: React.FC<{ s: [string, Tone] }> = ({ s }) => <span className={`pc-pill ${s[1]}`}>{s[0]}</span>;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const copy = (text: string, what: string) => {
  navigator.clipboard?.writeText(text).then(
    () => message.success(`${what} copied`),
    () => message.error("Couldn't copy"),
  );
};

/** Lowest → highest rate given, the average, and your price on one line. */
const RateRange: React.FC<{ low: number; high: number; avg: number | null; price: number }> = ({ low, high, avg, price }) => {
  const top = Math.max(high, price) || 1;
  const bottom = Math.min(low, price > 0 ? price : low);
  const span = Math.max(top - bottom, 1);
  const at = (v: number) => `${Math.min(100, Math.max(0, ((v - bottom) / span) * 100))}%`;
  const legend = [
    { key: "low", v: low, text: "lowest given", dot: "" },
    ...(avg !== null ? [{ key: "avg", v: avg, text: "average", dot: "avg" }] : []),
    { key: "high", v: high, text: "highest given", dot: "" },
    ...(price > 0 ? [{ key: "you", v: price, text: "your price", dot: "you" }] : []),
  ].sort((a, b) => a.v - b.v);
  return (
    <div className="pc-range">
      <div
        className="pc-range-track"
        role="img"
        aria-label={`Rates given from ${rupees(low)} to ${rupees(high)}${avg ? `, ${rupees(avg)} on average` : ""}; your price is ${rupees(price)}`}
      >
        <span className="fill" style={{ left: at(low), width: `calc(${at(high)} - ${at(low)})` }} />
        {avg !== null && <span className="mark avg" style={{ left: at(avg) }} />}
        {price > 0 && <span className="mark you" style={{ left: at(price) }} />}
      </div>
      {/* Left to right, lowest amount first — like the line above. */}
      <div className="pc-range-legend">
        {legend.map((l) => (
          <span key={l.key}>
            {l.dot && <i className={l.dot} />} {rupees(l.v)} {l.text}
          </span>
        ))}
      </div>
    </div>
  );
};

/** One product: its price, what you've actually charged, who buys it, its documents and details. */
const ProductProfile: React.FC<{
  product: CatalogProduct | null;
  can: { edit: boolean; archive: boolean; stock: boolean };
  /** Active warehouses (for "keep it in a warehouse"); null when the person can't see them. */
  warehouses: WarehouseOption[] | null;
  onClose: () => void;
  onEdit: (p: CatalogProduct) => void;
  onPrice: (p: CatalogProduct) => void;
  onStock: (mode: StockMode, p: CatalogProduct, warehouseId?: number) => void;
  onArchive: (p: CatalogProduct) => Promise<void>;
  onRestore: (p: CatalogProduct) => Promise<void>;
  /** Bumped by the page after stock changes, to reload the figures here. */
  refreshKey?: number;
}> = ({ product, can, warehouses, onClose, onEdit, onPrice, onStock, onArchive, onRestore, refreshKey = 0 }) => {
  const navigate = useNavigate();
  const [act, setAct] = useState<ProductActivity | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bin, setBin] = useState<{ warehouse_id: number; value: string } | null>(null);
  const [keep, setKeep] = useState<{ warehouse_id: number | null; bin: string } | null>(null);

  const load = useCallback(async () => {
    if (!product) return;
    setFailed(false);
    try {
      setAct(await getActivity(product.id));
    } catch (e) {
      setFailed(true);
      message.error(apiError(e, "Couldn't load this product"));
    }
  }, [product]);

  useEffect(() => {
    setAct(null);
    setBin(null);
    setKeep(null);
    load();
  }, [load]);
  // Fresh figures after a stock change made from this drawer.
  useEffect(() => {
    if (refreshKey) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  /** Save a rack / shelf, or start keeping the product in another warehouse. */
  const saveLocation = async (warehouseId: number, binLocation: string) => {
    if (!product) return;
    try {
      await setLocation({ product_id: product.id, warehouse_id: warehouseId, bin_location: binLocation.trim() || null });
      message.success("Saved");
      setBin(null);
      setKeep(null);
      load();
    } catch (e) {
      message.error(apiError(e, "Couldn't save"));
    }
  };

  if (!product) return null;
  const p = product;
  const q = act?.quotations;
  const inv = act?.invoices;
  const dc = act?.challans;
  const margin = marginOf(p.price, p.cost);
  const go = (path: string) => {
    onClose();
    navigate(path);
  };
  const act1 = async (fn: (p: CatalogProduct) => Promise<void>) => {
    setBusy(true);
    try {
      await fn(p);
    } finally {
      setBusy(false);
    }
  };
  const anyDocs = !!(q?.recent.length || dc?.recent.length || inv?.recent.length);
  const stockTotal = act ? act.stock.reduce((s, x) => s + x.qty, 0) : p.stock;

  return (
    <Drawer open={!!product} onClose={onClose} size="min(680px, 100vw)" destroyOnHidden rootClassName="pc-portal" title={null} closable={false} styles={{ body: { padding: 0 } }}>
      <div className="pc-profile">
        {/* Head */}
        <div className="pc-head">
          <button type="button" className="pc-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
          <span className={`pc-thumb xl${p.active ? "" : " off"}`}>{p.image_url ? <img src={p.image_url} alt="" /> : <AppstoreOutlined />}</span>
          <div className="pc-head-text">
            <h3>{p.name}</h3>
            <div className="pc-head-chips">
              {!p.active && <span className="pc-chip bad">Archived</span>}
              {p.hsn ? (
                <button type="button" className="pc-chip mono" onClick={() => copy(p.hsn!, "HSN")} title="Copy HSN">
                  HSN {p.hsn} <CopyOutlined />
                </button>
              ) : (
                <span className="pc-chip warn">No HSN</span>
              )}
              {p.unit && <span className="pc-chip">{p.unit}</span>}
              <span className="pc-chip">GST {p.gst}%</span>
              {p.category && <span className="pc-chip accent">{p.category}</span>}
              {p.duplicate && (
                <span className="pc-chip warn" title="Another product has the same name — quotations can't tell them apart">
                  <WarningOutlined /> Same name twice
                </span>
              )}
              <span className="pc-since">Added {shortDate(p.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="pc-quick">
          <button type="button" className="pc-qa" onClick={() => copy(p.name, "Name")}>
            <CopyOutlined /> Copy name
          </button>
          {can.edit && p.active && (
            <button type="button" className="pc-qa" onClick={() => onPrice(p)}>
              <PercentageOutlined /> Change price
            </button>
          )}
          {can.edit && p.active && (
            <button type="button" className="pc-qa primary" onClick={() => onEdit(p)}>
              <EditOutlined /> Edit product
            </button>
          )}
          {can.edit && !p.active && (
            <button type="button" className="pc-qa primary" onClick={() => act1(onRestore)} disabled={busy}>
              <RollbackOutlined /> Restore
            </button>
          )}
        </div>

        {/* Price */}
        <section className="pc-sec">
          <div className="pc-sec-h">
            <TagsOutlined /> Price
            <em>{p.updated_at ? `changed ${sinceText(p.updated_at).toLowerCase()}` : ""}</em>
          </div>
          <div className="pc-figs">
            <div>
              <span>Your price</span>
              <b className={p.price > 0 ? "" : "bad"}>{p.price > 0 ? rupees(p.price) : "Not set"}</b>
              <i>per {p.unit || "unit"}</i>
            </div>
            <div>
              <span>GST</span>
              <b>{p.gst}%</b>
              <i>{p.price > 0 ? `${rupees(Math.round(p.price * (1 + p.gst / 100) * 100) / 100)} with GST` : "—"}</i>
            </div>
            <div>
              <span>{p.cost > 0 ? "Cost" : "Margin"}</span>
              <b className={margin === null ? "" : margin >= 0 ? "good" : "bad"}>{p.cost > 0 ? rupees(p.cost) : "—"}</b>
              <i>{margin === null ? "add a cost to see margin" : `${Math.round(margin)}% margin`}</i>
            </div>
          </div>
          <p className="pc-note" style={{ marginTop: 10 }}>
            Quotations fill in this price, and it follows the last rate you quote.
          </p>
        </section>

        {!act && !failed ? (
          <div className="pc-loading">
            <Spin />
          </div>
        ) : failed ? (
          <div className="pc-loading">
            <button type="button" className="pc-btn ghost" onClick={load}>
              <ReloadOutlined /> Try again
            </button>
          </div>
        ) : (
          <>
            {/* Stock: where it's kept and how much */}
            {act && (
              <section className="pc-sec">
                <div className="pc-sec-h">
                  <InboxOutlined /> Stock
                  <em>
                    {act.stock.length
                      ? `${qtyText(stockTotal)} ${p.unit || "units"} in ${plural(act.stock.length, "warehouse")}`
                      : p.min_stock > 0
                        ? "none yet"
                        : "not kept in a warehouse yet"}
                  </em>
                  {(act.stock.length > 0 || p.min_stock > 0) && (
                    <span className={`pc-pill ${stockTotal <= 0 ? "bad" : p.min_stock > 0 && stockTotal <= p.min_stock ? "warn" : "good"}`}>
                      {stockTotal <= 0 ? "Out of stock" : p.min_stock > 0 && stockTotal <= p.min_stock ? "Low" : "In stock"}
                    </span>
                  )}
                </div>
                {act.stock.length ? (
                  <ul className="pc-places">
                    {act.stock.map((s) => (
                      <li key={s.warehouse_id} className={`pc-place${s.known && s.active ? "" : " gone"}`}>
                        <span className="pc-place-icon">{s.known && s.active ? <HomeOutlined /> : <WarningOutlined />}</span>
                        <span className="pc-place-text">
                          <b>
                            {s.name}
                            {s.is_default && (
                              <span className="st-default">
                                <StarFilled /> default
                              </span>
                            )}
                          </b>
                          {bin?.warehouse_id === s.warehouse_id ? (
                            <span className="pc-bin-edit">
                              <Input
                                size="small"
                                autoFocus
                                value={bin.value}
                                maxLength={64}
                                placeholder="e.g. Rack A-3"
                                onChange={(e) => setBin({ ...bin, value: e.target.value })}
                                onPressEnter={() => saveLocation(s.warehouse_id, bin.value)}
                              />
                              <button type="button" className="pc-link" onClick={() => saveLocation(s.warehouse_id, bin.value)}>
                                Save
                              </button>
                              <button type="button" className="pc-link" onClick={() => setBin(null)}>
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <em>
                              {s.known && s.active ? (s.bin ? `Rack / shelf: ${s.bin}` : "No rack set") : "This warehouse is gone — move or count this stock"}
                              {can.stock && s.known && s.active && p.active && (
                                <button type="button" className="pc-link" onClick={() => setBin({ warehouse_id: s.warehouse_id, value: s.bin || "" })}>
                                  {s.bin ? "change" : "set rack"}
                                </button>
                              )}
                            </em>
                          )}
                        </span>
                        <span className="pc-place-qty">
                          <b className={s.qty > 0 ? "" : "zero"}>{qtyText(s.qty)}</b>
                          <em>{p.unit || "units"}</em>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pc-note">{can.stock ? "Receive stock into a warehouse, or choose where it's kept." : "It isn't kept in any warehouse yet."}</p>
                )}
                {p.min_stock > 0 && <p className="pc-note" style={{ marginTop: 8 }}>Low-stock alert at {p.min_stock}.</p>}
                {can.stock && p.active && (
                  <div className="pc-stock-acts">
                    <button type="button" className="pc-btn ghost sm" onClick={() => onStock("receive", p)}>
                      <ImportOutlined /> Receive
                    </button>
                    {stockTotal > 0 && (
                      <button type="button" className="pc-btn ghost sm" onClick={() => onStock("move", p)}>
                        <SwapOutlined /> Move
                      </button>
                    )}
                    <button type="button" className="pc-btn ghost sm" onClick={() => onStock("count", p)}>
                      <AuditOutlined /> Count
                    </button>
                    {warehouses && warehouses.some((w) => !act.stock.some((s) => s.warehouse_id === w.id)) && !keep && (
                      <button type="button" className="pc-link" onClick={() => setKeep({ warehouse_id: null, bin: "" })}>
                        <PlusOutlined /> Keep it in another warehouse
                      </button>
                    )}
                  </div>
                )}
                {keep && warehouses && (
                  <div className="pc-keep">
                    <Select
                      value={keep.warehouse_id ?? undefined}
                      onChange={(v) => setKeep({ ...keep, warehouse_id: v })}
                      placeholder="Warehouse"
                      options={warehouses.filter((w) => !act.stock.some((s) => s.warehouse_id === w.id)).map((w) => ({ value: w.id, label: w.name }))}
                      aria-label="Warehouse"
                    />
                    <Input value={keep.bin} onChange={(e) => setKeep({ ...keep, bin: e.target.value })} placeholder="Rack / shelf (optional)" maxLength={64} />
                    <button type="button" className="pc-btn primary sm" disabled={!keep.warehouse_id} onClick={() => saveLocation(keep.warehouse_id!, keep.bin)}>
                      Save
                    </button>
                    <button type="button" className="pc-link" onClick={() => setKeep(null)}>
                      Cancel
                    </button>
                  </div>
                )}
                {act.history.length > 0 && (
                  <>
                    <div className="pc-sub-h">Recent changes</div>
                    <HistoryList movements={act.history} />
                    <button type="button" className="pc-link" onClick={() => go(`/app/warehouses?tab=history&product=${p.id}`)}>
                      See its full stock history
                    </button>
                  </>
                )}
              </section>
            )}

            {/* Rates given */}
            {q && (
              <section className="pc-sec">
                <div className="pc-sec-h">
                  <PercentageOutlined /> Rates you've given
                  <em>{q.count ? `${plural(q.count, "quotation")} · ${plural(q.customers, "customer")} · ${qtyText(q.qty)} ${p.unit || "units"}` : "Not quoted yet"}</em>
                </div>
                {!q.count || q.rates.low === null || q.rates.high === null ? (
                  <p className="pc-note">Once you quote it, the rates you give — after discount — show here, so you can price the next one with confidence.</p>
                ) : (
                  <>
                    <div className="pc-figs">
                      <div>
                        <span>Last given</span>
                        <b>{rupees(q.rates.last)}</b>
                        <i>{shortDate(q.last)}</i>
                      </div>
                      <div>
                        <span>Average</span>
                        <b>{rupees(q.rates.avg)}</b>
                        <i>after discount</i>
                      </div>
                      <div>
                        <span>Usual discount</span>
                        <b>{q.rates.discount ? `${q.rates.discount}%` : "None"}</b>
                        <i>{q.rates.discounted ? `on ${plural(q.rates.discounted, "line")}` : "full price"}</i>
                      </div>
                    </div>
                    <RateRange low={q.rates.low} high={q.rates.high} avg={q.rates.avg} price={p.price} />
                  </>
                )}
              </section>
            )}

            {/* Who buys it */}
            {q && q.buyers.length > 0 && (
              <section className="pc-sec">
                <div className="pc-sec-h">
                  <TeamOutlined /> Who asks for it <em>top {q.buyers.length}</em>
                </div>
                {q.buyers.map((b) => (
                  <div key={b.id} className="pc-buyer">
                    <span className="pc-buyer-av">{initialsOf(b.name)}</span>
                    <span className="pc-buyer-text">
                      <b>{b.name}</b>
                      <em>
                        {qtyText(b.qty)} {p.unit || "units"} · last {shortDate(b.last)}
                      </em>
                    </span>
                    <span className="pc-buyer-n">{plural(b.count, "quote")}</span>
                  </div>
                ))}
              </section>
            )}

            {/* Documents */}
            {(q || inv || dc) && (
              <section className="pc-sec">
                <div className="pc-sec-h">
                  <FileTextOutlined /> Recent documents
                </div>
                <div className="pc-docs">
                  {q?.recent.map((d, i) => (
                    <button key={`q${d.id}-${i}`} type="button" className="pc-doc" onClick={() => go(`/app/quotation?open=${d.id}`)}>
                      <span className="pc-doc-icon q">
                        <FileTextOutlined />
                      </span>
                      <span className="pc-doc-text">
                        <b>{d.number}</b>
                        <em>
                          Quotation · {d.customer || "—"} · {shortDate(d.date)}
                        </em>
                      </span>
                      <Pill s={d.invoiced ? ["Invoiced", "good"] : QUOTE[d.status] || [d.status, "muted"]} />
                      <span className="pc-doc-amt">
                        {rupees(d.net_rate)}
                        <em>
                          {qtyText(d.qty)} {d.unit || ""}
                          {d.discount ? ` · ${d.discount}% off` : ""}
                        </em>
                      </span>
                    </button>
                  ))}
                  {dc?.recent.map((d, i) => (
                    <button key={`d${d.id}-${i}`} type="button" className="pc-doc" onClick={() => go(`/app/delivery-challans?open=${d.id}`)}>
                      <span className="pc-doc-icon d">
                        <CarOutlined />
                      </span>
                      <span className="pc-doc-text">
                        <b>{d.number}</b>
                        <em>
                          Challan · {d.customer || "—"} · {shortDate(d.date)}
                        </em>
                      </span>
                      <Pill s={CHALLAN[d.status] || [d.status, "muted"]} />
                      <span className="pc-doc-amt">
                        {qtyText(d.qty)}
                        <em>{d.unit || "qty"}</em>
                      </span>
                    </button>
                  ))}
                  {inv?.recent.map((d, i) => (
                    <button key={`i${d.id}-${i}`} type="button" className="pc-doc" onClick={() => go(`/app/invoice?open=${d.id}`)}>
                      <span className="pc-doc-icon i">
                        <FileDoneOutlined />
                      </span>
                      <span className="pc-doc-text">
                        <b>{d.number}</b>
                        <em>
                          Invoice · {d.customer || "—"} · {shortDate(d.date)}
                        </em>
                      </span>
                      <Pill s={INVOICE[d.status] || [d.status, "muted"]} />
                      <span className="pc-doc-amt">
                        {rupees(d.rate)}
                        <em>
                          {qtyText(d.qty)} {d.unit || ""}
                        </em>
                      </span>
                    </button>
                  ))}
                  {!anyDocs && <p className="pc-note">Not on any quotation, challan or invoice yet.</p>}
                </div>
                <div className="pc-doc-counts">
                  {q && <span>{plural(q.count, "quotation")}</span>}
                  {dc && (
                    <span>
                      {plural(dc.count, "challan")}
                      {dc.qty ? ` · ${qtyText(dc.qty)} sent` : ""}
                    </span>
                  )}
                  {inv && (
                    <span>
                      {plural(inv.count, "invoice")}
                      {inv.qty ? ` · ${qtyText(inv.qty)} billed` : ""}
                      {inv.amount ? ` · ${rupees(inv.amount)}` : ""}
                    </span>
                  )}
                </div>
              </section>
            )}

            {/* Details */}
            <section className="pc-sec">
              <div className="pc-sec-h">
                <InboxOutlined /> Details
              </div>
              <dl className="pc-facts">
                <div className="pc-fact">
                  <dt>SKU</dt>
                  <dd className="mono">{p.sku || "—"}</dd>
                </div>
                <div className="pc-fact">
                  <dt>Barcode</dt>
                  <dd className="mono">{p.barcode || "—"}</dd>
                </div>
                <div className="pc-fact">
                  <dt>Category</dt>
                  <dd>{p.category || "—"}</dd>
                </div>
              </dl>
              {p.description && <p className="pc-desc">{p.description}</p>}
              {!!act?.images.length && (
                <div className="pc-imgs">
                  {act.images.map((im) => (
                    <a key={im.id} href={im.url} target="_blank" rel="noreferrer">
                      <img src={im.url} alt="" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
              {!!act?.variants.length && (
                <table className="pc-mini">
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th className="r">Price</th>
                      <th className="r">MRP</th>
                      <th className="r">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {act.variants.map((v) => (
                      <tr key={v.id}>
                        <td>
                          {v.sku || (v.attributes && typeof v.attributes === "object" ? Object.values(v.attributes).join(" / ") : "Variant")}
                          {v.is_default && <span className="pc-pill accent" style={{ marginLeft: 6 }}>Default</span>}
                        </td>
                        <td className="r">{rupees(v.price)}</td>
                        <td className="r">{v.compare_at_price ? rupees(v.compare_at_price) : "—"}</td>
                        <td className="r">{v.cost_price ? rupees(v.cost_price) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}

        {/* Footer */}
        <div className="pc-foot">
          {can.archive && p.active && (
            <Popconfirm
              title="Archive this product?"
              description="It leaves the quotation and challan pickers. Old documents keep it, and you can restore it any time."
              okText="Archive"
              okButtonProps={{ danger: true }}
              onConfirm={() => act1(onArchive)}
            >
              <button type="button" className="pc-btn danger" disabled={busy}>
                <DeleteOutlined /> Archive
              </button>
            </Popconfirm>
          )}
          <span className="pc-foot-gap" />
          <span className="pc-last">{p.last_quoted ? `Last quoted ${sinceText(p.last_quoted).toLowerCase()}` : "Never quoted"}</span>
          {can.edit && p.active && (
            <button type="button" className="pc-btn primary" onClick={() => onEdit(p)}>
              <EditOutlined /> Edit
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default ProductProfile;
