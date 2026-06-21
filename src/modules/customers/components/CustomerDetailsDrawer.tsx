import React from "react";
import { Drawer, Empty } from "antd";
import {
  BankOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  TeamOutlined,
} from "@ant-design/icons";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatDate = (v: string) =>
  v
    ? new Date(v).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatAddress = (addr: any) => {
  if (!addr) return "—";
  const parts = [
    addr.address_line_1,
    addr.address_line_2,
    addr.city,
    addr.state,
    addr.postal_code,
  ].filter(Boolean);
  return parts.join(", ") || "—";
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const DrawerStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .cdd-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #111827;
    }

    /* ── Drawer overrides ── */
    .cdd-drawer .ant-drawer-header {
      background: #1E1B4B !important;
      border-bottom: none !important;
      padding: 20px 24px !important;
    }
    .cdd-drawer .ant-drawer-title {
      color: #fff !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 15px !important;
      font-weight: 700 !important;
    }
    .cdd-drawer .ant-drawer-close {
      color: rgba(255,255,255,0.6) !important;
    }
    .cdd-drawer .ant-drawer-close:hover { color: #fff !important; }
    .cdd-drawer .ant-drawer-body {
      padding: 0 !important;
      background: #F4F5F9 !important;
    }

    /* ── Hero card ── */
    .cdd-hero {
      background: #1E1B4B;
      padding: 0 24px 28px;
      position: relative;
    }
    .cdd-hero::after {
      content: '';
      position: absolute;
      bottom: -1px; left: 0; right: 0;
      height: 20px;
      background: #F4F5F9;
      border-radius: 20px 20px 0 0;
    }
    .cdd-hero-inner {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .cdd-avatar {
      width: 52px; height: 52px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .cdd-avatar.business   { background: rgba(219,234,254,0.2); color: #BFDBFE; border: 1.5px solid rgba(147,197,253,0.3); }
    .cdd-avatar.individual { background: rgba(209,250,229,0.2); color: #A7F3D0; border: 1.5px solid rgba(110,231,183,0.3); }
    .cdd-hero-name {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.3px;
      line-height: 1.2;
    }
    .cdd-hero-company {
      font-size: 13px;
      color: rgba(255,255,255,0.6);
      margin-top: 3px;
    }
    .cdd-hero-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .cdd-type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 9px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 700;
    }
    .cdd-type-badge.business   { background: rgba(219,234,254,0.15); color: #BFDBFE; border: 1px solid rgba(147,197,253,0.25); }
    .cdd-type-badge.individual { background: rgba(209,250,229,0.15); color: #A7F3D0; border: 1px solid rgba(110,231,183,0.25); }
    .cdd-date-badge {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
    }

    /* ── Scrollable content area ── */
    .cdd-content { padding: 20px 20px 40px; }

    /* ── Section ── */
    .cdd-section {
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .cdd-section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid #F3F4F6;
      background: #FAFAFA;
    }
    .cdd-section-icon {
      width: 26px; height: 26px;
      border-radius: 7px;
      background: #EEF2FF;
      color: #4F46E5;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px;
    }
    .cdd-section-title {
      font-size: 12px;
      font-weight: 700;
      color: #374151;
      letter-spacing: 0.2px;
      flex: 1;
    }
    .cdd-section-count {
      font-size: 11px;
      font-weight: 600;
      color: #4F46E5;
      background: #EEF2FF;
      padding: 2px 8px;
      border-radius: 99px;
    }
    .cdd-section-body { padding: 16px; }

    /* ── Field grid ── */
    .cdd-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .cdd-field {}
    .cdd-field-label {
      font-size: 10px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 4px;
    }
    .cdd-field-value {
      font-size: 13px;
      color: #111827;
      font-weight: 500;
      word-break: break-word;
    }
    .cdd-field-value.muted { color: #9CA3AF; font-weight: 400; font-style: italic; }
    .cdd-field-value.mono {
      font-family: 'Courier New', monospace;
      background: #F3F4F6;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.3px;
      font-size: 12px;
    }
    .cdd-field-value.link { color: #4F46E5; text-decoration: none; }
    .cdd-field-value.link:hover { text-decoration: underline; }
    .cdd-field-full { grid-column: 1 / -1; }

    /* ── Contact / Address sub-cards ── */
    .cdd-sub-card {
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .cdd-sub-card:last-child { margin-bottom: 0; }
    .cdd-sub-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
    }
    .cdd-sub-card-num {
      width: 20px; height: 20px;
      border-radius: 50%;
      background: #EEF2FF;
      color: #4F46E5;
      font-size: 10px;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .cdd-sub-card-name {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      flex: 1;
    }
    .cdd-sub-card-body { padding: 14px; }

    /* ── Contact info row ── */
    .cdd-contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .cdd-contact-row:last-child { margin-bottom: 0; }
    .cdd-contact-icon {
      width: 26px; height: 26px;
      border-radius: 6px;
      background: #F3F4F6;
      color: #6B7280;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
    }
    .cdd-contact-text {
      font-size: 13px;
      color: #374151;
    }

    /* ── Address type badge ── */
    .cdd-addr-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
    }
    .cdd-addr-BILLING  { background: #DBEAFE; color: #1D4ED8; }
    .cdd-addr-SHIPPING { background: #ECFDF5; color: #059669; }
    .cdd-addr-OFFICE   { background: #FEF3C7; color: #92400E; }
    .cdd-addr-WAREHOUSE { background: #F3E8FF; color: #7C3AED; }
    .cdd-addr-FACTORY  { background: #FEE2E2; color: #B91C1C; }
    .cdd-addr-BRANCH   { background: #E0F2FE; color: #0369A1; }
    .cdd-addr-OTHER    { background: #F3F4F6; color: #374151; }

    /* ── Primary pill ── */
    .cdd-primary-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      background: #DCFCE7;
      color: #166534;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
    }

    /* ── Notes block ── */
    .cdd-notes {
      font-size: 13px;
      color: #374151;
      line-height: 1.6;
      background: #FAFAFA;
      border: 1px solid #F3F4F6;
      border-radius: 8px;
      padding: 12px;
    }

    /* ── Divider ── */
    .cdd-divider {
      height: 1px;
      background: #F3F4F6;
      margin: 12px 0;
    }

    /* ── Empty ── */
    .cdd-empty {
      text-align: center;
      padding: 24px;
      color: #9CA3AF;
    }
    .cdd-empty-icon { font-size: 24px; opacity: 0.3; margin-bottom: 8px; }
    .cdd-empty-text { font-size: 13px; }

    @media (max-width: 480px) {
      .cdd-fields { grid-template-columns: 1fr; }
    }
  `}</style>
);

// ─── Sub-components ───────────────────────────────────────────────────────────
const Field = ({
  label,
  value,
  mono,
  link,
  full,
}: {
  label: string;
  value: any;
  mono?: boolean;
  link?: string;
  full?: boolean;
}) => (
  <div className={`cdd-field${full ? " cdd-field-full" : ""}`}>
    <div className="cdd-field-label">{label}</div>
    {!value ? (
      <div className="cdd-field-value muted">—</div>
    ) : link ? (
      <a className="cdd-field-value link" href={link} target="_blank" rel="noreferrer">
        {value}
      </a>
    ) : (
      <div className={`cdd-field-value${mono ? " mono" : ""}`}>{value}</div>
    )}
  </div>
);

const AddrBadge = ({ type }: { type: string }) => (
  <span className={`cdd-addr-badge cdd-addr-${type || "OTHER"}`}>
    {type ? type.charAt(0) + type.slice(1).toLowerCase() : "Other"}
  </span>
);

// ─── Props ────────────────────────────────────────────────────────────────────
interface CustomerDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  customer: any;
}

// ─── Component ────────────────────────────────────────────────────────────────
const CustomerDetailsDrawer: React.FC<CustomerDetailsDrawerProps> = ({
  open,
  onClose,
  customer,
}) => {
  return (
    <>
      <DrawerStyles />
      <Drawer
        className="cdd-drawer"
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TeamOutlined style={{ fontSize: 14, opacity: 0.7 }} />
            Customer Details
          </span>
        }
        placement="right"
        width={560}
        open={open}
        onClose={onClose}
      >
        {!customer ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Empty description="No customer selected" />
          </div>
        ) : (
          <div className="cdd-root">
            {/* ── Hero ── */}
            <div className="cdd-hero">
              <div className="cdd-hero-inner">
                <div
                  className={`cdd-avatar ${
                    customer.customer_type === "BUSINESS" ? "business" : "individual"
                  }`}
                >
                  {getInitials(customer.display_name || "?")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cdd-hero-name">{customer.display_name || "—"}</div>
                  {customer.company_name && (
                    <div className="cdd-hero-company">{customer.company_name}</div>
                  )}
                  <div className="cdd-hero-meta">
                    <span
                      className={`cdd-type-badge ${
                        customer.customer_type === "BUSINESS" ? "business" : "individual"
                      }`}
                    >
                      {customer.customer_type === "BUSINESS" ? (
                        <BankOutlined style={{ fontSize: 9 }} />
                      ) : (
                        <UserOutlined style={{ fontSize: 9 }} />
                      )}
                      {customer.customer_type === "BUSINESS" ? "Business" : "Individual"}
                    </span>
                    {customer.created_at && (
                      <span className="cdd-date-badge">
                        Added {formatDate(customer.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Content ── */}
            <div className="cdd-content">

              {/* ── Basic info ── */}
              <div className="cdd-section">
                <div className="cdd-section-header">
                  <div className="cdd-section-icon">
                    <UserOutlined />
                  </div>
                  <span className="cdd-section-title">General Information</span>
                </div>
                <div className="cdd-section-body">
                  <div className="cdd-fields">
                    <Field label="Display Name" value={customer.display_name} />
                    <Field label="Customer Type" value={customer.customer_type === "BUSINESS" ? "Business" : "Individual"} />
                    {customer.customer_type === "BUSINESS" && (
                      <>
                        <Field label="Company Name" value={customer.company_name} />
                        <Field label="GST Number" value={customer.gst_number} mono />
                        <Field label="Industry" value={customer.industry} />
                        <Field
                          label="Website"
                          value={customer.website}
                          link={customer.website}
                        />
                      </>
                    )}
                    {customer.notes && (
                      <div className="cdd-field cdd-field-full">
                        <div className="cdd-field-label">Notes</div>
                        <div className="cdd-notes">{customer.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Contacts ── */}
              <div className="cdd-section">
                <div className="cdd-section-header">
                  <div className="cdd-section-icon"><TeamOutlined /></div>
                  <span className="cdd-section-title">Contacts</span>
                  <span className="cdd-section-count">
                    {customer.contacts?.length ?? 0}
                  </span>
                </div>
                <div className="cdd-section-body">
                  {customer.contacts?.length ? (
                    customer.contacts.map((contact: any, i: number) => {
                      const fullName = [contact.first_name, contact.last_name]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <div key={i} className="cdd-sub-card">
                          <div className="cdd-sub-card-header">
                            <div className="cdd-sub-card-num">{i + 1}</div>
                            <div className="cdd-sub-card-name">{fullName || "—"}</div>
                            {contact.is_primary && (
                              <span className="cdd-primary-pill">
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                  <circle cx="4" cy="4" r="3" fill="#166534" />
                                </svg>
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="cdd-sub-card-body">
                            {contact.email && (
                              <div className="cdd-contact-row">
                                <div className="cdd-contact-icon"><MailOutlined /></div>
                                <span className="cdd-contact-text">{contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="cdd-contact-row">
                                <div className="cdd-contact-icon"><PhoneOutlined /></div>
                                <span className="cdd-contact-text">{contact.phone}</span>
                              </div>
                            )}
                            {(contact.designation || contact.department) && (
                              <div className="cdd-contact-row">
                                <div className="cdd-contact-icon">
                                  <BankOutlined />
                                </div>
                                <span className="cdd-contact-text">
                                  {[contact.designation, contact.department]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="cdd-empty">
                      <div className="cdd-empty-icon"><TeamOutlined /></div>
                      <div className="cdd-empty-text">No contacts added</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Addresses ── */}
              <div className="cdd-section">
                <div className="cdd-section-header">
                  <div className="cdd-section-icon">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 8 4 8s4-4.75 4-8c0-2.21-1.79-4-4-4z"
                        stroke="#4F46E5" strokeWidth="1.2" fill="none"/>
                      <circle cx="7" cy="5" r="1.2" stroke="#4F46E5" strokeWidth="1.2" fill="none"/>
                    </svg>
                  </div>
                  <span className="cdd-section-title">Addresses</span>
                  <span className="cdd-section-count">
                    {customer.addresses?.length ?? 0}
                  </span>
                </div>
                <div className="cdd-section-body">
                  {customer.addresses?.length ? (
                    customer.addresses.map((addr: any, i: number) => (
                      <div key={i} className="cdd-sub-card">
                        <div className="cdd-sub-card-header">
                          <div className="cdd-sub-card-num">{i + 1}</div>
                          <AddrBadge type={addr.address_type} />
                          {addr.label && (
                            <span style={{ fontSize: 12, color: "#6B7280", marginLeft: 4 }}>
                              {addr.label}
                            </span>
                          )}
                          {addr.is_primary && (
                            <span className="cdd-primary-pill" style={{ marginLeft: "auto" }}>
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="cdd-sub-card-body">
                          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: addr.gst_number ? 10 : 0 }}>
                            {formatAddress(addr)}
                          </div>
                          {addr.gst_number && (
                            <>
                              <div className="cdd-divider" />
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 3 }}>
                                GST FOR THIS LOCATION
                              </div>
                              <div
                                style={{
                                  fontFamily: "'Courier New', monospace",
                                  fontSize: 12,
                                  background: "#F3F4F6",
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  display: "inline-block",
                                  color: "#111827",
                                  letterSpacing: "0.3px",
                                }}
                              >
                                {addr.gst_number}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="cdd-empty">
                      <div className="cdd-empty-icon">
                        <svg width="28" height="28" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 8 4 8s4-4.75 4-8c0-2.21-1.79-4-4-4z"
                            stroke="#9CA3AF" strokeWidth="1" fill="none"/>
                        </svg>
                      </div>
                      <div className="cdd-empty-text">No addresses added</div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default CustomerDetailsDrawer;