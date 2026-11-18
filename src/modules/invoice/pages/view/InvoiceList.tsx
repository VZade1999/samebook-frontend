import React from "react";
import type { Dayjs } from "dayjs";
import { Dropdown, Pagination, Popconfirm, Select, Spin, Tooltip } from "antd";
import type { MenuProps } from "antd";
import {
  CloseCircleFilled,
  CopyOutlined,
  DownloadOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  MessageOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { ago } from "@/modules/dashboard/utils/format";
import { Avatar, DueChip, FILTERS, SORTS, StatePill, balanceOf, count, inr, isOpen, paidShare, shortDate, stateOf } from "./shared";
import type { InvoiceSummaryData } from "./types";

export interface RowActions {
  canPay: (inv: any) => boolean;
  canSend: (inv: any) => boolean;
  canExport: boolean;
  onPay: (inv: any) => void;
  onSend: (inv: any) => void;
  onDownload: (inv: any) => void;
  onCopyNumber: (inv: any) => void;
  onCopyReminder: (inv: any) => void;
  onOpenQuotation?: (inv: any) => void;
  sendingId: number | null;
  downloadingId: number | null;
}

export const tabCount = (s: InvoiceSummaryData | null, key: string): number | undefined => {
  if (!s) return undefined;
  switch (key) {
    case "": return s.total.count;
    case "UNPAID": return s.states.unpaid.count;
    case "PARTIAL": return s.states.partial.count;
    case "PAID": return s.states.paid.count;
    case "OVERDUE": return s.overdue.count;
    case "DUE_SOON": return s.due_soon.count;
    case "NO_DUE": return s.no_due_date.count;
    case "CANCELLED": return s.states.cancelled.count;
    default: return undefined;
  }
};

// ── Toolbar ──────────────────────────────────────────────────────────────────

export const InvoiceToolbar: React.FC<{
  summary: InvoiceSummaryData | null;
  filter: string;
  onFilter: (key: string) => void;
  search: string;
  onSearch: (v: string) => void;
  sort: string;
  onSort: (v: string) => void;
  loading: boolean;
  onRefresh: () => void;
}> = ({ summary, filter, onFilter, search, onSearch, sort, onSort, loading, onRefresh }) => (
  <div className={`qp-toolbar${loading ? " loading" : ""}`}>
    <div className="qp-tabs" role="tablist" aria-label="Show invoices">
      {FILTERS.filter((f) => !f.optional || filter === f.key || (tabCount(summary, f.key) || 0) > 0).map((f) => {
        const n = tabCount(summary, f.key);
        const active = filter === f.key;
        return (
          <button
            key={f.key || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            className={`qp-tab${active ? " active" : ""}${f.tone ? ` ${f.tone}` : ""}`}
            onClick={() => onFilter(f.key)}
          >
            {f.label}
            {n !== undefined && <em>{count(n)}</em>}
          </button>
        );
      })}
    </div>
    <div className="qp-toolbar-row">
      <label className="qp-search">
        <SearchOutlined />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search invoice or quotation number, customer, phone or email"
          aria-label="Search invoices"
        />
        {search && (
          <button type="button" onClick={() => onSearch("")} aria-label="Clear search">
            <CloseCircleFilled />
          </button>
        )}
      </label>
      <Select className="qp-sort" value={sort} onChange={onSort} options={SORTS.map((s) => ({ value: s.key, label: s.label }))} aria-label="Sort" />
      <Tooltip title="Refresh">
        <button type="button" className="db-icon-btn" onClick={onRefresh} aria-label="Refresh" style={{ height: 38, width: 38 }}>
          <ReloadOutlined spin={loading} />
        </button>
      </Tooltip>
    </div>
    <div className="qp-progress" />
  </div>
);

// ── Row ──────────────────────────────────────────────────────────────────────

const hasGst = (inv: any) => Number(inv.cgst_amount || 0) + Number(inv.sgst_amount || 0) + Number(inv.igst_amount || 0) > 0;

const PayBar: React.FC<{ inv: any }> = ({ inv }) => {
  const s = stateOf(inv);
  // A settled invoice reads as a full bar even when its total is ₹0.
  const share = s === "paid" ? 100 : paidShare(inv);
  const due = balanceOf(inv);
  return (
    <div className={`ip-pay ${s}`}>
      <div className="ip-pay-track" role="img" aria-label={`${Math.round(share)}% paid`}>
        <span style={{ width: `${share}%` }} />
      </div>
      <div className="ip-pay-text">
        {s === "paid" ? (
          <span className="good">Settled</span>
        ) : s === "cancelled" ? (
          <span>—</span>
        ) : (
          <span>
            <b>{inr(due)}</b> due
          </span>
        )}
        {s === "partial" && <em>{Math.round(share)}% in</em>}
      </div>
    </div>
  );
};

const Row: React.FC<{ inv: any; i: number; selected: boolean; today: Dayjs; a: RowActions; onOpen: (inv: any) => void }> = React.memo(({ inv, i, selected, today, a, onOpen }) => {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const sending = a.sendingId === inv.id;
  const open = isOpen(inv);
  const more: MenuProps["items"] = [{ key: "copy", icon: <CopyOutlined />, label: "Copy invoice number", onClick: () => a.onCopyNumber(inv) }];
  if (open) more.push({ key: "remind", icon: <MessageOutlined />, label: "Copy payment reminder", onClick: () => a.onCopyReminder(inv) });
  if (a.onOpenQuotation && inv.quotation_number) more.push({ key: "qt", icon: <FileTextOutlined />, label: `Open quotation ${inv.quotation_number}`, onClick: () => a.onOpenQuotation?.(inv) });
  return (
    <div
      className={`qp-row ip-row${selected ? " selected" : ""}`}
      style={{ ["--i" as any]: i }}
      tabIndex={0}
      role="button"
      aria-label={`Open invoice ${inv.invoice_number} for ${inv.customer_name || "customer"}`}
      onClick={() => onOpen(inv)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onOpen(inv);
        }
      }}
    >
      <div className="qp-c-num">
        <div className="qp-num">
          <span title={inv.invoice_number}>{inv.invoice_number}</span>
          {inv.last_sent_at ? (
            <Tooltip title={`Marked as sent ${ago(inv.last_sent_at)}`}>
              <SendOutlined className="ip-sent-ic" />
            </Tooltip>
          ) : null}
        </div>
        <div className="qp-sub">
          {shortDate(inv.invoice_date)}
          {inv.quotation_number ? ` · ${inv.quotation_number}` : ""}
        </div>
      </div>

      <div className="qp-c-cust">
        <Avatar name={inv.customer_name} seed={inv.customer_id || inv.customer_name} size={38} />
        <div className="qp-cust-text">
          <b title={inv.customer_name}>{inv.customer_name || "—"}</b>
          <div className="qp-sub">{inv.contact_person_phone || inv.contact_person_email || (inv.customer_type === "BUSINESS" ? "Business" : "Individual")}</div>
        </div>
      </div>

      <div className="qp-c-amt">
        <b>{inr(inv.grand_total)}</b>
        <div className="qp-sub">{hasGst(inv) ? "incl. GST" : "no GST"}</div>
      </div>

      <div className="ip-c-pay">
        <PayBar inv={inv} />
      </div>

      <div className="qp-c-status">
        <StatePill inv={inv} />
        <DueChip inv={inv} today={today} />
      </div>

      <div className="qp-acts" onClick={stop} onKeyDown={stop}>
        {a.canPay(inv) && (
          <Tooltip title="Record a payment">
            <button type="button" className="qp-act pay" onClick={() => a.onPay(inv)} aria-label="Record a payment">
              ₹
            </button>
          </Tooltip>
        )}
        {a.canSend(inv) && (
          <Popconfirm
            title={inv.last_sent_at ? "Mark as sent again?" : "Mark this invoice as sent?"}
            description="Notes that you shared it with the customer. Nothing is emailed from SameBook."
            okText="Mark as sent"
            onConfirm={() => a.onSend(inv)}
          >
            <Tooltip title={inv.last_sent_at ? "Mark as sent again" : "Mark as sent"}>
              <button type="button" className="qp-act send" disabled={sending} aria-label="Mark as sent">
                {sending ? <Spin size="small" /> : <SendOutlined />}
              </button>
            </Tooltip>
          </Popconfirm>
        )}
        {a.canExport && (
          <Tooltip title="Download PDF">
            <button type="button" className="qp-act" onClick={() => a.onDownload(inv)} disabled={a.downloadingId === inv.id} aria-label="Download PDF">
              {a.downloadingId === inv.id ? <Spin size="small" /> : <DownloadOutlined />}
            </button>
          </Tooltip>
        )}
        <Dropdown menu={{ items: more }} trigger={["click"]} placement="bottomRight">
          <button type="button" className="qp-act" aria-label="More actions">
            <MoreOutlined />
          </button>
        </Dropdown>
      </div>
    </div>
  );
});
Row.displayName = "InvoiceRow";

// ── List ─────────────────────────────────────────────────────────────────────

export const InvoiceList: React.FC<{
  rows: any[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number, size: number) => void;
  filtered: boolean;
  onClear: () => void;
  selectedId: number | null;
  onOpen: (inv: any) => void;
  actions: RowActions;
  today: Dayjs;
  isMobile: boolean;
  canCreate: boolean;
  onNew: () => void;
}> = ({ rows, loading, total, page, pageSize, onPage, filtered, onClear, selectedId, onOpen, actions, today, isMobile, canCreate, onNew }) => {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  return (
    <div className={`qp-list ip-list${loading && rows.length ? " refreshing" : ""}`}>
      {rows.length > 0 && (
        <div className="qp-list-head ip-row" aria-hidden>
          <span>Invoice</span>
          <span>Customer</span>
          <span className="right">Amount</span>
          <span>Payment</span>
          <span>Status</span>
          <span />
        </div>
      )}
      <div className="qp-rows">
        {rows.length ? (
          rows.map((inv, i) => <Row key={inv.id} inv={inv} i={i} selected={inv.id === selectedId} today={today} a={actions} onOpen={onOpen} />)
        ) : loading ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="qp-sk-row" aria-hidden>
              <i className="round" />
              <i style={{ width: "18%" }} />
              <i style={{ width: "24%" }} />
              <i style={{ width: "14%", marginLeft: "auto" }} />
              <i style={{ width: "10%" }} />
            </div>
          ))
        ) : filtered ? (
          <div className="qp-empty">
            <span className="qp-empty-art">
              <FileSearchOutlined />
            </span>
            <b>No invoices match</b>
            <span>Try another search, or look at all invoices.</span>
            <button type="button" className="qp-btn ghost" onClick={onClear}>
              Show all invoices
            </button>
          </div>
        ) : (
          <div className="qp-empty">
            <span className="qp-empty-art">
              <FileDoneOutlined />
            </span>
            <b>No invoices yet</b>
            <span>Turn an approved quotation into an invoice — items, prices and the customer carry over.</span>
            {canCreate && (
              <button type="button" className="qp-btn primary" onClick={onNew}>
                <PlusOutlined /> New invoice
              </button>
            )}
          </div>
        )}
      </div>
      {total > 0 && (
        <div className="qp-pager">
          <span>
            Showing <b>{from}–{to}</b> of <b>{count(total)}</b>
          </span>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            size="small"
            showSizeChanger={!isMobile}
            simple={isMobile}
            pageSizeOptions={["10", "25", "50"]}
            onChange={onPage}
          />
        </div>
      )}
    </div>
  );
};
