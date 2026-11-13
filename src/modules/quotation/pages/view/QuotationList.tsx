import React from "react";
import type { Dayjs } from "dayjs";
import { Dropdown, Modal, Pagination, Popconfirm, Select, Spin, Tooltip } from "antd";
import type { MenuProps } from "antd";
import {
  CarOutlined,
  CheckOutlined,
  CloseCircleFilled,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { Avatar, FILTERS, SORTS, StagePill, ValidityChip, closeReasonLabel, count, inr, isClosed, shortDate } from "./shared";
import type { QuotationSummaryData } from "./types";

export interface RowActions {
  canSend: (q: any) => boolean;
  canApprove: (q: any) => boolean;
  canChallan: (q: any) => boolean;
  canEdit: (q: any) => boolean;
  canDelete: (q: any) => boolean;
  canClose: (q: any) => boolean;
  canReopen: (q: any) => boolean;
  canExport: boolean;
  onSend: (q: any) => void;
  onApprove: (q: any) => void;
  onChallan: (q: any) => void;
  onDownload: (q: any) => void;
  onEdit: (q: any) => void;
  onDelete: (q: any) => void;
  onClose: (q: any) => void;
  onReopen: (q: any) => void;
  actingId: number | null;
  downloadingId: number | null;
  deletingId: number | null;
}

export const tabCount = (s: QuotationSummaryData | null, key: string): number | undefined => {
  if (!s) return undefined;
  const st = s.stages;
  switch (key) {
    case "": return s.total.count;
    case "DRAFT": return st.draft.count;
    case "SENT": return st.sent.count;
    case "APPROVED": return st.approved.count;
    case "INVOICED": return st.invoiced.count;
    case "REJECTED": return st.rejected.count;
    case "EXPIRED": return st.expired.count;
    case "EXPIRING": return s.expiring.count;
    case "LAPSED": return s.lapsed.count;
    default: return undefined;
  }
};

// ── Toolbar ──────────────────────────────────────────────────────────────────

export const QuotationToolbar: React.FC<{
  summary: QuotationSummaryData | null;
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
    <div className="qp-tabs" role="tablist" aria-label="Show quotations">
      {FILTERS.filter((f) => !f.optional || filter === f.key || (tabCount(summary, f.key) || 0) > 0).map((f) => {
        const n = tabCount(summary, f.key);
        const active = filter === f.key;
        return (
          <button
            key={f.key || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            className={`qp-tab${active ? " active" : ""}${f.tone === "warn" ? " warn" : ""}`}
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
          placeholder="Search number, customer, phone or email"
          aria-label="Search quotations"
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

const hasGst = (q: any) => Number(q.cgst_amount || 0) + Number(q.sgst_amount || 0) + Number(q.igst_amount || 0) > 0;

const Row: React.FC<{ q: any; i: number; selected: boolean; today: Dayjs; a: RowActions; onOpen: (q: any) => void }> = React.memo(({ q, i, selected, today, a, onOpen }) => {
  const items: any[] = q.items || [];
  const busy = a.actingId === q.id;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div
      className={`qp-row${selected ? " selected" : ""}`}
      style={{ ["--i" as any]: i }}
      tabIndex={0}
      role="button"
      aria-label={`Open quotation ${q.quotation_number} for ${q.customer_name || "customer"}`}
      onClick={() => onOpen(q)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onOpen(q);
        }
      }}
    >
      <div className="qp-c-num">
        <div className="qp-num">
          <span title={q.quotation_number}>{q.quotation_number}</span>
          {q.has_invoice ? (
            <Tooltip title="An invoice was made from this quotation">
              <FileDoneOutlined />
            </Tooltip>
          ) : null}
        </div>
        <div className="qp-sub">
          v{q.version_number ?? 1} · {shortDate(q.quotation_date || q.created_at)}
        </div>
      </div>

      <div className="qp-c-cust">
        <Avatar name={q.customer_name} seed={q.customer_id || q.customer_name} size={38} />
        <div className="qp-cust-text">
          <b title={q.customer_name}>{q.customer_name || "—"}</b>
          <div className="qp-sub">{q.company_name || q.contact_person_phone || q.contact_person_email || (q.customer_type === "BUSINESS" ? "Business" : "Individual")}</div>
        </div>
      </div>

      <div className="qp-c-items">
        <b title={items[0]?.product_name}>{items[0]?.product_name || "No items"}</b>
        <div className="qp-sub">
          {items.length > 1 ? `+${items.length - 1} more · ` : ""}
          {count(items.length)} item{items.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="qp-c-amt">
        <b>{inr(q.grand_total)}</b>
        <div className="qp-sub">{hasGst(q) ? "incl. GST" : "no GST"}</div>
      </div>

      <div className="qp-c-status">
        <StagePill q={q} />
        {isClosed(q) ? (
          <span className="qp-closed-why" title={q.close_remark || undefined}>
            {closeReasonLabel(q.status, q.close_reason) || "Closed"}
            {q.close_remark ? " · has feedback" : ""}
          </span>
        ) : (
          <ValidityChip q={q} today={today} />
        )}
      </div>

      <div className="qp-acts" onClick={stop} onKeyDown={stop}>
        {a.canSend(q) && (
          <Popconfirm title={q.status === "SENT" ? "Send this quotation again?" : "Send this quotation to the customer?"} okText="Send" onConfirm={() => a.onSend(q)}>
            <Tooltip title={q.status === "SENT" ? "Resend" : "Send"}>
              <button type="button" className="qp-act send" disabled={busy} aria-label="Send">
                {busy ? <Spin size="small" /> : <SendOutlined />}
              </button>
            </Tooltip>
          </Popconfirm>
        )}
        {a.canApprove(q) && (
          <Popconfirm title="Mark this quotation as approved by the customer?" okText="Approve" onConfirm={() => a.onApprove(q)}>
            <Tooltip title="Approve">
              <button type="button" className="qp-act approve" disabled={busy} aria-label="Approve">
                {busy ? <Spin size="small" /> : <CheckOutlined />}
              </button>
            </Tooltip>
          </Popconfirm>
        )}
        {a.canChallan(q) && (
          <Tooltip title="Create delivery challan">
            <button type="button" className="qp-act challan" onClick={() => a.onChallan(q)} aria-label="Create delivery challan">
              <CarOutlined />
            </button>
          </Tooltip>
        )}
        {a.canExport && (
          <Tooltip title="Download PDF">
            <button type="button" className="qp-act" onClick={() => a.onDownload(q)} disabled={a.downloadingId === q.id} aria-label="Download PDF">
              {a.downloadingId === q.id ? <Spin size="small" /> : <DownloadOutlined />}
            </button>
          </Tooltip>
        )}
        {a.canEdit(q) && (
          <Tooltip title="Edit">
            <button type="button" className="qp-act" onClick={() => a.onEdit(q)} aria-label="Edit">
              <EditOutlined />
            </button>
          </Tooltip>
        )}
        {(() => {
          const items: MenuProps["items"] = [];
          if (a.canClose(q)) items.push({ key: "close", icon: <StopOutlined />, label: "Close with feedback…", onClick: () => a.onClose(q) });
          if (a.canReopen(q)) items.push({ key: "reopen", icon: <UndoOutlined />, label: "Reopen", onClick: () => a.onReopen(q) });
          if (a.canDelete(q)) {
            if (items.length) items.push({ type: "divider" });
            items.push({
              key: "delete",
              icon: <DeleteOutlined />,
              danger: true,
              label: "Delete draft",
              onClick: () =>
                Modal.confirm({
                  title: `Delete ${q.quotation_number}?`,
                  content: "The draft is removed from the list. Prefer “Close” to keep a record of why it didn't go ahead.",
                  okText: "Delete",
                  okButtonProps: { danger: true },
                  onOk: () => a.onDelete(q),
                }),
            });
          }
          if (!items.length) return null;
          return (
            <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
              <button type="button" className="qp-act" aria-label="More actions" disabled={a.deletingId === q.id}>
                {a.deletingId === q.id ? <Spin size="small" /> : <MoreOutlined />}
              </button>
            </Dropdown>
          );
        })()}
      </div>
    </div>
  );
});
Row.displayName = "QuotationRow";

// ── List ─────────────────────────────────────────────────────────────────────

export const QuotationList: React.FC<{
  rows: any[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number, size: number) => void;
  filtered: boolean;
  onClear: () => void;
  selectedId: number | null;
  onOpen: (q: any) => void;
  actions: RowActions;
  today: Dayjs;
  isMobile: boolean;
  canCreate: boolean;
  onNew: () => void;
}> = ({ rows, loading, total, page, pageSize, onPage, filtered, onClear, selectedId, onOpen, actions, today, isMobile, canCreate, onNew }) => {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  return (
    <div className={`qp-list${loading && rows.length ? " refreshing" : ""}`}>
      {rows.length > 0 && (
        <div className="qp-list-head" aria-hidden>
          <span>Quotation</span>
          <span>Customer</span>
          <span className="qp-c-items">Items</span>
          <span className="right">Amount</span>
          <span>Status</span>
          <span />
        </div>
      )}
      <div className="qp-rows">
        {rows.length ? (
          rows.map((q, i) => <Row key={q.id} q={q} i={i} selected={q.id === selectedId} today={today} a={actions} onOpen={onOpen} />)
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
            <b>No quotations match</b>
            <span>Try another search, or look at all quotations.</span>
            <button type="button" className="qp-btn ghost" onClick={onClear}>
              Show all quotations
            </button>
          </div>
        ) : (
          <div className="qp-empty">
            <span className="qp-empty-art">
              <FileTextOutlined />
            </span>
            <b>No quotations yet</b>
            <span>Send your first quotation in under a minute — pick a customer, add items, done.</span>
            {canCreate && (
              <button type="button" className="qp-btn primary" onClick={onNew}>
                <PlusOutlined /> New quotation
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
