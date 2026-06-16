import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Button,
  Input,
  Table,
  Popconfirm,
  Space,
  message,
} from 'antd';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';

import debounce from 'lodash/debounce';

import { useDispatch, useSelector } from 'react-redux';

import {
  getPermissions,
  deletePermission,
} from '../redux/permissionsActions';

import AddPermissionModal from '../components/AddPermissionModal';
import EditPermissionModal from '../components/EditPermissionModal';

const { Search } = Input;

const PermissionsPage = () => {
  const dispatch = useDispatch();

  const { list, loading, pagination } =
    useSelector(
      (state: any) => state.permissions,
    );

  const [page, setPage] = useState(1);

  const [limit] = useState(10);

  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);

  const [selectedPermission, setSelectedPermission] =
    useState<any>(null);

  const fetchPermissions = (
    searchValue?: string,
    pageValue = 1,
  ) => {
    dispatch(
      getPermissions({
        page: pageValue,
        limit,
        search: searchValue ?? search,
      }) as any,
    );
  };

  useEffect(() => {
    fetchPermissions(undefined, page);
  }, [page]);

  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        fetchPermissions(value, 1);
      }, 500),
    [],
  );

  const columns = [
    {
      title: 'Permission',
      dataIndex: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
    },
    {
      title: 'Actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedPermission(record);
              setEditOpen(true);
            }}
          />

          <Popconfirm
            title="Delete Permission?"
            onConfirm={async () => {
              await dispatch(
                deletePermission(
                  record.id,
                ) as any,
              );

              message.success(
                'Permission deleted',
              );

              fetchPermissions();
            }}
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
          placeholder="Search permission"
          onChange={(e) => {
            setSearch(e.target.value);
            debouncedSearch(
              e.target.value,
            );
          }}
          style={{ width: 300 }}
        />

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddOpen(true)}
        >
          Add Permission
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

      <AddPermissionModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() =>
          fetchPermissions()
        }
      />

      <EditPermissionModal
        visible={editOpen}
        permission={selectedPermission}
        onClose={() =>
          setEditOpen(false)
        }
        onSuccess={() =>
          fetchPermissions()
        }
      />
    </>
  );
};

export default PermissionsPage;