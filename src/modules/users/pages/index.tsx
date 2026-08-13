import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Tag,
  Empty,
  Pagination,
  Popconfirm,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import AddUserModal from "../components/AddUserModal";
import EditUserModal from "../components/EditUserModal";
import { getUsers, deleteUser } from "../redux/usersActions";
import ManageUserRolesModal from "../../user-management/components/ManageUserRolesModal";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Mirrors the invoice/quotation/customers/companies design system exactly
// (--inv-*/--qt-*/--cus-*/--comp-* prefixes) so this page reads as part of the same app.
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --usr-bg: var(--background);
      --usr-surface: var(--card);
      --usr-border: var(--border);
      --usr-accent: #4F46E5;
      --usr-accent-light: #EEF2FF;
      --usr-text: var(--foreground);
      --usr-muted: var(--muted-foreground);
      --usr-radius: 12px;
      --usr-radius-sm: 8px;
      --usr-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --usr-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }

    .usr-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--usr-bg);
      min-height: 100vh;
      color: var(--usr-text);
    }

    /* ── Page header ── */
    .usr-header {
      background: #1E1B4B;
      padding: 28px 28px 52px;
      position: relative;
      overflow: hidden;
    }
    .usr-header::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0; height: 28px;
      background: var(--usr-bg); border-radius: 24px 24px 0 0;
    }
    .usr-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .usr-header-content {
      position: relative; z-index: 1;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .usr-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700; color: #fff; letter-spacing: -0.5px;
      display: flex; align-items: center; gap: 12px;
    }
    .usr-page-title-icon {
      width: 36px; height: 36px; background: rgba(255,255,255,0.15);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .usr-page-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 6px; padding-left: 48px; }
    .usr-add-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #fff; color: var(--usr-accent);
      border: none; border-radius: var(--usr-radius-sm); font-size: 13px; font-weight: 700;
      cursor: pointer; box-shadow: var(--usr-shadow-md); transition: all .15s;
      white-space: nowrap; font-family: 'Inter', sans-serif;
    }
    .usr-add-btn:hover { background: var(--usr-accent-light); transform: translateY(-1px); }

    /* ── Toolbar ── */
    .usr-toolbar { padding: 0 24px; margin-top: -18px; position: relative; z-index: 2; margin-bottom: 16px; }
    .usr-toolbar-inner {
      background: var(--usr-surface); border: 1px solid var(--usr-border);
      border-radius: var(--usr-radius); box-shadow: var(--usr-shadow);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .usr-search-wrap { position: relative; flex: 1; min-width: 200px; }
    .usr-search-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--usr-muted); font-size: 14px; pointer-events: none;
    }
    .usr-search {
      width: 100%; padding: 8px 12px 8px 34px;
      border: 1px solid var(--usr-border); border-radius: var(--usr-radius-sm);
      font-size: 13px; font-family: 'Inter', sans-serif; color: var(--usr-text);
      background: var(--muted); outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .usr-search:focus {
      border-color: var(--usr-accent); box-shadow: 0 0 0 3px rgba(79,70,229,.1); background: var(--usr-surface);
    }
    .usr-search::placeholder { color: var(--usr-muted); }
    .usr-icon-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1px solid var(--usr-border);
      border-radius: var(--usr-radius-sm); background: var(--muted);
      color: var(--usr-text); font-size: 13px; font-weight: 500;
      font-family: 'Inter', sans-serif; cursor: pointer;
      transition: all .15s; white-space: nowrap;
    }
    .usr-icon-btn:hover { background: var(--usr-accent-light); border-color: var(--usr-accent); color: var(--usr-accent); }
    .usr-icon-btn:disabled { opacity: .6; cursor: not-allowed; }

    /* ── Body ── */
    .usr-body { padding: 0 24px 40px; }

    /* ── Card ── */
    .usr-card {
      background: var(--usr-surface); border: 1px solid var(--usr-border);
      border-radius: var(--usr-radius); box-shadow: var(--usr-shadow); overflow: hidden;
    }

    /* ── Table overrides ── */
    .usr-table-wrap .ant-table { font-size: 13px !important; font-family: 'Inter', sans-serif !important; }
    .usr-table-wrap .ant-table-thead > tr > th {
      background: var(--muted) !important; color: var(--usr-muted) !important;
      font-size: 11px !important; font-weight: 600 !important;
      text-transform: uppercase !important; letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--usr-border) !important; padding: 10px 16px !important;
    }
    .usr-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid var(--usr-border) !important; padding: 12px 16px !important; vertical-align: middle !important;
    }
    .usr-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .usr-table-wrap .ant-table-tbody > tr:hover > td { background: var(--muted) !important; }

    /* ── Row action buttons ── */
    .usr-row-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--usr-border);
      background: var(--usr-surface); color: var(--usr-text); cursor: pointer; transition: all .15s;
      font-size: 13px;
    }
    .usr-row-btn.primary { background: var(--usr-accent); border-color: var(--usr-accent); color: #fff; }
    .usr-row-btn.primary:hover { background: #4338CA; }
    .usr-row-btn.danger { color: #DC2626; border-color: #FCA5A5; }
    .usr-row-btn.danger:hover { background: #FFF5F5; }
    .usr-row-btn.wide { width: auto; padding: 0 10px; }
    .usr-row-btn:disabled { opacity: .6; cursor: not-allowed; }

    /* ── Mobile card ── */
    .usr-user-card {
      background: var(--usr-surface); border: 1px solid var(--usr-border);
      border-radius: var(--usr-radius); box-shadow: var(--usr-shadow);
      padding: 14px 16px; margin-bottom: 12px;
    }
    .usr-user-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .usr-user-name { font-weight: 700; font-size: 15px; color: var(--usr-text); }
    .usr-user-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--usr-muted); margin-bottom: 4px; }
    .usr-roles-wrap { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0; }
    .usr-user-card-actions {
      display: flex; gap: 8px; margin-top: 10px; padding-top: 10px;
      border-top: 1px solid var(--usr-border); justify-content: flex-end;
    }

    /* ── Loading / empty ── */
    .usr-loading { text-align: center; padding: 48px 0; color: var(--usr-muted); }
    .usr-pagination-wrap { display: flex; justify-content: center; margin-top: 16px; }

    /* ── Responsive ── */
    @media (max-width: 767px) {
      .usr-header { padding: 20px 16px 44px; }
      .usr-toolbar { padding: 0 16px; }
      .usr-body { padding: 0 16px 40px; }
      .usr-add-btn span { display: none; }
      .usr-page-subtitle { padding-left: 0; margin-top: 8px; }
    }
  `}</style>
);

// ─── Responsive hook ──────────────────────────────────────────────────────────
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
};

const UsersPage = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();

  const { list, loading, pagination } = useSelector((state: any) => state.users);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [rolesModalOpen, setRolesModalOpen] = useState(false);

  const fetchUsers = (customSearch?: string, customPage: number = 1) => {
    dispatch(getUsers({ page: customPage, limit, search: customSearch ?? search }) as any);
  };

  useEffect(() => {
    fetchUsers(undefined, page);
  }, [page, limit]);

  const debouncedSearch = useMemo(
    () => debounce((val: string) => { fetchUsers(val, 1); }, 500),
    [],
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setPage(1);
    debouncedSearch(value);
  };

  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const handleDeleteUser = async (userId: number) => {
    setDeletingUserId(userId);
    try {
      await (dispatch(deleteUser(userId) as any)).unwrap();
      message.success("User deleted successfully");
      fetchUsers();
    } catch {
      message.error("Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditUserOpen(true);
  };

  // ─── Desktop columns ──────────────────────────────────────────────────────
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (_: any, record: any) => (
        <span style={{ fontWeight: 600 }}>{record.first_name} {record.last_name}</span>
      ),
    },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Phone", dataIndex: "phone", key: "phone", render: (v: string) => v || "—" },
    {
      title: "Roles",
      dataIndex: "roles",
      key: "roles",
      render: (roles: any[]) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {roles?.length ? roles.map((role: any) => (
            <Tag color="blue" key={role.id} style={{ margin: 0 }}>{role.name}</Tag>
          )) : <span style={{ color: "var(--usr-muted)" }}>—</span>}
        </div>
      ),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_: any, record: any) => <RowActions record={record} />,
    },
  ];

  // ─── Shared action buttons ────────────────────────────────────────────────
  const RowActions = ({ record }: { record: any }) => (
    <div style={{ display: "flex", gap: 6 }}>
      <button className="usr-row-btn primary" onClick={() => handleEditUser(record)} title="Edit">
        <EditOutlined />
      </button>
      <button
        className="usr-row-btn wide"
        onClick={() => { setSelectedUser(record); setRolesModalOpen(true); }}
        title="Manage roles"
      >
        <TeamOutlined /> Roles
      </button>
      <Popconfirm
        title="Delete User"
        description="Are you sure you want to delete this user?"
        onConfirm={() => handleDeleteUser(record.id)}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ danger: true }}
      >
        <button className="usr-row-btn danger" disabled={deletingUserId === record.id} title="Delete">
          <DeleteOutlined />
        </button>
      </Popconfirm>
    </div>
  );

  // ─── Mobile card per user ─────────────────────────────────────────────────
  const UserCard = ({ record }: { record: any }) => (
    <div className="usr-user-card">
      <div className="usr-user-card-header">
        <div>
          <div className="usr-user-name">
            {record.first_name} {record.last_name}
          </div>
          <div className="usr-user-meta" style={{ marginTop: 4 }}>
            <MailOutlined />
            <span>{record.email}</span>
          </div>
          {record.phone && (
            <div className="usr-user-meta">
              <PhoneOutlined />
              <span>{record.phone}</span>
            </div>
          )}
          <div className="usr-user-meta">
            <CalendarOutlined />
            <span>{new Date(record.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {record.roles?.length > 0 && (
        <div className="usr-roles-wrap">
          {record.roles.map((role: any) => (
            <Tag color="blue" key={role.id}>{role.name}</Tag>
          ))}
        </div>
      )}

      <div className="usr-user-card-actions">
        <button className="usr-row-btn primary wide" onClick={() => handleEditUser(record)}>
          <EditOutlined /> Edit
        </button>
        <button className="usr-row-btn wide" onClick={() => { setSelectedUser(record); setRolesModalOpen(true); }}>
          <TeamOutlined /> Roles
        </button>
        <Popconfirm
          title="Delete User"
          description="Are you sure you want to delete this user?"
          onConfirm={() => handleDeleteUser(record.id)}
          okText="Yes"
          cancelText="No"
          okButtonProps={{ danger: true }}
        >
          <button className="usr-row-btn danger wide" disabled={deletingUserId === record.id}>
            <DeleteOutlined /> Delete
          </button>
        </Popconfirm>
      </div>
    </div>
  );

  return (
    <div className="usr-root">
      <GlobalStyles />

      {/* ── Page header ── */}
      <div className="usr-header">
        <div className="usr-header-noise" />
        <div className="usr-header-content">
          <div>
            <div className="usr-page-title">
              <div className="usr-page-title-icon">
                <UserOutlined />
              </div>
              Users
            </div>
            <div className="usr-page-subtitle">Manage your team members and their access</div>
          </div>
          <button className="usr-add-btn" onClick={() => setAddUserOpen(true)}>
            <PlusOutlined />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="usr-toolbar">
        <div className="usr-toolbar-inner">
          <div className="usr-search-wrap">
            <SearchOutlined className="usr-search-icon" />
            <input
              className="usr-search"
              placeholder="Search by name or email..."
              value={search}
              onChange={handleSearch}
            />
          </div>
          <button className="usr-icon-btn" onClick={() => fetchUsers()} disabled={loading}>
            <ReloadOutlined spin={loading} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="usr-body">
        {isMobile ? (
          <>
            {loading ? (
              <div className="usr-loading">Loading…</div>
            ) : list?.length === 0 ? (
              <div className="usr-card"><Empty description="No users found" style={{ padding: 32 }} /></div>
            ) : (
              list.map((user: any) => <UserCard key={user.id} record={user} />)
            )}

            {pagination?.total > 0 && (
              <div className="usr-pagination-wrap">
                <Pagination
                  simple
                  current={page}
                  pageSize={limit}
                  total={pagination.total}
                  onChange={(newPage) => setPage(newPage)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="usr-card usr-table-wrap">
            <Table
              columns={columns}
              dataSource={list}
              loading={loading}
              rowKey="id"
              scroll={{ x: "max-content" }}
              locale={{ emptyText: <Empty description="No users found" /> }}
              pagination={{
                current: page,
                pageSize: limit,
                total: pagination?.total,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ["5", "10", "25", "50"],
                onChange: (newPage) => setPage(newPage),
                onShowSizeChange: (_, newLimit) => { setLimit(newLimit); setPage(1); },
              }}
            />
          </div>
        )}
      </div>

      {/* ── Modals (unchanged) ── */}
      <AddUserModal
        visible={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSuccess={() => { setPage(1); fetchUsers(); }}
      />
      <EditUserModal
        visible={editUserOpen}
        user={selectedUser}
        onClose={() => { setEditUserOpen(false); setSelectedUser(null); }}
        onSuccess={() => fetchUsers()}
      />
      <ManageUserRolesModal
        visible={rolesModalOpen}
        user={selectedUser}
        onClose={() => { setRolesModalOpen(false); setSelectedUser(null); }}
        onSuccess={() => fetchUsers()}
      />
    </div>
  );
};

export default UsersPage;
