import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Empty,
  Pagination,
  Popconfirm,
  Tag,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import debounce from 'lodash/debounce';
import { useDispatch, useSelector } from 'react-redux';
import { getPermissions, deletePermission } from '../redux/permissionsActions';
import AddPermissionModal from '../components/AddPermissionModal';
import EditPermissionModal from '../components/EditPermissionModal';

// ─── Design tokens ────────────────────────────────────────────────────────────
// Mirrors the invoice/quotation/customers/companies/users/roles design system
// exactly (--inv-*/--qt-*/--cus-*/--comp-*/--usr-*/--rol-* prefixes) so this
// page reads as part of the same app.
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --prm-bg: var(--background);
      --prm-surface: var(--card);
      --prm-border: var(--border);
      --prm-accent: #4F46E5;
      --prm-accent-light: #EEF2FF;
      --prm-text: var(--foreground);
      --prm-muted: var(--muted-foreground);
      --prm-radius: 12px;
      --prm-radius-sm: 8px;
      --prm-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --prm-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }

    .prm-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--prm-bg);
      min-height: 100vh;
      color: var(--prm-text);
    }

    /* ── Page header ── */
    .prm-header {
      background: #1E1B4B;
      padding: 28px 28px 52px;
      position: relative;
      overflow: hidden;
    }
    .prm-header::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0; height: 28px;
      background: var(--prm-bg); border-radius: 24px 24px 0 0;
    }
    .prm-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .prm-header-content {
      position: relative; z-index: 1;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .prm-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700; color: #fff; letter-spacing: -0.5px;
      display: flex; align-items: center; gap: 12px;
    }
    .prm-page-title-icon {
      width: 36px; height: 36px; background: rgba(255,255,255,0.15);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .prm-page-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 6px; padding-left: 48px; }
    .prm-add-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #fff; color: var(--prm-accent);
      border: none; border-radius: var(--prm-radius-sm); font-size: 13px; font-weight: 700;
      cursor: pointer; box-shadow: var(--prm-shadow-md); transition: all .15s;
      white-space: nowrap; font-family: 'Inter', sans-serif;
    }
    .prm-add-btn:hover { background: var(--prm-accent-light); transform: translateY(-1px); }

    /* ── Toolbar ── */
    .prm-toolbar { padding: 0 24px; margin-top: -18px; position: relative; z-index: 2; margin-bottom: 16px; }
    .prm-toolbar-inner {
      background: var(--prm-surface); border: 1px solid var(--prm-border);
      border-radius: var(--prm-radius); box-shadow: var(--prm-shadow);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .prm-search-wrap { position: relative; flex: 1; min-width: 200px; }
    .prm-search-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--prm-muted); font-size: 14px; pointer-events: none;
    }
    .prm-search {
      width: 100%; padding: 8px 12px 8px 34px;
      border: 1px solid var(--prm-border); border-radius: var(--prm-radius-sm);
      font-size: 13px; font-family: 'Inter', sans-serif; color: var(--prm-text);
      background: var(--muted); outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .prm-search:focus {
      border-color: var(--prm-accent); box-shadow: 0 0 0 3px rgba(79,70,229,.1); background: var(--prm-surface);
    }
    .prm-search::placeholder { color: var(--prm-muted); }
    .prm-icon-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1px solid var(--prm-border);
      border-radius: var(--prm-radius-sm); background: var(--muted);
      color: var(--prm-text); font-size: 13px; font-weight: 500;
      font-family: 'Inter', sans-serif; cursor: pointer;
      transition: all .15s; white-space: nowrap;
    }
    .prm-icon-btn:hover { background: var(--prm-accent-light); border-color: var(--prm-accent); color: var(--prm-accent); }
    .prm-icon-btn:disabled { opacity: .6; cursor: not-allowed; }

    /* ── Body ── */
    .prm-body { padding: 0 24px 40px; }

    /* ── Card ── */
    .prm-card {
      background: var(--prm-surface); border: 1px solid var(--prm-border);
      border-radius: var(--prm-radius); box-shadow: var(--prm-shadow); overflow: hidden;
    }

    /* ── Table overrides ── */
    .prm-table-wrap .ant-table { font-size: 13px !important; font-family: 'Inter', sans-serif !important; }
    .prm-table-wrap .ant-table-thead > tr > th {
      background: var(--muted) !important; color: var(--prm-muted) !important;
      font-size: 11px !important; font-weight: 600 !important;
      text-transform: uppercase !important; letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--prm-border) !important; padding: 10px 16px !important;
    }
    .prm-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid var(--prm-border) !important; padding: 12px 16px !important; vertical-align: middle !important;
    }
    .prm-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .prm-table-wrap .ant-table-tbody > tr:hover > td { background: var(--muted) !important; }
    .prm-name-cell { font-weight: 700; color: #7C3AED; font-family: 'Courier New', monospace; }
    .prm-desc-cell { color: var(--prm-muted); }

    /* ── Row action buttons ── */
    .prm-row-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      height: 30px; padding: 0 10px; border-radius: 7px; border: 1px solid var(--prm-border);
      background: var(--prm-surface); color: var(--prm-text); cursor: pointer; transition: all .15s;
      font-size: 12px; font-weight: 500; font-family: 'Inter', sans-serif;
    }
    .prm-row-btn.primary { background: var(--prm-accent); border-color: var(--prm-accent); color: #fff; }
    .prm-row-btn.primary:hover { background: #4338CA; }
    .prm-row-btn.danger { color: #DC2626; border-color: #FCA5A5; }
    .prm-row-btn.danger:hover { background: #FFF5F5; }
    .prm-row-btn:disabled { opacity: .6; cursor: not-allowed; }
    .prm-row-btn.wide { flex: 1; }

    /* ── Mobile card ── */
    .prm-perm-card {
      background: var(--prm-surface); border: 1px solid var(--prm-border);
      border-radius: var(--prm-radius); box-shadow: var(--prm-shadow);
      padding: 14px 16px; margin-bottom: 12px;
    }
    .prm-perm-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .prm-perm-name { font-weight: 700; font-size: 14px; color: #7C3AED; font-family: 'Courier New', monospace; }
    .prm-perm-desc { font-size: 13px; color: var(--prm-muted); line-height: 1.5; margin-bottom: 12px; }
    .prm-perm-card-actions { display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid var(--prm-border); }

    /* ── Loading / empty ── */
    .prm-loading { text-align: center; padding: 48px 0; color: var(--prm-muted); }
    .prm-pagination-wrap { display: flex; justify-content: center; margin-top: 16px; }

    /* ── Responsive ── */
    @media (max-width: 767px) {
      .prm-header { padding: 20px 16px 44px; }
      .prm-toolbar { padding: 0 16px; }
      .prm-body { padding: 0 16px 40px; }
      .prm-add-btn span { display: none; }
      .prm-page-subtitle { padding-left: 0; margin-top: 8px; }
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

  const [deletingPermissionId, setDeletingPermissionId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingPermissionId(id);
    try {
      await (dispatch(deletePermission(id) as any)).unwrap();
      message.success('Permission deleted');
      fetchPermissions();
    } catch {
      message.error('Delete failed');
    } finally {
      setDeletingPermissionId(null);
    }
  };

  // ─── Shared actions ───────────────────────────────────────────────────────
  const RowActions = ({ record, block = false }: { record: any; block?: boolean }) => (
    <div style={{ display: 'flex', gap: 8, width: block ? '100%' : undefined }}>
      <button className={`prm-row-btn primary ${block ? 'wide' : ''}`} onClick={() => openEdit(record)}>
        <EditOutlined /> {block ? 'Edit' : ''}
      </button>
      <Popconfirm
        title="Delete Permission?"
        description="This action cannot be undone."
        onConfirm={() => handleDelete(record.id)}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ danger: true }}
      >
        <button className={`prm-row-btn danger ${block ? 'wide' : ''}`} disabled={deletingPermissionId === record.id}>
          <DeleteOutlined /> {block ? 'Delete' : ''}
        </button>
      </Popconfirm>
    </div>
  );

  // ─── Mobile card ──────────────────────────────────────────────────────────
  const PermissionCard = ({ record }: { record: any }) => (
    <div className="prm-perm-card">
      <div className="prm-perm-card-header">
        <span className="prm-perm-name">{record.name}</span>
        <Tag icon={<KeyOutlined />} color="purple" style={{ margin: 0 }}>Permission</Tag>
      </div>
      <div className="prm-perm-desc">{record.description || 'No description provided.'}</div>
      <div className="prm-perm-card-actions">
        <RowActions record={record} block />
      </div>
    </div>
  );

  // ─── Desktop columns ──────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Permission',
      dataIndex: 'name',
      render: (name: string) => <span className="prm-name-cell">{name}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (desc: string) => <span className="prm-desc-cell">{desc || '—'}</span>,
    },
    {
      title: 'Actions',
      width: 160,
      render: (_: any, record: any) => <RowActions record={record} />,
    },
  ];

  return (
    <div className="prm-root">
      <GlobalStyles />

      {/* ── Page header ── */}
      <div className="prm-header">
        <div className="prm-header-noise" />
        <div className="prm-header-content">
          <div>
            <div className="prm-page-title">
              <div className="prm-page-title-icon">
                <KeyOutlined />
              </div>
              Permissions
            </div>
            <div className="prm-page-subtitle">Manage the individual permissions roles can be granted</div>
          </div>
          <button className="prm-add-btn" onClick={() => setAddOpen(true)}>
            <PlusOutlined />
            <span>Add Permission</span>
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="prm-toolbar">
        <div className="prm-toolbar-inner">
          <div className="prm-search-wrap">
            <SearchOutlined className="prm-search-icon" />
            <input
              className="prm-search"
              placeholder="Search permissions..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
                debouncedSearch(e.target.value);
              }}
            />
          </div>
          <button className="prm-icon-btn" onClick={() => fetchPermissions()} disabled={loading}>
            <ReloadOutlined spin={loading} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="prm-body">
        {isMobile ? (
          <>
            {loading ? (
              <div className="prm-loading">Loading…</div>
            ) : list?.length === 0 ? (
              <div className="prm-card"><Empty description="No permissions found" style={{ padding: 32 }} /></div>
            ) : (
              list.map((perm: any) => <PermissionCard key={perm.id} record={perm} />)
            )}

            {pagination?.total > 0 && (
              <div className="prm-pagination-wrap">
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
          <div className="prm-card prm-table-wrap">
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
          </div>
        )}
      </div>

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
    </div>
  );
};

export default PermissionsPage;
