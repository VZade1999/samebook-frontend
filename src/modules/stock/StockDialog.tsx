import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input, InputNumber, message, Modal, Select, Spin } from "antd";
import { CheckOutlined, DeleteOutlined, ImportOutlined, PlusOutlined, AuditOutlined, SwapOutlined } from "@ant-design/icons";
import { type CatalogProduct, getCatalog } from "@/modules/products/catalog/productsApi";
import "@/modules/products/catalog/products.scss";
import { WarehousePicker, type WarehouseOption } from "./pickers";
import { type CountReason, REASON_LABEL, apiError, countStock, moveStock, receiveStock, signed } from "./stockApi";
import "./stock.scss";

export type StockMode = "receive" | "move" | "count";
export interface StockPreset {
  product?: CatalogProduct | null;
  warehouseId?: number | null;
  toWarehouseId?: number | null;
}

interface Line {
  key: number;
  product: CatalogProduct | null;
  qty: number | null;
  cost: number | null;
  counted: number | null;
}

const COPY: Record<StockMode, { title: string; sub: string; icon: React.ReactNode }> = {
  receive: { title: "Receive stock", sub: "Goods arrived from a supplier — add them to a warehouse.", icon: <ImportOutlined /> },
  move: { title: "Move stock", sub: "From one of your warehouses to another.", icon: <SwapOutlined /> },
  count: { title: "Count stock", sub: "Enter what's actually on the shelf — the difference is recorded.", icon: <AuditOutlined /> },
};

const here = (p: CatalogProduct | null, warehouseId: number | null | undefined) => (p && warehouseId ? p.places.find((x) => x.warehouse_id === warehouseId)?.qty ?? 0 : 0);
let seq = 1;
const blank = (): Line => ({ key: seq++, product: null, qty: null, cost: null, counted: null });

/** Find a product by typing; shows its stock in the chosen warehouse. */
const ProductSearch: React.FC<{
  value: CatalogProduct | null;
  onPick: (p: CatalogProduct) => void;
  warehouseId: number | null;
  scopeToWarehouse: boolean;
  taken: Set<number>;
}> = ({ value, onPick, warehouseId, scopeToWarehouse, taken }) => {
  const [options, setOptions] = useState<CatalogProduct[]>(value ? [value] : []);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seqRef = useRef(0);
  const look = (text: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const mine = ++seqRef.current;
      setLoading(true);
      try {
        const d = await getCatalog({
          search: text.trim(),
          limit: 20,
          sort: text.trim() ? "name" : "recent",
          ...(scopeToWarehouse && warehouseId && !text.trim() ? { warehouse: String(warehouseId) } : {}),
        });
        if (mine === seqRef.current) setOptions(d.products);
      } catch {
        if (mine === seqRef.current) setOptions([]);
      } finally {
        if (mine === seqRef.current) setLoading(false);
      }
    }, 300);
  };
  return (
    <Select
      showSearch
      filterOption={false}
      placeholder="Search a product…"
      value={value?.id}
      onSearch={look}
      onOpenChange={(o) => o && !options.length && look("")}
      notFoundContent={loading ? <Spin size="small" /> : "No products found"}
      onChange={(id) => {
        const p = options.find((x) => x.id === id);
        if (p) onPick(p);
      }}
      options={options.map((p) => ({
        value: p.id,
        disabled: taken.has(p.id) && p.id !== value?.id,
        label: (
          <span className="st-prod-opt">
            <span>{p.name}</span>
            <em>{[p.hsn ? `HSN ${p.hsn}` : null, warehouseId ? `${here(p, warehouseId)} here` : `${p.stock} in stock`].filter(Boolean).join(" · ")}</em>
          </span>
        ),
      }))}
      style={{ width: "100%" }}
      aria-label="Product"
    />
  );
};

/**
 * Receive, move or count stock — one product or many. Quantities are whole
 * numbers; a move can't take more than the source holds (the server checks
 * too, inside one transaction).
 */
const StockDialog: React.FC<{
  open: boolean;
  mode: StockMode;
  preset?: StockPreset;
  warehouses: WarehouseOption[];
  /** Extra places stock can come out of (archived or deleted warehouses that still hold some). */
  sources?: WarehouseOption[];
  canAddWarehouse: boolean;
  onWarehouseAdded: (w: WarehouseOption) => void;
  onClose: (changed: boolean) => void;
}> = ({ open, mode, preset, warehouses, sources = [], canAddWarehouse, onWarehouseAdded, onClose }) => {
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<CountReason>("COUNTED");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const def = warehouses.find((w) => w.is_default)?.id ?? warehouses[0]?.id ?? null;
    const p = preset?.product ?? null;
    // Moving or counting a product: start where it has stock.
    const fullest = p && p.places.length ? [...p.places].sort((a, b) => b.qty - a.qty)[0].warehouse_id : null;
    const wh = preset?.warehouseId ?? (mode === "receive" ? def : fullest ?? def);
    setWarehouseId(wh);
    setToId(preset?.toWarehouseId ?? (mode === "move" ? warehouses.find((w) => w.id !== wh)?.id ?? null : null));
    setLines([{ ...blank(), product: p, counted: mode === "count" && p ? here(p, wh) : null }]);
    setReference("");
    setNote("");
    setReason("COUNTED");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const taken = useMemo(() => new Set(lines.map((l) => l.product?.id).filter((x): x is number => !!x)), [lines]);
  const set = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const ready = lines.filter((l) => l.product);
  const problems: string[] = [];
  if (!warehouseId) problems.push(mode === "move" ? "Choose where the goods are now" : "Choose a warehouse");
  if (mode === "move" && !toId) problems.push("Choose where they're going");
  if (mode === "move" && warehouseId && toId && warehouseId === toId) problems.push("Pick two different warehouses");
  if (!ready.length) problems.push("Add at least one product");
  ready.forEach((l) => {
    if (mode === "count") {
      if (l.counted === null || !Number.isInteger(l.counted) || l.counted < 0) problems.push(`Enter the count for ${l.product!.name}`);
    } else if (!l.qty || !Number.isInteger(l.qty) || l.qty <= 0) problems.push(`Enter a whole quantity for ${l.product!.name}`);
    else if (mode === "move" && l.qty > here(l.product, warehouseId)) problems.push(`${l.product!.name}: only ${here(l.product, warehouseId)} there`);
  });
  const units = ready.reduce((s, l) => s + (mode === "count" ? 0 : l.qty || 0), 0);
  const changes = mode === "count" ? ready.filter((l) => l.counted !== null && l.counted !== here(l.product, warehouseId)).length : 0;

  const save = async () => {
    if (problems.length) {
      message.warning(problems[0]);
      return;
    }
    setSaving(true);
    try {
      if (mode === "receive") {
        const r = await receiveStock({
          warehouse_id: warehouseId!,
          reference_no: reference.trim() || undefined,
          note: note.trim() || undefined,
          lines: ready.map((l) => ({ product_id: l.product!.id, qty: l.qty!, unit_cost: l.cost })),
        });
        message.success(`${r.units} units received into ${r.warehouse}`);
      } else if (mode === "move") {
        const r = await moveStock({ from_warehouse_id: warehouseId!, to_warehouse_id: toId!, note: note.trim() || undefined, lines: ready.map((l) => ({ product_id: l.product!.id, qty: l.qty! })) });
        message.success(`${r.units} units moved from ${r.from} to ${r.to}`);
      } else {
        const r = await countStock({ warehouse_id: warehouseId!, reason, note: note.trim() || undefined, lines: ready.map((l) => ({ product_id: l.product!.id, counted: l.counted! })) });
        message.success(r.changed ? `Count saved — ${r.changed} product${r.changed === 1 ? "" : "s"} corrected in ${r.warehouse}` : "Count saved — everything matched");
      }
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };

  const c = COPY[mode];
  // Stock can come out of (or be counted in) an old warehouse; it only goes into active ones.
  const picker = (value: number | null, onChange: (v: number | null) => void, exclude?: number | null, id?: string, source = false) => (
    <WarehousePicker
      id={id}
      value={value}
      onChange={onChange}
      warehouses={source ? [...warehouses, ...sources] : warehouses}
      canAdd={canAddWarehouse && !source}
      onAdded={onWarehouseAdded}
      exclude={exclude}
    />
  );
  return (
    <Modal open={open} onCancel={() => onClose(false)} footer={null} closable={false} width={760} destroyOnHidden className="pc-dialog" rootClassName="pc-portal" centered>
      <div className="pc-dlg-head">
        <span className="pc-thumb">{c.icon}</span>
        <div>
          <h3>{c.title}</h3>
          <p>{c.sub}</p>
        </div>
        <button type="button" className="pc-x" onClick={() => onClose(false)} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="pc-dlg-body">
        <div className="st-wh-fields">
          {mode === "move" ? (
            <>
              <label className="st-field">
                <span>From</span>
                {picker(warehouseId, setWarehouseId, toId, "st-from", true)}
              </label>
              <SwapOutlined className="st-arrow" aria-hidden />
              <label className="st-field">
                <span>To</span>
                {picker(toId, setToId, warehouseId, "st-to")}
              </label>
            </>
          ) : (
            <label className="st-field">
              <span>{mode === "receive" ? "Arrived at" : "Warehouse counted"}</span>
              {picker(warehouseId, setWarehouseId, null, "st-wh", mode === "count")}
            </label>
          )}
          {mode === "receive" && (
            <label className="st-field">
              <span>Supplier bill no.</span>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" maxLength={64} />
            </label>
          )}
          {mode === "count" && (
            <label className="st-field">
              <span>Why it differs</span>
              <Select value={reason} onChange={setReason} options={(Object.keys(REASON_LABEL) as CountReason[]).map((r) => ({ value: r, label: REASON_LABEL[r] }))} />
            </label>
          )}
        </div>

        <div className="st-lines" role="table" aria-label="Products">
          <div className={`st-line head ${mode}`} role="row">
            <span>Product</span>
            {mode === "count" ? (
              <>
                <span className="r">On books</span>
                <span className="r">Counted</span>
                <span className="r">Difference</span>
              </>
            ) : (
              <>
                <span className="r">{mode === "move" ? "There now" : "In stock here"}</span>
                <span className="r">Quantity</span>
                {mode === "receive" && <span className="r">Cost / unit</span>}
              </>
            )}
            <span />
          </div>
          {lines.map((l) => {
            const have = here(l.product, warehouseId);
            const diff = l.counted !== null && l.product ? l.counted - have : null;
            const over = mode === "move" && !!l.qty && l.qty > have;
            return (
              <div key={l.key} className={`st-line ${mode}`} role="row">
                <ProductSearch
                  value={l.product}
                  warehouseId={warehouseId}
                  scopeToWarehouse={mode !== "receive"}
                  taken={taken}
                  onPick={(p) => set(l.key, { product: p, counted: mode === "count" ? here(p, warehouseId) : l.counted })}
                />
                <span className="st-have r">
                  {l.product ? have : "—"}
                  {l.product?.unit ? <em> {l.product.unit}</em> : null}
                </span>
                {mode === "count" ? (
                  <>
                    <InputNumber min={0} precision={0} value={l.counted} onChange={(v) => set(l.key, { counted: v === null ? null : Number(v) })} aria-label="Counted" />
                    <span className={`st-diff r ${diff === null || diff === 0 ? "" : diff > 0 ? "up" : "down"}`}>{diff === null ? "—" : diff === 0 ? "Matches" : signed(diff)}</span>
                  </>
                ) : (
                  <>
                    <InputNumber min={1} precision={0} value={l.qty} status={over ? "error" : undefined} onChange={(v) => set(l.key, { qty: v === null ? null : Number(v) })} aria-label="Quantity" />
                    {mode === "receive" && (
                      <InputNumber min={0} precision={2} prefix="₹" value={l.cost} placeholder="Optional" onChange={(v) => set(l.key, { cost: v === null ? null : Number(v) })} aria-label="Cost per unit" />
                    )}
                  </>
                )}
                <button type="button" className="pc-icon" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [blank()]))} aria-label="Remove line">
                  <DeleteOutlined />
                </button>
              </div>
            );
          })}
          <button type="button" className="pc-link st-more" onClick={() => setLines((ls) => [...ls, blank()])}>
            <PlusOutlined /> Add another product
          </button>
        </div>

        <label className="st-field" style={{ marginTop: 12 }}>
          <span>Note</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional — shows in the stock history" maxLength={255} />
        </label>
        {mode === "receive" && <p className="pc-hint">A cost you enter becomes that product's cost price, so stock value and margins stay right.</p>}
        {mode === "count" && <p className="pc-hint">Products you don't list aren't touched. Only differences are recorded.</p>}
      </div>
      <div className="pc-dlg-foot">
        {problems.length > 0 && ready.length > 0 && <span className="st-problem">{problems[0]}</span>}
        <span className="pc-foot-gap" />
        <button type="button" className="pc-btn ghost" onClick={() => onClose(false)} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="pc-btn primary" onClick={save} disabled={saving || problems.length > 0}>
          {saving ? <Spin size="small" /> : <CheckOutlined />}{" "}
          {mode === "receive" ? `Receive ${units || ""} ${units === 1 ? "unit" : "units"}`.replace("  ", " ") : mode === "move" ? `Move ${units || ""} ${units === 1 ? "unit" : "units"}`.replace("  ", " ") : changes ? `Save count (${changes} to correct)` : "Save count"}
        </button>
      </div>
    </Modal>
  );
};

export default StockDialog;
