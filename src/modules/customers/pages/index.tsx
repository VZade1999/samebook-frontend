import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Input, Popconfirm, Space, Table, Tag, Typography, Grid, Empty, Pagination,
} from "antd";
import {
  DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined,
  MailOutlined, PhoneOutlined, BankOutlined, UserOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import EditCustomerModal from "../components/EditCustomerModal";
import AddCustomerModal from "../components/AddCustomerModal";
import { deleteCustomer, getCustomers } from "../redux/customerActions";
import CustomerDetailsDrawer from "../components/CustomerDetailsDrawer";

const { Search } = Input;
const { Text } = Typography;
const { useBreakpoint } = Grid;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Contact {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface Customer {
  id: number;
  display_name?: string;
  company_name?: string;
  customer_type?: string;
  contacts?: Contact[];
  gst_number?: string;
  industry?: string;
  created_at?: string;
}

// ─── Mobile Customer Card ─────────────────────────────────────────────────────
const CustomerCard: React.FC<{
  customer: Customer;
  onView: (c: Customer) => void;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}> = ({ customer, onView, onEdit, onDelete }) => {
  const contacts = customer.contacts || [];
  const emails = contacts.map((c) => c.email).filter(Boolean);
  const phones = contacts.map((c) => c.phone).filter(Boolean);
  const contactNames = contacts
    .map((c) => [c.first_name, c.last_name].filter(Boolean).join(" "))
    .filter(Boolean);

  const isBusinessType = customer.customer_type === "BUSINESS";

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button style={styles.cardNameBtn} onClick={() => onView(customer)}>
            {customer.display_name || "N/A"}
          </button>
          {customer.company_name && (
            <div style={styles.cardCompany}>{customer.company_name}</div>
          )}
        </div>
        {customer.customer_type && (
          <Tag
            color={isBusinessType ? "blue" : "green"}
            style={{ marginLeft: 8, flexShrink: 0, borderRadius: 6 }}
          >
            {customer.customer_type}
          </Tag>
        )}
      </div>

      {/* Info rows */}
      <div style={styles.cardBody}>
        {contactNames.length > 0 && (
          <div style={styles.cardRow}>
            <UserOutlined style={styles.cardIcon} />
            <span style={styles.cardValue}>{contactNames.join(", ")}</span>
          </div>
        )}
        {emails.length > 0 && (
          <div style={styles.cardRow}>
            <MailOutlined style={styles.cardIcon} />
            <span style={styles.cardValue}>{emails.join(", ")}</span>
          </div>
        )}
        {phones.length > 0 && (
          <div style={styles.cardRow}>
            <PhoneOutlined style={styles.cardIcon} />
            <span style={styles.cardValue}>{phones.join(", ")}</span>
          </div>
        )}
        {customer.gst_number && (
          <div style={styles.cardRow}>
            <BankOutlined style={styles.cardIcon} />
            <span style={styles.cardValue}>{customer.gst_number}</span>
          </div>
        )}
        {customer.industry && (
          <div style={styles.cardRow}>
            <span style={styles.cardLabel}>Industry</span>
            <span style={styles.cardValue}>{customer.industry}</span>
          </div>
        )}
        {customer.created_at && (
          <div style={styles.cardRow}>
            <span style={styles.cardLabel}>Added</span>
            <span style={{ ...styles.cardValue, color: "#aaa" }}>
              {new Date(customer.created_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.cardActions}>
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onView(customer)}
          style={styles.actionBtn}
        >
          View
        </Button>
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(customer)}
          style={styles.actionBtn}
        >
          Edit
        </Button>
        <Popconfirm
          title="Delete Customer"
          description="Are you sure you want to delete this customer?"
          okText="Yes"
          cancelText="No"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(customer)}
        >
          <Button size="small" danger icon={<DeleteOutlined />} style={styles.actionBtn}>
            Delete
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CustomerListPage: React.FC = () => {
  const dispatch = useDispatch();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { list, loading, pagination } = useSelector((state: any) => state.customers);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);

  const fetchCustomers = (customSearch?: string) => {
    dispatch(getCustomers({ page, limit, search: customSearch ?? search }));
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, limit]);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setPage(1);
        dispatch(getCustomers({ page: 1, limit, search: value }));
      }, 500),
    [limit],
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    debouncedSearch(value);
  };

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setEditCustomerOpen(true);
  };

  const handleDelete = (customer: any) => {
    dispatch(deleteCustomer(customer.id));
  };

  const handleView = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerDetailsOpen(true);
  };

  const columns = [
    {
      title: "Display Name",
      dataIndex: "display_name",
      key: "display_name",
      width: 230,
      render: (value: string, record: any) => (
        <div>
          <Text strong style={{ color: "#1677ff", cursor: "pointer" }}
            onClick={() => handleView(record)}>{value || "N/A"}</Text>
          {record.company_name && (
            <div><Text type="secondary" style={{ fontSize: 12 }}>{record.company_name}</Text></div>
          )}
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "customer_type",
      key: "customer_type",
      width: 120,
      render: (value: string) => (
        <Tag color={value === "BUSINESS" ? "blue" : "green"} style={{ borderRadius: 6 }}>{value}</Tag>
      ),
    },
    {
      title: "Contacts",
      dataIndex: "contacts",
      key: "contacts",
      width: 200,
      render: (contacts: Contact[]) => {
        if (!contacts?.length) return "-";
        return (
          <div>
            {contacts.map((c, i) => (
              <div key={i} style={{ fontSize: 13 }}>
                {[c.first_name, c.last_name].filter(Boolean).join(" ")}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: "Email",
      dataIndex: "contacts",
      key: "email",
      width: 230,
      render: (contacts: Contact[]) => {
        if (!contacts?.length) return "-";
        const emails = contacts.map((c) => c.email).filter(Boolean);
        return emails.length ? emails.join(", ") : "-";
      },
    },
    {
      title: "Phone",
      dataIndex: "contacts",
      key: "phone",
      width: 170,
      render: (contacts: Contact[]) => {
        if (!contacts?.length) return "-";
        const phones = contacts.map((c) => c.phone).filter(Boolean);
        return phones.length ? phones.join(", ") : "-";
      },
    },
    {
      title: "GST Number",
      dataIndex: "gst_number",
      key: "gst_number",
      width: 200,
      render: (v: string) => v || "-",
    },
    {
      title: "Industry",
      dataIndex: "industry",
      key: "industry",
      width: 160,
      render: (v: string) => v || "-",
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (v: string) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: "Action",
      key: "action",
      fixed: "right" as const,
      width: 140,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="text" icon={<EyeOutlined style={{ color: "#1677ff" }} />} onClick={() => handleView(record)} />
          <Button type="text" icon={<EditOutlined style={{ color: "#1677ff" }} />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Delete Customer"
            description="Are you sure you want to delete this customer?"
            okText="Yes" cancelText="No"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const total = pagination?.total || 0;
  const customerList: Customer[] = list || [];

  return (
    <div style={{ padding: isMobile ? 12 : 20, minHeight: "100vh" }}>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.pageTitle}>Customers</div>
          {total > 0 && <div style={styles.pageSubtitle}>{total} total</div>}
        </div>
        {!isMobile && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setAddCustomerOpen(true)}
          >
            Add Customer
          </Button>
        )}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <Search
          allowClear
          placeholder="Search by name, email, phone, GST…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          size="large"
          style={{ borderRadius: 10, width: "100%" }}
        />
      </div>

      {/* Content */}
      {isMobile ? (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: "#999" }}>Loading…</div>
          ) : customerList.length === 0 ? (
            <Empty description="No customers found" style={{ marginTop: 48 }} />
          ) : (
            customerList.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}

          {total > 0 && (
            <div style={styles.mobilePagination}>
              <span style={styles.paginationInfo}>
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </span>
              <Pagination
                current={page}
                pageSize={limit}
                total={total}
                simple
                onChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      ) : (
        /* Desktop table */
        <div style={styles.tableCard}>
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={customerList}
            scroll={{ x: 1600 }}
            pagination={{
              current: page,
              pageSize: limit,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              onChange: (currentPage, pageSize) => {
                setPage(currentPage);
                setLimit(pageSize);
              },
            }}
          />
        </div>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <button
          style={styles.fab}
          onClick={() => setAddCustomerOpen(true)}
          aria-label="Add Customer"
        >
          <PlusOutlined style={{ fontSize: 22, color: "#fff" }} />
        </button>
      )}

      {/* Modals & Drawers */}
      <AddCustomerModal open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} />
      <EditCustomerModal
        open={editCustomerOpen}
        customer={selectedCustomer}
        onClose={() => { setEditCustomerOpen(false); setSelectedCustomer(null); }}
      />
      <CustomerDetailsDrawer
        open={customerDetailsOpen}
        customer={selectedCustomer}
        onClose={() => { setCustomerDetailsOpen(false); setSelectedCustomer(null); }}
      />
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  pageHeader: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 16, flexWrap: "wrap", gap: 8,
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 13, color: "#999", marginTop: 2 },

  // Cards
  card: {
    background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,.07)", border: "1px solid #f0f0f0",
  },
  cardHeader: { display: "flex", alignItems: "flex-start", marginBottom: 10 },
  cardNameBtn: {
    background: "none", border: "none", cursor: "pointer", padding: 0,
    fontSize: 16, fontWeight: 600, color: "#1677ff", textAlign: "left",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
  },
  cardCompany: { fontSize: 12, color: "#888", marginTop: 2 },
  cardBody: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  cardRow: { display: "flex", alignItems: "baseline", gap: 6 },
  cardLabel: { fontSize: 12, color: "#aaa", minWidth: 60, flexShrink: 0 },
  cardIcon: { color: "#aaa", fontSize: 12, minWidth: 16, marginTop: 2 },
  cardValue: { fontSize: 13, color: "#333", wordBreak: "break-all" },
  cardActions: {
    display: "flex", gap: 8, paddingTop: 10,
    borderTop: "1px solid #f5f5f5", flexWrap: "wrap",
  },
  actionBtn: { borderRadius: 8, fontSize: 12 },

  // Pagination
  mobilePagination: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 16, flexWrap: "wrap", gap: 8,
  },
  paginationInfo: { fontSize: 12, color: "#999" },

  // FAB
  fab: {
    position: "fixed", bottom: 24, right: 20, width: 56, height: 56,
    borderRadius: "50%", background: "#1677ff", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 14px rgba(22,119,255,.45)", zIndex: 1000,
  },

  // Desktop table card
  tableCard: {
    background: "#fff", borderRadius: 12, padding: "4px 0",
    boxShadow: "0 1px 4px rgba(0,0,0,.08)",
    overflow: "hidden",
  },
};

export default CustomerListPage;