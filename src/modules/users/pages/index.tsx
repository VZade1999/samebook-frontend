import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Empty,
  Pagination,
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
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import AddUserModal from "../components/AddUserModal";
import EditUserModal from "../components/EditUserModal";
import { getUsers, deleteUser } from "../redux/usersActions";
import ManageUserRolesModal from "../../user-management/components/ManageUserRolesModal";

const { Search } = Input;
const { Text } = Typography;

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

// ─── Inject styles once ───────────────────────────────────────────────────────
const injectStyles = () => {
  const id = "users-page-styles";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    .up-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .up-toolbar-left {
      display: flex;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }
    .up-search { max-width: 400px; width: 100%; }

    /* Mobile card */
    .up-user-card {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 10px;
    }
    .up-user-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .up-user-name {
      font-weight: 600;
      font-size: 15px;
      color: #262626;
    }
    .up-user-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #595959;
      margin-bottom: 4px;
    }
    .up-user-meta .anticon { color: #8c8c8c; font-size: 11px; }
    .up-roles-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 8px 0;
    }
    .up-user-card-actions {
      display: flex;
      gap: 6px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #f0f0f0;
      justify-content: flex-end;
    }

    /* Pagination on mobile */
    .up-pagination-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
    @media (max-width: 767px) {
      .up-search { max-width: 100%; }
      .up-toolbar { flex-direction: column; align-items: stretch; }
      .up-toolbar-left { width: 100%; }
      .up-add-btn { width: 100%; }
      .up-pagination-wrap { justify-content: center; }
    }
  `;
  document.head.appendChild(style);
};
injectStyles();

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

  const handleDeleteUser = async (userId: number) => {
    try {
      await dispatch(deleteUser(userId) as any);
      message.success("User deleted successfully");
      fetchUsers();
    } catch {
      message.error("Failed to delete user");
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
        <Text>{record.first_name} {record.last_name}</Text>
      ),
    },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    {
      title: "Roles",
      dataIndex: "roles",
      key: "roles",
      render: (roles: any[]) => (
        <Space size={[0, 6]} wrap>
          {roles?.map((role: any) => (
            <Tag color="blue" key={role.id}>{role.name}</Tag>
          ))}
        </Space>
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
      width: 150,
      render: (_: any, record: any) => <RowActions record={record} />,
    },
  ];

  // ─── Shared action buttons ────────────────────────────────────────────────
  const RowActions = ({ record }: { record: any }) => (
    <Space size="small">
      <Button
        type="primary"
        size="small"
        icon={<EditOutlined />}
        onClick={() => handleEditUser(record)}
      />
      <Popconfirm
        title="Delete User"
        description="Are you sure you want to delete this user?"
        onConfirm={() => handleDeleteUser(record.id)}
        okText="Yes"
        cancelText="No"
      >
        <Button danger size="small" icon={<DeleteOutlined />} />
      </Popconfirm>
      <Button
        size="small"
        icon={<TeamOutlined />}
        onClick={() => { setSelectedUser(record); setRolesModalOpen(true); }}
      >
        Roles
      </Button>
    </Space>
  );

  // ─── Mobile card per user ─────────────────────────────────────────────────
  const UserCard = ({ record }: { record: any }) => (
    <div className="up-user-card">
      <div className="up-user-card-header">
        <div>
          <div className="up-user-name">
            {record.first_name} {record.last_name}
          </div>
          <div className="up-user-meta" style={{ marginTop: 4 }}>
            <MailOutlined />
            <span>{record.email}</span>
          </div>
          {record.phone && (
            <div className="up-user-meta">
              <PhoneOutlined />
              <span>{record.phone}</span>
            </div>
          )}
          <div className="up-user-meta">
            <CalendarOutlined />
            <span>{new Date(record.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {record.roles?.length > 0 && (
        <div className="up-roles-wrap">
          {record.roles.map((role: any) => (
            <Tag color="blue" key={role.id}>{role.name}</Tag>
          ))}
        </div>
      )}

      <div className="up-user-card-actions">
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEditUser(record)}
        >
          Edit
        </Button>
        <Button
          size="small"
          icon={<TeamOutlined />}
          onClick={() => { setSelectedUser(record); setRolesModalOpen(true); }}
        >
          Roles
        </Button>
        <Popconfirm
          title="Delete User"
          description="Are you sure you want to delete this user?"
          onConfirm={() => handleDeleteUser(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button danger size="small" icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      </div>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      {/* ── Toolbar ── */}
      <div className="up-toolbar">
        <div className="up-toolbar-left">
          <Search
            placeholder="Search by name or email..."
            onChange={handleSearch}
            value={search}
            className="up-search"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchUsers()}
            loading={loading}
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="up-add-btn"
          onClick={() => setAddUserOpen(true)}
        >
          Add User
        </Button>
      </div>

      {/* ── List: cards on mobile, table on desktop ── */}
      {isMobile ? (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32, color: "#8c8c8c" }}>Loading...</div>
          ) : list?.length === 0 ? (
            <Empty description="No users found" style={{ marginTop: 32 }} />
          ) : (
            list.map((user: any) => <UserCard key={user.id} record={user} />)
          )}

          {pagination?.total > 0 && (
            <div className="up-pagination-wrap">
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
      )}

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