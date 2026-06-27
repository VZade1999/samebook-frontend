import React, { useCallback, useEffect, useState } from 'react';
import { Table, Spin, Pagination, Tooltip, Popconfirm } from 'antd';
import {
  EyeOutlined,
  MailOutlined,
  ReloadOutlined,
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  FilterOutlined,
  BankOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleFilled,
  WarningOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { getInvoices, sendInvoice } from '../redux/invoiceActions';
import GenerateInvoiceModal from '../components/GenerateInvoiceModal';
import { useNavigate } from 'react-router-dom';
import { getQuotations } from '@/modules/quotation/redux/quotationActions';
import { useAccess } from '@/permissions/useAccess';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --inv-bg: #F4F5F9;
      --inv-surface: #FFFFFF;
      --inv-border: #E5E7EB;
      --inv-accent: #4F46E5;
      --inv-accent-light: #EEF2FF;
      --inv-success: #059669;
      --inv-danger: #DC2626;
      --inv-warning: #D97706;
      --inv-text: #111827;
      --inv-muted: #6B7280;
      --inv-radius: 12px;
      --inv-radius-sm: 8px;
      --inv-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --inv-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      --inv-shadow-lg: 0 12px 32px rgba(0,0,0,.1), 0 4px 8px rgba(0,0,0,.06);
    }

    .invl-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--inv-bg);
      min-height: 100vh;
      color: var(--inv-text);
    }

    /* ── Page header ── */
    .invl-header {
      background: #1E1B4B;
      padding: 28px 28px 52px;
      position: relative;
      overflow: hidden;
    }
    .invl-header::after {
      content: '';
      position: absolute;
      bottom: -1px; left: 0; right: 0;
      height: 28px;
      background: var(--inv-bg);
      border-radius: 24px 24px 0 0;
    }
    .invl-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .invl-header-content {
      position: relative; z-index: 1;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .invl-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700; color: #fff; letter-spacing: -0.5px;
      display: flex; align-items: center; gap: 12px;
    }
    .invl-page-title-icon {
      width: 36px; height: 36px; background: rgba(255,255,255,0.15);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .invl-page-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 6px; padding-left: 48px; }
    .invl-generate-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #fff; color: var(--inv-accent);
      border: none; border-radius: var(--inv-radius-sm); font-size: 13px; font-weight: 700;
      cursor: pointer; box-shadow: var(--inv-shadow-md); transition: all .15s;
      white-space: nowrap; font-family: 'Inter', sans-serif;
    }
    .invl-generate-btn:hover { background: var(--inv-accent-light); transform: translateY(-1px); }

    /* ── Stats strip ── */
    .invl-stats-wrap {
      padding: 0 24px;
      margin-top: -18px;
      position: relative;
      z-index: 2;
      margin-bottom: 16px;
    }
    .invl-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 10px;
    }
    .invl-stats-breakdown {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .invl-stat-card {
      background: var(--inv-surface); border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius); box-shadow: var(--inv-shadow); padding: 14px 16px;
    }
    .invl-stat-card.with-border-left { border-left-width: 3px; }
    .invl-stat-label {
      font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
      text-transform: uppercase; color: var(--inv-muted); margin-bottom: 6px;
    }
    .invl-stat-value {
      font-size: 20px; font-weight: 700; color: var(--inv-text);
      font-variant-numeric: tabular-nums; line-height: 1;
    }
    .invl-stat-value.accent { color: var(--inv-accent); }
    .invl-stat-value.success { color: var(--inv-success); }
    .invl-stat-value.danger { color: var(--inv-danger); }
    .invl-stat-value.warning { color: var(--inv-warning); }
    .invl-stat-sub-row {
      display: flex; gap: 12px; margin-top: 10px; padding-top: 10px;
      border-top: 1px solid var(--inv-border); flex-wrap: wrap;
    }
    .invl-stat-sub-item { flex: 1; min-width: 0; }
    .invl-stat-sub-label {
      font-size: 10px; font-weight: 600; letter-spacing: 0.4px;
      text-transform: uppercase; color: var(--inv-muted); margin-bottom: 2px;
    }
    .invl-stat-sub-value {
      font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums;
      color: var(--inv-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* ── Toolbar ── */
    .invl-toolbar {
      padding: 0 24px; margin-bottom: 16px;
    }
    .invl-toolbar-inner {
      background: var(--inv-surface); border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius); box-shadow: var(--inv-shadow);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .invl-search-wrap { position: relative; flex: 1; min-width: 200px; }
    .invl-search-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--inv-muted); font-size: 14px; pointer-events: none;
    }
    .invl-search {
      width: 100%; padding: 8px 12px 8px 34px;
      border: 1px solid var(--inv-border); border-radius: var(--inv-radius-sm);
      font-size: 13px; font-family: 'Inter', sans-serif; color: var(--inv-text);
      background: #FAFAFA; outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .invl-search:focus {
      border-color: var(--inv-accent); box-shadow: 0 0 0 3px rgba(79,70,229,.1); background: #fff;
    }
    .invl-search::placeholder { color: var(--inv-muted); }

    .invl-select-wrap { position: relative; min-width: 160px; }
    .invl-select-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--inv-muted); font-size: 13px; pointer-events: none; z-index: 1;
    }
    .invl-select {
      width: 100%; padding: 8px 12px 8px 32px;
      border: 1px solid var(--inv-border); border-radius: var(--inv-radius-sm);
      font-size: 13px; font-family: 'Inter', sans-serif; color: var(--inv-text);
      background: #FAFAFA; outline: none; appearance: none; cursor: pointer;
      transition: border-color .15s;
    }
    .invl-select:focus {
      border-color: var(--inv-accent); box-shadow: 0 0 0 3px rgba(79,70,229,.1);
    }

    .invl-toolbar-count {
      font-size: 12px; color: var(--inv-muted); white-space: nowrap;
      background: #F3F4F6; padding: 6px 12px; border-radius: 6px;
    }

    .invl-icon-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius-sm); background: #FAFAFA;
      color: var(--inv-text); font-size: 13px; font-weight: 500;
      font-family: 'Inter', sans-serif; cursor: pointer;
      transition: all .15s; white-space: nowrap;
    }
    .invl-icon-btn:hover {
      background: var(--inv-accent-light); border-color: var(--inv-accent); color: var(--inv-accent);
    }

    /* ── Body ── */
    .invl-body { padding: 0 24px 40px; }

    /* ── Card ── */
    .invl-card {
      background: var(--inv-surface); border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius); box-shadow: var(--inv-shadow); overflow: hidden;
    }
    .invl-card-header {
      padding: 16px 20px; border-bottom: 1px solid var(--inv-border);
      display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
    }
    .invl-card-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 600; color: var(--inv-text);
    }
    .invl-card-icon {
      width: 28px; height: 28px; background: var(--inv-accent-light); border-radius: 6px;
      display: flex; align-items: center; justify-content: center; color: var(--inv-accent); font-size: 13px;
    }
    .invl-count-badge {
      background: var(--inv-accent-light); color: var(--inv-accent);
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px;
    }

    /* ── Table overrides ── */
    .invl-table-wrap .ant-table { font-size: 13px !important; font-family: 'Inter', sans-serif !important; }
    .invl-table-wrap .ant-table-thead > tr > th {
      background: #F9FAFB !important; color: var(--inv-muted) !important;
      font-size: 11px !important; font-weight: 600 !important;
      text-transform: uppercase !important; letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--inv-border) !important; padding: 10px 16px !important;
    }
    .invl-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid #F3F4F6 !important; padding: 12px 16px !important; vertical-align: middle !important;
    }
    .invl-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .invl-table-wrap .ant-table-tbody > tr:hover > td { background: #FAFBFF !important; }
    .invl-table-wrap .ant-table-tbody > tr { cursor: pointer; }

    /* ── Status pill ── */
    .invl-status {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600;
      letter-spacing: 0.2px; white-space: nowrap;
    }
    .invl-status-dot { width: 5px; height: 5px; border-radius: 50%; }

    /* ── Currency ── */
    .invl-currency { font-variant-numeric: tabular-nums; font-weight: 600; font-size: 13px; color: var(--inv-accent); }
    .invl-currency.danger { color: var(--inv-danger); }
    .invl-currency.success { color: var(--inv-success); }
    .invl-currency.muted { color: var(--inv-muted); font-weight: 500; }

    /* ── Buttons ── */
    .invl-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: var(--inv-radius-sm); font-size: 13px; font-weight: 600;
      font-family: 'Inter', sans-serif; cursor: pointer; border: none; transition: all .15s;
      white-space: nowrap;
    }
    .invl-btn-ghost {
      background: #fff; color: var(--inv-text);
      border: 1.5px solid var(--inv-border) !important;
    }
    .invl-btn-ghost:hover { background: #F9FAFB; }
    .invl-btn-sm { padding: 6px 12px; font-size: 12px; }
    .invl-btn-icon { padding: 7px; }
    .invl-btn-send {
      background: #ECFDF5; color: var(--inv-success);
      border: 1.5px solid #A7F3D0 !important;
    }
    .invl-btn-send:hover { background: var(--inv-success); color: #fff; }

    /* ── Pagination row ── */
    .invl-pagination-row {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--inv-border);
    }
    .invl-pagination-info { font-size: 13px; color: var(--inv-muted); }

    /* ── Mobile cards ── */
    .invl-mobile-list { display: none; }
    .invl-mobile-card {
      background: var(--inv-surface); border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius); padding: 16px; margin-bottom: 10px;
      box-shadow: var(--inv-shadow); cursor: pointer; transition: box-shadow .15s;
    }
    .invl-mobile-card:hover { box-shadow: var(--inv-shadow-md); }
    .invl-mobile-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
    .invl-mobile-invoice-no { font-weight: 700; font-size: 15px; color: var(--inv-accent); }
    .invl-mobile-customer { font-size: 13px; color: var(--inv-text); font-weight: 500; margin-top: 2px; }
    .invl-mobile-company { font-size: 12px; color: var(--inv-muted); }
    .invl-mobile-amounts { display: flex; gap: 0; margin: 10px 0; padding: 10px 0; border-top: 1px solid #F3F4F6; border-bottom: 1px solid #F3F4F6; }
    .invl-mobile-amt-block { flex: 1; padding: 0 8px; }
    .invl-mobile-amt-block:first-child { padding-left: 0; }
    .invl-mobile-amt-block:not(:first-child) { border-left: 1px solid #F3F4F6; }
    .invl-mobile-amt-label { font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--inv-muted); margin-bottom: 3px; }
    .invl-mobile-amt-val { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .invl-mobile-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .invl-mobile-meta { font-size: 12px; color: var(--inv-muted); }
    .invl-mobile-btns { display: flex; gap: 6px; flex-wrap: wrap; }

    /* ── Empty ── */
    .invl-empty { text-align: center; padding: 48px 24px; color: var(--inv-muted); }
    .invl-empty-icon { font-size: 32px; opacity: 0.25; margin-bottom: 12px; }
    .invl-empty-text { font-size: 14px; font-weight: 500; }
    .invl-empty-sub { font-size: 12px; margin-top: 4px; }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .invl-stats { grid-template-columns: repeat(2, 1fr); }
      .invl-stats-breakdown { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .invl-header { padding: 20px 16px 44px; }
      .invl-stats-wrap { padding: 0 16px; }
      .invl-toolbar { padding: 0 16px; }
      .invl-body { padding: 0 16px 40px; }
      .invl-stats { grid-template-columns: repeat(2, 1fr); }
      .invl-stats-breakdown { grid-template-columns: 1fr; }
      .invl-table-wrap { display: none !important; }
      .invl-mobile-list { display: block !important; }
    }
    @media (max-width: 480px) {
      .invl-generate-btn span { display: none; }
      .invl-page-subtitle { padding-left: 0; margin-top: 8px; }
      .invl-stats { gap: 8px; }
    }
  `}</style>
);

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:        { color: '#D97706', bg: '#FFFBEB', label: 'Draft' },
  GENERATED:    { color: '#4F46E5', bg: '#EEF2FF', label: 'Generated' },
  SENT:         { color: '#0891B2', bg: '#ECFEFF', label: 'Sent' },
  PARTIAL_PAID: { color: '#7C3AED', bg: '#F5F3FF', label: 'Partially Paid' },
  PAID:         { color: '#059669', bg: '#ECFDF5', label: 'Paid' },
  OVERDUE:      { color: '#DC2626', bg: '#FEF2F2', label: 'Overdue' },
};

const StatusPill = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || { color: '#6B7280', bg: '#F3F4F6', label: status };
  return (
    <span className="invl-status" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="invl-status-dot" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
};

const formatCurrency = (value: any) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value: any) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Main component ───────────────────────────────────────────────────────────
const InvoiceList = () => {
  const navigate = useNavigate();
  const [openGenerateModal, setOpenGenerateModal] = useState(false);
  const dispatch = useDispatch();
  const { can } = useAccess();

  const { invoices, loading } = useSelector((state: any) => state.invoice);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [pageSize]                    = useState(10);
  const [status, setStatus]           = useState('');

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchInvoices = useCallback(() => {
    dispatch(
      getInvoices({
        page,
        limit: pageSize,
        search: search || undefined,
        status: status || undefined,
      }),
    );
  }, [dispatch, page, pageSize, search, status]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    dispatch(getQuotations({ page: 1, limit: 100 }));
  }, [dispatch]);

  const handleSend = (e: React.MouseEvent, invoiceId: number) => {
    e.stopPropagation();
    dispatch(sendInvoice(invoiceId));
  };

  // ─── Derived values ──────────────────────────────────────────────────────────
  const rows: any[]  = invoices?.rows || [];
  const totalCount   = invoices?.pagination?.total ?? rows.length;
  const pd           = invoices?.paymentDetails || {};

  const totalInvoices    = totalCount;
  const totalOutstanding = (pd.GENERATED?.balanceAmount ?? 0) + (pd.PARTIAL_PAID?.balanceAmount ?? 0);
  const totalRevenue     = pd.PAID?.grandTotal ?? 0;
  const totalPaidCount   = pd.PAID?.count ?? 0;

  const generated   = pd.GENERATED   || { count: 0, grandTotal: 0, paidAmount: 0, balanceAmount: 0 };
  const partialPaid = pd.PARTIAL_PAID || { count: 0, grandTotal: 0, paidAmount: 0, balanceAmount: 0 };
  const paid        = pd.PAID         || { count: 0, grandTotal: 0, paidAmount: 0, balanceAmount: 0 };

  // ─── Table columns ────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Invoice',
      dataIndex: 'invoice_number',
      width: 200,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
            background: record.customer_type === 'BUSINESS' ? '#DBEAFE' : '#ECFDF5',
            color: record.customer_type === 'BUSINESS' ? '#1D4ED8' : '#059669',
          }}>
            {(record.customer_name || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{ fontWeight: 700, color: '#4F46E5', cursor: 'pointer', fontSize: 13 }}
                onClick={() => navigate(`/app/invoice-details/${record.id}`)}
              >
                {record.invoice_number}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--inv-muted)', marginTop: 1 }}>
              {record.invoice_date ? formatDate(record.invoice_date) : '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      width: 200,
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--inv-text)' }}>{record.customer_name || '—'}</div>
          {record.contact_person_phone && (
            <div style={{ fontSize: 11, color: 'var(--inv-muted)', marginTop: 1 }}>{record.contact_person_phone}</div>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3,
            padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600,
            background: record.customer_type === 'BUSINESS' ? '#DBEAFE' : '#ECFDF5',
            color: record.customer_type === 'BUSINESS' ? '#1D4ED8' : '#059669',
          }}>
            {record.customer_type === 'BUSINESS'
              ? <BankOutlined style={{ fontSize: 10 }} />
              : <UserOutlined style={{ fontSize: 10 }} />}
            {record.customer_type === 'BUSINESS' ? 'Business' : 'Individual'}
          </span>
        </div>
      ),
    },
    {
      title: 'Quotation',
      dataIndex: 'quotation_number',
      width: 180,
      render: (v: string) => (
        <span style={{ fontSize: 12, color: 'var(--inv-muted)', fontFamily: 'Courier New, monospace' }}>
          {v || '—'}
        </span>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      width: 120,
      render: (v: string) => {
        const overdue = v && new Date(v) < new Date();
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{
              fontSize: 12,
              color: overdue ? 'var(--inv-danger)' : 'var(--inv-muted)',
              fontWeight: overdue ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {overdue && <WarningOutlined style={{ fontSize: 11 }} />}
              {formatDate(v)}
            </span>
            {overdue && (
              <span style={{ fontSize: 11, color: 'var(--inv-danger)', fontWeight: 600 }}>Overdue</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'grand_total',
      width: 120,
      align: 'right' as const,
      render: (v: any) => (
        <div style={{ textAlign: 'right' }}>
          <div className="invl-currency">{formatCurrency(v)}</div>
          <div style={{ fontSize: 11, color: 'var(--inv-muted)', marginTop: 1 }}>incl. taxes</div>
        </div>
      ),
    },
    {
      title: 'Paid / Balance',
      width: 150,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--inv-muted)', marginBottom: 2 }}>
            <span style={{ color: 'var(--inv-success)', fontWeight: 600 }}>{formatCurrency(record.paid_amount)}</span>
            <span style={{ margin: '0 4px', color: '#D1D5DB' }}>/</span>
            <span style={{ color: Number(record.balance_amount) > 0 ? 'var(--inv-danger)' : 'var(--inv-success)', fontWeight: 600 }}>
              {formatCurrency(record.balance_amount)}
            </span>
          </div>
          {/* Mini progress bar */}
          {Number(record.grand_total) > 0 && (
            <div style={{ height: 4, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (Number(record.paid_amount) / Number(record.grand_total)) * 100)}%`,
                background: Number(record.balance_amount) === 0 ? 'var(--inv-success)' : 'var(--inv-accent)',
                borderRadius: 99,
              }} />
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 140,
      render: (s: string) => <StatusPill status={s} />,
    },
    {
      title: 'Actions',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
          <button
            className="invl-btn invl-btn-ghost invl-btn-icon"
            onClick={() => navigate(`/app/invoice-details/${record.id}`)}
            title="View"
          >
            <EyeOutlined />
          </button>
          <button
            className="invl-btn invl-btn-send invl-btn-sm"
            onClick={(e) => handleSend(e, record.id)}
            title="Send Invoice"
          >
            <MailOutlined />
            Send
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="invl-root">
        <GlobalStyles />

        {/* ── Page header ─────────────────────────────────────────────────────── */}
        <div className="invl-header">
          <div className="invl-header-noise" />
          <div className="invl-header-content">
            <div>
              <div className="invl-page-title">
                <div className="invl-page-title-icon">
                  <FileTextOutlined />
                </div>
                Invoices
              </div>
              <div className="invl-page-subtitle">
                Manage, send, and track all your invoices
              </div>
            </div>
            {can('invoices.create') && (
              <button className="invl-generate-btn" onClick={() => setOpenGenerateModal(true)}>
                <PlusOutlined />
                <span>Generate Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────────────── */}
        {can('invoices.insides') && (
          <div className="invl-stats-wrap">
            <div className="invl-stats">
              <div className="invl-stat-card">
                <div className="invl-stat-label">Total Invoices</div>
                <div className="invl-stat-value accent">{totalInvoices}</div>
              </div>
              <div className="invl-stat-card">
                <div className="invl-stat-label">Revenue Collected</div>
                <div className="invl-stat-value success" style={{ fontSize: 16 }}>{formatCurrency(totalRevenue)}</div>
              </div>
              <div className="invl-stat-card">
                <div className="invl-stat-label">Outstanding Balance</div>
                <div className="invl-stat-value danger" style={{ fontSize: 16 }}>{formatCurrency(totalOutstanding)}</div>
              </div>
              <div className="invl-stat-card">
                <div className="invl-stat-label">Fully Paid</div>
                <div className="invl-stat-value success">{totalPaidCount}</div>
              </div>
            </div>

            {/* Breakdown cards */}
            <div className="invl-stats-breakdown">
              {/* Generated */}
              <div className="invl-stat-card with-border-left" style={{ borderLeftColor: '#4F46E5' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div className="invl-stat-label" style={{ marginBottom: 0 }}>Generated</div>
                  <span className="invl-status" style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 10 }}>
                    <span className="invl-status-dot" style={{ background: '#4F46E5' }} />
                    {generated.count} invoice{generated.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="invl-stat-value accent" style={{ fontSize: 18 }}>{formatCurrency(generated.grandTotal)}</div>
                <div className="invl-stat-sub-row">
                  <div className="invl-stat-sub-item">
                    <div className="invl-stat-sub-label">Paid</div>
                    <div className="invl-stat-sub-value" style={{ color: 'var(--inv-success)' }}>{formatCurrency(generated.paidAmount)}</div>
                  </div>
                  <div className="invl-stat-sub-item">
                    <div className="invl-stat-sub-label">Balance</div>
                    <div className="invl-stat-sub-value" style={{ color: 'var(--inv-danger)' }}>{formatCurrency(generated.balanceAmount)}</div>
                  </div>
                </div>
              </div>

              {/* Partially Paid */}
              <div className="invl-stat-card with-border-left" style={{ borderLeftColor: '#7C3AED' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div className="invl-stat-label" style={{ marginBottom: 0 }}>Partially Paid</div>
                  <span className="invl-status" style={{ background: '#F5F3FF', color: '#7C3AED', fontSize: 10 }}>
                    <span className="invl-status-dot" style={{ background: '#7C3AED' }} />
                    {partialPaid.count} invoice{partialPaid.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="invl-stat-value warning" style={{ fontSize: 18 }}>{formatCurrency(partialPaid.grandTotal)}</div>
                <div className="invl-stat-sub-row">
                  <div className="invl-stat-sub-item">
                    <div className="invl-stat-sub-label">Paid</div>
                    <div className="invl-stat-sub-value" style={{ color: 'var(--inv-success)' }}>{formatCurrency(partialPaid.paidAmount)}</div>
                  </div>
                  <div className="invl-stat-sub-item">
                    <div className="invl-stat-sub-label">Balance</div>
                    <div className="invl-stat-sub-value" style={{ color: 'var(--inv-danger)' }}>{formatCurrency(partialPaid.balanceAmount)}</div>
                  </div>
                </div>
              </div>

              {/* Paid */}
              <div className="invl-stat-card with-border-left" style={{ borderLeftColor: '#059669' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div className="invl-stat-label" style={{ marginBottom: 0 }}>Paid</div>
                  <span className="invl-status" style={{ background: '#ECFDF5', color: '#059669', fontSize: 10 }}>
                    <span className="invl-status-dot" style={{ background: '#059669' }} />
                    {paid.count} invoice{paid.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="invl-stat-value success" style={{ fontSize: 18 }}>{formatCurrency(paid.grandTotal)}</div>
                <div className="invl-stat-sub-row">
                  <div className="invl-stat-sub-item">
                    <div className="invl-stat-sub-label">Collected</div>
                    <div className="invl-stat-sub-value" style={{ color: 'var(--inv-success)' }}>{formatCurrency(paid.paidAmount)}</div>
                  </div>
                  <div className="invl-stat-sub-item">
                    <div className="invl-stat-sub-label">Balance</div>
                    <div className="invl-stat-sub-value">{formatCurrency(paid.balanceAmount)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Toolbar ────────────────────────────────────────────────────────────── */}
        <div className="invl-toolbar">
          <div className="invl-toolbar-inner">
            <div className="invl-search-wrap">
              <SearchOutlined className="invl-search-icon" />
              <input
                className="invl-search"
                placeholder="Search by invoice no, customer…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>

            <div className="invl-select-wrap">
              <FilterOutlined className="invl-select-icon" />
              <select
                className="invl-select"
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="GENERATED">Generated</option>
                <option value="SENT">Sent</option>
                <option value="PARTIAL_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>

            {rows.length > 0 && (
              <span className="invl-toolbar-count">
                {totalCount} invoice{totalCount !== 1 ? 's' : ''}
              </span>
            )}

            <button className="invl-icon-btn" onClick={fetchInvoices}>
              <ReloadOutlined />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────────────── */}
        <div className="invl-body">
          <div className="invl-card">
            <div className="invl-card-header">
              <div className="invl-card-title">
                <div className="invl-card-icon"><FileTextOutlined /></div>
                All Invoices
              </div>
              {totalCount > 0 && (
                <span className="invl-count-badge">{rows.length} shown</span>
              )}
            </div>

            {/* Desktop table */}
            <div className="invl-table-wrap">
              <Table
                rowKey="id"
                loading={loading}
                dataSource={rows.map((r: any) => ({ ...r, key: r.id }))}
                columns={columns}
                onRow={(record) => ({
                  onClick: () => navigate(`/app/invoice-details/${record.id}`),
                })}
                locale={{
                  emptyText: (
                    <div className="invl-empty">
                      <div className="invl-empty-icon"><FileTextOutlined /></div>
                      <div className="invl-empty-text">No invoices found</div>
                      <div className="invl-empty-sub">Try adjusting your search or filters</div>
                    </div>
                  ),
                }}
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            </div>

            {/* Mobile card list */}
            <div className="invl-mobile-list" style={{ padding: '12px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
              ) : rows.length === 0 ? (
                <div className="invl-empty">
                  <div className="invl-empty-icon"><FileTextOutlined /></div>
                  <div className="invl-empty-text">No invoices found</div>
                  <div className="invl-empty-sub">Try adjusting your search or filters</div>
                </div>
              ) : (
                rows.map((record: any) => (
                  <div
                    key={record.id}
                    className="invl-mobile-card"
                    onClick={() => navigate(`/app/invoice-details/${record.id}`)}
                  >
                    <div className="invl-mobile-card-top">
                      <div>
                        <div className="invl-mobile-invoice-no">{record.invoice_number}</div>
                        <div className="invl-mobile-customer">{record.customer_name}</div>
                        {record.quotation_number && (
                          <div className="invl-mobile-company">{record.quotation_number}</div>
                        )}
                      </div>
                      <StatusPill status={record.status} />
                    </div>

                    <div className="invl-mobile-amounts">
                      <div className="invl-mobile-amt-block">
                        <div className="invl-mobile-amt-label">Total</div>
                        <div className="invl-mobile-amt-val" style={{ color: '#4F46E5' }}>
                          {formatCurrency(record.grand_total)}
                        </div>
                      </div>
                      <div className="invl-mobile-amt-block">
                        <div className="invl-mobile-amt-label">Paid</div>
                        <div className="invl-mobile-amt-val" style={{ color: 'var(--inv-success)' }}>
                          {formatCurrency(record.paid_amount)}
                        </div>
                      </div>
                      <div className="invl-mobile-amt-block">
                        <div className="invl-mobile-amt-label">Balance</div>
                        <div
                          className="invl-mobile-amt-val"
                          style={{ color: Number(record.balance_amount) > 0 ? 'var(--inv-danger)' : 'var(--inv-success)' }}
                        >
                          {formatCurrency(record.balance_amount)}
                        </div>
                      </div>
                    </div>

                    <div className="invl-mobile-footer" onClick={e => e.stopPropagation()}>
                      <div className="invl-mobile-meta">Due: {formatDate(record.due_date)}</div>
                      <div className="invl-mobile-btns">
                        <button
                          className="invl-btn invl-btn-ghost invl-btn-sm"
                          onClick={() => navigate(`/app/invoice-details/${record.id}`)}
                        >
                          <EyeOutlined /> View
                        </button>
                        <button
                          className="invl-btn invl-btn-send invl-btn-sm"
                          onClick={(e) => handleSend(e, record.id)}
                        >
                          <MailOutlined /> Send
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="invl-pagination-row">
                <span className="invl-pagination-info">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
                </span>
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={totalCount}
                  showSizeChanger={false}
                  onChange={(newPage) => setPage(newPage)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <GenerateInvoiceModal
        visible={openGenerateModal}
        onClose={() => setOpenGenerateModal(false)}
      />
    </>
  );
};

export default InvoiceList;