import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input, message, Modal, Pagination, Popconfirm, Select, Tooltip } from "antd";
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  InboxOutlined,
  NumberOutlined,
  PercentageOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  RollbackOutlined,
  SearchOutlined,
  TagOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { StatTile } from "@/modules/dashboard/components/Bits";
import "@/modules/dashboard/styles/dashboard.scss";
import { count, inrCompact } from "@/modules/dashboard/utils/format";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";
import StockDialog, { type StockMode } from "@/modules/stock/StockDialog";
import { CategoryPicker, useCategoryList, useWarehouseList } from "@/modules/stock/pickers";
import { bulkCategory } from "@/modules/stock/stockApi";
import PriceChange from "../catalog/PriceChange";
import ProductForm from "../catalog/ProductForm";
import ProductProfile from "../catalog/ProductProfile";
import {
  type Catalog,
  type CatalogFilter,
  type CatalogProduct,
  type CatalogSort,
  apiError,
  bulkArchive,
  getCatalog,
  qtyText,
  restoreProduct,
  rupees,
  sinceText,
  toCsv,
} from "../catalog/productsApi";
import "../catalog/products.scss";

const PAGE_SIZE = 20;
const BULK_MAX = 500;
const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};
const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

const FILTER_LABEL: Record<CatalogFilter, string> = {
  all: "All products",
  quoted: "Quoted · 90 days",
  never: "Never used",
  no_price: "No price",
  no_hsn: "No HSN",
  duplicates: "Same name twice",
  low_stock: "Low stock",
  new: "New · 30 days",
  archived: "Archived",
};

/** Everything you sell: prices, HSN, and how each product is selling. */
const ProductPage: React.FC = () => {
  const { can } = useAccess();
  const [params, setParams] = useSearchParams();
  const company = useMemo(companyName, []);
  const [data, setData] = useState<Catalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  // Links from Categories and Stock & warehouses arrive with a filter set.
  const [filter, setFilter] = useState<CatalogFilter>((params.get("filter") as CatalogFilter) || "all");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState(params.get("category") || "");
  const [warehouse, setWarehouse] = useState(params.get("warehouse") || "");
  const [sort, setSort] = useState<CatalogSort>("recent");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<CatalogProduct | null>(null);
  const [form, setForm] = useState<{ product: CatalogProduct | null } | null>(null);
  const [priceFor, setPriceFor] = useState<CatalogProduct[] | null>(null);
  const [stockFor, setStockFor] = useState<{ mode: StockMode; product: CatalogProduct; warehouseId?: number } | null>(null);
  const [catFor, setCatFor] = useState<{ ids: number[]; value: number | null } | null>(null);
  const [profileTick, setProfileTick] = useState(0);
  const [picked, setPicked] = useState<Map<number, CatalogProduct>>(new Map());
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const whs = useWarehouseList(can("warehouses.view"));
  const cats = useCategoryList(!!catFor && can("categories.view"));

  // ?open=<id> opens that product's profile (links from stock and categories).
  useEffect(() => {
    const id = Number(params.get("open"));
    if (!id) return;
    getCatalog({ id })
      .then((d) => d.products[0] && setOpen(d.products[0]))
      .catch(() => {})
      .finally(() => {
        params.delete("open");
        setParams(params, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typing settles for a moment before searching.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const query = useMemo(() => ({ search, filter, unit, category, warehouse, sort }), [search, filter, unit, category, warehouse, sort]);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const d = await getCatalog({ ...query, page, limit: PAGE_SIZE });
      if (mine !== seq.current) return;
      setData(d);
      setFailed(false);
      // Keep an open profile in step with fresh figures.
      setOpen((o) => (o ? d.products.find((x) => x.id === o.id) || o : o));
    } catch (e) {
      if (mine !== seq.current) return;
      setFailed(true);
      message.error(apiError(e, "Couldn't load your products"));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [query, page]);
  useEffect(() => {
    load();
  }, [load]);

  // A new view starts a new selection.
  useEffect(() => setPicked(new Map()), [query]);

  const pick = (f: Partial<{ filter: CatalogFilter; unit: string; category: string; warehouse: string; sort: CatalogSort }>) => {
    if (f.filter !== undefined) setFilter(f.filter);
    if (f.unit !== undefined) setUnit(f.unit);
    if (f.category !== undefined) setCategory(f.category);
    if (f.warehouse !== undefined) setWarehouse(f.warehouse);
    if (f.sort !== undefined) setSort(f.sort);
    setPage(1);
  };
  const clear = () => {
    setSearchText("");
    setSearch("");
    pick({ filter: "all", unit: "", category: "", warehouse: "", sort: "recent" });
  };

  const canAdd = can("products.create");
  const canEdit = can("products.edit");
  const canArchive = can("products.delete");

  // ── Selection ──
  const toggle = (p: CatalogProduct) =>
    setPicked((m) => {
      const n = new Map(m);
      if (n.has(p.id)) n.delete(p.id);
      else n.set(p.id, p);
      return n;
    });
  const pageRows = data?.products || [];
  const allOnPage = pageRows.length > 0 && pageRows.every((p) => picked.has(p.id));
  const togglePage = () =>
    setPicked((m) => {
      const n = new Map(m);
      if (allOnPage) pageRows.forEach((p) => n.delete(p.id));
      else pageRows.forEach((p) => n.size < BULK_MAX && n.set(p.id, p));
      return n;
    });
  const pickAllMatching = async () => {
    setBusy(true);
    try {
      const all = await getCatalog({ ...query, all: 1 });
      setPicked(new Map(all.products.slice(0, BULK_MAX).map((p) => [p.id, p])));
      if (all.products.length > BULK_MAX) message.info(`Picked the first ${BULK_MAX} — that's the most one change can cover.`);
    } catch (e) {
      message.error(apiError(e, "Couldn't pick them all"));
    } finally {
      setBusy(false);
    }
  };

  // ── Actions ──
  const archive = async (list: CatalogProduct[]) => {
    setBusy(true);
    try {
      const r = await bulkArchive(list.map((p) => p.id));
      message.success(
        list.length === 1 ? `${list[0].name} archived — find it under Archived` : `${r.archived} product${r.archived === 1 ? "" : "s"} archived — find them under Archived`,
      );
      setPicked(new Map());
      setOpen(null);
      load();
    } catch (e) {
      message.error(apiError(e, "Couldn't archive"));
    } finally {
      setBusy(false);
    }
  };
  const setCategoryFor = async () => {
    if (!catFor) return;
    setBusy(true);
    try {
      const r = await bulkCategory(catFor.ids, catFor.value);
      message.success(`${r.updated} product${r.updated === 1 ? "" : "s"} ${r.category ? `now in ${r.category}` : "now without a category"}`);
      setCatFor(null);
      setPicked(new Map());
      load();
    } catch (e) {
      message.error(apiError(e, "Couldn't set the category"));
    } finally {
      setBusy(false);
    }
  };
  const restore = async (p: CatalogProduct) => {
    try {
      await restoreProduct(p.id);
      message.success(`${p.name} is back in your products`);
      setOpen(null);
      load();
    } catch (e) {
      message.error(apiError(e, "Couldn't restore it"));
    }
  };
  const exportCsv = async () => {
    setBusy(true);
    try {
      const all = await getCatalog({ ...query, all: 1 });
      const blob = new Blob([toCsv(all.products, all.access.money)], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      message.success(`Exported ${plural(all.products.length, "product")}`);
    } catch (e) {
      message.error(apiError(e, "Couldn't export"));
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="db-root pc-root">
        <div className="db-hero skeleton pc-hero-sk">
          {failed && (
            <div className="pc-failed">
              Couldn't load your products.
              <button type="button" className="db-btn white" onClick={load}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { stats, access } = data;
  const ready = stats.total ? (stats.ready / stats.total) * 100 : 0;
  const filtered = !!search || filter !== "all" || !!unit || !!category || !!warehouse || sort !== "recent";
  const archivedView = filter === "archived";
  const selectable = !archivedView && (canEdit || canArchive);
  const pickedList = [...picked.values()];
  const showing = (f: CatalogFilter) => (filter === f ? <span className="pc-on" role="img" aria-label="Showing" title="Showing" /> : undefined);
  const filterOptions = (
    ["all", ...(access.quotations ? ["quoted"] : []), "never", "no_price", "no_hsn", "new", ...(stats.duplicates ? ["duplicates"] : []), ...(stats.tracks_stock ? ["low_stock"] : []), ...(stats.archived ? ["archived"] : [])] as CatalogFilter[]
  ).map((f) => ({ value: f, label: FILTER_LABEL[f] }));

  return (
    <div className={`db-root pc-root${loading ? " refreshing" : ""}${picked.size ? " picking" : ""}`}>
      {/* ── Hero ── */}
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Products
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <AppstoreOutlined />
              </span>
              Your products
            </div>
            <div className="db-hero-sub">Everything you sell — prices, HSN, and how each one is selling.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">Products</span>
              <span className="db-hero-number">{count(stats.total)}</span>
              <span className="db-hero-figure-foot">
                {stats.new_30d > 0 && <span className="db-delta good ondark">+{count(stats.new_30d)} new</span>}
                <span>in the last 30 days{access.quotations ? ` · ${count(stats.quoted_90d)} quoted in the last 90 days` : ""}</span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-meter">
              <div className="db-hero-meter-top">
                <span className="db-hero-meter-label">Ready to quote</span>
                <b>{Math.round(ready)}%</b>
              </div>
              <div className="db-hero-track" role="img" aria-label={`${Math.round(ready)}% of products have both a price and an HSN code`}>
                <span style={{ width: `${Math.min(100, ready)}%` }} />
              </div>
              <div className="db-hero-meter-foot">
                <span>{count(stats.ready)} have a price and HSN</span>
                <span>
                  {count(stats.no_price)} no price · {count(stats.no_hsn)} no HSN
                </span>
              </div>
            </div>
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{count(stats.units.length)}</b>
                <span>Units</span>
              </div>
              <div className="db-hero-stat">
                <b>{count(stats.categories.length)}</b>
                <span>Categories</span>
              </div>
              <div className="db-hero-stat">
                <b>{count(stats.archived)}</b>
                <span>Archived</span>
              </div>
            </div>
            <div className="db-hero-btns">
              <button type="button" className="db-btn glass" onClick={exportCsv} disabled={busy}>
                <DownloadOutlined /> Export
              </button>
              {canAdd && (
                <button type="button" className="db-btn white" onClick={() => setForm({ product: null })}>
                  <PlusOutlined /> Add product
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tiles (filters) ── */}
      <div className="db-tiles pc-tiles">
        <StatTile index={0} icon={<AppstoreOutlined />} label="All products" value={count(stats.total)} tint="var(--db-s1)" sub={`${plural(stats.units.length, "unit")} · ${plural(stats.categories.length, "category", "categories")}`} badge={showing("all")} onClick={clear} />
        {access.quotations && (
          <StatTile
            index={1}
            icon={<FireOutlined />}
            label="Quoted lately"
            value={count(stats.quoted_90d)}
            tint="var(--db-s2)"
            sub="in the last 90 days"
            badge={showing("quoted")}
            onClick={() => pick({ filter: "quoted", sort: "quoted" })}
          />
        )}
        <StatTile index={2} icon={<ClockCircleOutlined />} label="Never used" value={count(stats.never_used)} tint="var(--db-s4)" sub="no quote, challan or bill" badge={showing("never")} onClick={() => pick({ filter: "never", sort: "recent" })} />
        <StatTile index={3} icon={<TagOutlined />} label="No price" value={count(stats.no_price)} tint="var(--db-s3)" sub="quotes start at ₹0" badge={showing("no_price")} onClick={() => pick({ filter: "no_price" })} />
        <StatTile index={4} icon={<NumberOutlined />} label="No HSN" value={count(stats.no_hsn)} tint="var(--db-s7)" sub="needed on GST bills" badge={showing("no_hsn")} onClick={() => pick({ filter: "no_hsn" })} />
        {stats.duplicates > 0 && (
          <StatTile
            index={5}
            icon={<CopyOutlined />}
            label="Same name twice"
            value={count(stats.duplicates)}
            tint="var(--db-neutral)"
            sub="quotes can't tell them apart"
            badge={showing("duplicates")}
            onClick={() => pick({ filter: "duplicates", sort: "name" })}
          />
        )}
        {stats.tracks_stock > 0 && (
          <StatTile
            index={6}
            icon={<InboxOutlined />}
            label="Stock alerts"
            value={count(stats.low_stock)}
            tint="var(--db-s5)"
            sub={`low or out · of ${count(stats.tracks_stock)} tracked`}
            badge={showing("low_stock")}
            onClick={() => pick({ filter: "low_stock" })}
          />
        )}
        {stats.archived > 0 && (
          <StatTile index={7} icon={<DeleteOutlined />} label="Archived" value={count(stats.archived)} tint="var(--db-neutral)" sub="hidden from pickers" badge={showing("archived")} onClick={() => pick({ filter: "archived" })} />
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="pc-bar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search name, HSN, SKU, barcode… (e.g. myrius 6 m)"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pc-search"
          aria-label="Search products"
        />
        <Select value={filter} onChange={(v) => pick({ filter: v })} className="pc-filter" aria-label="Show" options={filterOptions} />
        <Select
          value={unit}
          onChange={(v) => pick({ unit: v })}
          className="pc-filter"
          aria-label="Unit"
          showSearch
          options={[{ value: "", label: "All units" }, ...stats.units.map((u) => ({ value: u.unit.toUpperCase(), label: `${u.unit} (${count(u.n)})` }))]}
        />
        {(stats.warehouses.length > 0 || !!warehouse) && (
          <Select
            value={warehouse}
            onChange={(v) => pick({ warehouse: v })}
            className="pc-filter"
            aria-label="Warehouse"
            options={[
              { value: "", label: "All warehouses" },
              ...stats.warehouses.map((w) => ({ value: String(w.id), label: `${w.name} (${count(w.n)})` })),
              { value: "none", label: `Not in a warehouse (${count(stats.unplaced)})` },
            ]}
          />
        )}
        {(stats.categories.length > 0 || !!category) && (
          <Select
            value={category}
            onChange={(v) => pick({ category: v })}
            className="pc-filter"
            aria-label="Category"
            showSearch
            optionFilterProp="label"
            options={[{ value: "", label: "All categories" }, ...stats.categories.map((c) => ({ value: String(c.id), label: `${c.name} (${count(c.n)})` })), { value: "none", label: "No category" }]}
          />
        )}
        <Select
          value={sort}
          onChange={(v) => pick({ sort: v })}
          className="pc-filter"
          aria-label="Sort"
          options={[
            { value: "recent", label: "Newest first" },
            { value: "name", label: "Name A–Z" },
            ...(access.quotations
              ? [
                  { value: "quoted", label: "Most quoted" },
                  { value: "last_quoted", label: "Recently quoted" },
                ]
              : []),
            { value: "price_high", label: "Price: high to low" },
            { value: "price_low", label: "Price: low to high" },
          ]}
        />
        {filtered && (
          <button type="button" className="pc-link" onClick={clear}>
            Clear
          </button>
        )}
        <span className="pc-count">
          {count(data.pagination.total)} of {count(archivedView ? stats.archived : stats.total)}
        </span>
      </div>

      {/* ── List ── */}
      <section className="pc-card">
        <div className="pc-list-head">
          {selectable ? <input type="checkbox" className="pc-check" checked={allOnPage} onChange={togglePage} aria-label="Pick every product on this page" /> : <span />}
          <span>Product</span>
          <span className="r">Price</span>
          <span>{access.quotations ? "Quoted" : "Used"}</span>
          <span>{access.invoices ? "Billed · sent" : "Sent"}</span>
          <span />
        </div>
        {selectable && allOnPage && data.pagination.total > pageRows.length && picked.size < Math.min(data.pagination.total, BULK_MAX) && (
          <div className="pc-select-all">
            All {pageRows.length} on this page are picked.
            <button type="button" className="pc-link" onClick={pickAllMatching} disabled={busy}>
              Pick all {count(Math.min(data.pagination.total, BULK_MAX))}
              {data.pagination.total > BULK_MAX ? ` (of ${count(data.pagination.total)})` : ""} that match
            </button>
          </div>
        )}
        <ul className="pc-list">
          {pageRows.map((p, i) => {
            const isPicked = picked.has(p.id);
            const gaveLess = p.last_rate !== null && p.price > 0 && Math.abs(p.last_rate - p.price) >= 0.01;
            return (
              <li key={p.id} className={`pc-row${isPicked ? " picked" : ""}${p.active ? "" : " archived"}`} style={{ ["--i" as any]: Math.min(i, 12) }}>
                {selectable ? <input type="checkbox" className="pc-check" checked={isPicked} onChange={() => toggle(p)} aria-label={`Pick ${p.name}`} /> : <span />}
                <button type="button" className="pc-name" onClick={() => setOpen(p)}>
                  <span className={`pc-thumb${p.active ? "" : " off"}`}>{p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <AppstoreOutlined />}</span>
                  <span className="pc-name-text">
                    <b title={p.name}>{p.name}</b>
                    <span>
                      {p.hsn ? <i className="pc-chip mono">HSN {p.hsn}</i> : <i className="pc-chip warn">No HSN</i>}
                      {p.unit && <i className="pc-chip">{p.unit}</i>}
                      {p.category && <i className="pc-chip accent">{p.category}</i>}
                      {p.duplicate && (
                        <i className="pc-chip warn" title="Another product has the same name">
                          <WarningOutlined /> Twice
                        </i>
                      )}
                      {(p.places.length > 0 || p.min_stock > 0) && (
                        <Tooltip title={p.places.length ? p.places.map((w) => `${w.name}: ${w.qty}${w.bin ? ` (${w.bin})` : ""}`).join(" · ") : "Not kept in a warehouse yet"}>
                          <i className={`pc-chip ${p.stock <= 0 ? "bad" : p.min_stock > 0 && p.stock <= p.min_stock ? "warn" : "good"}`}>
                            {p.stock <= 0 ? "Out of stock" : p.min_stock > 0 && p.stock <= p.min_stock ? `Low · ${qtyText(p.stock)}` : `${qtyText(p.stock)} in stock`}
                          </i>
                        </Tooltip>
                      )}
                    </span>
                  </span>
                </button>
                <span className="pc-cell pc-price" data-label="Price">
                  {p.price > 0 ? <b>{rupees(p.price)}</b> : <span className="pc-sub bad">No price</span>}
                  <span className="pc-sub">GST {p.gst}%</span>
                </span>
                <span className="pc-cell pc-uses" data-label="Quoted">
                  {access.quotations ? (
                    p.quoted ? (
                      <>
                        <b>{plural(p.quoted, "quote")}</b>
                        <span className="pc-sub">
                          {plural(p.customers, "customer")} · {sinceText(p.last_quoted).toLowerCase()}
                        </span>
                        {gaveLess && <span className="pc-sub">last given {rupees(p.last_rate)}</span>}
                      </>
                    ) : (
                      <span className="pc-sub">Never quoted</span>
                    )
                  ) : (
                    <span className="pc-sub">{p.challans ? plural(p.challans, "challan") : "—"}</span>
                  )}
                </span>
                <span className="pc-cell pc-sold" data-label="Billed · sent">
                  {access.invoices && p.invoiced ? (
                    <>
                      <b>{access.money && p.billed ? inrCompact(p.billed) : plural(p.invoiced, "invoice")}</b>
                      <span className="pc-sub">
                        {qtyText(p.sold_qty)} {p.unit || ""} billed
                      </span>
                    </>
                  ) : p.challans ? (
                    <>
                      <b>{plural(p.challans, "challan")}</b>
                      <span className="pc-sub">
                        {qtyText(p.dispatched_qty)} {p.unit || ""} sent
                      </span>
                    </>
                  ) : (
                    <span className="pc-sub">Not billed yet</span>
                  )}
                </span>
                <span className="pc-actions">
                  {canEdit && p.active && (
                    <Tooltip title="Edit">
                      <button type="button" className="pc-icon" onClick={() => setForm({ product: p })} aria-label={`Edit ${p.name}`}>
                        <EditOutlined />
                      </button>
                    </Tooltip>
                  )}
                  {canEdit && !p.active && (
                    <Tooltip title="Restore">
                      <button type="button" className="pc-icon" onClick={() => restore(p)} aria-label={`Restore ${p.name}`}>
                        <RollbackOutlined />
                      </button>
                    </Tooltip>
                  )}
                  <button type="button" className="pc-icon" onClick={() => setOpen(p)} aria-label={`Open ${p.name}`}>
                    <RightOutlined />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        {!pageRows.length && (
          <div className="pc-empty">
            {filtered ? <SearchOutlined /> : <AppstoreOutlined />}
            <b>{filtered ? "Nothing matches" : "No products yet"}</b>
            <span>{filtered ? "Try another search or clear the filters." : "Add what you sell — or just start a quotation; new items are saved here for you."}</span>
            {filtered ? (
              <button type="button" className="pc-btn ghost" onClick={clear}>
                Clear filters
              </button>
            ) : (
              canAdd && (
                <button type="button" className="pc-btn primary" onClick={() => setForm({ product: null })}>
                  <PlusOutlined /> Add product
                </button>
              )
            )}
          </div>
        )}
        {data.pagination.pages > 1 && (
          <div className="pc-pages">
            <Pagination
              current={data.pagination.page}
              pageSize={data.pagination.limit}
              total={data.pagination.total}
              onChange={(n) => {
                setPage(n);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              showSizeChanger={false}
              size="small"
            />
          </div>
        )}
      </section>

      {/* ── Selection bar ── */}
      {picked.size > 0 && (
        <div className="pc-selbar" role="region" aria-label="Picked products">
          <b>{plural(picked.size, "product")} picked</b>
          {canEdit && (
            <button type="button" className="pc-btn ghost sm" onClick={() => setPriceFor(pickedList)} disabled={busy}>
              <PercentageOutlined /> Change prices
            </button>
          )}
          {canEdit && can("categories.view") && (
            <button type="button" className="pc-btn ghost sm" onClick={() => setCatFor({ ids: pickedList.map((p) => p.id), value: null })} disabled={busy}>
              <TagOutlined /> Set category
            </button>
          )}
          {canArchive && (
            <Popconfirm
              title={`Archive ${plural(picked.size, "product")}?`}
              description="They leave the quotation and challan pickers. Old documents keep them, and you can restore them any time."
              okText="Archive"
              okButtonProps={{ danger: true }}
              onConfirm={() => archive(pickedList)}
            >
              <button type="button" className="pc-btn danger sm" disabled={busy}>
                <DeleteOutlined /> Archive
              </button>
            </Popconfirm>
          )}
          <button type="button" className="pc-selbar-x" onClick={() => setPicked(new Map())}>
            Clear
          </button>
        </div>
      )}

      {canAdd && (
        <button type="button" className="pc-fab" onClick={() => setForm({ product: null })} aria-label="Add product">
          <PlusOutlined />
        </button>
      )}

      {!stats.total && !filtered && (
        <p className="pc-note" style={{ textAlign: "center" }}>
          <ExclamationCircleOutlined /> Tip: products you type into a quotation are saved here automatically.
        </p>
      )}

      <ProductProfile
        product={open}
        can={{ edit: canEdit, archive: canArchive, stock: can("stock.manage") }}
        warehouses={whs.list}
        refreshKey={profileTick}
        onClose={() => setOpen(null)}
        onEdit={(p) => setForm({ product: p })}
        onPrice={(p) => setPriceFor([p])}
        onStock={(mode, p, warehouseId) => setStockFor({ mode, product: p, warehouseId })}
        onArchive={(p) => archive([p])}
        onRestore={restore}
      />
      <StockDialog
        open={!!stockFor}
        mode={stockFor?.mode || "receive"}
        preset={stockFor ? { product: stockFor.product, warehouseId: stockFor.warehouseId } : undefined}
        warehouses={whs.list || []}
        canAddWarehouse={can("warehouses.create")}
        onWarehouseAdded={() => whs.reload()}
        onClose={(changed) => {
          setStockFor(null);
          if (changed) {
            load();
            setProfileTick((t) => t + 1);
          }
        }}
      />
      <Modal
        open={!!catFor}
        onCancel={() => setCatFor(null)}
        footer={null}
        closable={false}
        width={480}
        destroyOnHidden
        className="pc-dialog"
        rootClassName="pc-portal"
        centered
      >
        <div className="pc-dlg-head">
          <span className="pc-thumb">
            <TagOutlined />
          </span>
          <div>
            <h3>Set category</h3>
            <p>For {plural(catFor?.ids.length || 0, "product")} — or pick none to clear it.</p>
          </div>
          <button type="button" className="pc-x" onClick={() => setCatFor(null)} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="pc-dlg-body">
          <label className="st-field" style={{ marginBottom: 14 }}>
            <span>Category</span>
            {cats.list ? (
              <CategoryPicker
                value={catFor?.value ?? null}
                onChange={(v) => catFor && setCatFor({ ...catFor, value: v })}
                categories={cats.list}
                canAdd={can("categories.create")}
                onAdded={(c) => cats.setList((l) => [...(l || []), c])}
                placeholder="No category"
              />
            ) : (
              <span className="pc-hint">Loading categories…</span>
            )}
          </label>
        </div>
        <div className="pc-dlg-foot">
          <span className="pc-foot-gap" />
          <button type="button" className="pc-btn ghost" onClick={() => setCatFor(null)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="pc-btn primary" onClick={setCategoryFor} disabled={busy}>
            <TagOutlined /> {catFor?.value ? "Set category" : "Clear category"}
          </button>
        </div>
      </Modal>
      <ProductForm
        open={!!form}
        product={form?.product ?? null}
        units={stats.units.map((u) => u.unit)}
        onClose={(saved) => {
          setForm(null);
          if (saved) load();
        }}
      />
      <PriceChange
        products={priceFor}
        onClose={(changed) => {
          setPriceFor(null);
          if (changed) {
            setPicked(new Map());
            load();
          }
        }}
      />
    </div>
  );
};

export default ProductPage;
