import React, { useEffect, useState } from "react";
import { Empty, Spin } from "antd";
import {
  BankOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  TagsOutlined,
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { getCompanyDetails } from "../redux/companyActions";
import EditCompanyModal from "./EditCompany/EditCompanyModal";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Elevated take on the app's shared indigo brand system (--comp-* prefix,
// same accent #4F46E5 as Products/Invoices/Users) — richer gradients, glass
// surfaces and glow accents, but the same hue everywhere else in the app so
// this page still reads as part of the same product.
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --comp-bg: var(--background);
      --comp-surface: var(--card);
      --comp-border: var(--border);
      --comp-accent: #4F46E5;
      --comp-accent-2: #818CF8;
      --comp-accent-light: #EEF2FF;
      --comp-success: #059669;
      --comp-danger: #DC2626;
      --comp-warning: #D97706;
      --comp-text: var(--foreground);
      --comp-muted: var(--muted-foreground);
      --comp-radius: 14px;
      --comp-radius-sm: 8px;
      --comp-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --comp-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      --comp-shadow-lg: 0 24px 48px -12px rgba(30,27,75,.35);
    }

    .comp-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--comp-bg);
      min-height: 100vh;
      color: var(--comp-text);
    }

    /* ── Hero ── */
    .comp-hero {
      position: relative;
      overflow: hidden;
      padding: 40px 28px 108px;
      background:
        radial-gradient(120% 140% at 12% 0%, #4338CA 0%, transparent 55%),
        radial-gradient(90% 120% at 100% 10%, #6D28D9 0%, transparent 50%),
        linear-gradient(160deg, #14123A 0%, #1E1B4B 45%, #2A2470 100%);
    }
    .comp-hero::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0; height: 36px;
      background: var(--comp-bg); border-radius: 32px 32px 0 0;
    }
    .comp-hero-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .comp-hero-grid {
      position: absolute; inset: 0; pointer-events: none; opacity: .35;
      background-image:
        linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
      background-size: 42px 42px;
      -webkit-mask-image: radial-gradient(70% 90% at 50% 0%, #000 30%, transparent 85%);
              mask-image: radial-gradient(70% 90% at 50% 0%, #000 30%, transparent 85%);
    }
    .comp-glow {
      position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none;
    }
    .comp-glow-1 { width: 320px; height: 320px; top: -120px; right: 8%; background: radial-gradient(circle, rgba(129,140,248,.55), transparent 70%); }
    .comp-glow-2 { width: 260px; height: 260px; bottom: -140px; left: 4%; background: radial-gradient(circle, rgba(99,102,241,.4), transparent 70%); }
    .comp-glow-3 { width: 200px; height: 200px; top: 30%; left: 46%; background: radial-gradient(circle, rgba(196,181,253,.28), transparent 70%); }

    .comp-hero-inner { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; }
    .comp-eyebrow {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
      color: rgba(224,224,255,.75); margin-bottom: 14px;
    }
    .comp-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D399; box-shadow: 0 0 0 4px rgba(52,211,153,.18); }

    /* ── Glass identity card ── */
    .comp-glass {
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 20px;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      padding: 24px;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap;
      box-shadow: var(--comp-shadow-lg);
    }
    .comp-glass-left { display: flex; align-items: center; gap: 18px; min-width: 0; }
    .comp-logo-ring {
      width: 74px; height: 74px; border-radius: 18px; flex-shrink: 0;
      background: linear-gradient(135deg, #818CF8, #4F46E5 60%, #C4B5FD);
      padding: 2.5px;
      box-shadow: 0 8px 24px rgba(79,70,229,.45);
    }
    .comp-logo-inner {
      width: 100%; height: 100%; border-radius: 16px;
      background: rgba(20,18,58,.9);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; color: #fff; font-size: 26px;
    }
    .comp-logo-inner img { width: 100%; height: 100%; object-fit: contain; }
    .comp-identity-name {
      font-size: clamp(22px, 3.6vw, 32px); font-weight: 800; color: #fff;
      letter-spacing: -0.6px; line-height: 1.15; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .comp-prefix-tag {
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; font-weight: 600;
      color: rgba(224,224,255,.85); background: rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.14); padding: 3px 9px; border-radius: 20px;
      letter-spacing: .3px;
    }
    .comp-identity-sub { color: rgba(224,224,255,.65); font-size: 13px; margin-top: 6px; }
    .comp-status-pill {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 12px;
      padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .5px;
      background: rgba(52,211,153,.15); color: #6EE7B7; border: 1px solid rgba(52,211,153,.3);
    }
    .comp-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D399; }

    .comp-edit-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 22px; background: #fff; color: var(--comp-accent);
      border: none; border-radius: 12px; font-size: 13px; font-weight: 700;
      cursor: pointer; box-shadow: 0 10px 28px rgba(0,0,0,.28); transition: all .2s;
      white-space: nowrap; font-family: 'Inter', sans-serif; flex-shrink: 0;
    }
    .comp-edit-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(0,0,0,.34); }

    /* ── Stat chips ── */
    .comp-stats-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 18px; }
    .comp-stat-chip {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px; padding: 10px 14px; backdrop-filter: blur(10px);
      min-width: 132px;
    }
    .comp-stat-chip-icon {
      width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 14px;
      background: linear-gradient(135deg, rgba(129,140,248,.35), rgba(79,70,229,.35));
      color: #C7D2FE;
    }
    .comp-stat-chip-value { font-size: 16px; font-weight: 800; color: #fff; line-height: 1; }
    .comp-stat-chip-label { font-size: 10.5px; color: rgba(224,224,255,.6); text-transform: uppercase; letter-spacing: .4px; margin-top: 3px; }

    /* ── Body ── */
    .comp-body { padding: 0 24px 40px; margin-top: -60px; position: relative; z-index: 2; max-width: 1180px; margin-left: auto; margin-right: auto; }

    /* ── Completeness card ── */
    .comp-progress-card {
      background: var(--comp-surface); border: 1px solid var(--comp-border);
      border-radius: var(--comp-radius); box-shadow: var(--comp-shadow-md);
      padding: 18px 22px; margin-bottom: 20px;
      display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    }
    .comp-progress-ring-wrap { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
    .comp-progress-ring-wrap svg { transform: rotate(-90deg); }
    .comp-progress-ring-track { fill: none; stroke: var(--muted); stroke-width: 5; }
    .comp-progress-ring-value { fill: none; stroke: url(#compProgressGrad); stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset .6s ease; }
    .comp-progress-ring-text {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800; color: var(--comp-text);
    }
    .comp-progress-info { flex: 1; min-width: 200px; }
    .comp-progress-title { font-size: 13.5px; font-weight: 700; color: var(--comp-text); }
    .comp-progress-sub { font-size: 12px; color: var(--comp-muted); margin-top: 2px; }

    /* ── Grid layout ── */
    .comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
    .comp-grid > .comp-span-2 { grid-column: 1 / -1; }
    @media (max-width: 860px) { .comp-grid { grid-template-columns: 1fr; } }

    /* ── Card ── */
    .comp-card {
      background: var(--comp-surface); border: 1px solid var(--comp-border);
      border-radius: var(--comp-radius); box-shadow: var(--comp-shadow); overflow: hidden;
      margin-bottom: 0; position: relative; transition: transform .18s ease, box-shadow .18s ease;
    }
    .comp-card:hover { transform: translateY(-2px); box-shadow: var(--comp-shadow-md); }
    .comp-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, var(--comp-accent), var(--comp-accent-2));
    }
    .comp-card-header {
      padding: 16px 20px; border-bottom: 1px solid var(--comp-border);
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; font-weight: 700; color: var(--comp-text);
    }
    .comp-card-header .icon {
      width: 32px; height: 32px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px;
      background: linear-gradient(135deg, var(--comp-accent), var(--comp-accent-2));
      box-shadow: 0 4px 10px rgba(79,70,229,.35);
    }
    .comp-card-body { padding: 18px 20px; }

    /* ── Info grid ── */
    .comp-info-grid { display: flex; flex-direction: column; gap: 4px; }
    .comp-info-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--comp-border); }
    .comp-info-row:last-child { border-bottom: none; }
    .comp-info-label { font-size: 12px; color: var(--comp-muted); min-width: 120px; flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
    .comp-info-value { font-size: 13px; color: var(--comp-text); font-weight: 600; }

    /* ── Detail card (address/location/bank/metadata items) ── */
    .comp-item {
      background: var(--muted); border: 1px solid var(--comp-border); border-left: 3px solid var(--comp-accent);
      border-radius: var(--comp-radius-sm); padding: 12px 14px; margin-bottom: 10px;
      transition: background .15s ease;
    }
    .comp-item:hover { background: var(--comp-accent-light); }
    .comp-item:last-child { margin-bottom: 0; }
    .comp-item-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; }
    .comp-item-title { font-size: 13px; font-weight: 700; color: var(--comp-text); }
    .comp-item-body { margin-top: 6px; font-size: 13px; color: var(--comp-muted); line-height: 1.5; }
    .comp-item-meta { font-size: 12px; color: var(--comp-muted); margin-top: 4px; }
    .comp-pill {
      font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px;
      background: var(--comp-accent-light); color: var(--comp-accent);
    }
    .comp-pill.danger { background: rgba(220,38,38,.1); color: var(--comp-danger); }

    /* ── Loading / empty ── */
    .comp-loading { text-align: center; padding: 64px 0; color: var(--comp-muted); }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .comp-hero { padding: 24px 16px 96px; }
      .comp-body { padding: 0 16px 40px; margin-top: -52px; }
      .comp-glass { padding: 18px; }
      .comp-edit-btn { width: 100%; justify-content: center; }
      .comp-glass-left { width: 100%; }
      .comp-stat-chip { flex: 1; min-width: 100px; }
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

  const addressCount = company?.addresses?.length || 0;
  const locationCount = company?.locations?.length || 0;
  const bankCount = company?.bank_accounts?.length || 0;

  const completeness = React.useMemo(() => {
    if (!company) return 0;
    const fields = [
      company.legal_name,
      company.gst_no,
      company.industry,
      company.registration_number,
      company.website,
      company.primary_email,
      company.primary_phone,
      company.logo,
      addressCount > 0,
      bankCount > 0,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [company, addressCount, bankCount]);

  const RADIUS = 24;
  const CIRC = 2 * Math.PI * RADIUS;
  const ringOffset = CIRC - (completeness / 100) * CIRC;

  return (
    <div className="comp-root">
      <GlobalStyles />

      {/* ── Hero ── */}
      <div className="comp-hero">
        <div className="comp-hero-grid" />
        <div className="comp-glow comp-glow-1" />
        <div className="comp-glow comp-glow-2" />
        <div className="comp-glow comp-glow-3" />
        <div className="comp-hero-noise" />

        <div className="comp-hero-inner">
          <div className="comp-eyebrow">
            <span className="comp-eyebrow-dot" />
            Company Workspace
          </div>

          <div className="comp-glass">
            <div className="comp-glass-left">
              <div className="comp-logo-ring">
                <div className="comp-logo-inner">
                  {company?.logo ? <img src={company.logo} alt="logo" /> : <ShopOutlined />}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="comp-identity-name">
                  {company?.name || "My Company"}
                  {company?.company_prefix && (
                    <span className="comp-prefix-tag">#{company.company_prefix}</span>
                  )}
                </div>
                <div className="comp-identity-sub">
                  {[company?.industry, company?.gst_no ? `GST: ${company.gst_no}` : null]
                    .filter(Boolean)
                    .join("  •  ") || "Your company profile, addresses, and payment details"}
                </div>
                {company && (
                  <div className="comp-status-pill">
                    <span className="comp-status-dot" />
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                )}
              </div>
            </div>

            {can("companies.edit") && company && (
              <button className="comp-edit-btn" onClick={() => setIsEditModalOpen(true)}>
                <EditOutlined />
                <span>Edit Company</span>
              </button>
            )}
          </div>

          {company && (
            <div className="comp-stats-row">
              <div className="comp-stat-chip">
                <span className="comp-stat-chip-icon"><EnvironmentOutlined /></span>
                <div>
                  <div className="comp-stat-chip-value">{addressCount}</div>
                  <div className="comp-stat-chip-label">Addresses</div>
                </div>
              </div>
              <div className="comp-stat-chip">
                <span className="comp-stat-chip-icon"><ShopOutlined /></span>
                <div>
                  <div className="comp-stat-chip-value">{locationCount}</div>
                  <div className="comp-stat-chip-label">Locations</div>
                </div>
              </div>
              <div className="comp-stat-chip">
                <span className="comp-stat-chip-icon"><BankOutlined /></span>
                <div>
                  <div className="comp-stat-chip-value">{bankCount}</div>
                  <div className="comp-stat-chip-label">Bank Accounts</div>
                </div>
              </div>
            </div>
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
          <>
            <div className="comp-progress-card">
              <div className="comp-progress-ring-wrap">
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <defs>
                    <linearGradient id="compProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#818CF8" />
                    </linearGradient>
                  </defs>
                  <circle className="comp-progress-ring-track" cx="28" cy="28" r={RADIUS} />
                  <circle
                    className="comp-progress-ring-value"
                    cx="28" cy="28" r={RADIUS}
                    strokeDasharray={CIRC}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="comp-progress-ring-text">{completeness}%</div>
              </div>
              <div className="comp-progress-info">
                <div className="comp-progress-title">Profile completeness</div>
                <div className="comp-progress-sub">
                  {completeness >= 100
                    ? "Your company profile is fully filled out."
                    : "Fill in the remaining details so quotations and invoices look their best."}
                </div>
              </div>
              {can("companies.edit") && completeness < 100 && (
                <button className="comp-edit-btn" style={{ padding: "9px 16px" }} onClick={() => setIsEditModalOpen(true)}>
                  <EditOutlined />
                  <span>Complete Profile</span>
                </button>
              )}
            </div>

            <CompanyDetailsView company={company} />
          </>
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
  <div className="comp-grid">
    {/* Basic info */}
    <div className="comp-card comp-span-2">
      <div className="comp-card-header">
        <span className="icon"><ShopOutlined /></span>
        Company Details
      </div>
      <div className="comp-card-body">
        <div className="comp-info-grid">
          {[
            ["Legal Name", company.legal_name, <SafetyCertificateOutlined key="i" />],
            ["GST No.", company.gst_no, <TagsOutlined key="i" />],
            ["Industry", company.industry, <ShopOutlined key="i" />],
            ["Registration", company.registration_number, <SafetyCertificateOutlined key="i" />],
            ["Website", company.website, <GlobalOutlined key="i" />],
            ["Email", company.primary_email, <MailOutlined key="i" />],
            ["Phone", company.primary_phone, <PhoneOutlined key="i" />],
          ]
            .filter(([, v]) => v)
            .map(([label, value, icon]) => (
              <div key={label as string} className="comp-info-row">
                <span className="comp-info-label">{icon}{label}</span>
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
