import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dropdown, Input, message, Modal, Pagination, Select, Tooltip } from "antd";
import {
  AppstoreOutlined,
  AuditOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  HomeOutlined,
  ImportOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  StarFilled,
  StarOutlined,
  SwapOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { count, inrCompact } from "@/modules/dashboard/utils/format";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";
import type { CatalogProduct } from "@/modules/products/catalog/productsApi";
import "@/modules/products/catalog/products.scss";
import { useModules } from "@/session/useModules";
import { getOnOrder } from "@/modules/purchases/api";
import HistoryList from "./HistoryList";
import StockDialog, { type StockMode, type StockPreset } from "./StockDialog";
import WarehouseForm from "./WarehouseForm";
import type { WarehouseOption } from "./pickers";
import {
  type History,
  type StockFilter,
  type StockLevels,
  type StockRow,
  type StockSort,
  type WarehouseCard,
  type WarehouseCards,
  apiError,
  archiveWarehouse,
  getHistory,
  getLevels,
  getWarehouseCards,
  makeDefaultWarehouse,
} from "./stockApi";
import "./stock.scss";

const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};
const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;
const since = (v: string | null) => {
  if (!v) return null;
  const days = Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : days < 30 ? `${days} days ago` : `${Math.floor(days / 30)} mo ago`;
};
const STATUS: Record<string, [string, string]> = { out: ["Out", "bad"], low: ["Low", "warn"], ok: ["OK", "good"] };
const TYPE_OPTIONS = [
  { value: "", label: "Every change" },
  { value: "RECEIVED", label: "Received" },
  { value: "MOVED", label: "Moved" },
  { value: "COUNTED", label: "Counted / corrected" },
  { value: "DISPATCHED", label: "Sent on challans" },
  { value: "DISPATCH_CANCELLED", label: "Cancelled challans" },
  { value: "OPENING", label: "Opening stock" },
];
const PAGE = 25;

/** A stock-table row in the shape the stock dialog uses for a product. */
const asProduct = (r: StockRow, names: Map<number, string>) =>
  ({ id: r.id, name: r.name, unit: r.unit, hsn: r.hsn, stock: r.total, places: r.places.map((p) => ({ ...p, name: names.get(p.warehouse_id) || `#${p.warehouse_id}` })) }) as unknown as CatalogProduct;

/**
 * Stock & warehouses: where everything is kept and how much is left — each
 * warehouse as a card, the stock table across warehouses, and the history of
 * every change. Receive, move and count from here.
 */
const StockPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { can } = useAccess();
  const company = useMemo(companyName, []);
  const canManage = can("stock.manage");
  const canAddWh = can("warehouses.create");
  const canEditWh = can("warehouses.edit");
  const canArchiveWh = can("warehouses.delete");
  const seesProducts = can("products.view");

  const [cards, setCards] = useState<WarehouseCards | null>(null);
  const [levels, setLevels] = useState<StockLevels | null>(null);
  const [failed, setFailed] = useState(false);
  // Purchases (add-on): what is still coming from suppliers, and "Order these" for low stock.
  const { hasModule } = useModules();
  const purchases = hasModule("purchases");
  const seesOnOrder = purchases && (can("purchases.view") || can("purchases.receive") || can("purchases.create"));
  const canOrder = purchases && can("purchases.create");
  const [onOrder, setOnOrder] = useState<Map<number, { on_order: number; next_date: string | null }>>(new Map());
  useEffect(() => {
    if (!seesOnOrder || !levels?.products.length) return setOnOrder(new Map());
    getOnOrder(levels.products.map((p) => p.id))
      .then((list) => setOnOrder(new Map(list.map((x) => [x.product_id, { on_order: x.on_order, next_date: x.next_date }]))))
      .catch(() => setOnOrder(new Map()));
  }, [levels, seesOnOrder]);
  const toOrder = (levels?.products || []).filter((p) => (p.status === "low" || p.status === "out") && !onOrder.get(p.id));
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"stock" | "history">(params.get("tab") === "history" ? "history" : "stock");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState(params.get("warehouse") || "");
  const [status, setStatus] = useState<StockFilter>((params.get("status") as StockFilter) || "all");
  const [sort, setSort] = useState<StockSort>("name");
  const [page, setPage] = useState(1);
  const [hist, setHist] = useState<History | null>(null);
  const [hSearchText, setHSearchText] = useState("");
  const [hSearch, setHSearch] = useState("");
  const [hWarehouse, setHWarehouse] = useState("");
  const [hType, setHType] = useState("");
  const [hDays, setHDays] = useState<number>(0);
  const [hPage, setHPage] = useState(1);
  const hProduct = Number(params.get("product")) || undefined;
  const [dialog, setDialog] = useState<{ mode: StockMode; preset?: StockPreset } | null>(null);
  const [whForm, setWhForm] = useState<{ warehouse: WarehouseCard | null } | null>(null);
  const seq = useRef(0);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchText]);
  useEffect(() => {
    const t = setTimeout(() => {
      setHSearch(hSearchText.trim());
      setHPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [hSearchText]);

  const loadCards = useCallback(async () => {
    try {
      setCards(await getWarehouseCards());
      setFailed(false);
    } catch (e) {
      setFailed(true);
      message.error(apiError(e, "Couldn't load your warehouses"));
    }
  }, []);
  const loadLevels = useCallback(async () => {
    if (!seesProducts) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const d = await getLevels({ search, warehouse, status, sort, page, limit: PAGE });
      if (mine === seq.current) setLevels(d);
    } catch (e) {
      if (mine === seq.current) message.error(apiError(e, "Couldn't load stock"));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [search, warehouse, status, sort, page, seesProducts]);
  const loadHistory = useCallback(async () => {
    if (!seesProducts) return;
    try {
      setHist(await getHistory({ search: hSearch, warehouse: hWarehouse, type: hType, days: hDays || undefined, product: hProduct, page: hPage, limit: 30 }));
    } catch (e) {
      message.error(apiError(e, "Couldn't load the stock history"));
    }
  }, [hSearch, hWarehouse, hType, hDays, hProduct, hPage, seesProducts]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);
  useEffect(() => {
    loadLevels();
  }, [loadLevels]);
  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  const refreshAll = () => {
    loadCards();
    loadLevels();
    if (tab === "history") loadHistory();
  };

  const options: WarehouseOption[] = useMemo(() => (cards?.warehouses || []).map((w) => ({ id: w.id, name: w.name, is_default: w.is_default })), [cards]);
  const names = useMemo(() => new Map([...(cards?.warehouses || []), ...(cards?.elsewhere || [])].map((w) => [w.id, w.name])), [cards]);

  const makeDefault = async (w: WarehouseCard) => {
    try {
      const r = await makeDefaultWarehouse(w.id);
      message.success(r?.message || `${w.name} is now the default`);
      loadCards();
    } catch (e) {
      message.error(apiError(e, "Couldn't change the default"));
    }
  };
  const archive = (w: WarehouseCard) =>
    Modal.confirm({
      title: `Archive ${w.name}?`,
      content: w.units ? `It still holds ${w.units} units — move them to another warehouse first.` : "It leaves the warehouse lists. Its history stays.",
      okText: "Archive",
      okButtonProps: { danger: true, disabled: w.units > 0 },
      onOk: async () => {
        try {
          const r = await archiveWarehouse(w.id);
          message.success(r?.message || `${w.name} archived`);
          refreshAll();
        } catch (e) {
          message.error(apiError(e, "Couldn't archive it"));
        }
      },
    });
  const seeStock = (id: number | string) => {
    setWarehouse(String(id));
    setStatus("all");
    setPage(1);
    setTab("stock");
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const openProduct = (id: number) => navigate(`/app/products?open=${id}`);

  if (!cards) {
    return (
      <div className="db-root st-root">
        <div className="db-hero skeleton st-hero-sk">
          {failed && (
            <div className="st-failed">
              Couldn't load your warehouses.
              <button type="button" className="db-btn white" onClick={loadCards}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const stats = levels?.stats;
  const columns = (levels?.warehouses || []).filter((w) => w.active || (levels?.products || []).some((p) => p.places.some((x) => x.warehouse_id === w.id)));
  const wide = columns.length > 0 && columns.length <= 3;
  const grid = wide ? `minmax(0, 2.2fr) ${columns.map(() => "minmax(84px, 0.8fr)").join(" ")} 120px ${canManage ? "112px" : ""}` : `minmax(0, 2fr) minmax(0, 2fr) 120px ${canManage ? "112px" : ""}`;
  const filtered = !!search || !!warehouse || status !== "all" || sort !== "name";
  const valueShare = stats && stats.tracked ? (stats.priced / stats.tracked) * 100 : 0;

  return (
    <div className={`db-root st-root${loading ? " refreshing" : ""}`}>
      {/* ── Hero ── */}
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Stock & warehouses
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <InboxOutlined />
              </span>
              Your stock
            </div>
            <div className="db-hero-sub">Where everything is kept, how much is left, and every change — received, moved, counted or sent on a challan.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">Units in stock</span>
              <span className="db-hero-number">{count(stats?.units ?? cards.warehouses.reduce((s, w) => s + w.units, 0))}</span>
              <span className="db-hero-figure-foot">
                <span>
                  {stats ? `${plural(stats.in_stock, "product")} in stock · ` : ""}
                  {plural(cards.warehouses.length, "warehouse")}
                </span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            {stats && stats.value > 0 ? (
              <div className="db-hero-meter">
                <div className="db-hero-meter-top">
                  <span className="db-hero-meter-label">Stock value at cost</span>
                  <b>{inrCompact(stats.value)}</b>
                </div>
                <div className="db-hero-track" role="img" aria-label={`${Math.round(valueShare)}% of stocked products have a cost price`}>
                  <span style={{ width: `${Math.min(100, valueShare)}%` }} />
                </div>
                <div className="db-hero-meter-foot">
                  <span>
                    {count(stats.priced)} of {count(stats.tracked)} have a cost price
                  </span>
                </div>
              </div>
            ) : (
              <div className="st-note-card">
                <b>Stock value</b>
                Add a cost when you receive goods (or on the product) to see what your stock is worth.
              </div>
            )}
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{count(stats?.tracked ?? 0)}</b>
                <span>Tracked</span>
              </div>
              <div className="db-hero-stat">
                <b>{count(stats?.low ?? 0)}</b>
                <span>Low</span>
              </div>
              <div className="db-hero-stat">
                <b>{count(stats?.out ?? 0)}</b>
                <span>Out</span>
              </div>
            </div>
            {canManage && (
              <div className="db-hero-btns">
                <button type="button" className="db-btn glass" onClick={() => setDialog({ mode: "count" })}>
                  <AuditOutlined /> Count
                </button>
                {cards.warehouses.length + cards.elsewhere.length > 1 && (
                  <button type="button" className="db-btn glass" onClick={() => setDialog({ mode: "move" })}>
                    <SwapOutlined /> Move
                  </button>
                )}
                <button type="button" className="db-btn white" onClick={() => setDialog({ mode: "receive" })} disabled={!cards.warehouses.length}>
                  <ImportOutlined /> Receive
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Warehouse cards ── */}
      <section className="st-cards" aria-label="Warehouses">
        {cards.warehouses.map((w, i) => {
          const where = [w.address, w.city, w.state].filter(Boolean).join(", ");
          const menu = [
            canEditWh && { key: "edit", icon: <EditOutlined />, label: "Edit name & address", onClick: () => setWhForm({ warehouse: w }) },
            canEditWh && !w.is_default && { key: "default", icon: <StarOutlined />, label: "Make default", onClick: () => makeDefault(w) },
            canArchiveWh && { key: "archive", icon: <DeleteOutlined />, label: "Archive", danger: true, onClick: () => archive(w) },
          ].filter(Boolean) as any[];
          return (
            <article key={w.id} className={`st-wh${w.is_default ? " default" : ""}`} style={{ animationDelay: `${i * 40}ms` }}>
              <div className="st-wh-head">
                <span className="st-wh-icon">
                  <HomeOutlined />
                </span>
                <div>
                  <h4>{w.name}</h4>
                  <p>
                    {where ? (
                      <>
                        <EnvironmentOutlined /> {where}
                      </>
                    ) : (
                      "No address yet"
                    )}
                  </p>
                </div>
                {w.is_default && (
                  <span className="st-default" title="New stock and new products go here">
                    <StarFilled /> Default
                  </span>
                )}
                {menu.length > 0 && (
                  <Dropdown menu={{ items: menu }} trigger={["click"]} placement="bottomRight">
                    <button type="button" className="pc-icon" aria-label={`More for ${w.name}`}>
                      <EllipsisOutlined />
                    </button>
                  </Dropdown>
                )}
              </div>
              <div className="st-wh-figs">
                <div>
                  <b>{count(w.stocked)}</b>
                  <span>products</span>
                </div>
                <div>
                  <b>{count(w.units)}</b>
                  <span>units</span>
                </div>
                <div>
                  <b>{w.value ? inrCompact(w.value) : "—"}</b>
                  <span>value</span>
                </div>
              </div>
              <div className="st-wh-foot">
                {w.alerts > 0 && (
                  <span className="pc-chip warn">
                    <WarningOutlined /> {w.alerts} low
                  </span>
                )}
                <span className="st-last">{w.last_change ? `Last change ${since(w.last_change)}` : "No stock changes yet"}</span>
                <span className="pc-foot-gap" />
                {seesProducts && (
                  <button type="button" className="pc-btn ghost sm" onClick={() => seeStock(w.id)}>
                    See stock
                  </button>
                )}
                {canManage && (
                  <button type="button" className="pc-btn primary sm" onClick={() => setDialog({ mode: "receive", preset: { warehouseId: w.id } })}>
                    <ImportOutlined /> Receive
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {cards.elsewhere.map((w) => (
          <article key={`x${w.id}`} className="st-wh ghost">
            <div className="st-wh-head">
              <span className="st-wh-icon">
                <WarningOutlined />
              </span>
              <div>
                <h4>{w.name}</h4>
                <p>{w.known ? "This warehouse is archived but still holds stock." : "Old stock whose warehouse was deleted."}</p>
              </div>
            </div>
            <div className="st-wh-figs">
              <div>
                <b>{count(w.products)}</b>
                <span>products</span>
              </div>
              <div>
                <b>{count(w.units)}</b>
                <span>units</span>
              </div>
              <div>
                <b>{w.value ? inrCompact(w.value) : "—"}</b>
                <span>value</span>
              </div>
            </div>
            <div className="st-wh-foot">
              <span className="st-last">Move it to a real warehouse, or count it to 0.</span>
              <span className="pc-foot-gap" />
              {seesProducts && (
                <button type="button" className="pc-btn ghost sm" onClick={() => seeStock(w.id)}>
                  See stock
                </button>
              )}
            </div>
          </article>
        ))}
        {canAddWh && (
          <button type="button" className="st-wh add" onClick={() => setWhForm({ warehouse: null })}>
            <PlusOutlined />
            Add a warehouse
            <em>a godown, shop or site store</em>
          </button>
        )}
      </section>

      {/* ── Stock & history ── */}
      {seesProducts && (
        <section className="pc-card st-panel" ref={tableRef as any}>
          <div className="st-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "stock"} className={tab === "stock" ? "on" : ""} onClick={() => setTab("stock")}>
              <AppstoreOutlined /> Stock <em>{count(stats?.tracked ?? 0)}</em>
            </button>
            <button type="button" role="tab" aria-selected={tab === "history"} className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>
              <HistoryOutlined /> History
            </button>
          </div>

          {tab === "stock" ? (
            <>
              <div className="st-bar">
                <Input allowClear prefix={<SearchOutlined />} placeholder="Search product, HSN, category or rack…" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pc-search" aria-label="Search stock" />
                <Select
                  value={warehouse}
                  onChange={(v) => {
                    setWarehouse(v);
                    setPage(1);
                  }}
                  className="pc-filter"
                  aria-label="Warehouse"
                  options={[{ value: "", label: "All warehouses" }, ...[...cards.warehouses, ...cards.elsewhere].map((w) => ({ value: String(w.id), label: w.name }))]}
                />
                <div className="st-seg" role="tablist" aria-label="Stock level">
                  {(
                    [
                      ["all", "All", stats?.tracked],
                      ["in", "In stock", stats?.in_stock],
                      ["low", "Low", stats?.low],
                      ["out", "Out", stats?.out],
                    ] as [StockFilter, string, number | undefined][]
                  ).map(([v, l, n]) => (
                    <button
                      key={v}
                      type="button"
                      role="tab"
                      aria-selected={status === v}
                      className={status === v ? "on" : ""}
                      onClick={() => {
                        setStatus(v);
                        setPage(1);
                      }}
                    >
                      {l}
                      {n !== undefined && <em>{count(n)}</em>}
                    </button>
                  ))}
                </div>
                <Select
                  value={sort}
                  onChange={(v) => {
                    setSort(v);
                    setPage(1);
                  }}
                  className="pc-filter"
                  aria-label="Sort"
                  options={[
                    { value: "name", label: "Name A–Z" },
                    { value: "stock_low", label: "Least stock first" },
                    { value: "stock_high", label: "Most stock first" },
                    { value: "value", label: "Highest value" },
                  ]}
                />
                {filtered && (
                  <button
                    type="button"
                    className="pc-link"
                    onClick={() => {
                      setSearchText("");
                      setWarehouse("");
                      setStatus("all");
                      setSort("name");
                    }}
                  >
                    Clear
                  </button>
                )}
                {/* Low or out of stock, nothing on order yet: a draft PO with them, last supplier and price filled in. */}
                {canOrder && (status === "low" || status === "out") && toOrder.length > 0 && (
                  <button type="button" className="pc-link" onClick={() => navigate(`/app/purchase-orders?new=1&products=${toOrder.map((p) => p.id).join(",")}`)}>
                    <ShoppingCartOutlined /> Order these ({toOrder.length})
                  </button>
                )}
              </div>

              {levels && levels.products.length > 0 ? (
                <div className="st-table" role="table" aria-label="Stock by warehouse">
                  <div className="st-trow head" role="row" style={{ gridTemplateColumns: grid }}>
                    <span>Product</span>
                    {wide ? (
                      columns.map((c) => (
                        <span key={c.id} className="r st-wcol" title={c.name}>
                          {c.name}
                        </span>
                      ))
                    ) : (
                      <span>Where</span>
                    )}
                    <span className="r">Total</span>
                    {canManage && <span />}
                  </div>
                  {levels.products.map((r) => {
                    const st = STATUS[r.status];
                    const preset = asProduct(r, names);
                    return (
                      <div key={r.id} className="st-trow" role="row" style={{ gridTemplateColumns: grid }}>
                        <span className="st-pname">
                          <button type="button" onClick={() => openProduct(r.id)} title={r.name}>
                            {r.name}
                          </button>
                          <em>
                            {[
                              r.hsn ? `HSN ${r.hsn}` : null,
                              r.category,
                              r.min ? `alert at ${r.min}` : null,
                              onOrder.get(r.id) ? `${count(onOrder.get(r.id)!.on_order)} on order${onOrder.get(r.id)!.next_date ? ` (due ${onOrder.get(r.id)!.next_date})` : ""}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </em>
                        </span>
                        {wide &&
                          columns.map((c) => {
                            const at = r.places.find((p) => p.warehouse_id === c.id);
                            return (
                              <span key={c.id} className="st-qty st-wcol">
                                <b className={!at || !at.qty ? "zero" : ""}>{at ? count(at.qty) : "—"}</b>
                                {at?.bin && <em>{at.bin}</em>}
                              </span>
                            );
                          })}
                        {/* As chips: the "Where" column — and, on phones, always (warehouse columns don't fit). */}
                        <span className={`st-places st-places-col${wide ? " st-phone-only" : ""}`}>
                          {r.places.map((p) => (
                            <span key={p.warehouse_id} className="pc-chip">
                              {names.get(p.warehouse_id) || `#${p.warehouse_id}`} · {count(p.qty)}
                              {p.bin ? ` · ${p.bin}` : ""}
                            </span>
                          ))}
                        </span>
                        <span className="st-total">
                          <b>{count(r.total)}</b>
                          <span className={`pc-pill ${st[1]}`}>{st[0]}</span>
                        </span>
                        {canManage && (
                          <span className="st-acts">
                            <Tooltip title="Receive">
                              <button type="button" className="pc-icon" onClick={() => setDialog({ mode: "receive", preset: { product: preset } })} aria-label={`Receive ${r.name}`}>
                                <ImportOutlined />
                              </button>
                            </Tooltip>
                            <Tooltip title="Move">
                              <button type="button" className="pc-icon" onClick={() => setDialog({ mode: "move", preset: { product: preset } })} aria-label={`Move ${r.name}`} disabled={r.total <= 0}>
                                <SwapOutlined />
                              </button>
                            </Tooltip>
                            <Tooltip title="Count">
                              <button type="button" className="pc-icon" onClick={() => setDialog({ mode: "count", preset: { product: preset } })} aria-label={`Count ${r.name}`}>
                                <AuditOutlined />
                              </button>
                            </Tooltip>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                levels && (
                  <div className="st-empty">
                    <InboxOutlined />
                    <b>{filtered ? "Nothing matches" : "No stock yet"}</b>
                    <span>
                      {filtered
                        ? "Try another search or clear the filters."
                        : `Receive goods into a warehouse, or give a product opening stock when you add it. ${count(levels.stats.untracked)} products aren't tracked yet.`}
                    </span>
                    {!filtered && canManage && cards.warehouses.length > 0 && (
                      <div className="st-empty-btns">
                        <button type="button" className="pc-btn primary" onClick={() => setDialog({ mode: "receive" })}>
                          <ImportOutlined /> Receive stock
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
              {levels && levels.pagination.pages > 1 && (
                <div className="st-pages">
                  <Pagination current={levels.pagination.page} pageSize={levels.pagination.limit} total={levels.pagination.total} onChange={setPage} showSizeChanger={false} size="small" />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="st-bar">
                <Input allowClear prefix={<SearchOutlined />} placeholder="Search product, bill no. or note…" value={hSearchText} onChange={(e) => setHSearchText(e.target.value)} className="pc-search" aria-label="Search history" />
                <Select
                  value={hWarehouse}
                  onChange={(v) => {
                    setHWarehouse(v);
                    setHPage(1);
                  }}
                  className="pc-filter"
                  aria-label="Warehouse"
                  options={[{ value: "", label: "All warehouses" }, ...[...cards.warehouses, ...cards.elsewhere].map((w) => ({ value: String(w.id), label: w.name }))]}
                />
                <Select
                  value={hType}
                  onChange={(v) => {
                    setHType(v);
                    setHPage(1);
                  }}
                  className="pc-filter"
                  aria-label="Kind of change"
                  options={TYPE_OPTIONS}
                />
                <Select
                  value={hDays}
                  onChange={(v) => {
                    setHDays(v);
                    setHPage(1);
                  }}
                  className="pc-filter"
                  aria-label="Period"
                  options={[
                    { value: 0, label: "Any time" },
                    { value: 7, label: "Last 7 days" },
                    { value: 30, label: "Last 30 days" },
                    { value: 90, label: "Last 90 days" },
                  ]}
                />
                {hProduct && (
                  <button type="button" className="pc-link" onClick={() => navigate("/app/warehouses?tab=history")}>
                    Show every product
                  </button>
                )}
              </div>
              <div style={{ padding: "4px 14px 8px" }}>
                {hist ? <HistoryList movements={hist.movements} showProduct onProduct={openProduct} empty="No stock changes match." /> : <div className="st-empty-line">Loading…</div>}
              </div>
              {hist && hist.pagination.pages > 1 && (
                <div className="st-pages">
                  <Pagination current={hist.pagination.page} pageSize={hist.pagination.limit} total={hist.pagination.total} onChange={setHPage} showSizeChanger={false} size="small" />
                </div>
              )}
            </>
          )}
        </section>
      )}

      <StockDialog
        open={!!dialog}
        mode={dialog?.mode || "receive"}
        preset={dialog?.preset}
        warehouses={options}
        sources={(cards.elsewhere || []).map((w) => ({ id: w.id, name: w.name, is_default: false }))}
        canAddWarehouse={canAddWh}
        onWarehouseAdded={() => loadCards()}
        onClose={(changed) => {
          setDialog(null);
          if (changed) refreshAll();
        }}
      />
      <WarehouseForm
        open={!!whForm}
        warehouse={whForm?.warehouse ?? null}
        first={!cards.warehouses.length}
        onClose={(saved) => {
          setWhForm(null);
          if (saved) refreshAll();
        }}
      />
    </div>
  );
};

export default StockPage;
