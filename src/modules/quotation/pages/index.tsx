import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Form, Grid, Modal, message, notification } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  approveQuotation,
  createQuotation,
  deleteQuotation,
  getQuotationDetails,
  getQuotationHistory,
  getQuotationTimeline,
  getQuotations,
  quotationClosed,
  quotationReopened,
  sendQuotation,
  updateQuotation,
} from "../redux/quotationActions";
import QuotationService from "../redux";
import { customerFormFields } from "./components/CustomerDetails";
import CustomerApi from "@/modules/customers/redux";
import { StorageService } from "@/storage";
import { getCustomers } from "@/modules/customers/redux/customerActions";
import { useAccess } from "@/permissions/useAccess";
import { QuotationHero, QuotationInsights, QuotationTiles } from "./view/Overview";
import { QuotationList, QuotationToolbar, type RowActions } from "./view/QuotationList";
import QuotationDrawer, { type DrawerActions } from "./view/QuotationDrawer";
import QuotationEditor from "./view/QuotationEditor";
import CloseQuotationModal from "./view/CloseQuotationModal";
import {
  canApproveStatus,
  canChallanStatus,
  canCloseStatus,
  canReopenStatus,
  canSendStatus,
  getValidityDate,
  isClosed,
  joinAddr,
  parseJsonField,
} from "./view/shared";
import type { QuotationSummaryData } from "./view/types";
import "@/modules/dashboard/styles/dashboard.scss";
import "../styles/quotation.scss";

const INSIGHTS_KEY = "qt_insights_open";
// Open by default on wide screens; on a phone they would push the list far
// down, so they start folded there. An explicit choice is remembered.
const readInsightsOpen = () => {
  try {
    const v = localStorage.getItem(INSIGHTS_KEY);
    if (v === "0" || v === "1") return v === "1";
  } catch {
    /* fall through to the default */
  }
  return typeof window === "undefined" || window.innerWidth >= 768;
};
const tzMinutes = () => -new Date().getTimezoneOffset();
const scrollContentTop = () => document.querySelector(".dashboard-content")?.scrollTo({ top: 0 });

// ─── Main Page ────────────────────────────────────────────────────────────────
const QuotationPage = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const storageService = useMemo(() => new StorageService(), []);
  const quotationService = useMemo(() => new QuotationService(), []);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { can } = useAccess();
  const today = useMemo(() => dayjs().startOf("day"), []);
  const listTopRef = useRef<HTMLDivElement>(null);

  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  useEffect(() => {
    const stored = storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
    const user = storageService.getItem(StorageService.STORAGE_KEYS.USER_DETAILS);
    if (stored && user) {
      try {
        setCompanyDetails(JSON.parse(stored));
        setUserDetails(JSON.parse(user));
      } catch {
        /* handled at save time */
      }
    }
  }, [storageService]);

  // ── List filters: kept in the URL so refresh / back / links keep them ──────
  const filter = (searchParams.get("status") || "").toUpperCase();
  const sort = searchParams.get("sort") || "newest";
  const search = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const setParams = useCallback(
    (patch: Record<string, string | null>) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  // The text box updates instantly; the URL (which drives the fetch) after a pause.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput.trim() !== search) {
        setParams({ q: searchInput.trim() || null });
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const applyFilter = useCallback(
    (key: string) => {
      setParams({ status: key || null });
      setPage(1);
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [setParams],
  );

  const [insightsOpen, setInsightsOpen] = useState(readInsightsOpen);
  const toggleInsights = () =>
    setInsightsOpen((v) => {
      try {
        localStorage.setItem(INSIGHTS_KEY, v ? "0" : "1");
      } catch {
        /* not remembered */
      }
      return !v;
    });

  // ── Redux state ───────────────────────────────────────────────────────────
  const quotationState = useSelector((state: any) => state.quotations);
  const authState = useSelector((state: any) => state.authn);
  const cacheGen: number = quotationState?.cacheGen ?? 0;
  const quotationData = quotationState?.quotations || {};
  const rows: any[] = quotationData?.rows || [];
  const pagination = quotationData?.pagination || {};
  const loading = !!quotationState?.loading;
  const createLoading = !!quotationState?.createLoading;
  const actionLoading = !!quotationState?.actionLoading;
  const deleteLoading = !!quotationState?.deleteLoading;
  const selectedQuotation = quotationState?.selectedQuotation;
  // true while the drawer shows the browser-cached copy and fresh data is on its way
  const detailsFromCache = !!quotationState?.detailsFromCache;
  const quotationHistory: any[] = quotationState?.quotationHistory || [];
  const quotationTimeline: any[] = quotationState?.quotationTimeline || [];

  const [editingQuotation, setEditingQuotation] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(null);
  const [downloadingQuotationId, setDownloadingQuotationId] = useState<number | null>(null);
  const [deletingQuotationId, setDeletingQuotationId] = useState<number | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [closingQ, setClosingQ] = useState<any>(null);
  const [reopeningId, setReopeningId] = useState<number | null>(null);
  const returnToRef = useRef<string | null>(null);

  useEffect(() => {
    if (!actionLoading) setActingId(null);
  }, [actionLoading]);

  const prevDeleteLoadingRef = useRef<boolean>(deleteLoading);
  useEffect(() => {
    if (prevDeleteLoadingRef.current && !deleteLoading) setDeletingQuotationId(null);
    prevDeleteLoadingRef.current = deleteLoading;
  }, [deleteLoading]);

  // ── Data: the list, and the summary above it ──────────────────────────────
  const listParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search || undefined,
      status: filter || undefined,
      sort: sort !== "newest" ? sort : undefined,
      tz: tzMinutes(),
    }),
    [page, pageSize, search, filter, sort],
  );
  const fetchList = useCallback(() => dispatch(getQuotations(listParams)), [dispatch, listParams]);
  // cacheGen moves on every quotation / invoice / challan change: refetch the
  // list with THIS page's filters (the sagas reload it without any).
  useEffect(() => {
    fetchList();
  }, [fetchList, cacheGen]);

  const [summary, setSummary] = useState<QuotationSummaryData | null>(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const summaryReq = useRef(0);
  const loadSummary = useCallback(() => {
    const id = ++summaryReq.current;
    quotationService
      .getSummary(tzMinutes())
      .then((res: any) => {
        if (id !== summaryReq.current) return;
        if (res?.data?.success && res.data.data) {
          setSummary(res.data.data);
          setSummaryFailed(false);
        } else setSummaryFailed(true);
      })
      .catch(() => id === summaryReq.current && setSummaryFailed(true));
  }, [quotationService]);
  useEffect(() => {
    loadSummary();
  }, [loadSummary, cacheGen]);

  const refreshAll = () => {
    fetchList();
    loadSummary();
  };

  // ── Saved → back to the list (or to where the editor was opened from) ─────
  const prevCreateLoadingRef = useRef<boolean>(createLoading);
  useEffect(() => {
    if (prevCreateLoadingRef.current && !createLoading && !quotationState.error) {
      setShowForm(false);
      setEditingQuotation(null);
      form.resetFields();
      scrollContentTop();
      // Opened from elsewhere (e.g. a CRM lead): go back there once saved.
      const back = returnToRef.current;
      returnToRef.current = null;
      if (back) navigate(back);
    }
    prevCreateLoadingRef.current = createLoading;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createLoading, quotationState.error]);

  // ── Edit: fill the form from the fresh details once they arrive ───────────
  useEffect(() => {
    if (!editingQuotation || !selectedQuotation) return;
    // Never fill the edit form from the browser cache: wait for fresh data.
    if (detailsFromCache) return;
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
        itemName: item.product_name,
        hsn_code: item.hsn_code || item.hsn || "",
        unit: item.unit || item.uom || "",
        quantity: item.qty,
        price: item.rate,
        discount: item.discount_percent,
        discounted_price: item.discounted_rate ?? item.discounted_price,
        total: item.total ?? item.amount,
      })),
      subTotal: selectedQuotation.sub_total,
      discount: selectedQuotation.discount,
      cgst: selectedQuotation.cgst_percent,
      sgst: selectedQuotation.sgst_percent,
      igst: selectedQuotation.igst_percent,
      placeOfOrder: billingSnapshot?.state || shippingSnapshot?.state,
      issuing_location_id: selectedQuotation.issuing_location_id,
      transport: selectedQuotation.transport_charges,
      grandTotal: selectedQuotation.grand_total,
      validity_date: getValidityDate(selectedQuotation.validity_date),
      notes: selectedQuotation.notes,
    });
  }, [editingQuotation, selectedQuotation, detailsFromCache, form]);

  const downloadQuotationPDF = useCallback(
    async (quotation: any) => {
      setDownloadingQuotationId(quotation.id);
      try {
        // jsPDF + autoTable load only for this action, keeping them out of
        // the first page load.
        const { downloadQuotationPDF: downloadQuotationPDFHelper } = await import("../components/quotationPdf");
        await downloadQuotationPDFHelper(quotation, async (id: number) => quotationService.getQuotationDetails(id));
      } catch (err: any) {
        notification.error({ message: "Download failed", description: err?.message || "Unable to generate the quotation PDF" });
      } finally {
        setDownloadingQuotationId(null);
      }
    },
    [quotationService],
  );

  const handleFinish = (values: any) => {
    // userDetails only populates once both COMPANY_DETAILS and USER_DETAILS
    // exist in storage; surface it instead of failing silently.
    if (!userDetails?.id) {
      notification.error({
        message: "Session data missing",
        description: "Your session details couldn't be loaded. Please refresh the page and try again.",
      });
      return;
    }
    const customerId = values.customerId;
    const userId = userDetails.id;
    const itemsRaw = values.items || [];
    if (!itemsRaw.length) {
      notification.error({ message: "No items added", description: "Please add at least one item." });
      document.getElementById("qf-items")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const items = itemsRaw.map((item: any) => ({
      product_name: item?.itemName,
      hsn_code: item?.hsn_code,
      unit: item?.unit,
      qty: Number(item?.quantity || item?.qty || 0),
      rate: Number(item?.price || item?.rate || 0),
      discount_percent: Number(item?.discount || 0),
    }));
    const subTotal = Number(values.subTotal || 0);
    const discountPercent = Number(values.discount || 0);
    const discountAmount = Number(values.discount_amount ?? (subTotal * discountPercent) / 100);
    const taxableAmount = subTotal - discountAmount;
    const cgstPercent = Number(values.cgst || 0),
      sgstPercent = Number(values.sgst || 0),
      igstPercent = Number(values.igst || 0);
    const cgstAmount = (taxableAmount * cgstPercent) / 100,
      sgstAmount = (taxableAmount * sgstPercent) / 100,
      igstAmount = (taxableAmount * igstPercent) / 100;
    const transportCharges = Number(values.transport || 0);
    const grandTotal = Number(values.grandTotal || taxableAmount + cgstAmount + sgstAmount + igstAmount + transportCharges);
    const storedCD = storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
    const currentCompanyId =
      companyDetails?.id ||
      (storedCD
        ? (() => {
            try {
              return JSON.parse(storedCD)?.id;
            } catch {
              return undefined;
            }
          })()
        : undefined);
    const basePayload: any = {
      customer_id: Number(customerId) || undefined,
      user_id: Number(userId) || undefined,
      contact_person_id: values.contactPersonId,
      billing_address_id: values.billingAddressId,
      shipping_address_id: values.shippingAddressId,
      issuing_location_id: values.issuing_location_id,
      customer_name: values.customerName,
      customer_type: values.customerType,
      customer_gst_number: values.customerGSTN,
      contact_person_name: values.customerName,
      contact_person_email: values.customerEmail,
      contact_person_phone: values.customerPhone,
      billing_address_snapshot: parseJsonField(values.billingAddressSnapshot),
      shipping_address_snapshot: parseJsonField(values.shippingAddressSnapshot),
      business_details_snapshot: values.businessDetailsSnapshot ? parseJsonField(values.businessDetailsSnapshot) : undefined,
      payment_details_snapshot: values.paymentBankId
        ? JSON.stringify({
            bank_id: values.paymentBankId,
            bank_name: values.paymentBankName,
            account_holder_name: values.paymentAccountHolder,
            account_number: values.paymentAccountNumber,
            ifsc_code: values.paymentIFSC,
            branch_name: values.paymentBranchName,
            branch_address: values.paymentBranchAddress,
            account_type: values.paymentAccountType,
            is_default: values.paymentIsDefault,
          })
        : undefined,
      validity_date: values.validity_date ? values.validity_date.toISOString() : undefined,
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
    if (editingQuotation) {
      // The editor stays open until the save is confirmed (see the
      // createLoading effect): a failed update must not fall through to
      // "create" on retry or drop what the user typed.
      dispatch(updateQuotation({ ...basePayload, id: editingQuotation.id }));
    } else {
      const missing: string[] = [];
      if (!basePayload.customer_id) missing.push("a customer");
      if (!currentCompanyId) missing.push("company details");
      if (!basePayload.user_id) missing.push("login");
      if (missing.length) {
        notification.error({ message: "Missing details", description: `Please provide ${missing.join(" and ")}.` });
        if (!basePayload.customer_id) document.getElementById("qf-customer")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      dispatch(
        createQuotation({
          ...basePayload,
          company_id: currentCompanyId,
          quotation_date: new Date().toISOString(),
          ...(values.series_id ? { series_id: values.series_id } : {}),
        }),
      );
    }
  };

  const openDetails = useCallback(
    (id: number) => {
      setSelectedQuotationId(id);
      setDetailsVisible(true);
      dispatch(getQuotationDetails(id));
      dispatch(getQuotationHistory(id));
      dispatch(getQuotationTimeline(id));
    },
    [dispatch],
  );
  const handleView = useCallback((record: any) => openDetails(record.id), [openDetails]);

  const handleEdit = useCallback(
    (record: any) => {
      setDetailsVisible(false);
      setEditingQuotation(record);
      setSelectedQuotationId(record.id);
      dispatch(getCustomers({ search: record.customer_name, page: 1, limit: 10 }));
      dispatch(getQuotationDetails(record.id));
      setShowForm(true);
      scrollContentTop();
      const bs = parseJsonField(record.billing_address_snapshot) || {};
      const ss = parseJsonField(record.shipping_address_snapshot) || {};
      const biz = parseJsonField(record.business_details_snapshot) || {};
      const pay = parseJsonField(record.payment_details_snapshot) || {};
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
        billingAddressSnapshot: JSON.stringify(bs),
        shippingAddressSnapshot: JSON.stringify(ss),
        businessDetailsSnapshot: JSON.stringify(biz),
        paymentBankId: pay.bank_id,
        paymentBankName: pay.bank_name,
        paymentAccountHolder: pay.account_holder_name,
        paymentAccountNumber: pay.account_number,
        paymentIFSC: pay.ifsc_code,
        paymentBranchName: pay.branch_name,
        paymentBranchAddress: pay.branch_address,
        paymentAccountType: pay.account_type,
        paymentIsDefault: pay.is_default,
        businessName: biz.businessName ?? record.company_name ?? "",
        selectedAddress: Array.isArray(biz.selectedAddress) ? biz.selectedAddress : [],
        selectedLocation: Array.isArray(biz.selectedLocation) ? biz.selectedLocation : [],
        selectedPhones: Array.isArray(biz.selectedPhones) ? biz.selectedPhones : [],
        selectedEmails: Array.isArray(biz.selectedEmails) ? biz.selectedEmails : [],
        businessAddress: biz.businessAddress ?? joinAddr(bs),
        businessGST: biz.businessGST ?? "",
        businessPhone: biz.businessPhone ?? "",
        businessEmail: biz.businessEmail ?? "",
        businessMeta: Array.isArray(biz.businessMeta) ? biz.businessMeta : [],
        billingAddress: joinAddr(bs),
        shippingAddress: joinAddr(ss),
        items: (record.items || []).map((item: any) => ({
          itemName: item.product_name,
          hsn_code: item.hsn_code || "",
          unit: item.unit || "",
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
        placeOfOrder: bs?.state || ss?.state,
        issuing_location_id: record.issuing_location_id,
        transport: record.transport_charges,
        grandTotal: record.grand_total,
        validity_date: getValidityDate(record.validity_date),
        notes: record.notes,
      });
    },
    [dispatch, form],
  );

  const handleDelete = useCallback(
    (record: any) => {
      setDeletingQuotationId(record.id);
      dispatch(deleteQuotation(record.id));
    },
    [dispatch],
  );

  // Send / approve run from a row or the drawer; actingId tracks which
  // quotation the single busy flag belongs to.
  const userId = authState?.user?.id;
  const sendById = useCallback(
    (id: number) => {
      setActingId(id);
      dispatch(sendQuotation({ id, user_id: userId }));
    },
    [dispatch, userId],
  );
  const approveById = useCallback(
    (id: number) => {
      setActingId(id);
      dispatch(approveQuotation({ id, user_id: userId }));
    },
    [dispatch, userId],
  );
  const handleCreateChallan = useCallback((record: any) => navigate(`/app/delivery-challans?fromQuotation=${record.id}`), [navigate]);

  // ── Close (rejected / expired, with feedback) and reopen ──────────────────
  // Both mark a billing change, so the list and summary refetch; an open
  // drawer on that quotation reloads too.
  const afterOutcomeChange = useCallback(
    (id: number, kind: "closed" | "reopened") => {
      dispatch(kind === "closed" ? quotationClosed(id) : quotationReopened(id));
      if (detailsVisible && selectedQuotationId === id) openDetails(id);
    },
    [dispatch, detailsVisible, selectedQuotationId, openDetails],
  );
  const reopen = useCallback(
    async (record: any) => {
      setReopeningId(record.id);
      try {
        const res: any = await quotationService.reopenQuotation(record.id);
        if (res?.data?.success) {
          message.success(res.data.message || "Quotation reopened");
          afterOutcomeChange(record.id, "reopened");
        } else {
          notification.error({ message: "Couldn't reopen", description: res?.data?.message || "Please try again." });
        }
      } catch (e: any) {
        notification.error({ message: "Couldn't reopen", description: e?.response?.data?.message || e?.message || "Please try again." });
      } finally {
        setReopeningId(null);
      }
    },
    [quotationService, afterOutcomeChange],
  );
  const confirmReopen = useCallback(
    (record: any) =>
      Modal.confirm({
        title: `Reopen ${record.quotation_number}?`,
        content: "It goes back to where it was before it was closed (draft, sent or approved), and the close reason is cleared. The history keeps it.",
        okText: "Reopen",
        onOk: () => reopen(record),
      }),
    [reopen],
  );

  const closeForm = () => {
    setEditingQuotation(null);
    form.resetFields();
    setShowForm(false);
    returnToRef.current = null;
    scrollContentTop();
  };
  const openCreate = () => {
    setDetailsVisible(false);
    setShowForm(true);
    setEditingQuotation(null);
    form.resetFields();
    scrollContentTop();
    if (companyDetails?.default_terms_conditions) form.setFieldsValue({ notes: companyDetails.default_terms_conditions });
  };

  // Deep link: /app/quotation?new=1&customer=<id>&returnTo=/app/... opens a
  // new quotation with that customer filled in (used by the CRM's "Create
  // quotation"), then returns to returnTo once it's saved.
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    const customerId = Number(searchParams.get("customer")) || null;
    const back = searchParams.get("returnTo");
    returnToRef.current = back && back.startsWith("/app/") && !back.startsWith("//") ? back : null;
    const rest = new URLSearchParams(searchParams);
    ["new", "customer", "returnTo"].forEach((k) => rest.delete(k));
    setSearchParams(rest, { replace: true });

    openCreate();
    let terms: string | undefined;
    try {
      terms = JSON.parse(storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.default_terms_conditions;
    } catch {
      terms = undefined;
    }
    if (terms && !form.getFieldValue("notes")) form.setFieldsValue({ notes: terms });
    if (!customerId) return;
    new CustomerApi()
      .getCustomerDetails(customerId)
      .then((res: any) => {
        const customer = res?.data?.data;
        if (!customer?.id) throw new Error("not found");
        form.setFieldsValue(customerFormFields(customer).fields);
        // Load it into the customer picker so contacts / addresses can be switched.
        dispatch(getCustomers({ search: customer.display_name, page: 1, limit: 10 }));
      })
      .catch(() =>
        notification.warning({
          message: "Customer not loaded",
          description: "Pick the customer in the form to continue.",
        }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Row / drawer actions ──────────────────────────────────────────────────
  const canExport = can("quotations.export");
  const rowActions: RowActions = useMemo(
    () => ({
      canSend: (q) => can("quotations.send") && canSendStatus(q),
      canApprove: (q) => can("quotations.send") && canApproveStatus(q),
      canChallan: (q) => can("challans.create") && canChallanStatus(q),
      canEdit: (q) => can("quotations.edit") && !q.has_invoice && !isClosed(q),
      canDelete: (q) => can("quotations.delete") && q.status === "DRAFT",
      canClose: (q) => can("quotations.edit") && canCloseStatus(q),
      canReopen: (q) => can("quotations.edit") && canReopenStatus(q),
      canExport,
      onSend: (q) => sendById(q.id),
      onApprove: (q) => approveById(q.id),
      onChallan: handleCreateChallan,
      onDownload: downloadQuotationPDF,
      onEdit: handleEdit,
      onDelete: handleDelete,
      onClose: setClosingQ,
      onReopen: confirmReopen,
      actingId,
      downloadingId: downloadingQuotationId,
      deletingId: deletingQuotationId,
    }),
    [can, canExport, sendById, approveById, handleCreateChallan, downloadQuotationPDF, handleEdit, handleDelete, confirmReopen, actingId, downloadingQuotationId, deletingQuotationId],
  );

  // Until fresh details for the opened quotation arrive, show its list row
  // (never another quotation) and keep the actions disabled.
  const freshDetails = selectedQuotation && selectedQuotation.id === selectedQuotationId ? selectedQuotation : null;
  const drawerQ = freshDetails || rows.find((r) => r.id === selectedQuotationId) || null;
  const drawerStale = !freshDetails || detailsFromCache;
  const ofThisQuotation = (list: any[]) => (freshDetails ? list.filter((x) => x?.quotation_id === undefined || Number(x.quotation_id) === Number(selectedQuotationId)) : []);
  const drawerActions: DrawerActions = {
    canSend: !!drawerQ && can("quotations.send") && canSendStatus(drawerQ),
    canApprove: !!drawerQ && can("quotations.send") && canApproveStatus(drawerQ),
    canChallan: !!drawerQ && can("challans.create") && canChallanStatus(drawerQ),
    canEdit: !!drawerQ && can("quotations.edit") && !drawerQ.has_invoice && !isClosed(drawerQ),
    canDelete: !!drawerQ && can("quotations.delete") && drawerQ.status === "DRAFT",
    canClose: !!drawerQ && can("quotations.edit") && canCloseStatus(drawerQ),
    canReopen: !!drawerQ && can("quotations.edit") && canReopenStatus(drawerQ),
    canExport,
    onSend: () => drawerQ && sendById(drawerQ.id),
    onApprove: () => drawerQ && approveById(drawerQ.id),
    onChallan: () => drawerQ && handleCreateChallan(drawerQ),
    onDownload: () => drawerQ && downloadQuotationPDF(drawerQ),
    onEdit: () => drawerQ && handleEdit(drawerQ),
    onDelete: () => {
      if (!drawerQ) return;
      handleDelete(drawerQ);
      setDetailsVisible(false);
    },
    onClose: () => drawerQ && setClosingQ(drawerQ),
    onReopen: () => drawerQ && reopen(drawerQ),
    reopening: !!drawerQ && reopeningId === drawerQ.id,
    acting: !!drawerQ && actingId === drawerQ.id && actionLoading,
    downloading: !!drawerQ && downloadingQuotationId === drawerQ.id,
  };

  const company = (() => {
    try {
      return JSON.parse(storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}");
    } catch {
      return {};
    }
  })();

  // ── Editor mode ───────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="db-root qp-root">
        <QuotationEditor
          form={form}
          editing={editingQuotation}
          saving={createLoading}
          canSave={editingQuotation ? can("quotations.edit") : can("quotations.create")}
          loadingDetails={!!editingQuotation && (detailsFromCache || selectedQuotation?.id !== editingQuotation.id)}
          onFinish={handleFinish}
          onCancel={closeForm}
        />
      </div>
    );
  }

  // ── List mode ─────────────────────────────────────────────────────────────
  const total = Number(pagination.total || 0);
  return (
    <div className="db-root qp-root">
      <QuotationHero
        s={summary}
        failed={summaryFailed}
        companyName={company?.name}
        canCreate={can("quotations.create")}
        canInvoices={can("invoices.view")}
        onNew={openCreate}
        onFilter={applyFilter}
        onInvoices={() => navigate("/app/invoice")}
        onRetry={loadSummary}
      />
      <QuotationTiles s={summary} onFilter={applyFilter} />
      {summary && (
        <QuotationInsights
          s={summary}
          open={insightsOpen}
          onToggle={toggleInsights}
          onFilter={applyFilter}
          onOpenQuotation={openDetails}
          onCloseQuotation={can("quotations.edit") ? setClosingQ : undefined}
          onCustomer={(name) => {
            setSearchInput(name);
            setParams({ q: name, status: null });
            setPage(1);
            listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}

      <div ref={listTopRef} style={{ scrollMarginTop: 12 }} />
      <QuotationToolbar
        summary={summary}
        filter={filter}
        onFilter={applyFilter}
        search={searchInput}
        onSearch={setSearchInput}
        sort={sort}
        onSort={(v) => {
          setParams({ sort: v === "newest" ? null : v });
          setPage(1);
        }}
        loading={loading}
        onRefresh={refreshAll}
      />
      <QuotationList
        rows={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPage={(p, size) => {
          if (size !== pageSize) {
            setPageSize(size);
            setPage(1);
          } else setPage(p);
          listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        filtered={!!filter || !!search}
        onClear={() => {
          setSearchInput("");
          setParams({ q: null, status: null });
          setPage(1);
        }}
        selectedId={detailsVisible ? selectedQuotationId : null}
        onOpen={handleView}
        actions={rowActions}
        today={today}
        isMobile={isMobile}
        canCreate={can("quotations.create")}
        onNew={openCreate}
      />

      <QuotationDrawer
        open={detailsVisible}
        q={drawerQ}
        fromCache={drawerStale}
        history={ofThisQuotation(quotationHistory)}
        timeline={ofThisQuotation(quotationTimeline)}
        actions={drawerActions}
        onClose={() => setDetailsVisible(false)}
        isMobile={isMobile}
        today={today}
      />

      <CloseQuotationModal
        q={closingQ}
        onCancel={() => setClosingQ(null)}
        onClosed={(fresh) => {
          const id = Number(fresh?.id ?? closingQ?.id);
          setClosingQ(null);
          if (id) afterOutcomeChange(id, "closed");
        }}
      />
    </div>
  );
};

export default QuotationPage;
