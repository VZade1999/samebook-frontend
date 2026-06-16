import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Input,
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
} from 'antd';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

import { useDispatch, useSelector } from 'react-redux';
import debounce from 'lodash/debounce';

import {
  getRoles,
  deleteRole,
} from '../redux/rolesActions';

import AddRoleModal from '../components/AddRoleModal';
import EditRoleModal from '../components/EditRoleModal';
import ManageRolePermissionsModal from '../components/ManageRolePermissionsModal';


const { Search } = Input;
const { Text } = Typography;

const RolesPage = () => {
  const dispatch = useDispatch();

  const { list, loading, pagination } =
    useSelector((state: any) => state.roles);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);

  const [permissionOpen, setPermissionOpen] =
    useState(false);

  const [selectedRole, setSelectedRole] =
    useState<any>(null);

  const fetchRoles = (
    customSearch?: string,
    customPage: number = 1,
  ) => {
    dispatch(
      getRoles({
        page: customPage,
        limit,
        search: customSearch ?? search,
      }) as any,
    );
  };

  useEffect(() => {
    fetchRoles(undefined, page);
  }, [page, limit]);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        fetchRoles(value, 1);
      }, 500),
    [],
  );

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteRole(id) as any);
      message.success('Role deleted');
      fetchRoles();
    } catch {
      message.error('Delete failed');
    }
  };

  const columns = [
    {
      title: 'Role',
      dataIndex: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
    },
    {
      title: 'Actions',
      width: 180,
      render: (_: any, record: any) => (
        <Space>
          <Button
            icon={<SafetyOutlined />}
            size="small"
            onClick={() => {
              setSelectedRole(record);
              setPermissionOpen(true);
            }}
          />

          <Button
            icon={<EditOutlined />}
            size="small"
            type="primary"
            onClick={() => {
              setSelectedRole(record);
              setEditOpen(true);
            }}
          />

          <Popconfirm
            title="Delete Role?"
            onConfirm={() =>
              handleDelete(record.id)
            }
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Search
          placeholder="Search role..."
          onChange={(e) => {
            setSearch(e.target.value);
            debouncedSearch(e.target.value);
          }}
          style={{ width: 300 }}
        />

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddOpen(true)}
        >
          Add Role
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={{
          current: page,
          total: pagination.total,
          pageSize: limit,
          onChange: setPage,
        }}
      />

      <AddRoleModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => fetchRoles()}
      />

      <EditRoleModal
        visible={editOpen}
        role={selectedRole}
        onClose={() => {
          setEditOpen(false);
          setSelectedRole(null);
        }}
        onSuccess={() => fetchRoles()}
      />

      <ManageRolePermissionsModal
        visible={permissionOpen}
        role={selectedRole}
        onClose={() => {
          setPermissionOpen(false);
          setSelectedRole(null);
        }}
      />
    </>
  );
};

export default RolesPage;