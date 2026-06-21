import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Table, Spin, Pagination, Popconfirm } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  BankOutlined,
  TeamOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { deleteCustomer, getCustomers } from '../redux/customerActions';
import EditCustomerModal from '../components/EditCustomerModal';
import AddCustomerModal from '../components/AddCustomerModal';
import CustomerDetailsDrawer from '../components/CustomerDetailsDrawer';

// ─── Global styles ─────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --cus-bg: #F4F5F9;
      --cus-surface: #FFFFFF;
      --cus-border: #E5E7EB;
      --cus-accent: #4F46E5;
      --cus-accent-light: #EEF2FF;
      --cus-success: #059669;
      --cus-danger: #DC2626;
      --cus-warning: #D97706;
      --cus-text: #111827;
      --cus-muted: #6B7280;
      --cus-radius: 12px;
      --cus-radius-sm: 8px;
      --cus-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --cus-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }

    .cusl-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--cus-bg);
      min-height: 100vh;
      color: var(--cus-text);
    }

    /* ── Page header ── */
    .cusl-header {
      background: #1E1B4B;
      padding: 28px 28px 52px;
      position: relative;
      overflow: hidden;
    }
    .cusl-header::after {
      content: '';
      position: absolute;
      bottom: -1px; left: 0; right: 0;
      height: 28px;
      background: var(--cus-bg);
      border-radius: 24px 24px 0 0;
    }
    .cusl-header-noise {
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .cusl-header-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    .cusl-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
      line-height: 1.1;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cusl-page-title-icon {
      width: 36px; height: 36px;
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .cusl-page-subtitle {
      color: rgba(255,255,255,0.6);
      font-size: 13px;
      margin-top: 6px;
      padding-left: 48px;
    }
    .cusl-add-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #fff;
      color: var(--cus-accent);
      border: none;
      border-radius: var(--cus-radius-sm);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: var(--cus-shadow-md);
      transition: all .15s;
      white-space: nowrap;
      font-family: 'Inter', sans-serif;
    }
    .cusl-add-btn:hover {
      background: var(--cus-accent-light);
      transform: translateY(-1px);
    }

    /* ── Toolbar ── */
    .cusl-toolbar {
      padding: 0 24px;
      margin-top: -18px;
      position: relative;
      z-index: 2;
      margin-bottom: 16px;
    }
    .cusl-toolbar-inner {
      background: var(--cus-surface);
      border: 1px solid var(--cus-border);
      border-radius: var(--cus-radius);
      box-shadow: var(--cus-shadow);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .cusl-search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }
    .cusl-search-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--cus-muted);
      font-size: 14px;
      pointer-events: none;
    }
    .cusl-search {
      width: 100%;
      padding: 8px 12px 8px 34px;
      border: 1px solid var(--cus-border);
      border-radius: var(--cus-radius-sm);
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: var(--cus-text);
      background: #FAFAFA;
      outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    .cusl-search:focus {
      border-color: var(--cus-accent);
      box-shadow: 0 0 0 3px rgba(79,70,229,.1);
      background: #fff;
    }
    .cusl-search::placeholder { color: var(--cus-muted); }

    .cusl-select-wrap {
      position: relative;
      min-width: 150px;
    }
    .cusl-select-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--cus-muted);
      font-size: 13px;
      pointer-events: none;
      z-index: 1;
    }
    .cusl-select {
      width: 100%;
      padding: 8px 12px 8px 32px;
      border: 1px solid var(--cus-border);
      border-radius: var(--cus-radius-sm);
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: var(--cus-text);
      background: #FAFAFA;
      outline: none;
      appearance: none;
      cursor: pointer;
      transition: border-color .15s;
    }
    .cusl-select:focus {
      border-color: var(--cus-accent);
      box-shadow: 0 0 0 3px rgba(79,70,229,.1);
    }
    .cusl-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 14px;
      border: 1px solid var(--cus-border);
      border-radius: var(--cus-radius-sm);
      background: #FAFAFA;
      color: var(--cus-text);
      font-size: 13px;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all .15s;
      white-space: nowrap;
    }
    .cusl-icon-btn:hover {
      background: var(--cus-accent-light);
      border-color: var(--cus-accent);
      color: var(--cus-accent);
    }

    /* ── Stats ── */
    .cusl-stats {
      padding: 0 24px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .cusl-stat-card {
      background: var(--cus-surface);
      border: 1px solid var(--cus-border);
      border-radius: var(--cus-radius);
      box-shadow: var(--cus-shadow);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cusl-stat-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .cusl-stat-icon.total  { background: #EEF2FF; color: #4F46E5; }
    .cusl-stat-icon.biz    { background: #DBEAFE; color: #1D4ED8; }
    .cusl-stat-icon.ind    { background: #ECFDF5; color: #059669; }
    .cusl-stat-icon.active { background: #FEF9C3; color: #CA8A04; }
    .cusl-stat-text {}
    .cusl-stat-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: var(--cus-muted);
      margin-bottom: 3px;
    }
    .cusl-stat-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--cus-text);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }

    /* ── Main card ── */
    .cusl-body { padding: 0 24px 40px; }
    .cusl-card {
      background: var(--cus-surface);
      border: 1px solid var(--cus-border);
      border-radius: var(--cus-radius);
      box-shadow: var(--cus-shadow);
      overflow: hidden;
    }
    .cusl-card-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--cus-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .cusl-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--cus-text);
    }
    .cusl-card-icon {
      width: 28px; height: 28px;
      background: var(--cus-accent-light);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: var(--cus-accent);
      font-size: 13px;
    }
    .cusl-count-badge {
      background: var(--cus-accent-light);
      color: var(--cus-accent);
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 99px;
    }

    /* ── Type badge ── */
    .cusl-type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    .cusl-type-badge.business { background: #DBEAFE; color: #1D4ED8; }
    .cusl-type-badge.individual { background: #ECFDF5; color: #059669; }

    /* ── Avatar ── */
    .cusl-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .cusl-avatar.business   { background: #DBEAFE; color: #1D4ED8; }
    .cusl-avatar.individual { background: #ECFDF5; color: #059669; }

    /* ── Table overrides ── */
    .cusl-table-wrap .ant-table {
      font-size: 13px !important;
      font-family: 'Inter', sans-serif !important;
    }
    .cusl-table-wrap .ant-table-thead > tr > th {
      background: #F9FAFB !important;
      color: var(--cus-muted) !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--cus-border) !important;
      padding: 10px 16px !important;
    }
    .cusl-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid #F3F4F6 !important;
      padding: 12px 16px !important;
      vertical-align: middle !important;
    }
    .cusl-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .cusl-table-wrap .ant-table-tbody > tr:hover > td { background: #FAFBFF !important; }
    .cusl-table-wrap .ant-table-tbody > tr { cursor: pointer; }

    /* ── Row actions ── */
    .cusl-actions-cell { display: flex; align-items: center; gap: 6px; }
    .cusl-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      border: 1px solid var(--cus-border);
      background: #FAFAFA;
      color: var(--cus-text);
      transition: all .12s;
      white-space: nowrap;
    }
    .cusl-action-btn:hover { background: var(--cus-accent-light); border-color: var(--cus-accent); color: var(--cus-accent); }
    .cusl-action-btn.edit:hover { background: #FFFBEB; border-color: #D97706; color: #D97706; }
    .cusl-action-btn.del:hover { background: #FEF2F2; border-color: var(--cus-danger); color: var(--cus-danger); }

    /* ── Contact chip ── */
    .cusl-contact-chip {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .cusl-contact-name { font-weight: 500; font-size: 13px; color: var(--cus-text); }
    .cusl-contact-meta { font-size: 11px; color: var(--cus-muted); }

    /* ── Address chip ── */
    .cusl-address-chip { font-size: 12px; color: var(--cus-muted); line-height: 1.5; }

    /* ── GST badge ── */
    .cusl-gst {
      font-size: 12px;
      font-family: 'Courier New', monospace;
      background: #F3F4F6;
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--cus-text);
      letter-spacing: 0.3px;
    }

    /* ── Mobile cards ── */
    .cusl-mobile-list { display: none; }
    .cusl-mobile-card {
      background: var(--cus-surface);
      border: 1px solid var(--cus-border);
      border-radius: var(--cus-radius);
      padding: 16px;
      margin-bottom: 10px;
      box-shadow: var(--cus-shadow);
      cursor: pointer;
      transition: box-shadow .15s;
    }
    .cusl-mobile-card:hover { box-shadow: var(--cus-shadow-md); }
    .cusl-mobile-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 10px;
      gap: 8px;
    }
    .cusl-mobile-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--cus-accent);
    }
    .cusl-mobile-company { font-size: 12px; color: var(--cus-muted); margin-top: 2px; }
    .cusl-mobile-rows {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 0;
      border-top: 1px solid #F3F4F6;
      border-bottom: 1px solid #F3F4F6;
      margin-bottom: 10px;
    }
    .cusl-mobile-row { display: flex; align-items: flex-start; gap: 8px; }
    .cusl-mobile-row-icon { color: var(--cus-muted); font-size: 12px; margin-top: 1px; flex-shrink: 0; }
    .cusl-mobile-row-text { font-size: 13px; color: #374151; word-break: break-all; }
    .cusl-mobile-row-label { font-size: 11px; color: var(--cus-muted); min-width: 52px; flex-shrink: 0; margin-top: 1px; }
    .cusl-mobile-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .cusl-mobile-date { font-size: 11px; color: var(--cus-muted); }
    .cusl-mobile-btns { display: flex; gap: 6px; }

    /* ── Empty state ── */
    .cusl-empty { text-align: center; padding: 48px 24px; color: var(--cus-muted); }
    .cusl-empty-icon { font-size: 32px; opacity: 0.25; margin-bottom: 12px; }
    .cusl-empty-text { font-size: 14px; font-weight: 500; }
    .cusl-empty-sub { font-size: 12px; margin-top: 4px; }

    /* ── FAB ── */
    .cusl-fab {
      position: fixed; bottom: 24px; right: 20px;
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--cus-accent); border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(79,70,229,.45);
      z-index: 1000; transition: transform .15s;
    }
    .cusl-fab:hover { transform: scale(1.08); }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .cusl-stats { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .cusl-header { padding: 20px 16px 44px; }
      .cusl-toolbar { padding: 0 16px; }
      .cusl-stats { padding: 0 16px; grid-template-columns: repeat(2, 1fr); }
      .cusl-body { padding: 0 16px 40px; }
      .cusl-table-wrap { display: none !important; }
      .cusl-mobile-list { display: block !important; }
    }
    @media (max-width: 480px) {
      .cusl-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .cusl-add-btn span { display: none; }
      .cusl-search-wrap { min-width: 0; }
      .cusl-select-wrap { min-width: 0; }
    }
  `}</style>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const formatDate = (v: string) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatAddress = (addr: any) => {
  if (!addr) return '—';
  const parts = [addr.address_line_1, addr.city, addr.state, addr.postal_code].filter(Boolean);
  return parts.join(', ') || '—';
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const TypeBadge = ({ type }: { type: string }) => (
  <span className={`cusl-type-badge ${type === 'BUSINESS' ? 'business' : 'individual'}`}>
    {type === 'BUSINESS' ? <BankOutlined style={{ fontSize: 10 }} /> : <UserOutlined style={{ fontSize: 10 }} />}
    {type === 'BUSINESS' ? 'Business' : 'Individual'}
  </span>
);

const Avatar = ({ name, type }: { name: string; type: string }) => (
  <div className={`cusl-avatar ${type === 'BUSINESS' ? 'business' : 'individual'}`}>
    {getInitials(name || '?')}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const CustomerListPage: React.FC = () => {
  const dispatch = useDispatch();

  const { list, loading, pagination, stats } = useSelector((state: any) => state.customers);

  const [searchInput, setSearchInput]           = useState('');
  const [search, setSearch]                     = useState('');
  const [page, setPage]                         = useState(1);
  const [pageSize]                              = useState(10);
  const [typeFilter, setTypeFilter]             = useState('');
  const [industryFilter, setIndustryFilter]     = useState('');

  const [addOpen, setAddOpen]                   = useState(false);
  const [editOpen, setEditOpen]                 = useState(false);
  const [detailsOpen, setDetailsOpen]           = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchCustomers = useCallback(() => {
    dispatch(
      getCustomers({
        page,
        limit: pageSize,
        search: search || undefined,
        customer_type: typeFilter || undefined,
        industry: industryFilter || undefined,
      }),
    );
  }, [dispatch, page, pageSize, search, typeFilter, industryFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleView   = (c: any) => { setSelectedCustomer(c); setDetailsOpen(true); };
  const handleEdit   = (c: any) => { setSelectedCustomer(c); setEditOpen(true); };
  const handleDelete = (c: any) => { dispatch(deleteCustomer(c.id)); };

  // ─── Derived stats ──────────────────────────────────────────────────────────
  // Use API-provided stats if available (see updated BE), else derive from current page
  const customerList: any[] = list || [];
  const totalCount  = pagination?.total ?? customerList.length;

  const totalBusiness   = stats?.totalBusiness   ?? customerList.filter((c) => c.customer_type === 'BUSINESS').length;
  const totalIndividual = stats?.totalIndividual  ?? customerList.filter((c) => c.customer_type === 'INDIVIDUAL').length;
  const totalActive     = stats?.totalActive      ?? totalCount;

  // Unique industries from current page for the filter dropdown (BE provides full list if stats included)
  const industries: string[] = useMemo(() => {
    const fromStats: string[] = stats?.industries || [];
    if (fromStats.length) return fromStats;
    const set = new Set<string>();
    customerList.forEach((c) => { if (c.industry) set.add(c.industry); });
    return Array.from(set).sort();
  }, [customerList, stats]);

  // ─── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Customer',
      dataIndex: 'display_name',
      render: (_: string, record: any) => {
        const primaryContact = record.contacts?.find((c: any) => c.is_primary) || record.contacts?.[0];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={record.display_name || '?'} type={record.customer_type} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--cus-accent)', cursor: 'pointer', fontSize: 13 }}
                onClick={() => handleView(record)}>
                {record.display_name || '—'}
              </div>
              {record.company_name && (
                <div style={{ fontSize: 11, color: 'var(--cus-muted)', marginTop: 1 }}>{record.company_name}</div>
              )}
              {primaryContact?.designation && (
                <div style={{ fontSize: 11, color: 'var(--cus-muted)' }}>{primaryContact.designation}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'customer_type',
      width: 130,
      render: (v: string) => <TypeBadge type={v} />,
    },
    {
      title: 'Primary Contact',
      dataIndex: 'contacts',
      width: 200,
      render: (contacts: any[]) => {
        const primary = contacts?.find((c) => c.is_primary) || contacts?.[0];
        if (!primary) return <span style={{ color: 'var(--cus-muted)', fontSize: 12 }}>—</span>;
        const name = [primary.first_name, primary.last_name].filter(Boolean).join(' ');
        return (
          <div className="cusl-contact-chip">
            <div className="cusl-contact-name">{name || '—'}</div>
            {primary.email && <div className="cusl-contact-meta">{primary.email}</div>}
            {primary.phone && <div className="cusl-contact-meta">{primary.phone}</div>}
            {(primary.department || primary.designation) && (
              <div className="cusl-contact-meta" style={{ color: '#9CA3AF' }}>
                {[primary.designation, primary.department].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'GST / Industry',
      width: 180,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {record.gst_number
            ? <span className="cusl-gst">{record.gst_number}</span>
            : <span style={{ color: 'var(--cus-muted)', fontSize: 12 }}>No GST</span>
          }
          {record.industry && (
            <span style={{ fontSize: 11, color: 'var(--cus-muted)' }}>{record.industry}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Billing Address',
      width: 220,
      render: (_: any, record: any) => {
        const billing = record.addresses?.find((a: any) => a.address_type === 'BILLING' && a.is_primary)
          || record.addresses?.find((a: any) => a.address_type === 'BILLING')
          || record.addresses?.[0];
        if (!billing) return <span style={{ color: 'var(--cus-muted)', fontSize: 12 }}>—</span>;
        return <div className="cusl-address-chip">{formatAddress(billing)}</div>;
      },
    },
    {
      title: 'Contacts',
      width: 80,
      render: (_: any, record: any) => {
        const count = record.contacts?.length ?? 0;
        const addrCount = record.addresses?.length ?? 0;
        return (
          <div style={{ fontSize: 12, color: 'var(--cus-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>{count} contact{count !== 1 ? 's' : ''}</span>
            <span>{addrCount} addr.</span>
          </div>
        );
      },
    },
    {
      title: 'Added',
      dataIndex: 'created_at',
      width: 110,
      render: (v: string) => <span style={{ fontSize: 12, color: 'var(--cus-muted)' }}>{formatDate(v)}</span>,
    },
    {
      title: 'Actions',
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: any) => (
        <div className="cusl-actions-cell" onClick={(e) => e.stopPropagation()}>
          <button className="cusl-action-btn" onClick={() => handleView(record)}>
            <EyeOutlined /> View
          </button>
          <button className="cusl-action-btn edit" onClick={() => handleEdit(record)}>
            <EditOutlined />
          </button>
          <Popconfirm
            title="Delete customer?"
            description="This action cannot be undone."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <button className="cusl-action-btn del">
              <DeleteOutlined />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="cusl-root">
        <GlobalStyles />

        {/* ── Header ── */}
        <div className="cusl-header">
          <div className="cusl-header-noise" />
          <div className="cusl-header-content">
            <div>
              <div className="cusl-page-title">
                <div className="cusl-page-title-icon"><TeamOutlined /></div>
                Customers
              </div>
              <div className="cusl-page-subtitle">Manage your customer relationships and contacts</div>
            </div>
            <button className="cusl-add-btn" onClick={() => setAddOpen(true)}>
              <PlusOutlined />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="cusl-toolbar">
          <div className="cusl-toolbar-inner">
            <div className="cusl-search-wrap">
              <SearchOutlined className="cusl-search-icon" />
              <input
                className="cusl-search"
                placeholder="Search by name, email, phone, GST…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className="cusl-select-wrap">
              <FilterOutlined className="cusl-select-icon" />
              <select
                className="cusl-select"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Types</option>
                <option value="BUSINESS">Business</option>
                <option value="INDIVIDUAL">Individual</option>
              </select>
            </div>

            {industries.length > 0 && (
              <div className="cusl-select-wrap">
                <ShopOutlined className="cusl-select-icon" />
                <select
                  className="cusl-select"
                  value={industryFilter}
                  onChange={(e) => { setIndustryFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All Industries</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            )}

            <button className="cusl-icon-btn" onClick={fetchCustomers}>
              <ReloadOutlined />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="cusl-stats">
          <div className="cusl-stat-card">
            <div className="cusl-stat-icon total"><TeamOutlined /></div>
            <div className="cusl-stat-text">
              <div className="cusl-stat-label">Total</div>
              <div className="cusl-stat-value">{totalCount}</div>
            </div>
          </div>
          <div className="cusl-stat-card">
            <div className="cusl-stat-icon biz"><BankOutlined /></div>
            <div className="cusl-stat-text">
              <div className="cusl-stat-label">Business</div>
              <div className="cusl-stat-value">{totalBusiness}</div>
            </div>
          </div>
          <div className="cusl-stat-card">
            <div className="cusl-stat-icon ind"><UserOutlined /></div>
            <div className="cusl-stat-text">
              <div className="cusl-stat-label">Individual</div>
              <div className="cusl-stat-value">{totalIndividual}</div>
            </div>
          </div>
          <div className="cusl-stat-card">
            <div className="cusl-stat-icon active"><ShopOutlined /></div>
            <div className="cusl-stat-text">
              <div className="cusl-stat-label">Active</div>
              <div className="cusl-stat-value">{totalActive}</div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="cusl-body">
          <div className="cusl-card">
            <div className="cusl-card-header">
              <div className="cusl-card-title">
                <div className="cusl-card-icon"><TeamOutlined /></div>
                All Customers
              </div>
              {totalCount > 0 && (
                <span className="cusl-count-badge">{totalCount} customer{totalCount !== 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Desktop table */}
            <div className="cusl-table-wrap">
              <Table
                rowKey="id"
                loading={loading}
                dataSource={customerList}
                columns={columns}
                scroll={{ x: 1300 }}
                onRow={(record) => ({
                  onClick: () => handleView(record),
                })}
                locale={{
                  emptyText: (
                    <div className="cusl-empty">
                      <div className="cusl-empty-icon"><TeamOutlined /></div>
                      <div className="cusl-empty-text">No customers found</div>
                      <div className="cusl-empty-sub">Try adjusting your search or filters</div>
                    </div>
                  ),
                }}
                pagination={{
                  current: page,
                  pageSize,
                  total: totalCount,
                  showSizeChanger: false,
                  showTotal: (total) => `${total} customer${total !== 1 ? 's' : ''}`,
                  onChange: (p) => setPage(p),
                  style: { padding: '12px 16px' },
                }}
              />
            </div>

            {/* Mobile list */}
            <div className="cusl-mobile-list" style={{ padding: 12 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
              ) : customerList.length === 0 ? (
                <div className="cusl-empty">
                  <div className="cusl-empty-icon"><TeamOutlined /></div>
                  <div className="cusl-empty-text">No customers found</div>
                  <div className="cusl-empty-sub">Try adjusting your search or filters</div>
                </div>
              ) : (
                <>
                  {customerList.map((customer: any) => {
                    const primaryContact = customer.contacts?.find((c: any) => c.is_primary) || customer.contacts?.[0];
                    const billing = customer.addresses?.find((a: any) => a.address_type === 'BILLING') || customer.addresses?.[0];
                    return (
                      <div
                        key={customer.id}
                        className="cusl-mobile-card"
                        onClick={() => handleView(customer)}
                      >
                        <div className="cusl-mobile-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            <Avatar name={customer.display_name || '?'} type={customer.customer_type} />
                            <div style={{ minWidth: 0 }}>
                              <div className="cusl-mobile-name">{customer.display_name || '—'}</div>
                              {customer.company_name && (
                                <div className="cusl-mobile-company">{customer.company_name}</div>
                              )}
                            </div>
                          </div>
                          <TypeBadge type={customer.customer_type} />
                        </div>

                        <div className="cusl-mobile-rows">
                          {primaryContact && (
                            <>
                              {(primaryContact.first_name || primaryContact.last_name) && (
                                <div className="cusl-mobile-row">
                                  <UserOutlined className="cusl-mobile-row-icon" />
                                  <div className="cusl-mobile-row-text">
                                    {[primaryContact.first_name, primaryContact.last_name].filter(Boolean).join(' ')}
                                    {primaryContact.designation && ` · ${primaryContact.designation}`}
                                  </div>
                                </div>
                              )}
                              {primaryContact.email && (
                                <div className="cusl-mobile-row">
                                  <span className="cusl-mobile-row-icon">✉</span>
                                  <div className="cusl-mobile-row-text">{primaryContact.email}</div>
                                </div>
                              )}
                              {primaryContact.phone && (
                                <div className="cusl-mobile-row">
                                  <span className="cusl-mobile-row-icon">✆</span>
                                  <div className="cusl-mobile-row-text">{primaryContact.phone}</div>
                                </div>
                              )}
                            </>
                          )}
                          {customer.gst_number && (
                            <div className="cusl-mobile-row">
                              <BankOutlined className="cusl-mobile-row-icon" />
                              <div className="cusl-mobile-row-text">{customer.gst_number}</div>
                            </div>
                          )}
                          {billing && (
                            <div className="cusl-mobile-row">
                              <span className="cusl-mobile-row-label">Address</span>
                              <div className="cusl-mobile-row-text">{formatAddress(billing)}</div>
                            </div>
                          )}
                        </div>

                        <div className="cusl-mobile-footer">
                          <div className="cusl-mobile-date">Added {formatDate(customer.created_at)}</div>
                          <div className="cusl-mobile-btns" onClick={(e) => e.stopPropagation()}>
                            <button className="cusl-action-btn" onClick={() => handleView(customer)}>
                              <EyeOutlined /> View
                            </button>
                            <button className="cusl-action-btn edit" onClick={() => handleEdit(customer)}>
                              <EditOutlined />
                            </button>
                            <Popconfirm
                              title="Delete customer?"
                              okText="Delete"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDelete(customer)}
                            >
                              <button className="cusl-action-btn del">
                                <DeleteOutlined />
                              </button>
                            </Popconfirm>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {totalCount > pageSize && (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                      <Pagination
                        size="small"
                        current={page}
                        pageSize={pageSize}
                        total={totalCount}
                        showSizeChanger={false}
                        onChange={(p) => setPage(p)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FAB (mobile) */}
      <button className="cusl-fab" onClick={() => setAddOpen(true)} aria-label="Add Customer"
        style={{ display: 'none' }} id="cusl-fab">
        <PlusOutlined style={{ fontSize: 22, color: '#fff' }} />
      </button>
      <style>{`@media (max-width: 768px) { #cusl-fab { display: flex !important; } }`}</style>

      <AddCustomerModal open={addOpen} onClose={() => setAddOpen(false)} />
      <EditCustomerModal
        open={editOpen}
        customer={selectedCustomer}
        onClose={() => { setEditOpen(false); setSelectedCustomer(null); }}
      />
      <CustomerDetailsDrawer
        open={detailsOpen}
        customer={selectedCustomer}
        onClose={() => { setDetailsOpen(false); setSelectedCustomer(null); }}
      />
    </>
  );
};

export default CustomerListPage;