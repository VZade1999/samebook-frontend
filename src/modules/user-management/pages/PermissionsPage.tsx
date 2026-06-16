import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Input,
  Pagination,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import debounce from 'lodash/debounce';
import { useDispatch, useSelector } from 'react-redux';
import { getPermissions, deletePermission } from '../redux/permissionsActions';
import AddPermissionModal from '../components/AddPermissionModal';
import EditPermissionModal from '../components/EditPermissionModal';

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
  const id = 'permissions-page-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .pp-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pp-toolbar-left {
      display: flex;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }
    .pp-search { width: 300px; }

    /* Permission card */
    .pp-perm-card {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 10px;
      transition: box-shadow 0.2s;
    }
    .pp-perm-card:active { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .pp-perm-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .pp-perm-name {
      font-weight: 700;
      font-size: 15px;
      color: #1677ff;
    }
    .pp-perm-desc {
      font-size: 13px;
      color: #595959;
      line-height: 1.5;
      margin-bottom: 12px;
    }
    .pp-perm-card-actions {
      display: flex;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid #f0f0f0;
    }
    .pp-perm-card-actions .ant-btn { flex: 1; font-size: 13px; }

    /* Pagination */
    .pp-pagination-wrap {
      display: flex;
      justify-content: center;
      margin-top: 16px;
    }

    @media (max-width: 767px) {
      .pp-search { width: 100%; }
      .pp-toolbar { flex-direction: column; align-items: stretch; }
      .pp-toolbar-left { width: 100%; }
      .pp-add-btn { width: 100%; }
    }
  `;
  document.head.appendChild(style);
};
injectStyles();

const PermissionsPage = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();

  const { list, loading, pagination } = useSelector((state: any) => state.permissions);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<any>(null);

  const fetchPermissions = (searchValue?: string, pageValue = 1) => {
    dispatch(getPermissions({ page: pageValue, limit, search: searchValue ?? search }) as any);
  };

  useEffect(() => { fetchPermissions(undefined, page); }, [page]);

  const debouncedSearch = useMemo(
    () => debounce((value: string) => { fetchPermissions(value, 1); }, 500),
    [],
  );

  const openEdit = (record: any) => { setSelectedPermission(record); setEditOpen(true); };

  const handleDelete = async (id: number) => {
    await dispatch(deletePermission(id) as any);
    message.success('Permission deleted');
    fetchPermissions();
  };

  // ─── Shared actions ───────────────────────────────────────────────────────
  const RowActions = ({ record, block = false }: { record: any; block?: boolean }) => (
    <Space size="small" style={block ? { width: '100%', display: 'flex' } : {}}>
      <Button
        type="primary"
        size="small"
        icon={<EditOutlined />}
        style={block ? { flex: 1 } : {}}
        onClick={() => openEdit(record)}
      >
        {block ? 'Edit' : ''}
      </Button>
      <Popconfirm
        title="Delete Permission?"
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
  const PermissionCard = ({ record }: { record: any }) => (
    <div className="pp-perm-card">
      <div className="pp-perm-card-header">
        <span className="pp-perm-name">{record.name}</span>
        <Tag icon={<KeyOutlined />} color="purple" style={{ margin: 0 }}>Permission</Tag>
      </div>
      <div className="pp-perm-desc">{record.description || 'No description provided.'}</div>
      <div className="pp-perm-card-actions">
        <RowActions record={record} block />
      </div>
    </div>
  );

  // ─── Desktop columns ──────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Permission',
      dataIndex: 'name',
      render: (name: string) => <Text strong style={{ color: '#722ed1' }}>{name}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (desc: string) => <Text type="secondary">{desc || '—'}</Text>,
    },
    {
      title: 'Actions',
      width: 120,
      render: (_: any, record: any) => <RowActions record={record} />,
    },
  ];

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="pp-toolbar">
        <div className="pp-toolbar-left">
          <Search
            placeholder="Search permissions..."
            value={search}
            allowClear
            className="pp-search"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              debouncedSearch(e.target.value);
            }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchPermissions()}
            loading={loading}
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="pp-add-btn"
          onClick={() => setAddOpen(true)}
        >
          Add Permission
        </Button>
      </div>

      {/* ── List: cards on mobile, table on desktop ── */}
      {isMobile ? (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>Loading...</div>
          ) : list?.length === 0 ? (
            <Empty description="No permissions found" style={{ marginTop: 32 }} />
          ) : (
            list.map((perm: any) => <PermissionCard key={perm.id} record={perm} />)
          )}

          {pagination?.total > 0 && (
            <div className="pp-pagination-wrap">
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
          locale={{ emptyText: <Empty description="No permissions found" /> }}
          pagination={{
            current: page,
            total: pagination?.total,
            pageSize: limit,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['5', '10', '25', '50'],
            onChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      {/* ── Modals (unchanged) ── */}
      <AddPermissionModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => fetchPermissions()}
      />
      <EditPermissionModal
        visible={editOpen}
        permission={selectedPermission}
        onClose={() => { setEditOpen(false); setSelectedPermission(null); }}
        onSuccess={() => fetchPermissions()}
      />
    </>
  );
};

export default PermissionsPage;