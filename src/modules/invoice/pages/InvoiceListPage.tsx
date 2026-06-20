import React, { useCallback, useEffect, useState } from 'react';
import { Table, Spin, Pagination } from 'antd';
import {
  EyeOutlined,
  MailOutlined,
  ReloadOutlined,
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { getInvoices, sendInvoice } from '../redux/invoiceActions';
import GenerateInvoiceModal from '../components/GenerateInvoiceModal';
import { useNavigate } from 'react-router-dom';
import { getQuotations } from '@/modules/quotation/redux/quotationActions';

// ─── Design tokens (shared with InvoiceDetails) ───────────────────────────────
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
      --inv-text: #111827;
      --inv-muted: #6B7280;
      --inv-radius: 12px;
      --inv-radius-sm: 8px;
      --inv-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --inv-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }

    .invl-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--inv-bg);
      min-height: 100vh;
      color: var(--inv-text);
    }

    /* ── Page header ── */
    .invl-header {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%);
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
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .invl-header-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    .invl-header-left {}
    .invl-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
      line-height: 1.1;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .invl-page-title-icon {
      width: 36px; height: 36px;
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .invl-page-subtitle {
      color: rgba(255,255,255,0.6);
      font-size: 13px;
      margin-top: 6px;
      padding-left: 48px;
    }

    .invl-generate-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #fff;
      color: var(--inv-accent);
      border: none;
      border-radius: var(--inv-radius-sm);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: var(--inv-shadow-md);
      transition: all .15s;
      white-space: nowrap;
      font-family: 'Inter', sans-serif;
    }
    .invl-generate-btn:hover {
      background: var(--inv-accent-light);
      transform: translateY(-1px);
    }

    /* ── Toolbar ── */
    .invl-toolbar {
      padding: 0 24px;
      margin-top: -18px;
      position: relative;
      z-index: 2;
      margin-bottom: 16px;
    }
    .invl-toolbar-inner {
      background: var(--inv-surface);
      border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius);
      box-shadow: var(--inv-shadow);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .invl-search-wrap {
      position: relative;
      flex: 1;
      min-width: 180px;
    }
    .invl-search-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--inv-muted);
      font-size: 14px;
      pointer-events: none;
    }
    .invl-search {
      width: 100%;
      padding: 8px 12px 8px 34px;
      border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius-sm);
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: var(--inv-text);
      background: #FAFAFA;
      outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    .invl-search:focus {
      border-color: var(--inv-accent);
      box-shadow: 0 0 0 3px rgba(79,70,229,.1);
      background: #fff;
    }
    .invl-search::placeholder { color: var(--inv-muted); }

    .invl-select-wrap {
      position: relative;
      min-width: 160px;
    }
    .invl-select-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--inv-muted);
      font-size: 13px;
      pointer-events: none;
      z-index: 1;
    }
    .invl-select {
      width: 100%;
      padding: 8px 12px 8px 32px;
      border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius-sm);
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: var(--inv-text);
      background: #FAFAFA;
      outline: none;
      appearance: none;
      cursor: pointer;
      transition: border-color .15s;
    }
    .invl-select:focus {
      border-color: var(--inv-accent);
      box-shadow: 0 0 0 3px rgba(79,70,229,.1);
    }

    .invl-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 14px;
      border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius-sm);
      background: #FAFAFA;
      color: var(--inv-text);
      font-size: 13px;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all .15s;
      white-space: nowrap;
    }
    .invl-icon-btn:hover {
      background: var(--inv-accent-light);
      border-color: var(--inv-accent);
      color: var(--inv-accent);
    }

    /* ── Stats strip ── */
    .invl-stats {
      padding: 0 24px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .invl-stat-card {
      background: var(--inv-surface);
      border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius);
      box-shadow: var(--inv-shadow);
      padding: 14px 16px;
    }
    .invl-stat-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: var(--inv-muted);
      margin-bottom: 6px;
    }
    .invl-stat-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--inv-text);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .invl-stat-value.accent { color: var(--inv-accent); }
    .invl-stat-value.success { color: var(--inv-success); }
    .invl-stat-value.danger { color: var(--inv-danger); }

    /* ── Main card ── */
    .invl-body { padding: 0 24px 40px; }
    .invl-card {
      background: var(--inv-surface);
      border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius);
      box-shadow: var(--inv-shadow);
      overflow: hidden;
    }
    .invl-card-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--inv-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .invl-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--inv-text);
    }
    .invl-card-icon {
      width: 28px; height: 28px;
      background: var(--inv-accent-light);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: var(--inv-accent);
      font-size: 13px;
    }
    .invl-count-badge {
      background: var(--inv-accent-light);
      color: var(--inv-accent);
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 99px;
    }

    /* ── Table overrides ── */
    .invl-table-wrap .ant-table {
      font-size: 13px !important;
      font-family: 'Inter', sans-serif !important;
    }
    .invl-table-wrap .ant-table-thead > tr > th {
      background: #F9FAFB !important;
      color: var(--inv-muted) !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--inv-border) !important;
      padding: 10px 16px !important;
    }
    .invl-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid #F3F4F6 !important;
      padding: 12px 16px !important;
      vertical-align: middle !important;
    }
    .invl-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .invl-table-wrap .ant-table-tbody > tr:hover > td { background: #FAFBFF !important; }
    .invl-table-wrap .ant-table-tbody > tr { cursor: pointer; }

    /* ── Status pill ── */
    .invl-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .invl-status-dot { width: 5px; height: 5px; border-radius: 50%; }

    /* ── Currency cells ── */
    .invl-currency {
      font-variant-numeric: tabular-nums;
      font-weight: 500;
      font-size: 13px;
    }
    .invl-currency.danger { color: var(--inv-danger); }
    .invl-currency.success { color: var(--inv-success); }

    /* ── Row actions ── */
    .invl-actions-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .invl-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      border: 1px solid var(--inv-border);
      background: #FAFAFA;
      color: var(--inv-text);
      transition: all .12s;
      white-space: nowrap;
    }
    .invl-action-btn:hover {
      background: var(--inv-accent-light);
      border-color: var(--inv-accent);
      color: var(--inv-accent);
    }
    .invl-action-btn.mail:hover {
      background: #ECFDF5;
      border-color: var(--inv-success);
      color: var(--inv-success);
    }

    /* ── Mobile card view ── */
    .invl-mobile-list { display: none; }
    .invl-mobile-card {
      background: var(--inv-surface);
      border: 1px solid var(--inv-border);
      border-radius: var(--inv-radius);
      padding: 16px;
      margin-bottom: 10px;
      box-shadow: var(--inv-shadow);
      cursor: pointer;
      transition: box-shadow .15s;
    }
    .invl-mobile-card:hover { box-shadow: var(--inv-shadow-md); }
    .invl-mobile-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .invl-mobile-invoice-no {
      font-weight: 700;
      font-size: 15px;
      color: var(--inv-text);
    }
    .invl-mobile-customer {
      font-size: 13px;
      color: var(--inv-muted);
      margin-top: 2px;
    }
    .invl-mobile-amounts {
      display: flex;
      gap: 16px;
      margin: 10px 0;
      padding: 10px 0;
      border-top: 1px solid #F3F4F6;
      border-bottom: 1px solid #F3F4F6;
    }
    .invl-mobile-amount-block { flex: 1; }
    .invl-mobile-amount-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: var(--inv-muted);
      margin-bottom: 3px;
    }
    .invl-mobile-amount-val {
      font-size: 14px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .invl-mobile-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .invl-mobile-dates {
      font-size: 12px;
      color: var(--inv-muted);
    }
    .invl-mobile-btns { display: flex; gap: 6px; }

    /* ── Empty state ── */
    .invl-empty {
      text-align: center;
      padding: 48px 24px;
      color: var(--inv-muted);
    }
    .invl-empty-icon {
      font-size: 32px;
      opacity: 0.25;
      margin-bottom: 12px;
    }
    .invl-empty-text { font-size: 14px; font-weight: 500; }
    .invl-empty-sub { font-size: 12px; margin-top: 4px; }

    /* ── Responsive breakpoints ── */
    @media (max-width: 1024px) {
      .invl-stats { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .invl-header { padding: 20px 16px 44px; }
      .invl-toolbar { padding: 0 16px; }
      .invl-toolbar-inner { gap: 8px; }
      .invl-stats { padding: 0 16px; grid-template-columns: repeat(2, 1fr); }
      .invl-body { padding: 0 16px 40px; }
      /* Hide desktop table, show mobile cards */
      .invl-table-wrap { display: none !important; }
      .invl-mobile-list { display: block !important; }
    }
    @media (max-width: 480px) {
      .invl-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .invl-search-wrap { min-width: 0; }
      .invl-select-wrap { min-width: 0; }
      .invl-generate-btn span { display: none; }
    }
  `}</style>
);

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT:          { color: '#D97706', bg: '#FFFBEB', label: 'Draft' },
  GENERATED:      { color: '#4F46E5', bg: '#EEF2FF', label: 'Generated' },
  SENT:           { color: '#0891B2', bg: '#ECFEFF', label: 'Sent' },
  PARTIALLY_PAID: { color: '#7C3AED', bg: '#F5F3FF', label: 'Partially Paid' },
  PAID:           { color: '#059669', bg: '#ECFDF5', label: 'Paid' },
  OVERDUE:        { color: '#DC2626', bg: '#FEF2F2', label: 'Overdue' },
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

  const { invoices, loading } = useSelector((state: any) => state.invoice);

  // `searchInput` is what the text box shows (updates instantly).
  // `search` is what actually drives the fetch, updated after a short
  // debounce so we don't fire an API call on every keystroke.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Single source of truth for fetching invoices — reused by the effect
  // below and the Refresh button, so they can never drift apart.
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

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Loads quotations once on mount (e.g. for the Generate Invoice modal's
  // quotation picker). Deliberately NOT tied to the invoice table's own
  // search/page/status — those filters apply to invoices, not quotations.
  useEffect(() => {
    dispatch(getQuotations({ page: 1, limit: 100 }));
  }, [dispatch]);

  const handleSend = (e: React.MouseEvent, invoiceId: number) => {
    e.stopPropagation();
    dispatch(sendInvoice(invoiceId));
  };

  const rows: any[] = invoices?.rows || [];
  // Adjust `count` below if your invoice reducer names the total field
  // differently (e.g. `total`, `totalCount`).
  const totalCount: number = invoices?.count ?? rows.length;

  // Derived stats reflect only the currently loaded page, not all
  // invoices. If you have a stats endpoint or full counts from the API,
  // swap these out for that.
  const totalInvoices = rows.length;
  const totalPaid = rows.filter(r => r.status === 'PAID').length;
  const totalOverdue = rows.filter(r => r.status === 'OVERDUE').length;
  const totalOutstanding = rows.reduce((s: number, r: any) => s + Number(r.balance_amount || 0), 0);

  const columns = [
    {
      title: 'Invoice No',
      dataIndex: 'invoice_number',
      render: (v: string) => <span style={{ fontWeight: 600, color: 'var(--inv-text)' }}>{v || '—'}</span>,
    },
    {
      title: 'Quotation No',
      dataIndex: 'quotation_number',
      render: (v: string) => <span style={{ color: 'var(--inv-muted)' }}>{v || '—'}</span>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: 'Invoice Date',
      dataIndex: 'invoice_date',
      render: (v: string) => <span style={{ color: 'var(--inv-muted)', fontSize: 12 }}>{formatDate(v)}</span>,
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      render: (v: string) => {
        const overdue = v && new Date(v) < new Date();
        return (
          <span style={{ fontSize: 12, color: overdue ? 'var(--inv-danger)' : 'var(--inv-muted)', fontWeight: overdue ? 600 : 400 }}>
            {formatDate(v)}
          </span>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'grand_total',
      align: 'right' as const,
      render: (v: any) => <span className="invl-currency">{formatCurrency(v)}</span>,
    },
    {
      title: 'Paid',
      dataIndex: 'paid_amount',
      align: 'right' as const,
      render: (v: any) => <span className="invl-currency success">{formatCurrency(v)}</span>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance_amount',
      align: 'right' as const,
      render: (v: any) => (
        <span className={`invl-currency ${Number(v) > 0 ? 'danger' : 'success'}`}>
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => <StatusPill status={s} />,
    },
    {
      title: 'Actions',
      render: (_: any, record: any) => (
        <div className="invl-actions-cell" onClick={e => e.stopPropagation()}>
          <button
            className="invl-action-btn"
            onClick={() => navigate(`/app/invoice-details/${record.id}`)}
          >
            <EyeOutlined />
            View
          </button>
          <button
            className="invl-action-btn mail"
            onClick={(e) => handleSend(e, record.id)}
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

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="invl-header">
          <div className="invl-header-noise" />
          <div className="invl-header-content">
            <div className="invl-header-left">
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
            <button className="invl-generate-btn" onClick={() => setOpenGenerateModal(true)}>
              <PlusOutlined />
              <span>Generate Invoice</span>
            </button>
          </div>
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
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
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>

            <button className="invl-icon-btn" onClick={fetchInvoices}>
              <ReloadOutlined />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="invl-stats">
          <div className="invl-stat-card">
            <div className="invl-stat-label">Total Invoices</div>
            <div className="invl-stat-value accent">{totalInvoices}</div>
          </div>
          <div className="invl-stat-card">
            <div className="invl-stat-label">Paid</div>
            <div className="invl-stat-value success">{totalPaid}</div>
          </div>
          <div className="invl-stat-card">
            <div className="invl-stat-label">Overdue</div>
            <div className="invl-stat-value danger">{totalOverdue}</div>
          </div>
          <div className="invl-stat-card">
            <div className="invl-stat-label">Outstanding</div>
            <div className="invl-stat-value" style={{ fontSize: 16 }}>{formatCurrency(totalOutstanding)}</div>
          </div>
        </div>

        {/* ── Table (desktop) ──────────────────────────────────────────────── */}
        <div className="invl-body">
          <div className="invl-card">
            <div className="invl-card-header">
              <div className="invl-card-title">
                <div className="invl-card-icon"><FileTextOutlined /></div>
                All Invoices
              </div>
              {rows.length > 0 && (
                <span className="invl-count-badge">{totalCount} invoice{totalCount !== 1 ? 's' : ''}</span>
              )}
            </div>

            <div className="invl-table-wrap">
              <Table
                rowKey="id"
                loading={loading}
                dataSource={rows}
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
                pagination={{
                  current: page,
                  pageSize,
                  total: totalCount,
                  showSizeChanger: false,
                  showTotal: (total) => `${total} invoice${total !== 1 ? 's' : ''}`,
                  onChange: (newPage) => setPage(newPage),
                  style: { padding: '12px 16px' },
                }}
              />
            </div>

            {/* ── Mobile card list ──────────────────────────────────────────── */}
            <div className="invl-mobile-list" style={{ padding: '12px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
              ) : rows.length === 0 ? (
                <div className="invl-empty">
                  <div className="invl-empty-icon"><FileTextOutlined /></div>
                  <div className="invl-empty-text">No invoices found</div>
                  <div className="invl-empty-sub">Try adjusting your search or filters</div>
                </div>
              ) : (
                <>
                  {rows.map((record: any) => (
                    <div
                      key={record.id}
                      className="invl-mobile-card"
                      onClick={() => navigate(`/app/invoice-details/${record.id}`)}
                    >
                      <div className="invl-mobile-card-top">
                        <div>
                          <div className="invl-mobile-invoice-no">{record.invoice_number}</div>
                          <div className="invl-mobile-customer">{record.customer_name}</div>
                        </div>
                        <StatusPill status={record.status} />
                      </div>

                      <div className="invl-mobile-amounts">
                        <div className="invl-mobile-amount-block">
                          <div className="invl-mobile-amount-label">Total</div>
                          <div className="invl-mobile-amount-val">{formatCurrency(record.grand_total)}</div>
                        </div>
                        <div className="invl-mobile-amount-block">
                          <div className="invl-mobile-amount-label">Paid</div>
                          <div className="invl-mobile-amount-val" style={{ color: 'var(--inv-success)' }}>
                            {formatCurrency(record.paid_amount)}
                          </div>
                        </div>
                        <div className="invl-mobile-amount-block">
                          <div className="invl-mobile-amount-label">Balance</div>
                          <div
                            className="invl-mobile-amount-val"
                            style={{ color: Number(record.balance_amount) > 0 ? 'var(--inv-danger)' : 'var(--inv-success)' }}
                          >
                            {formatCurrency(record.balance_amount)}
                          </div>
                        </div>
                      </div>

                      <div className="invl-mobile-footer">
                        <div className="invl-mobile-dates">
                          Due: {formatDate(record.due_date)}
                        </div>
                        <div className="invl-mobile-btns" onClick={e => e.stopPropagation()}>
                          <button className="invl-action-btn" onClick={() => navigate(`/app/invoice-details/${record.id}`)}>
                            <EyeOutlined /> View
                          </button>
                          <button className="invl-action-btn mail" onClick={(e) => handleSend(e, record.id)}>
                            <MailOutlined /> Send
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {totalCount > pageSize && (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                      <Pagination
                        size="small"
                        current={page}
                        pageSize={pageSize}
                        total={totalCount}
                        showSizeChanger={false}
                        onChange={(newPage) => setPage(newPage)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
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