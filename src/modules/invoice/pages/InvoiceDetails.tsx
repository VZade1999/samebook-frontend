import React, { useEffect, useState } from "react";
import { Spin, Table, Tooltip } from "antd";
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
  ShopOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  MailOutlined,
  WarningOutlined,
  NumberOutlined,
  PhoneOutlined,
  CopyOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  TagOutlined,
  CarOutlined,
  PercentageOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getInvoiceDetails,
  getInvoiceTimeline,
  addPayment,
} from "../redux/invoiceActions";
import InvoiceItemsTable from "../components/InvoiceItemsTable";
import PaymentModal from "../components/PaymentModal";
import { downloadInvoicePDF } from "@/utils/downloadPdf/downloadInvoicePDF";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeParse = (value: any): any => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    let parsed = value;
    while (typeof parsed === "string") parsed = JSON.parse(parsed);
    return parsed || {};
  } catch { return {}; }
};

const fmt = (value: any) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (value: any) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (value: any) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const copyToClipboard = (text: string) => {
  navigator.clipboard?.writeText(text);
};

// ─── Status + Action configs ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; glow: string; label: string }> = {
  DRAFT:          { color: "#D97706", bg: "#FFFBEB", glow: "rgba(217,119,6,.15)",   label: "Draft" },
  GENERATED:      { color: "#4F46E5", bg: "#EEF2FF", glow: "rgba(79,70,229,.15)",   label: "Generated" },
  SENT:           { color: "#0891B2", bg: "#ECFEFF", glow: "rgba(8,145,178,.15)",   label: "Sent" },
  PARTIAL_PAID:   { color: "#7C3AED", bg: "#F5F3FF", glow: "rgba(124,58,237,.15)",  label: "Partially Paid" },
  PARTIALLY_PAID: { color: "#7C3AED", bg: "#F5F3FF", glow: "rgba(124,58,237,.15)",  label: "Partially Paid" },
  PAID:           { color: "#059669", bg: "#ECFDF5", glow: "rgba(5,150,105,.15)",   label: "Paid" },
  OVERDUE:        { color: "#DC2626", bg: "#FEF2F2", glow: "rgba(220,38,38,.15)",   label: "Overdue" },
  CANCELLED:      { color: "#DC2626", bg: "#FEF2F2", glow: "rgba(220,38,38,.15)",   label: "Cancelled" },
};

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  INVOICE_GENERATED:    { label: "Invoice Generated",  color: "#4F46E5", bg: "#EEF2FF", icon: <FileTextOutlined /> },
  INVOICE_SENT:         { label: "Invoice Sent",       color: "#0891B2", bg: "#ECFEFF", icon: <MailOutlined /> },
  INVOICE_PAID:         { label: "Fully Paid",         color: "#059669", bg: "#ECFDF5", icon: <CheckCircleOutlined /> },
  INVOICE_PARTIAL_PAID: { label: "Partial Payment",    color: "#7C3AED", bg: "#F5F3FF", icon: <DollarOutlined /> },
  INVOICE_OVERDUE:      { label: "Marked Overdue",     color: "#DC2626", bg: "#FEF2F2", icon: <WarningOutlined /> },
  INVOICE_CANCELLED:    { label: "Cancelled",          color: "#DC2626", bg: "#FEF2F2", icon: <WarningOutlined /> },
};

// ─── Global Styles ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --id-bg: #F0F1F7;
      --id-surface: #FFFFFF;
      --id-border: #E5E7EB;
      --id-border-light: #F3F4F6;
      --id-accent: #4F46E5;
      --id-accent-light: #EEF2FF;
      --id-success: #059669;
      --id-danger: #DC2626;
      --id-warning: #D97706;
      --id-purple: #7C3AED;
      --id-text: #111827;
      --id-muted: #6B7280;
      --id-radius: 14px;
      --id-radius-sm: 8px;
      --id-shadow: 0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04);
      --id-shadow-md: 0 4px 16px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      --id-shadow-lg: 0 12px 36px rgba(0,0,0,.1), 0 4px 8px rgba(0,0,0,.05);
    }

    .id-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--id-bg);
      min-height: 100vh;
      color: var(--id-text);
    }

    /* ── Hero ── */
    .id-hero {
      background: #1E1B4B;
      padding: 0;
      position: relative;
      overflow: hidden;
    }
    .id-hero-gradient {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, #1E1B4B 0%, #2D2A6E 40%, #3730A3 70%, #4338CA 100%);
    }
    .id-hero-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .id-hero-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      pointer-events: none;
      opacity: 0.18;
    }
    .id-hero-orb-1 { width: 320px; height: 320px; background: #818CF8; top: -80px; right: 10%; }
    .id-hero-orb-2 { width: 200px; height: 200px; background: #A78BFA; bottom: -40px; left: 20%; }
    .id-hero::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0;
      height: 32px; background: var(--id-bg);
      border-radius: 28px 28px 0 0;
    }
    .id-hero-inner {
      position: relative; z-index: 1;
      padding: 24px 28px 56px;
    }

    .id-back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px; padding: 6px 14px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      cursor: pointer; transition: all .15s; margin-bottom: 22px;
    }
    .id-back-btn:hover { background: rgba(255,255,255,0.15); color: #fff; border-color: rgba(255,255,255,0.25); }

    .id-hero-main {
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 20px;
    }

    .id-hero-left {}
    .id-invoice-eyebrow {
      font-size: 11px; font-weight: 700; letter-spacing: 1.2px;
      text-transform: uppercase; color: rgba(255,255,255,0.45);
      margin-bottom: 6px;
    }
    .id-invoice-number {
      font-size: clamp(26px, 4vw, 36px); font-weight: 800;
      color: #fff; letter-spacing: -0.8px; line-height: 1;
    }
    .id-invoice-meta { margin-top: 8px; display: flex; flex-direction: column; gap: 3px; }
    .id-invoice-meta-line { font-size: 13px; color: rgba(255,255,255,0.55); display: flex; align-items: center; gap: 5px; }
    .id-invoice-meta-line strong { color: rgba(255,255,255,0.8); font-weight: 500; }

    .id-status-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 13px; border-radius: 999px;
      font-size: 12px; font-weight: 700; letter-spacing: 0.3px; margin-top: 12px;
    }
    .id-status-dot { width: 6px; height: 6px; border-radius: 50%; }

    /* Hero right — financial snapshot */
    .id-hero-financials {
      display: flex; flex-direction: column; gap: 10px; align-items: flex-end;
    }
    .id-fin-card {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px; padding: 14px 18px;
      min-width: 180px; text-align: right;
    }
    .id-fin-label {
      font-size: 10px; font-weight: 600; letter-spacing: 0.8px;
      text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 4px;
    }
    .id-fin-amount {
      font-size: 26px; font-weight: 800; color: #fff;
      font-variant-numeric: tabular-nums; line-height: 1;
    }
    .id-fin-amount.sm { font-size: 18px; }
    .id-fin-amount.success { color: #6EE7B7; }
    .id-fin-amount.danger  { color: #FCA5A5; }
    .id-fin-amount.purple  { color: #C4B5FD; }

    /* ── Action bar (floats up from body) ── */
    .id-actions {
      padding: 0 28px;
      margin-top: -18px;
      position: relative; z-index: 10;
      margin-bottom: 22px;
      display: flex; gap: 10px; flex-wrap: wrap;
    }
    .id-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 20px; border-radius: var(--id-radius-sm);
      font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif;
      cursor: pointer; border: none; transition: all .15s; white-space: nowrap;
    }
    .id-btn-primary {
      background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
      color: #fff; box-shadow: 0 2px 8px rgba(79,70,229,.35);
    }
    .id-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(79,70,229,.45); }
    .id-btn-success {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #fff; box-shadow: 0 2px 8px rgba(5,150,105,.3);
    }
    .id-btn-success:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(5,150,105,.4); }
    .id-btn-ghost {
      background: var(--id-surface); color: var(--id-text);
      border: 1.5px solid var(--id-border) !important;
      box-shadow: var(--id-shadow);
    }
    .id-btn-ghost:hover { background: #F9FAFB; transform: translateY(-1px); box-shadow: var(--id-shadow-md); }

    /* ── Sticky payment progress bar ── */
    .id-payment-track-wrap {
      padding: 0 28px; margin-bottom: 20px;
    }
    .id-payment-track-card {
      background: var(--id-surface); border: 1px solid var(--id-border);
      border-radius: var(--id-radius); box-shadow: var(--id-shadow);
      padding: 16px 20px;
    }
    .id-payment-track-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 10px; flex-wrap: wrap; gap: 8px;
    }
    .id-payment-track-title { font-size: 13px; font-weight: 600; color: var(--id-text); display: flex; align-items: center; gap: 8px; }
    .id-payment-track-pct  { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .id-payment-amounts {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
      margin-bottom: 10px;
    }
    .id-payment-amt-block { padding: 0 12px; }
    .id-payment-amt-block:first-child { padding-left: 0; }
    .id-payment-amt-block:not(:first-child) { border-left: 1px solid var(--id-border-light); }
    .id-payment-amt-label { font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--id-muted); margin-bottom: 2px; }
    .id-payment-amt-val   { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .id-track { height: 8px; background: var(--id-border-light); border-radius: 99px; overflow: hidden; }
    .id-track-fill { height: 100%; border-radius: 99px; transition: width .4s cubic-bezier(.4,0,.2,1); }

    /* ── Body layout ── */
    .id-body { padding: 0 28px 48px; }
    .id-grid-3  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
    .id-grid-21 { display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; margin-bottom: 12px; }
    .id-mb      { margin-bottom: 12px; }

    /* ── Cards ── */
    .id-card {
      background: var(--id-surface); border: 1px solid var(--id-border);
      border-radius: var(--id-radius); box-shadow: var(--id-shadow); overflow: hidden;
    }
    .id-card-header {
      padding: 14px 20px; border-bottom: 1px solid var(--id-border);
      display: flex; align-items: center; gap: 10px;
    }
    .id-card-icon {
      width: 30px; height: 30px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; flex-shrink: 0;
      background: var(--id-accent-light); color: var(--id-accent);
    }
    .id-card-title { font-size: 13px; font-weight: 600; color: var(--id-text); flex: 1; }
    .id-card-badge {
      font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 99px;
    }
    .id-card-body { padding: 18px 20px; }
    .id-card-body-flush { padding: 0; }

    /* ── Info rows ── */
    .id-info-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 10px 20px; border-bottom: 1px solid var(--id-border-light); gap: 12px;
    }
    .id-info-row:last-child { border-bottom: none; }
    .id-info-label { font-size: 12px; color: var(--id-muted); flex-shrink: 0; display: flex; align-items: center; gap: 5px; }
    .id-info-value { font-size: 13px; font-weight: 500; color: var(--id-text); text-align: right; word-break: break-word; }
    .id-info-value.mono { font-family: 'Courier New', monospace; font-size: 12px; background: #F3F4F6; padding: 2px 7px; border-radius: 5px; }

    /* ── Address ── */
    .id-address-text { font-size: 13px; color: var(--id-text); line-height: 1.65; }
    .id-address-sub  { font-size: 12px; color: var(--id-muted); margin-top: 5px; }
    .id-address-gst  { display: inline-block; margin-top: 6px; font-family: 'Courier New', monospace; font-size: 11px; background: #F3F4F6; padding: 2px 7px; border-radius: 5px; color: var(--id-text); }

    /* ── Summary ── */
    .id-summary-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid var(--id-border-light); font-size: 13px;
    }
    .id-summary-row:last-child { border-bottom: none; }
    .id-summary-label { color: var(--id-muted); display: flex; align-items: center; gap: 5px; }
    .id-summary-val   { font-variant-numeric: tabular-nums; font-weight: 500; }
    .id-divider-heavy { border: none; border-top: 2px solid var(--id-border); margin: 8px 0; }
    .id-total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0 6px; font-size: 16px; font-weight: 800;
    }

    /* ── Items table ── */
    .id-items-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .id-items-table th {
      background: #F9FAFB; color: var(--id-muted); font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.5px;
      padding: 10px 16px; text-align: left; border-bottom: 1px solid var(--id-border);
    }
    .id-items-table th:last-child, .id-items-table td:last-child { text-align: right; }
    .id-items-table td { padding: 12px 16px; border-bottom: 1px solid var(--id-border-light); vertical-align: top; }
    .id-items-table tr:last-child td { border-bottom: none; }
    .id-items-table tr:hover td { background: #FAFBFF; }
    .id-item-name    { font-weight: 600; color: var(--id-text); margin-bottom: 2px; }
    .id-item-hsn     { font-size: 11px; color: var(--id-muted); font-family: 'Courier New', monospace; }
    .id-item-disc    { font-size: 11px; color: var(--id-danger); font-weight: 600; margin-top: 2px; }
    .id-item-total   { font-weight: 700; color: var(--id-accent); font-variant-numeric: tabular-nums; }
    .id-item-rate    { color: var(--id-muted); font-variant-numeric: tabular-nums; }
    .id-item-qty     { font-weight: 600; text-align: center; }

    /* ── Payment history table ── */
    .id-pay-table-wrap .ant-table { font-size: 13px !important; font-family: 'Inter', sans-serif !important; }
    .id-pay-table-wrap .ant-table-thead > tr > th {
      background: #F9FAFB !important; color: var(--id-muted) !important;
      font-size: 11px !important; font-weight: 600 !important;
      text-transform: uppercase !important; letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--id-border) !important; padding: 10px 16px !important;
    }
    .id-pay-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid var(--id-border-light) !important;
      padding: 12px 16px !important; vertical-align: middle !important;
    }
    .id-pay-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .id-pay-table-wrap .ant-table-tbody > tr:hover > td { background: #FAFBFF !important; }

    /* ── Timeline ── */
    .id-timeline { padding: 4px 0; }
    .id-tl-item {
      display: flex; gap: 14px;
      padding: 14px 0;
      border-bottom: 1px solid var(--id-border-light);
      position: relative;
    }
    .id-tl-item:last-child { border-bottom: none; padding-bottom: 0; }
    .id-tl-item::before {
      content: '';
      position: absolute; left: 15px; top: 46px; bottom: -1px;
      width: 2px; background: var(--id-border-light);
    }
    .id-tl-item:last-child::before { display: none; }
    .id-tl-icon {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; flex-shrink: 0; z-index: 1;
    }
    .id-tl-body { flex: 1; }
    .id-tl-title { font-size: 13px; font-weight: 600; color: var(--id-text); margin-bottom: 4px; }
    .id-tl-detail { font-size: 12px; color: var(--id-muted); margin-bottom: 3px; line-height: 1.5; }
    .id-tl-meta   { font-size: 11px; color: #9CA3AF; }
    .id-tl-badge  { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; white-space: nowrap; align-self: flex-start; margin-top: 2px; }

    /* ── Bank grid ── */
    .id-bank-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }

    /* ── Badges ── */
    .id-type-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600;
    }

    /* ── Notes ── */
    .id-notes-body { white-space: pre-line; font-size: 13px; color: #374151; line-height: 1.75; }

    /* ── Audit strip ── */
    .id-audit-strip {
      padding: 12px 20px; background: #FAFAFA; border-top: 1px solid var(--id-border);
      display: flex; gap: 24px; flex-wrap: wrap;
    }
    .id-audit-item { font-size: 11px; color: var(--id-muted); }
    .id-audit-item strong { color: var(--id-text); font-weight: 500; }

    /* ── Copy btn ── */
    .id-copy-btn {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 6px; border: 1px solid var(--id-border);
      border-radius: 5px; background: transparent; cursor: pointer;
      font-size: 11px; color: var(--id-muted); transition: all .12s;
      font-family: 'Inter', sans-serif;
    }
    .id-copy-btn:hover { background: var(--id-accent-light); border-color: var(--id-accent); color: var(--id-accent); }

    /* ── Loading / Empty ── */
    .id-loading {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 60vh; gap: 12px;
      color: var(--id-muted); font-size: 13px;
    }
    .id-empty { text-align: center; padding: 32px; color: var(--id-muted); font-size: 13px; }

    /* ── Responsive ── */
    @media (max-width: 960px) {
      .id-grid-3  { grid-template-columns: 1fr 1fr; }
      .id-grid-21 { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .id-hero-inner { padding: 16px 16px 44px; }
      .id-actions    { padding: 0 16px; }
      .id-payment-track-wrap { padding: 0 16px; }
      .id-body       { padding: 0 16px 40px; }
      .id-grid-3     { grid-template-columns: 1fr; }
      .id-grid-21    { grid-template-columns: 1fr; }
      .id-bank-grid  { grid-template-columns: 1fr; }
      .id-hero-financials { width: 100%; align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
      .id-fin-card   { flex: 1; min-width: 120px; text-align: left; }
      .id-fin-amount { font-size: 18px; }
      .id-btn        { flex: 1; justify-content: center; }
      .id-payment-amounts { grid-template-columns: 1fr; gap: 8px; }
      .id-payment-amt-block { padding: 0; border-left: none !important; }
    }

    @keyframes id-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
  `}</style>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const AddressBlock = ({ address, emptyText = "—" }: { address: any; emptyText?: string }) => {
  const a = safeParse(address);
  if (!Object.keys(a).length) return <span style={{ color: "var(--id-muted)", fontSize: 13 }}>{emptyText}</span>;
  const lines = [
    a.label && <strong>{a.label}</strong>,
    a.contact_person_name,
    a.address_line_1,
    a.address_line_2 !== a.address_line_1 && a.address_line_2,
    [a.city?.trim(), a.state?.trim()].filter(Boolean).join(", "),
    [a.country, a.postal_code].filter(Boolean).join(" – "),
  ].filter(Boolean);
  return (
    <div>
      {lines.map((line, i) => (
        <div key={i} className="id-address-text">{line}</div>
      ))}
      {a.gst_number && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <span className="id-address-gst">GST: {a.gst_number}</span>
          <button className="id-copy-btn" onClick={() => copyToClipboard(a.gst_number)}>
            <CopyOutlined style={{ fontSize: 10 }} />
          </button>
        </div>
      )}
      {a.contact_person_phone && (
        <div className="id-address-sub"><PhoneOutlined style={{ marginRight: 4 }} />{a.contact_person_phone}</div>
      )}
    </div>
  );
};

// Inline items table (richer than delegating to child component)
const ItemsTable = ({ items }: { items: any[] }) => {
  if (!items?.length) return (
    <div className="id-empty">
      <FileTextOutlined style={{ fontSize: 24, marginBottom: 8, display: "block", opacity: 0.3 }} />
      No items found
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="id-items-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Item / Description</th>
            <th>HSN</th>
            <th style={{ textAlign: "center" }}>Qty</th>
            <th style={{ textAlign: "right" }}>Rate</th>
            <th style={{ textAlign: "right" }}>Disc%</th>
            <th style={{ textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, i: number) => (
            <tr key={item.id ?? i}>
              <td style={{ color: "var(--id-muted)", fontSize: 12 }}>{i + 1}</td>
              <td>
                <div className="id-item-name">{item.product_name || item.description || "—"}</div>
                {item.description && item.description !== item.product_name && (
                  <div style={{ fontSize: 11, color: "var(--id-muted)", marginTop: 2 }}>{item.description}</div>
                )}
                {Number(item.discount_percent) > 0 && (
                  <div className="id-item-disc">
                    <TagOutlined style={{ marginRight: 3 }} />
                    {Number(item.discount_percent)}% off · saved {fmt(item.discount_amount)}
                  </div>
                )}
              </td>
              <td>
                {item.hsn_code
                  ? <span className="id-address-gst" style={{ fontSize: 11 }}>{item.hsn_code}</span>
                  : <span style={{ color: "var(--id-muted)" }}>—</span>}
              </td>
              <td className="id-item-qty">
                {Number(item.qty || 0)}
                {item.unit && <span style={{ fontSize: 11, color: "var(--id-muted)", marginLeft: 2 }}>{item.unit}</span>}
              </td>
              <td style={{ textAlign: "right" }}>
                <div className="id-item-rate">{fmt(item.rate)}</div>
                {Number(item.discounted_rate) !== Number(item.rate) && Number(item.discounted_rate) > 0 && (
                  <div style={{ fontSize: 11, color: "var(--id-success)", fontWeight: 600 }}>↓ {fmt(item.discounted_rate)}</div>
                )}
              </td>
              <td style={{ textAlign: "right", color: Number(item.discount_percent) > 0 ? "var(--id-danger)" : "var(--id-muted)" }}>
                {Number(item.discount_percent) > 0 ? `${Number(item.discount_percent)}%` : "—"}
              </td>
              <td><span className="id-item-total">{fmt(item.total || item.amount || 0)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const BankCard = ({ snapshot }: { snapshot: any }) => {
  const p = safeParse(snapshot);
  const fields = [
    { label: "Bank Name",       icon: <BankOutlined />,    value: p.bank_name,           mono: false },
    { label: "Account Holder",  icon: <UserOutlined />,    value: p.account_holder_name, mono: false },
    { label: "Account Number",  icon: <NumberOutlined />,  value: p.account_number,      mono: true  },
    { label: "IFSC Code",       icon: <NumberOutlined />,  value: p.ifsc_code,           mono: true  },
    { label: "Branch",          icon: <EnvironmentOutlined />, value: p.branch_name,     mono: false },
    { label: "Account Type",    icon: <InfoCircleOutlined />, value: p.account_type,     mono: false },
  ].filter(f => f.value);

  if (!fields.length) return <div style={{ color: "var(--id-muted)", fontSize: 13 }}>No bank details on file</div>;

  return (
    <div className="id-bank-grid">
      {fields.map(f => (
        <div key={f.label}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--id-muted)", marginBottom: 3 }}>
            {f.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--id-text)", fontFamily: f.mono ? "'Courier New', monospace" : "inherit" }}>
              {f.value}
            </span>
            {f.mono && (
              <button className="id-copy-btn" onClick={() => copyToClipboard(f.value)}>
                <CopyOutlined style={{ fontSize: 10 }} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const SummaryBlock = ({ inv }: { inv: any }) => {
  const grand   = Number(inv.grand_total   || 0);
  const paid    = Number(inv.paid_amount   || 0);
  const balance = Number(inv.balance_amount || 0);
  const paidPct = grand > 0 ? Math.min(100, (paid / grand) * 100) : 0;
  const isFullyPaid = balance === 0 && paid > 0;

  const taxRows = [
    Number(inv.cgst_amount) > 0 && { label: `CGST`, pct: inv.cgst_percent, val: inv.cgst_amount, icon: <PercentageOutlined /> },
    Number(inv.sgst_amount) > 0 && { label: `SGST`, pct: inv.sgst_percent, val: inv.sgst_amount, icon: <PercentageOutlined /> },
    Number(inv.igst_amount) > 0 && { label: `IGST`, pct: inv.igst_percent, val: inv.igst_amount, icon: <PercentageOutlined /> },
  ].filter(Boolean) as any[];

  return (
    <div>
      {/* Sub-total */}
      <div className="id-summary-row">
        <span className="id-summary-label">Sub Total</span>
        <span className="id-summary-val">{fmt(inv.sub_total)}</span>
      </div>
      {/* Discount */}
      {Number(inv.discount_amount) > 0 && (
        <div className="id-summary-row">
          <span className="id-summary-label">
            <TagOutlined />
            Discount ({Number(inv.discount_percent || 0)}%)
          </span>
          <span className="id-summary-val" style={{ color: "var(--id-danger)" }}>− {fmt(inv.discount_amount)}</span>
        </div>
      )}
      {/* Taxes */}
      {taxRows.map(r => (
        <div key={r.label} className="id-summary-row">
          <span className="id-summary-label">
            {r.icon} {r.label} ({Number(r.pct || 0)}%)
          </span>
          <span className="id-summary-val">{fmt(r.val)}</span>
        </div>
      ))}
      {/* Transport */}
      {Number(inv.transport_charges) > 0 && (
        <div className="id-summary-row">
          <span className="id-summary-label"><CarOutlined /> Transport</span>
          <span className="id-summary-val">{fmt(inv.transport_charges)}</span>
        </div>
      )}
      <hr className="id-divider-heavy" />
      <div className="id-total-row">
        <span>Grand Total</span>
        <span style={{ color: "var(--id-accent)" }}>{fmt(grand)}</span>
      </div>

      {/* Payment progress visual */}
      <div style={{ marginTop: 12, padding: "14px", background: "#F9FAFB", borderRadius: 10, border: "1px solid var(--id-border-light)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--id-muted)" }}>
            Payment Progress
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: isFullyPaid ? "var(--id-success)" : "var(--id-accent)" }}>
            {paidPct.toFixed(0)}%
          </span>
        </div>
        <div className="id-track" style={{ height: 10 }}>
          <div
            className="id-track-fill"
            style={{
              width: `${paidPct}%`,
              background: isFullyPaid
                ? "linear-gradient(90deg, #059669, #10B981)"
                : paidPct > 0
                  ? "linear-gradient(90deg, #4F46E5, #7C3AED)"
                  : "#E5E7EB",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--id-muted)" }}>
          <span>Paid: <strong style={{ color: "var(--id-success)" }}>{fmt(paid)}</strong></span>
          <span>Remaining: <strong style={{ color: balance > 0 ? "var(--id-danger)" : "var(--id-success)" }}>{fmt(balance)}</strong></span>
        </div>
      </div>

      {/* Balance badge */}
      <div style={{
        marginTop: 10,
        padding: "12px 16px",
        background: isFullyPaid ? "#ECFDF5" : balance > 0 ? "#FEF2F2" : "var(--id-accent-light)",
        borderRadius: 10,
        border: `1px solid ${isFullyPaid ? "#A7F3D0" : balance > 0 ? "#FECACA" : "#C7D2FE"}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", color: "var(--id-muted)", marginBottom: 1 }}>
            Balance Due
          </div>
          {isFullyPaid && (
            <div style={{ fontSize: 11, color: "var(--id-success)", fontWeight: 600 }}>
              <CheckCircleOutlined style={{ marginRight: 3 }} />Fully settled
            </div>
          )}
        </div>
        <span style={{
          fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums",
          color: isFullyPaid ? "var(--id-success)" : balance > 0 ? "var(--id-danger)" : "var(--id-accent)",
        }}>
          {fmt(balance)}
        </span>
      </div>
    </div>
  );
};

const TimelineSection = ({ timeline }: { timeline: any[] }) => {
  if (!timeline?.length) return (
    <div className="id-empty">
      <ClockCircleOutlined style={{ fontSize: 24, marginBottom: 8, display: "block", opacity: 0.3 }} />
      No activity recorded yet
    </div>
  );

  return (
    <div className="id-timeline">
      {timeline.map((item: any, i: number) => {
        const cfg = ACTION_CONFIG[item.action] || {
          label: item.action?.replace(/_/g, " ") || "Event",
          color: "#6B7280", bg: "#F3F4F6", icon: <SyncOutlined />,
        };
        const newVal = safeParse(item.new_value);
        const by = item.changed_by;

        return (
          <div key={item.id ?? i} className="id-tl-item">
            <div className="id-tl-icon" style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.icon}
            </div>
            <div className="id-tl-body">
              <div className="id-tl-title">{cfg.label}</div>
              {/* Payment detail */}
              {newVal.payment_amount && (
                <div className="id-tl-detail">
                  <span style={{ fontWeight: 700, color: "var(--id-success)" }}>{fmt(newVal.payment_amount)}</span>
                  {newVal.payment_mode && (
                    <span style={{ marginLeft: 8, background: "#F3F4F6", color: "#374151", fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 99 }}>
                      {newVal.payment_mode}
                    </span>
                  )}
                  {newVal.transaction_reference && (
                    <span style={{ marginLeft: 6, color: "var(--id-muted)", fontSize: 12 }}>
                      · Ref: <code style={{ fontSize: 11, background: "#F3F4F6", padding: "1px 5px", borderRadius: 4 }}>{newVal.transaction_reference}</code>
                    </span>
                  )}
                </div>
              )}
              {newVal.quotation_id && !newVal.payment_amount && (
                <div className="id-tl-detail">Generated from Quotation <strong>#{newVal.quotation_id}</strong></div>
              )}
              <div className="id-tl-meta">
                {by ? `${by.first_name || ""} ${by.last_name || ""}`.trim() : "System"}
                {by?.email && <span style={{ marginLeft: 5, opacity: 0.7 }}>· {by.email}</span>}
                {item.created_at && <span style={{ marginLeft: 5 }}>· {fmtDateTime(item.created_at)}</span>}
              </div>
            </div>
            <span className="id-tl-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { selectedInvoice, invoiceTimeline, detailsLoading } = useSelector(
    (state: any) => state.invoice,
  );

  useEffect(() => {
    if (id) {
      dispatch(getInvoiceDetails(Number(id)));
      dispatch(getInvoiceTimeline(Number(id)));
    }
  }, [id]);

  const handleAddPayment = (values: any) => {
    dispatch(addPayment({
      id: Number(id), ...values,
      payment_date: values.payment_date.format("YYYY-MM-DD"),
    }));
    setPaymentModalOpen(false);
  };

  const inv = selectedInvoice || {};
  const statusCfg = STATUS_CONFIG[inv.status] || { color: "#6B7280", bg: "#F3F4F6", glow: "transparent", label: inv.status || "—" };
  const isDueDatePast = inv.due_date && new Date(inv.due_date) < new Date();
  const grand   = Number(inv.grand_total   || 0);
  const paid    = Number(inv.paid_amount   || 0);
  const balance = Number(inv.balance_amount || 0);
  const paidPct = grand > 0 ? Math.min(100, (paid / grand) * 100) : 0;
  const biz     = safeParse(inv.business_details_snapshot);

  const paymentColumns = [
    {
      title: "Date",
      dataIndex: "payment_date",
      render: (v: string) => <span style={{ fontSize: 12, color: "var(--id-muted)" }}>{fmtDate(v)}</span>,
    },
    {
      title: "Method",
      dataIndex: "payment_mode",
      render: (v: string) => (
        <span style={{ background: "#F3F4F6", color: "#374151", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99 }}>
          {v || "—"}
        </span>
      ),
    },
    {
      title: "Reference",
      dataIndex: "transaction_reference",
      render: (v: string) => v
        ? <code style={{ fontSize: 11, background: "#F3F4F6", padding: "2px 6px", borderRadius: 4 }}>{v}</code>
        : <span style={{ color: "var(--id-muted)" }}>—</span>,
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      render: (v: string) => <span style={{ fontSize: 12, color: "var(--id-muted)" }}>{v || "—"}</span>,
    },
    {
      title: "Amount",
      dataIndex: "payment_amount",
      align: "right" as const,
      render: (v: any) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 14, color: "var(--id-success)" }}>
          {fmt(v)}
        </span>
      ),
    },
  ];

  if (detailsLoading) {
    return (
      <div className="id-root">
        <GlobalStyles />
        <div className="id-loading"><Spin size="large" /><span>Loading invoice…</span></div>
      </div>
    );
  }

  return (
    <div className="id-root">
      <GlobalStyles />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="id-hero">
        <div className="id-hero-gradient" />
        <div className="id-hero-noise" />
        <div className="id-hero-orb id-hero-orb-1" />
        <div className="id-hero-orb id-hero-orb-2" />

        <div className="id-hero-inner">
          <button className="id-back-btn" onClick={() => navigate("/app/invoice")}>
            <ArrowLeftOutlined style={{ fontSize: 12 }} /> All Invoices
          </button>

          <div className="id-hero-main">
            <div className="id-hero-left">
              <div className="id-invoice-eyebrow">Tax Invoice</div>
              <div className="id-invoice-number">{inv.invoice_number || "—"}</div>
              <div className="id-invoice-meta">
                {inv.quotation_number && (
                  <div className="id-invoice-meta-line">
                    <FileTextOutlined style={{ fontSize: 11 }} />
                    Quotation: <strong>{inv.quotation_number}</strong>
                  </div>
                )}
                {inv.customer_name && (
                  <div className="id-invoice-meta-line">
                    <UserOutlined style={{ fontSize: 11 }} />
                    <strong>{inv.customer_name}</strong>
                    {inv.customer_gst_number && (
                      <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>
                        · GST: {inv.customer_gst_number}
                      </span>
                    )}
                  </div>
                )}
                <div className="id-invoice-meta-line">
                  <CalendarOutlined style={{ fontSize: 11 }} />
                  Issued: <strong>{fmtDate(inv.invoice_date)}</strong>
                  <span style={{ opacity: 0.5, margin: "0 6px" }}>·</span>
                  <ClockCircleOutlined style={{ fontSize: 11 }} />
                  <span style={{ color: isDueDatePast ? "#FCA5A5" : undefined }}>
                    Due: <strong style={{ color: isDueDatePast ? "#FCA5A5" : undefined }}>{fmtDate(inv.due_date)}</strong>
                    {isDueDatePast && <span style={{ marginLeft: 5, fontSize: 10, background: "#DC2626", color: "#fff", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>OVERDUE</span>}
                  </span>
                </div>
              </div>
              {inv.status && (
                <div className="id-status-pill" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                  <span className="id-status-dot" style={{ background: statusCfg.color }} />
                  {statusCfg.label}
                </div>
              )}
            </div>

            {/* Financial snapshot */}
            <div className="id-hero-financials">
              <div className="id-fin-card">
                <div className="id-fin-label">Grand Total</div>
                <div className="id-fin-amount">{fmt(grand)}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="id-fin-card" style={{ flex: 1 }}>
                  <div className="id-fin-label">Paid</div>
                  <div className="id-fin-amount sm success">{fmt(paid)}</div>
                </div>
                <div className="id-fin-card" style={{ flex: 1 }}>
                  <div className="id-fin-label">Balance</div>
                  <div className={`id-fin-amount sm ${balance > 0 ? "danger" : "success"}`}>{fmt(balance)}</div>
                </div>
              </div>
              {/* Mini progress */}
              <div style={{ width: "100%", padding: "8px 0 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  <span>Payment Progress</span>
                  <span style={{ color: paidPct === 100 ? "#6EE7B7" : "rgba(255,255,255,0.6)" }}>{paidPct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    width: `${paidPct}%`,
                    background: paidPct === 100 ? "linear-gradient(90deg,#6EE7B7,#34D399)" : "linear-gradient(90deg,#A5B4FC,#818CF8)",
                    transition: "width .4s cubic-bezier(.4,0,.2,1)",
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────────── */}
      <div className="id-actions">
        <button className="id-btn id-btn-success" onClick={() => setPaymentModalOpen(true)}>
          <DollarOutlined />Add Payment
        </button>
        <button className="id-btn id-btn-ghost" onClick={() => downloadInvoicePDF(inv)}>
          <DownloadOutlined />Download PDF
        </button>
      </div>

      <div className="id-body">

        {/* ── Customer · Billing · Shipping ────────────────────────────────────── */}
        <div className="id-grid-3">

          {/* Customer */}
          <div className="id-card">
            <div className="id-card-header">
              <div className="id-card-icon"><UserOutlined /></div>
              <span className="id-card-title">Customer</span>
              {inv.customer_type && (
                <span className="id-type-badge" style={{
                  background: inv.customer_type === "BUSINESS" ? "#DBEAFE" : "#ECFDF5",
                  color: inv.customer_type === "BUSINESS" ? "#1D4ED8" : "#059669",
                }}>
                  {inv.customer_type === "BUSINESS" ? <BankOutlined style={{ fontSize: 10 }} /> : <UserOutlined style={{ fontSize: 10 }} />}
                  {inv.customer_type === "BUSINESS" ? "Business" : "Individual"}
                </span>
              )}
            </div>
            <div className="id-card-body-flush">
              <div className="id-info-row">
                <span className="id-info-label"><UserOutlined />Name</span>
                <span className="id-info-value" style={{ fontWeight: 600 }}>{inv.customer_name || "—"}</span>
              </div>
              {inv.customer_gst_number && (
                <div className="id-info-row">
                  <span className="id-info-label">GST No.</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span className="id-info-value mono">{inv.customer_gst_number}</span>
                    <button className="id-copy-btn" onClick={() => copyToClipboard(inv.customer_gst_number)}><CopyOutlined style={{ fontSize: 10 }} /></button>
                  </span>
                </div>
              )}
              {inv.contact_person_name && inv.contact_person_name !== inv.customer_name && (
                <div className="id-info-row">
                  <span className="id-info-label">Contact</span>
                  <span className="id-info-value">{inv.contact_person_name}</span>
                </div>
              )}
              {inv.contact_person_email && (
                <div className="id-info-row">
                  <span className="id-info-label"><MailOutlined />Email</span>
                  <span className="id-info-value" style={{ wordBreak: "break-all" }}>{inv.contact_person_email}</span>
                </div>
              )}
              {inv.contact_person_phone && (
                <div className="id-info-row">
                  <span className="id-info-label"><PhoneOutlined />Phone</span>
                  <span className="id-info-value">{inv.contact_person_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Billing */}
          <div className="id-card">
            <div className="id-card-header">
              <div className="id-card-icon" style={{ background: "#EEF2FF", color: "#4F46E5" }}><EnvironmentOutlined /></div>
              <span className="id-card-title">Billing Address</span>
            </div>
            <div className="id-card-body">
              <AddressBlock address={inv.billing_address_snapshot} />
            </div>
          </div>

          {/* Shipping */}
          <div className="id-card">
            <div className="id-card-header">
              <div className="id-card-icon" style={{ background: "#ECFDF5", color: "#059669" }}><EnvironmentOutlined /></div>
              <span className="id-card-title">Shipping Address</span>
            </div>
            <div className="id-card-body">
              <AddressBlock address={inv.shipping_address_snapshot} />
            </div>
          </div>
        </div>

        {/* ── Business Details ──────────────────────────────────────────────────── */}
        {(biz.businessName || biz.businessAddress) && (
          <div className="id-card id-mb">
            <div className="id-card-header">
              <div className="id-card-icon" style={{ background: "#FFF7ED", color: "#D97706" }}><ShopOutlined /></div>
              <span className="id-card-title">Business / Seller Details</span>
            </div>
            <div className="id-card-body-flush">
              {biz.businessName && (
                <div className="id-info-row">
                  <span className="id-info-label"><ShopOutlined />Name</span>
                  <span className="id-info-value" style={{ fontWeight: 700 }}>{biz.businessName}</span>
                </div>
              )}
              {biz.businessGST && (
                <div className="id-info-row">
                  <span className="id-info-label">GST No.</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span className="id-info-value mono">{biz.businessGST}</span>
                    <button className="id-copy-btn" onClick={() => copyToClipboard(biz.businessGST)}><CopyOutlined style={{ fontSize: 10 }} /></button>
                  </span>
                </div>
              )}
              {biz.businessPhone && (
                <div className="id-info-row">
                  <span className="id-info-label"><PhoneOutlined />Phone</span>
                  <span className="id-info-value">{biz.businessPhone}</span>
                </div>
              )}
              {biz.businessEmail && (
                <div className="id-info-row">
                  <span className="id-info-label"><MailOutlined />Email</span>
                  <span className="id-info-value">{biz.businessEmail}</span>
                </div>
              )}
              {biz.businessAddress && (
                <div className="id-info-row" style={{ alignItems: "flex-start" }}>
                  <span className="id-info-label" style={{ paddingTop: 1 }}><EnvironmentOutlined />Address</span>
                  <span className="id-info-value" style={{ whiteSpace: "pre-line", textAlign: "right" }}>{biz.businessAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Items ────────────────────────────────────────────────────────────── */}
        <div className="id-card id-mb">
          <div className="id-card-header">
            <div className="id-card-icon"><FileTextOutlined /></div>
            <span className="id-card-title">Line Items</span>
            {inv.items?.length > 0 && (
              <span className="id-card-badge" style={{ background: "var(--id-accent-light)", color: "var(--id-accent)" }}>
                {inv.items.length} item{inv.items.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <ItemsTable items={inv.items || []} />
        </div>

        {/* ── Summary + Bank ────────────────────────────────────────────────────── */}
        <div className="id-grid-21">
          <div className="id-card">
            <div className="id-card-header">
              <div className="id-card-icon"><RiseOutlined /></div>
              <span className="id-card-title">Invoice Summary</span>
            </div>
            <div className="id-card-body">
              <SummaryBlock inv={inv} />
            </div>
          </div>

          <div className="id-card">
            <div className="id-card-header">
              <div className="id-card-icon" style={{ background: "#FFF7ED", color: "#D97706" }}><BankOutlined /></div>
              <span className="id-card-title">Bank Details</span>
            </div>
            <div className="id-card-body">
              <BankCard snapshot={inv.payment_details_snapshot} />
            </div>
            {/* Audit strip */}
            <div className="id-audit-strip">
              <div className="id-audit-item">Created <strong>{fmtDateTime(inv.created_at)}</strong></div>
              {inv.updated_at && inv.updated_at !== inv.created_at && (
                <div className="id-audit-item">Updated <strong>{fmtDateTime(inv.updated_at)}</strong></div>
              )}
            </div>
          </div>
        </div>

        {/* ── Payment History ───────────────────────────────────────────────────── */}
        <div className="id-card id-mb">
          <div className="id-card-header">
            <div className="id-card-icon" style={{ background: "#ECFDF5", color: "var(--id-success)" }}><DollarOutlined /></div>
            <span className="id-card-title">Payment History</span>
            {inv.payments?.length > 0 && (
              <span className="id-card-badge" style={{ background: "#ECFDF5", color: "var(--id-success)" }}>
                {inv.payments.length} payment{inv.payments.length !== 1 ? "s" : ""}
              </span>
            )}
            {/* Running total */}
            {inv.payments?.length > 0 && (
              <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--id-success)", fontVariantNumeric: "tabular-nums" }}>
                {fmt(inv.paid_amount)} collected
              </span>
            )}
          </div>
          <div className="id-pay-table-wrap">
            <Table
              rowKey="id"
              pagination={false}
              columns={paymentColumns}
              dataSource={inv.payments || []}
              locale={{
                emptyText: (
                  <div className="id-empty">
                    <DollarOutlined style={{ fontSize: 24, marginBottom: 8, display: "block", opacity: 0.25 }} />
                    No payments recorded yet
                  </div>
                ),
              }}
              size="small"
            />
          </div>
        </div>

        {/* ── Notes ────────────────────────────────────────────────────────────── */}
        {inv.notes && (
          <div className="id-card id-mb">
            <div className="id-card-header">
              <div className="id-card-icon" style={{ background: "#F5F3FF", color: "var(--id-purple)" }}><FileTextOutlined /></div>
              <span className="id-card-title">Notes &amp; Terms</span>
            </div>
            <div className="id-card-body">
              <p className="id-notes-body">{inv.notes}</p>
            </div>
          </div>
        )}

        {/* ── Activity Timeline ─────────────────────────────────────────────────── */}
        <div className="id-card">
          <div className="id-card-header">
            <div className="id-card-icon" style={{ background: "#F5F3FF", color: "var(--id-purple)" }}><ClockCircleOutlined /></div>
            <span className="id-card-title">Activity Timeline</span>
            {invoiceTimeline?.length > 0 && (
              <span className="id-card-badge" style={{ background: "#F5F3FF", color: "var(--id-purple)" }}>
                {invoiceTimeline.length} event{invoiceTimeline.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="id-card-body">
            <TimelineSection timeline={invoiceTimeline || []} />
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