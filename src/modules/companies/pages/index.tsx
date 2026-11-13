import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Tooltip } from "antd";
import {
  BankOutlined,
  CheckCircleFilled,
  CopyOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleFilled,
  FileProtectOutlined,
  FileTextOutlined,
  GlobalOutlined,
  IdcardOutlined,
  MailOutlined,
  NumberOutlined,
  PhoneOutlined,
  PlusOutlined,
  ProfileOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  SolutionOutlined,
  TagsOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { getCompanyDetails } from "../redux/companyActions";
import EditCompanyModal from "./EditCompany/EditCompanyModal";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";
import {
  AddressCard,
  BankCard,
  Checklist,
  CopyBtn,
  DocNumber,
  FieldTile,
  Letterhead,
  LocationCard,
  MetaRow,
  Panel,
  Terms,
} from "../components/CompanyParts";
import {
  companyCardText,
  copyText,
  distinctLegalName,
  gstinLooksValid,
  initials,
  memberSince,
  panFromGstin,
  profileChecklist,
  sellerState,
  truthy,
  updatedAgo,
  websiteHref,
  websiteText,
} from "../utils/companyView";
import "../styles/company.scss";

// ─── Main Page ─────────────────────────────────────────────────────────────────
// Self-service only: every user only ever sees and edits the single company
// they belong to — there is no list of companies, no create, no delete.
const CompanyPage: React.FC = () => {
  const dispatch = useDispatch();
  const { can } = useAccess();
  const canEdit = can("companies.edit");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const companyState = useSelector((state: any) => state.companies);
  const company = companyState?.companyDetails;
  const loading = companyState?.loading || false;

  const load = useCallback(() => {
    const storageService = new StorageService();
    let companyId: number | undefined;
    try {
      const stored = storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
      companyId = stored ? JSON.parse(stored)?.id : undefined;
    } catch {
      companyId = undefined;
    }
    if (companyId) dispatch(getCompanyDetails(companyId));
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const checklist = useMemo(() => profileChecklist(company), [company]);
  const done = checklist.filter((c) => c.done).length;
  const strength = checklist.length ? Math.round((done / checklist.length) * 100) : 0;
  const nextUp = checklist.find((c) => !c.done);

  const openEdit = canEdit && company ? () => setIsEditModalOpen(true) : undefined;

  if (loading && !company) return <Skeleton />;

  if (!company) {
    return (
      <div className="cp-root">
        <div className="cp-hero cp-hero-min">
          <div className="cp-hero-orb a" />
          <div className="cp-hero-grid" />
          <div className="cp-hero-inner">
            <div className="cp-hero-left">
              <div className="cp-eyebrow">Company profile</div>
              <h1 className="cp-name">We couldn't load your company</h1>
              <p className="cp-hero-note">Check your connection and try again.</p>
              <button className="cp-btn white" onClick={load}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const status = String(company.status || "active");
  const active = status.toLowerCase() === "active" && company.is_active !== 0;
  const state = sellerState(company);
  const pan = panFromGstin(company.gst_no);
  const gstValid = gstinLooksValid(company.gst_no);
  const since = memberSince(company.created_at);
  const edited = updatedAgo(company.updated_at);
  const addresses: any[] = company.addresses || [];
  const locations: any[] = company.locations || [];
  const banks: any[] = company.bank_accounts || [];
  const metadata: any[] = company.metadata || [];
  // Default first, then newest first (matches how the old page listed them).
  const byDefault = (list: any[]) =>
    list
      .slice()
      .reverse()
      .sort((a, b) => Number(truthy(b.is_default)) - Number(truthy(a.is_default)));

  const R = 46;
  const C = 2 * Math.PI * R;

  const editBtn = (label = "Edit") =>
    openEdit ? (
      <button type="button" className="cp-head-btn" onClick={openEdit}>
        <EditOutlined /> {label}
      </button>
    ) : null;

  const emptyBlock = (icon: React.ReactNode, title: string, sub: string, cta?: string) => (
    <div className="cp-empty">
      <span className="cp-empty-icon">{icon}</span>
      <b>{title}</b>
      <span>{sub}</span>
      {cta && openEdit && (
        <button type="button" className="cp-btn primary sm" onClick={openEdit}>
          <PlusOutlined /> {cta}
        </button>
      )}
    </div>
  );

  return (
    <div className="cp-root">
      {/* ── Hero ── */}
      <div className="cp-hero">
        <div className="cp-hero-orb a" />
        <div className="cp-hero-orb b" />
        <div className="cp-hero-orb c" />
        <div className="cp-hero-grid" />
        <div className="cp-hero-inner">
          <div className="cp-hero-left">
            <div className="cp-eyebrow">
              <span className={`cp-live${active ? "" : " off"}`} />
              {active ? "Active" : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="cp-dot-sep" />
              Company profile
              {since && (
                <>
                  <span className="cp-dot-sep" />
                  On SameBook since {since}
                </>
              )}
            </div>

            <div className="cp-identity">
              <div className="cp-logo">
                {company.logo ? <img src={company.logo} alt={`${company.name} logo`} /> : <span>{initials(company.name)}</span>}
                {openEdit && (
                  <button type="button" className="cp-logo-edit" onClick={openEdit} aria-label="Change logo">
                    <EditOutlined />
                  </button>
                )}
              </div>
              <div className="cp-identity-text">
                <h1 className="cp-name">
                  {company.name || "My Company"}
                  {company.company_prefix && (
                    <Tooltip title="Company prefix used in document numbers">
                      <span className="cp-prefix">#{company.company_prefix}</span>
                    </Tooltip>
                  )}
                </h1>
                <div className="cp-sub">
                  {[distinctLegalName(company), company.industry]
                    .filter(Boolean)
                    .join("  ·  ") || "Your company's identity, addresses and payment details"}
                </div>
              </div>
            </div>

            <div className="cp-hero-chips">
              {company.gst_no ? (
                <span className="cp-gchip">
                  <SafetyCertificateOutlined />
                  GSTIN <b className="mono">{company.gst_no}</b>
                  {gstValid ? (
                    <Tooltip title="Format looks right">
                      <CheckCircleFilled className="cp-ok" />
                    </Tooltip>
                  ) : (
                    <Tooltip title="This doesn't look like a 15-character GSTIN — please double-check it">
                      <ExclamationCircleFilled className="cp-warn" />
                    </Tooltip>
                  )}
                  <CopyBtn text={company.gst_no} label="Copy GSTIN" what="GSTIN copied" small />
                </span>
              ) : (
                openEdit && (
                  <button type="button" className="cp-gchip add" onClick={openEdit}>
                    <PlusOutlined /> Add GSTIN
                  </button>
                )
              )}
              {state && (
                <span className="cp-gchip">
                  <EnvironmentOutlined /> {state.name}
                  <em>{state.code}</em>
                </span>
              )}
              {pan && (
                <span className="cp-gchip">
                  <IdcardOutlined /> PAN <b className="mono">{pan}</b>
                  <CopyBtn text={pan} label="Copy PAN" what="PAN copied" small />
                </span>
              )}
            </div>

            <div className="cp-hero-stats">
              {[
                { icon: <EnvironmentOutlined />, n: addresses.length, label: addresses.length === 1 ? "Address" : "Addresses" },
                { icon: <ShopOutlined />, n: locations.length, label: locations.length === 1 ? "Location" : "Locations" },
                { icon: <BankOutlined />, n: banks.length, label: banks.length === 1 ? "Bank account" : "Bank accounts" },
                { icon: <TagsOutlined />, n: metadata.length, label: metadata.length === 1 ? "Custom field" : "Custom fields" },
              ].map((s, i) => (
                <div key={s.label} className="cp-hero-stat" style={{ ["--i" as any]: i }}>
                  <span className="cp-hero-stat-icon">{s.icon}</span>
                  <b>{s.n}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="cp-hero-right">
            <div className="cp-strength">
              <div className="cp-ring" role="img" aria-label={`Profile ${strength}% complete`}>
                <svg viewBox="0 0 110 110" width="110" height="110">
                  <defs>
                    <linearGradient id="cpRingGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#a5f3fc" />
                      <stop offset="100%" stopColor="#c4b5fd" />
                    </linearGradient>
                  </defs>
                  <circle cx="55" cy="55" r={R} className="cp-ring-track" />
                  <circle
                    cx="55"
                    cy="55"
                    r={R}
                    className="cp-ring-value"
                    strokeDasharray={C}
                    style={{ ["--off" as any]: C - (strength / 100) * C, ["--full" as any]: C }}
                  />
                </svg>
                <div className="cp-ring-text">
                  <b>{strength}%</b>
                  <span>complete</span>
                </div>
              </div>
              <div className="cp-strength-text">
                <span className="cp-strength-label">Profile strength</span>
                <b>
                  {strength >= 100 ? (
                    <>
                      <TrophyOutlined /> All set
                    </>
                  ) : strength >= 75 ? (
                    "Almost there"
                  ) : strength >= 40 ? (
                    "Getting there"
                  ) : (
                    "Just started"
                  )}
                </b>
                <span>
                  {done} of {checklist.length} details added
                  {nextUp ? (
                    <>
                      {" "}· next: <u>{nextUp.label.toLowerCase()}</u>
                    </>
                  ) : null}
                </span>
              </div>
            </div>
            <div className="cp-hero-btns">
              <button className="cp-btn glass" onClick={() => copyText(companyCardText(company), "Company details copied — paste them anywhere")}>
                <CopyOutlined /> Copy details
              </button>
              {openEdit && (
                <button className="cp-btn white" onClick={openEdit}>
                  <EditOutlined /> Edit company
                </button>
              )}
            </div>
            {edited && <div className="cp-updated">Last updated {edited}</div>}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <main className="cp-grid">
        <Panel
          className="s7"
          index={0}
          icon={<SolutionOutlined />}
          title="Business identity"
          sub="How your company is named and reached"
          action={editBtn()}
        >
          <div className="cp-fields">
            <FieldTile icon={<FileProtectOutlined />} label="Legal name" value={company.legal_name} onAdd={openEdit} />
            <FieldTile icon={<ProfileOutlined />} label="Registration number" value={company.registration_number} mono onAdd={openEdit} />
            <FieldTile
              icon={<SafetyCertificateOutlined />}
              label="GSTIN"
              value={company.gst_no}
              mono
              onAdd={openEdit}
              badge={company.gst_no ? <span className={`cp-mini-badge ${gstValid ? "ok" : "warn"}`}>{gstValid ? "Valid format" : "Check format"}</span> : null}
            />
            <FieldTile icon={<ShopOutlined />} label="Industry" value={company.industry} onAdd={openEdit} copy={false} />
            <FieldTile icon={<MailOutlined />} label="Email" value={company.primary_email} href={company.primary_email ? `mailto:${company.primary_email}` : null} onAdd={openEdit} />
            <FieldTile icon={<PhoneOutlined />} label="Phone" value={company.primary_phone} href={company.primary_phone ? `tel:${company.primary_phone}` : null} onAdd={openEdit} />
            <FieldTile
              icon={<GlobalOutlined />}
              label="Website"
              value={company.website ? websiteText(company.website) : null}
              href={websiteHref(company.website)}
              external
              onAdd={openEdit}
            />
            <FieldTile icon={<NumberOutlined />} label="Company prefix" value={company.company_prefix} mono onAdd={openEdit} />
          </div>
          <div className="cp-subhead">How your document numbers look</div>
          <DocNumber prefix={company.company_prefix} />
        </Panel>

        <Panel
          className="s5"
          index={1}
          icon={<TrophyOutlined />}
          tint="var(--cp-good)"
          title="Profile checklist"
          sub={strength >= 100 ? "Everything customers see on your documents is filled in" : "Complete these so quotations and invoices look their best"}
        >
          <Checklist items={checklist} onFix={openEdit} />
        </Panel>

        <Panel
          className="s5"
          index={2}
          icon={<BankOutlined />}
          tint="var(--cp-violet)"
          title="Bank accounts"
          count={banks.length}
          sub="Where customers pay you"
          action={editBtn(banks.length ? "Edit" : "Add")}
        >
          {banks.length ? (
            <div className="cp-banks">
              {byDefault(banks).map((b, i) => (
                <BankCard key={b.id ?? i} bank={b} index={i} />
              ))}
            </div>
          ) : (
            emptyBlock(<BankOutlined />, "No bank account yet", "Add one so it prints on invoices and customers know where to pay.", "Add bank account")
          )}
        </Panel>

        <Panel
          className="s7"
          index={3}
          icon={<EnvironmentOutlined />}
          tint="var(--cp-teal)"
          title="Addresses"
          count={addresses.length}
          sub="Office, billing and warehouse addresses"
          action={editBtn(addresses.length ? "Edit" : "Add")}
        >
          {addresses.length ? (
            <div className="cp-addrs">
              {byDefault(addresses).map((a, i) => (
                <AddressCard key={a.id ?? i} a={a} index={i} />
              ))}
            </div>
          ) : (
            emptyBlock(<EnvironmentOutlined />, "No address yet", "Your address appears on every quotation, invoice and delivery challan.", "Add address")
          )}
        </Panel>

        <Panel
          className="s7"
          index={4}
          icon={<FileTextOutlined />}
          tint="var(--cp-accent)"
          title="Letterhead preview"
          sub="Roughly how your details appear at the top and bottom of documents"
        >
          <Letterhead c={company} />
        </Panel>

        {/* Two shorter panels stacked beside the letterhead */}
        <div className="cp-stack">
          <Panel
            index={5}
            icon={<FileProtectOutlined />}
            tint="var(--cp-amber)"
            title="Default terms & conditions"
            sub="Filled in automatically on new quotations"
            action={
              <span className="cp-head-tools">
                {company.default_terms_conditions?.trim() && (
                  <CopyBtn text={company.default_terms_conditions} label="Copy terms" what="Terms copied" />
                )}
                {editBtn()}
              </span>
            }
          >
            {company.default_terms_conditions?.trim() ? (
              <Terms text={company.default_terms_conditions} />
            ) : (
              emptyBlock(<FileProtectOutlined />, "No default terms", "Set payment, delivery and warranty terms once and reuse them on every quotation.", "Add terms")
            )}
          </Panel>

          <Panel
            className="cp-grow"
            index={6}
            icon={<TagsOutlined />}
            tint="var(--cp-pink)"
            title="Custom fields"
            count={metadata.length}
            sub="Extra details such as licence or MSME numbers"
            action={editBtn(metadata.length ? "Edit" : "Add")}
          >
            {metadata.length ? (
              <ul className="cp-metas">
                {metadata
                  .slice()
                  .reverse()
                  .map((m, i) => (
                    <MetaRow key={m.id ?? i} m={m} />
                  ))}
              </ul>
            ) : (
              emptyBlock(<TagsOutlined />, "No custom fields", "Keep things like an FSSAI licence, MSME/Udyam number or IEC code here.", "Add a field")
            )}
          </Panel>
        </div>

        <Panel
          index={7}
          icon={<ShopOutlined />}
          tint="var(--cp-teal)"
          title="Locations"
          count={locations.length}
          sub="Branches, shops and warehouses"
          action={editBtn(locations.length ? "Edit" : "Add")}
        >
          {locations.length ? (
            <div className="cp-locs">
              {locations
                .slice()
                .reverse()
                .map((l, i) => (
                  <LocationCard key={l.id ?? i} l={l} index={i} />
                ))}
            </div>
          ) : (
            <div className="cp-empty wide">
              <span className="cp-empty-icon">
                <ShopOutlined />
              </span>
              <div className="cp-empty-copy">
                <b>No locations yet</b>
                <span>Add branches, shops or warehouses — each can have its own manager, opening hours and GSTIN.</span>
              </div>
              {openEdit && (
                <button type="button" className="cp-btn primary sm" onClick={openEdit}>
                  <PlusOutlined /> Add location
                </button>
              )}
            </div>
          )}
        </Panel>
      </main>

      {/* ── Edit modal ── */}
      <EditCompanyModal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} company={company} />
    </div>
  );
};

const Skeleton: React.FC = () => (
  <div className="cp-root">
    <div className="cp-hero cp-hero-sk">
      <div className="cp-hero-grid" />
      <div className="cp-hero-inner">
        <div className="cp-hero-left">
          <div className="cp-sk w30" />
          <div className="cp-sk-row">
            <div className="cp-sk logo" />
            <div style={{ flex: 1 }}>
              <div className="cp-sk w60 tall" />
              <div className="cp-sk w40" />
            </div>
          </div>
          <div className="cp-sk w50" />
        </div>
      </div>
    </div>
    <div className="cp-grid">
      <div className="cp-panel s7 sk" />
      <div className="cp-panel s5 sk" />
    </div>
  </div>
);

export default CompanyPage;
