import React, { useEffect, useState } from "react";
import {
  Table, Input, Pagination, Card, Space, Empty, Button, Popconfirm,
  Drawer, Divider, Typography, Tag, Grid
} from "antd";
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  EyeFilled, BankOutlined, MailOutlined, PhoneOutlined, GlobalOutlined
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import type { TableColumnsType } from "antd";
import { deleteCompany, getCompanies } from "../redux/companyActions";
import AddCompanyModal from "./CreateCompany/AddCompanyModal";
import EditCompanyModal from "./EditCompany/EditCompanyModal";
import { useAccess } from "@/permissions/useAccess";

const { useBreakpoint } = Grid;

interface Company {
  id: number;
  name: string;
  company_prefix?: string;
  legal_name?: string;
  registration_number?: string;
  tax_id?: string;
  website?: string;
  industry?: string;
  primary_email?: string;
  primary_phone?: string;
  status?: string;
  logo?: string;
  created_at?: string;
  addresses?: any[];
  locations?: any[];
  bank_accounts?: any[];
  metadata?: any[];
}

const statusColor: Record<string, string> = {
  active: "green",
  inactive: "default",
  suspended: "red",
  pending: "orange",
};

// ─── Mobile Card ───────────────────────────────────────────────────────────────
const CompanyCard: React.FC<{
  company: Company;
  canEdit: boolean;
  canDelete: boolean;
  onView: (c: Company) => void;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
}> = ({ company, canEdit, canDelete, onView, onEdit, onDelete }) => {
  const status = company.status || "active";
  const addr = (company.addresses || []).at(-1);
  const addrStr = addr
    ? [addr.line_1, addr.city, addr.state, addr.country].filter(Boolean).join(", ")
    : null;

  return (
    <div style={styles.mobileCard}>
      {/* Header row */}
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button style={styles.cardNameBtn} onClick={() => onView(company)}>
            {company.name}
          </button>
          {company.legal_name && (
            <div style={styles.cardSubtitle}>{company.legal_name}</div>
          )}
        </div>
        <Tag color={statusColor[status] || "default"} style={{ marginLeft: 8, flexShrink: 0 }}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      </div>

      {/* Info rows */}
      <div style={styles.cardBody}>
        {company.industry && (
          <div style={styles.cardRow}>
            <span style={styles.cardLabel}>Industry</span>
            <span style={styles.cardValue}>{company.industry}</span>
          </div>
        )}
        {company.primary_email && (
          <div style={styles.cardRow}>
            <MailOutlined style={styles.cardIcon} />
            <span style={styles.cardValue}>{company.primary_email}</span>
          </div>
        )}
        {company.primary_phone && (
          <div style={styles.cardRow}>
            <PhoneOutlined style={styles.cardIcon} />
            <span style={styles.cardValue}>{company.primary_phone}</span>
          </div>
        )}
        {addrStr && (
          <div style={styles.cardRow}>
            <span style={styles.cardLabel}>Address</span>
            <span style={{ ...styles.cardValue, color: "#666" }}>{addrStr}</span>
          </div>
        )}
        {company.tax_id && (
          <div style={styles.cardRow}>
            <span style={styles.cardLabel}>Tax ID</span>
            <span style={styles.cardValue}>{company.tax_id}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.cardActions}>
        <Button
          size="small"
          icon={<EyeFilled />}
          onClick={() => onView(company)}
          style={styles.actionBtn}
        >
          View
        </Button>
        {canEdit && (
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(company)}
            style={styles.actionBtn}
          >
            Edit
          </Button>
        )}
        {canDelete && (
          <Popconfirm
            title="Delete Company"
            description="Are you sure you want to delete this company?"
            onConfirm={() => onDelete(company)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={styles.actionBtn}>
              Delete
            </Button>
          </Popconfirm>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const CompanyPage: React.FC = () => {
  const dispatch = useDispatch();
  const { can } = useAccess();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsCompany, setDetailsCompany] = useState<any | null>(null);

  const companyState = useSelector((state: any) => state.companies);
  const companies = companyState?.companies || { companies: [], pagination: {} };
  const pagination = companies?.pagination || {};
  const total = pagination?.total || 0;
  const loading = companyState?.loading || false;
  const companyList: Company[] = companies?.companies || [];

  useEffect(() => {
    dispatch(getCompanies({ search: search || undefined, page, limit: pageSize }));
  }, [dispatch, page, pageSize, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDelete = (record: Company) => dispatch(deleteCompany(record.id));
  const handleEdit = (record: Company) => { setSelectedCompany(record); setIsEditModalOpen(true); };
  const openDetails = (record: any) => { setDetailsCompany(record); setDetailsVisible(true); };
  const closeDetails = () => { setDetailsVisible(false); setDetailsCompany(null); };

  const columns: TableColumnsType<Company> = [
    {
      title: "Name", dataIndex: "name", key: "name", width: 220,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input allowClear placeholder="Search name…" value={search}
            onChange={(e) => handleSearch(e.target.value)} style={{ width: 200 }} />
        </div>
      ),
      filterIcon: <SearchOutlined />,
      render: (v, r) => <Button type="link" onClick={() => openDetails(r)}>{v}</Button>,
    },
    { title: "Legal Name", dataIndex: "legal_name", key: "legal_name", width: 200, render: (v) => v || "–" },
    { title: "Tax ID", dataIndex: "tax_id", key: "tax_id", width: 160, render: (v) => v || "–" },
    { title: "Industry", dataIndex: "industry", key: "industry", width: 160, render: (v) => v || "–" },
    { title: "Email", dataIndex: "primary_email", key: "primary_email", width: 210, render: (v) => v || "–" },
    { title: "Phone", dataIndex: "primary_phone", key: "primary_phone", width: 160, render: (v) => v || "–" },
    {
      title: "Address", dataIndex: "addresses", key: "addresses", width: 300,
      render: (_, r) => {
        const a = (r.addresses || []).at(-1);
        if (!a) return "–";
        return [a.line_1, a.line_2, a.city, a.state, a.country, a.postal_code].filter(Boolean).join(", ") || "–";
      },
    },
    {
      title: "Locations", dataIndex: "locations", key: "locations", width: 180,
      render: (_, r) => {
        const locs = r.locations || [];
        if (!locs.length) return "–";
        const l = locs.at(-1);
        return l?.name || `${locs.length} locations`;
      },
    },
    {
      title: "Metadata", dataIndex: "metadata", key: "metadata", width: 200,
      render: (_, r) => {
        const md = r.metadata || [];
        if (!md.length) return "–";
        const m = md.at(-1);
        return m?.key ? `${m.key}: ${m.value}` : `${md.length} items`;
      },
    },
    {
      title: "Status", dataIndex: "status", key: "status", width: 110,
      render: (v) => {
        const s = v || "active";
        return <Tag color={statusColor[s] || "default"}>{s.charAt(0).toUpperCase() + s.slice(1)}</Tag>;
      },
    },
    {
      title: "Action", key: "action", fixed: "right", width: 130,
      render: (_, r) => (
        <Space size="small">
          <Button type="link" onClick={() => openDetails(r)} icon={<EyeFilled style={{ color: "#1677ff" }} />} />
          {can("companies.edit") && (
            <Button type="text" icon={<EditOutlined style={{ color: "#1677ff" }} />} onClick={() => handleEdit(r)} />
          )}
          {can("companies.delete") && (
            <Popconfirm title="Delete Company" description="Are you sure?" onConfirm={() => handleDelete(r)}
              okText="Yes" cancelText="No" okButtonProps={{ danger: true }}>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 20, minHeight: "100vh" }}>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.pageTitle}>Companies</div>
          {total > 0 && <div style={styles.pageSubtitle}>{total} total</div>}
        </div>
        {can("companies.create") && !isMobile && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} size="large">
            Add Company
          </Button>
        )}
      </div>

      {/* Search */}
      <div style={styles.searchBar}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: "#bbb" }} />}
          placeholder="Search companies…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          size="large"
          style={{ borderRadius: 10 }}
        />
      </div>

      {/* Content */}
      {isMobile ? (
        /* ── Mobile cards ── */
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: "#999" }}>Loading…</div>
          ) : companyList.length === 0 ? (
            <Empty description="No companies found" style={{ marginTop: 48 }} />
          ) : (
            companyList.map((c) => (
              <CompanyCard
                key={c.id}
                company={c}
                canEdit={can("companies.edit")}
                canDelete={can("companies.delete")}
                onView={openDetails}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}

          {total > 0 && (
            <div style={styles.mobilePagination}>
              <div style={styles.paginationInfo}>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </div>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                simple
                onChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      ) : (
        /* ── Desktop table ── */
        <Card style={{ borderRadius: 12, border: "none", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <Table
            columns={columns}
            dataSource={companyList.map((c) => ({ ...c, key: c.id }))}
            pagination={false}
            loading={loading}
            bordered={false}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="No companies found" /> }}
            style={{ borderRadius: 8, overflow: "hidden" }}
          />
          {total > 0 && (
            <div style={styles.desktopPagination}>
              <div style={{ color: "#888", fontSize: 13 }}>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </div>
              <Pagination
                current={page} pageSize={pageSize} total={total}
                showSizeChanger showQuickJumper
                pageSizeOptions={["5", "10", "25", "50"]}
                onChange={(p) => setPage(p)}
                onShowSizeChange={(_, s) => { setPageSize(s); setPage(1); }}
              />
            </div>
          )}
        </Card>
      )}

      {/* Mobile FAB */}
      {isMobile && can("companies.create") && (
        <button style={styles.fab} onClick={() => setIsModalOpen(true)} aria-label="Add Company">
          <PlusOutlined style={{ fontSize: 22, color: "#fff" }} />
        </button>
      )}

      {/* Modals */}
      <AddCompanyModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <EditCompanyModal
        open={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedCompany(null); }}
        company={selectedCompany}
      />

      {/* Detail Drawer */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {detailsCompany?.logo && (
              <img src={detailsCompany.logo} alt="logo"
                style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain", background: "#f5f5f5" }} />
            )}
            <span>{detailsCompany?.name || "Company Details"}</span>
          </div>
        }
        placement="right"
        onClose={closeDetails}
        open={detailsVisible}
        width={isMobile ? "100%" : 680}
        styles={{ body: { padding: isMobile ? 16 : 24 } }}
      >
        {detailsCompany ? <DrawerContent company={detailsCompany} /> : null}
      </Drawer>
    </div>
  );
};

// ─── Drawer Content ────────────────────────────────────────────────────────────
const DrawerContent: React.FC<{ company: any }> = ({ company }) => (
  <div>
    {/* Basic info */}
    <div style={styles.drawerSection}>
      <div style={styles.infoGrid}>
        {[
          ["Legal Name", company.legal_name],
          ["Tax ID", company.tax_id],
          ["Industry", company.industry],
          ["Registration", company.registration_number],
          ["Website", company.website],
          ["Email", company.primary_email],
          ["Phone", company.primary_phone],
          ["Status", company.status || "active"],
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

    <DrawerSection title="Addresses" icon="📍">
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
    </DrawerSection>

    <DrawerSection title="Locations" icon="🏢">
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
    </DrawerSection>

    <DrawerSection title="Bank Accounts" icon="🏦">
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
    </DrawerSection>

    <DrawerSection title="Metadata" icon="🏷️">
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
    </DrawerSection>
  </div>
);

const DrawerSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div style={{ marginTop: 24 }}>
    <div style={styles.drawerSectionTitle}>
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
    marginBottom: 16, flexWrap: "wrap", gap: 8,
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 13, color: "#999", marginTop: 2 },
  searchBar: { marginBottom: 16 },

  // Mobile cards
  mobileCard: {
    background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,.07)", border: "1px solid #f0f0f0",
  },
  cardHeader: { display: "flex", alignItems: "flex-start", marginBottom: 10 },
  cardNameBtn: {
    background: "none", border: "none", cursor: "pointer", padding: 0,
    fontSize: 16, fontWeight: 600, color: "#1677ff", textAlign: "left",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
  },
  cardSubtitle: { fontSize: 12, color: "#888", marginTop: 2 },
  cardBody: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 },
  cardRow: { display: "flex", alignItems: "baseline", gap: 6 },
  cardLabel: { fontSize: 12, color: "#aaa", minWidth: 64, flexShrink: 0 },
  cardIcon: { color: "#aaa", fontSize: 12, minWidth: 16 },
  cardValue: { fontSize: 13, color: "#333", wordBreak: "break-all" },
  cardActions: { display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid #f5f5f5", flexWrap: "wrap" },
  actionBtn: { borderRadius: 8, fontSize: 12 },

  // Pagination
  mobilePagination: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 16, flexWrap: "wrap", gap: 8,
  },
  paginationInfo: { fontSize: 12, color: "#999" },
  desktopPagination: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 20, paddingTop: 16, borderTop: "1px solid #f5f5f5", flexWrap: "wrap", gap: 10,
  },

  // FAB
  fab: {
    position: "fixed", bottom: 24, right: 20, width: 56, height: 56,
    borderRadius: "50%", background: "#1677ff", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 14px rgba(22,119,255,.45)", zIndex: 1000,
    transition: "transform .15s",
  },

  // Drawer
  drawerSection: {
    background: "#fafafa", borderRadius: 10, padding: 14, marginBottom: 4,
  },
  drawerSectionTitle: {
    fontSize: 15, fontWeight: 600, color: "#1a1a2e", paddingBottom: 4,
    borderBottom: "2px solid #e8f0fe",
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