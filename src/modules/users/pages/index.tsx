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
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import AddUserModal from "../components/AddUserModal";
import EditUserModal from "../components/EditUserModal";
import { getUsers, deleteUser } from "../redux/usersActions";
import { TeamOutlined } from "@ant-design/icons";
import ManageUserRolesModal from "../../user-management/components/ManageUserRolesModal";

const { Search } = Input;
const { Text } = Typography;

const UsersPage = () => {
  const dispatch = useDispatch();

  const { list, loading, pagination } = useSelector(
    (state: any) => state.users,
  );

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [rolesModalOpen, setRolesModalOpen] = useState(false);

  const fetchUsers = (customSearch?: string, customPage: number = 1) => {
    dispatch(
      getUsers({
        page: customPage,
        limit,
        search: customSearch ?? search,
      }) as any,
    );
  };

  useEffect(() => {
    fetchUsers(undefined, page);
  }, [page, limit]);

  const debouncedSearch = useMemo(
    () =>
      debounce((searchValue: string) => {
        fetchUsers(searchValue, 1);
      }, 500),
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
    } catch (error) {
      message.error("Failed to delete user");
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditUserOpen(true);
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (_: any, record: any) => (
        <Text>
          {record.first_name} {record.last_name}
        </Text>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Roles",
      dataIndex: "roles",
      key: "roles",
      render: (roles: any[]) => (
        <Space size={[0, 8]} wrap>
          {roles?.map((role: any) => (
            <Tag color="blue" key={role.id}>
              {role.name}
            </Tag>
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
      render: (_: any, record: any) => (
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
            onClick={() => {
              setSelectedUser(record);
              setRolesModalOpen(true);
            }}
          >
            Roles
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flex: 1 }}>
          <Search
            placeholder="Search by name or email..."
            onChange={handleSearch}
            value={search}
            style={{ maxWidth: "400px" }}
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
          onClick={() => setAddUserOpen(true)}
        >
          Add User
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={list}
        loading={loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize: limit,
          total: pagination.total,
          onChange: (newPage) => setPage(newPage),
          onShowSizeChange: (_, newLimit) => {
            setLimit(newLimit);
            setPage(1);
          },
        }}
      />

      <AddUserModal
        visible={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSuccess={() => {
          setPage(1);
          fetchUsers();
        }}
      />

      <EditUserModal
        visible={editUserOpen}
        user={selectedUser}
        onClose={() => {
          setEditUserOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          fetchUsers();
        }}
      />
      <ManageUserRolesModal
        visible={rolesModalOpen}
        user={selectedUser}
        onClose={() => {
          setRolesModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          fetchUsers();
        }}
      />
    </div>
  );
};

export default UsersPage;
