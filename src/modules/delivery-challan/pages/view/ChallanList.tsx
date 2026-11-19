import React from "react";
import type { Dayjs } from "dayjs";
import { Dropdown, Pagination, Popconfirm, Select, Spin, Tooltip } from "antd";
import type { MenuProps } from "antd";
import {
  CheckOutlined,
  CloseCircleFilled,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  FileDoneOutlined,
  FileSearchOutlined,
  FileSyncOutlined,
  FileTextOutlined,
  InboxOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
  SwapOutlined,
  CarOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  FILTERS,
  JourneyTrack,
  REASONS,
  SORTS,
  StagePill,
  count,
  formatQty,
  inr,
  isToInvoice,
  isTransfer,
  needsEway,
  reasonText,
  routeOf,
  shortDate,
} from "./shared";
import type { ChallanSummaryData } from "./types";

export interface RowActions {
  canEdit: boolean;
  canDispatch: boolean;
  canConvert: boolean;
  canDelete: boolean;
  onDispatch: (c: any) => void;
  onDeliver: (c: any) => void;
  onInvoice: (c: any) => void;
  onDownload: (c: any, valued?: boolean) => void;
  onCopyNumber: (c: any) => void;
  onEdit: (c: any) => void;
  onCancel: (c: any) => void;
  onDelete: (c: any) => void;
  onOpenQuotation?: (c: any) => void;
  onOpenInvoice?: (c: any) => void;
  busyId: number | null;
  downloadingId: number | null;
}

export const tabCount = (s: ChallanSummaryData | null, key: string): number | undefined => {
  if (!s) return undefined;
  switch (key) {
    case "": return s.total.count;
    case "DRAFT": return s.statuses.draft.count;
    case "DISPATCHED": return s.statuses.dispatched.count;
    case "DELIVERED": return s.statuses.delivered.count;
    case "TO_INVOICE": return s.to_invoice.count;
    case "INVOICED": return s.statuses.invoiced.count;
    case "CANCELLED": return s.statuses.cancelled.count;
    default: return undefined;
  }
};

/** What happens to stock when this challan is dispatched, in one sentence. */
export const stockNote = (c: any) => {
  if (Number(c?.affects_stock) !== 1 || !c?.from_warehouse_id) return "Stock isn't changed by this challan.";
  const from = c.from_warehouse_name || "the source warehouse";
  return isTransfer(c) ? `Stock moves from ${from} to ${c.to_warehouse_name || "the destination warehouse"}.` : `The goods come out of ${from}'s stock.`;
};

export const dispatchHint = (c: any) => (
  <span className="dc-confirm">
    {stockNote(c)}
    {needsEway(c) && (
      <span className="dc-confirm-warn">
        <ExclamationCircleFilled /> No e-way bill number yet — goods worth ₹50,000 or more usually need one.
      </span>
    )}
  </span>
);

// ── Toolbar ──────────────────────────────────────────────────────────────────

export const ChallanToolbar: React.FC<{
  summary: ChallanSummaryData | null;
  filter: string;
  onFilter: (key: string) => void;
  search: string;
  onSearch: (v: string) => void;
  reason: string;
  onReason: (v: string) => void;
  sort: string;
  onSort: (v: string) => void;
  loading: boolean;
  onRefresh: () => void;
}> = ({ summary, filter, onFilter, search, onSearch, reason, onReason, sort, onSort, loading, onRefresh }) => (
  <div className={`qp-toolbar${loading ? " loading" : ""}`}>
    <div className="qp-tabs" role="tablist" aria-label="Show challans">
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
          placeholder="Search challan or quotation number, customer, vehicle, e-way bill or item"
          aria-label="Search challans"
        />
        {search && (
          <button type="button" onClick={() => onSearch("")} aria-label="Clear search">
            <CloseCircleFilled />
          </button>
        )}
      </label>
      <Select
        className="qp-sort dc-reason"
        value={reason}
        onChange={onReason}
        options={[{ value: "", label: "Every reason" }, ...REASONS.map((r) => ({ value: r.key, label: r.label }))]}
        aria-label="Reason for moving the goods"
      />
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

const StatusChip: React.FC<{ c: any }> = ({ c }) => {
  if (isToInvoice(c)) {
    return (
      <span className="qp-valid warn">
        <FileSyncOutlined aria-hidden /> {c.quotation_invoice_number ? `Link to ${c.quotation_invoice_number}` : "Ready to invoice"}
      </span>
    );
  }
  if (c.status === "INVOICED" && c.invoice_number) {
    return (
      <span className="qp-valid inv" title={`Invoice ${c.invoice_number}`}>
        <FileDoneOutlined aria-hidden /> {c.invoice_number}
      </span>
    );
  }
  if (needsEway(c)) {
    return (
      <span className="qp-valid warn">
        <ExclamationCircleFilled aria-hidden /> No e-way bill
      </span>
    );
  }
  if (c.status === "DRAFT" && Number(c.affects_stock) === 1 && c.from_warehouse_id) {
    return (
      <span className="qp-valid muted">
        <InboxOutlined aria-hidden /> Moves stock
      </span>
    );
  }
  return null;
};

const Row: React.FC<{ c: any; i: number; selected: boolean; today: Dayjs; a: RowActions; onOpen: (c: any) => void }> = React.memo(({ c, i, selected, today, a, onOpen }) => {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const busy = a.busyId === c.id;
  const transfer = isTransfer(c);
  const draft = c.status === "DRAFT";
  const items = Number(c.items_count ?? c.items?.length ?? 0);

  const more: MenuProps["items"] = [
    { key: "copy", icon: <CopyOutlined />, label: "Copy challan number", onClick: () => a.onCopyNumber(c) },
    { key: "valued", icon: <DownloadOutlined />, label: "Valued copy (with rates)", onClick: () => a.onDownload(c, true) },
  ];
  if (a.onOpenQuotation && c.quotation_number) more.push({ key: "qt", icon: <FileTextOutlined />, label: `Open quotation ${c.quotation_number}`, onClick: () => a.onOpenQuotation?.(c) });
  if (a.onOpenInvoice && c.invoice_id) more.push({ key: "inv", icon: <FileDoneOutlined />, label: `Open invoice ${c.invoice_number || ""}`.trim(), onClick: () => a.onOpenInvoice?.(c) });
  const risky: MenuProps["items"] = [];
  if (draft && a.canEdit) risky.push({ key: "edit", icon: <EditOutlined />, label: "Edit draft", onClick: () => a.onEdit(c) });
  if (a.canDispatch && ["DRAFT", "DISPATCHED", "DELIVERED"].includes(c.status)) risky.push({ key: "cancel", icon: <StopOutlined />, label: "Cancel challan", danger: true, onClick: () => a.onCancel(c) });
  if (draft && a.canDelete) risky.push({ key: "del", icon: <DeleteOutlined />, label: "Delete draft", danger: true, onClick: () => a.onDelete(c) });
  if (risky.length) more.push({ type: "divider" }, ...risky);

  return (
    <div
      className={`qp-row dc-row${selected ? " selected" : ""}`}
      style={{ ["--i" as any]: i }}
      tabIndex={0}
      role="button"
      aria-label={`Open challan ${c.challan_number}${transfer ? "" : ` for ${c.customer_name || "customer"}`}`}
      onClick={() => onOpen(c)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onOpen(c);
        }
      }}
    >
      <div className="qp-c-num">
        <div className="qp-num">
          <span title={c.challan_number}>{c.challan_number}</span>
        </div>
        <div className="qp-sub">
          {shortDate(c.challan_date)} · {reasonText(c.reason)}
        </div>
      </div>

      <div className="qp-c-cust">
        {transfer ? (
          <span className="dc-wh-avatar" aria-hidden>
            <SwapOutlined />
          </span>
        ) : (
          <Avatar name={c.customer_name} seed={c.customer_id || c.customer_name} size={38} />
        )}
        <div className="qp-cust-text">
          <b title={transfer ? routeOf(c) : c.customer_name}>{transfer ? routeOf(c) : c.customer_name || "—"}</b>
          <div className="qp-sub">
            {transfer ? "Between your warehouses" : c.quotation_number ? `From ${c.quotation_number}` : c.customer_gst_number ? `GSTIN ${c.customer_gst_number}` : "Without a quotation"}
          </div>
        </div>
      </div>

      <div className="qp-c-amt">
        <b>{inr(c.total_value)}</b>
        <div className="qp-sub">
          {count(items)} item{items === 1 ? "" : "s"} · qty {formatQty(c.total_quantity)}
        </div>
      </div>

      <div className="dc-c-journey">
        <JourneyTrack c={c} today={today} />
      </div>

      <div className="qp-c-status">
        <StagePill c={c} />
        <StatusChip c={c} />
      </div>

      <div className="qp-acts" onClick={stop} onKeyDown={stop}>
        {draft && a.canDispatch && (
          <Popconfirm title={`Dispatch ${c.challan_number}?`} description={dispatchHint(c)} okText="Dispatch" onConfirm={() => a.onDispatch(c)}>
            <Tooltip title="Dispatch">
              <button type="button" className="qp-act dc-go" disabled={busy} aria-label="Dispatch">
                {busy ? <Spin size="small" /> : <SendOutlined />}
              </button>
            </Tooltip>
          </Popconfirm>
        )}
        {c.status === "DISPATCHED" && a.canDispatch && (
          <Popconfirm
            title={`Mark ${c.challan_number} as delivered?`}
            description={`Confirms the goods reached ${transfer ? c.to_warehouse_name || "the destination warehouse" : c.customer_name || "the customer"}.`}
            okText="Mark delivered"
            onConfirm={() => a.onDeliver(c)}
          >
            <Tooltip title="Mark as delivered">
              <button type="button" className="qp-act dc-deliver" disabled={busy} aria-label="Mark as delivered">
                {busy ? <Spin size="small" /> : <CheckOutlined />}
              </button>
            </Tooltip>
          </Popconfirm>
        )}
        {isToInvoice(c) && a.canConvert && (
          <Tooltip title={c.quotation_invoice_number ? `Link to invoice ${c.quotation_invoice_number}` : "Make the invoice"}>
            <button type="button" className="qp-act dc-invoice" onClick={() => a.onInvoice(c)} disabled={busy} aria-label="Invoice this challan">
              <FileDoneOutlined />
            </button>
          </Tooltip>
        )}
        <Tooltip title="Download PDF (delivery copy, no rates)">
          <button type="button" className="qp-act" onClick={() => a.onDownload(c)} disabled={a.downloadingId === c.id} aria-label="Download PDF">
            {a.downloadingId === c.id ? <Spin size="small" /> : <DownloadOutlined />}
          </button>
        </Tooltip>
        <Dropdown menu={{ items: more }} trigger={["click"]} placement="bottomRight">
          <button type="button" className="qp-act" aria-label="More actions">
            <MoreOutlined />
          </button>
        </Dropdown>
      </div>
    </div>
  );
});
Row.displayName = "ChallanRow";

// ── List ─────────────────────────────────────────────────────────────────────

export const ChallanList: React.FC<{
  rows: any[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number, size: number) => void;
  filtered: boolean;
  onClear: () => void;
  selectedId: number | null;
  onOpen: (c: any) => void;
  actions: RowActions;
  today: Dayjs;
  isMobile: boolean;
  canCreate: boolean;
  onNew: () => void;
}> = ({ rows, loading, total, page, pageSize, onPage, filtered, onClear, selectedId, onOpen, actions, today, isMobile, canCreate, onNew }) => {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  return (
    <div className={`qp-list dc-list${loading && rows.length ? " refreshing" : ""}`}>
      {rows.length > 0 && (
        <div className="qp-list-head dc-row" aria-hidden>
          <span>Challan</span>
          <span>Consignee</span>
          <span className="right">Goods</span>
          <span>Where it is</span>
          <span>Status</span>
          <span />
        </div>
      )}
      <div className="qp-rows">
        {rows.length ? (
          rows.map((c, i) => <Row key={c.id} c={c} i={i} selected={c.id === selectedId} today={today} a={actions} onOpen={onOpen} />)
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
            <b>No challans match</b>
            <span>Try another search or reason, or look at every challan.</span>
            <button type="button" className="qp-btn ghost" onClick={onClear}>
              Show all challans
            </button>
          </div>
        ) : (
          <div className="qp-empty">
            <span className="qp-empty-art">
              <CarOutlined />
            </span>
            <b>No delivery challans yet</b>
            <span>Send goods against an approved quotation — or to anyone, without one.</span>
            {canCreate && (
              <button type="button" className="qp-btn primary" onClick={onNew}>
                <PlusOutlined /> New challan
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
