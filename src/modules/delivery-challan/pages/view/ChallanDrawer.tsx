import React from "react";
import dayjs, { type Dayjs } from "dayjs";
import { Drawer, Dropdown, Popconfirm, Spin, Tabs } from "antd";
import type { MenuProps } from "antd";
import { ago } from "@/modules/dashboard/utils/format";
import {
  CarOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  DownloadOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleFilled,
  FileDoneOutlined,
  FileSyncOutlined,
  FileTextOutlined,
  HistoryOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  PlusCircleOutlined,
  SendOutlined,
  ShopOutlined,
  StopOutlined,
  SwapOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { addressLines, companyAddressLines, companyGstin, warehouseAddressLines } from "../../constants";
import { dispatchHint } from "./ChallanList";
import {
  Avatar,
  StagePill,
  count,
  daysSince,
  dateTime,
  formatQty,
  isToInvoice,
  isTransfer,
  needsEway,
  parseJsonField,
  personName,
  qtyWithUnit,
  reasonText,
  relDays,
  routeOf,
  rupees,
  shortDate,
  stageOf,
} from "./shared";

export interface DrawerActions {
  canDispatch: boolean;
  canDeliver: boolean;
  canInvoice: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onDispatch: () => void;
  onDeliver: () => void;
  onInvoice: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDownload: (valued?: boolean) => void;
  onCopyNumber: () => void;
  onOpenQuotation?: () => void;
  onOpenInvoice?: () => void;
  busy: boolean;
  downloading: boolean;
}

const KV: React.FC<{ rows: [React.ReactNode, React.ReactNode][] }> = ({ rows }) => (
  <dl className="qd-kv">
    {rows
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v], i) => (
        <React.Fragment key={i}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </React.Fragment>
      ))}
  </dl>
);

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  CREATED: { label: "Challan made", icon: <PlusCircleOutlined />, tone: "var(--qp-accent)" },
  UPDATED: { label: "Draft edited", icon: <EditOutlined />, tone: "var(--qp-draft)" },
  DISPATCHED: { label: "Dispatched", icon: <SendOutlined />, tone: "var(--dc-transit)" },
  DELIVERED: { label: "Delivered", icon: <CheckCircleFilled />, tone: "var(--dc-delivered)" },
  INVOICED: { label: "Invoiced", icon: <FileDoneOutlined />, tone: "var(--dc-invoiced)" },
  CANCELLED: { label: "Cancelled", icon: <StopOutlined />, tone: "var(--qp-bad)" },
  DELETED: { label: "Deleted", icon: <DeleteOutlined />, tone: "var(--qp-bad)" },
};
const actionMeta = (type?: string) =>
  ACTION_META[String(type || "").toUpperCase()] || {
    label: String(type || "Updated").replace(/_/g, " ").toLowerCase().replace(/^\w/, (ch) => ch.toUpperCase()),
    icon: <HistoryOutlined />,
    tone: "var(--qp-draft)",
  };

/** Plain words for what an edit changed (field names from the activity log). */
const FIELD_LABEL: Record<string, string> = {
  challan_date: "date",
  reason: "reason",
  customer_id: "customer",
  billing_address_snapshot: "billing address",
  shipping_address_snapshot: "shipping address",
  place_of_supply: "place of supply",
  from_warehouse_id: "warehouse",
  to_warehouse_id: "destination",
  transporter_name: "transporter",
  vehicle_number: "vehicle",
  eway_bill_number: "e-way bill",
  notes: "notes",
  affects_stock: "stock setting",
  total_quantity: "quantity",
  total_value: "value",
  items_replaced: "items",
};

const Timeline: React.FC<{ items: any[] }> = ({ items }) =>
  items.length ? (
    <ul className="qd-timeline">
      {items.map((it, i) => {
        const meta = actionMeta(it.action);
        const v = parseJsonField(it.new_value) || {};
        const who = personName(it.changed_by_user);
        const changed =
          it.action === "UPDATED"
            ? [...new Set(Object.keys(v).map((k) => FIELD_LABEL[k]).filter(Boolean))]
            : [];
        return (
          <li key={it.id ?? i} style={{ ["--tone" as any]: meta.tone, ["--i" as any]: i }}>
            <span className="qd-tl-icon">{meta.icon}</span>
            <div className="qd-tl-body">
              <b>{meta.label}</b>
              {it.action === "CREATED" && v.items !== undefined && (
                <span className="qd-tl-reason">
                  {count(v.items)} item{Number(v.items) === 1 ? "" : "s"} · {rupees(v.total_value)}
                </span>
              )}
              {it.action === "DISPATCHED" && (
                <span className="qd-tl-reason">{v.stock_moved ? "Stock moved out of the warehouse" : "No stock moved"}</span>
              )}
              {it.action === "INVOICED" && v.invoice_number && (
                <span className="qd-tl-reason">
                  {v.invoice_generated ? "New invoice" : "Linked to"} {v.invoice_number}
                </span>
              )}
              {it.action === "CANCELLED" && (v.reason || v.stock_reversed) && (
                <span className="qd-tl-reason">
                  {[v.reason, v.stock_reversed ? "stock returned" : null].filter(Boolean).join(" · ")}
                </span>
              )}
              {changed.length > 0 && <span className="qd-tl-reason">Changed {changed.join(", ")}</span>}
              <small>
                {who ? `${who} · ` : ""}
                {it.created_at ? `${ago(it.created_at)} · ${dateTime(it.created_at)}` : ""}
              </small>
            </div>
          </li>
        );
      })}
    </ul>
  ) : (
    <div className="qp-empty" style={{ padding: "40px 10px" }}>
      <span className="qp-empty-art">
        <HistoryOutlined />
      </span>
      <b>No activity yet</b>
    </div>
  );

/** What GST expects for goods that went out on approval or for job work. */
const complianceNote = (c: any): React.ReactNode => {
  if (!c?.dispatched_at || !["DISPATCHED", "DELIVERED"].includes(c.status)) return null;
  const sent = dayjs(c.dispatched_at);
  if (c.reason === "SUPPLY_ON_APPROVAL") {
    return (
      <>
        <InfoCircleOutlined /> Sent on approval: if the customer keeps the goods, GST needs an invoice within six months of dispatch — by{" "}
        <b>{sent.add(6, "month").format("D MMM YYYY")}</b>.
      </>
    );
  }
  if (c.reason === "JOB_WORK") {
    return (
      <>
        <InfoCircleOutlined /> Sent for job work: inputs are expected back within a year (capital goods three years) — by{" "}
        <b>{sent.add(1, "year").format("D MMM YYYY")}</b> for inputs.
      </>
    );
  }
  return null;
};

const ChallanDrawer: React.FC<{
  open: boolean;
  c: any;
  /** Showing the list row or the browser-cached copy while fresh details load. */
  fromCache: boolean;
  company: any;
  /** Destination warehouse address for a stock transfer, when known. */
  toWarehouse?: any;
  actions: DrawerActions;
  onClose: () => void;
  isMobile: boolean;
  today: Dayjs;
}> = ({ open, c, fromCache, company, toWarehouse, actions: a, onClose, isMobile, today }) => {
  const items: any[] = Array.isArray(c?.items) ? c.items : [];
  const activity: any[] = Array.isArray(c?.activity) ? c.activity : [];
  const stage = stageOf(c);
  const transfer = isTransfer(c);
  const billing = parseJsonField(c?.billing_address_snapshot);
  const shipping = parseJsonField(c?.shipping_address_snapshot);
  const gstin = companyGstin(company);
  const stockTracked = Number(c?.affects_stock ?? 1) === 1;
  const ready = isToInvoice(c);
  const invoicedAt = activity.find((x) => x.action === "INVOICED")?.created_at;
  const cancelLog = activity.find((x) => x.action === "CANCELLED");
  const cancelReason = parseJsonField(cancelLog?.new_value)?.reason;
  const itemsCount = items.length || Number(c?.items_count || 0);
  const onRoadDays = stage === "transit" ? daysSince(c?.dispatched_at, today) : null;

  // Track: made → sent → delivered (→ invoiced for challans made from a
  // quotation). A cancelled challan shows how far it got, then where it stopped.
  const allSteps = [
    { key: "made", label: "Made", at: c?.created_at },
    { key: "sent", label: "Sent", at: c?.dispatched_at },
    { key: "delivered", label: "Delivered", at: c?.delivered_at },
    ...(c?.quotation_id ? [{ key: "invoiced", label: "Invoiced", at: invoicedAt }] : []),
  ];
  const reached =
    stage === "invoiced"
      ? allSteps.length - 1
      : stage === "delivered"
        ? 2
        : stage === "transit"
          ? 1
          : stage === "cancelled"
            ? c?.delivered_at
              ? 2
              : c?.dispatched_at
                ? 1
                : 0
            : 0;
  const steps = stage === "cancelled" ? [...allSteps.slice(0, reached + 1), { key: "cancelled", label: "Cancelled", at: c?.cancelled_at }] : allSteps;
  // Nothing left to happen: an invoiced challan, or a delivered one that is never invoiced.
  const finished = stage === "invoiced" || (stage === "delivered" && !c?.quotation_id);
  const stepClass = (key: string, i: number) =>
    stage === "cancelled"
      ? key === "cancelled"
        ? "stop"
        : "done"
      : i < reached || (i === reached && finished)
        ? "done"
        : i === reached
          ? "current"
          : "";

  const pdfMenu: MenuProps["items"] = [
    { key: "plain", icon: <DownloadOutlined />, label: "Delivery copy (no rates)", onClick: () => a.onDownload(false) },
    { key: "valued", icon: <DownloadOutlined />, label: "Valued copy (with rates)", onClick: () => a.onDownload(true) },
  ];
  const moreMenu: MenuProps["items"] = [{ key: "copy", icon: <CopyOutlined />, label: "Copy challan number", onClick: a.onCopyNumber }];
  if (a.onOpenQuotation) moreMenu.push({ key: "qt", icon: <FileTextOutlined />, label: `Open quotation ${c?.quotation_number || ""}`.trim(), onClick: a.onOpenQuotation });
  if (a.onOpenInvoice) moreMenu.push({ key: "inv", icon: <FileDoneOutlined />, label: `Open invoice ${c?.invoice_number || ""}`.trim(), onClick: a.onOpenInvoice });
  const risky: MenuProps["items"] = [];
  if (a.canCancel) risky.push({ key: "cancel", icon: <StopOutlined />, label: "Cancel challan", danger: true, onClick: a.onCancel });
  if (a.canDelete) risky.push({ key: "delete", icon: <DeleteOutlined />, label: "Delete draft", danger: true, onClick: a.onDelete });
  if (risky.length) moreMenu.push({ type: "divider" }, ...risky);

  // The one main next step gets the white button; everything else is glass.
  const primary = a.canDispatch ? "dispatch" : a.canDeliver ? "deliver" : a.canInvoice ? "invoice" : null;
  const btn = (key: string) => `qp-btn ${primary === key ? "white" : "glass"}`;

  const note: React.ReactNode =
    stage === "cancelled" ? (
      <>
        <StopOutlined /> Cancelled{c?.cancelled_at ? ` on ${shortDate(c.cancelled_at)}` : ""}
        {cancelReason ? ` — “${cancelReason}”` : ""}.{c?.dispatched_at && stockTracked && c?.from_warehouse_id ? " Stock taken out on dispatch went back." : ""}
      </>
    ) : stage === "draft" && needsEway(c) ? (
      <>
        <ExclamationCircleFilled /> No e-way bill number yet — goods worth ₹50,000 or more usually need one before they move.
      </>
    ) : stage === "transit" && onRoadDays !== null && onRoadDays >= 1 ? (
      <>
        <CarOutlined /> On the road for {relDays(onRoadDays)}. Mark it delivered once {transfer ? "the destination warehouse" : c?.customer_name || "the customer"} has the goods.
      </>
    ) : ready ? (
      <>
        <FileSyncOutlined />{" "}
        {c?.quotation_invoice_number
          ? `Quotation ${c.quotation_number || ""} already has invoice ${c.quotation_invoice_number} — this challan gets linked to it.`
          : `Ready to invoice: the invoice is made from quotation ${c?.quotation_number || ""}.`}
      </>
    ) : stage === "invoiced" ? (
      <>
        <CheckCircleFilled /> Invoiced{invoicedAt ? ` on ${shortDate(invoicedAt)}` : ""}
        {c?.invoice_number ? ` with ${c.invoice_number}` : ""}.
      </>
    ) : (
      complianceNote(c)
    );
  const extraNote = stage !== "cancelled" && ready ? complianceNote(c) : null;

  const overview = c && (
    <>
      <div className="qd-grid-2" style={{ marginTop: 0 }}>
        <div className="qd-card">
          <h4>{transfer ? <HomeOutlined /> : <UserOutlined />} {transfer ? "Destination" : "Consignee"}</h4>
          {transfer ? (
            <>
              <div className="dc-party">{c.to_warehouse_name || "—"}</div>
              <div className="qd-addr">{warehouseAddressLines(toWarehouse).join(", ") || <span className="qd-muted">Your own warehouse</span>}</div>
            </>
          ) : (
            <>
              <div className="dc-party">{c.customer_name || "—"}</div>
              <KV
                rows={[
                  ["GSTIN", c.customer_gst_number || billing?.gst_number ? <span className="qd-mono">{c.customer_gst_number || billing?.gst_number}</span> : <span className="qd-muted">Not registered</span>],
                  ["Bill to", addressLines(billing).join(", ") || (fromCache ? "Loading…" : null)],
                  ["Ship to", addressLines(shipping).join(", ") || null],
                ]}
              />
            </>
          )}
        </div>
        <div className="qd-card">
          <h4>
            <ShopOutlined /> Consignor (you)
          </h4>
          <div className="dc-party">{company?.name || company?.company_name || "—"}</div>
          <div className="qd-addr">{companyAddressLines(company).join(", ")}</div>
          {gstin ? (
            <div className="qd-muted" style={{ marginTop: 4 }}>
              GSTIN <span className="qd-mono">{gstin}</span>
            </div>
          ) : company ? (
            <div className="dc-warn-line">
              <ExclamationCircleFilled /> Your GSTIN isn't on the company profile — a delivery challan should carry it.
            </div>
          ) : null}
        </div>
      </div>
      <div className="qd-card">
        <h4>
          <CarOutlined /> Transport
        </h4>
        <KV
          rows={[
            ["Transporter", c.transporter_name || <span className="qd-muted">—</span>],
            ["Vehicle", c.vehicle_number ? <span className="qd-mono">{c.vehicle_number}</span> : <span className="qd-muted">—</span>],
            [
              "E-way bill",
              c.eway_bill_number ? (
                <span className="qd-mono">{c.eway_bill_number}</span>
              ) : needsEway(c) ? (
                <span className="dc-warn-text">
                  <ExclamationCircleFilled /> Not added — usually needed for goods worth ₹50,000 or more
                </span>
              ) : (
                <span className="qd-muted">—</span>
              ),
            ],
            ["Place of supply", c.place_of_supply || <span className="qd-muted">—</span>],
            ["From", c.from_warehouse_name || <span className="qd-muted">No warehouse</span>],
            ...(transfer ? ([["To", c.to_warehouse_name || "—"]] as [React.ReactNode, React.ReactNode][]) : []),
            ["Stock", stockTracked && c.from_warehouse_id ? (transfer ? "Moves between the two warehouses on dispatch" : "Comes out of the warehouse on dispatch") : "Not changed by this challan"],
          ]}
        />
      </div>
      {c.notes && (
        <div className="qd-card">
          <h4>
            <FileTextOutlined /> Notes
          </h4>
          <div className="qd-notes">{c.notes}</div>
        </div>
      )}
      <div className="qd-card">
        <h4>
          <HistoryOutlined /> Record
        </h4>
        <KV
          rows={[
            ["Made", `${dateTime(c.created_at)}${personName(c.created_by_user) ? ` by ${personName(c.created_by_user)}` : ""}`],
            ["Sent", c.dispatched_at ? `${dateTime(c.dispatched_at)} (${ago(c.dispatched_at)})` : <span className="qd-muted">Not yet</span>],
            ["Delivered", c.delivered_at ? `${dateTime(c.delivered_at)} (${ago(c.delivered_at)})` : <span className="qd-muted">{stage === "invoiced" ? "Not confirmed" : "Not yet"}</span>],
            ...(c.cancelled_at ? ([["Cancelled", dateTime(c.cancelled_at)]] as [React.ReactNode, React.ReactNode][]) : []),
            ["Quotation", c.quotation_number || <span className="qd-muted">None — {transfer ? "a stock transfer" : "made without one"}</span>],
          ]}
        />
      </div>
    </>
  );

  const itemsTab = c && (
    <>
      <div className="qd-card">
        <h4>
          <FileTextOutlined /> {count(itemsCount)} item{itemsCount === 1 ? "" : "s"}
        </h4>
        {items.length ? (
          <ul className="qd-items">
            {items.map((it, i) => (
              <li key={it.id ?? i}>
                <span className="qd-item-no">{i + 1}</span>
                <div className="qd-item-main">
                  <b>{it.item_name || "Item"}</b>
                  {it.description && it.description !== it.item_name && <span className="dc-item-desc">{it.description}</span>}
                  <small>
                    {formatQty(it.quantity)} {it.unit || ""} × {rupees(it.rate)}
                    {it.hsn_code ? ` · HSN ${it.hsn_code}` : ""}
                    {it.product_id ? " · from the catalogue" : ""}
                  </small>
                </div>
                <div className="qd-item-amt">
                  <b>{rupees(it.value ?? Number(it.quantity || 0) * Number(it.rate || 0))}</b>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="qd-muted">{fromCache ? "Loading items…" : "No items on this challan"}</div>
        )}
      </div>
      <div className="qd-card qd-totals">
        <div>
          <span>Total quantity</span>
          <b>{qtyWithUnit(c.total_quantity, items)}</b>
        </div>
        <div className="grand">
          <span>Goods value</span>
          <b>{rupees(c.total_value)}</b>
        </div>
        <div className="dc-foot-note">
          <InfoCircleOutlined /> Not a tax invoice: values are for reference, and no GST is charged on a delivery challan.
        </div>
      </div>
    </>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={isMobile ? "100vw" : "min(760px, 100vw)"}
      closable={false}
      title={null}
      rootClassName="qp-portal ip-portal dc-portal"
      destroyOnHidden
    >
      {c ? (
        <div className="qd-root">
          <header className={`qd-hero dc-dhero ${stage}`}>
            <div className="qd-top">
              <div className="qd-id">
                <div className="qd-eyebrow">
                  <StagePill c={c} />
                  <span>Delivery challan</span>
                  <span>{reasonText(c.reason)}</span>
                  {fromCache && (
                    <span>
                      <Spin size="small" /> Refreshing…
                    </span>
                  )}
                </div>
                <h2 className="qd-number">{c.challan_number}</h2>
                <div className="qd-cust">
                  {transfer ? (
                    <>
                      <span className="dc-wh-avatar onhero" aria-hidden>
                        <SwapOutlined />
                      </span>
                      <span>
                        <b>{routeOf(c)}</b> · stock transfer
                      </span>
                    </>
                  ) : (
                    <>
                      <Avatar name={c.customer_name} seed={c.customer_id || c.customer_name} size={30} />
                      <span>
                        <b>{c.customer_name || "—"}</b>
                        {c.place_of_supply ? ` · ${c.place_of_supply}` : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button type="button" className="qd-icon-btn" onClick={onClose} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <div className="qd-figures">
              <div className="qd-total">
                <span>Goods value</span>
                <b>{rupees(c.total_value)}</b>
                <small>
                  {count(itemsCount)} item{itemsCount === 1 ? "" : "s"} · qty {qtyWithUnit(c.total_quantity, items)} · no GST
                </small>
              </div>
              <div className="qd-facts">
                <div>
                  <span>Challan date</span>
                  <b>{shortDate(c.challan_date)}</b>
                </div>
                <div>
                  <span>{transfer ? "From" : "Dispatch from"}</span>
                  <b>{c.from_warehouse_name || "—"}</b>
                </div>
                <div>
                  <span>Quotation</span>
                  <b>
                    {c.quotation_number && a.onOpenQuotation ? (
                      <button type="button" className="ip-link-white" onClick={a.onOpenQuotation} title={`Open ${c.quotation_number}`}>
                        {c.quotation_number}
                      </button>
                    ) : (
                      c.quotation_number || "—"
                    )}
                  </b>
                </div>
                <div>
                  <span>Invoice</span>
                  <b>
                    {c.invoice_number && a.onOpenInvoice ? (
                      <button type="button" className="ip-link-white" onClick={a.onOpenInvoice} title={`Open ${c.invoice_number}`}>
                        {c.invoice_number}
                      </button>
                    ) : (
                      c.invoice_number || (ready ? "Not yet" : "—")
                    )}
                  </b>
                </div>
              </div>
            </div>

            <div className="qd-track dc-track" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Journey">
              {steps.map((st, i) => {
                const cls = stepClass(st.key, i);
                return (
                  <div key={st.key} className={`qd-step ${cls}`}>
                    <i>{cls === "stop" ? <CloseCircleOutlined /> : cls === "done" ? <CheckOutlined /> : i + 1}</i>
                    {st.label}
                    <small>{(cls === "done" || cls === "current" || cls === "stop") && st.at ? dayjs(st.at).format("D MMM") : " "}</small>
                  </div>
                );
              })}
            </div>

            <div className="qd-actions">
              {a.canDispatch && (
                <Popconfirm title={`Dispatch ${c.challan_number}?`} description={dispatchHint(c)} okText="Dispatch" onConfirm={a.onDispatch} disabled={a.busy || fromCache}>
                  <button type="button" className={btn("dispatch")} disabled={a.busy || fromCache} title={fromCache ? "Refreshing…" : undefined}>
                    {a.busy ? <Spin size="small" /> : <SendOutlined />} Dispatch
                  </button>
                </Popconfirm>
              )}
              {a.canDeliver && (
                <Popconfirm
                  title={`Mark ${c.challan_number} as delivered?`}
                  description={`Confirms the goods reached ${transfer ? c.to_warehouse_name || "the destination warehouse" : c.customer_name || "the customer"}.`}
                  okText="Mark delivered"
                  onConfirm={a.onDeliver}
                  disabled={a.busy || fromCache}
                >
                  <button type="button" className={btn("deliver")} disabled={a.busy || fromCache}>
                    {a.busy ? <Spin size="small" /> : <CheckOutlined />} Mark delivered
                  </button>
                </Popconfirm>
              )}
              {a.canInvoice && (
                <button type="button" className={btn("invoice")} onClick={a.onInvoice} disabled={a.busy || fromCache}>
                  <FileDoneOutlined /> {c.quotation_invoice_number ? "Link invoice" : "Make invoice"}
                </button>
              )}
              <Dropdown menu={{ items: pdfMenu }} trigger={["click"]} disabled={a.downloading}>
                <button type="button" className={`qp-btn ${primary ? "glass" : "white"}`} disabled={a.downloading}>
                  {a.downloading ? <Spin size="small" /> : <DownloadOutlined />} PDF <DownOutlined style={{ fontSize: 10 }} />
                </button>
              </Dropdown>
              {a.canEdit && (
                <button type="button" className="qp-btn glass" onClick={a.onEdit} disabled={fromCache}>
                  <EditOutlined /> Edit
                </button>
              )}
              <Dropdown menu={{ items: moreMenu }} trigger={["click"]} placement="bottomRight">
                <button type="button" className="qp-btn glass dc-more" aria-label="More actions">
                  <MoreOutlined />
                </button>
              </Dropdown>
            </div>
            <div className="qd-note">{note}</div>
            {extraNote && <div className="qd-note">{extraNote}</div>}
          </header>

          <Tabs
            className="qd-tabs"
            defaultActiveKey="overview"
            items={[
              { key: "overview", label: "Overview", children: overview },
              { key: "items", label: `Items${itemsCount ? ` · ${count(itemsCount)}` : ""}`, children: itemsTab },
              {
                key: "activity",
                label: `Activity${activity.length ? ` · ${count(activity.length)}` : ""}`,
                children: fromCache && !activity.length ? <div className="qd-muted">Loading activity…</div> : <Timeline items={activity} />,
              },
            ]}
          />
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
          <Spin />
        </div>
      )}
    </Drawer>
  );
};

export default ChallanDrawer;
