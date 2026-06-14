import React, { useEffect, useMemo, useState, useRef } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Form,
  List,
  notification,
  Pagination,
  Row,
  Col,
  Space,
  Table,
  Tag,
  Tabs,
  Empty,
  Popconfirm,
  Input,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  createQuotation,
  deleteQuotation,
  getQuotationDetails,
  getQuotationHistory,
  getQuotationTimeline,
  getQuotations,
  sendQuotation,
  updateQuotation,
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
const { TabPane } = Tabs;

const QuotationPage = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const storageService = useMemo(() => new StorageService(), []);
  const [companyDetails, setCompanyDetails] = useState<any>(null);

  useEffect(() => {
    const storedCompany = storageService.getItem(
      StorageService.STORAGE_KEYS.COMPANY_DETAILS,
    );
    if (storedCompany) {
      try {
        setCompanyDetails(JSON.parse(storedCompany));
      } catch (error) {
        console.error("Failed to parse stored company details", error);
      }
    }
  }, [storageService]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [editingQuotation, setEditingQuotation] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(
    null,
  );
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
    // When create/update finishes (transition from true -> false) and there's no error,
    // close the form and reset editing state so list is shown.
    if (
      prevCreateLoadingRef.current &&
      !createLoading &&
      !quotationState.error
    ) {
      setShowForm(false);
      setEditingQuotation(null);
      form.resetFields();

      // Refresh list to show updated data
      dispatch(
        getQuotations({
          page,
          limit: pageSize,
          search: search || undefined,
        }),
      );
    }

    prevCreateLoadingRef.current = createLoading;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createLoading, quotationState.error]);

  useEffect(() => {
    dispatch(
      getQuotations({
        page,
        limit: pageSize,
        search: search || undefined,
      }),
    );
  }, [dispatch, page, pageSize, search]);

  useEffect(() => {
    if (!selectedQuotationId) {
      return;
    }

    dispatch(getQuotationDetails(selectedQuotationId));
    dispatch(getQuotationHistory(selectedQuotationId));
    dispatch(getQuotationTimeline(selectedQuotationId));
  }, [dispatch, selectedQuotationId]);

  const formatCurrency = (value: any) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? `₹${amount.toFixed(2)}` : `₹0.00`;
  };

  const getValidityDate = (validityDate: string | undefined) => {
    if (!validityDate) {
      return undefined;
    }

    const date = new Date(validityDate);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return dayjs(date);
  };

  const parseJsonField = (raw: any) => {
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    }
    return raw;
  };

  useEffect(() => {
    if (!editingQuotation || !selectedQuotation) {
      return;
    }

    if (selectedQuotation.id !== editingQuotation.id) {
      return;
    }

    const billingSnapshot = parseJsonField(selectedQuotation.billing_address_snapshot);
    const shippingSnapshot = parseJsonField(selectedQuotation.shipping_address_snapshot);
    const businessSnapshotRaw = selectedQuotation.business_details_snapshot;
    const businessSnapshot = businessSnapshotRaw
      ? parseJsonField(businessSnapshotRaw) || {}
      : {};
    const paymentSnapshotRaw = selectedQuotation.payment_details_snapshot;
    const paymentSnapshot = paymentSnapshotRaw
      ? parseJsonField(paymentSnapshotRaw) || {}
      : {};

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
      selectedAddress: Array.isArray(businessSnapshot.selectedAddress)
        ? businessSnapshot.selectedAddress
        : [],
      selectedLocation: Array.isArray(businessSnapshot.selectedLocation)
        ? businessSnapshot.selectedLocation
        : [],
      selectedPhones: Array.isArray(businessSnapshot.selectedPhones)
        ? businessSnapshot.selectedPhones
        : [],
      selectedEmails: Array.isArray(businessSnapshot.selectedEmails)
        ? businessSnapshot.selectedEmails
        : [],
      businessAddress:
        businessSnapshot.businessAddress ??
        [
          billingSnapshot?.address_line_1,
          billingSnapshot?.address_line_2,
          billingSnapshot?.city,
          billingSnapshot?.state,
          billingSnapshot?.country,
          billingSnapshot?.postal_code,
        ]
          .filter(Boolean)
          .join(", "),
      businessGST: businessSnapshot.businessGST ?? "",
      businessPhone: businessSnapshot.businessPhone ?? "",
      businessEmail: businessSnapshot.businessEmail ?? "",
      businessMeta: Array.isArray(businessSnapshot.businessMeta)
        ? businessSnapshot.businessMeta
        : [],
      billingAddress: [
        billingSnapshot?.address_line_1,
        billingSnapshot?.address_line_2,
        billingSnapshot?.city,
        billingSnapshot?.state,
        billingSnapshot?.country,
        billingSnapshot?.postal_code,
      ]
        .filter(Boolean)
        .join(", "),
      shippingAddress: [
        shippingSnapshot?.address_line_1,
        shippingSnapshot?.address_line_2,
        shippingSnapshot?.city,
        shippingSnapshot?.state,
        shippingSnapshot?.country,
        shippingSnapshot?.postal_code,
      ]
        .filter(Boolean)
        .join(", "),
      items: (selectedQuotation.items || []).map((item: any) => ({
        itemName: item.product_name,
        hsn_code: item.hsn_code || item.hsn || "",
        quantity: item.qty,
        price: item.rate,
        discount: item.discount_percent,
        total: item.amount,
      })),
      subTotal: selectedQuotation.sub_total,
      discount: selectedQuotation.discount,
      cgst: selectedQuotation.cgst_percent,
      sgst: selectedQuotation.sgst_percent,
      igst: selectedQuotation.igst_percent,
      placeOfOrder: billingSnapshot?.state || shippingSnapshot?.state,
      transport: selectedQuotation.transport_charges,
      grandTotal: selectedQuotation.grand_total,
      validity_date: getValidityDate(selectedQuotation.validity_date),
      notes: selectedQuotation.notes,
    });
  }, [editingQuotation, selectedQuotation, form]);

  const downloadQuotationPDF = async (quotation: any) => {
    setDownloadingQuotationId(quotation.id);
    try {
      await downloadQuotationPDFHelper(
        quotation,
        async (id: number) => quotationService.getQuotationDetails(id),
      );
    } finally {
      setDownloadingQuotationId(null);
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "default";

    switch (status.toLowerCase()) {
      case "sent":
        return "green";
      case "draft":
        return "default";
      case "expired":
        return "red";
      case "approved":
        return "blue";
      case "rejected":
        return "volcano";
      case "paid":
        return "cyan";
      case "partial":
      case "partially_paid":
      case "partially-paid":
        return "gold";
      default:
        return "purple";
    }
  };

  const handleFinish = (values: any) => {
    const customerId = values.customerId;
    const userId = authState?.user?.id;

    const itemsRaw = values.items || [];
    if (!itemsRaw.length) {
      notification.error({
        message: "No items added",
        description: "Please add at least one item to the quotation before saving.",
      });
      return;
    }

    const items = itemsRaw.map((item: any) => ({
      product_name: item?.itemName,
      hsn_code: item?.hsn_code,
      qty: Number(item?.quantity || item?.qty || 0),
      rate: Number(item?.price || item?.rate || 0),
      discount_percent: Number(item?.discount || 0),
    }));

    const subTotal = Number(values.subTotal || 0);
    const discountPercent = Number(values.discount || 0);
    const discountAmount = Number(values.discount_amount ?? (subTotal * discountPercent) / 100);
    const taxableAmount = subTotal - discountAmount;
    const cgstPercent = Number(values.cgst || 0);
    const sgstPercent = Number(values.sgst || 0);
    const igstPercent = Number(values.igst || 0);
    const cgstAmount = (taxableAmount * cgstPercent) / 100;
    const sgstAmount = (taxableAmount * sgstPercent) / 100;
    const igstAmount = (taxableAmount * igstPercent) / 100;
    const gstTotal = cgstAmount + sgstAmount + igstAmount;
    const transportCharges = Number(values.transport || 0);
    const grandTotal = Number(values.grandTotal || taxableAmount + gstTotal + transportCharges);

    const storedCompanyDetails = storageService.getItem(
      StorageService.STORAGE_KEYS.COMPANY_DETAILS,
    );
    const currentCompanyId =
      companyDetails?.id ||
      (storedCompanyDetails
        ? (() => {
            try {
              return JSON.parse(storedCompanyDetails)?.id;
            } catch {
              return undefined;
            }
          })()
        : undefined);

    const payload: any = {
      company_id: currentCompanyId,
      customer_id: Number(customerId) || undefined,
      user_id: Number(userId) || undefined,
      quotation_date: new Date().toISOString(),
      validity_date: values.validity_date
        ? values.validity_date.toISOString()
        : undefined,
      notes: values.notes,
      sub_total: subTotal,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      cgst_percent: cgstPercent,
      cgst_amount: cgstAmount,
      sgst_percent: sgstPercent,
      sgst_amount: sgstAmount,
      igst_percent: igstPercent,
      igst_amount: igstAmount,
      transport_charges: transportCharges,
      grand_total: grandTotal,
      items,
      contact_person_id: values.contactPersonId,
      billing_address_id: values.billingAddressId,
      shipping_address_id: values.shippingAddressId,
      customer_name: values.customerName,
      customer_type: values.customerType,
      customer_gst_number: values.customerGSTN,
      contact_person_name: values.customerName,
      contact_person_email: values.customerEmail,
      contact_person_phone: values.customerPhone,
      billing_address_snapshot: JSON.parse(values.billingAddressSnapshot),
      shipping_address_snapshot: JSON.parse(values.shippingAddressSnapshot),
      business_details_snapshot: values.businessDetailsSnapshot ? JSON.parse(values.businessDetailsSnapshot) : undefined,
      payment_details_snapshot: values.paymentBankId ? JSON.stringify({
        bank_id: values.paymentBankId,
        bank_name: values.paymentBankName,
        account_holder_name: values.paymentAccountHolder,
        account_number: values.paymentAccountNumber,
        ifsc_code: values.paymentIFSC,
        branch_name: values.paymentBranchName,
        branch_address: values.paymentBranchAddress,
        account_type: values.paymentAccountType,
        is_default: values.paymentIsDefault,
      }) : undefined,
    };

    if (editingQuotation) {
      const updatePayload = {
        id: editingQuotation.id,
        user_id: Number(userId),
        customer_id: Number(values.customerId),
        contact_person_id: values.contactPersonId,
        billing_address_id: values.billingAddressId,
        shipping_address_id: values.shippingAddressId,
        customer_name: values.customerName,
        customer_type: values.customerType,
        customer_gst_number: values.customerGSTN,
        contact_person_name: values.customerName,
        contact_person_email: values.customerEmail,
        contact_person_phone: values.customerPhone,
        billing_address_snapshot: JSON.parse(values.billingAddressSnapshot),
        shipping_address_snapshot: JSON.parse(values.shippingAddressSnapshot),
        business_details_snapshot: values.businessDetailsSnapshot ? JSON.parse(values.businessDetailsSnapshot) : undefined,
        payment_details_snapshot: values.paymentBankId ? JSON.stringify({
          bank_id: values.paymentBankId,
          bank_name: values.paymentBankName,
          account_holder_name: values.paymentAccountHolder,
          account_number: values.paymentAccountNumber,
          ifsc_code: values.paymentIFSC,
          branch_name: values.paymentBranchName,
          branch_address: values.paymentBranchAddress,
          account_type: values.paymentAccountType,
          is_default: values.paymentIsDefault,
        }) : undefined,
        validity_date: values.validity_date
          ? values.validity_date.toISOString()
          : undefined,
        notes: values.notes,
        sub_total: subTotal,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        cgst_percent: cgstPercent,
        cgst_amount: cgstAmount,
        sgst_percent: sgstPercent,
        sgst_amount: sgstAmount,
        igst_percent: igstPercent,
        igst_amount: igstAmount,
        transport_charges: transportCharges,
        grand_total: grandTotal,
        items,
      };

      dispatch(updateQuotation(updatePayload));
      setEditingQuotation(null);
    } else {
      const missingFields = [];
      if (!payload.customer_id) missingFields.push("selected customer");
      if (!payload.company_id) missingFields.push("company details");
      if (!payload.user_id) missingFields.push("login");

      if (missingFields.length) {
        notification.error({
          message: "Missing Required Fields",
          description: `Please provide ${missingFields.join(" and ")} before creating a quotation.`,
        });
        return;
      }

      dispatch(createQuotation(payload));
    }

    form.resetFields();
  };

  const handleEdit = (record: any) => {

    setEditingQuotation(record);
    dispatch(
      getCustomers({
        search: record.customer_name,
        page: 1,
        limit: 10,
      }),
    );
    dispatch(getQuotationDetails(record.id));
    setShowForm(true);

    const billingSnapshot =
      typeof record.billing_address_snapshot === "string"
        ? JSON.parse(record.billing_address_snapshot)
        : record.billing_address_snapshot;

    const shippingSnapshot =
      typeof record.shipping_address_snapshot === "string"
        ? JSON.parse(record.shipping_address_snapshot)
        : record.shipping_address_snapshot;

    const businessSnapshotRaw = record.business_details_snapshot;
    const businessSnapshot = businessSnapshotRaw
      ? typeof businessSnapshotRaw === "string"
        ? JSON.parse(businessSnapshotRaw)
        : businessSnapshotRaw
      : {};

    const paymentSnapshotRaw = record.payment_details_snapshot;
    const paymentSnapshot = paymentSnapshotRaw
      ? typeof paymentSnapshotRaw === "string"
        ? JSON.parse(paymentSnapshotRaw)
        : paymentSnapshotRaw
      : {};

    form.setFieldsValue({
      customerId: record.customer_id,
      customerName: record.customer_name,
      customerType: record.customer_type,
      companyName: record.company_name,
      customerGSTN: record.customer_gst_number,
      customerEmail: record.contact_person_email,
      customerPhone: record.contact_person_phone,
      contactPersonId: record.contact_person_id,
      billingAddressId: record.billing_address_id,
      shippingAddressId: record.shipping_address_id,
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
      businessName: businessSnapshot.businessName ?? record.company_name ?? "",
      selectedAddress: Array.isArray(businessSnapshot.selectedAddress)
        ? businessSnapshot.selectedAddress
        : [],
      selectedLocation: Array.isArray(businessSnapshot.selectedLocation)
        ? businessSnapshot.selectedLocation
        : [],
      selectedPhones: Array.isArray(businessSnapshot.selectedPhones)
        ? businessSnapshot.selectedPhones
        : [],
      selectedEmails: Array.isArray(businessSnapshot.selectedEmails)
        ? businessSnapshot.selectedEmails
        : [],
      businessAddress:
        businessSnapshot.businessAddress ??
        [
          billingSnapshot?.address_line_1,
          billingSnapshot?.address_line_2,
          billingSnapshot?.city,
          billingSnapshot?.state,
          billingSnapshot?.country,
          billingSnapshot?.postal_code,
        ]
          .filter(Boolean)
          .join(", "),
      businessGST: businessSnapshot.businessGST ?? "",
      businessPhone: businessSnapshot.businessPhone ?? "",
      businessEmail: businessSnapshot.businessEmail ?? "",
      businessMeta: Array.isArray(businessSnapshot.businessMeta)
        ? businessSnapshot.businessMeta
        : [],
      billingAddress: [
        billingSnapshot?.address_line_1,
        billingSnapshot?.address_line_2,
        billingSnapshot?.city,
        billingSnapshot?.state,
        billingSnapshot?.country,
        billingSnapshot?.postal_code,
      ]
        .filter(Boolean)
        .join(", "),

      shippingAddress: [
        shippingSnapshot?.address_line_1,
        shippingSnapshot?.address_line_2,
        shippingSnapshot?.city,
        shippingSnapshot?.state,
        shippingSnapshot?.country,
        shippingSnapshot?.postal_code,
      ]
        .filter(Boolean)
        .join(", "),

      items: (record.items || []).map((item: any) => ({
        itemName: item.product_name,

        hsn_code: item.hsn_code || item.hsn || "",

        quantity: item.qty,

        price: item.rate,

        discount: item.discount_percent,

        total: item.amount,
      })),

      subTotal: record.sub_total,

      discount: record.discount,

      cgst: record.cgst_percent,

      sgst: record.sgst_percent,

      igst: record.igst_percent,

      placeOfOrder: billingSnapshot?.state || shippingSnapshot?.state,

      transport: record.transport_charges,

      grandTotal: record.grand_total,

      validity_date: getValidityDate(record.validity_date),

      notes: record.notes,
    });
  };

  const handleDelete = (record: any) => {
    dispatch(deleteQuotation(record.id));
  };

  const handleView = (record: any) => {
    setSelectedQuotationId(record.id);
    setDetailsVisible(true);
  };

  const handleSend = () => {
    if (!selectedQuotationId) return;
    dispatch(
      sendQuotation({ id: selectedQuotationId, user_id: authState?.user?.id }),
    );
  };

  const columns = [
    {
      title: "Quotation #",
      dataIndex: "quotation_number",
      key: "quotation_number",
      width: 180,
      render: (value: any, record: any) => (
        <Button type="link" onClick={() => handleView(record)}>
          {value}
        </Button>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      width: 180,

      render: (_: any, record: any) => (
        <div>
          <div
            style={{
              fontWeight: 500,
            }}
          >
            {record.customer_name}
          </div>

          {record.company_name && (
            <div
              style={{
                fontSize: 12,
                color: "#8c8c8c",
              }}
            >
              {record.company_name}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Payment",
      dataIndex: "payment_details_snapshot",
      key: "payment_details_snapshot",
      width: 240,
      render: (_: any, record: any) => {
        const payment = parseJsonField(record.payment_details_snapshot) || {};
        if (!payment.bank_name && !payment.account_number) {
          return "-";
        }

        return (
          <div>
            {payment.bank_name && (
              <div style={{ fontWeight: 500 }}>{payment.bank_name}</div>
            )}
            {payment.account_holder_name && (
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                {payment.account_holder_name}
              </div>
            )}
            {payment.account_number && (
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                {payment.account_number}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Grand Total",
      dataIndex: "grand_total",
      key: "grand_total",
      width: 90,
      render: (value: any) => formatCurrency(value),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (status: string) => {
        const statusColor = getStatusColor(status);
        return (
          <Tag color={statusColor}>
            {status ? status.toUpperCase() : "UNKNOWN"}
          </Tag>
        );
      },
    },
    {
      title: "QT Expiry",
      dataIndex: "validity_date",
      key: "validity_date",
      width: 120,
      render: (value: string) =>
        value ? new Date(value).toISOString().split("T")[0] : "-",
    },
    {
      title: "Created By",
      dataIndex: "created_by",
      key: "created_by",
      width: 140,

      render: (_: any, record: any) => (
        <div>
          <div
            style={{
              fontWeight: 500,
            }}
          >
            {record.created_by_user.first_name}{" "}
            {record.created_by_user.last_name}
          </div>
        </div>
      ),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (value: string) =>
        value ? new Date(value).toLocaleString() : "-",
    },
    {
      title: "Updated By",
      dataIndex: "updated_by",
      key: "updated_by",
      width: 140,

      render: (_: any, record: any) => (
        <div>
          <div
            style={{
              fontWeight: 500,
            }}
          >
            {record.updated_by_user?.first_name}{" "}
            {record.updated_by_user?.last_name}
          </div>
        </div>
      ),
    },
    {
      title: "Updated At",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 180,
      render: (value: string) =>
        value ? new Date(value).toLocaleString() : "-",
    },
    {
      title: "Action",
      key: "action",
      fixed: "right" as const,
      width: 180,
      render: (_: any, record: any) => (
        <Space size="small">
          {can("quotation.download") && (
            <Button
              type="text"
              icon={<DownloadOutlined style={{ color: "#1890ff" }} />}
              loading={downloadingQuotationId === record.id}
              onClick={() => downloadQuotationPDF(record)}
            />
          )}
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: "#1890ff" }} />}
            onClick={() => handleView(record)}
          />
          {can("quotation.update") && (
            <Button
              type="text"
              icon={<EditOutlined style={{ color: "#1677ff" }} />}
              onClick={() => handleEdit(record)}
            />
          )}
          {can("quotation.delete") && (
            <Popconfirm
              title="Delete Quotation"
              description="Are you sure you want to delete this quotation?"
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const detailsItemsColumns = [
    {
      title: "Item",
      dataIndex: "product_name",
      key: "product_name",
      render: (text: string, record: any) =>
        record.product_name || record.itemName || record.description,
    },
    {
      title: "Qty",
      dataIndex: "qty",
      key: "qty",
      render: (value: any, record: any) => record.qty || record.quantity || 0,
    },
    {
      title: "Rate",
      dataIndex: "rate",
      key: "rate",
      render: (value: any) => formatCurrency(value),
    },
    {
      title: "Discount",
      dataIndex: "discount_amount",
      key: "discount_amount",
      render: (value: any, record: any) => {
        const discountAmount = Number(value ?? record.discount_amount ?? 0);
        const discountPercent = Number(record.discount_percent ?? 0);

        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>{formatCurrency(discountAmount)}</span>
            <Text type="secondary">{discountPercent}%</Text>
          </div>
        );
      },
    },
      {
      title: "Discounted Rate",
      dataIndex: "discounted_rate",
      key: "discounted_rate",
      render: (value: any, record: any) =>
        formatCurrency(record.discounted_rate || record.total || 0),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (value: any, record: any) =>
        formatCurrency(record.amount || record.total || 0),
    },
  ];

  const detailStatusColor = getStatusColor(selectedQuotation?.status);

  const shippingAddress =
    typeof selectedQuotation?.shipping_address_snapshot === "string"
      ? JSON.parse(selectedQuotation.shipping_address_snapshot)
      : selectedQuotation?.shipping_address_snapshot;

  const billingAddress =
    typeof selectedQuotation?.billing_address_snapshot === "string"
      ? JSON.parse(selectedQuotation.billing_address_snapshot)
      : selectedQuotation?.billing_address_snapshot;

  const businessSnapshot = (() => {
    try {
      return typeof selectedQuotation?.business_details_snapshot === "string"
        ? JSON.parse(selectedQuotation.business_details_snapshot)
        : selectedQuotation?.business_details_snapshot || {};
    } catch (error) {
      return selectedQuotation?.business_details_snapshot || {};
    }
  })();

  const paymentSnapshot = (() => {
    try {
      return typeof selectedQuotation?.payment_details_snapshot === "string"
        ? JSON.parse(selectedQuotation.payment_details_snapshot)
        : selectedQuotation?.payment_details_snapshot || {};
    } catch (error) {
      return selectedQuotation?.payment_details_snapshot || {};
    }
  })();

  const businessDetailsText = [
    businessSnapshot.businessName,
    typeof businessSnapshot.businessAddress === "string"
      ? businessSnapshot.businessAddress.replace(/\n/g, ", ")
      : undefined,
    businessSnapshot.businessPhone ? `Phone: ${businessSnapshot.businessPhone}` : undefined,
    businessSnapshot.businessEmail ? `Email: ${businessSnapshot.businessEmail}` : undefined,
    businessSnapshot.businessGST ? `GST: ${businessSnapshot.businessGST}` : undefined,
    ...(Array.isArray(businessSnapshot.businessMeta)
      ? businessSnapshot.businessMeta
          .filter((meta: any) => meta?.key && meta?.value)
          .map((meta: any) => `${meta.key}: ${meta.value}`)
      : []),
  ]
    .filter(Boolean)
    .join(" | ");


  return (
    <div style={{ padding: 10 }}>
      {showForm ? (
        <Card className="quotation-card" style={{ marginBottom: 24 }}>
          <div className="quotation-header">
            <div>
              <Title level={2}>Quotation</Title>
              <Text type="secondary">
                Create professional quotations for customers
              </Text>
            </div>
          </div>

          <Divider />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            autoComplete="off"
          >
            <Form.Item name="customerId" hidden>
              <Input type="hidden" />
            </Form.Item>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <BusinessDetails />
              </Col>
              <Col xs={24} md={12}>
                <CustomerDetails />
              </Col>
            </Row>

            <QuotationItems />
            <QuotationSummary />
            <PaymentDetails />

            <Form.Item style={{ marginTop: 24 }}>
              <Space wrap>
                {(editingQuotation ? can("quotation.update") : can("quotation.create")) && (
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={createLoading}
                  >
                    {editingQuotation ? "Save Changes" : "Save Quotation"}
                  </Button>
                )}
                <Button
                  type="default"
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    setEditingQuotation(null);
                    form.resetFields();
                    setShowForm(false);
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      ) : null}

      <Card
        title="Quotations"
        extra={
          can("quotation.create") && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setShowForm(true);
                setEditingQuotation(null);
                form.resetFields();
                // Auto-populate default terms from company
                if (companyDetails?.default_terms_conditions) {
                  form.setFieldsValue({
                    notes: companyDetails.default_terms_conditions,
                  });
                }
              }}
            >
              Add Quotation
            </Button>
          )
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Input
            placeholder="Search quotation number or customer"
            prefix={<SearchOutlined />}
            allowClear
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 320 }}
          />

          <Table
            columns={columns}
            dataSource={quotations?.map((quotation: any) => ({
              ...quotation,
              key: quotation.id,
            }))}
            pagination={false}
            loading={loading}
            bordered
            locale={{ emptyText: <Empty description="No quotations found" /> }}
            scroll={{ x: "max-content" }}
          />

          {pagination.total > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <div>
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, pagination.total)} of{" "}
                {pagination.total} records
              </div>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={pagination.total}
                showSizeChanger
                showQuickJumper
                pageSizeOptions={["5", "10", "25", "50"]}
                onChange={(newPage) => setPage(newPage)}
                onShowSizeChange={(_, size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          )}
        </Space>
      </Card>

      <Drawer
        title={selectedQuotation?.quotation_number || "Quotation Details"}
        placement="right"
        width={720}
        onClose={() => setDetailsVisible(false)}
        open={detailsVisible}
        footer={
          <Space>
            <Button onClick={() => setDetailsVisible(false)}>Close</Button>
              {can("quotation.send") && (
                <Button type="primary" loading={actionLoading} onClick={handleSend}>
                  Send Quotation
                </Button>
              )}
          </Space>
        }
      >
        {selectedQuotation ? (
          <Tabs defaultActiveKey="details">
            <TabPane tab="Details" key="details">
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="large"
              >
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Quotation Number">
                    {selectedQuotation.quotation_number}
                  </Descriptions.Item>
                  <Descriptions.Item label="GST Number">
                    {selectedQuotation.customer_gst_number}
                  </Descriptions.Item>
                  <Descriptions.Item label="Customer">
                    {selectedQuotation.contact_person_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Customer Email">
                    {selectedQuotation.contact_person_email}
                  </Descriptions.Item>
                  <Descriptions.Item label="Customer Number">
                    {selectedQuotation.contact_person_phone}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={detailStatusColor}>
                      {selectedQuotation.status || "N/A"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Version">
                    {selectedQuotation.version_number ?? 1}
                  </Descriptions.Item>
                  <Descriptions.Item label="Shipping Address">
                    {[
                      shippingAddress?.address_line_1,
                      shippingAddress?.address_line_2,
                      shippingAddress?.city,
                      shippingAddress?.state,
                      shippingAddress?.country,
                      shippingAddress?.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Billing Address">
                    {[
                      billingAddress?.address_line_1,
                      billingAddress?.address_line_2,
                      billingAddress?.city,
                      billingAddress?.state,
                      billingAddress?.country,
                      billingAddress?.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Business Details">
                    {businessDetailsText || "No business details available"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Payment Details">
                    {paymentSnapshot?.bank_name ? (
                      <div>
                        <div><strong>{paymentSnapshot.bank_name}</strong></div>
                        {paymentSnapshot.account_holder_name && <div>Account Holder: {paymentSnapshot.account_holder_name}</div>}
                        {paymentSnapshot.account_number && <div>Account #: {paymentSnapshot.account_number}</div>}
                        {paymentSnapshot.ifsc_code && <div>IFSC: {paymentSnapshot.ifsc_code}</div>}
                        {paymentSnapshot.branch_name && <div>Branch: {paymentSnapshot.branch_name}</div>}
                      </div>
                    ) : "No payment details available"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Created At">
                    {selectedQuotation.created_at
                      ? new Date(selectedQuotation.created_at).toLocaleString()
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Validity">
                    {selectedQuotation.validity ||
                      selectedQuotation.validity_date ||
                      "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Notes">
                    {selectedQuotation.notes || "No notes available"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Created By">
                    {`${selectedQuotation.created_by_user.first_name} ${selectedQuotation.created_by_user.last_name}` ||
                      "No notes available"}
                  </Descriptions.Item>
                </Descriptions>

                <Card title="Items" size="small">
                  <Table
                    size="small"
                    columns={detailsItemsColumns}
                    dataSource={(selectedQuotation.items || []).map(
                      (item: any, index: number) => ({ ...item, key: index }),
                    )}
                    pagination={false}
                  />
                </Card>

                <Card title="Summary" size="small">
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Sub Total">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>Subtotal</div>
                        <div style={{ fontWeight: 600 }}>{formatCurrency(
                          selectedQuotation?.sub_total ?? selectedQuotation?.subTotal ?? 0,
                        )}</div>
                      </div>
                    </Descriptions.Item>

                    <Descriptions.Item label="Discount">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>{Number(selectedQuotation?.discount_percent ?? 0)}%</div>
                        <div>{formatCurrency(selectedQuotation?.discount_amount ?? 0)}</div>
                      </div>
                    </Descriptions.Item>

                    {((selectedQuotation?.cgst_percent ?? 0) > 0 || (selectedQuotation?.cgst_amount ?? 0) > 0) && (
                      <Descriptions.Item label="CGST">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>{Number(selectedQuotation?.cgst_percent ?? 0)}%</div>
                          <div>{formatCurrency(selectedQuotation?.cgst_amount ?? 0)}</div>
                        </div>
                      </Descriptions.Item>
                    )}

                    {((selectedQuotation?.sgst_percent ?? 0) > 0 || (selectedQuotation?.sgst_amount ?? 0) > 0) && (
                      <Descriptions.Item label="SGST">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>{Number(selectedQuotation?.sgst_percent ?? 0)}%</div>
                          <div>{formatCurrency(selectedQuotation?.sgst_amount ?? 0)}</div>
                        </div>
                      </Descriptions.Item>
                    )}

                    {((selectedQuotation?.igst_percent ?? 0) > 0 || (selectedQuotation?.igst_amount ?? 0) > 0) && (
                      <Descriptions.Item label="IGST">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>{Number(selectedQuotation?.igst_percent ?? 0)}%</div>
                          <div>{formatCurrency(selectedQuotation?.igst_amount ?? 0)}</div>
                        </div>
                      </Descriptions.Item>
                    )}

                    <Descriptions.Item label="Transport Charges">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div />
                        <div>{formatCurrency(
                          selectedQuotation?.transport_charges ?? selectedQuotation?.transport ?? 0,
                        )}</div>
                      </div>
                    </Descriptions.Item>

                    <Descriptions.Item label="Grand Total">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div />
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{formatCurrency(
                          selectedQuotation?.grand_total ?? selectedQuotation?.grandTotal ?? 0,
                        )}</div>
                      </div>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Space>
            </TabPane>
            <TabPane tab="History" key="history">
              {quotationHistory.length ? (
                <List
                  dataSource={quotationHistory}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`Version ${item.version_number || item.id}${item.action_type ? ` — ${item.action_type}` : ""}`}
                        description={
                          <>
                            <div>
                              {item.change_reason || item.action_type || "Quotation snapshot saved"}
                            </div>
                            <div style={{ marginTop: 4, color: 'rgba(0,0,0,0.65)' }}>
                              {item.changed_by_user
                                ? `By ${item.changed_by_user.first_name || ''} ${item.changed_by_user.last_name || ''}`.trim()
                                : item.changed_by
                                ? `By user ${item.changed_by}`
                                : "By unknown user"}
                            </div>
                            <small>
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString()
                                : ""}
                            </small>
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="No history available" />
              )}
            </TabPane>
            <TabPane tab="Timeline" key="timeline">
              {quotationTimeline.length ? (
                <List
                  dataSource={quotationTimeline}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.action_type || item.type || "Event"}
                        description={
                          <>
                            <div>
                              {item.changed_by_user
                                ? `Changed by ${item.changed_by_user.first_name || ''} ${item.changed_by_user.last_name || ''}`.trim()
                                : item.changed_by
                                ? `Changed by user ${item.changed_by}`
                                : "Timeline event"}
                            </div>
                            <small>
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString()
                                : ""}
                            </small>
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="No timeline events" />
              )}
            </TabPane>
          </Tabs>
        ) : (
          <Empty description="Select a quotation to see details" />
        )}
      </Drawer>
    </div>
  );
};

export default QuotationPage;
