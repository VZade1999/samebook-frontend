import React, { useEffect, useState } from "react";
import { Empty, Spin } from "antd";
import { BankOutlined, EditOutlined, EnvironmentOutlined, ShopOutlined, TagsOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { getCompanyDetails } from "../redux/companyActions";
import EditCompanyModal from "./EditCompany/EditCompanyModal";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Mirrors the invoice/quotation/customers list pages' design system exactly
// (--inv-*/--qt-*/--cus-* prefixes) so this page reads as part of the same app.
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --comp-bg: var(--background);
      --comp-surface: var(--card);
      --comp-border: var(--border);
      --comp-accent: #4F46E5;
      --comp-accent-light: #EEF2FF;
      --comp-success: #059669;
      --comp-danger: #DC2626;
      --comp-warning: #D97706;
      --comp-text: var(--foreground);
      --comp-muted: var(--muted-foreground);
      --comp-radius: 12px;
      --comp-radius-sm: 8px;
      --comp-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --comp-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }

    .comp-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--comp-bg);
      min-height: 100vh;
      color: var(--comp-text);
    }

    /* ── Page header ── */
    .comp-header {
      background: #1E1B4B;
      padding: 28px 28px 52px;
      position: relative;
      overflow: hidden;
    }
    .comp-header::after {
      content: '';
      position: absolute;
      bottom: -1px; left: 0; right: 0;
      height: 28px;
      background: var(--comp-bg);
      border-radius: 24px 24px 0 0;
    }
    .comp-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .comp-header-content {
      position: relative; z-index: 1;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .comp-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700; color: #fff; letter-spacing: -0.5px;
      display: flex; align-items: center; gap: 12px;
    }
    .comp-page-title-icon {
      width: 36px; height: 36px; background: rgba(255,255,255,0.15);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px; overflow: hidden; flex-shrink: 0;
    }
    .comp-page-title-icon img { width: 100%; height: 100%; object-fit: contain; }
    .comp-page-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 6px; padding-left: 48px; }
    .comp-status-pill {
      display: inline-flex; align-items: center; gap: 6px;
      margin-left: 48px; margin-top: 8px;
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: .4px;
      background: rgba(255,255,255,0.15); color: #fff;
    }
    .comp-edit-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #fff; color: var(--comp-accent);
      border: none; border-radius: var(--comp-radius-sm); font-size: 13px; font-weight: 700;
      cursor: pointer; box-shadow: var(--comp-shadow-md); transition: all .15s;
      white-space: nowrap; font-family: 'Inter', sans-serif;
    }
    .comp-edit-btn:hover { background: var(--comp-accent-light); transform: translateY(-1px); }

    /* ── Body ── */
    .comp-body { padding: 0 24px 40px; margin-top: -18px; position: relative; z-index: 2; }

    /* ── Card ── */
    .comp-card {
      background: var(--comp-surface); border: 1px solid var(--comp-border);
      border-radius: var(--comp-radius); box-shadow: var(--comp-shadow); overflow: hidden;
      margin-bottom: 16px;
    }
    .comp-card-header {
      padding: 16px 20px; border-bottom: 1px solid var(--comp-border);
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 600; color: var(--comp-text);
    }
    .comp-card-header .icon {
      width: 28px; height: 28px; background: var(--comp-accent-light); border-radius: 6px;
      display: flex; align-items: center; justify-content: center; color: var(--comp-accent); font-size: 13px;
    }
    .comp-card-body { padding: 16px 20px; }

    /* ── Info grid ── */
    .comp-info-grid { display: flex; flex-direction: column; gap: 10px; }
    .comp-info-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .comp-info-label { font-size: 12px; color: var(--comp-muted); min-width: 120px; flex-shrink: 0; }
    .comp-info-value { font-size: 13px; color: var(--comp-text); font-weight: 500; }

    /* ── Detail card (address/location/bank/metadata items) ── */
    .comp-item {
      background: var(--muted); border: 1px solid var(--comp-border); border-radius: var(--comp-radius-sm);
      padding: 12px 14px; margin-bottom: 10px;
    }
    .comp-item:last-child { margin-bottom: 0; }
    .comp-item-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; }
    .comp-item-title { font-size: 13px; font-weight: 700; color: var(--comp-text); }
    .comp-item-body { margin-top: 6px; font-size: 13px; color: var(--comp-muted); line-height: 1.5; }
    .comp-item-meta { font-size: 12px; color: var(--comp-muted); margin-top: 4px; }
    .comp-pill {
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px;
      background: var(--comp-accent-light); color: var(--comp-accent);
    }
    .comp-pill.danger { background: rgba(220,38,38,.1); color: var(--comp-danger); }

    /* ── Loading / empty ── */
    .comp-loading { text-align: center; padding: 64px 0; color: var(--comp-muted); }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .comp-header { padding: 20px 16px 44px; }
      .comp-body { padding: 0 16px 40px; }
      .comp-page-subtitle, .comp-status-pill { padding-left: 0; margin-left: 0; }
      .comp-edit-btn span { display: none; }
    }
  `}</style>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
// Self-service only: every user only ever sees and edits the single company
// they belong to — there is no list of companies, no create, no delete.
const CompanyPage: React.FC = () => {
  const dispatch = useDispatch();
  const { can } = useAccess();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const companyState = useSelector((state: any) => state.companies);
  const company = companyState?.companyDetails;
  const loading = companyState?.loading || false;

  useEffect(() => {
    const storageService = new StorageService();
    let companyId: number | undefined;
    try {
      const stored = storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
      companyId = stored ? JSON.parse(stored)?.id : undefined;
    } catch (e) {}

    if (companyId) {
      dispatch(getCompanyDetails(companyId));
    }
  }, [dispatch]);

  const status = company?.status || "active";

  return (
    <div className="comp-root">
      <GlobalStyles />

      {/* ── Page header ── */}
      <div className="comp-header">
        <div className="comp-header-noise" />
        <div className="comp-header-content">
          <div>
            <div className="comp-page-title">
              <div className="comp-page-title-icon">
                {company?.logo ? <img src={company.logo} alt="logo" /> : <ShopOutlined />}
              </div>
              {company?.name || "My Company"}
            </div>
            <div className="comp-page-subtitle">Your company profile, addresses, and payment details</div>
            {company && (
              <div className="comp-status-pill">{status.charAt(0).toUpperCase() + status.slice(1)}</div>
            )}
          </div>
          {can("companies.edit") && company && (
            <button className="comp-edit-btn" onClick={() => setIsEditModalOpen(true)}>
              <EditOutlined />
              <span>Edit Company</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="comp-body">
        {loading && !company ? (
          <div className="comp-loading"><Spin /></div>
        ) : !company ? (
          <div className="comp-card">
            <div className="comp-card-body">
              <Empty description="Company details not found" />
            </div>
          </div>
        ) : (
          <CompanyDetailsView company={company} />
        )}
      </div>

      {/* ── Edit modal ── */}
      <EditCompanyModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={company}
      />
    </div>
  );
};

// ─── Details View ──────────────────────────────────────────────────────────────
const CompanyDetailsView: React.FC<{ company: any }> = ({ company }) => (
  <div>
    {/* Basic info */}
    <div className="comp-card">
      <div className="comp-card-header">
        <span className="icon"><ShopOutlined /></span>
        Company Details
      </div>
      <div className="comp-card-body">
        <div className="comp-info-grid">
          {[
            ["Legal Name", company.legal_name],
            ["GST No.", company.gst_no],
            ["Industry", company.industry],
            ["Registration", company.registration_number],
            ["Website", company.website],
            ["Email", company.primary_email],
            ["Phone", company.primary_phone],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="comp-info-row">
                <span className="comp-info-label">{label}</span>
                <span className="comp-info-value">{value}</span>
              </div>
            ))}
        </div>
      </div>
    </div>

    <Section title="Addresses" icon={<EnvironmentOutlined />}>
      {company.addresses?.length ? (
        company.addresses.slice().reverse().map((a: any, i: number) => (
          <div className="comp-item" key={i}>
            <div className="comp-item-header">
              <span className="comp-item-title">{a.label || a.type || "Address"}</span>
              {a.is_default && <span className="comp-pill">Default</span>}
            </div>
            <div className="comp-item-body">
              {[a.line_1, a.line_2, a.city, a.state, a.country, a.postal_code].filter(Boolean).join(", ")}
            </div>
            {a.phone && <div className="comp-item-meta">Phone: {a.phone}</div>}
            {a.fax && <div className="comp-item-meta">Fax: {a.fax}</div>}
            {a.notes && <div className="comp-item-meta">{a.notes}</div>}
          </div>
        ))
      ) : <Empty description="No addresses" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </Section>

    <Section title="Locations" icon={<ShopOutlined />}>
      {company.locations?.length ? (
        company.locations.slice().reverse().map((l: any, i: number) => (
          <div className="comp-item" key={i}>
            <div className="comp-item-header">
              <span className="comp-item-title">{l.name || "Location"}</span>
              {l.location_type && <span className="comp-pill">{l.location_type}</span>}
            </div>
            <div className="comp-item-body">
              {[l.address_line_1, l.address_line_2, l.address_city, l.address_state, l.address_country, l.address_postal_code].filter(Boolean).join(", ")}
            </div>
            {l.manager_name && <div className="comp-item-meta">Manager: {l.manager_name} {l.manager_phone ? `(${l.manager_phone})` : ""}</div>}
            {l.notes && <div className="comp-item-meta">{l.notes}</div>}
          </div>
        ))
      ) : <Empty description="No locations" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </Section>

    <Section title="Bank Accounts" icon={<BankOutlined />}>
      {company.bank_accounts?.length ? (
        company.bank_accounts.slice().reverse().map((b: any, i: number) => (
          <div className="comp-item" key={i}>
            <div className="comp-item-header">
              <span className="comp-item-title">{b.bank_name || "Bank Account"}</span>
              {b.is_default && <span className="comp-pill">Default</span>}
            </div>
            <div className="comp-item-body" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {b.account_holder_name && <span>Holder: {b.account_holder_name}</span>}
              {b.account_number && <span>Account: {b.account_number}</span>}
              {b.ifsc_code && <span>IFSC/Routing: {b.ifsc_code}</span>}
              {b.account_type && <span>Type: {b.account_type}</span>}
              {b.branch_name && <span>Branch: {b.branch_name}</span>}
              {b.branch_address && <span>Address: {b.branch_address}</span>}
              {b.notes && <span>{b.notes}</span>}
            </div>
          </div>
        ))
      ) : <Empty description="No bank accounts" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </Section>

    <Section title="Metadata" icon={<TagsOutlined />}>
      {company.metadata?.length ? (
        company.metadata.slice().reverse().map((m: any, i: number) => (
          <div className="comp-item" key={i}>
            <div className="comp-item-header">
              <span className="comp-item-title">{m.key}: {m.value}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {m.data_type && <span className="comp-pill">{m.data_type}</span>}
                {m.is_sensitive && <span className="comp-pill danger">Sensitive</span>}
              </div>
            </div>
          </div>
        ))
      ) : <Empty description="No metadata" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </Section>
  </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="comp-card">
    <div className="comp-card-header">
      <span className="icon">{icon}</span>
      {title}
    </div>
    <div className="comp-card-body">{children}</div>
  </div>
);

export default CompanyPage;
