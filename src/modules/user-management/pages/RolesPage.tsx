import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Input,
  Pagination,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  Empty,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import debounce from 'lodash/debounce';
import { getRoles, deleteRole } from '../redux/rolesActions';
import AddRoleModal from '../components/AddRoleModal';
import EditRoleModal from '../components/EditRoleModal';
import ManageRolePermissionsModal from '../components/ManageRolePermissionsModal';

const { Search } = Input;
const { Text } = Typography;

// ─── Responsive hook ──────────────────────────────────────────────────────────
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const injectStyles = () => {
  const id = 'roles-page-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .rp-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 8px;
      flex-wrap: wrap;
    }
    .rp-toolbar-left {
      display: flex;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }
    .rp-search { width: 300px; }

    /* Mobile card */
    .rp-role-card {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 10px;
      transition: box-shadow 0.2s;
    }
    .rp-role-card:active { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .rp-role-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .rp-role-name {
      font-weight: 700;
      font-size: 15px;
      color: #1677ff;
    }
    .rp-role-desc {
      font-size: 13px;
      color: #595959;
      line-height: 1.5;
      margin-bottom: 12px;
    }
    .rp-role-card-actions {
      display: flex;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid #f0f0f0;
    }
    .rp-role-card-actions .ant-btn {
      flex: 1;
      font-size: 13px;
    }

    /* Pagination */
    .rp-pagination-wrap {
      display: flex;
      justify-content: center;
      margin-top: 16px;
    }

    @media (max-width: 767px) {
      .rp-search { width: 100%; }
      .rp-toolbar { flex-direction: column; align-items: stretch; }
      .rp-toolbar-left { width: 100%; }
      .rp-add-btn { width: 100%; }
    }
  `;
  document.head.appendChild(style);
};
injectStyles();

const RolesPage = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  const { list, loading, pagination } = useSelector((state: any) => state.roles);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const fetchRoles = (customSearch?: string, customPage = 1) => {
    dispatch(getRoles({ page: customPage, limit, search: customSearch ?? search }) as any);
  };

  useEffect(() => { fetchRoles(undefined, page); }, [page, limit]);

  const debouncedSearch = useMemo(
    () => debounce((value: string) => { fetchRoles(value, 1); }, 500),
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

  const openPermissions = (record: any) => { setSelectedRole(record); setPermissionOpen(true); };
  const openEdit      = (record: any) => { setSelectedRole(record); setEditOpen(true); };

  // ─── Desktop columns ──────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Role',
      dataIndex: 'name',
      render: (name: string) => <Text strong style={{ color: '#1677ff' }}>{name}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (desc: string) => <Text type="secondary">{desc || '—'}</Text>,
    },
    {
      title: 'Actions',
      width: 160,
      render: (_: any, record: any) => <RowActions record={record} />,
    },
  ];

  // ─── Shared action row (used in table + cards) ────────────────────────────
  const RowActions = ({ record, block = false }: { record: any; block?: boolean }) => (
    <Space size="small" style={block ? { width: '100%', display: 'flex' } : {}}>
      <Button
        icon={<SafetyOutlined />}
        size="small"
        onClick={() => openPermissions(record)}
        style={block ? { flex: 1 } : {}}
      >
        {block ? 'Permissions' : ''}
      </Button>
      <Button
        icon={<EditOutlined />}
        size="small"
        type="primary"
        onClick={() => openEdit(record)}
        style={block ? { flex: 1 } : {}}
      >
        {block ? 'Edit' : ''}
      </Button>
      <Popconfirm
        title="Delete Role?"
        description="This action cannot be undone."
        onConfirm={() => handleDelete(record.id)}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ danger: true }}
      >
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          style={block ? { flex: 1 } : {}}
        >
          {block ? 'Delete' : ''}
        </Button>
      </Popconfirm>
    </Space>
  );

  // ─── Mobile card ──────────────────────────────────────────────────────────
  const RoleCard = ({ record }: { record: any }) => (
    <div className="rp-role-card">
      <div className="rp-role-card-header">
        <span className="rp-role-name">{record.name}</span>
        <Tag icon={<SafetyOutlined />} color="blue" style={{ margin: 0 }}>Role</Tag>
      </div>
      <div className="rp-role-desc">{record.description || 'No description provided.'}</div>
      <div className="rp-role-card-actions">
        <RowActions record={record} block />
      </div>
    </div>
  );

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="rp-toolbar">
        <div className="rp-toolbar-left">
          <Search
            placeholder="Search roles..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              debouncedSearch(e.target.value);
            }}
            className="rp-search"
            allowClear
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchRoles()}
            loading={loading}
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="rp-add-btn"
          onClick={() => setAddOpen(true)}
        >
          Add Role
        </Button>
      </div>

      {/* ── List: cards on mobile, table on desktop ── */}
      {isMobile ? (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>Loading...</div>
          ) : list?.length === 0 ? (
            <Empty description="No roles found" style={{ marginTop: 32 }} />
          ) : (
            list.map((role: any) => <RoleCard key={role.id} record={role} />)
          )}

          {pagination?.total > 0 && (
            <div className="rp-pagination-wrap">
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
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="No roles found" /> }}
          pagination={{
            current: page,
            total: pagination?.total,
            pageSize: limit,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['5', '10', '25', '50'],
            onChange: (newPage) => setPage(newPage),
            onShowSizeChange: (_, newLimit) => { setLimit(newLimit); setPage(1); },
          }}
        />
      )}

      {/* ── Modals (unchanged) ── */}
      <AddRoleModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => fetchRoles()}
      />
      <EditRoleModal
        visible={editOpen}
        role={selectedRole}
        onClose={() => { setEditOpen(false); setSelectedRole(null); }}
        onSuccess={() => fetchRoles()}
      />
      <ManageRolePermissionsModal
        visible={permissionOpen}
        role={selectedRole}
        onClose={() => { setPermissionOpen(false); setSelectedRole(null); }}
      />
    </>
  );
};

export default RolesPage;