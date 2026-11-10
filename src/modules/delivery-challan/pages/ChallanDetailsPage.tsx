import React, { useCallback, useEffect, useState } from "react";
import { Alert, DatePicker, Dropdown, Form, Input, Modal, Popconfirm, Result, Spin, Tooltip, Typography, message } from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  DownloadOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  NumberOutlined,
  PlusCircleOutlined,
  SendOutlined,
  ShopOutlined,
  SwapOutlined,
  SyncOutlined,
  TagOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useAccess } from "@/permissions/useAccess";
import {
  cancelChallan,
  convertChallanToInvoice,
  deleteChallan,
  deliverChallan,
  dispatchChallan,
  getChallanActivity,
  getChallanDetails,
} from "../redux/challanActions";
import { clearChallanDetails } from "../redux/challanSlice";
import ChallanFormModal from "../components/ChallanFormModal";
import {
  STATUS_LABELS,
  addressLines,
  changedByName,
  companyAddressLines,
  companyGstin,
  MISSING_CONSIGNOR_GSTIN,
  errorMessage,
  formatDate,
  formatDateTime,
  formatMoney,
  formatQty,
  fromWarehouseName,
  invoiceNumber,
  loadCompanyDetails,
  loadWarehouseMap,
  parseJson,
  quotationNumber,
  reasonLabel,
  statusStyle,
  toWarehouseName,
  warehouseAddressLines,
} from "../constants";
import "../styles/challan.scss";

const { Text } = Typography;

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  CREATED: { label: "Challan Created", color: "#4F46E5", bg: "#EEF2FF", icon: <PlusCircleOutlined /> },
  UPDATED: { label: "Challan Updated", color: "#6B7280", bg: "#F3F4F6", icon: <EditOutlined /> },
  DISPATCHED: { label: "Dispatched", color: "#0891B2", bg: "#ECFEFF", icon: <SendOutlined /> },
  DELIVERED: { label: "Delivered", color: "#059669", bg: "#ECFDF5", icon: <CheckCircleOutlined /> },
  INVOICED: { label: "Invoiced", color: "#7C3AED", bg: "#F5F3FF", icon: <FileDoneOutlined /> },
  CANCELLED: { label: "Cancelled", color: "#DC2626", bg: "#FEF2F2", icon: <CloseCircleOutlined /> },
  DELETED: { label: "Deleted", color: "#DC2626", bg: "#FEF2F2", icon: <DeleteOutlined /> },
};

const LIFECYCLE = [
  { key: "DRAFT", label: "Draft", icon: <EditOutlined />, at: (c: any) => c.created_at },
  { key: "DISPATCHED", label: "Dispatched", icon: <CarOutlined />, at: (c: any) => c.dispatched_at },
  { key: "DELIVERED", label: "Delivered", icon: <CheckCircleOutlined />, at: (c: any) => c.delivered_at },
  { key: "INVOICED", label: "Invoiced", icon: <FileDoneOutlined />, at: () => null },
];

const InfoRow = ({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: any; mono?: boolean }) => (
  <div className="dc-info-row">
    <span className="dc-info-label">{icon}{label}</span>
    <span className={`dc-info-value${mono && value ? " dc-mono" : ""}`}>{value || "—"}</span>
  </div>
);

const ChallanDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();
  const { can } = useAccess();
  const { details: challan, detailsLoading, detailsError, activity, actionLoading } = useSelector(
    (state: any) => state.challans,
  );

  const [company, setCompany] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [cancelForm] = Form.useForm();
  const [convertForm] = Form.useForm();

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await dispatch(getChallanDetails(id)).unwrap();
      const hasActivity = !!(data?.activity || data?.activity_logs || data?.activities);
      if (!hasActivity) dispatch(getChallanActivity(id));
    } catch {
      // detailsError renders the not-found state
    }
  }, [dispatch, id]);

  useEffect(() => {
    load();
    return () => {
      dispatch(clearChallanDetails());
    };
  }, [load, dispatch]);

  useEffect(() => {
    loadCompanyDetails().then(setCompany);
  }, []);

  const [warehouseMap, setWarehouseMap] = useState<Record<string, any>>({});
  const transferChallan = challan?.reason === "STOCK_TRANSFER";
  useEffect(() => {
    if (transferChallan) loadWarehouseMap().then(setWarehouseMap);
  }, [transferChallan]);

  const runAction = async (thunk: any, successMsg: string) => {
    try {
      await dispatch(thunk).unwrap();
      message.success(successMsg);
      await load();
      return true;
    } catch (err: any) {
      message.error(errorMessage(err));
      return false;
    }
  };

  const handleCancel = async () => {
    const { reason } = cancelForm.getFieldsValue();
    const ok = await runAction(cancelChallan({ id: id as string, reason: reason?.trim() || undefined }), "Challan cancelled");
    if (ok) {
      setCancelOpen(false);
      cancelForm.resetFields();
    }
  };

  const handleConvert = async () => {
    let payment_due_date: any;
    try {
      ({ payment_due_date } = await convertForm.validateFields());
    } catch {
      return;
    }
    const ok = await runAction(
      convertChallanToInvoice({ id: id as string, payment_due_date: dayjs(payment_due_date).format("YYYY-MM-DD") }),
      "Invoice linked to this challan",
    );
    if (ok) {
      setConvertOpen(false);
      convertForm.resetFields();
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteChallan(id as string)).unwrap();
      message.success("Draft challan deleted");
      navigate("/app/delivery-challans");
    } catch (err: any) {
      message.error(errorMessage(err));
    }
  };

  const handlePdf = async (showValues = false) => {
    setPdfLoading(true);
    try {
      const { downloadChallanPDF } = await import("../pdf/challanPdf");
      await downloadChallanPDF(challan, undefined, { showValues });
    } catch (err: any) {
      message.error(errorMessage(err, "Unable to generate challan PDF"));
    } finally {
      setPdfLoading(false);
    }
  };

  const loadingView = (
    <div className="dc-root">
      <div className="dc-loading"><Spin size="large" /><span>Loading delivery challan…</span></div>
    </div>
  );

  if (detailsLoading && !challan) return loadingView;

  if (!challan || String(challan.id) !== String(id)) {
    if (detailsError) {
      return (
        <div className="dc-root">
          <Result
            status="404"
            title="Delivery challan not found"
            subTitle={typeof detailsError === "string" ? detailsError : undefined}
            extra={
              <button className="dc-btn dc-btn-primary" onClick={() => navigate("/app/delivery-challans")}>
                <ArrowLeftOutlined /> Back to challans
              </button>
            }
          />
        </div>
      );
    }
    return loadingView;
  }

  const status: string = challan.status;
  const sStyle = statusStyle(status);
  const isTransfer = challan.reason === "STOCK_TRANSFER";
  const billing = parseJson(challan.billing_address_snapshot);
  const shipping = parseJson(challan.shipping_address_snapshot);
  const items: any[] = challan.items || [];
  const fromWh = fromWarehouseName(challan);
  const toWh = toWarehouseName(challan);
  const qNum = quotationNumber(challan);
  const invNum = invoiceNumber(challan);
  const stockTracked = !!Number(challan.affects_stock ?? 1);
  const gstin = companyGstin(company);

  const canEdit = status === "DRAFT" && can("challans.edit");
  const canDispatch = status === "DRAFT" && can("challans.dispatch");
  const canDeliver = status === "DISPATCHED" && can("challans.dispatch");
  const canCancel = ["DRAFT", "DISPATCHED", "DELIVERED"].includes(status) && can("challans.dispatch");
  const canConvert = !!challan.quotation_id && ["DISPATCHED", "DELIVERED"].includes(status) && can("challans.convert");
  const canDelete = status === "DRAFT" && can("challans.delete");

  // Lifecycle progress (cancelled shows where it stopped)
  const order = LIFECYCLE.map((s) => s.key);
  const reachedIdx =
    status === "CANCELLED"
      ? challan.delivered_at ? 2 : challan.dispatched_at ? 1 : 0
      : Math.max(0, order.indexOf(status));

  const timeline: any[] = activity || [];

  return (
    <div className="dc-root">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="dc-hero">
        <div className="dc-hero-gradient" />
        <div className="dc-hero-noise" />
        <div className="dc-hero-orb one" />
        <div className="dc-hero-orb two" />

        <div className="dc-hero-inner details">
          <button className="dc-back-btn" onClick={() => navigate("/app/delivery-challans")}>
            <ArrowLeftOutlined style={{ fontSize: 12 }} /> All Delivery Challans
          </button>

          <div className="dc-hero-row">
            <div>
              <div className="dc-eyebrow">Delivery Challan</div>
              <div className="dc-doc-number">{challan.challan_number}</div>
              <div className="dc-meta">
                <div className="dc-meta-line">
                  {isTransfer ? <SwapOutlined style={{ fontSize: 11 }} /> : <UserOutlined style={{ fontSize: 11 }} />}
                  <strong>{isTransfer ? `${fromWh || "Warehouse"} → ${toWh || "Warehouse"}` : challan.customer_name || "—"}</strong>
                  {!isTransfer && challan.customer_gst_number && (
                    <span style={{ fontSize: 11, opacity: 0.7 }}>· GST: {challan.customer_gst_number}</span>
                  )}
                </div>
                <div className="dc-meta-line">
                  <CalendarOutlined style={{ fontSize: 11 }} />
                  Date: <strong>{formatDate(challan.challan_date)}</strong>
                </div>
                {(qNum || challan.invoice_id) && (
                  <div className="dc-meta-line">
                    <FileTextOutlined style={{ fontSize: 11 }} />
                    {qNum && <>Quotation: <strong>{qNum}</strong></>}
                    {qNum && challan.invoice_id && <span style={{ opacity: 0.5 }}>·</span>}
                    {challan.invoice_id && (
                      <>
                        Invoice:{" "}
                        <a onClick={() => navigate(`/app/invoice-details/${challan.invoice_id}`)}>
                          {invNum || `#${challan.invoice_id}`}
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="dc-hero-pills">
                <span className="dc-status lg" style={{ background: sStyle.bg, color: sStyle.color }}>
                  <span className="dc-status-dot" style={{ background: sStyle.color }} />
                  {STATUS_LABELS[status] || status}
                </span>
                <span className="dc-hero-chip"><TagOutlined /> {reasonLabel(challan.reason)}</span>
                {stockTracked && <span className="dc-hero-chip"><HomeOutlined /> Updates stock</span>}
              </div>
            </div>

            <div className="dc-hero-figures">
              <div className="dc-fig-row">
                <div className="dc-fig-card">
                  <div className="dc-fig-label">Total Qty</div>
                  <div className="dc-fig-value">{formatQty(challan.total_quantity)}</div>
                  <div className="dc-fig-note">{items.length} line item{items.length !== 1 ? "s" : ""}</div>
                </div>
                <div className="dc-fig-card">
                  <div className="dc-fig-label">Goods Value</div>
                  <div className="dc-fig-value sm success">{formatMoney(challan.total_value)}</div>
                  <div className="dc-fig-note">reference · no GST</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────── */}
      {/* Locked while a (possibly cached) copy is being refreshed, so Edit,
          Dispatch, PDF etc. always act on the latest server data. */}
      <div
        className={`dc-actions${detailsLoading ? " is-refreshing" : ""}`}
        inert={detailsLoading || undefined}
        aria-busy={detailsLoading}
      >
        {detailsLoading && (
          <span className="dc-refreshing"><Spin size="small" /> Refreshing…</span>
        )}
        {canDispatch && (
          <Popconfirm
            title="Dispatch this challan?"
            description={
              stockTracked && challan.from_warehouse_id
                ? isTransfer
                  ? "Stock moves from the source to the destination warehouse."
                  : "Stock will be deducted from the source warehouse."
                : "Inventory will not be changed."
            }
            okText="Dispatch"
            onConfirm={() => runAction(dispatchChallan(id as string), "Challan dispatched")}
          >
            <button className="dc-btn dc-btn-primary" disabled={actionLoading}>
              {actionLoading ? <Spin size="small" /> : <SendOutlined />} Dispatch
            </button>
          </Popconfirm>
        )}
        {canDeliver && (
          <Popconfirm
            title="Mark goods as delivered?"
            okText="Mark delivered"
            onConfirm={() => runAction(deliverChallan(id as string), "Marked as delivered")}
          >
            <button className="dc-btn dc-btn-success" disabled={actionLoading}>
              {actionLoading ? <Spin size="small" /> : <CheckCircleOutlined />} Mark Delivered
            </button>
          </Popconfirm>
        )}
        {canConvert && (
          <button className="dc-btn dc-btn-purple" onClick={() => setConvertOpen(true)}>
            <FileDoneOutlined /> Convert to Invoice
          </button>
        )}
        <div className="dc-split">
          <Tooltip title="Delivery copy: item, HSN, qty and unit only (no rates)">
            <button className="dc-btn dc-btn-ghost" onClick={() => handlePdf(false)} disabled={pdfLoading}>
              {pdfLoading ? <Spin size="small" /> : <DownloadOutlined />} Download PDF
            </button>
          </Tooltip>
          <Dropdown
            trigger={["click"]}
            disabled={pdfLoading}
            menu={{
              items: [
                { key: "plain", icon: <DownloadOutlined />, label: "Delivery copy (no rates)" },
                { key: "valued", icon: <DownloadOutlined />, label: "Valued copy (with rates & values)" },
              ],
              onClick: ({ key }) => handlePdf(key === "valued"),
            }}
          >
            <button className="dc-btn dc-btn-ghost dc-split-caret" disabled={pdfLoading} aria-label="More PDF options">
              <DownOutlined style={{ fontSize: 10 }} />
            </button>
          </Dropdown>
        </div>
        {canEdit && (
          <button className="dc-btn dc-btn-ghost" onClick={() => setEditOpen(true)}>
            <EditOutlined /> Edit
          </button>
        )}
        {canCancel && (
          <button className="dc-btn dc-btn-danger" onClick={() => setCancelOpen(true)}>
            <CloseCircleOutlined /> Cancel Challan
          </button>
        )}
        {canDelete && (
          <Popconfirm title="Delete this draft challan?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={handleDelete}>
            <button className="dc-btn dc-btn-danger">
              <DeleteOutlined /> Delete
            </button>
          </Popconfirm>
        )}
      </div>

      {status === "CANCELLED" && (
        <div className="dc-banner danger">
          <CloseCircleOutlined className="dc-banner-icon" />
          <div>
            <strong>Cancelled{challan.cancelled_at ? ` on ${formatDateTime(challan.cancelled_at)}` : ""}</strong>
            {stockTracked && challan.dispatched_at && <div>Any stock movement from dispatch has been reversed.</div>}
          </div>
        </div>
      )}
      {!challan.quotation_id && ["DISPATCHED", "DELIVERED"].includes(status) && (
        <div className="dc-banner info">
          <InfoCircleOutlined className="dc-banner-icon" />
          <div>Standalone challans (job work, transfers, approvals) are not converted to invoices.</div>
        </div>
      )}

      <div className="dc-body">
        {/* ── Lifecycle ─────────────────────────────────────────────────── */}
        <div className="dc-card" style={{ marginBottom: 12 }}>
          <div className="dc-steps">
            {LIFECYCLE.map((step, i) => {
              const cancelledHere = status === "CANCELLED" && i === reachedIdx;
              const state = cancelledHere
                ? "cancelled"
                : i < reachedIdx || (i === reachedIdx && status === "INVOICED")
                  ? "done"
                  : i === reachedIdx
                    ? "current"
                    : "";
              const at = step.at(challan);
              return (
                <div key={step.key} className={`dc-step ${state}`}>
                  <div className="dc-step-dot">{cancelledHere ? <CloseCircleOutlined /> : step.icon}</div>
                  <div className="dc-step-label">{cancelledHere ? `${step.label} · Cancelled` : step.label}</div>
                  <div className="dc-step-time">{i <= reachedIdx && at ? formatDateTime(at) : " "}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Parties ───────────────────────────────────────────────────── */}
        <div className="dc-grid-2">
          <div className="dc-card">
            <div className="dc-card-header">
              <div className="dc-card-icon" style={{ background: "#FFF7ED", color: "#D97706" }}><ShopOutlined /></div>
              <span className="dc-card-title">Consignor</span>
              <span className="dc-badge" style={{ background: "#FFF7ED", color: "#D97706" }}>From</span>
            </div>
            <div className="dc-card-body">
              <div className="dc-party-name">{company?.name || "—"}</div>
              {companyAddressLines(company).map((l) => (
                <div key={l} className="dc-party-line">{l}</div>
              ))}
              {gstin && <span className="dc-party-tag dc-mono">GSTIN: {gstin}</span>}
              {!gstin && company && (
                <div className="dc-warn-note"><WarningOutlined /> {MISSING_CONSIGNOR_GSTIN}</div>
              )}
              {fromWh && (
                <>
                  <div className="dc-party-sub">Dispatch from</div>
                  <div className="dc-party-line"><HomeOutlined style={{ marginRight: 6, color: "var(--dc-muted)" }} />{fromWh}</div>
                </>
              )}
            </div>
          </div>

          <div className="dc-card">
            <div className="dc-card-header">
              <div className="dc-card-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
                {isTransfer ? <HomeOutlined /> : <UserOutlined />}
              </div>
              <span className="dc-card-title">{isTransfer ? "Destination" : "Consignee"}</span>
              <span className="dc-badge" style={{ background: "#ECFDF5", color: "#059669" }}>To</span>
            </div>
            <div className="dc-card-body">
              {isTransfer ? (
                <>
                  <div className="dc-party-name">{toWh || "—"}</div>
                  {warehouseAddressLines(warehouseMap[String(challan.to_warehouse_id)]).map((l) => (
                    <div key={`w-${l}`} className="dc-party-line">{l}</div>
                  ))}
                  <div className="dc-party-line" style={{ color: "var(--dc-muted)", marginTop: 6 }}>
                    Stock transfer between own warehouses
                  </div>
                </>
              ) : (
                <>
                  <div className="dc-party-name">{challan.customer_name || "—"}</div>
                  {addressLines(billing).map((l) => (
                    <div key={`b-${l}`} className="dc-party-line">{l}</div>
                  ))}
                  <span className="dc-party-tag dc-mono">
                    GSTIN: {challan.customer_gst_number || billing?.gst_number || "Unregistered"}
                  </span>
                  {addressLines(shipping).length > 0 && (
                    <>
                      <div className="dc-party-sub"><EnvironmentOutlined /> Ship to</div>
                      {addressLines(shipping).map((l) => (
                        <div key={`s-${l}`} className="dc-party-line">{l}</div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="dc-grid-main">
          {/* ── Left: items + notes ─────────────────────────────────────── */}
          <div className="dc-stack">
            <div className="dc-card">
              <div className="dc-card-header">
                <div className="dc-card-icon"><FileTextOutlined /></div>
                <span className="dc-card-title">Goods Dispatched</span>
                <span className="dc-badge">{items.length} item{items.length !== 1 ? "s" : ""}</span>
              </div>
              {items.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="dc-items-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>#</th>
                        <th>Item / Description</th>
                        <th>HSN</th>
                        <th className="num">Qty</th>
                        <th className="num">Rate</th>
                        <th className="num">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r: any, i: number) => (
                        <tr key={r.id ?? `${r.item_name}-${i}`}>
                          <td style={{ color: "var(--dc-muted)", fontSize: 12 }}>{i + 1}</td>
                          <td>
                            <div className="dc-item-name">{r.item_name}</div>
                            {r.description && r.description !== r.item_name && <div className="dc-item-desc">{r.description}</div>}
                          </td>
                          <td>{r.hsn_code ? <span className="dc-mono" style={{ fontSize: 11 }}>{r.hsn_code}</span> : "—"}</td>
                          <td className="num" style={{ fontWeight: 600 }}>
                            {formatQty(r.quantity)}
                            {r.unit && <span style={{ fontSize: 11, color: "var(--dc-muted)", marginLeft: 3 }}>{r.unit}</span>}
                          </td>
                          <td className="num" style={{ color: "var(--dc-muted)" }}>{formatMoney(r.rate)}</td>
                          <td className="num">
                            <span className="dc-item-value">
                              {formatMoney(r.value ?? Number(r.quantity || 0) * Number(r.rate || 0))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>Total</td>
                        <td className="num">{formatQty(challan.total_quantity)}</td>
                        <td />
                        <td className="num" style={{ color: "#4F46E5" }}>{formatMoney(challan.total_value)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="dc-empty" style={{ padding: 32 }}>
                  <div className="dc-empty-icon"><FileTextOutlined /></div>
                  <div className="dc-empty-text">No items on this challan</div>
                </div>
              )}
              <div className="dc-footnote">
                <InfoCircleOutlined /> Not a tax invoice. Values are for reference only, and no GST is charged on a delivery challan.
              </div>
            </div>

            {challan.notes && (
              <div className="dc-card">
                <div className="dc-card-header">
                  <div className="dc-card-icon" style={{ background: "#F5F3FF", color: "#7C3AED" }}><FileTextOutlined /></div>
                  <span className="dc-card-title">Notes</span>
                </div>
                <div className="dc-card-body">
                  <p className="dc-notes">{challan.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: transport + activity ─────────────────────────────── */}
          <div className="dc-stack">
            <div className="dc-card">
              <div className="dc-card-header">
                <div className="dc-card-icon" style={{ background: "#ECFEFF", color: "#0891B2" }}><CarOutlined /></div>
                <span className="dc-card-title">Transport Details</span>
              </div>
              <InfoRow icon={<EnvironmentOutlined />} label="Place of supply" value={challan.place_of_supply} />
              <InfoRow icon={<CarOutlined />} label="Transporter" value={challan.transporter_name} />
              <InfoRow icon={<NumberOutlined />} label="Vehicle no." value={challan.vehicle_number} mono />
              <InfoRow icon={<FileTextOutlined />} label="E-way bill" value={challan.eway_bill_number} mono />
              <InfoRow icon={<HomeOutlined />} label="From warehouse" value={fromWh} />
              {isTransfer && <InfoRow icon={<HomeOutlined />} label="To warehouse" value={toWh} />}
              <InfoRow icon={<SyncOutlined />} label="Updates stock" value={stockTracked ? "Yes" : "No"} />
            </div>

            <div className="dc-card">
              <div className="dc-card-header">
                <div className="dc-card-icon" style={{ background: "#F5F3FF", color: "#7C3AED" }}><ClockCircleOutlined /></div>
                <span className="dc-card-title">Activity</span>
                {timeline.length > 0 && (
                  <span className="dc-badge" style={{ background: "#F5F3FF", color: "#7C3AED" }}>
                    {timeline.length} event{timeline.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="dc-card-body">
                {timeline.length ? (
                  timeline.map((log: any, i: number) => {
                    const cfg = ACTION_CONFIG[log.action] || {
                      label: STATUS_LABELS[log.action] || log.action?.replace(/_/g, " ") || "Event",
                      color: "#6B7280",
                      bg: "#F3F4F6",
                      icon: <SyncOutlined />,
                    };
                    const newVal = parseJson(log.new_value);
                    const note = newVal?.reason || newVal?.cancel_reason || newVal?.invoice_number;
                    const by = changedByName(log);
                    return (
                      <div key={log.id ?? i} className="dc-tl-item">
                        <div className="dc-tl-icon" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="dc-tl-title">{cfg.label}</div>
                          {note && log.action !== "CREATED" && <div className="dc-tl-detail">{String(note)}</div>}
                          <div className="dc-tl-meta">
                            {by || "System"} · {formatDateTime(log.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="dc-empty" style={{ padding: 16 }}>
                    <div className="dc-empty-icon" style={{ fontSize: 24 }}><ClockCircleOutlined /></div>
                    <div className="dc-empty-sub">No activity recorded yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChallanFormModal
        open={editOpen}
        challan={challan}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          load();
        }}
      />

      <Modal
        title={`Cancel ${challan.challan_number}?`}
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onOk={handleCancel}
        okText="Cancel Challan"
        okButtonProps={{ danger: true, loading: actionLoading }}
        cancelText="Keep"
        destroyOnHidden
      >
        {status !== "DRAFT" && stockTracked && challan.from_warehouse_id && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            title="Stock moved on dispatch will be returned to the warehouse."
          />
        )}
        <Form form={cancelForm} layout="vertical">
          <Form.Item name="reason" label="Reason (optional)">
            <Input.TextArea rows={3} maxLength={500} placeholder="Why is this challan being cancelled?" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Convert to Invoice"
        open={convertOpen}
        onCancel={() => setConvertOpen(false)}
        onOk={handleConvert}
        okText="Convert"
        okButtonProps={{ loading: actionLoading }}
        destroyOnHidden
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          If quotation {qNum || ""} already has an invoice, it is linked. Otherwise a new tax invoice is generated
          from the quotation. Every dispatched or delivered challan for this quotation is then marked Invoiced.
        </Text>
        <Form form={convertForm} layout="vertical" initialValues={{ payment_due_date: dayjs().add(30, "day") }}>
          <Form.Item
            name="payment_due_date"
            label="Payment Due Date"
            rules={[{ required: true, message: "Select the payment due date" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ChallanDetailsPage;
