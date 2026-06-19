import React, { useEffect, useMemo, useState, useRef } from "react";
import dayjs from "dayjs";
import {
  Form, notification, Pagination, Row, Col, Space, Table, Tabs, Empty,
  Popconfirm, Input, Grid, Drawer, Spin,
  Select,
  Tooltip,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined,
  CloseOutlined, DownloadOutlined, UserOutlined, MailOutlined, PhoneOutlined,
  BankOutlined, EnvironmentOutlined, ClockCircleOutlined, FileTextOutlined,
  ShopOutlined, NumberOutlined, CheckCircleOutlined, SendOutlined,
  RightOutlined,
  CheckCircleFilled,
  FileDoneOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  approveQuotation,
  createQuotation, deleteQuotation, getQuotationDetails, getQuotationHistory,
  getQuotationTimeline, getQuotations, sendQuotation, updateQuotation,
} from "../redux/quotationActions";
import { downloadQuotationPDF as downloadQuotationPDFHelper } from "../components/quotationPdf";
import QuotationService from "../redux";
import BusinessDetails from "./components/BusinessDetails";
import CustomerDetails from "./components/CustomerDetails";
import QuotationItems from "./components/QuotationItems";
import QuotationSummary from "./components/QuotationSummary";
import PaymentDetails from "./components/PaymentDetails";
import { StorageService } from "@/storage";
import { getCustomers } from "@/modules/customers/redux/customerActions";
import { useAccess } from "@/permissions/useAccess";

const { useBreakpoint } = Grid;
const { Option } = Select;

// ─── Design tokens ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --qt-bg: #F4F5F9;
      --qt-surface: #FFFFFF;
      --qt-border: #E5E7EB;
      --qt-accent: #4F46E5;
      --qt-accent-light: #EEF2FF;
      --qt-success: #059669;
      --qt-danger: #DC2626;
      --qt-warning: #D97706;
      --qt-text: #111827;
      --qt-muted: #6B7280;
      --qt-radius: 12px;
      --qt-radius-sm: 8px;
      --qt-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --qt-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      --qt-shadow-lg: 0 12px 32px rgba(0,0,0,.1), 0 4px 8px rgba(0,0,0,.06);
    }

    .qt-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--qt-bg);
      min-height: 100vh;
      color: var(--qt-text);
    }

    /* ── Page header ── */
    .qt-header {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%);
      padding: 28px 28px 52px;
      position: relative;
      overflow: hidden;
    }
    .qt-header::after {
      content: '';
      position: absolute;
      bottom: -1px; left: 0; right: 0;
      height: 28px;
      background: var(--qt-bg);
      border-radius: 24px 24px 0 0;
    }
    .qt-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .qt-header-content {
      position: relative; z-index: 1;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .qt-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700; color: #fff; letter-spacing: -0.5px;
      display: flex; align-items: center; gap: 12px;
    }
    .qt-page-title-icon {
      width: 36px; height: 36px; background: rgba(255,255,255,0.15);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .qt-page-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 6px; padding-left: 48px; }
    .qt-add-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #fff; color: var(--qt-accent);
      border: none; border-radius: var(--qt-radius-sm); font-size: 13px; font-weight: 700;
      cursor: pointer; box-shadow: var(--qt-shadow-md); transition: all .15s;
      white-space: nowrap; font-family: 'Inter', sans-serif;
    }
    .qt-add-btn:hover { background: var(--qt-accent-light); transform: translateY(-1px); }

    /* ── Toolbar ── */
    .qt-toolbar {
      padding: 0 24px; margin-top: -18px; position: relative; z-index: 2; margin-bottom: 16px;
    }
    .qt-toolbar-inner {
      background: var(--qt-surface); border: 1px solid var(--qt-border);
      border-radius: var(--qt-radius); box-shadow: var(--qt-shadow);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .qt-search-wrap { position: relative; flex: 1; min-width: 200px; }
    .qt-search-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--qt-muted); font-size: 14px; pointer-events: none;
    }
    .qt-search {
      width: 100%; padding: 8px 12px 8px 34px;
      border: 1px solid var(--qt-border); border-radius: var(--qt-radius-sm);
      font-size: 13px; font-family: 'Inter', sans-serif; color: var(--qt-text);
      background: #FAFAFA; outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .qt-search:focus {
      border-color: var(--qt-accent); box-shadow: 0 0 0 3px rgba(79,70,229,.1); background: #fff;
    }
    .qt-search::placeholder { color: var(--qt-muted); }
    .qt-toolbar-count {
      font-size: 12px; color: var(--qt-muted); white-space: nowrap;
      background: #F3F4F6; padding: 6px 12px; border-radius: 6px;
    }

    /* ── Body ── */
    .qt-body { padding: 0 24px 40px; }

    /* ── Stats strip ── */
    .qt-stats {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 10px; margin-bottom: 16px;
    }
    .qt-stat-card {
      background: var(--qt-surface); border: 1px solid var(--qt-border);
      border-radius: var(--qt-radius); box-shadow: var(--qt-shadow); padding: 14px 16px;
    }
    .qt-stat-label {
      font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
      text-transform: uppercase; color: var(--qt-muted); margin-bottom: 6px;
    }
    .qt-stat-value { font-size: 20px; font-weight: 700; color: var(--qt-text); font-variant-numeric: tabular-nums; line-height: 1; }
    .qt-stat-value.accent { color: var(--qt-accent); }
    .qt-stat-value.success { color: var(--qt-success); }
    .qt-stat-value.danger { color: var(--qt-danger); }
    .qt-stat-value.warning { color: var(--qt-warning); }

    /* ── Card ── */
    .qt-card {
      background: var(--qt-surface); border: 1px solid var(--qt-border);
      border-radius: var(--qt-radius); box-shadow: var(--qt-shadow); overflow: hidden;
    }
    .qt-card-header {
      padding: 16px 20px; border-bottom: 1px solid var(--qt-border);
      display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
    }
    .qt-card-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 600; color: var(--qt-text);
    }
    .qt-card-icon {
      width: 28px; height: 28px; background: var(--qt-accent-light); border-radius: 6px;
      display: flex; align-items: center; justify-content: center; color: var(--qt-accent); font-size: 13px;
    }
    .qt-count-badge {
      background: var(--qt-accent-light); color: var(--qt-accent);
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px;
    }

    /* ── Form card ── */
    .qt-form-card {
      background: var(--qt-surface); border: 1px solid var(--qt-border);
      border-radius: var(--qt-radius); box-shadow: var(--qt-shadow-md);
      overflow: hidden; margin-bottom: 16px;
    }
    .qt-form-header {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%);
      padding: 18px 24px; position: relative; overflow: hidden;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .qt-form-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .qt-form-title { font-size: 17px; font-weight: 700; color: #fff; position: relative; z-index: 1; }
    .qt-form-subtitle { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 2px; position: relative; z-index: 1; }
    .qt-form-close {
      width: 32px; height: 32px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: rgba(255,255,255,0.8); font-size: 13px; transition: all .15s;
      position: relative; z-index: 1;
    }
    .qt-form-close:hover { background: rgba(255,255,255,0.2); color: #fff; }
    .qt-form-body { padding: 24px; }
    .qt-form-footer {
      padding: 16px 24px; border-top: 1px solid var(--qt-border); background: #FAFAFA;
      display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
    }

    /* ── Buttons ── */
    .qt-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: var(--qt-radius-sm); font-size: 13px; font-weight: 600;
      font-family: 'Inter', sans-serif; cursor: pointer; border: none; transition: all .15s;
      white-space: nowrap;
    }
    .qt-btn-primary {
      background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
      color: #fff; box-shadow: 0 2px 8px rgba(79,70,229,.3);
    }
    .qt-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #4338CA 0%, #3730A3 100%); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,70,229,.4); }
    .qt-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
    .qt-btn-ghost {
      background: #fff; color: var(--qt-text);
      border: 1.5px solid var(--qt-border) !important;
    }
    .qt-btn-ghost:hover { background: #F9FAFB; }
    .qt-btn-danger { background: #FEF2F2; color: var(--qt-danger); border: 1.5px solid #FECACA !important; }
    .qt-btn-danger:hover { background: var(--qt-danger); color: #fff; }
    .qt-btn-sm { padding: 6px 12px; font-size: 12px; }
    .qt-btn-icon { padding: 7px; }

    /* ── Table overrides ── */
    .qt-table-wrap .ant-table { font-size: 13px !important; font-family: 'Inter', sans-serif !important; }
    .qt-table-wrap .ant-table-thead > tr > th {
      background: #F9FAFB !important; color: var(--qt-muted) !important;
      font-size: 11px !important; font-weight: 600 !important;
      text-transform: uppercase !important; letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--qt-border) !important; padding: 10px 16px !important;
    }
    .qt-table-wrap .ant-table-tbody > tr > td { border-bottom: 1px solid #F3F4F6 !important; padding: 12px 16px !important; vertical-align: middle !important; }
    .qt-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .qt-table-wrap .ant-table-tbody > tr:hover > td { background: #FAFBFF !important; }
    .qt-table-wrap .ant-table-tbody > tr { cursor: pointer; }

    /* ── Status pill ── */
    .qt-status {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600;
      letter-spacing: 0.2px; white-space: nowrap;
    }
    .qt-status-dot { width: 5px; height: 5px; border-radius: 50%; }

    /* ── Currency ── */
    .qt-currency { font-variant-numeric: tabular-nums; font-weight: 600; font-size: 13px; color: var(--qt-accent); }

    /* ── Mobile cards ── */
    .qt-mobile-card {
      background: var(--qt-surface); border: 1px solid var(--qt-border);
      border-radius: var(--qt-radius); padding: 16px; margin-bottom: 10px;
      box-shadow: var(--qt-shadow); cursor: pointer; transition: box-shadow .15s;
    }
    .qt-mobile-card:hover { box-shadow: var(--qt-shadow-md); }
    .qt-mobile-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
    .qt-mobile-qnum { font-weight: 700; font-size: 15px; color: var(--qt-accent); }
    .qt-mobile-customer { font-size: 13px; color: var(--qt-text); font-weight: 500; margin-top: 2px; }
    .qt-mobile-company { font-size: 12px; color: var(--qt-muted); }
    .qt-mobile-amounts { display: flex; gap: 0; margin: 10px 0; padding: 10px 0; border-top: 1px solid #F3F4F6; border-bottom: 1px solid #F3F4F6; }
    .qt-mobile-amt-block { flex: 1; padding: 0 8px; }
    .qt-mobile-amt-block:first-child { padding-left: 0; }
    .qt-mobile-amt-block:not(:first-child) { border-left: 1px solid #F3F4F6; }
    .qt-mobile-amt-label { font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--qt-muted); margin-bottom: 3px; }
    .qt-mobile-amt-val { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .qt-mobile-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .qt-mobile-meta { font-size: 12px; color: var(--qt-muted); }
    .qt-mobile-btns { display: flex; gap: 6px; flex-wrap: wrap; }

    /* ── Pagination ── */
    .qt-pagination-row {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--qt-border);
    }
    .qt-pagination-info { font-size: 13px; color: var(--qt-muted); }

    /* ── Drawer overrides ── */
    .qt-drawer-body { background: #F4F5F9 !important; }

    /* ── Drawer hero ── */
    .qt-detail-hero {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%);
      border-radius: var(--qt-radius); padding: 18px 20px; margin-bottom: 14px;
      position: relative; overflow: hidden;
    }
    .qt-detail-hero-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .qt-detail-hero-content { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
    .qt-detail-qnum { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .qt-detail-customer { font-size: 13px; color: rgba(255,255,255,0.65); margin-top: 3px; }
    .qt-detail-version { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }
    .qt-detail-validity { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 6px; display: flex; align-items: center; gap: 4px; }
    .qt-detail-total-strip {
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 10px; padding: 10px 16px; text-align: right; flex-shrink: 0;
    }
    .qt-detail-total-label { font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 500; letter-spacing: 0.3px; text-transform: uppercase; }
    .qt-detail-total-val { font-size: 22px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; margin-top: 2px; }

    /* ── Drawer section cards ── */
    .qt-section { margin-bottom: 14px; }
    .qt-section-label {
      font-size: 11px; font-weight: 700; color: var(--qt-muted); text-transform: uppercase;
      letter-spacing: 0.6px; margin-bottom: 7px; padding-left: 2px;
    }
    .qt-section-card {
      background: var(--qt-surface); border: 1px solid var(--qt-border);
      border-radius: var(--qt-radius-sm); overflow: hidden;
    }
    .qt-info-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 10px 16px; border-bottom: 1px solid #F3F4F6; gap: 12px;
    }
    .qt-info-row:last-child { border-bottom: none; }
    .qt-info-label { font-size: 12px; color: var(--qt-muted); flex-shrink: 0; display: flex; align-items: center; gap: 5px; }
    .qt-info-value { font-size: 13px; font-weight: 500; color: var(--qt-text); text-align: right; word-break: break-word; }

    .qt-addr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .qt-addr-card {
      background: var(--qt-surface); border: 1px solid var(--qt-border);
      border-radius: var(--qt-radius-sm); padding: 12px 14px;
    }
    .qt-addr-label { font-size: 11px; font-weight: 700; color: var(--qt-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
    .qt-addr-text { font-size: 13px; color: var(--qt-text); line-height: 1.6; }

    /* ── Summary ── */
    .qt-summary-card {
      background: var(--qt-surface); border: 1px solid var(--qt-border);
      border-radius: var(--qt-radius-sm); overflow: hidden;
    }
    .qt-summary-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 9px 16px; border-bottom: 1px solid #F3F4F6; font-size: 13px;
    }
    .qt-summary-row:last-child { border-bottom: none; }
    .qt-summary-row.total { background: var(--qt-accent-light); padding: 12px 16px; }
    .qt-summary-label { color: var(--qt-muted); }
    .qt-summary-val { font-weight: 500; font-variant-numeric: tabular-nums; }
    .qt-summary-val.total { font-size: 15px; font-weight: 700; color: var(--qt-accent); }
    .qt-summary-pct { font-size: 11px; color: #C4B5FD; margin-right: 12px; }

    /* ── Timeline cards ── */
    .qt-timeline-item {
      display: flex; gap: 12px; align-items: flex-start;
      background: var(--qt-surface); border: 1px solid var(--qt-border);
      border-radius: var(--qt-radius-sm); padding: 12px 14px; margin-bottom: 8px;
    }
    .qt-timeline-dot {
      width: 10px; height: 10px; border-radius: 50%; margin-top: 4px; flex-shrink: 0;
    }
    .qt-timeline-title { font-size: 13px; font-weight: 600; color: var(--qt-text); margin-bottom: 3px; }
    .qt-timeline-desc { font-size: 12px; color: var(--qt-muted); margin-bottom: 3px; }
    .qt-timeline-meta { font-size: 11px; color: #9CA3AF; }

    /* ── Drawer footer ── */
    .qt-drawer-footer {
      padding: 14px 20px; border-top: 1px solid var(--qt-border); background: #FAFAFA;
      display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;
    }

    /* ── Empty ── */
    .qt-empty { text-align: center; padding: 48px 24px; color: var(--qt-muted); }
    .qt-empty-icon { font-size: 32px; opacity: 0.25; margin-bottom: 12px; }
    .qt-empty-text { font-size: 14px; font-weight: 500; }
    .qt-empty-sub { font-size: 12px; margin-top: 4px; }

    /* ── Responsive ── */
    @media (max-width: 1024px) { .qt-stats { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 768px) {
      .qt-header { padding: 20px 16px 44px; }
      .qt-toolbar { padding: 0 16px; }
      .qt-stats { padding: 0 16px; }
      .qt-body { padding: 0 16px 40px; }
      .qt-table-wrap { display: none !important; }
      .qt-mobile-list { display: block !important; }
      .qt-addr-grid { grid-template-columns: 1fr; }
      .qt-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    }
    @media (max-width: 480px) {
      .qt-add-btn span { display: none; }
      .qt-page-subtitle { padding-left: 0; margin-top: 8px; }
    }

    .qt-mobile-list { display: none; }

    /* ── Ant Drawer customization ── */
    .qt-details-drawer .ant-drawer-header {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%) !important;
      border-bottom: none !important;
      padding: 16px 20px !important;
    }
    .qt-details-drawer .ant-drawer-title { color: #fff !important; font-family: 'Inter', sans-serif !important; }
    .qt-details-drawer .ant-drawer-close { color: rgba(255,255,255,0.7) !important; }
    .qt-details-drawer .ant-drawer-close:hover { color: #fff !important; }
    .qt-details-drawer .ant-drawer-body { background: #F4F5F9 !important; padding: 16px !important; }
    .qt-details-drawer .ant-tabs-nav { background: #F4F5F9 !important; position: sticky !important; top: 0 !important; z-index: 10 !important; margin-bottom: 0 !important; padding-bottom: 2px !important; }
    .qt-details-drawer .ant-tabs-tab { font-family: 'Inter', sans-serif !important; font-size: 13px !important; }
    .qt-details-drawer .ant-tabs-tab-active .ant-tabs-tab-btn { color: var(--qt-accent) !important; font-weight: 600 !important; }
    .qt-details-drawer .ant-tabs-ink-bar { background: var(--qt-accent) !important; }
  `}</style>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₹0.00";
};

const joinAddr = (snap: any) =>
  [snap?.address_line_1, snap?.address_line_2, snap?.city, snap?.state, snap?.country, snap?.postal_code]
    .filter(Boolean).join(", ");

const parseJsonField = (raw: any) => {
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return undefined; } }
  return raw;
};

const getValidityDate = (v: string | undefined) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : dayjs(d);
};

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  SENT:           { color: "#4F46E5", bg: "#ECFDF5" },
  DRAFT:          { color: "#6B7280", bg: "#F3F4F6" },
  EXPIRED:        { color: "#DC2626", bg: "#FEF2F2" },
  APPROVED:       { color: "#059669", bg: "#EEF2FF" },
  REJECTED:       { color: "#EA580C", bg: "#FFF7ED" },
  PAID:           { color: "#0891B2", bg: "#ECFEFF" },
  PARTIALLY_PAID: { color: "#D97706", bg: "#FFFBEB" },
  PARTIAL:        { color: "#D97706", bg: "#FFFBEB" },
  DELETED :        { color: "#DC2626", bg: "#F3F4F6" }, 
};

const StatusPill = ({ status }: { status?: string }) => {
  const key = (status || "").toUpperCase().replace(/-/g, "_");
  const cfg = STATUS_CONFIG[key] || { color: "#7C3AED", bg: "#F5F3FF" };
  return (
    <span className="qt-status" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="qt-status-dot" style={{ background: cfg.color }} />
      {(status || "UNKNOWN").toUpperCase()}
    </span>
  );
};

// ─── Details tab sub-components ───────────────────────────────────────────────
const InfoRow = ({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="qt-info-row">
    <span className="qt-info-label">{icon}{label}</span>
    <span className="qt-info-value">{value ?? "—"}</span>
  </div>
);

const SectionCard = ({ title, children, noPad }: { title: string; children: React.ReactNode; noPad?: boolean }) => (
  <div className="qt-section">
    <div className="qt-section-label">{title}</div>
    {noPad ? children : <div className="qt-section-card">{children}</div>}
  </div>
);

// ─── Details Tab ──────────────────────────────────────────────────────────────
const DetailsTab: React.FC<{ q: any; isMobile: boolean }> = ({ q, isMobile }) => {
  const shipping = parseJsonField(q.shipping_address_snapshot);
  const billing = parseJsonField(q.billing_address_snapshot);
  const business = parseJsonField(q.business_details_snapshot) || {};
  const payment = parseJsonField(q.payment_details_snapshot) || {};

  const hasCgst = q.cgst_percent > 0 || q.cgst_amount > 0;
  const hasSgst = q.sgst_percent > 0 || q.sgst_amount > 0;
  const hasIgst = q.igst_percent > 0 || q.igst_amount > 0;

  const itemColumns = [
    { title: "Item", dataIndex: "product_name", render: (_: any, r: any) => r.product_name || r.itemName || r.description },
    { title: "HSN", dataIndex: "hsn_code", render: (v: any) => v || "—" },
    { title: "Qty", dataIndex: "qty", width: 60, render: (_: any, r: any) => r.qty || r.quantity || 0 },
    { title: "Rate", dataIndex: "rate", width: 90, render: (v: any) => fmt(v) },
    { title: "Disc%", dataIndex: "discount_percent", width: 70, render: (v: any) => v ? `${v}%` : "—" },
    { title: "Amount", dataIndex: "amount", width: 100, render: (_: any, r: any) => <span className="qt-currency">{fmt(r.amount || r.total || 0)}</span> },
  ];

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Hero */}
      <div className="qt-detail-hero">
        <div className="qt-detail-hero-noise" />
        <div className="qt-detail-hero-content">
          <div>
            <div className="qt-detail-qnum">#{q.quotation_number}</div>
            <div className="qt-detail-customer">{q.customer_name}{q.company_name ? ` · ${q.company_name}` : ""}</div>
            <div className="qt-detail-version">Version {q.version_number ?? 1}</div>
            {(q.validity || q.validity_date) && (
              <div className="qt-detail-validity">
                <ClockCircleOutlined />
                Valid till {q.validity || new Date(q.validity_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <StatusPill status={q.status} />
            <div className="qt-detail-total-strip">
              <div className="qt-detail-total-label">Grand Total</div>
              <div className="qt-detail-total-val">{fmt(q.grand_total ?? 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <SectionCard title="Contact">
        {q.contact_person_name && <InfoRow icon={<UserOutlined />} label="Name" value={q.contact_person_name} />}
        {q.contact_person_email && <InfoRow icon={<MailOutlined />} label="Email" value={q.contact_person_email} />}
        {q.contact_person_phone && <InfoRow icon={<PhoneOutlined />} label="Phone" value={q.contact_person_phone} />}
        {q.customer_gst_number && (
          <InfoRow icon={<NumberOutlined />} label="GST" value={<code style={{ fontSize: 12, background: "#F3F4F6", padding: "1px 6px", borderRadius: 4 }}>{q.customer_gst_number}</code>} />
        )}
      </SectionCard>

      {/* Addresses */}
      <div className="qt-section">
        <div className="qt-section-label">Addresses</div>
        <div className="qt-addr-grid">
          <div className="qt-addr-card">
            <div className="qt-addr-label"><EnvironmentOutlined style={{ color: "#4F46E5" }} />Shipping</div>
            <div className="qt-addr-text">{joinAddr(shipping) || "—"}</div>
          </div>
          <div className="qt-addr-card">
            <div className="qt-addr-label"><EnvironmentOutlined style={{ color: "#059669" }} />Billing</div>
            <div className="qt-addr-text">{joinAddr(billing) || "—"}</div>
          </div>
        </div>
      </div>

      {/* Business */}
      {(business.businessName || business.businessAddress) && (
        <SectionCard title="Business">
          {business.businessName && <InfoRow icon={<ShopOutlined />} label="Name" value={business.businessName} />}
          {business.businessGST && <InfoRow label="GST" value={<code style={{ fontSize: 12, background: "#F3F4F6", padding: "1px 6px", borderRadius: 4 }}>{business.businessGST}</code>} />}
          {business.businessPhone && <InfoRow icon={<PhoneOutlined />} label="Phone" value={business.businessPhone} />}
          {business.businessEmail && <InfoRow icon={<MailOutlined />} label="Email" value={business.businessEmail} />}
          {business.businessAddress && <InfoRow icon={<EnvironmentOutlined />} label="Address" value={typeof business.businessAddress === "string" ? business.businessAddress.replace(/\n/g, ", ") : ""} />}
        </SectionCard>
      )}

      {/* Payment */}
      {payment?.bank_name && (
        <SectionCard title="Bank Details">
          <InfoRow icon={<BankOutlined />} label="Bank" value={<strong>{payment.bank_name}</strong>} />
          {payment.account_holder_name && <InfoRow label="Holder" value={payment.account_holder_name} />}
          {payment.account_number && <InfoRow label="Account" value={<code style={{ fontSize: 12, background: "#F3F4F6", padding: "1px 6px", borderRadius: 4 }}>{payment.account_number}</code>} />}
          {payment.ifsc_code && <InfoRow label="IFSC" value={<code style={{ fontSize: 12, background: "#F3F4F6", padding: "1px 6px", borderRadius: 4 }}>{payment.ifsc_code}</code>} />}
          {payment.branch_name && <InfoRow label="Branch" value={payment.branch_name} />}
        </SectionCard>
      )}

      {/* Items */}
      <SectionCard title="Items" noPad>
        <div className="qt-section-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <Table
              size="small"
              columns={itemColumns}
              dataSource={(q.items || []).map((item: any, i: number) => ({ ...item, key: i }))}
              pagination={false}
              style={{ fontSize: 13 }}
              className="qt-table-wrap"
            />
          </div>
        </div>
      </SectionCard>

      {/* Summary */}
      <SectionCard title="Summary" noPad>
        <div className="qt-summary-card">
          {[
            { label: "Subtotal", val: fmt(q.sub_total ?? 0) },
            { label: "Discount", pct: `${Number(q.discount_percent ?? 0)}%`, val: `− ${fmt(q.discount_amount ?? 0)}` },
            ...(hasCgst ? [{ label: "CGST", pct: `${Number(q.cgst_percent ?? 0)}%`, val: fmt(q.cgst_amount ?? 0) }] : []),
            ...(hasSgst ? [{ label: "SGST", pct: `${Number(q.sgst_percent ?? 0)}%`, val: fmt(q.sgst_amount ?? 0) }] : []),
            ...(hasIgst ? [{ label: "IGST", pct: `${Number(q.igst_percent ?? 0)}%`, val: fmt(q.igst_amount ?? 0) }] : []),
            { label: "Transport", val: fmt(q.transport_charges ?? 0) },
          ].map(({ label, pct, val }) => (
            <div key={label} className="qt-summary-row">
              <span className="qt-summary-label">{label}</span>
              <span style={{ display: "flex", alignItems: "center" }}>
                {pct && <span className="qt-summary-pct">{pct}</span>}
                <span className="qt-summary-val">{val}</span>
              </span>
            </div>
          ))}
          <div className="qt-summary-row total">
            <span style={{ fontWeight: 700, fontSize: 14 }}>Grand Total</span>
            <span className="qt-summary-val total">{fmt(q.grand_total ?? 0)}</span>
          </div>
        </div>
      </SectionCard>

      {/* Notes */}
      {q.notes && (
        <SectionCard title="Notes">
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, padding: "10px 14px" }}>{q.notes}</div>
        </SectionCard>
      )}

      {/* Audit */}
      <SectionCard title="Audit">
        <InfoRow label="Created At" value={q.created_at ? new Date(q.created_at).toLocaleString() : "—"} />
        <InfoRow label="Created By" value={`${q.created_by_user?.first_name || ""} ${q.created_by_user?.last_name || ""}`.trim() || "—"} />
      </SectionCard>
    </div>
  );
};

// ─── History Tab ──────────────────────────────────────────────────────────────
const HistoryTab: React.FC<{ history: any[] }> = ({ history }) => {
  if (!history.length) return (
    <div className="qt-empty" style={{ paddingTop: 32 }}>
      <div className="qt-empty-icon"><ClockCircleOutlined /></div>
      <div className="qt-empty-text">No history available</div>
    </div>
  );
  return (
    <div style={{ paddingTop: 12 }}>
      {history.map((item: any, i: number) => (
        <div key={item.id ?? i} className="qt-timeline-item">
          <div className="qt-timeline-dot" style={{ background: "#9CA3AF" }} />
          <div style={{ flex: 1 }}>
            <div className="qt-timeline-title">
              Version {item.version_number || item.id}
              {item.action_type && (
                <span style={{ marginLeft: 8, background: "#F3F4F6", color: "#6B7280", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>
                  {item.action_type}
                </span>
              )}
            </div>
            <div className="qt-timeline-desc">{item.change_reason || item.action_type || "Quotation snapshot saved"}</div>
            <div className="qt-timeline-meta">
              {item.changed_by_user ? `By ${item.changed_by_user.first_name || ""} ${item.changed_by_user.last_name || ""}`.trim() : item.changed_by ? `By user ${item.changed_by}` : "Unknown"}
              {item.created_at && ` · ${new Date(item.created_at).toLocaleString()}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Timeline Tab ─────────────────────────────────────────────────────────────
const TimelineTab: React.FC<{ timeline: any[] }> = ({ timeline }) => {
  if (!timeline.length) return (
    <div className="qt-empty" style={{ paddingTop: 32 }}>
      <div className="qt-empty-icon"><ClockCircleOutlined /></div>
      <div className="qt-empty-text">No timeline events</div>
    </div>
  );
  return (
    <div style={{ paddingTop: 12 }}>
      {timeline.map((item: any, i: number) => (
        <div key={item.id ?? i} className="qt-timeline-item">
          <div className="qt-timeline-dot" style={{ background: "#4F46E5" }} />
          <div style={{ flex: 1 }}>
            <div className="qt-timeline-title">
              <ClockCircleOutlined style={{ marginRight: 6, color: "#4F46E5" }} />
              {item.action_type || item.type || "Event"}
            </div>
            <div className="qt-timeline-meta">
              {item.changed_by_user ? `Changed by ${item.changed_by_user.first_name || ""} ${item.changed_by_user.last_name || ""}`.trim() : "Timeline event"}
              {item.created_at && ` · ${new Date(item.created_at).toLocaleString()}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Mobile card ──────────────────────────────────────────────────────────────
const MobileCard: React.FC<{
  record: any; downloadingId: number | null;
  onView: (r: any) => void; onEdit: (r: any) => void;
  onDelete: (r: any) => void; onDownload: (r: any) => void;
  canEdit: boolean; canDelete: boolean; canExport: boolean;
}> = ({ record, downloadingId, onView, onEdit, onDelete, onDownload, canEdit, canDelete, canExport }) => (
  <div className="qt-mobile-card" onClick={() => onView(record)}>
    <div className="qt-mobile-card-top">
      <div>
        <div className="qt-mobile-qnum">{record.quotation_number}</div>
        <div className="qt-mobile-customer">{record.customer_name}</div>
        {record.company_name && <div className="qt-mobile-company">{record.company_name}</div>}
      </div>
      <StatusPill status={record.status} />
    </div>

    <div className="qt-mobile-amounts">
      <div className="qt-mobile-amt-block">
        <div className="qt-mobile-amt-label">Total</div>
        <div className="qt-mobile-amt-val" style={{ color: "#4F46E5" }}>{fmt(record.grand_total)}</div>
      </div>
      <div className="qt-mobile-amt-block">
        <div className="qt-mobile-amt-label">Expiry</div>
        <div className="qt-mobile-amt-val" style={{ fontSize: 13 }}>
          {record.validity_date ? new Date(record.validity_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
        </div>
      </div>
      <div className="qt-mobile-amt-block">
        <div className="qt-mobile-amt-label">Created</div>
        <div className="qt-mobile-amt-val" style={{ fontSize: 13 }}>
          {record.created_at ? new Date(record.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
        </div>
      </div>
    </div>

    <div className="qt-mobile-footer" onClick={e => e.stopPropagation()}>
      <div className="qt-mobile-meta">
        {record.created_by_user?.first_name} {record.created_by_user?.last_name}
      </div>
      <div className="qt-mobile-btns">
        {canExport && (
          <button className="qt-btn qt-btn-ghost qt-btn-sm" onClick={() => onDownload(record)}>
            {downloadingId === record.id ? <Spin size="small" /> : <DownloadOutlined />}
          </button>
        )}
        <button className="qt-btn qt-btn-ghost qt-btn-sm" onClick={() => onView(record)}><EyeOutlined /> View</button>
        {canEdit && <button className="qt-btn qt-btn-ghost qt-btn-sm" onClick={() => onEdit(record)}><EditOutlined /></button>}
        {canDelete && (
          <Popconfirm title="Delete this quotation?" onConfirm={() => onDelete(record)} okText="Delete" okButtonProps={{ danger: true }}>
            <button className="qt-btn qt-btn-danger qt-btn-sm"><DeleteOutlined /></button>
          </Popconfirm>
        )}
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const QuotationPage = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const storageService = useMemo(() => new StorageService(), []);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    const stored = storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
    if (stored) { try { setCompanyDetails(JSON.parse(stored)); } catch { } }
  }, [storageService]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [editingQuotation, setEditingQuotation] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(null);
  const [downloadingQuotationId, setDownloadingQuotationId] = useState<number | null>(null);
  const quotationService = new QuotationService();

  const quotationState = useSelector((state: any) => state.quotations);
  const authState = useSelector((state: any) => state.authn);
  const { can } = useAccess();

  const quotationData = quotationState?.quotations || {};
  const quotations = quotationData?.rows || [];
  const pagination = quotationData?.pagination || {};
  const loading = quotationState?.loading || false;
  const createLoading = quotationState?.createLoading || false;
  const actionLoading = quotationState?.actionLoading || false;
  const selectedQuotation = quotationState?.selectedQuotation;
  const quotationHistory = quotationState?.quotationHistory || [];
  const quotationTimeline = quotationState?.quotationTimeline || [];

  const prevCreateLoadingRef = useRef<boolean>(createLoading);

  useEffect(() => {
    if (prevCreateLoadingRef.current && !createLoading && !quotationState.error) {
      setShowForm(false); setEditingQuotation(null); form.resetFields();
      dispatch(getQuotations({ page, limit: pageSize, search: search || undefined }));
    }
    prevCreateLoadingRef.current = createLoading;
  }, [createLoading, quotationState.error]);

  useEffect(() => {
    dispatch(getQuotations({ page, limit: pageSize, search: search || undefined }));
  }, [dispatch, page, pageSize, search]);

  useEffect(() => {
    if (!selectedQuotationId) return;
    dispatch(getQuotationDetails(selectedQuotationId));
    dispatch(getQuotationHistory(selectedQuotationId));
    dispatch(getQuotationTimeline(selectedQuotationId));
  }, [dispatch, selectedQuotationId]);

  useEffect(() => {
    if (!editingQuotation || !selectedQuotation) return;
    if (selectedQuotation.id !== editingQuotation.id) return;
    const billingSnapshot = parseJsonField(selectedQuotation.billing_address_snapshot);
    const shippingSnapshot = parseJsonField(selectedQuotation.shipping_address_snapshot);
    const businessSnapshot = parseJsonField(selectedQuotation.business_details_snapshot) || {};
    const paymentSnapshot = parseJsonField(selectedQuotation.payment_details_snapshot) || {};
    form.setFieldsValue({
      customerId: selectedQuotation.customer_id, customerName: selectedQuotation.customer_name,
      customerType: selectedQuotation.customer_type, companyName: selectedQuotation.company_name,
      customerGSTN: selectedQuotation.customer_gst_number, customerEmail: selectedQuotation.contact_person_email,
      customerPhone: selectedQuotation.contact_person_phone, contactPersonId: selectedQuotation.contact_person_id,
      billingAddressId: selectedQuotation.billing_address_id, shippingAddressId: selectedQuotation.shipping_address_id,
      billingAddressSnapshot: JSON.stringify(billingSnapshot), shippingAddressSnapshot: JSON.stringify(shippingSnapshot),
      businessDetailsSnapshot: JSON.stringify(businessSnapshot), paymentBankId: paymentSnapshot.bank_id,
      paymentBankName: paymentSnapshot.bank_name, paymentAccountHolder: paymentSnapshot.account_holder_name,
      paymentAccountNumber: paymentSnapshot.account_number, paymentIFSC: paymentSnapshot.ifsc_code,
      paymentBranchName: paymentSnapshot.branch_name, paymentBranchAddress: paymentSnapshot.branch_address,
      paymentAccountType: paymentSnapshot.account_type, paymentIsDefault: paymentSnapshot.is_default,
      businessName: businessSnapshot.businessName ?? selectedQuotation.company_name ?? "",
      selectedAddress: Array.isArray(businessSnapshot.selectedAddress) ? businessSnapshot.selectedAddress : [],
      selectedLocation: Array.isArray(businessSnapshot.selectedLocation) ? businessSnapshot.selectedLocation : [],
      selectedPhones: Array.isArray(businessSnapshot.selectedPhones) ? businessSnapshot.selectedPhones : [],
      selectedEmails: Array.isArray(businessSnapshot.selectedEmails) ? businessSnapshot.selectedEmails : [],
      businessAddress: businessSnapshot.businessAddress ?? joinAddr(billingSnapshot),
      businessGST: businessSnapshot.businessGST ?? "", businessPhone: businessSnapshot.businessPhone ?? "",
      businessEmail: businessSnapshot.businessEmail ?? "",
      businessMeta: Array.isArray(businessSnapshot.businessMeta) ? businessSnapshot.businessMeta : [],
      billingAddress: joinAddr(billingSnapshot), shippingAddress: joinAddr(shippingSnapshot),
      items: (selectedQuotation.items || []).map((item: any) => ({
        itemName: item.product_name, hsn_code: item.hsn_code || item.hsn || "",
        quantity: item.qty, price: item.rate, discount: item.discount_percent, total: item.amount,
      })),
      subTotal: selectedQuotation.sub_total, discount: selectedQuotation.discount,
      cgst: selectedQuotation.cgst_percent, sgst: selectedQuotation.sgst_percent, igst: selectedQuotation.igst_percent,
      placeOfOrder: billingSnapshot?.state || shippingSnapshot?.state,
      transport: selectedQuotation.transport_charges, grandTotal: selectedQuotation.grand_total,
      validity_date: getValidityDate(selectedQuotation.validity_date), notes: selectedQuotation.notes,
    });
  }, [editingQuotation, selectedQuotation, form]);

  const downloadQuotationPDF = async (quotation: any) => {
    setDownloadingQuotationId(quotation.id);
    try { await downloadQuotationPDFHelper(quotation, async (id: number) => quotationService.getQuotationDetails(id)); }
    finally { setDownloadingQuotationId(null); }
  };

  const handleFinish = (values: any) => {
    const customerId = values.customerId;
    const userId = authState?.user?.id;
    const itemsRaw = values.items || [];
    if (!itemsRaw.length) { notification.error({ message: "No items added", description: "Please add at least one item." }); return; }
    const items = itemsRaw.map((item: any) => ({
      product_name: item?.itemName, hsn_code: item?.hsn_code,
      qty: Number(item?.quantity || item?.qty || 0), rate: Number(item?.price || item?.rate || 0),
      discount_percent: Number(item?.discount || 0),
    }));
    const subTotal = Number(values.subTotal || 0);
    const discountPercent = Number(values.discount || 0);
    const discountAmount = Number(values.discount_amount ?? (subTotal * discountPercent) / 100);
    const taxableAmount = subTotal - discountAmount;
    const cgstPercent = Number(values.cgst || 0), sgstPercent = Number(values.sgst || 0), igstPercent = Number(values.igst || 0);
    const cgstAmount = (taxableAmount * cgstPercent) / 100, sgstAmount = (taxableAmount * sgstPercent) / 100, igstAmount = (taxableAmount * igstPercent) / 100;
    const transportCharges = Number(values.transport || 0);
    const grandTotal = Number(values.grandTotal || taxableAmount + cgstAmount + sgstAmount + igstAmount + transportCharges);
    const storedCD = storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
    const currentCompanyId = companyDetails?.id || (storedCD ? (() => { try { return JSON.parse(storedCD)?.id; } catch { return undefined; } })() : undefined);
    const basePayload: any = {
      customer_id: Number(customerId) || undefined, user_id: Number(userId) || undefined,
      contact_person_id: values.contactPersonId, billing_address_id: values.billingAddressId, shipping_address_id: values.shippingAddressId,
      customer_name: values.customerName, customer_type: values.customerType, customer_gst_number: values.customerGSTN,
      contact_person_name: values.customerName, contact_person_email: values.customerEmail, contact_person_phone: values.customerPhone,
      billing_address_snapshot: JSON.parse(values.billingAddressSnapshot), shipping_address_snapshot: JSON.parse(values.shippingAddressSnapshot),
      business_details_snapshot: values.businessDetailsSnapshot ? JSON.parse(values.businessDetailsSnapshot) : undefined,
      payment_details_snapshot: values.paymentBankId ? JSON.stringify({ bank_id: values.paymentBankId, bank_name: values.paymentBankName, account_holder_name: values.paymentAccountHolder, account_number: values.paymentAccountNumber, ifsc_code: values.paymentIFSC, branch_name: values.paymentBranchName, branch_address: values.paymentBranchAddress, account_type: values.paymentAccountType, is_default: values.paymentIsDefault }) : undefined,
      validity_date: values.validity_date ? values.validity_date.toISOString() : undefined, notes: values.notes,
      sub_total: subTotal, discount_percent: discountPercent, discount_amount: discountAmount,
      cgst_percent: cgstPercent, cgst_amount: cgstAmount, sgst_percent: sgstPercent, sgst_amount: sgstAmount,
      igst_percent: igstPercent, igst_amount: igstAmount, transport_charges: transportCharges, grand_total: grandTotal, items,
    };
    if (editingQuotation) {
      dispatch(updateQuotation({ ...basePayload, id: editingQuotation.id }));
      setEditingQuotation(null);
    } else {
      const missing: string[] = [];
      if (!basePayload.customer_id) missing.push("selected customer");
      if (!currentCompanyId) missing.push("company details");
      if (!basePayload.user_id) missing.push("login");
      if (missing.length) { notification.error({ message: "Missing Required Fields", description: `Please provide ${missing.join(" and ")}.` }); return; }
      dispatch(createQuotation({ ...basePayload, company_id: currentCompanyId, quotation_date: new Date().toISOString() }));
    }
    form.resetFields();
  };

  const handleEdit = (record: any) => {
    setEditingQuotation(record);
    dispatch(getCustomers({ search: record.customer_name, page: 1, limit: 10 }));
    dispatch(getQuotationDetails(record.id));
    setShowForm(true);
    const bs = parseJsonField(record.billing_address_snapshot) || {};
    const ss = parseJsonField(record.shipping_address_snapshot) || {};
    const biz = parseJsonField(record.business_details_snapshot) || {};
    const pay = parseJsonField(record.payment_details_snapshot) || {};
    form.setFieldsValue({
      customerId: record.customer_id, customerName: record.customer_name, customerType: record.customer_type,
      companyName: record.company_name, customerGSTN: record.customer_gst_number, customerEmail: record.contact_person_email,
      customerPhone: record.contact_person_phone, contactPersonId: record.contact_person_id,
      billingAddressId: record.billing_address_id, shippingAddressId: record.shipping_address_id,
      billingAddressSnapshot: JSON.stringify(bs), shippingAddressSnapshot: JSON.stringify(ss),
      businessDetailsSnapshot: JSON.stringify(biz), paymentBankId: pay.bank_id,
      paymentBankName: pay.bank_name, paymentAccountHolder: pay.account_holder_name,
      paymentAccountNumber: pay.account_number, paymentIFSC: pay.ifsc_code,
      paymentBranchName: pay.branch_name, paymentBranchAddress: pay.branch_address,
      paymentAccountType: pay.account_type, paymentIsDefault: pay.is_default,
      businessName: biz.businessName ?? record.company_name ?? "",
      selectedAddress: Array.isArray(biz.selectedAddress) ? biz.selectedAddress : [],
      selectedLocation: Array.isArray(biz.selectedLocation) ? biz.selectedLocation : [],
      selectedPhones: Array.isArray(biz.selectedPhones) ? biz.selectedPhones : [],
      selectedEmails: Array.isArray(biz.selectedEmails) ? biz.selectedEmails : [],
      businessAddress: biz.businessAddress ?? joinAddr(bs), businessGST: biz.businessGST ?? "",
      businessPhone: biz.businessPhone ?? "", businessEmail: biz.businessEmail ?? "",
      businessMeta: Array.isArray(biz.businessMeta) ? biz.businessMeta : [],
      billingAddress: joinAddr(bs), shippingAddress: joinAddr(ss),
      items: (record.items || []).map((item: any) => ({ itemName: item.product_name, hsn_code: item.hsn_code || "", quantity: item.qty, price: item.rate, discount: item.discount_percent, total: item.amount })),
      subTotal: record.sub_total, discount: record.discount, cgst: record.cgst_percent, sgst: record.sgst_percent, igst: record.igst_percent,
      placeOfOrder: bs?.state || ss?.state, transport: record.transport_charges,
      grandTotal: record.grand_total, validity_date: getValidityDate(record.validity_date), notes: record.notes,
    });
  };

  const handleDelete = (record: any) => dispatch(deleteQuotation(record.id));
  const handleView = (record: any) => { setSelectedQuotationId(record.id); setDetailsVisible(true); };
  const handleSend = () => { if (!selectedQuotationId) return; dispatch(sendQuotation({ id: selectedQuotationId, user_id: authState?.user?.id })); };
  const handleApprove = () => { if (!selectedQuotationId) return;  dispatch(approveQuotation({ id: selectedQuotationId, user_id: authState?.user?.id })); };

  const closeForm = () => { setEditingQuotation(null); form.resetFields(); setShowForm(false); };
  const openCreate = () => {
    setShowForm(true); setEditingQuotation(null); form.resetFields();
    if (companyDetails?.default_terms_conditions) form.setFieldsValue({ notes: companyDetails.default_terms_conditions });
  };

  // Stats
  const totalApproved = quotations.filter((q: any) => (q.status || "").toUpperCase() === "APPROVED").length;
  const totalSent = quotations.filter((q: any) => (q.status || "").toUpperCase() === "SENT").length;
  const totalExpired = quotations.filter((q: any) => (q.status || "").toUpperCase() === "EXPIRED").length;

  const columns = [
    {
      title: "Quotation #", dataIndex: "quotation_number", width: 160,
      render: (value: any, record: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 700, color: `${record.has_invoice ? "#16A34A" : "#4F46E5"}`, cursor: "pointer" }} onClick={() => handleView(record)}>
          {value}
        </span>
       {record.has_invoice && (
  <Tooltip title="Invoice generated">
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 20,
        borderRadius: "50%",
        background: "#DCFCE7",
      }}
    >
      <FileDoneOutlined style={{ color: "#16A34A", fontSize: 20 }} />
    </span>
  </Tooltip>
)}
        </div>
      ),
    },
    {
      title: "Customer", dataIndex: "customer", width: 180,
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.customer_name}</div>
          {record.company_name && <div style={{ fontSize: 12, color: "#6B7280" }}>{record.company_name}</div>}
        </div>
      ),
    },
    {
      title: "Payment", dataIndex: "payment_details_snapshot", width: 120,
      render: (_: any, record: any) => {
        const p = parseJsonField(record.payment_details_snapshot) || {};
        if (!p.bank_name && !p.account_number) return <span style={{ color: "#9CA3AF" }}>—</span>;
        return (
          <div>
            {p.bank_name && <div style={{ fontWeight: 500 }}>{p.bank_name}</div>}
            {p.account_number && <code style={{ fontSize: 12, color: "#6B7280" }}>{p.account_number}</code>}
          </div>
        );
      },
    },
    {
      title: "Total", dataIndex: "grand_total", width: 120, align: "right" as const,
      render: (v: any) => <span className="qt-currency">{fmt(v)}</span>,
    },
    {
      title: "Status", dataIndex: "status", width: 140,
      render: (s: string) => <StatusPill status={s} />,
    },

    {
      title: "Expiry", dataIndex: "validity_date", width: 110,
      render: (v: string) => {
        const expired = v && new Date(v) < new Date();
        return <span style={{ fontSize: 12, color: expired ? "#DC2626" : "#6B7280", fontWeight: expired ? 600 : 400 }}>
          {v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
        </span>;
      },
    },
    {
      title: "Created By", dataIndex: "created_by", width: 140,
      render: (_: any, record: any) => <span style={{ fontSize: 13 }}>{`${record.created_by_user?.first_name || ""} ${record.created_by_user?.last_name || ""}`.trim() || "—"}</span>,
    },
    {
      title: "Actions", key: "action", fixed: "right" as const, width: 140,
      render: (_: any, record: any) => (
        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
          {can("quotations.export") && (
            <button className="qt-btn qt-btn-ghost qt-btn-icon" onClick={() => downloadQuotationPDF(record)} title="Download PDF">
              {downloadingQuotationId === record.id ? <Spin size="small" /> : <DownloadOutlined />}
            </button>
          )}
          <button className="qt-btn qt-btn-ghost qt-btn-icon" onClick={() => handleView(record)} title="View"><EyeOutlined /></button>
          {can("quotations.edit") && (!record.has_invoice) && <button className="qt-btn qt-btn-ghost qt-btn-icon" onClick={() => handleEdit(record)} title="Edit"><EditOutlined /></button>}
          {can("quotations.delete") &&  (record.status ==="DRAFT") && (
            <Popconfirm title="Delete this quotation?" onConfirm={() => handleDelete(record)} okText="Delete" okButtonProps={{ danger: true }}>
              <button className="qt-btn qt-btn-danger qt-btn-icon" title="Delete"><DeleteOutlined /></button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="qt-root">
      <GlobalStyles />

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="qt-header">
        <div className="qt-header-noise" />
        <div className="qt-header-content">
          <div>
            <div className="qt-page-title">
              <div className="qt-page-title-icon"><FileTextOutlined /></div>
              Quotations
            </div>
            <div className="qt-page-subtitle">Create, send, and manage customer quotations</div>
          </div>
          {can("quotations.create") && (
            <button className="qt-add-btn" onClick={openCreate}>
              <PlusOutlined />
              <span>New Quotation</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 24px", marginTop: -18, position: "relative", zIndex: 2, marginBottom: 16 }}>
        <div className="qt-stats">
          <div className="qt-stat-card">
            <div className="qt-stat-label">Total</div>
            <div className="qt-stat-value accent">{quotations.length}</div>
          </div>
          <div className="qt-stat-card">
            <div className="qt-stat-label">Approved</div>
            <div className="qt-stat-value success">{totalApproved}</div>
          </div>
          <div className="qt-stat-card">
            <div className="qt-stat-label">Sent</div>
            <div className="qt-stat-value" style={{ color: "#0891B2" }}>{totalSent}</div>
          </div>
          <div className="qt-stat-card">
            <div className="qt-stat-label">Expired</div>
            <div className="qt-stat-value danger">{totalExpired}</div>
          </div>
        </div>
      </div>

      <div className="qt-body">

        {/* ── Form ─────────────────────────────────────────────────────────── */}
        {showForm && (
          <div className="qt-form-card">
            <div className="qt-form-header">
              <div className="qt-form-header-noise" />
              <div>
                <div className="qt-form-title">{editingQuotation ? "Edit Quotation" : "New Quotation"}</div>
                <div className="qt-form-subtitle">
                  {editingQuotation ? `Editing ${editingQuotation.quotation_number}` : "Create a professional quotation for your customer"}
                </div>
              </div>
              <button className="qt-form-close" onClick={closeForm}><CloseOutlined /></button>
            </div>

            <div className="qt-form-body">
              <Form form={form} layout="vertical" onFinish={handleFinish} autoComplete="off">
                <Form.Item name="customerId" hidden><input type="hidden" /></Form.Item>
                <Row gutter={[16, 0]}>
                  <Col xs={24} md={12}><BusinessDetails /></Col>
                  <Col xs={24} md={12}><CustomerDetails /></Col>
                </Row>
                <QuotationItems />
                <QuotationSummary  />
                <PaymentDetails />
              </Form>
            </div>

            <div className="qt-form-footer">
              {(editingQuotation ? can("quotations.edit") : can("quotations.create")) && (
                <button
                  className="qt-btn qt-btn-primary"
                  onClick={() => form.submit()}
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <><span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "qt-spin .6s linear infinite", display: "inline-block" }} />Saving…</>
                  ) : (
                    <><CheckCircleOutlined />{editingQuotation ? "Save Changes" : "Save Quotation"}</>
                  )}
                </button>
              )}
              <button className="qt-btn qt-btn-ghost" onClick={closeForm}><CloseOutlined />Cancel</button>
            </div>

            <style>{`@keyframes qt-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="qt-card" style={{ marginBottom: 12 }}>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="qt-search-wrap">
                <SearchOutlined className="qt-search-icon" />
                <input
                  className="qt-search"
                  placeholder="Search quotation no. or customer…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              {quotations.length > 0 && (
                <span className="qt-toolbar-count">{pagination.total || quotations.length} quotation{(pagination.total || quotations.length) !== 1 ? "s" : ""}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="qt-card">
          <div className="qt-card-header">
            <div className="qt-card-title">
              <div className="qt-card-icon"><FileTextOutlined /></div>
              All Quotations
            </div>
            {quotations.length > 0 && (
              <span className="qt-count-badge">{quotations.length} shown</span>
            )}
          </div>

          {/* Desktop */}
          <div className="qt-table-wrap">
            <Table
              columns={columns}
              dataSource={quotations.map((q: any) => ({ ...q, key: q.id }))}
              pagination={false}
              loading={loading}
              locale={{ emptyText: (
                <div className="qt-empty">
                  <div className="qt-empty-icon"><FileTextOutlined /></div>
                  <div className="qt-empty-text">No quotations found</div>
                  <div className="qt-empty-sub">Try adjusting your search or create one</div>
                </div>
              )}}
              scroll={{ x: "max-content" }}
              onRow={(record) => ({ onClick: () => handleView(record) })}
            />
          </div>

          {/* Mobile */}
          <div className="qt-mobile-list" style={{ padding: "12px" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
            ) : quotations.length === 0 ? (
              <div className="qt-empty">
                <div className="qt-empty-icon"><FileTextOutlined /></div>
                <div className="qt-empty-text">No quotations found</div>
                <div className="qt-empty-sub">Try adjusting your search or create one</div>
              </div>
            ) : (
              quotations.map((q: any) => (
                <MobileCard
                  key={q.id} record={q} downloadingId={downloadingQuotationId}
                  onView={handleView} onEdit={handleEdit} onDelete={handleDelete} onDownload={downloadQuotationPDF}
                  canEdit={can("quotations.edit")} canDelete={can("quotations.delete")} canExport={can("quotations.export")}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="qt-pagination-row">
              <span className="qt-pagination-info">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, pagination.total)} of {pagination.total}
              </span>
              <Pagination
                current={page} pageSize={pageSize} total={pagination.total}
                showSizeChanger={!isMobile} showQuickJumper={!isMobile} simple={isMobile}
                pageSizeOptions={["5", "10", "25", "50"]}
                onChange={p => setPage(p)}
                onShowSizeChange={(_, s) => { setPageSize(s); setPage(1); }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Details Drawer ───────────────────────────────────────────────────── */}
      <Drawer
        className="qt-details-drawer"
        title={
          selectedQuotation ? (
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>#{selectedQuotation.quotation_number}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                {selectedQuotation.customer_name}{selectedQuotation.company_name ? ` · ${selectedQuotation.company_name}` : ""}
              </div>
            </div>
          ) : "Quotation Details"
        }
        placement="right"
        width={isMobile ? "100%" : 700}
        onClose={() => setDetailsVisible(false)}
        open={detailsVisible}
        footer={
          <div className="qt-drawer-footer">
            <button className="qt-btn qt-btn-ghost" onClick={() => setDetailsVisible(false)}>Close</button>
            {can("quotations.export") && selectedQuotation && (
              <button
                className="qt-btn qt-btn-ghost"
                onClick={() => downloadQuotationPDF(selectedQuotation)}
                disabled={downloadingQuotationId === selectedQuotation?.id}
              >
                {downloadingQuotationId === selectedQuotation?.id ? <Spin size="small" /> : <DownloadOutlined />}
                Download PDF
              </button>
            )}
            {can("quotations.send") && (
              <><button className="qt-btn qt-btn-primary" onClick={handleSend} disabled={actionLoading}>
                {actionLoading ? <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "qt-spin .6s linear infinite", display: "inline-block" }} /> : <SendOutlined />}
                Send Quotation
              </button>
               
              </>
              
            )}
             {can("quotations.send") && (selectedQuotation?.status === "SENT") &&(
              <>
              <button className="qt-btn qt-btn-primary" onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "qt-spin .6s linear infinite", display: "inline-block" }} /> : <RightOutlined />}
                Approve Quotation
              </button>
              
              </>
            )}
          </div>
        }
      >
        {selectedQuotation ? (
          <Tabs
            defaultActiveKey="details"
            size={isMobile ? "small" : "middle"}
            items={[
              { key: "details", label: "Details", children: <DetailsTab q={selectedQuotation} isMobile={isMobile} /> },
              { key: "history", label: `History${quotationHistory.length ? ` (${quotationHistory.length})` : ""}`, children: <HistoryTab history={quotationHistory} /> },
              { key: "timeline", label: `Timeline${quotationTimeline.length ? ` (${quotationTimeline.length})` : ""}`, children: <TimelineTab timeline={quotationTimeline} /> },
            ]}
          />
        ) : (
          <div className="qt-empty" style={{ marginTop: 60 }}>
            <div className="qt-empty-icon"><FileTextOutlined /></div>
            <div className="qt-empty-text">Select a quotation to view details</div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default QuotationPage;