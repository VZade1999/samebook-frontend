import React, { useEffect, useState } from "react";
import {
  Spin,
  Table,
  message,
  Tag,
  Typography,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  DollarOutlined,
  BankOutlined,
  EnvironmentOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getInvoiceDetails,
  getInvoiceTimeline,
  addPayment,
} from "../redux/invoiceActions";
import InvoiceItemsTable from "../components/InvoiceItemsTable";
import InvoiceTimeline from "../components/InvoiceTimeline";
import PaymentModal from "../components/PaymentModal";
import { downloadInvoicePDF } from "@/utils/downloadPdf/downloadInvoicePDF";

const { Text } = Typography;

// ─── helpers ─────────────────────────────────────────────────────────────────
const safeParse = (value: any): any => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    let parsed = value;
    while (typeof parsed === "string") parsed = JSON.parse(parsed);
    return parsed || {};
  } catch {
    return {};
  }
};

const formatCurrency = (value: any) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: any) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  GENERATED:      { color: "#4F46E5", bg: "#EEF2FF", label: "Generated" },
  SENT:           { color: "#0891B2", bg: "#ECFEFF", label: "Sent" },
  PARTIALLY_PAID: { color: "#D97706", bg: "#FFFBEB", label: "Partially Paid" },
  PAID:           { color: "#059669", bg: "#ECFDF5", label: "Paid" },
  CANCELLED:      { color: "#DC2626", bg: "#FEF2F2", label: "Cancelled" },
  OVERDUE:        { color: "#EA580C", bg: "#FFF7ED", label: "Overdue" },
};

// ─── Design tokens via CSS variables (injected once) ─────────────────────────
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

    .inv-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--inv-bg);
      min-height: 100vh;
      color: var(--inv-text);
    }

    /* ── Hero strip ── */
    .inv-hero {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%);
      padding: 20px 24px 56px;
      position: relative;
      overflow: hidden;
    }
    .inv-hero::after {
      content: '';
      position: absolute;
      bottom: -1px; left: 0; right: 0;
      height: 32px;
      background: var(--inv-bg);
      border-radius: 24px 24px 0 0;
    }
    .inv-hero-noise {
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .inv-hero-content { position: relative; z-index: 1; }

    .inv-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: rgba(255,255,255,0.75) !important;
      background: rgba(255,255,255,0.1) !important;
      border: 1px solid rgba(255,255,255,0.15) !important;
      border-radius: 8px !important;
      padding: 6px 14px !important;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all .15s;
      margin-bottom: 20px;
    }
    .inv-back-btn:hover {
      background: rgba(255,255,255,0.18) !important;
      color: #fff !important;
    }

    .inv-hero-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .inv-invoice-number {
      font-size: clamp(22px, 4vw, 32px);
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .inv-quotation-ref {
      font-size: 13px;
      color: rgba(255,255,255,0.6);
      margin-top: 4px;
    }
    .inv-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
      margin-top: 8px;
    }
    .inv-status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
    }

    .inv-hero-stats {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .inv-hero-stat {
      text-align: right;
    }
    .inv-hero-stat-label {
      font-size: 11px;
      color: rgba(255,255,255,0.55);
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .inv-hero-stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      font-variant-numeric: tabular-nums;
      line-height: 1.2;
      margin-top: 2px;
    }
    .inv-hero-stat-value.overdue {
      color: #FCA5A5;
    }

    /* ── Action bar ── */
    .inv-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      padding: 0 24px;
      margin-top: -20px;
      position: relative;
      z-index: 2;
      margin-bottom: 20px;
    }
    .inv-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 10px 18px;
      border-radius: var(--inv-radius-sm);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all .15s;
      white-space: nowrap;
      box-shadow: var(--inv-shadow);
    }
    .inv-btn-primary {
      background: var(--inv-accent);
      color: #fff;
    }
    .inv-btn-primary:hover { background: #4338CA; transform: translateY(-1px); box-shadow: var(--inv-shadow-md); }
    .inv-btn-ghost {
      background: var(--inv-surface);
      color: var(--inv-text);
      border: 1px solid var(--inv-border) !important;
    }
    .inv-btn-ghost:hover { background: #F9FAFB; transform: translateY(-1px); box-shadow: var(--inv-shadow-md); }

    /* ── Layout ── */
    .inv-body { padding: 0 24px 40px; max-width: 1120px; margin: 0 auto; }
    .inv-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
    .inv-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 14px; }

    @media (max-width: 900px) {
      .inv-grid-3 { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .inv-hero { padding: 16px 16px 48px; }
      .inv-hero-stats { gap: 16px; }
      .inv-hero-stat { text-align: left; }
      .inv-hero-stat-value { font-size: 15px; }
      .inv-body { padding: 0 16px 40px; }
      .inv-actions { padding: 0 16px; gap: 8px; }
      .inv-btn { padding: 9px 14px; font-size: 12px; flex: 1; justify-content: center; }
      .inv-grid-2 { grid-template-columns: 1fr; }
    }

    /* ── Cards ── */
    .inv-card {
      background: var(--inv-surface);
      border-radius: var(--inv-radius);
      border: 1px solid var(--inv-border);
      box-shadow: var(--inv-shadow);
      overflow: hidden;
    }
    .inv-card-header {
      padding: 14px 20px;
      border-bottom: 1px solid var(--inv-border);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .inv-card-header-icon {
      width: 28px; height: 28px;
      background: var(--inv-accent-light);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: var(--inv-accent);
      font-size: 13px;
      flex-shrink: 0;
    }
    .inv-card-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--inv-text);
    }
    .inv-card-body { padding: 18px 20px; }

    /* ── Detail rows ── */
    .inv-detail-row {
      margin-bottom: 14px;
    }
    .inv-detail-row:last-child { margin-bottom: 0; }
    .inv-detail-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: var(--inv-muted);
      margin-bottom: 3px;
    }
    .inv-detail-value {
      font-size: 14px;
      font-weight: 500;
      color: var(--inv-text);
      line-height: 1.4;
    }

    /* ── Address block ── */
    .inv-address-line {
      font-size: 13px;
      color: var(--inv-text);
      line-height: 1.6;
    }
    .inv-address-sub {
      font-size: 12px;
      color: var(--inv-muted);
    }

    /* ── Summary table ── */
    .inv-summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #F3F4F6;
      font-size: 13px;
    }
    .inv-summary-row:last-child { border-bottom: none; }
    .inv-summary-row.total {
      padding-top: 12px;
      margin-top: 4px;
    }
    .inv-summary-row.total .inv-summary-label,
    .inv-summary-row.total .inv-summary-val {
      font-size: 15px;
      font-weight: 700;
      color: var(--inv-text);
    }
    .inv-summary-label { color: var(--inv-muted); }
    .inv-summary-val { font-variant-numeric: tabular-nums; font-weight: 500; }
    .inv-summary-divider { border: none; border-top: 2px solid var(--inv-border); margin: 8px 0; }

    .inv-balance-strip {
      background: var(--inv-accent-light);
      border-radius: var(--inv-radius-sm);
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
    }
    .inv-balance-strip.danger { background: #FEF2F2; }
    .inv-balance-label { font-size: 12px; font-weight: 600; color: var(--inv-muted); }
    .inv-balance-amount { font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; }

    /* ── Payment history table override ── */
    .inv-table-wrap .ant-table { font-size: 13px !important; font-family: 'Inter', sans-serif !important; }
    .inv-table-wrap .ant-table-thead > tr > th {
      background: #F9FAFB !important;
      color: var(--inv-muted) !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--inv-border) !important;
    }
    .inv-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid #F3F4F6 !important;
      padding: 10px 16px !important;
    }
    .inv-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .inv-table-wrap .ant-table-tbody > tr:hover > td { background: #FAFAFA !important; }

    /* ── Bank details grid ── */
    .inv-bank-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    @media (max-width: 480px) { .inv-bank-grid { grid-template-columns: 1fr; } }

    /* ── Empty state ── */
    .inv-empty {
      text-align: center;
      padding: 32px;
      color: var(--inv-muted);
      font-size: 13px;
    }

    /* ── Loading ── */
    .inv-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      gap: 12px;
      color: var(--inv-muted);
      font-size: 13px;
    }
  `}</style>
);

// ─── AddressBlock ─────────────────────────────────────────────────────────────
const AddressBlock = ({ address }: { address: any }) => {
  const a = safeParse(address);
  if (!Object.keys(a).length) return <span className="inv-address-sub">—</span>;

  return (
    <div>
      {a.label && <div className="inv-address-line" style={{ fontWeight: 600 }}>{a.label}</div>}
      {a.contact_person_name && <div className="inv-address-line">{a.contact_person_name}</div>}
      {a.address_line_1 && <div className="inv-address-line">{a.address_line_1}</div>}
      {a.address_line_2 && <div className="inv-address-line">{a.address_line_2}</div>}
      {(a.city || a.state) && (
        <div className="inv-address-line">{[a.city, a.state].filter(Boolean).join(", ")}</div>
      )}
      {(a.country || a.postal_code) && (
        <div className="inv-address-line">{[a.country, a.postal_code].filter(Boolean).join(" – ")}</div>
      )}
      {a.gst_number && <div className="inv-address-sub" style={{ marginTop: 6 }}>GST: {a.gst_number}</div>}
      {a.contact_person_phone && <div className="inv-address-sub">Ph: {a.contact_person_phone}</div>}
    </div>
  );
};

// ─── BankDetails ──────────────────────────────────────────────────────────────
const BankDetails = ({ snapshot }: { snapshot: any }) => {
  const p = safeParse(snapshot);
  const rows = [
    { label: "Bank", value: p.bank_name },
    { label: "Account Holder", value: p.account_holder_name },
    { label: "Account Number", value: p.account_number },
    { label: "IFSC", value: p.ifsc_code },
    { label: "Branch", value: p.branch_name },
    { label: "Account Type", value: p.account_type },
  ].filter((r) => r.value);

  if (!rows.length) return <span className="inv-address-sub">—</span>;

  return (
    <div className="inv-bank-grid">
      {rows.map((r) => (
        <div key={r.label} className="inv-detail-row">
          <div className="inv-detail-label">{r.label}</div>
          <div className="inv-detail-value">{r.value}</div>
        </div>
      ))}
    </div>
  );
};

// ─── SummaryCard ──────────────────────────────────────────────────────────────
const SummaryCard = ({ invoice: inv }: { invoice: any }) => {
  if (!inv) return null;

  const rows = [
    { label: "Sub Total", value: inv.sub_total, negative: false },
    { label: `Discount (${inv.discount_percent || 0}%)`, value: inv.discount_amount, negative: true },
    { label: `CGST (${inv.cgst_percent || 0}%)`, value: inv.cgst_amount },
    { label: `SGST (${inv.sgst_percent || 0}%)`, value: inv.sgst_amount },
    { label: `IGST (${inv.igst_percent || 0}%)`, value: inv.igst_amount },
    { label: "Transport Charges", value: inv.transport_charges },
  ];

  const isOwed = Number(inv.balance_amount) > 0;

  return (
    <div className="inv-card">
      <div className="inv-card-header">
        <div className="inv-card-header-icon">
          <DollarOutlined />
        </div>
        <span className="inv-card-title">Invoice Summary</span>
      </div>
      <div className="inv-card-body">
        {rows.map(({ label, value, negative }) => (
          <div key={label} className="inv-summary-row">
            <span className="inv-summary-label">{label}</span>
            <span className="inv-summary-val" style={{ color: negative ? "var(--inv-danger)" : undefined }}>
              {negative ? `− ${formatCurrency(value)}` : formatCurrency(value)}
            </span>
          </div>
        ))}

        <hr className="inv-summary-divider" />

        <div className="inv-summary-row total">
          <span className="inv-summary-label">Grand Total</span>
          <span className="inv-summary-val">{formatCurrency(inv.grand_total)}</span>
        </div>

        <div className="inv-summary-row" style={{ paddingBottom: 0 }}>
          <span className="inv-summary-label">Paid Amount</span>
          <span className="inv-summary-val" style={{ color: "var(--inv-success)", fontWeight: 600 }}>
            {formatCurrency(inv.paid_amount)}
          </span>
        </div>

        <div className={`inv-balance-strip ${isOwed ? "danger" : ""}`}>
          <span className="inv-balance-label">Balance Due</span>
          <span
            className="inv-balance-amount"
            style={{ color: isOwed ? "var(--inv-danger)" : "var(--inv-success)" }}
          >
            {formatCurrency(inv.balance_amount)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const { selectedInvoice, timeline, detailsLoading } = useSelector(
    (state: any) => state.invoice,
  );

  useEffect(() => {
    if (id) {
      dispatch(getInvoiceDetails(Number(id)));
      dispatch(getInvoiceTimeline(Number(id)));
    }
  }, [id]);

  const handleAddPayment = (values: any) => {
    dispatch(
      addPayment({
        id: Number(id),
        ...values,
        payment_date: values.payment_date.format("YYYY-MM-DD"),
      }),
    );
    setPaymentModalOpen(false);
    message.success("Payment recorded successfully");
  };

  const paymentColumns = [
    {
      title: "Date",
      dataIndex: "payment_date",
      render: (v: string) => formatDate(v),
    },
    { title: "Method", dataIndex: "payment_mode" },
    { title: "Reference", dataIndex: "transaction_reference" },
    {
      title: "Amount",
      dataIndex: "amount",
      align: "right" as const,
      render: (v: any) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--inv-success)" }}>
          {formatCurrency(v)}
        </span>
      ),
    },
  ];

  const inv = selectedInvoice || {};
  const statusCfg = STATUS_CONFIG[inv.status] || { color: "#6B7280", bg: "#F3F4F6", label: inv.status || "—" };
  const isDueDatePast = inv.due_date && new Date(inv.due_date) < new Date();

  if (detailsLoading) {
    return (
      <div className="inv-root">
        <GlobalStyles />
        <div className="inv-loading">
          <Spin size="large" />
          <span>Loading invoice…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inv-root">
      <GlobalStyles />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="inv-hero">
        <div className="inv-hero-noise" />
        <div className="inv-hero-content">
          <button className="inv-back-btn" onClick={() => navigate("/app/invoice")}>
            <ArrowLeftOutlined style={{ fontSize: 12 }} />
            All Invoices
          </button>

          <div className="inv-hero-meta">
            <div>
              <div className="inv-invoice-number">{inv.invoice_number || "—"}</div>
              {inv.quotation_number && (
                <div className="inv-quotation-ref">Ref: {inv.quotation_number}</div>
              )}
              {inv.status && (
                <div
                  className="inv-status-pill"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}
                >
                  <span className="inv-status-dot" style={{ background: statusCfg.color }} />
                  {statusCfg.label}
                </div>
              )}
            </div>

            <div className="inv-hero-stats">
              <div className="inv-hero-stat">
                <div className="inv-hero-stat-label">
                  <CalendarOutlined style={{ marginRight: 4 }} />Invoice Date
                </div>
                <div className="inv-hero-stat-value">{formatDate(inv.invoice_date)}</div>
              </div>
              <div className="inv-hero-stat">
                <div className="inv-hero-stat-label">
                  <ClockCircleOutlined style={{ marginRight: 4 }} />Due Date
                </div>
                <div className={`inv-hero-stat-value ${isDueDatePast ? "overdue" : ""}`}>
                  {formatDate(inv.due_date)}
                </div>
              </div>
              <div className="inv-hero-stat">
                <div className="inv-hero-stat-label">Grand Total</div>
                <div className="inv-hero-stat-value" style={{ fontSize: 22 }}>
                  {formatCurrency(inv.grand_total)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="inv-actions">
        <button className="inv-btn inv-btn-primary" onClick={() => setPaymentModalOpen(true)}>
          <DollarOutlined />
          Add Payment
        </button>
        <button className="inv-btn inv-btn-ghost" onClick={() => downloadInvoicePDF(inv)}>
          <DownloadOutlined />
          Download PDF
        </button>
      </div>

      <div className="inv-body">

        {/* ── Customer + Addresses ────────────────────────────────────────── */}
        <div className="inv-grid-3">
          {/* Customer */}
          <div className="inv-card">
            <div className="inv-card-header">
              <div className="inv-card-header-icon"><UserOutlined /></div>
              <span className="inv-card-title">Customer</span>
            </div>
            <div className="inv-card-body">
              <div className="inv-detail-row">
                <div className="inv-detail-label">Name</div>
                <div className="inv-detail-value">{inv.customer_name || "—"}</div>
              </div>
              <div className="inv-detail-row">
                <div className="inv-detail-label">GST Number</div>
                <div className="inv-detail-value">{inv.customer_gst_number || "—"}</div>
              </div>
              {inv.contact_person_email && (
                <div className="inv-detail-row">
                  <div className="inv-detail-label">Email</div>
                  <div className="inv-detail-value" style={{ wordBreak: "break-all" }}>
                    {inv.contact_person_email}
                  </div>
                </div>
              )}
              {inv.contact_person_phone && (
                <div className="inv-detail-row">
                  <div className="inv-detail-label">Phone</div>
                  <div className="inv-detail-value">{inv.contact_person_phone}</div>
                </div>
              )}
            </div>
          </div>

          {/* Billing */}
          <div className="inv-card">
            <div className="inv-card-header">
              <div className="inv-card-header-icon"><EnvironmentOutlined /></div>
              <span className="inv-card-title">Billing Address</span>
            </div>
            <div className="inv-card-body">
              <AddressBlock address={inv.billing_address_snapshot} />
            </div>
          </div>

          {/* Shipping */}
          <div className="inv-card">
            <div className="inv-card-header">
              <div className="inv-card-header-icon"><EnvironmentOutlined /></div>
              <span className="inv-card-title">Shipping Address</span>
            </div>
            <div className="inv-card-body">
              <AddressBlock address={inv.shipping_address_snapshot} />
            </div>
          </div>
        </div>

        {/* ── Items table ─────────────────────────────────────────────────── */}
        <div className="inv-card" style={{ marginBottom: 14 }}>
          <div className="inv-card-header">
            <div className="inv-card-header-icon"><FileTextOutlined /></div>
            <span className="inv-card-title">Invoice Items</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <InvoiceItemsTable items={inv.items || []} />
          </div>
        </div>

        {/* ── Summary + Bank details ───────────────────────────────────────── */}
        <div className="inv-grid-2">
          <SummaryCard invoice={inv} />

          <div className="inv-card">
            <div className="inv-card-header">
              <div className="inv-card-header-icon"><BankOutlined /></div>
              <span className="inv-card-title">Bank Details</span>
            </div>
            <div className="inv-card-body">
              <BankDetails snapshot={inv.payment_details_snapshot} />
            </div>
          </div>
        </div>

        {/* ── Payment History ──────────────────────────────────────────────── */}
        <div className="inv-card" style={{ marginBottom: 14 }}>
          <div className="inv-card-header">
            <div className="inv-card-header-icon" style={{ background: "#ECFDF5", color: "var(--inv-success)" }}>
              <DollarOutlined />
            </div>
            <span className="inv-card-title">Payment History</span>
            {(inv.payments?.length > 0) && (
              <span
                style={{
                  marginLeft: "auto",
                  background: "#ECFDF5",
                  color: "var(--inv-success)",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 99,
                }}
              >
                {inv.payments.length} payment{inv.payments.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="inv-table-wrap">
            <Table
              rowKey="id"
              pagination={false}
              columns={paymentColumns}
              dataSource={inv.payments || []}
              locale={{
                emptyText: (
                  <div className="inv-empty">
                    <DollarOutlined style={{ fontSize: 24, marginBottom: 8, display: "block", opacity: 0.3 }} />
                    No payments recorded yet
                  </div>
                ),
              }}
              size="small"
            />
          </div>
        </div>

        {/* ── Timeline ─────────────────────────────────────────────────────── */}
        <div className="inv-card">
          <div className="inv-card-header">
            <div className="inv-card-header-icon" style={{ background: "#F5F3FF", color: "#7C3AED" }}>
              <ClockCircleOutlined />
            </div>
            <span className="inv-card-title">Activity Timeline</span>
          </div>
          <div className="inv-card-body">
            <InvoiceTimeline data={timeline || []} />
          </div>
        </div>

      </div>

      <PaymentModal
        visible={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSubmit={handleAddPayment}
      />
    </div>
  );
};

export default InvoiceDetails;