import React, { useCallback, useEffect, useState } from "react";
import { Drawer, message, Popconfirm, Spin, Tooltip } from "antd";
import {
  BankOutlined,
  CarOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShopOutlined,
  StarFilled,
  UserOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { inr } from "@/modules/dashboard/utils/format";
import { initialsOf } from "@/permissions/standing";
import { type Activity, type DirCustomer, apiError, getActivity, getCustomer, shortDate, sinceText, telOf, waOf } from "./customersApi";

type Tone = "good" | "warn" | "bad" | "muted" | "accent";
const invoiceState = (i: { status: string; balance: number }): [string, Tone] => {
  if (["CANCELLED", "SUPERSEDED"].includes(i.status)) return ["Cancelled", "muted"];
  if (i.status === "PAID" || i.balance <= 0) return ["Paid", "good"];
  if (i.status === "PARTIAL_PAID") return ["Part paid", "warn"];
  return ["Unpaid", "bad"];
};
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
const Pill: React.FC<{ s: [string, Tone] }> = ({ s }) => <span className={`cu-pill ${s[1]}`}>{s[0]}</span>;

const copy = (text: string, what: string) => {
  navigator.clipboard?.writeText(text).then(
    () => message.success(`${what} copied`),
    () => message.error("Couldn't copy"),
  );
};

/** One customer: how to reach them, what they've bought and owe, their documents, contacts and addresses. */
const CustomerProfile: React.FC<{
  customer: DirCustomer | null;
  can: { edit: boolean; remove: boolean; quote: boolean };
  onClose: () => void;
  onEdit: (full: any) => void;
  onDelete: (c: DirCustomer) => Promise<void>;
}> = ({ customer, can, onClose, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const [full, setFull] = useState<any>(null);
  const [act, setAct] = useState<Activity | null>(null);
  const [failed, setFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!customer) return;
    setFailed(false);
    try {
      const [c, a] = await Promise.all([getCustomer(customer.id), getActivity(customer.id)]);
      setFull(c);
      setAct(a);
    } catch (e) {
      setFailed(true);
      message.error(apiError(e, "Couldn't load this customer"));
    }
  }, [customer]);

  useEffect(() => {
    setFull(null);
    setAct(null);
    load();
  }, [load]);

  if (!customer) return null;
  const c = customer;
  const business = c.type === "BUSINESS";
  const phone = c.contact?.phone || c.phone;
  const email = c.contact?.email || c.email;
  const contacts: any[] = full?.contacts || [];
  const addresses: any[] = full?.addresses || [];
  const inv = act?.invoices;
  const paidShare = inv && inv.billed ? Math.min(100, Math.max(0, ((inv.paid || 0) / inv.billed) * 100)) : 0;
  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Drawer open={!!customer} onClose={onClose} size="min(660px, 100vw)" destroyOnHidden rootClassName="cu-portal" title={null} closable={false} styles={{ body: { padding: 0 } }}>
      <div className="cu-profile">
        {/* Head */}
        <div className={`cu-head ${business ? "biz" : "ind"}`}>
          <button type="button" className="cu-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
          <span className={`cu-avatar xl ${business ? "biz" : "ind"}`}>{business ? <ShopOutlined /> : initialsOf(c.name)}</span>
          <div className="cu-head-text">
            <h3>{c.name}</h3>
            {c.company_name && c.company_name !== c.name && <p>{c.company_name}</p>}
            <div className="cu-head-chips">
              <span className={`cu-type ${business ? "biz" : "ind"}`}>{business ? "Business" : "Individual"}</span>
              {c.gst_number && (
                <button type="button" className="cu-gst" onClick={() => copy(c.gst_number!, "GSTIN")} title="Copy GSTIN">
                  GSTIN <b>{c.gst_number}</b> <CopyOutlined />
                </button>
              )}
              {c.po_required && <span className="cu-pill accent">PO needed</span>}
              <span className="cu-since">Customer since {shortDate(c.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="cu-quick">
          <a className={`cu-qa${phone ? "" : " off"}`} href={phone ? `tel:${telOf(phone)}` : undefined} aria-disabled={!phone}>
            <PhoneOutlined /> Call
          </a>
          <a className={`cu-qa wa${phone ? "" : " off"}`} href={phone ? `https://wa.me/${waOf(phone)}` : undefined} target="_blank" rel="noreferrer" aria-disabled={!phone}>
            <WhatsAppOutlined /> WhatsApp
          </a>
          <a className={`cu-qa${email ? "" : " off"}`} href={email ? `mailto:${email}` : undefined} aria-disabled={!email}>
            <MailOutlined /> Email
          </a>
          {can.quote && (
            <button type="button" className="cu-qa primary" onClick={() => go(`/app/quotation?new=1&customer=${c.id}&returnTo=/app/customers`)}>
              <PlusOutlined /> New quotation
            </button>
          )}
        </div>

        {!act && !failed ? (
          <div className="cu-loading">
            <Spin />
          </div>
        ) : failed ? (
          <div className="cu-loading">
            <button type="button" className="cu-btn ghost" onClick={load}>
              <ReloadOutlined /> Try again
            </button>
          </div>
        ) : (
          <>
            {/* Billing */}
            {inv && (
              <section className="cu-sec">
                <div className="cu-sec-h">
                  <BankOutlined /> Billing
                  <em>{inv.count ? `${inv.count} invoice${inv.count === 1 ? "" : "s"} · first ${shortDate(inv.first)}, last ${shortDate(inv.last)}` : "Not billed yet"}</em>
                </div>
                {!inv.count ? (
                  <p className="cu-note">Once you invoice them, what they've bought, paid and still owe shows here.</p>
                ) : inv.billed !== null ? (
                  <>
                    <div className="cu-figs">
                      <div>
                        <span>Billed</span>
                        <b>{inr(inv.billed)}</b>
                      </div>
                      <div>
                        <span>Received</span>
                        <b className="good">{inr(inv.paid)}</b>
                      </div>
                      <div>
                        <span>Due</span>
                        <b className={inv.due ? "bad" : ""}>{inr(inv.due)}</b>
                      </div>
                    </div>
                    {inv.count > 0 && (
                      <div className="cu-meter" role="img" aria-label={`${Math.round(paidShare)}% of what they were billed is received`}>
                        <span style={{ width: `${paidShare}%` }} />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="cu-note">You can see their invoices, but not money totals.</p>
                )}
              </section>
            )}

            {/* Documents */}
            {(inv || act?.quotations || act?.challans) && (
              <section className="cu-sec">
                <div className="cu-sec-h">
                  <FileTextOutlined /> Recent documents
                </div>
                <div className="cu-docs">
                  {act?.quotations?.recent.map((q) => (
                    <button key={`q${q.id}`} type="button" className="cu-doc" onClick={() => go(`/app/quotation?open=${q.id}`)}>
                      <span className="cu-doc-icon q">
                        <FileTextOutlined />
                      </span>
                      <span className="cu-doc-text">
                        <b>{q.number}</b>
                        <em>Quotation · {shortDate(q.date)}</em>
                      </span>
                      <Pill s={q.invoiced ? ["Invoiced", "good"] : QUOTE[q.status] || [q.status, "muted"]} />
                      <span className="cu-doc-amt">{inr(q.total)}</span>
                    </button>
                  ))}
                  {act?.challans?.recent.map((d) => (
                    <button key={`d${d.id}`} type="button" className="cu-doc" onClick={() => go(`/app/delivery-challans?open=${d.id}`)}>
                      <span className="cu-doc-icon d">
                        <CarOutlined />
                      </span>
                      <span className="cu-doc-text">
                        <b>{d.number}</b>
                        <em>Delivery challan · {shortDate(d.date)}</em>
                      </span>
                      <Pill s={CHALLAN[d.status] || [d.status, "muted"]} />
                      <span className="cu-doc-amt">{d.qty} qty</span>
                    </button>
                  ))}
                  {inv?.recent.map((i) => (
                    <button key={`i${i.id}`} type="button" className="cu-doc" onClick={() => go(`/app/invoice?open=${i.id}`)}>
                      <span className="cu-doc-icon i">
                        <FileDoneOutlined />
                      </span>
                      <span className="cu-doc-text">
                        <b>{i.number}</b>
                        <em>Invoice · {shortDate(i.date)}</em>
                      </span>
                      <Pill s={invoiceState(i)} />
                      <span className="cu-doc-amt">{inr(i.total)}</span>
                    </button>
                  ))}
                  {!act?.quotations?.recent.length && !act?.challans?.recent.length && !inv?.recent.length && (
                    <p className="cu-note">No quotations, challans or invoices yet.</p>
                  )}
                </div>
                <div className="cu-doc-counts">
                  {act?.quotations && <span>{act.quotations.count} quotation{act.quotations.count === 1 ? "" : "s"}{act.quotations.open ? ` · ${act.quotations.open} open` : ""}</span>}
                  {act?.challans && <span>{act.challans.count} challan{act.challans.count === 1 ? "" : "s"}</span>}
                  {inv && <span>{inv.count} invoice{inv.count === 1 ? "" : "s"}</span>}
                </div>
              </section>
            )}

            {/* Contacts */}
            <section className="cu-sec">
              <div className="cu-sec-h">
                <UserOutlined /> Contacts <em>{contacts.length || "none yet"}</em>
              </div>
              {contacts.map((p) => {
                const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Contact";
                return (
                  <div key={p.id} className="cu-contact">
                    <span className="cu-avatar sm ind">{initialsOf(name)}</span>
                    <span className="cu-contact-text">
                      <b>
                        {name} {Number(p.is_primary) === 1 && <StarFilled className="cu-star" title="Main contact" />}
                      </b>
                      <em>{[p.designation, p.department].filter(Boolean).join(" · ") || "—"}</em>
                    </span>
                    <span className="cu-contact-acts">
                      {p.phone && (
                        <Tooltip title={p.phone}>
                          <a className="cu-icon" href={`tel:${telOf(p.phone)}`} aria-label={`Call ${name}`}>
                            <PhoneOutlined />
                          </a>
                        </Tooltip>
                      )}
                      {p.phone && (
                        <Tooltip title="WhatsApp">
                          <a className="cu-icon wa" href={`https://wa.me/${waOf(p.phone)}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${name}`}>
                            <WhatsAppOutlined />
                          </a>
                        </Tooltip>
                      )}
                      {p.email && (
                        <Tooltip title={p.email}>
                          <a className="cu-icon" href={`mailto:${p.email}`} aria-label={`Email ${name}`}>
                            <MailOutlined />
                          </a>
                        </Tooltip>
                      )}
                    </span>
                  </div>
                );
              })}
            </section>

            {/* Addresses */}
            <section className="cu-sec">
              <div className="cu-sec-h">
                <EnvironmentOutlined /> Addresses <em>{addresses.length || "none yet"}</em>
              </div>
              <div className="cu-addrs">
                {addresses.map((a) => {
                  const t = (v: unknown) => String(v ?? "").trim();
                  const place = [t(a.city), t(a.state)].filter(Boolean).join(", ") + (t(a.postal_code) ? ` – ${t(a.postal_code)}` : "");
                  const lines = [t(a.address_line_1), t(a.address_line_2), place, t(a.country) && t(a.country) !== "India" ? t(a.country) : ""].filter(Boolean);
                  return (
                    <div key={a.id} className="cu-addr">
                      <div className="cu-addr-top">
                        <span className={`cu-pill ${String(a.address_type).toUpperCase() === "SHIPPING" ? "accent" : "good"}`}>{String(a.address_type).toUpperCase() === "SHIPPING" ? "Shipping" : "Billing"}</span>
                        {a.label && <b>{a.label}</b>}
                        {Number(a.is_primary) === 1 && <StarFilled className="cu-star" title="Main address" />}
                        <button type="button" className="cu-icon sm" onClick={() => copy(lines.join(", "), "Address")} aria-label="Copy address">
                          <CopyOutlined />
                        </button>
                      </div>
                      {lines.map((l, i) => (
                        <span key={i}>{l}</span>
                      ))}
                      {a.gst_number && <span className="cu-addr-gst">GSTIN {a.gst_number}</span>}
                    </div>
                  );
                })}
              </div>
            </section>

            {full?.notes && (
              <section className="cu-sec">
                <div className="cu-sec-h">Notes</div>
                <p className="cu-notes">{full.notes}</p>
              </section>
            )}
          </>
        )}

        {(can.edit || can.remove) && (
          <div className="cu-foot">
            {can.remove && (
              <Popconfirm
                title={`Delete ${c.name}?`}
                description="They leave your customer list. Their quotations, challans and invoices stay as they are."
                okText="Delete"
                okButtonProps={{ danger: true }}
                cancelText="Keep"
                onConfirm={async () => {
                  setDeleting(true);
                  try {
                    await onDelete(c);
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                <button type="button" className="cu-btn danger" disabled={deleting}>
                  {deleting ? <Spin size="small" /> : <DeleteOutlined />} Delete
                </button>
              </Popconfirm>
            )}
            <span className="cu-foot-gap" />
            <span className="cu-last">Last activity: {sinceText(c.last_activity)}</span>
            {can.edit && (
              <button type="button" className="cu-btn primary" disabled={!full} onClick={() => full && onEdit(full)}>
                <EditOutlined /> Edit customer
              </button>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default CustomerProfile;
