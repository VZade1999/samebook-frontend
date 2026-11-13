import React from "react";
import type { Dayjs } from "dayjs";
import { Drawer, Popconfirm, Spin, Tabs } from "antd";
import { ago } from "@/modules/dashboard/utils/format";
import {
  BankOutlined,
  CarOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusCircleOutlined,
  SendOutlined,
  ShopOutlined,
  StopOutlined,
  UndoOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  STAGE_META,
  type Stage,
  StagePill,
  ValidityChip,
  closeReasonLabel,
  count,
  dateTime,
  isClosed,
  joinAddr,
  parseJsonField,
  personName,
  rupees,
  shortDate,
  stageOf,
} from "./shared";

export interface DrawerActions {
  canSend: boolean;
  canApprove: boolean;
  canChallan: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canClose: boolean;
  canReopen: boolean;
  canExport: boolean;
  onSend: () => void;
  onApprove: () => void;
  onChallan: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onReopen: () => void;
  acting: boolean;
  reopening: boolean;
  downloading: boolean;
}

const TRACK: { key: Stage; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "approved", label: "Approved" },
  { key: "invoiced", label: "Invoiced" },
];

/**
 * Draft → Sent → Approved → Invoiced, or where it stopped (rejected /
 * expired): right after the step it was closed from, when the close recorded
 * it, else after "Sent".
 */
const Tracker: React.FC<{ q: any; closedFrom?: string | null }> = ({ q, closedFrom }) => {
  const stage = stageOf(q);
  const stopped = stage === "rejected" || stage === "expired";
  const from = closedFrom === undefined || closedFrom === null ? 1 : closedFrom === "APPROVED" ? 2 : closedFrom === "SENT" ? 1 : 0;
  const stopAt = from + 1;
  const reached = stopped ? from : TRACK.findIndex((t) => t.key === stage);
  return (
    <div className="qd-track" role="list" aria-label="Progress">
      {TRACK.map((t, i) => {
        const isStop = stopped && i === stopAt;
        const cls = isStop ? "stop" : i < reached ? "done" : i === reached ? (stopped ? "done" : "current") : "";
        return (
          <div key={t.key} className={`qd-step ${cls}`} role="listitem" aria-current={!stopped && i === reached ? "step" : undefined}>
            <i>{isStop ? <StopOutlined /> : i < reached || (stopped && i === reached) || (stage === "invoiced" && i === 3) ? <CheckOutlined /> : i + 1}</i>
            {isStop ? STAGE_META[stage].label : t.label}
          </div>
        );
      })}
    </div>
  );
};

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
  CREATED: { label: "Created", icon: <PlusCircleOutlined />, tone: "var(--qp-accent)" },
  QUOTATION_CREATED: { label: "Created", icon: <PlusCircleOutlined />, tone: "var(--qp-accent)" },
  UPDATED: { label: "Edited", icon: <EditOutlined />, tone: "var(--qp-draft)" },
  SENT: { label: "Sent to the customer", icon: <SendOutlined />, tone: "var(--qp-sent)" },
  APPROVED: { label: "Approved", icon: <CheckOutlined />, tone: "var(--qp-approved)" },
  REJECTED: { label: "Closed · rejected by the customer", icon: <StopOutlined />, tone: "var(--qp-rejected)" },
  EXPIRED: { label: "Closed · expired", icon: <StopOutlined />, tone: "var(--qp-expired)" },
  REOPENED: { label: "Reopened", icon: <UndoOutlined />, tone: "var(--qp-accent)" },
  DELETED: { label: "Deleted", icon: <DeleteOutlined />, tone: "var(--qp-rejected)" },
  INVOICED: { label: "Invoice made", icon: <FileDoneOutlined />, tone: "var(--qp-invoiced)" },
};
const actionMeta = (type?: string) =>
  ACTION_META[String(type || "").toUpperCase()] || { label: String(type || "Updated").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), icon: <HistoryOutlined />, tone: "var(--qp-draft)" };

const Timeline: React.FC<{ items: any[]; versions?: boolean }> = ({ items, versions }) =>
  items.length ? (
    <ul className="qd-timeline">
      {items.map((it, i) => {
        const meta = actionMeta(it.action_type || it.type);
        const who = it.changed_by_user ? personName(it.changed_by_user) : it.changed_by ? `User ${it.changed_by}` : "";
        return (
          <li key={it.id ?? i} style={{ ["--tone" as any]: meta.tone, ["--i" as any]: i }}>
            <span className="qd-tl-icon">{meta.icon}</span>
            <div className="qd-tl-body">
              <b>
                {versions ? `Version ${it.version_number ?? i + 1} · ` : ""}
                {meta.label}
              </b>
              {it.detail?.reason_label && <span className="qd-tl-reason">{it.detail.reason_label}</span>}
              {it.detail?.remark && <span className="qd-tl-remark">{it.detail.remark}</span>}
              {versions && it.change_reason && <small>{it.change_reason} · </small>}
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
      <b>{versions ? "No earlier versions" : "No activity yet"}</b>
    </div>
  );

const QuotationDrawer: React.FC<{
  open: boolean;
  q: any;
  fromCache: boolean;
  history: any[];
  timeline: any[];
  actions: DrawerActions;
  onClose: () => void;
  isMobile: boolean;
  today: Dayjs;
}> = ({ open, q, fromCache, history, timeline, actions: a, onClose, isMobile, today }) => {
  const billing = parseJsonField(q?.billing_address_snapshot) || {};
  const shipping = parseJsonField(q?.shipping_address_snapshot) || {};
  const business = parseJsonField(q?.business_details_snapshot) || {};
  const payment = parseJsonField(q?.payment_details_snapshot) || {};
  const items: any[] = q?.items || [];
  const tax = Number(q?.cgst_amount || 0) + Number(q?.sgst_amount || 0) + Number(q?.igst_amount || 0);
  const createdBy = personName(q?.created_by_user);
  const busy = a.acting || fromCache;

  const closed = !!q && isClosed(q);
  const closeEvent = timeline.find((e) => e.action_type === q?.status);
  const closedBy = closeEvent?.changed_by_user ? personName(closeEvent.changed_by_user) : "";

  const overview = q && (
    <>
      {closed && (
        <div className={`qd-card qd-closed ${String(q.status).toLowerCase()}`}>
          <h4>
            <StopOutlined /> Closed · {q.status === "REJECTED" ? "rejected by the customer" : "expired"}
          </h4>
          <div className="qd-closed-reason">{closeReasonLabel(q.status, q.close_reason) || "No reason recorded"}</div>
          {q.close_remark ? <div className="qd-remark">{q.close_remark}</div> : <div className="qd-muted" style={{ margin: "6px 0 8px" }}>No feedback was noted.</div>}
          <div className="qd-closed-foot">
            <span>
              {q.closed_at ? `Closed ${dateTime(q.closed_at)}` : "Closed"}
              {closedBy ? ` by ${closedBy}` : ""}
            </span>
            {a.canReopen && (
              <Popconfirm title="Reopen this quotation?" description="It goes back to where it was before it was closed." okText="Reopen" onConfirm={a.onReopen}>
                <button type="button" className="qp-btn ghost sm" disabled={a.reopening || fromCache}>
                  {a.reopening ? <Spin size="small" /> : <UndoOutlined />} Reopen
                </button>
              </Popconfirm>
            )}
          </div>
        </div>
      )}
      <div className="qd-card">
        <h4>
          <UserOutlined /> Customer
        </h4>
        <KV
          rows={[
            ["Contact", q.contact_person_name],
            ["Phone", q.contact_person_phone ? <a href={`tel:${q.contact_person_phone}`}><PhoneOutlined /> {q.contact_person_phone}</a> : null],
            ["Email", q.contact_person_email ? <a href={`mailto:${q.contact_person_email}`}><MailOutlined /> {q.contact_person_email}</a> : null],
            ["GSTIN", q.customer_gst_number ? <span className="qd-mono">{q.customer_gst_number}</span> : <span className="qd-muted">Not registered</span>],
            ["Type", q.customer_type === "BUSINESS" ? "Business" : "Individual"],
          ]}
        />
      </div>
      <div className="qd-grid-2">
        <div className="qd-card">
          <h4>
            <EnvironmentOutlined /> Bill to
          </h4>
          <div className="qd-addr">{joinAddr(billing) || <span className="qd-muted">No billing address</span>}</div>
        </div>
        <div className="qd-card">
          <h4>
            <EnvironmentOutlined /> Ship to
          </h4>
          <div className="qd-addr">{joinAddr(shipping) || <span className="qd-muted">No shipping address</span>}</div>
        </div>
      </div>
      {(business.businessName || business.businessAddress) && (
        <div className="qd-card">
          <h4>
            <ShopOutlined /> From
          </h4>
          <KV
            rows={[
              ["Business", business.businessName],
              ["GSTIN", business.businessGST ? <span className="qd-mono">{business.businessGST}</span> : null],
              ["Phone", business.businessPhone],
              ["Email", business.businessEmail],
              ["Address", typeof business.businessAddress === "string" ? business.businessAddress.replace(/\n+/g, " · ") : null],
            ]}
          />
        </div>
      )}
      {payment?.bank_name && (
        <div className="qd-card">
          <h4>
            <BankOutlined /> Pay to
          </h4>
          <KV
            rows={[
              ["Bank", payment.bank_name],
              ["Holder", payment.account_holder_name],
              ["Account", payment.account_number ? <span className="qd-mono">{payment.account_number}</span> : null],
              ["IFSC", payment.ifsc_code ? <span className="qd-mono">{payment.ifsc_code}</span> : null],
              ["Branch", payment.branch_name],
            ]}
          />
        </div>
      )}
      {q.notes && (
        <div className="qd-card">
          <h4>
            <FileTextOutlined /> Terms & notes
          </h4>
          <div className="qd-notes">{q.notes}</div>
        </div>
      )}
      <div className="qd-card">
        <h4>
          <HistoryOutlined /> Record
        </h4>
        <KV
          rows={[
            ["Created", `${dateTime(q.created_at)}${createdBy ? ` by ${createdBy}` : ""}`],
            ["Updated", q.updated_at ? dateTime(q.updated_at) : null],
            ["Version", `v${q.version_number ?? 1}`],
          ]}
        />
      </div>
    </>
  );

  const itemsTab = q && (
    <>
      <div className="qd-card">
        <h4>
          <FileTextOutlined /> {count(items.length)} item{items.length === 1 ? "" : "s"}
        </h4>
        <ul className="qd-items">
          {items.map((it, i) => {
            const qty = Number(it.qty ?? it.quantity ?? 0);
            const disc = Number(it.discount_percent || 0);
            return (
              <li key={it.id ?? i}>
                <span className="qd-item-no">{i + 1}</span>
                <div className="qd-item-main">
                  <b>{it.product_name || it.description || "Item"}</b>
                  <small>
                    {qty} {it.unit || ""} × {rupees(it.rate)}
                    {disc ? <span className="qd-disc">−{disc}%</span> : null}
                    {it.hsn_code ? ` · HSN ${it.hsn_code}` : ""}
                  </small>
                </div>
                <div className="qd-item-amt">
                  <b>{rupees(it.total ?? it.amount ?? 0)}</b>
                  {disc ? <small>net {rupees(it.discounted_rate ?? Number(it.rate) * (1 - disc / 100))}</small> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="qd-card qd-totals">
        <div>
          <span>Subtotal</span>
          <b>{rupees(q.sub_total)}</b>
        </div>
        {Number(q.discount_amount) > 0 && (
          <div>
            <span>Discount{Number(q.discount_percent) ? ` (${Number(q.discount_percent)}%)` : ""}</span>
            <b>−{rupees(q.discount_amount)}</b>
          </div>
        )}
        {Number(q.cgst_amount) > 0 && (
          <div>
            <span>CGST ({Number(q.cgst_percent)}%)</span>
            <b>{rupees(q.cgst_amount)}</b>
          </div>
        )}
        {Number(q.sgst_amount) > 0 && (
          <div>
            <span>SGST ({Number(q.sgst_percent)}%)</span>
            <b>{rupees(q.sgst_amount)}</b>
          </div>
        )}
        {Number(q.igst_amount) > 0 && (
          <div>
            <span>IGST ({Number(q.igst_percent)}%)</span>
            <b>{rupees(q.igst_amount)}</b>
          </div>
        )}
        {Number(q.transport_charges) > 0 && (
          <div>
            <span>Transport</span>
            <b>{rupees(q.transport_charges)}</b>
          </div>
        )}
        <div className="grand">
          <span>Grand total</span>
          <b>{rupees(q.grand_total)}</b>
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
      rootClassName="qp-portal"
      destroyOnHidden
    >
      {q ? (
        <div className="qd-root">
          <header className="qd-hero">
            <div className="qd-top">
              <div className="qd-id">
                <div className="qd-eyebrow">
                  <StagePill q={q} />
                  <span>Version {q.version_number ?? 1}</span>
                  {fromCache && (
                    <span>
                      <Spin size="small" /> Refreshing…
                    </span>
                  )}
                </div>
                <h2 className="qd-number">{q.quotation_number}</h2>
                <div className="qd-cust">
                  <Avatar name={q.customer_name} seed={q.customer_id || q.customer_name} size={30} />
                  <span>
                    <b>{q.customer_name}</b>
                    {q.company_name ? ` · ${q.company_name}` : ""}
                  </span>
                </div>
              </div>
              <button type="button" className="qd-icon-btn" onClick={onClose} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <div className="qd-figures">
              <div className="qd-total">
                <span>Grand total</span>
                <b>{rupees(q.grand_total)}</b>
                <small>
                  {count(items.length)} item{items.length === 1 ? "" : "s"}
                  {tax > 0 ? ` · incl. ${rupees(tax)} GST` : " · no GST"}
                </small>
              </div>
              <div className="qd-facts">
                <div>
                  <span>Dated</span>
                  <b>{shortDate(q.quotation_date || q.created_at)}</b>
                </div>
                <div>
                  <span>Validity</span>
                  <b>
                    <ValidityChip q={q} today={today} />
                  </b>
                </div>
                <div>
                  <span>Valid till</span>
                  <b>{q.validity_date ? shortDate(q.validity_date) : "—"}</b>
                </div>
                <div>
                  <span>Created by</span>
                  <b title={createdBy}>{createdBy || "—"}</b>
                </div>
              </div>
            </div>

            <Tracker q={q} closedFrom={closed ? closeEvent?.detail?.previous_status : undefined} />

            <div className="qd-actions">
              {a.canSend && (
                <Popconfirm title={q.status === "SENT" ? "Send this quotation again?" : "Send this quotation to the customer?"} okText="Send" onConfirm={a.onSend} disabled={busy}>
                  <button type="button" className="qp-btn white" disabled={busy}>
                    {a.acting ? <Spin size="small" /> : <SendOutlined />} {q.status === "SENT" ? "Resend" : "Send to customer"}
                  </button>
                </Popconfirm>
              )}
              {a.canApprove && (
                <Popconfirm title="Mark this quotation as approved by the customer?" okText="Approve" onConfirm={a.onApprove} disabled={busy}>
                  <button type="button" className="qp-btn white" disabled={busy}>
                    {a.acting ? <Spin size="small" /> : <CheckOutlined />} Mark approved
                  </button>
                </Popconfirm>
              )}
              {a.canChallan && (
                <button type="button" className="qp-btn white" onClick={a.onChallan}>
                  <CarOutlined /> Create delivery challan
                </button>
              )}
              {a.canExport && (
                <button type="button" className="qp-btn glass" onClick={a.onDownload} disabled={a.downloading}>
                  {a.downloading ? <Spin size="small" /> : <DownloadOutlined />} PDF
                </button>
              )}
              {a.canEdit && (
                <button type="button" className="qp-btn glass" onClick={a.onEdit} disabled={fromCache} title={fromCache ? "Refreshing…" : undefined}>
                  <EditOutlined /> Edit
                </button>
              )}
              {a.canClose && (
                <button type="button" className="qp-btn glass" onClick={a.onClose} disabled={fromCache} title={fromCache ? "Refreshing…" : "Close as rejected or expired, with the customer's feedback"}>
                  <StopOutlined /> Close
                </button>
              )}
              {a.canReopen && (
                <Popconfirm title="Reopen this quotation?" description="It goes back to where it was before it was closed." okText="Reopen" onConfirm={a.onReopen} disabled={fromCache}>
                  <button type="button" className="qp-btn white" disabled={a.reopening || fromCache}>
                    {a.reopening ? <Spin size="small" /> : <UndoOutlined />} Reopen
                  </button>
                </Popconfirm>
              )}
              {a.canDelete && (
                <Popconfirm title="Delete this draft quotation?" description="Prefer “Close” to keep a record of why it didn't go ahead." okText="Delete" okButtonProps={{ danger: true }} onConfirm={a.onDelete}>
                  <button type="button" className="qp-btn glass">
                    <DeleteOutlined /> Delete
                  </button>
                </Popconfirm>
              )}
            </div>
            {q.has_invoice ? (
              <div className="qd-note">
                <FileDoneOutlined /> An invoice was made from this quotation, so it can no longer be edited.
              </div>
            ) : closed ? (
              <div className="qd-note">
                <StopOutlined /> This quotation is closed{closeReasonLabel(q.status, q.close_reason) ? ` — ${closeReasonLabel(q.status, q.close_reason)}` : ""}. Reopen it to edit or send it again.
              </div>
            ) : null}
          </header>

          <Tabs
            className="qd-tabs"
            defaultActiveKey="overview"
            items={[
              { key: "overview", label: "Overview", children: overview },
              { key: "items", label: `Items · ${count(items.length)}`, children: itemsTab },
              { key: "activity", label: `Activity${timeline.length ? ` · ${count(timeline.length)}` : ""}`, children: <Timeline items={timeline} /> },
              { key: "versions", label: `Versions${history.length ? ` · ${count(history.length)}` : ""}`, children: <Timeline items={history} versions /> },
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

export default QuotationDrawer;
