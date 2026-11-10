import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker, Pagination, Popconfirm, Spin, Table, Tooltip, message } from "antd";
import {
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FilterOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAccess } from "@/permissions/useAccess";
import { challanService } from "../services/challanService";
import { deleteChallan, dispatchChallan, getChallans } from "../redux/challanActions";
import ChallanFormModal from "../components/ChallanFormModal";
import {
  CHALLAN_REASONS,
  STATUS_LABELS,
  errorMessage,
  formatDate,
  formatMoney,
  formatQty,
  quotationNumber,
  reasonLabel,
  statusStyle,
} from "../constants";
import "../styles/challan.scss";

const { RangePicker } = DatePicker;

const StatusPill = ({ status }: { status: string }) => {
  const s = statusStyle(status);
  return (
    <span className="dc-status" style={{ background: s.bg, color: s.color }}>
      <span className="dc-status-dot" style={{ background: s.color }} />
      {STATUS_LABELS[status] || status}
    </span>
  );
};

const STAT_CARDS = [
  { key: "ALL", label: "All Challans", color: "#4F46E5", icon: <FileTextOutlined /> },
  { key: "DRAFT", label: "Draft", color: "#D97706", icon: <EditOutlined /> },
  { key: "DISPATCHED", label: "In Transit", color: "#0891B2", icon: <CarOutlined /> },
  { key: "DELIVERED", label: "Delivered", color: "#059669", icon: <CheckCircleOutlined /> },
  { key: "INVOICED", label: "Invoiced", color: "#7C3AED", icon: <FileDoneOutlined /> },
  { key: "CANCELLED", label: "Cancelled", color: "#DC2626", icon: <CloseCircleOutlined /> },
];

const ChallanListPage: React.FC = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useAccess();

  const { list, pagination, statusCounts, loading, refreshing } = useSelector((state: any) => state.challans);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<string>("ALL");
  const [reason, setReason] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<any>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [fromQuotation, setFromQuotation] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pdfId, setPdfId] = useState<number | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo(() => {
    const q: any = { page, limit };
    if (search) q.search = search;
    if (status !== "ALL") q.status = status;
    if (reason) q.reason = reason;
    if (range?.[0]) q.from_date = dayjs(range[0]).format("YYYY-MM-DD");
    if (range?.[1]) q.to_date = dayjs(range[1]).format("YYYY-MM-DD");
    return q;
  }, [page, limit, search, status, reason, range]);

  const load = useCallback(() => {
    dispatch(getChallans(query))
      .unwrap()
      .catch((err: any) => message.error(errorMessage(err, "Unable to load delivery challans")));
  }, [dispatch, query]);

  useEffect(() => {
    load();
  }, [load]);

  // "Create Delivery Challan" on an approved quotation lands here with
  // ?fromQuotation=<id> — open the form straight in quotation mode.
  useEffect(() => {
    const qid = searchParams.get("fromQuotation");
    if (!qid) return;
    if (can("challans.create")) {
      setEditing(null);
      setFromQuotation(qid);
      setFormOpen(true);
    } else {
      message.warning("You do not have permission to create delivery challans");
      const next = new URLSearchParams(searchParams);
      next.delete("fromQuotation");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, can]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFromQuotation(null);
    if (searchParams.get("fromQuotation")) {
      const next = new URLSearchParams(searchParams);
      next.delete("fromQuotation");
      setSearchParams(next, { replace: true });
    }
  };

  const handleSaved = (challan: any) => {
    const wasEdit = !!editing;
    closeForm();
    if (!wasEdit && challan?.id) {
      navigate(`/app/delivery-challans/${challan.id}`);
    } else {
      load();
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFromQuotation(null);
    setFormOpen(true);
  };

  const openEdit = async (record: any) => {
    setBusyId(record.id);
    try {
      const res = await challanService.getChallan(record.id);
      setEditing(res?.data?.data || record);
      setFromQuotation(null);
      setFormOpen(true);
    } catch (err: any) {
      message.error(errorMessage(err, "Unable to load delivery challan"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDispatch = async (record: any) => {
    setBusyId(record.id);
    try {
      await dispatch(dispatchChallan(record.id)).unwrap();
      message.success(`${record.challan_number} dispatched`);
      load();
    } catch (err: any) {
      message.error(errorMessage(err, "Unable to dispatch challan"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (record: any) => {
    setBusyId(record.id);
    try {
      await dispatch(deleteChallan(record.id)).unwrap();
      message.success(`${record.challan_number} deleted`);
      load();
    } catch (err: any) {
      message.error(errorMessage(err, "Unable to delete challan"));
    } finally {
      setBusyId(null);
    }
  };

  const handlePdf = async (record: any) => {
    setPdfId(record.id);
    try {
      // jsPDF is loaded only when a PDF is actually requested.
      const { downloadChallanPDF } = await import("../pdf/challanPdf");
      await downloadChallanPDF(record, async (id: number) => {
        const res = await challanService.getChallan(id);
        return res?.data?.data;
      });
    } catch (err: any) {
      message.error(errorMessage(err, "Unable to generate challan PDF"));
    } finally {
      setPdfId(null);
    }
  };

  const countFor = (key: string): number =>
    key === "ALL"
      ? Object.values(statusCounts || {}).reduce<number>((s, n: any) => s + Number(n || 0), 0)
      : Number(statusCounts?.[key] || 0);

  const rows: any[] = list || [];
  const total = Number(pagination?.total || 0);
  const curPage = pagination?.page || page;
  const curLimit = pagination?.limit || limit;
  const goDetails = (r: any) => navigate(`/app/delivery-challans/${r.id}`);

  const RowActions = ({ r }: { r: any }) => (
    <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
      <Tooltip title="View">
        <button className="dc-btn dc-btn-soft icon" onClick={() => goDetails(r)}>
          <EyeOutlined />
        </button>
      </Tooltip>
      <Tooltip title="Download PDF (delivery copy, no rates)">
        <button className="dc-btn dc-btn-soft icon" disabled={pdfId === r.id} onClick={() => handlePdf(r)}>
          {pdfId === r.id ? <Spin size="small" /> : <DownloadOutlined />}
        </button>
      </Tooltip>
      {r.status === "DRAFT" && can("challans.edit") && (
        <Tooltip title="Edit">
          <button className="dc-btn dc-btn-soft icon" disabled={busyId === r.id} onClick={() => openEdit(r)}>
            {busyId === r.id ? <Spin size="small" /> : <EditOutlined />}
          </button>
        </Tooltip>
      )}
      {r.status === "DRAFT" && can("challans.dispatch") && (
        <Popconfirm
          title="Dispatch this challan?"
          description={Number(r.affects_stock) && r.from_warehouse_id ? "Stock will be deducted from the source warehouse." : undefined}
          okText="Dispatch"
          onConfirm={() => handleDispatch(r)}
        >
          <button className="dc-btn dc-btn-soft go sm" disabled={busyId === r.id}>
            <SendOutlined /> Dispatch
          </button>
        </Popconfirm>
      )}
      {r.status === "DRAFT" && can("challans.delete") && (
        <Popconfirm
          title="Delete this draft challan?"
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDelete(r)}
        >
          <Tooltip title="Delete">
            <button className="dc-btn dc-btn-soft danger icon" disabled={busyId === r.id}>
              <DeleteOutlined />
            </button>
          </Tooltip>
        </Popconfirm>
      )}
    </div>
  );

  const columns = [
    {
      title: "Challan",
      dataIndex: "challan_number",
      render: (v: string, r: any) => {
        const s = statusStyle(r.status);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="dc-avatar" style={{ background: s.bg, color: s.color }}>
              {r.reason === "STOCK_TRANSFER" ? <SwapOutlined /> : <CarOutlined />}
            </div>
            <div>
              <div className="dc-link">{v}</div>
              <div className="dc-sub">{formatDate(r.challan_date)}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Consignee",
      dataIndex: "customer_name",
      render: (v: string, r: any) =>
        r.reason === "STOCK_TRANSFER" ? (
          <div>
            <div style={{ fontWeight: 600 }}>Own warehouse</div>
            <div className="dc-sub">Stock transfer</div>
          </div>
        ) : (
          <div>
            <div style={{ fontWeight: 600 }}>{v || "—"}</div>
            {r.customer_gst_number && <div className="dc-sub">GST: {r.customer_gst_number}</div>}
          </div>
        ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      render: (v: string) => <span className="dc-reason">{reasonLabel(v)}</span>,
    },
    {
      title: "Quotation",
      key: "quotation",
      render: (_: any, r: any) => (
        <span style={{ fontSize: 12, color: "var(--dc-muted)", fontFamily: "Courier New, monospace" }}>
          {quotationNumber(r) || "—"}
        </span>
      ),
    },
    {
      title: "Qty",
      dataIndex: "total_quantity",
      align: "right" as const,
      width: 80,
      render: (v: any) => <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatQty(v)}</span>,
    },
    {
      title: "Value",
      dataIndex: "total_value",
      align: "right" as const,
      width: 130,
      render: (v: any) => (
        <div style={{ textAlign: "right" }}>
          <div className="dc-money">{formatMoney(v)}</div>
          <div className="dc-sub">reference only</div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 130,
      render: (v: string) => <StatusPill status={v} />,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right" as const,
      width: 210,
      render: (_: any, r: any) => <RowActions r={r} />,
    },
  ];

  const empty = (
    <div className="dc-empty">
      <div className="dc-empty-icon"><InboxOutlined /></div>
      <div className="dc-empty-text">No delivery challans found</div>
      <div className="dc-empty-sub">
        {search || reason || range || status !== "ALL"
          ? "Try adjusting your search or filters"
          : "Create one from an approved quotation, or start a standalone challan"}
      </div>
    </div>
  );

  return (
    <div className="dc-root">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="dc-hero">
        <div className="dc-hero-noise" />
        <div className="dc-hero-inner">
          <div className="dc-hero-row">
            <div>
              <div className="dc-page-title">
                <div className="dc-page-title-icon"><CarOutlined /></div>
                Delivery Challans
              </div>
              <div className="dc-page-subtitle">
                Move goods before or without a tax invoice — part deliveries, job work, stock transfers and approvals.
              </div>
            </div>
            {can("challans.create") && (
              <div className="dc-hero-actions">
                <button className="dc-hero-btn" onClick={openCreate}>
                  <PlusOutlined />
                  <span>New Challan</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status cards (click to filter) ──────────────────────────────── */}
      <div className="dc-stats-wrap">
        <div className="dc-stats">
          {STAT_CARDS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`dc-stat-card${status === c.key ? " active" : ""}`}
              style={{ borderLeftColor: c.color, ["--dc-stat-color" as any]: c.color }}
              onClick={() => {
                setStatus(c.key);
                setPage(1);
              }}
            >
              <div className="dc-stat-label">
                <span style={{ color: c.color }}>{c.icon}</span>
                {c.label}
              </div>
              <div className="dc-stat-value" style={{ color: c.color }}>{countFor(c.key)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="dc-toolbar">
        <div className="dc-toolbar-inner">
          <div className="dc-search-wrap">
            <SearchOutlined className="dc-search-icon" />
            <input
              className="dc-input"
              placeholder="Search challan no., customer, vehicle…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="dc-select-wrap">
            <FilterOutlined className="dc-search-icon" style={{ fontSize: 13, zIndex: 1 }} />
            <select
              className="dc-input dc-select"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All reasons</option>
              {CHALLAN_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <RangePicker
            className="dc-range"
            value={range}
            format="DD MMM YYYY"
            onChange={(v) => {
              setRange(v);
              setPage(1);
            }}
          />

          {total > 0 && (
            <span className="dc-toolbar-count">
              {total} challan{total !== 1 ? "s" : ""}
            </span>
          )}

          <button className="dc-icon-btn" onClick={load} disabled={loading || refreshing}>
            <ReloadOutlined spin={loading || refreshing} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="dc-body">
        <div className="dc-card">
          <div className="dc-card-header">
            <div className="dc-card-icon"><CarOutlined /></div>
            <span className="dc-card-title">
              {status === "ALL" ? "All Challans" : STAT_CARDS.find((c) => c.key === status)?.label}
            </span>
            {rows.length > 0 && <span className="dc-badge">{rows.length} shown</span>}
          </div>

          <div className="dc-table-wrap">
            <Table
              rowKey="id"
              loading={loading}
              dataSource={rows}
              columns={columns}
              pagination={false}
              scroll={{ x: "max-content" }}
              locale={{ emptyText: empty }}
              onRow={(r: any) => ({ onClick: () => goDetails(r) })}
            />
          </div>

          {/* Mobile cards */}
          <div className="dc-mobile-list">
            {loading ? (
              <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
            ) : rows.length === 0 ? (
              empty
            ) : (
              rows.map((r: any) => (
                <div key={r.id} className="dc-mobile-card" onClick={() => goDetails(r)}>
                  <div className="dc-mobile-top">
                    <div>
                      <div className="dc-link" style={{ fontSize: 15 }}>{r.challan_number}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                        {r.reason === "STOCK_TRANSFER" ? "Stock transfer" : r.customer_name || "—"}
                      </div>
                      <div className="dc-sub">{reasonLabel(r.reason)}{quotationNumber(r) ? ` · ${quotationNumber(r)}` : ""}</div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                  <div className="dc-mobile-figs">
                    <div>
                      <div className="dc-mobile-label">Date</div>
                      <div className="dc-mobile-val" style={{ fontSize: 13 }}>{formatDate(r.challan_date)}</div>
                    </div>
                    <div>
                      <div className="dc-mobile-label">Qty</div>
                      <div className="dc-mobile-val">{formatQty(r.total_quantity)}</div>
                    </div>
                    <div>
                      <div className="dc-mobile-label">Value</div>
                      <div className="dc-mobile-val" style={{ color: "#4F46E5" }}>{formatMoney(r.total_value)}</div>
                    </div>
                  </div>
                  <div className="dc-mobile-footer">
                    <RowActions r={r} />
                  </div>
                </div>
              ))
            )}
          </div>

          {total > 0 && (
            <div className="dc-pagination-row">
              <span className="dc-pagination-info">
                {(curPage - 1) * curLimit + 1}–{Math.min(curPage * curLimit, total)} of {total}
              </span>
              <Pagination
                current={curPage}
                pageSize={curLimit}
                total={total}
                showSizeChanger
                pageSizeOptions={[10, 20, 50, 100]}
                onChange={(p, s) => {
                  setPage(s !== limit ? 1 : p);
                  setLimit(s);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <ChallanFormModal
        open={formOpen}
        challan={editing}
        quotationId={fromQuotation}
        onClose={closeForm}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default ChallanListPage;
