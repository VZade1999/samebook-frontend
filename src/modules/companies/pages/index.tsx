import React, { useEffect, useState } from "react";
import { Button, Empty, Grid, Spin, Tag } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { getCompanyDetails } from "../redux/companyActions";
import EditCompanyModal from "./EditCompany/EditCompanyModal";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";

const { useBreakpoint } = Grid;

const statusColor: Record<string, string> = {
  active: "green",
  inactive: "default",
  suspended: "red",
  pending: "orange",
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
// Self-service only: every user only ever sees and edits the single company
// they belong to — there is no list of companies, no create, no delete.
const CompanyPage: React.FC = () => {
  const dispatch = useDispatch();
  const { can } = useAccess();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
    <div style={{ padding: isMobile ? 12 : 20, minHeight: "100vh" }}>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {company?.logo && (
            <img
              src={company.logo}
              alt="logo"
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: "contain", background: "#f5f5f5" }}
            />
          )}
          <div>
            <div style={styles.pageTitle}>{company?.name || "My Company"}</div>
            {company && (
              <Tag color={statusColor[status] || "default"} style={{ marginTop: 4 }}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Tag>
            )}
          </div>
        </div>
        {can("companies.edit") && company && (
          <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditModalOpen(true)}>
            Edit Company
          </Button>
        )}
      </div>

      {/* Content */}
      {loading && !company ? (
        <div style={{ textAlign: "center", padding: 48, color: "#999" }}>
          <Spin />
        </div>
      ) : !company ? (
        <Empty description="Company details not found" style={{ marginTop: 48 }} />
      ) : (
        <CompanyDetailsView company={company} />
      )}

      {/* Edit modal */}
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
    <div style={styles.section}>
      <div style={styles.infoGrid}>
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
            <div key={label} style={styles.infoRow}>
              <span style={styles.infoLabel}>{label}</span>
              <span style={styles.infoValue}>{value}</span>
            </div>
          ))}
      </div>
    </div>

    <Section title="Addresses" icon="📍">
      {company.addresses?.length ? (
        company.addresses.slice().reverse().map((a: any, i: number) => (
          <DetailCard key={i}>
            <div style={styles.detailCardHeader}>
              <strong>{a.label || a.type || "Address"}</strong>
              {a.is_default && <Tag color="blue">Default</Tag>}
            </div>
            <div style={{ marginTop: 6, color: "#555" }}>
              {[a.line_1, a.line_2, a.city, a.state, a.country, a.postal_code].filter(Boolean).join(", ")}
            </div>
            {a.phone && <div style={styles.detailMeta}>Phone: {a.phone}</div>}
            {a.fax && <div style={styles.detailMeta}>Fax: {a.fax}</div>}
            {a.notes && <div style={styles.detailMeta}>{a.notes}</div>}
          </DetailCard>
        ))
      ) : <Empty description="No addresses" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </Section>

    <Section title="Locations" icon="🏢">
      {company.locations?.length ? (
        company.locations.slice().reverse().map((l: any, i: number) => (
          <DetailCard key={i}>
            <div style={styles.detailCardHeader}>
              <strong>{l.name || "Location"}</strong>
              {l.location_type && <Tag>{l.location_type}</Tag>}
            </div>
            <div style={{ marginTop: 6, color: "#555" }}>
              {[l.address_line_1, l.address_line_2, l.address_city, l.address_state, l.address_country, l.address_postal_code].filter(Boolean).join(", ")}
            </div>
            {l.manager_name && <div style={styles.detailMeta}>Manager: {l.manager_name} {l.manager_phone ? `(${l.manager_phone})` : ""}</div>}
            {l.notes && <div style={styles.detailMeta}>{l.notes}</div>}
          </DetailCard>
        ))
      ) : <Empty description="No locations" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </Section>

    <Section title="Bank Accounts" icon="🏦">
      {company.bank_accounts?.length ? (
        company.bank_accounts.slice().reverse().map((b: any, i: number) => (
          <DetailCard key={i}>
            <div style={styles.detailCardHeader}>
              <strong>{b.bank_name || "Bank Account"}</strong>
              {b.is_default && <Tag color="blue">Default</Tag>}
            </div>
            <div style={{ marginTop: 6 }}>
              {b.account_holder_name && <div style={styles.detailMeta}>Holder: {b.account_holder_name}</div>}
              {b.account_number && <div style={styles.detailMeta}>Account: {b.account_number}</div>}
              {b.ifsc_code && <div style={styles.detailMeta}>IFSC/Routing: {b.ifsc_code}</div>}
              {b.account_type && <div style={styles.detailMeta}>Type: {b.account_type}</div>}
              {b.branch_name && <div style={styles.detailMeta}>Branch: {b.branch_name}</div>}
              {b.branch_address && <div style={styles.detailMeta}>Address: {b.branch_address}</div>}
              {b.notes && <div style={styles.detailMeta}>{b.notes}</div>}
            </div>
          </DetailCard>
        ))
      ) : <Empty description="No bank accounts" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </Section>

    <Section title="Metadata" icon="🏷️">
      {company.metadata?.length ? (
        company.metadata.slice().reverse().map((m: any, i: number) => (
          <DetailCard key={i}>
            <div style={styles.detailCardHeader}>
              <span><strong>{m.key}</strong>: {m.value}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {m.data_type && <Tag>{m.data_type}</Tag>}
                {m.is_sensitive && <Tag color="red">Sensitive</Tag>}
              </div>
            </div>
          </DetailCard>
        ))
      ) : <Empty description="No metadata" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </Section>
  </div>
);

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div style={{ marginTop: 24 }}>
    <div style={styles.sectionTitle}>
      <span style={{ marginRight: 6 }}>{icon}</span>{title}
    </div>
    <div style={{ marginTop: 10 }}>{children}</div>
  </div>
);

const DetailCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={styles.detailCard}>{children}</div>
);

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  pageHeader: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 20, flexWrap: "wrap", gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "var(--foreground)", letterSpacing: -0.3 },

  section: {
    background: "#fafafa", borderRadius: 10, padding: 14, marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15, fontWeight: 600, color: "var(--foreground)", paddingBottom: 4,
    borderBottom: "2px solid var(--border)",
  },
  infoGrid: { display: "flex", flexDirection: "column", gap: 8 },
  infoRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  infoLabel: { fontSize: 12, color: "#999", minWidth: 100, flexShrink: 0 },
  infoValue: { fontSize: 13, color: "#222", fontWeight: 500 },

  detailCard: {
    background: "#fff", border: "1px solid #eef0f4", borderRadius: 10,
    padding: 12, marginBottom: 10,
  },
  detailCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 },
  detailMeta: { fontSize: 13, color: "#666", marginTop: 4 },
};

export default CompanyPage;
