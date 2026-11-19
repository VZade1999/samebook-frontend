import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Form, Grid, Spin, message, notification } from "antd";
import { FileSyncOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ASYNC_GENERATE_INVOICE_SUCCESS, ASYNC_SEND_INVOICE_SUCCESS, getInvoiceDetails, getInvoiceTimeline, getInvoices } from "../redux/invoiceActions";
import QuotationEditor from "@/modules/quotation/pages/view/QuotationEditor";
import { customerFormFields } from "@/modules/quotation/pages/components/CustomerDetails";
import { documentPayload } from "@/modules/quotation/pages/view/payload";
import { joinAddr } from "@/modules/quotation/pages/view/shared";
import CustomerApi from "@/modules/customers/redux";
import { getCustomers } from "@/modules/customers/redux/customerActions";
import { challanService } from "@/modules/delivery-challan/services/challanService";
import { invalidateSeries } from "@/modules/numbering/numberingService";
import InvoiceService from "../services/invoiceService";
import { StorageService } from "@/storage";
import { useAccess } from "@/permissions/useAccess";
import { InvoiceHero, InvoiceInsights, InvoiceTiles } from "./view/Overview";
import { InvoiceList, InvoiceToolbar, type RowActions } from "./view/InvoiceList";
import InvoiceDrawer, { type DrawerActions } from "./view/InvoiceDrawer";
import RecordPaymentModal, { type PayTarget } from "./view/RecordPaymentModal";
import NewInvoiceModal from "./view/NewInvoiceModal";
import { balanceOf, errorText, isOpen, parseJsonField, rupees, shortDate, stateOf } from "./view/shared";
import CancelInvoiceModal from "./view/CancelInvoiceModal";
import DispatchModal from "./view/DispatchModal";
import { useSalesFlow } from "@/modules/companies/salesFlow/salesFlow";
import type { InvoiceSummaryData } from "./view/types";
import "@/modules/dashboard/styles/dashboard.scss";
import "@/modules/quotation/styles/quotation.scss";
import "../styles/invoice.scss";

const INSIGHTS_KEY = "inv_insights_open";
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
const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const DISPATCH_FIELDS = ["vehicle_number", "transporter_name", "lr_number", "eway_bill_number"] as const;

/** Clipboard with a fallback for browsers that block the async API. */
const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
};

/** A polite reminder to paste into WhatsApp or email (nothing is sent from here). */
const reminderText = (inv: any, companyName?: string) => {
  const due = inv.due_date ? dayjs(String(inv.due_date).slice(0, 10)) : null;
  const late = !!due && due.isBefore(dayjs(), "day");
  const bank = parseJsonField(inv.payment_details_snapshot) || {};
  const lines: (string | null)[] = [
    `Dear ${inv.contact_person_name || inv.customer_name || "Sir / Madam"},`,
    "",
    `This is a gentle reminder about invoice ${inv.invoice_number} dated ${shortDate(inv.invoice_date)} for ${rupees(inv.grand_total)}.`,
    due ? (late ? `The payment was due on ${shortDate(due)}.` : `The payment is due on ${shortDate(due)}.`) : null,
    Number(inv.paid_amount) > 0 ? `We have received ${rupees(inv.paid_amount)} so far — thank you.` : null,
    `Balance due: ${rupees(balanceOf(inv))}.`,
    ...(bank.bank_name
      ? [
          "",
          "You can pay by bank transfer to:",
          `Bank: ${bank.bank_name}`,
          bank.account_holder_name ? `Account name: ${bank.account_holder_name}` : null,
          bank.account_number ? `Account number: ${bank.account_number}` : null,
          bank.ifsc_code ? `IFSC: ${bank.ifsc_code}` : null,
        ]
      : []),
    "",
    "Please ignore this message if you have already paid.",
    "",
    "Thank you,",
    companyName || null,
  ];
  return lines.filter((l) => l !== null).join("\n");
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const InvoicePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const service = useMemo(() => new InvoiceService(), []);
  const storage = useMemo(() => new StorageService(), []);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { can } = useAccess();
  // "Services only": nothing travels, so no dispatch details to add.
  const { hideChallans } = useSalesFlow();
  const insights = can("invoices.insides");
  const today = useMemo(() => dayjs().startOf("day"), []);
  const listTopRef = useRef<HTMLDivElement>(null);

  const company = useMemo(() => {
    try {
      return JSON.parse(storage.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}");
    } catch {
      return {};
    }
  }, [storage]);

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
  const invoiceState = useSelector((state: any) => state.invoice);
  const cacheGen: number = invoiceState?.cacheGen ?? 0;
  const data = invoiceState?.invoices || {};
  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];
  const pagination = data?.pagination || {};
  const loading = !!invoiceState?.loading;
  const selectedInvoice = invoiceState?.selectedInvoice;
  const detailsFromCache = !!invoiceState?.detailsFromCache;
  const invoiceTimeline: any[] = invoiceState?.invoiceTimeline || [];

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
  const fetchList = useCallback(() => dispatch(getInvoices(listParams)), [dispatch, listParams]);
  // cacheGen moves on every quotation / invoice / challan change: refetch the
  // list with THIS page's filters.
  useEffect(() => {
    fetchList();
  }, [fetchList, cacheGen]);

  const [summary, setSummary] = useState<InvoiceSummaryData | null>(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const summaryReq = useRef(0);
  const loadSummary = useCallback(() => {
    if (!insights) return;
    const id = ++summaryReq.current;
    service
      .getSummary(tzMinutes())
      .then((res: any) => {
        if (id !== summaryReq.current) return;
        if (res?.data?.success && res.data.data) {
          setSummary(res.data.data);
          setSummaryFailed(false);
        } else setSummaryFailed(true);
      })
      .catch(() => id === summaryReq.current && setSummaryFailed(true));
  }, [service, insights]);
  useEffect(() => {
    loadSummary();
  }, [loadSummary, cacheGen]);

  const refreshAll = () => {
    fetchList();
    loadSummary();
  };

  // ── Details drawer ────────────────────────────────────────────────────────
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const openDetails = useCallback(
    (id: number) => {
      setSelectedId(id);
      setDetailsVisible(true);
      dispatch(getInvoiceDetails(id));
      dispatch(getInvoiceTimeline(id));
    },
    [dispatch],
  );
  const reloadIfOpen = useCallback(
    (id: number) => {
      if (detailsVisible && selectedId === id) openDetails(id);
    },
    [detailsVisible, selectedId, openDetails],
  );

  // ── Dialogs and busy flags ────────────────────────────────────────────────
  const [payingInv, setPayingInv] = useState<PayTarget | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [presetQuotation, setPresetQuotation] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [cancellingInv, setCancellingInv] = useState<any>(null);
  const [dispatchInv, setDispatchInv] = useState<any>(null);

  const openNew = useCallback((quotationId?: number | null) => {
    setPresetQuotation(quotationId || null);
    setNewOpen(true);
  }, []);

  // ── An invoice without a quotation: the quotation editor, saving an invoice ─
  // (a walk-in sale, or billing a challan made without a quotation).
  const [form] = Form.useForm();
  const [direct, setDirect] = useState<{ challan: any | null } | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const [savingDirect, setSavingDirect] = useState(false);

  const openDirect = useCallback(
    async (challanId?: number | null) => {
      setNewOpen(false);
      setDetailsVisible(false);
      form.resetFields();
      form.setFieldsValue({
        invoice_date: dayjs(),
        payment_due_date: dayjs().add(30, "day"),
        ...(company?.default_terms_conditions ? { notes: company.default_terms_conditions } : {}),
      });
      setDirect({ challan: null });
      scrollContentTop();
      if (!challanId) return;
      setPrefilling(true);
      try {
        const c = (await challanService.getChallan(challanId))?.data?.data;
        if (!c?.id) throw new Error("That challan wasn't found");
        if (c.quotation_id) throw new Error(`${c.challan_number} was made from quotation ${c.quotation_number || ""} — bill it from that quotation`);
        if (c.invoice_id) throw new Error(`${c.challan_number} is already billed${c.invoice_number ? ` on ${c.invoice_number}` : ""}`);
        if (!c.customer_id) throw new Error(`${c.challan_number} has no customer to bill`);
        const customer = (await new CustomerApi().getCustomerDetails(c.customer_id))?.data?.data;
        if (!customer?.id) throw new Error("The challan's customer wasn't found");
        const base = customerFormFields(customer);
        const fields: Record<string, any> = { ...base.fields };
        // The addresses the challan used, when they are still the customer's records.
        const own = (snap: any) => {
          const id = Number(parseJsonField(snap)?.id);
          return id ? (customer.addresses || []).find((a: any) => Number(a.id) === id) || null : null;
        };
        const billTo = own(c.billing_address_snapshot);
        const shipTo = own(c.shipping_address_snapshot);
        if (billTo) {
          Object.assign(fields, {
            billingAddressId: billTo.id,
            billingAddress: joinAddr(billTo),
            billingAddressSnapshot: JSON.stringify(billTo),
            placeOfOrder: billTo.state,
            customerGSTN: customer.gst_number || billTo.gst_number,
          });
        }
        if (shipTo) Object.assign(fields, { shippingAddressId: shipTo.id, shippingAddress: joinAddr(shipTo), shippingAddressSnapshot: JSON.stringify(shipTo) });
        const items = (c.items || []).map((it: any) => {
          const quantity = Number(it.quantity) || 0;
          const price = Number(it.rate) || 0;
          return { itemName: it.item_name, hsn_code: it.hsn_code || "", unit: it.unit || "", quantity, price, discount: 0, discounted_price: price, total: round2(quantity * price) };
        });
        form.setFieldsValue({
          ...fields,
          items,
          subTotal: round2(items.reduce((s: number, i: any) => s + i.total, 0)),
          // Not before the goods went out.
          ...(c.challan_date && dayjs().isBefore(dayjs(c.challan_date), "day") ? { invoice_date: dayjs(c.challan_date) } : {}),
        });
        // Load the customer into the picker so contacts / addresses can be switched.
        dispatch(getCustomers({ search: customer.display_name, page: 1, limit: 10 }));
        setDirect({ challan: c });
      } catch (e: any) {
        notification.warning({ title: "Couldn't fill in the challan", description: e?.response ? errorText(e) : e?.message || "Please pick the customer and items yourself." });
      } finally {
        setPrefilling(false);
      }
    },
    [form, company, dispatch],
  );

  const closeDirect = () => {
    setDirect(null);
    form.resetFields();
    scrollContentTop();
  };

  const saveDirect = async (values: any) => {
    if (!direct) return;
    if (!(values.items || []).length) {
      notification.error({ title: "No items added", description: "Add at least one item." });
      document.getElementById("qf-items")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const p = documentPayload(values);
    if (!p.customer_id || !p.billing_address_id) {
      notification.error({ title: "Pick the customer", description: "Choose the customer and their billing address." });
      document.getElementById("qf-customer")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const dispatchDetails = Object.fromEntries(DISPATCH_FIELDS.map((k) => [k, text(values[k])]).filter(([, v]) => v));
    const body = {
      customer_id: p.customer_id,
      contact_person_id: p.contact_person_id || undefined,
      billing_address_id: p.billing_address_id,
      shipping_address_id: p.shipping_address_id || undefined,
      issuing_location_id: p.issuing_location_id || undefined,
      business_details_snapshot: p.business_details_snapshot,
      payment_details_snapshot: p.payment_details_snapshot,
      items: p.items,
      discount_amount: round2(p.discount_amount),
      cgst_percent: p.cgst_percent,
      sgst_percent: p.sgst_percent,
      igst_percent: p.igst_percent,
      transport_charges: p.transport_charges,
      notes: p.notes || undefined,
      invoice_date: values.invoice_date ? dayjs(values.invoice_date).format("YYYY-MM-DD") : undefined,
      payment_due_date: dayjs(values.payment_due_date).format("YYYY-MM-DD"),
      ...(values.series_id ? { series_id: values.series_id } : {}),
      ...dispatchDetails,
      ...(direct.challan?.id ? { challan_ids: [Number(direct.challan.id)] } : {}),
    };
    setSavingDirect(true);
    try {
      const res: any = await service.createDirect(body);
      const id = Number(res?.data?.data?.id);
      if (!res?.data?.success || !id) throw new Error(res?.data?.message || "The invoice wasn't created");
      message.success(res.data.message || "Invoice created");
      dispatch({ type: ASYNC_GENERATE_INVOICE_SUCCESS });
      invalidateSeries();
      closeDirect();
      openDetails(id);
    } catch (e: any) {
      notification.error({ title: "The invoice wasn't created", description: e?.response ? errorText(e) : e?.message || "Please try again." });
    } finally {
      setSavingDirect(false);
    }
  };

  // Deep links: /app/invoice?open=<id> (old /app/invoice-details/<id> links
  // land here too), /app/invoice?new=1&quotation=<id>, and
  // /app/invoice?direct=1&challan=<id> (bill a challan made without a quotation).
  useEffect(() => {
    const openId = Number(searchParams.get("open"));
    const isNew = searchParams.get("new") === "1";
    const isDirect = searchParams.get("direct") === "1";
    if (!openId && !isNew && !isDirect) return;
    const quotationId = Number(searchParams.get("quotation")) || null;
    const challanId = Number(searchParams.get("challan")) || null;
    setParams({ open: null, new: null, quotation: null, direct: null, challan: null });
    if (openId) openDetails(openId);
    else if (!can("invoices.create")) return;
    else if (isDirect) openDirect(challanId);
    else openNew(quotationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const send = useCallback(
    async (inv: any) => {
      setSendingId(inv.id);
      try {
        const res: any = await service.sendInvoice(inv.id);
        if (res?.data?.success) {
          message.success(res.data.message || "Marked as sent");
          dispatch({ type: ASYNC_SEND_INVOICE_SUCCESS });
          reloadIfOpen(inv.id);
        } else {
          notification.error({ title: "Couldn't mark it as sent", description: res?.data?.message || "Please try again." });
        }
      } catch (e: any) {
        notification.error({ title: "Couldn't mark it as sent", description: errorText(e) });
      } finally {
        setSendingId(null);
      }
    },
    [service, dispatch, reloadIfOpen],
  );

  const download = useCallback(
    async (inv: any, copies: "original" | "all" = "original") => {
      setDownloadingId(inv.id);
      try {
        // jsPDF loads only for this action, keeping it out of the first page load.
        const { downloadInvoicePDF } = await import("@/utils/downloadPdf/downloadInvoicePDF");
        await downloadInvoicePDF(inv, (id: number) => service.getInvoiceDetails(id), { copies });
      } catch (e: any) {
        notification.error({ title: "Download failed", description: e?.message || "Unable to make the invoice PDF" });
      } finally {
        setDownloadingId(null);
      }
    },
    [service],
  );

  const copyNumber = useCallback(async (inv: any) => {
    if (await copyText(inv.invoice_number)) message.success(`${inv.invoice_number} copied`);
    else message.error("Couldn't copy — select the number and copy it by hand");
  }, []);

  const copyReminder = useCallback(
    async (inv: any) => {
      try {
        // The list leaves out bank details; the details call has them.
        const full = inv.payment_details_snapshot !== undefined ? inv : (await service.getInvoiceDetails(inv.id))?.data?.data || inv;
        if (await copyText(reminderText(full, company?.name))) {
          message.success("Reminder copied — paste it into WhatsApp or email");
        } else {
          message.error("Couldn't copy the reminder");
        }
      } catch (e: any) {
        notification.error({ title: "Couldn't make the reminder", description: errorText(e) });
      }
    },
    [service, company],
  );

  // Opens the quotation's own panel (falls back to searching its number).
  const openQuotation = useCallback(
    (inv: { quotation_id?: number | null; quotation_number?: string | null }) =>
      inv.quotation_id
        ? navigate(`/app/quotation?open=${inv.quotation_id}`)
        : inv.quotation_number && navigate(`/app/quotation?q=${encodeURIComponent(inv.quotation_number)}`),
    [navigate],
  );

  // ── Row / drawer actions ──────────────────────────────────────────────────
  const canEdit = can("invoices.edit");
  const canQuotations = can("quotations.view");
  const rowActions: RowActions = useMemo(
    () => ({
      canPay: (inv) => canEdit && isOpen(inv),
      canSend: (inv) => canEdit && stateOf(inv) !== "cancelled",
      canExport: true,
      onPay: (inv) => setPayingInv(inv),
      onSend: send,
      onDownload: download,
      onCopyNumber: copyNumber,
      onCopyReminder: copyReminder,
      onOpenQuotation: canQuotations ? openQuotation : undefined,
      sendingId,
      downloadingId,
    }),
    [canEdit, canQuotations, send, download, copyNumber, copyReminder, openQuotation, sendingId, downloadingId],
  );

  // Until fresh details for the opened invoice arrive, show its list row
  // (never another invoice) and keep the money actions disabled.
  const freshDetails = selectedInvoice && Number(selectedInvoice.id) === Number(selectedId) ? selectedInvoice : null;
  const drawerInv = freshDetails || rows.find((r) => Number(r.id) === Number(selectedId)) || null;
  const drawerStale = !freshDetails || detailsFromCache;
  const drawerTimeline = freshDetails ? invoiceTimeline.filter((x) => x?.invoice_id === undefined || Number(x.invoice_id) === Number(selectedId)) : [];
  const drawerActions: DrawerActions = {
    canPay: !!drawerInv && canEdit && isOpen(drawerInv),
    canSend: !!drawerInv && canEdit && stateOf(drawerInv) !== "cancelled",
    canCancel: !!drawerInv && can("invoices.delete") && stateOf(drawerInv) !== "cancelled",
    onCancelInvoice: () => drawerInv && !drawerStale && setCancellingInv(drawerInv),
    onEditDispatch:
      drawerInv && canEdit && !hideChallans && stateOf(drawerInv) !== "cancelled" ? () => !drawerStale && setDispatchInv(drawerInv) : undefined,
    canExport: true,
    onPay: () => drawerInv && !drawerStale && setPayingInv(drawerInv),
    onSend: () => drawerInv && send(drawerInv),
    onDownload: (copies) => drawerInv && download(drawerInv, copies),
    onCopyReminder: () => drawerInv && copyReminder(drawerInv),
    onOpenQuotation: canQuotations && drawerInv?.quotation_number ? () => openQuotation(drawerInv) : undefined,
    sending: !!drawerInv && sendingId === drawerInv.id,
    downloading: !!drawerInv && downloadingId === drawerInv.id,
  };

  // ── Editor mode: an invoice without a quotation ───────────────────────────
  if (direct) {
    const c = direct.challan;
    const lines = Array.isArray(c?.items) ? c.items.length : 0;
    return (
      <div className="db-root qp-root ip-root">
        <QuotationEditor
          mode="invoice"
          form={form}
          editing={null}
          saving={savingDirect}
          canSave={can("invoices.create")}
          loadingDetails={prefilling}
          onFinish={saveDirect}
          onCancel={closeDirect}
          // Billing a challan: the goods already travelled on it (its vehicle / e-way bill print from there).
          showDispatch={!hideChallans && !c}
          banner={
            c ? (
              <div className="qf-banner" role="status">
                <FileSyncOutlined />
                <span>
                  Bills challan <b>{c.challan_number}</b>
                  {c.challan_date ? ` of ${shortDate(c.challan_date)}` : ""} — its customer and {lines} item{lines === 1 ? "" : "s"} are filled in.
                  <small>Check the prices and add the GST. Saving links the challan to this invoice.</small>
                </span>
              </div>
            ) : prefilling ? (
              <div className="qf-banner" role="status">
                <Spin size="small" /> <span>Filling in the challan…</span>
              </div>
            ) : null
          }
        />
      </div>
    );
  }

  const total = Number(pagination.total || 0);
  return (
    <div className="db-root qp-root ip-root">
      <InvoiceHero
        s={summary}
        insights={insights}
        failed={summaryFailed}
        companyName={company?.name}
        canCreate={can("invoices.create")}
        canQuotations={canQuotations}
        onNew={() => openNew()}
        onFilter={applyFilter}
        onQuotations={() => navigate("/app/quotation")}
        onRetry={loadSummary}
      />
      {insights && <InvoiceTiles s={summary} onFilter={applyFilter} />}
      {insights && summary && (
        <InvoiceInsights
          s={summary}
          open={insightsOpen}
          onToggle={toggleInsights}
          onFilter={applyFilter}
          onOpenInvoice={openDetails}
          onPay={canEdit ? (it) => setPayingInv(it) : undefined}
          onCustomer={(name) => {
            setSearchInput(name);
            setParams({ q: name, status: null });
            setPage(1);
            listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}

      <div ref={listTopRef} style={{ scrollMarginTop: 12 }} />
      <InvoiceToolbar
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
      <InvoiceList
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
        selectedId={detailsVisible ? selectedId : null}
        onOpen={(inv) => openDetails(inv.id)}
        actions={rowActions}
        today={today}
        isMobile={isMobile}
        canCreate={can("invoices.create")}
        onNew={() => openNew()}
      />

      <InvoiceDrawer
        open={detailsVisible}
        inv={drawerInv}
        fromCache={drawerStale}
        timeline={drawerTimeline}
        actions={drawerActions}
        onClose={() => setDetailsVisible(false)}
        isMobile={isMobile}
        today={today}
      />

      <RecordPaymentModal
        inv={payingInv}
        onCancel={() => setPayingInv(null)}
        onRecorded={(r) => {
          const id = Number(r?.invoice_id ?? payingInv?.id);
          setPayingInv(null);
          if (id) reloadIfOpen(id);
        }}
      />

      <CancelInvoiceModal
        inv={cancellingInv}
        onCancel={() => setCancellingInv(null)}
        onDone={(msg) => {
          const id = Number(cancellingInv?.id);
          setCancellingInv(null);
          message.success(msg);
          if (id) reloadIfOpen(id);
        }}
      />

      <DispatchModal
        inv={dispatchInv}
        onCancel={() => setDispatchInv(null)}
        onDone={(msg) => {
          const id = Number(dispatchInv?.id);
          setDispatchInv(null);
          message.success(msg);
          if (id) reloadIfOpen(id);
        }}
      />

      <NewInvoiceModal
        open={newOpen}
        presetQuotationId={presetQuotation}
        onCancel={() => setNewOpen(false)}
        onCreated={(inv) => {
          setNewOpen(false);
          if (inv?.id) openDetails(Number(inv.id));
        }}
        onFixQuotation={(q) => navigate(`/app/quotation?q=${encodeURIComponent(q.quotation_number)}`)}
        onDirect={can("invoices.create") ? () => openDirect() : undefined}
      />
    </div>
  );
};

export default InvoicePage;
