import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Tag,
  Empty,
  Pagination,
  Popconfirm,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import debounce from 'lodash/debounce';
import { getRoles, deleteRole } from '../redux/rolesActions';
import AddRoleModal from '../components/AddRoleModal';
import EditRoleModal from '../components/EditRoleModal';
import ManageRolePermissionsModal from '../components/ManageRolePermissionsModal';

// ─── Design tokens ────────────────────────────────────────────────────────────
// Mirrors the invoice/quotation/customers/companies/users design system exactly
// (--inv-*/--qt-*/--cus-*/--comp-*/--usr-* prefixes) so this page reads as part of the same app.
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --rol-bg: var(--background);
      --rol-surface: var(--card);
      --rol-border: var(--border);
      --rol-accent: #4F46E5;
      --rol-accent-light: #EEF2FF;
      --rol-text: var(--foreground);
      --rol-muted: var(--muted-foreground);
      --rol-radius: 12px;
      --rol-radius-sm: 8px;
      --rol-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --rol-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }

    .rol-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--rol-bg);
      min-height: 100vh;
      color: var(--rol-text);
    }

    /* ── Page header ── */
    .rol-header {
      background: #1E1B4B;
      padding: 28px 28px 52px;
      position: relative;
      overflow: hidden;
    }
    .rol-header::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0; height: 28px;
      background: var(--rol-bg); border-radius: 24px 24px 0 0;
    }
    .rol-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .rol-header-content {
      position: relative; z-index: 1;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .rol-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700; color: #fff; letter-spacing: -0.5px;
      display: flex; align-items: center; gap: 12px;
    }
    .rol-page-title-icon {
      width: 36px; height: 36px; background: rgba(255,255,255,0.15);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .rol-page-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 6px; padding-left: 48px; }
    .rol-add-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #fff; color: var(--rol-accent);
      border: none; border-radius: var(--rol-radius-sm); font-size: 13px; font-weight: 700;
      cursor: pointer; box-shadow: var(--rol-shadow-md); transition: all .15s;
      white-space: nowrap; font-family: 'Inter', sans-serif;
    }
    .rol-add-btn:hover { background: var(--rol-accent-light); transform: translateY(-1px); }

    /* ── Toolbar ── */
    .rol-toolbar { padding: 0 24px; margin-top: -18px; position: relative; z-index: 2; margin-bottom: 16px; }
    .rol-toolbar-inner {
      background: var(--rol-surface); border: 1px solid var(--rol-border);
      border-radius: var(--rol-radius); box-shadow: var(--rol-shadow);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .rol-search-wrap { position: relative; flex: 1; min-width: 200px; }
    .rol-search-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--rol-muted); font-size: 14px; pointer-events: none;
    }
    .rol-search {
      width: 100%; padding: 8px 12px 8px 34px;
      border: 1px solid var(--rol-border); border-radius: var(--rol-radius-sm);
      font-size: 13px; font-family: 'Inter', sans-serif; color: var(--rol-text);
      background: var(--muted); outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .rol-search:focus {
      border-color: var(--rol-accent); box-shadow: 0 0 0 3px rgba(79,70,229,.1); background: var(--rol-surface);
    }
    .rol-search::placeholder { color: var(--rol-muted); }
    .rol-icon-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1px solid var(--rol-border);
      border-radius: var(--rol-radius-sm); background: var(--muted);
      color: var(--rol-text); font-size: 13px; font-weight: 500;
      font-family: 'Inter', sans-serif; cursor: pointer;
      transition: all .15s; white-space: nowrap;
    }
    .rol-icon-btn:hover { background: var(--rol-accent-light); border-color: var(--rol-accent); color: var(--rol-accent); }
    .rol-icon-btn:disabled { opacity: .6; cursor: not-allowed; }

    /* ── Body ── */
    .rol-body { padding: 0 24px 40px; }

    /* ── Card ── */
    .rol-card {
      background: var(--rol-surface); border: 1px solid var(--rol-border);
      border-radius: var(--rol-radius); box-shadow: var(--rol-shadow); overflow: hidden;
    }

    /* ── Table overrides ── */
    .rol-table-wrap .ant-table { font-size: 13px !important; font-family: 'Inter', sans-serif !important; }
    .rol-table-wrap .ant-table-thead > tr > th {
      background: var(--muted) !important; color: var(--rol-muted) !important;
      font-size: 11px !important; font-weight: 600 !important;
      text-transform: uppercase !important; letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--rol-border) !important; padding: 10px 16px !important;
    }
    .rol-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid var(--rol-border) !important; padding: 12px 16px !important; vertical-align: middle !important;
    }
    .rol-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .rol-table-wrap .ant-table-tbody > tr:hover > td { background: var(--muted) !important; }
    .rol-name-cell { font-weight: 700; color: var(--rol-accent); }
    .rol-desc-cell { color: var(--rol-muted); }

    /* ── Row action buttons ── */
    .rol-row-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      height: 30px; padding: 0 10px; border-radius: 7px; border: 1px solid var(--rol-border);
      background: var(--rol-surface); color: var(--rol-text); cursor: pointer; transition: all .15s;
      font-size: 12px; font-weight: 500; font-family: 'Inter', sans-serif;
    }
    .rol-row-btn.primary { background: var(--rol-accent); border-color: var(--rol-accent); color: #fff; }
    .rol-row-btn.primary:hover { background: #4338CA; }
    .rol-row-btn.danger { color: #DC2626; border-color: #FCA5A5; }
    .rol-row-btn.danger:hover { background: #FFF5F5; }
    .rol-row-btn:disabled { opacity: .6; cursor: not-allowed; }
    .rol-row-btn.wide { flex: 1; }

    /* ── Mobile card ── */
    .rol-role-card {
      background: var(--rol-surface); border: 1px solid var(--rol-border);
      border-radius: var(--rol-radius); box-shadow: var(--rol-shadow);
      padding: 14px 16px; margin-bottom: 12px;
    }
    .rol-role-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .rol-role-name { font-weight: 700; font-size: 15px; color: var(--rol-accent); }
    .rol-role-desc { font-size: 13px; color: var(--rol-muted); line-height: 1.5; margin-bottom: 12px; }
    .rol-role-card-actions { display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid var(--rol-border); }

    /* ── Loading / empty ── */
    .rol-loading { text-align: center; padding: 48px 0; color: var(--rol-muted); }
    .rol-pagination-wrap { display: flex; justify-content: center; margin-top: 16px; }

    /* ── Responsive ── */
    @media (max-width: 767px) {
      .rol-header { padding: 20px 16px 44px; }
      .rol-toolbar { padding: 0 16px; }
      .rol-body { padding: 0 16px 40px; }
      .rol-add-btn span { display: none; }
      .rol-page-subtitle { padding-left: 0; margin-top: 8px; }
    }
  `}</style>
);

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

  const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingRoleId(id);
    try {
      await (dispatch(deleteRole(id) as any)).unwrap();
      message.success('Role deleted');
      fetchRoles();
    } catch {
      message.error('Delete failed');
    } finally {
      setDeletingRoleId(null);
    }
  };

  const openPermissions = (record: any) => { setSelectedRole(record); setPermissionOpen(true); };
  const openEdit      = (record: any) => { setSelectedRole(record); setEditOpen(true); };

  // ─── Desktop columns ──────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Role',
      dataIndex: 'name',
      render: (name: string) => <span className="rol-name-cell">{name}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (desc: string) => <span className="rol-desc-cell">{desc || '—'}</span>,
    },
    {
      title: 'Actions',
      width: 220,
      render: (_: any, record: any) => <RowActions record={record} />,
    },
  ];

  // ─── Shared action row (used in table + cards) ────────────────────────────
  const RowActions = ({ record, block = false }: { record: any; block?: boolean }) => (
    <div style={{ display: 'flex', gap: 8, width: block ? '100%' : undefined }}>
      <button className={`rol-row-btn ${block ? 'wide' : ''}`} onClick={() => openPermissions(record)}>
        <SafetyOutlined /> {block ? 'Permissions' : ''}
      </button>
      <button className={`rol-row-btn primary ${block ? 'wide' : ''}`} onClick={() => openEdit(record)}>
        <EditOutlined /> {block ? 'Edit' : ''}
      </button>
      <Popconfirm
        title="Delete Role?"
        description="This action cannot be undone."
        onConfirm={() => handleDelete(record.id)}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ danger: true }}
      >
        <button className={`rol-row-btn danger ${block ? 'wide' : ''}`} disabled={deletingRoleId === record.id}>
          <DeleteOutlined /> {block ? 'Delete' : ''}
        </button>
      </Popconfirm>
    </div>
  );

  // ─── Mobile card ──────────────────────────────────────────────────────────
  const RoleCard = ({ record }: { record: any }) => (
    <div className="rol-role-card">
      <div className="rol-role-card-header">
        <span className="rol-role-name">{record.name}</span>
        <Tag icon={<SafetyOutlined />} color="blue" style={{ margin: 0 }}>Role</Tag>
      </div>
      <div className="rol-role-desc">{record.description || 'No description provided.'}</div>
      <div className="rol-role-card-actions">
        <RowActions record={record} block />
      </div>
    </div>
  );

  return (
    <div className="rol-root">
      <GlobalStyles />

      {/* ── Page header ── */}
      <div className="rol-header">
        <div className="rol-header-noise" />
        <div className="rol-header-content">
          <div>
            <div className="rol-page-title">
              <div className="rol-page-title-icon">
                <SafetyOutlined />
              </div>
              Roles
            </div>
            <div className="rol-page-subtitle">Define roles and control what each one can access</div>
          </div>
          <button className="rol-add-btn" onClick={() => setAddOpen(true)}>
            <PlusOutlined />
            <span>Add Role</span>
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="rol-toolbar">
        <div className="rol-toolbar-inner">
          <div className="rol-search-wrap">
            <SearchOutlined className="rol-search-icon" />
            <input
              className="rol-search"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
                debouncedSearch(e.target.value);
              }}
            />
          </div>
          <button className="rol-icon-btn" onClick={() => fetchRoles()} disabled={loading}>
            <ReloadOutlined spin={loading} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="rol-body">
        {isMobile ? (
          <>
            {loading ? (
              <div className="rol-loading">Loading…</div>
            ) : list?.length === 0 ? (
              <div className="rol-card"><Empty description="No roles found" style={{ padding: 32 }} /></div>
            ) : (
              list.map((role: any) => <RoleCard key={role.id} record={role} />)
            )}

            {pagination?.total > 0 && (
              <div className="rol-pagination-wrap">
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
          <div className="rol-card rol-table-wrap">
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
          </div>
        )}
      </div>

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
    </div>
  );
};

export default RolesPage;
