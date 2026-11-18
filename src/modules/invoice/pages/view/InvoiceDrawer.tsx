import React from "react";
import type { Dayjs } from "dayjs";
import { Drawer, Popconfirm, Spin, Tabs } from "antd";
import { ago } from "@/modules/dashboard/utils/format";
import {
  BankOutlined,
  CheckCircleFilled,
  CloseOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  ExclamationCircleFilled,
  FileDoneOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  PieChartFilled,
  PlusCircleOutlined,
  SendOutlined,
  ShopOutlined,
  StopOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  DueChip,
  StatePill,
  balanceOf,
  count,
  dateTime,
  dueOf,
  joinAddr,
  modeIcon,
  modeLabel,
  paidShare,
  parseJsonField,
  personName,
  rupees,
  shortDate,
  stateOf,
} from "./shared";

export interface DrawerActions {
  canPay: boolean;
  canSend: boolean;
  canExport: boolean;
  onPay: () => void;
  onSend: () => void;
  onDownload: () => void;
  onCopyReminder: () => void;
  onOpenQuotation?: () => void;
  sending: boolean;
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
  INVOICE_GENERATED: { label: "Invoice made", icon: <PlusCircleOutlined />, tone: "var(--qp-accent)" },
  INVOICE_SENT: { label: "Marked as sent", icon: <SendOutlined />, tone: "var(--qp-sent)" },
  INVOICE_PARTIAL_PAID: { label: "Part payment received", icon: <PieChartFilled />, tone: "var(--ip-partial)" },
  INVOICE_PAID: { label: "Paid in full", icon: <CheckCircleFilled />, tone: "var(--ip-paid)" },
  INVOICE_OVERDUE: { label: "Marked overdue", icon: <ExclamationCircleFilled />, tone: "var(--qp-bad)" },
  INVOICE_CANCELLED: { label: "Cancelled", icon: <StopOutlined />, tone: "var(--qp-bad)" },
};
const actionMeta = (type?: string) =>
  ACTION_META[String(type || "").toUpperCase()] || {
    label: String(type || "Updated").replace(/^INVOICE_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
    icon: <HistoryOutlined />,
    tone: "var(--qp-draft)",
  };

const Timeline: React.FC<{ items: any[] }> = ({ items }) =>
  items.length ? (
    <ul className="qd-timeline">
      {items.map((it, i) => {
        const meta = actionMeta(it.action);
        const v = parseJsonField(it.new_value) || {};
        const who = it.changed_by ? personName(it.changed_by) : "";
        return (
          <li key={it.id ?? i} style={{ ["--tone" as any]: meta.tone, ["--i" as any]: i }}>
            <span className="qd-tl-icon">{meta.icon}</span>
            <div className="qd-tl-body">
              <b>{meta.label}</b>
              {v.payment_amount !== undefined && (
                <span className="qd-tl-reason">
                  {rupees(v.payment_amount)} · {modeLabel(v.payment_mode)}
                  {v.transaction_reference ? ` · ref ${v.transaction_reference}` : ""}
                  {v.payment_date ? ` · dated ${shortDate(v.payment_date)}` : ""}
                </span>
              )}
              {v.quotation_number && it.action === "INVOICE_GENERATED" && <span className="qd-tl-reason">From quotation {v.quotation_number}</span>}
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

const InvoiceDrawer: React.FC<{
  open: boolean;
  inv: any;
  /** Showing the list row or the browser-cached copy while fresh details load. */
  fromCache: boolean;
  timeline: any[];
  actions: DrawerActions;
  onClose: () => void;
  isMobile: boolean;
  today: Dayjs;
}> = ({ open, inv, fromCache, timeline, actions: a, onClose, isMobile, today }) => {
  const billing = parseJsonField(inv?.billing_address_snapshot) || {};
  const shipping = parseJsonField(inv?.shipping_address_snapshot) || {};
  const business = parseJsonField(inv?.business_details_snapshot) || {};
  const bank = parseJsonField(inv?.payment_details_snapshot) || {};
  const items: any[] = inv?.items || [];
  const payments: any[] = inv?.payments || [];
  const tax = Number(inv?.cgst_amount || 0) + Number(inv?.sgst_amount || 0) + Number(inv?.igst_amount || 0);
  const madeBy = personName(inv?.generated_by_user);
  const state = stateOf(inv);
  const due = dueOf(inv, today);
  const balance = balanceOf(inv);
  const share = paidShare(inv);
  const lastPayment = payments[0];

  const overview = inv && (
    <>
      <div className="qd-card">
        <h4>
          <UserOutlined /> Customer
        </h4>
        <KV
          rows={[
            ["Contact", inv.contact_person_name],
            ["Phone", inv.contact_person_phone ? <a href={`tel:${inv.contact_person_phone}`}><PhoneOutlined /> {inv.contact_person_phone}</a> : null],
            ["Email", inv.contact_person_email ? <a href={`mailto:${inv.contact_person_email}`}><MailOutlined /> {inv.contact_person_email}</a> : null],
            ["GSTIN", inv.customer_gst_number ? <span className="qd-mono">{inv.customer_gst_number}</span> : <span className="qd-muted">Not registered</span>],
            ["Type", inv.customer_type === "BUSINESS" ? "Business" : "Individual"],
          ]}
        />
      </div>
      <div className="qd-grid-2">
        <div className="qd-card">
          <h4>
            <EnvironmentOutlined /> Bill to
          </h4>
          <div className="qd-addr">{joinAddr(billing) || <span className="qd-muted">{fromCache ? "Loading…" : "No billing address"}</span>}</div>
        </div>
        <div className="qd-card">
          <h4>
            <EnvironmentOutlined /> Ship to
          </h4>
          <div className="qd-addr">{joinAddr(shipping) || <span className="qd-muted">{fromCache ? "Loading…" : "No shipping address"}</span>}</div>
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
      {bank?.bank_name && (
        <div className="qd-card">
          <h4>
            <BankOutlined /> Pay to
          </h4>
          <KV
            rows={[
              ["Bank", bank.bank_name],
              ["Holder", bank.account_holder_name],
              ["Account", bank.account_number ? <span className="qd-mono">{bank.account_number}</span> : null],
              ["IFSC", bank.ifsc_code ? <span className="qd-mono">{bank.ifsc_code}</span> : null],
              ["Branch", bank.branch_name],
            ]}
          />
        </div>
      )}
      {(inv.notes || inv.terms_conditions) && (
        <div className="qd-card">
          <h4>
            <FileTextOutlined /> Terms & notes
          </h4>
          <div className="qd-notes">{[inv.notes, inv.terms_conditions].filter(Boolean).join("\n\n")}</div>
        </div>
      )}
      <div className="qd-card">
        <h4>
          <HistoryOutlined /> Record
        </h4>
        <KV
          rows={[
            ["Made", `${dateTime(inv.created_at)}${madeBy ? ` by ${madeBy}` : ""}`],
            ["Quotation", inv.quotation_number || null],
            ["Sent", inv.last_sent_at ? `${dateTime(inv.last_sent_at)} (${ago(inv.last_sent_at)})` : <span className="qd-muted">Not marked as sent yet</span>],
          ]}
        />
      </div>
    </>
  );

  const itemsTab = inv && (
    <>
      <div className="qd-card">
        <h4>
          <FileTextOutlined /> {count(items.length)} item{items.length === 1 ? "" : "s"}
        </h4>
        {items.length ? (
          <ul className="qd-items">
            {items.map((it, i) => {
              const qty = Number(it.qty ?? 0);
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
                    <b>{rupees(it.total ?? 0)}</b>
                    {disc ? <small>net {rupees(it.discounted_rate ?? Number(it.rate) * (1 - disc / 100))}</small> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="qd-muted">{fromCache ? "Loading items…" : "No items on this invoice"}</div>
        )}
      </div>
      <div className="qd-card qd-totals">
        <div>
          <span>Subtotal</span>
          <b>{rupees(inv.sub_total)}</b>
        </div>
        {Number(inv.discount_amount) > 0 && (
          <div>
            <span>Discount{Number(inv.discount_percent) ? ` (${Number(inv.discount_percent)}%)` : ""}</span>
            <b>−{rupees(inv.discount_amount)}</b>
          </div>
        )}
        {Number(inv.cgst_amount) > 0 && (
          <div>
            <span>CGST ({Number(inv.cgst_percent)}%)</span>
            <b>{rupees(inv.cgst_amount)}</b>
          </div>
        )}
        {Number(inv.sgst_amount) > 0 && (
          <div>
            <span>SGST ({Number(inv.sgst_percent)}%)</span>
            <b>{rupees(inv.sgst_amount)}</b>
          </div>
        )}
        {Number(inv.igst_amount) > 0 && (
          <div>
            <span>IGST ({Number(inv.igst_percent)}%)</span>
            <b>{rupees(inv.igst_amount)}</b>
          </div>
        )}
        {Number(inv.transport_charges) > 0 && (
          <div>
            <span>Transport</span>
            <b>{rupees(inv.transport_charges)}</b>
          </div>
        )}
        <div className="grand">
          <span>Grand total</span>
          <b>{rupees(inv.grand_total)}</b>
        </div>
        <div>
          <span>Received</span>
          <b className="ip-good-text">{rupees(inv.paid_amount)}</b>
        </div>
        <div>
          <span>Balance due</span>
          <b className={balance > 0 ? "ip-late-text" : "ip-good-text"}>{rupees(balance)}</b>
        </div>
      </div>
    </>
  );

  const paymentsTab = inv && (
    <div className="qd-card">
      <h4>
        <WalletOutlined /> {payments.length ? `${count(payments.length)} payment${payments.length === 1 ? "" : "s"} · ${rupees(inv.paid_amount)}` : "Payments"}
      </h4>
      {payments.length ? (
        <ul className="ip-pays">
          {payments.map((p, i) => (
            <li key={p.id ?? i} style={{ ["--i" as any]: i }}>
              <span className="ip-pays-ic" aria-hidden>
                {modeIcon(p.payment_mode)}
              </span>
              <div className="ip-pays-main">
                <b>{modeLabel(p.payment_mode)}</b>
                <small>
                  {shortDate(p.payment_date)}
                  {p.transaction_reference ? <> · ref <span className="qd-mono">{p.transaction_reference}</span></> : null}
                  {p.received_by_user ? ` · recorded by ${personName(p.received_by_user)}` : ""}
                </small>
                {p.remarks && <span className="ip-pays-note">{p.remarks}</span>}
              </div>
              <b className="ip-pays-amt">{rupees(p.payment_amount)}</b>
            </li>
          ))}
        </ul>
      ) : (
        <div className="qp-empty" style={{ padding: "28px 10px 30px" }}>
          <span className="qp-empty-art">
            <WalletOutlined />
          </span>
          <b>{fromCache ? "Loading payments…" : "No payments yet"}</b>
          {!fromCache && <span>When the customer pays, record it here — part payments are fine.</span>}
          {a.canPay && !fromCache && (
            <button type="button" className="qp-btn primary" onClick={a.onPay}>
              ₹ Record a payment
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={isMobile ? "100vw" : "min(760px, 100vw)"}
      closable={false}
      title={null}
      rootClassName="qp-portal ip-portal"
      destroyOnHidden
    >
      {inv ? (
        <div className="qd-root">
          <header className={`qd-hero ip-dhero ${state}${due.tone === "bad" ? " late" : ""}`}>
            <div className="qd-top">
              <div className="qd-id">
                <div className="qd-eyebrow">
                  <StatePill inv={inv} />
                  <span>Tax invoice</span>
                  {inv.last_sent_at ? (
                    <span title={dateTime(inv.last_sent_at)}>
                      <SendOutlined /> Sent {ago(inv.last_sent_at)}
                    </span>
                  ) : (
                    <span>Not marked as sent</span>
                  )}
                  {fromCache && (
                    <span>
                      <Spin size="small" /> Refreshing…
                    </span>
                  )}
                </div>
                <h2 className="qd-number">{inv.invoice_number}</h2>
                <div className="qd-cust">
                  <Avatar name={inv.customer_name} seed={inv.customer_id || inv.customer_name} size={30} />
                  <span>
                    <b>{inv.customer_name}</b>
                    {inv.contact_person_name && inv.contact_person_name !== inv.customer_name ? ` · ${inv.contact_person_name}` : ""}
                  </span>
                </div>
              </div>
              <button type="button" className="qd-icon-btn" onClick={onClose} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>

            <div className="qd-figures">
              <div className="qd-total">
                <span>{state === "paid" ? "Paid in full" : state === "cancelled" ? "Cancelled" : "Balance due"}</span>
                <b>{rupees(state === "paid" || state === "cancelled" ? inv.grand_total : balance)}</b>
                <small>
                  {state === "paid" || state === "cancelled" ? `${count(items.length || 0)} item${items.length === 1 ? "" : "s"}` : `of ${rupees(inv.grand_total)}`}
                  {tax > 0 ? ` · incl. ${rupees(tax)} GST` : " · no GST"}
                </small>
              </div>
              <div className="qd-facts">
                <div>
                  <span>Invoice date</span>
                  <b>{shortDate(inv.invoice_date)}</b>
                </div>
                <div>
                  <span>Due</span>
                  <b>
                    <DueChip inv={inv} today={today} />
                  </b>
                </div>
                <div>
                  <span>Due date</span>
                  <b>{inv.due_date ? shortDate(inv.due_date) : "—"}</b>
                </div>
                <div>
                  <span>From quotation</span>
                  <b>
                    {inv.quotation_number && a.onOpenQuotation ? (
                      <button type="button" className="ip-link-white" onClick={a.onOpenQuotation} title={`Open ${inv.quotation_number}`}>
                        {inv.quotation_number}
                      </button>
                    ) : (
                      inv.quotation_number || "—"
                    )}
                  </b>
                </div>
              </div>
            </div>

            {state !== "cancelled" && (
              <div className="ip-meter" role="img" aria-label={`${Math.round(share)}% paid: ${rupees(inv.paid_amount)} of ${rupees(inv.grand_total)}`}>
                <div className="ip-meter-top">
                  <span>
                    <b>{rupees(inv.paid_amount)}</b> received{payments.length ? ` · ${count(payments.length)} payment${payments.length === 1 ? "" : "s"}` : ""}
                  </span>
                  <span>{Math.round(share)}%</span>
                </div>
                <div className="ip-meter-track">
                  <span style={{ width: `${share}%` }} />
                </div>
              </div>
            )}

            <div className="qd-actions">
              {a.canPay && (
                <button type="button" className="qp-btn white" onClick={a.onPay} disabled={fromCache} title={fromCache ? "Refreshing…" : undefined}>
                  ₹ Record payment
                </button>
              )}
              {a.canSend && (
                <Popconfirm
                  title={inv.last_sent_at ? "Mark as sent again?" : "Mark this invoice as sent?"}
                  description="Notes that you shared it with the customer. Nothing is emailed from SameBook."
                  okText="Mark as sent"
                  onConfirm={a.onSend}
                  disabled={a.sending}
                >
                  <button type="button" className={`qp-btn ${a.canPay ? "glass" : "white"}`} disabled={a.sending}>
                    {a.sending ? <Spin size="small" /> : <SendOutlined />} {inv.last_sent_at ? "Mark sent again" : "Mark as sent"}
                  </button>
                </Popconfirm>
              )}
              {a.canExport && (
                <button type="button" className="qp-btn glass" onClick={a.onDownload} disabled={a.downloading}>
                  {a.downloading ? <Spin size="small" /> : <DownloadOutlined />} PDF
                </button>
              )}
              {state !== "paid" && state !== "cancelled" && (
                <button type="button" className="qp-btn glass" onClick={a.onCopyReminder} disabled={fromCache} title="Copy a polite payment reminder to paste into WhatsApp or email">
                  <MessageOutlined /> Copy reminder
                </button>
              )}
            </div>
            <div className="qd-note">
              {state === "paid" ? (
                <>
                  <CheckCircleFilled /> Paid in full{lastPayment?.payment_date ? ` — last payment on ${shortDate(lastPayment.payment_date)}` : ""}.
                </>
              ) : state === "cancelled" ? (
                <>
                  <StopOutlined /> This invoice is cancelled and doesn't count anywhere.
                </>
              ) : due.tone === "bad" ? (
                <>
                  <ExclamationCircleFilled /> Payment is {due.label.replace(/^Overdue by /, "")} late. Copy a reminder to send to the customer.
                </>
              ) : !inv.due_date ? (
                <>
                  <FileDoneOutlined /> No due date was set, so this invoice will never show as overdue.
                </>
              ) : null}
            </div>
          </header>

          <Tabs
            className="qd-tabs"
            defaultActiveKey="overview"
            items={[
              { key: "overview", label: "Overview", children: overview },
              { key: "items", label: `Items${items.length ? ` · ${count(items.length)}` : ""}`, children: itemsTab },
              { key: "payments", label: `Payments${payments.length ? ` · ${count(payments.length)}` : ""}`, children: paymentsTab },
              { key: "activity", label: `Activity${timeline.length ? ` · ${count(timeline.length)}` : ""}`, children: <Timeline items={timeline} /> },
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

export default InvoiceDrawer;
