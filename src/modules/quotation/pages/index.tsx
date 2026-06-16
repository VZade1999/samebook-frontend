import React, { useEffect, useMemo, useState, useRef } from "react";
import dayjs from "dayjs";
import {
  Button, Card, Divider, Drawer, Form, notification, Pagination, Row, Col,
  Space, Table, Tag, Tabs, Empty, Popconfirm, Input, Typography, Grid,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined,
  CloseCircleOutlined, DownloadOutlined, UserOutlined, MailOutlined,
  PhoneOutlined, BankOutlined, EnvironmentOutlined, ClockCircleOutlined,
  FileTextOutlined, ShopOutlined, NumberOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
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

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrencyHelper = (value: any) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toFixed(2)}` : `₹0.00`;
};

const joinAddr = (snap: any) =>
  [snap?.address_line_1, snap?.address_line_2, snap?.city, snap?.state, snap?.country, snap?.postal_code]
    .filter(Boolean).join(", ");

const getStatusColor = (status?: string) => {
  if (!status) return "default";
  switch (status.toLowerCase()) {
    case "sent": return "green";
    case "draft": return "default";
    case "expired": return "red";
    case "approved": return "blue";
    case "rejected": return "volcano";
    case "paid": return "cyan";
    case "partial":
    case "partially_paid":
    case "partially-paid": return "gold";
    default: return "purple";
  }
};

const parseJsonField = (raw: any) => {
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return undefined; } }
  return raw;
};

const getValidityDate = (validityDate: string | undefined) => {
  if (!validityDate) return undefined;
  const date = new Date(validityDate);
  return Number.isNaN(date.getTime()) ? undefined : dayjs(date);
};

// ─── Drawer sub-components ────────────────────────────────────────────────────

const DrawerInfoRow: React.FC<{
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div style={drawerStyles.infoRow}>
    <span style={drawerStyles.infoLabel}>
      {icon && <span style={{ marginRight: 5, opacity: 0.5 }}>{icon}</span>}
      {label}
    </span>
    <span style={drawerStyles.infoValue}>{value ?? "—"}</span>
  </div>
);

const DrawerSection: React.FC<{ title: string; children: React.ReactNode; noPad?: boolean }> = ({ title, children, noPad }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={drawerStyles.sectionLabel}>{title}</div>
    <div style={noPad ? {} : drawerStyles.sectionCard}>{children}</div>
  </div>
);

const SummaryLine: React.FC<{
  label: string;
  pct?: string;
  value: string;
  isTotal?: boolean;
}> = ({ label, pct, value, isTotal }) => (
  <div style={{
    ...drawerStyles.summaryRow,
    ...(isTotal ? drawerStyles.summaryTotalRow : {}),
  }}>
    <span style={{ fontSize: isTotal ? 14 : 13, fontWeight: isTotal ? 700 : 400, color: isTotal ? "#1a1a2e" : "#555" }}>
      {label}
    </span>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {pct && <span style={drawerStyles.summaryPct}>{pct}</span>}
      <span style={{ fontSize: isTotal ? 16 : 13, fontWeight: isTotal ? 700 : 500, color: isTotal ? "#0958d9" : "#1a1a2e", minWidth: 90, textAlign: "right" }}>
        {value}
      </span>
    </div>
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

  const detailsItemsColumns = [
    { title: "Item", dataIndex: "product_name", key: "product_name", render: (_: any, r: any) => r.product_name || r.itemName || r.description },
    { title: "HSN", dataIndex: "hsn_code", key: "hsn_code", render: (v: any) => v || "—" },
    { title: "Qty", dataIndex: "qty", key: "qty", width: 60, render: (_: any, r: any) => r.qty || r.quantity || 0 },
    { title: "Rate", dataIndex: "rate", key: "rate", width: 90, render: (v: any) => formatCurrencyHelper(v) },
    { title: "Disc%", dataIndex: "discount_percent", key: "discount_percent", width: 70, render: (v: any) => v ? `${v}%` : "—" },
    { title: "Amount", dataIndex: "amount", key: "amount", width: 100, render: (_: any, r: any) => formatCurrencyHelper(r.amount || r.total || 0) },
  ];

  return (
    <div style={{ paddingTop: 12 }}>

      {/* ── Header card ── */}
      <div style={drawerStyles.heroCard}>
        <div style={{ flex: 1 }}>
          <div style={drawerStyles.heroQuotNum}>#{q.quotation_number}</div>
          <div style={drawerStyles.heroSub}>Version {q.version_number ?? 1}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <Tag color={getStatusColor(q.status)} style={drawerStyles.statusTag}>
            {(q.status || "UNKNOWN").toUpperCase()}
          </Tag>
          {(q.validity || q.validity_date) && (
            <span style={drawerStyles.validityText}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              Valid till {q.validity || (q.validity_date ? new Date(q.validity_date).toLocaleDateString() : "")}
            </span>
          )}
        </div>
      </div>

      {/* ── Grand total highlight ── */}
      <div style={drawerStyles.totalHighlight}>
        <span style={drawerStyles.totalLabel}>Grand Total</span>
        <span style={drawerStyles.totalValue}>{formatCurrencyHelper(q.grand_total ?? 0)}</span>
      </div>

      {/* ── Contact ── */}
      <DrawerSection title="Contact">
        {q.contact_person_name && <DrawerInfoRow icon={<UserOutlined />} label="Name" value={q.contact_person_name} />}
        {q.contact_person_email && <DrawerInfoRow icon={<MailOutlined />} label="Email" value={q.contact_person_email} />}
        {q.contact_person_phone && <DrawerInfoRow icon={<PhoneOutlined />} label="Phone" value={q.contact_person_phone} />}
        {q.customer_gst_number && (
          <DrawerInfoRow icon={<NumberOutlined />} label="GST" value={
            <span style={{ fontFamily: "monospace", fontSize: 12 }}>{q.customer_gst_number}</span>
          } />
        )}
      </DrawerSection>

      {/* ── Addresses ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={drawerStyles.sectionLabel}>Addresses</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <div style={drawerStyles.addrCard}>
            <div style={drawerStyles.addrCardLabel}>
              <EnvironmentOutlined style={{ marginRight: 5, color: "#1677ff" }} />Shipping
            </div>
            <div style={drawerStyles.addrCardText}>{joinAddr(shipping) || "—"}</div>
          </div>
          <div style={drawerStyles.addrCard}>
            <div style={drawerStyles.addrCardLabel}>
              <EnvironmentOutlined style={{ marginRight: 5, color: "#52c41a" }} />Billing
            </div>
            <div style={drawerStyles.addrCardText}>{joinAddr(billing) || "—"}</div>
          </div>
        </div>
      </div>

      {/* ── Business ── */}
      {(business.businessName || business.businessAddress) && (
        <DrawerSection title="Business">
          {business.businessName && <DrawerInfoRow icon={<ShopOutlined />} label="Name" value={business.businessName} />}
          {business.businessGST && <DrawerInfoRow label="GST" value={<span style={{ fontFamily: "monospace", fontSize: 12 }}>{business.businessGST}</span>} />}
          {business.businessPhone && <DrawerInfoRow icon={<PhoneOutlined />} label="Phone" value={business.businessPhone} />}
          {business.businessEmail && <DrawerInfoRow icon={<MailOutlined />} label="Email" value={business.businessEmail} />}
          {business.businessAddress && typeof business.businessAddress === "string" && (
            <DrawerInfoRow icon={<EnvironmentOutlined />} label="Address" value={business.businessAddress.replace(/\n/g, ", ")} />
          )}
        </DrawerSection>
      )}

      {/* ── Payment ── */}
      {payment?.bank_name && (
        <DrawerSection title="Payment">
          <DrawerInfoRow icon={<BankOutlined />} label="Bank" value={<strong>{payment.bank_name}</strong>} />
          {payment.account_holder_name && <DrawerInfoRow label="Holder" value={payment.account_holder_name} />}
          {payment.account_number && (
            <DrawerInfoRow label="Account" value={<span style={{ fontFamily: "monospace" }}>{payment.account_number}</span>} />
          )}
          {payment.ifsc_code && (
            <DrawerInfoRow label="IFSC" value={<span style={{ fontFamily: "monospace" }}>{payment.ifsc_code}</span>} />
          )}
          {payment.branch_name && <DrawerInfoRow label="Branch" value={payment.branch_name} />}
        </DrawerSection>
      )}

      {/* ── Items ── */}
      <DrawerSection title="Items" noPad>
        <div style={{ borderRadius: 10, border: "1px solid #f0f0f0", overflow: "hidden" }}>
          <Table
            size="small"
            columns={detailsItemsColumns}
            dataSource={(q.items || []).map((item: any, i: number) => ({ ...item, key: i }))}
            pagination={false}
            scroll={{ x: "max-content" }}
            style={{ background: "#fff" }}
          />
        </div>
      </DrawerSection>

      {/* ── Summary ── */}
      <DrawerSection title="Summary" noPad>
        <div style={drawerStyles.summaryCard}>
          <SummaryLine label="Subtotal" value={formatCurrencyHelper(q.sub_total ?? 0)} />
          <SummaryLine label="Discount" pct={`${Number(q.discount_percent ?? 0)}%`} value={`−${formatCurrencyHelper(q.discount_amount ?? 0)}`} />
          {hasCgst && <SummaryLine label="CGST" pct={`${Number(q.cgst_percent ?? 0)}%`} value={formatCurrencyHelper(q.cgst_amount ?? 0)} />}
          {hasSgst && <SummaryLine label="SGST" pct={`${Number(q.sgst_percent ?? 0)}%`} value={formatCurrencyHelper(q.sgst_amount ?? 0)} />}
          {hasIgst && <SummaryLine label="IGST" pct={`${Number(q.igst_percent ?? 0)}%`} value={formatCurrencyHelper(q.igst_amount ?? 0)} />}
          <SummaryLine label="Transport" value={formatCurrencyHelper(q.transport_charges ?? 0)} />
          <SummaryLine label="Grand Total" value={formatCurrencyHelper(q.grand_total ?? 0)} isTotal />
        </div>
      </DrawerSection>

      {/* ── Notes ── */}
      {q.notes && (
        <DrawerSection title="Notes">
          <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{q.notes}</div>
        </DrawerSection>
      )}

      {/* ── Meta ── */}
      <DrawerSection title="Audit">
        <DrawerInfoRow label="Created At" value={q.created_at ? new Date(q.created_at).toLocaleString() : "—"} />
        <DrawerInfoRow label="Created By" value={`${q.created_by_user?.first_name || ""} ${q.created_by_user?.last_name || ""}`.trim() || "—"} />
      </DrawerSection>

    </div>
  );
};

// ─── History Tab ──────────────────────────────────────────────────────────────
const HistoryTab: React.FC<{ history: any[] }> = ({ history }) => {
  if (!history.length) return <Empty description="No history available" style={{ marginTop: 32 }} />;
  return (
    <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {history.map((item: any, i: number) => (
        <div key={item.id ?? i} style={drawerStyles.timelineCard}>
          <div style={drawerStyles.timelineDotGrey} />
          <div style={{ flex: 1 }}>
            <div style={drawerStyles.timelineTitle}>
              Version {item.version_number || item.id}
              {item.action_type && <Tag style={{ marginLeft: 8, borderRadius: 6, fontSize: 11 }}>{item.action_type}</Tag>}
            </div>
            <div style={drawerStyles.timelineDesc}>{item.change_reason || item.action_type || "Quotation snapshot saved"}</div>
            <div style={drawerStyles.timelineMeta}>
              {item.changed_by_user
                ? `By ${item.changed_by_user.first_name || ""} ${item.changed_by_user.last_name || ""}`.trim()
                : item.changed_by ? `By user ${item.changed_by}` : "Unknown"}
              {item.created_at && <span style={{ marginLeft: 8 }}>· {new Date(item.created_at).toLocaleString()}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Timeline Tab ─────────────────────────────────────────────────────────────
const TimelineTab: React.FC<{ timeline: any[] }> = ({ timeline }) => {
  if (!timeline.length) return <Empty description="No timeline events" style={{ marginTop: 32 }} />;
  return (
    <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {timeline.map((item: any, i: number) => (
        <div key={item.id ?? i} style={drawerStyles.timelineCard}>
          <div style={drawerStyles.timelineDotBlue} />
          <div style={{ flex: 1 }}>
            <div style={drawerStyles.timelineTitle}>
              <ClockCircleOutlined style={{ marginRight: 6, color: "#0958d9" }} />
              {item.action_type || item.type || "Event"}
            </div>
            <div style={drawerStyles.timelineMeta}>
              {item.changed_by_user
                ? `Changed by ${item.changed_by_user.first_name || ""} ${item.changed_by_user.last_name || ""}`.trim()
                : item.changed_by ? `Changed by user ${item.changed_by}` : "Timeline event"}
              {item.created_at && <span style={{ marginLeft: 8 }}>· {new Date(item.created_at).toLocaleString()}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Mobile quotation card ────────────────────────────────────────────────────
const MobileQuotationCard: React.FC<{
  record: any;
  downloadingId: number | null;
  onView: (r: any) => void;
  onEdit: (r: any) => void;
  onDelete: (r: any) => void;
  onDownload: (r: any) => void;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}> = ({ record, downloadingId, onView, onEdit, onDelete, onDownload, canEdit, canDelete, canExport }) => (
  <div style={pageStyles.mobileCard}>
    <div style={pageStyles.mobileCardHeader}>
      <div>
        <Button type="link" style={{ padding: 0, fontWeight: 700, fontSize: 14 }} onClick={() => onView(record)}>
          {record.quotation_number}
        </Button>
        <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>{record.customer_name}</div>
        {record.company_name && <div style={{ fontSize: 11, color: "#bfbfbf" }}>{record.company_name}</div>}
      </div>
      <Tag color={getStatusColor(record.status)} style={{ borderRadius: 8, flexShrink: 0 }}>
        {record.status ? record.status.toUpperCase() : "UNKNOWN"}
      </Tag>
    </div>
    <div style={pageStyles.mobileCardRow}>
      <span style={pageStyles.mobileCardLabel}>Grand Total</span>
      <span style={{ fontWeight: 700, color: "#0958d9", fontSize: 15 }}>{formatCurrencyHelper(record.grand_total)}</span>
    </div>
    <div style={pageStyles.mobileCardRow}>
      <span style={pageStyles.mobileCardLabel}>Expiry</span>
      <span style={pageStyles.mobileCardValue}>{record.validity_date ? new Date(record.validity_date).toLocaleDateString() : "—"}</span>
    </div>
    <div style={pageStyles.mobileCardRow}>
      <span style={pageStyles.mobileCardLabel}>Created By</span>
      <span style={pageStyles.mobileCardValue}>{record.created_by_user?.first_name} {record.created_by_user?.last_name}</span>
    </div>
    <div style={pageStyles.mobileCardActions}>
      {canExport && (
        <Button size="small" icon={<DownloadOutlined />} loading={downloadingId === record.id} onClick={() => onDownload(record)}>PDF</Button>
      )}
      <Button size="small" icon={<EyeOutlined />} onClick={() => onView(record)}>View</Button>
      {canEdit && <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>Edit</Button>}
      {canDelete && (
        <Popconfirm title="Delete Quotation" description="Are you sure?" onConfirm={() => onDelete(record)} okText="Yes" cancelText="No" okButtonProps={{ danger: true }}>
          <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      )}
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
      customerId: selectedQuotation.customer_id,
      customerName: selectedQuotation.customer_name,
      customerType: selectedQuotation.customer_type,
      companyName: selectedQuotation.company_name,
      customerGSTN: selectedQuotation.customer_gst_number,
      customerEmail: selectedQuotation.contact_person_email,
      customerPhone: selectedQuotation.contact_person_phone,
      contactPersonId: selectedQuotation.contact_person_id,
      billingAddressId: selectedQuotation.billing_address_id,
      shippingAddressId: selectedQuotation.shipping_address_id,
      billingAddressSnapshot: JSON.stringify(billingSnapshot),
      shippingAddressSnapshot: JSON.stringify(shippingSnapshot),
      businessDetailsSnapshot: JSON.stringify(businessSnapshot),
      paymentBankId: paymentSnapshot.bank_id,
      paymentBankName: paymentSnapshot.bank_name,
      paymentAccountHolder: paymentSnapshot.account_holder_name,
      paymentAccountNumber: paymentSnapshot.account_number,
      paymentIFSC: paymentSnapshot.ifsc_code,
      paymentBranchName: paymentSnapshot.branch_name,
      paymentBranchAddress: paymentSnapshot.branch_address,
      paymentAccountType: paymentSnapshot.account_type,
      paymentIsDefault: paymentSnapshot.is_default,
      businessName: businessSnapshot.businessName ?? selectedQuotation.company_name ?? "",
      selectedAddress: Array.isArray(businessSnapshot.selectedAddress) ? businessSnapshot.selectedAddress : [],
      selectedLocation: Array.isArray(businessSnapshot.selectedLocation) ? businessSnapshot.selectedLocation : [],
      selectedPhones: Array.isArray(businessSnapshot.selectedPhones) ? businessSnapshot.selectedPhones : [],
      selectedEmails: Array.isArray(businessSnapshot.selectedEmails) ? businessSnapshot.selectedEmails : [],
      businessAddress: businessSnapshot.businessAddress ?? joinAddr(billingSnapshot),
      businessGST: businessSnapshot.businessGST ?? "",
      businessPhone: businessSnapshot.businessPhone ?? "",
      businessEmail: businessSnapshot.businessEmail ?? "",
      businessMeta: Array.isArray(businessSnapshot.businessMeta) ? businessSnapshot.businessMeta : [],
      billingAddress: joinAddr(billingSnapshot),
      shippingAddress: joinAddr(shippingSnapshot),
      items: (selectedQuotation.items || []).map((item: any) => ({
        itemName: item.product_name, hsn_code: item.hsn_code || item.hsn || "",
        quantity: item.qty, price: item.rate, discount: item.discount_percent, total: item.amount,
      })),
      subTotal: selectedQuotation.sub_total, discount: selectedQuotation.discount,
      cgst: selectedQuotation.cgst_percent, sgst: selectedQuotation.sgst_percent,
      igst: selectedQuotation.igst_percent, placeOfOrder: billingSnapshot?.state || shippingSnapshot?.state,
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
    if (!itemsRaw.length) {
      notification.error({ message: "No items added", description: "Please add at least one item." });
      return;
    }
    const items = itemsRaw.map((item: any) => ({
      product_name: item?.itemName, hsn_code: item?.hsn_code,
      qty: Number(item?.quantity || item?.qty || 0), rate: Number(item?.price || item?.rate || 0),
      discount_percent: Number(item?.discount || 0),
    }));
    const subTotal = Number(values.subTotal || 0);
    const discountPercent = Number(values.discount || 0);
    const discountAmount = Number(values.discount_amount ?? (subTotal * discountPercent) / 100);
    const taxableAmount = subTotal - discountAmount;
    const cgstPercent = Number(values.cgst || 0); const sgstPercent = Number(values.sgst || 0); const igstPercent = Number(values.igst || 0);
    const cgstAmount = (taxableAmount * cgstPercent) / 100; const sgstAmount = (taxableAmount * sgstPercent) / 100; const igstAmount = (taxableAmount * igstPercent) / 100;
    const transportCharges = Number(values.transport || 0);
    const grandTotal = Number(values.grandTotal || taxableAmount + cgstAmount + sgstAmount + igstAmount + transportCharges);
    const storedCompanyDetails = storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
    const currentCompanyId = companyDetails?.id || (storedCompanyDetails ? (() => { try { return JSON.parse(storedCompanyDetails)?.id; } catch { return undefined; } })() : undefined);
    const basePayload = {
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
      const missingFields = [];
      if (!basePayload.customer_id) missingFields.push("selected customer");
      if (!currentCompanyId) missingFields.push("company details");
      if (!basePayload.user_id) missingFields.push("login");
      if (missingFields.length) { notification.error({ message: "Missing Required Fields", description: `Please provide ${missingFields.join(" and ")}.` }); return; }
      dispatch(createQuotation({ ...basePayload, company_id: currentCompanyId, quotation_date: new Date().toISOString() }));
    }
    form.resetFields();
  };

  const handleEdit = (record: any) => {
    setEditingQuotation(record);
    dispatch(getCustomers({ search: record.customer_name, page: 1, limit: 10 }));
    dispatch(getQuotationDetails(record.id));
    setShowForm(true);
    const billingSnapshot = parseJsonField(record.billing_address_snapshot) || {};
    const shippingSnapshot = parseJsonField(record.shipping_address_snapshot) || {};
    const businessSnapshot = parseJsonField(record.business_details_snapshot) || {};
    const paymentSnapshot = parseJsonField(record.payment_details_snapshot) || {};
    form.setFieldsValue({
      customerId: record.customer_id, customerName: record.customer_name, customerType: record.customer_type,
      companyName: record.company_name, customerGSTN: record.customer_gst_number, customerEmail: record.contact_person_email,
      customerPhone: record.contact_person_phone, contactPersonId: record.contact_person_id,
      billingAddressId: record.billing_address_id, shippingAddressId: record.shipping_address_id,
      billingAddressSnapshot: JSON.stringify(billingSnapshot), shippingAddressSnapshot: JSON.stringify(shippingSnapshot),
      businessDetailsSnapshot: JSON.stringify(businessSnapshot), paymentBankId: paymentSnapshot.bank_id,
      paymentBankName: paymentSnapshot.bank_name, paymentAccountHolder: paymentSnapshot.account_holder_name,
      paymentAccountNumber: paymentSnapshot.account_number, paymentIFSC: paymentSnapshot.ifsc_code,
      paymentBranchName: paymentSnapshot.branch_name, paymentBranchAddress: paymentSnapshot.branch_address,
      paymentAccountType: paymentSnapshot.account_type, paymentIsDefault: paymentSnapshot.is_default,
      businessName: businessSnapshot.businessName ?? record.company_name ?? "",
      selectedAddress: Array.isArray(businessSnapshot.selectedAddress) ? businessSnapshot.selectedAddress : [],
      selectedLocation: Array.isArray(businessSnapshot.selectedLocation) ? businessSnapshot.selectedLocation : [],
      selectedPhones: Array.isArray(businessSnapshot.selectedPhones) ? businessSnapshot.selectedPhones : [],
      selectedEmails: Array.isArray(businessSnapshot.selectedEmails) ? businessSnapshot.selectedEmails : [],
      businessAddress: businessSnapshot.businessAddress ?? joinAddr(billingSnapshot),
      businessGST: businessSnapshot.businessGST ?? "", businessPhone: businessSnapshot.businessPhone ?? "",
      businessEmail: businessSnapshot.businessEmail ?? "",
      businessMeta: Array.isArray(businessSnapshot.businessMeta) ? businessSnapshot.businessMeta : [],
      billingAddress: joinAddr(billingSnapshot), shippingAddress: joinAddr(shippingSnapshot),
      items: (record.items || []).map((item: any) => ({ itemName: item.product_name, hsn_code: item.hsn_code || item.hsn || "", quantity: item.qty, price: item.rate, discount: item.discount_percent, total: item.amount })),
      subTotal: record.sub_total, discount: record.discount, cgst: record.cgst_percent, sgst: record.sgst_percent, igst: record.igst_percent,
      placeOfOrder: billingSnapshot?.state || shippingSnapshot?.state, transport: record.transport_charges,
      grandTotal: record.grand_total, validity_date: getValidityDate(record.validity_date), notes: record.notes,
    });
  };

  const handleDelete = (record: any) => dispatch(deleteQuotation(record.id));
  const handleView = (record: any) => { setSelectedQuotationId(record.id); setDetailsVisible(true); };
  const handleSend = () => { if (!selectedQuotationId) return; dispatch(sendQuotation({ id: selectedQuotationId, user_id: authState?.user?.id })); };

  const columns = [
    {
      title: "Quotation #", dataIndex: "quotation_number", key: "quotation_number", width: 150,
      render: (value: any, record: any) => <Button type="link" onClick={() => handleView(record)}>{value}</Button>,
    },
    {
      title: "Customer", dataIndex: "customer", key: "customer", width: 160,
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.customer_name}</div>
          {record.company_name && <div style={{ fontSize: 12, color: "#8c8c8c" }}>{record.company_name}</div>}
        </div>
      ),
    },
    {
      title: "Payment", dataIndex: "payment_details_snapshot", key: "payment_details_snapshot", width: 180,
      render: (_: any, record: any) => {
        const payment = parseJsonField(record.payment_details_snapshot) || {};
        if (!payment.bank_name && !payment.account_number) return "-";
        return (
          <div>
            {payment.bank_name && <div style={{ fontWeight: 500 }}>{payment.bank_name}</div>}
            {payment.account_number && <div style={{ fontSize: 12, color: "#8c8c8c", fontFamily: "monospace" }}>{payment.account_number}</div>}
          </div>
        );
      },
    },
    { title: "Grand Total", dataIndex: "grand_total", key: "grand_total", width: 110, render: (value: any) => <strong style={{ color: "#0958d9" }}>{formatCurrencyHelper(value)}</strong> },
    {
      title: "Status", dataIndex: "status", key: "status", width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)} style={{ borderRadius: 6 }}>{status ? status.toUpperCase() : "UNKNOWN"}</Tag>,
    },
    { title: "QT Expiry", dataIndex: "validity_date", key: "validity_date", width: 110, render: (v: string) => v ? new Date(v).toLocaleDateString() : "-" },
    {
      title: "Created By", dataIndex: "created_by", key: "created_by", width: 130,
      render: (_: any, record: any) => `${record.created_by_user?.first_name || ""} ${record.created_by_user?.last_name || ""}`.trim(),
    },
    { title: "Created At", dataIndex: "created_at", key: "created_at", width: 160, render: (v: string) => v ? new Date(v).toLocaleString() : "-" },
    {
      title: "Action", key: "action", fixed: "right" as const, width: 160,
      render: (_: any, record: any) => (
        <Space size="small">
          {can("quotations.export") && <Button type="text" icon={<DownloadOutlined style={{ color: "#1890ff" }} />} loading={downloadingQuotationId === record.id} onClick={() => downloadQuotationPDF(record)} />}
          <Button type="text" icon={<EyeOutlined style={{ color: "#1890ff" }} />} onClick={() => handleView(record)} />
          {can("quotations.edit") && <Button type="text" icon={<EditOutlined style={{ color: "#1677ff" }} />} onClick={() => handleEdit(record)} />}
          {can("quotations.delete") && (
            <Popconfirm title="Delete Quotation" description="Are you sure?" onConfirm={() => handleDelete(record)} okText="Yes" cancelText="No" okButtonProps={{ danger: true }}>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? 10 : 16,  minHeight: "100vh" }}>
      {showForm && (
        <Card style={{ marginBottom: 20, borderRadius: 12, border: "none", boxShadow: "0 1px 6px rgba(0,0,0,.08)" }}>
          <div style={{ marginBottom: 16 }}>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              {editingQuotation ? "Edit Quotation" : "New Quotation"}
            </Title>
            <Text type="secondary">Create professional quotations for customers</Text>
          </div>
          <Divider />
          <Form form={form} layout="vertical" onFinish={handleFinish} autoComplete="off">
            <Form.Item name="customerId" hidden><Input type="hidden" /></Form.Item>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}><BusinessDetails /></Col>
              <Col xs={24} md={12}><CustomerDetails /></Col>
            </Row>
            <QuotationItems />
            <QuotationSummary />
            <PaymentDetails />
            <Form.Item style={{ marginTop: 24 }}>
              <Space wrap>
                {(editingQuotation ? can("quotations.edit") : can("quotations.create")) && (
                  <Button type="primary" htmlType="submit" size="large" loading={createLoading}>
                    {editingQuotation ? "Save Changes" : "Save Quotation"}
                  </Button>
                )}
                <Button icon={<CloseCircleOutlined />} onClick={() => { setEditingQuotation(null); form.resetFields(); setShowForm(false); }}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Card
        title={<span style={{ fontSize: 16, fontWeight: 700 }}>Quotations</span>}
        style={{ borderRadius: 12, border: "none", boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}
        extra={
          can("quotations.create") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setShowForm(true); setEditingQuotation(null); form.resetFields(); if (companyDetails?.default_terms_conditions) form.setFieldsValue({ notes: companyDetails.default_terms_conditions }); }}>
              {isMobile ? "Add" : "Add Quotation"}
            </Button>
          )
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Input placeholder="Search quotation or customer…" prefix={<SearchOutlined />} allowClear value={search}
            style={{ width: isMobile ? "100%" : 320 }}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />

          {isMobile ? (
            loading
              ? <div style={{ textAlign: "center", padding: 32, color: "#8c8c8c" }}>Loading…</div>
              : quotations.length === 0
              ? <Empty description="No quotations found" />
              : quotations.map((q: any) => (
                <MobileQuotationCard key={q.id} record={q} downloadingId={downloadingQuotationId}
                  onView={handleView} onEdit={handleEdit} onDelete={handleDelete} onDownload={downloadQuotationPDF}
                  canEdit={can("quotations.edit")} canDelete={can("quotations.delete")} canExport={can("quotations.export")} />
              ))
          ) : (
            <Table columns={columns} dataSource={quotations.map((q: any) => ({ ...q, key: q.id }))}
              pagination={false} loading={loading} bordered={false}
              locale={{ emptyText: <Empty description="No quotations found" /> }} scroll={{ x: "max-content" }} />
          )}

          {pagination.total > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 13, color: "#888" }}>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, pagination.total)} of {pagination.total}
              </span>
              <Pagination current={page} pageSize={pageSize} total={pagination.total}
                showSizeChanger={!isMobile} showQuickJumper={!isMobile} simple={isMobile}
                pageSizeOptions={["5", "10", "25", "50"]}
                onChange={(p) => setPage(p)}
                onShowSizeChange={(_, s) => { setPageSize(s); setPage(1); }} />
            </div>
          )}
        </Space>
      </Card>

      {/* ── Redesigned Details Drawer ── */}
      <Drawer
        title={
          selectedQuotation ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>
                Quotation #{selectedQuotation.quotation_number}
              </div>
              <div style={{ fontSize: 12, color: "#aaa", fontWeight: 400, marginTop: 1 }}>
                {selectedQuotation.customer_name}
                {selectedQuotation.company_name ? ` · ${selectedQuotation.company_name}` : ""}
              </div>
            </div>
          ) : "Quotation Details"
        }
        placement="right"
        width={isMobile ? "100%" : 680}
        onClose={() => setDetailsVisible(false)}
        open={detailsVisible}
        styles={{ body: { padding: isMobile ? 14 : 20, background: "#f8faff" } }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setDetailsVisible(false)}>Close</Button>
            {can("quotations.export") && selectedQuotation && (
              <Button icon={<DownloadOutlined />} loading={downloadingQuotationId === selectedQuotation?.id} onClick={() => downloadQuotationPDF(selectedQuotation)}>
                Download PDF
              </Button>
            )}
            {can("quotation.send") && (
              <Button type="primary" loading={actionLoading} onClick={handleSend}>Send Quotation</Button>
            )}
          </div>
        }
      >
        {selectedQuotation ? (
          <Tabs
            defaultActiveKey="details"
            size={isMobile ? "small" : "middle"}
            tabBarStyle={{ position: "sticky", top: 0, background: "#f8faff", zIndex: 10, marginBottom: 0 }}
            items={[
              {
                key: "details",
                label: "Details",
                children: <DetailsTab q={selectedQuotation} isMobile={isMobile} />,
              },
              {
                key: "history",
                label: `History${quotationHistory.length ? ` (${quotationHistory.length})` : ""}`,
                children: <HistoryTab history={quotationHistory} />,
              },
              {
                key: "timeline",
                label: `Timeline${quotationTimeline.length ? ` (${quotationTimeline.length})` : ""}`,
                children: <TimelineTab timeline={quotationTimeline} />,
              },
            ]}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 12 }}>
            <FileTextOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
            <Text type="secondary">Select a quotation to view details</Text>
          </div>
        )}
      </Drawer>
    </div>
  );
};

// ─── Drawer Styles ────────────────────────────────────────────────────────────
const drawerStyles: Record<string, React.CSSProperties> = {
  heroCard: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    background: "linear-gradient(135deg, #e8f0fe 0%, #f0f5ff 100%)",
    border: "1px solid #d6e4ff", borderRadius: 14, padding: "16px 18px", marginBottom: 14,
  },
  heroQuotNum: { fontSize: 20, fontWeight: 800, color: "#1a1a2e", letterSpacing: -0.5 },
  heroSub: { fontSize: 12, color: "#7a9ed4", marginTop: 3 },
  statusTag: { fontSize: 12, padding: "3px 12px", borderRadius: 8, fontWeight: 600 },
  validityText: { fontSize: 11, color: "#7a9ed4" },

  totalHighlight: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#0958d9", borderRadius: 12, padding: "12px 18px", marginBottom: 18,
  },
  totalLabel: { fontSize: 13, color: "rgba(255,255,255,.75)", fontWeight: 500 },
  totalValue: { fontSize: 22, fontWeight: 800, color: "#fff" },

  sectionLabel: {
    fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase",
    letterSpacing: 0.8, marginBottom: 8,
  },
  sectionCard: {
    background: "#fff", border: "1px solid #eef0f4",
    borderRadius: 10, padding: "2px 14px",
  },

  infoRow: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "9px 0", borderBottom: "1px solid #f5f5f5", gap: 10,
  },
  infoLabel: { fontSize: 12, color: "#aaa", flexShrink: 0, paddingTop: 1 },
  infoValue: { fontSize: 13, color: "#1a1a2e", fontWeight: 500, textAlign: "right", wordBreak: "break-word" },

  addrCard: {
    background: "#fff", border: "1px solid #eef0f4", borderRadius: 10, padding: "12px 14px",
  },
  addrCardLabel: { fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  addrCardText: { fontSize: 13, color: "#444", lineHeight: 1.6 },

  summaryCard: {
    background: "#fff", border: "1px solid #eef0f4", borderRadius: 10, padding: "4px 14px",
  },
  summaryRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "9px 0", borderBottom: "1px solid #f5f5f5",
  },
  summaryTotalRow: {
    background: "#f0f5ff", borderRadius: 8, padding: "12px 14px",
    margin: "4px -14px -4px", border: "none",
  },
  summaryPct: { fontSize: 12, color: "#bbb", minWidth: 40, textAlign: "right" as const },

  timelineCard: {
    display: "flex", gap: 12, alignItems: "flex-start",
    background: "#fff", border: "1px solid #eef0f4", borderRadius: 12, padding: "12px 14px",
  },
  timelineDotGrey: { width: 10, height: 10, borderRadius: "50%", background: "#d9d9d9", marginTop: 5, flexShrink: 0 },
  timelineDotBlue: { width: 10, height: 10, borderRadius: "50%", background: "#0958d9", marginTop: 5, flexShrink: 0 },
  timelineTitle: { fontSize: 13, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 },
  timelineDesc: { fontSize: 12, color: "#666", marginBottom: 4 },
  timelineMeta: { fontSize: 11, color: "#aaa" },
};

// ─── Page Styles ──────────────────────────────────────────────────────────────
const pageStyles: Record<string, React.CSSProperties> = {
  mobileCard: {
    background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,.07)", border: "1px solid #f0f0f0",
  },
  mobileCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 },
  mobileCardRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, fontSize: 13 },
  mobileCardLabel: { color: "#aaa", fontSize: 12, minWidth: 72 },
  mobileCardValue: { color: "#333", textAlign: "right" as const, flex: 1 },
  mobileCardActions: { display: "flex", gap: 6, marginTop: 12, paddingTop: 10, borderTop: "1px solid #f5f5f5", flexWrap: "wrap" as const },
};

export default QuotationPage;