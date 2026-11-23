import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Drawer, Form, Input, InputNumber, Pagination, Spin, message } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileAddOutlined,
  ImportOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { StatTile } from "@/modules/dashboard/components/Bits";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";
import { getCatalog } from "@/modules/products/catalog/productsApi";
import { type PoDetail, type PoRow, type PoSummary, type PurchaseSettings, apiError, getForQuotation, getLastBought, getPoSummary, getPos, getSettings, saveSettings } from "./api";
import { PO_STATUS, day, rs } from "./format";
import PoEditor, { type EditorPreset } from "./PoEditor";
import PoDrawer from "./PoDrawer";
import "./purchases.scss";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "PENDING_APPROVAL", label: "Waiting approval" },
  { key: "TO_SEND", label: "To send" },
  { key: "TO_RECEIVE", label: "To receive" },
  { key: "LATE", label: "Late" },
  { key: "RECEIVED", label: "Received" },
  { key: "CLOSED", label: "Closed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};

/** Approval limit, extra % when receiving, default terms (company editors). */
const SettingsDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [s, setS] = useState<PurchaseSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    getSettings()
      .then((r) => {
        setS(r);
        form.setFieldsValue(r);
      })
      .catch((e) => message.error(apiError(e, "Couldn't load the settings")));
  }, [open, form]);
  const save = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await saveSettings({ ...v, approval_limit: v.approval_limit === null || v.approval_limit === undefined || v.approval_limit === "" ? null : v.approval_limit });
      message.success("Purchase settings saved");
      onClose();
    } catch (e) {
      message.error(apiError(e, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Drawer open={open} onClose={onClose} size="min(520px, 100vw)" title="Purchase settings" rootClassName="pu-drawer" destroyOnHidden>
      {!s ? (
        <div className="pu-empty">
          <Spin />
        </div>
      ) : (
        <div className="pu-sec">
          <Form form={form} layout="vertical" disabled={!s.can_edit}>
            <Form.Item
              name="approval_limit"
              label="POs that need approval"
              extra="Empty = every PO from someone who can't approve waits for approval. With an amount, POs up to it are approved at once. People who can approve never wait."
            >
              <InputNumber min={0} precision={0} prefix="Over ₹" style={{ width: "100%" }} placeholder="Every PO" />
            </Form.Item>
            <Form.Item name="over_receipt_percent" label="Extra allowed when receiving" extra="0 = never more than ordered. E.g. 5 lets 105 arrive on an order of 100 (cable lengths, weights).">
              <InputNumber min={0} max={50} precision={2} suffix="%" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="default_payment_terms" label="Default payment terms" extra="Empty = taken from each supplier's credit days.">
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="default_delivery_terms" label="Default delivery terms">
              <Input maxLength={200} placeholder="e.g. Door delivery, freight paid" />
            </Form.Item>
            <Form.Item name="default_terms" label="Terms & conditions on every PO" extra="Empty = SameBook's standard Indian PO terms (shown as the placeholder).">
              <Input.TextArea autoSize={{ minRows: 5, maxRows: 12 }} maxLength={5000} placeholder={s.standard_terms} />
            </Form.Item>
          </Form>
          {s.can_edit ? (
            <Button type="primary" block loading={saving} onClick={save}>
              Save settings
            </Button>
          ) : (
            <p className="pu-muted">Only someone who can edit the company can change these.</p>
          )}
        </div>
      )}
    </Drawer>
  );
};

const OrdersPage: React.FC = () => {
  const { can } = useAccess();
  const [params, setParams] = useSearchParams();
  const [summary, setSummary] = useState<PoSummary | null>(null);
  const [rows, setRows] = useState<PoRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>(params.get("status") || "ALL");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; mode: "new" | "edit" | "amend"; po: PoDetail | null; preset: EditorPreset | null }>({ open: false, mode: "new", po: null, preset: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const openId = Number(params.get("open")) || null;
  const company = useMemo(companyName, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([getPoSummary(), getPos({ q, status: filter, page, limit: 25 })]);
      setSummary(s);
      setRows(list.rows);
      setTotal(list.total || 0);
    } catch (e) {
      message.error(apiError(e, "Couldn't load purchase orders"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, filter, page]);
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Deep links: ?new=1&supplier=ID, ?new=1&products=1,2 (from low stock), ?open=ID.
  useEffect(() => {
    if (params.get("new") !== "1" || !can("purchases.create")) return;
    const supplier = Number(params.get("supplier")) || undefined;
    const productIds = (params.get("products") || "").split(",").map(Number).filter((x) => x > 0);
    const quotationId = Number(params.get("quotation")) || null;
    params.delete("new");
    params.delete("supplier");
    params.delete("products");
    params.delete("quotation");
    setParams(params, { replace: true });
    (async () => {
      let preset: EditorPreset = { supplier_id: supplier };
      // "Order from supplier" on a customer quotation: what is short after stock and open POs.
      if (quotationId) {
        try {
          const plan = await getForQuotation(quotationId);
          const short = plan.lines.filter((l) => l.to_order > 0);
          if (plan.already.length) message.info(`Already ordered for ${plan.quotation.number}: ${plan.already.map((p) => p.po_number).join(", ")}`);
          if (!short.length) {
            message.success(`Nothing to order for ${plan.quotation.number} — your stock and open POs cover it`);
            return;
          }
          preset = {
            supplier_id: plan.supplier_id ?? undefined,
            quotation: plan.quotation,
            notes: `For customer order ${plan.quotation.number}${plan.quotation.customer_name ? ` (${plan.quotation.customer_name})` : ""}`,
            items: short.map((l) => ({ product_id: l.product_id, item_name: l.item_name, hsn_code: l.hsn_code, unit: l.unit, qty: l.to_order, rate: l.rate, discount_percent: l.discount_percent ?? 0, gst_rate: l.gst_rate })),
          };
        } catch (e) {
          message.error(apiError(e, "Couldn't read the quotation"));
          return;
        }
      }
      if (productIds.length) {
        try {
          const ids = productIds.slice(0, 30);
          type Last = Awaited<ReturnType<typeof getLastBought>>;
          const [found, last] = await Promise.all([
            Promise.all(ids.map((id) => getCatalog({ id, limit: 1 }).then((d) => d.products.find((p) => p.id === id) || null).catch(() => null))),
            getLastBought(ids).catch((): Last => []),
          ]);
          const byId = new Map(found.filter(Boolean).map((p) => [p!.id, p!]));
          const lastOf = new Map(last.map((l) => [l.product_id, l]));
          const items = productIds
            .map((id) => {
              const p = byId.get(id);
              if (!p) return null;
              const l = lastOf.get(id);
              const want = Math.max(1, (p.min_stock || 0) * 2 - (p.stock || 0));
              return { product_id: id, item_name: p.name, hsn_code: p.hsn, unit: p.unit, qty: want, rate: l?.rate ?? (p.cost || null), discount_percent: l?.discount_percent ?? 0, gst_rate: l?.gst_rate ?? (p.gst > 0 ? p.gst : 18) };
            })
            .filter(Boolean) as any[];
          const suppliers = [...new Set(last.map((l) => l.supplier_id))];
          preset = { supplier_id: supplier || (suppliers.length === 1 ? suppliers[0] : undefined), items };
        } catch {
          /* open empty */
        }
      }
      setEditor({ open: true, mode: "new", po: null, preset });
    })();
  }, [params, setParams, can]);

  const open = (id: number | null) => {
    if (id) params.set("open", String(id));
    else params.delete("open");
    setParams(params, { replace: true });
  };
  const pickFilter = (key: string) => {
    setFilter(key);
    setPage(1);
  };

  const tiles = summary
    ? [
        { key: "PENDING_APPROVAL", label: "Waiting for approval", value: summary.pending, icon: <ClockCircleOutlined />, tint: "var(--db-s4)", sub: summary.can.approve ? "approve them" : "with your approvers" },
        { key: "TO_SEND", label: "Approved — to send", value: summary.to_send, icon: <SendOutlined />, tint: "var(--db-s7)", sub: "PDF to the supplier" },
        { key: "TO_RECEIVE", label: "Goods to receive", value: summary.to_receive, icon: <ImportOutlined />, tint: "var(--db-s1)", sub: "open orders" },
        { key: "LATE", label: "Late", value: summary.late, icon: <WarningOutlined />, tint: "var(--db-critical)", sub: "past the expected date" },
      ]
    : [];

  return (
    <div className={`db-root pu-root${loading ? " refreshing" : ""}`}>
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Purchases
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <ShoppingCartOutlined />
              </span>
              Purchase orders
            </div>
            <div className="db-hero-sub">Order from suppliers in Indian GST format, get approval, send the PDF, and receive goods straight into stock.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">On order (still to come)</span>
              <span className="db-hero-number">{summary?.open_value === null ? `${summary?.to_receive ?? 0} POs` : rs(summary?.open_value ?? 0)}</span>
              <span className="db-hero-figure-foot">
                <span>
                  {summary ? `${summary.to_receive} open · ${summary.total} in all` : "…"}
                  {summary?.ordered_this_month ? ` · ${rs(summary.ordered_this_month)} ordered this month` : ""}
                </span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{summary?.draft ?? 0}</b>
                <span>Drafts</span>
              </div>
              <div className="db-hero-stat">
                <b>{summary?.pending ?? 0}</b>
                <span>Approval</span>
              </div>
              <div className="db-hero-stat">
                <b>{summary?.late ?? 0}</b>
                <span>Late</span>
              </div>
            </div>
            <div className="db-hero-btns">
              {can("companies.edit") && (
                <button type="button" className="db-btn glass" onClick={() => setSettingsOpen(true)}>
                  <SettingOutlined /> Settings
                </button>
              )}
              {can("purchases.create") && (
                <button type="button" className="db-btn white" onClick={() => setEditor({ open: true, mode: "new", po: null, preset: null })}>
                  <FileAddOutlined /> New PO
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {summary && (
        <div className="db-tiles">
          {tiles.map((t, i) => (
            <StatTile key={t.key} index={i} icon={t.icon} label={t.label} value={String(t.value)} tint={t.tint} sub={t.sub} onClick={() => pickFilter(t.key)} />
          ))}
        </div>
      )}

      <div className={`db-filter${loading ? " loading" : ""}`}>
        <div className="pu-tabs" role="tablist" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={filter === f.key ? "on" : ""} onClick={() => pickFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="db-filter-right">
          <Input className="pu-search" allowClear prefix={<SearchOutlined />} placeholder="PO number, supplier or ref." value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          <Button icon={<ReloadOutlined />} onClick={load} aria-label="Refresh" />
        </div>
        <div className="db-filter-progress" />
      </div>

      <div className="pu-list" role="list">
        {rows === null ? (
          <div className="pu-empty">
            <Spin />
          </div>
        ) : !rows.length ? (
          <div className="pu-empty">
            <b>{q || filter !== "ALL" ? "Nothing here" : "No purchase orders yet"}</b>
            {!q && filter === "ALL" && (can("purchases.create") ? "Make your first PO — pick a supplier, add items, and the GST works itself out." : "Purchase orders made by your team show here.")}
          </div>
        ) : (
          rows.map((r) => {
            const st = PO_STATUS[r.status];
            return (
              <div key={r.id} className="pu-row" role="listitem" tabIndex={0} onClick={() => open(r.id)} onKeyDown={(e) => e.key === "Enter" && open(r.id)}>
                <div className="pu-row-main">
                  <div className="pu-row-title">
                    {r.po_number}
                    {r.revision > 0 && <span className="pu-chip violet">Amd {r.revision}</span>}
                  </div>
                  <div className="pu-row-sub">
                    {r.supplier_name} · {r.items} item{r.items === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="pu-row-sub pu-hide-sm">
                  {day(r.po_date)}
                  {r.expected_date ? ` → ${day(r.expected_date)}` : ""}
                  {r.late && (
                    <span className="pu-chip bad" style={{ marginLeft: 6 }}>
                      Late
                    </span>
                  )}
                </div>
                <div className="pu-hide-sm">
                  <span className={`pu-chip ${st.tone}`}>{st.label}</span>
                  {["SENT", "PARTLY_RECEIVED", "RECEIVED", "CLOSED"].includes(r.status) && (
                    <div className={`pu-progress${r.received_pct >= 100 ? " done" : ""}`} style={{ marginTop: 6 }} title={`${r.received_pct}% arrived`}>
                      <span style={{ width: `${r.received_pct}%` }} />
                    </div>
                  )}
                </div>
                <div className="pu-num">
                  {r.grand_total === null ? "—" : rs(r.grand_total)}
                  <small className="pu-show-sm">{st.label}</small>
                </div>
                <span className="pu-hide-sm" aria-hidden>
                  {r.status === "RECEIVED" ? <CheckCircleOutlined style={{ color: "var(--pu-good)" }} /> : "›"}
                </span>
              </div>
            );
          })
        )}
      </div>
      {total > 25 && (
        <div className="pu-pager">
          <Pagination current={page} total={total} pageSize={25} onChange={setPage} showSizeChanger={false} />
        </div>
      )}

      <PoEditor
        open={editor.open}
        mode={editor.mode}
        po={editor.po}
        preset={editor.preset}
        onClose={(saved) => {
          setEditor({ open: false, mode: "new", po: null, preset: null });
          if (saved) {
            load();
            setReloadKey((k) => k + 1);
            open(saved.id);
          }
        }}
      />
      <PoDrawer id={openId} reloadKey={reloadKey} onClose={() => open(null)} onChanged={load} onEdit={(po, mode) => setEditor({ open: true, mode, po, preset: null })} />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default OrdersPage;
