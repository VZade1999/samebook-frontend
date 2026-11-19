import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Grid, message, notification } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAccess } from "@/permissions/useAccess";
import { challanService } from "../services/challanService";
import { deliverChallan, dispatchChallan, getChallanDetails, getChallans } from "../redux/challanActions";
import ChallanFormModal from "../components/ChallanFormModal";
import { loadCompanyDetails, loadWarehouseMap } from "../constants";
import { ChallanHero, ChallanInsights, ChallanTiles } from "./view/Overview";
import { ChallanList, ChallanToolbar, type RowActions } from "./view/ChallanList";
import ChallanDrawer, { type DrawerActions } from "./view/ChallanDrawer";
import NewChallanModal, { type NewChallanChoice } from "./view/NewChallanModal";
import MakeInvoiceModal, { type InvoiceResult } from "./view/MakeInvoiceModal";
import RemoveChallanModal, { type RemoveMode } from "./view/RemoveChallanModal";
import { errorText, isToInvoice, isTransfer } from "./view/shared";
import type { ChallanSummaryData, InvoiceTarget } from "./view/types";
import "@/modules/dashboard/styles/dashboard.scss";
import "@/modules/quotation/styles/quotation.scss";
import "@/modules/invoice/styles/invoice.scss";
import "../styles/challan.scss";

const INSIGHTS_KEY = "dc_insights_open";
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
const reasonOf = (e: any, fallback: string) => (typeof e === "string" && e ? e : e?.message || fallback);

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

const invoiceTargetOf = (c: any): InvoiceTarget => ({
  id: Number(c.id),
  challan_number: c.challan_number,
  customer_name: c.customer_name,
  quotation_number: c.quotation_number,
  total_value: c.total_value,
  quotation_invoice_number: c.quotation_invoice_number ?? null,
});

interface FormState {
  open: boolean;
  challan?: any;
  quotationId?: number | null;
  reason?: string | null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ChallanPage = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { can } = useAccess();
  const today = useMemo(() => dayjs().startOf("day"), []);
  const listTopRef = useRef<HTMLDivElement>(null);

  const canCreate = can("challans.create");
  const canEdit = can("challans.edit");
  const canDispatch = can("challans.dispatch");
  const canConvert = can("challans.convert");
  const canDelete = can("challans.delete");
  const canQuotations = can("quotations.view");
  const canInvoices = can("invoices.view");

  // The consignor block in the details: the company profile (with GSTIN).
  const [company, setCompany] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    loadCompanyDetails()
      .then((c) => alive && setCompany(c || {}))
      .catch(() => alive && setCompany({}));
    return () => {
      alive = false;
    };
  }, []);

  // ── List filters: kept in the URL so refresh / back / links keep them ──────
  const filter = (searchParams.get("status") || "").toUpperCase();
  const sort = searchParams.get("sort") || "newest";
  const reason = (searchParams.get("reason") || "").toUpperCase();
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

  const scrollToList = () => listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const applyFilter = useCallback(
    (key: string) => {
      setParams({ status: key || null });
      setPage(1);
      scrollToList();
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
  const st = useSelector((state: any) => state.challans);
  const cacheGen: number = st?.cacheGen ?? 0;
  const rows: any[] = Array.isArray(st?.list) ? st.list : [];
  const pagination = st?.pagination || {};
  const loading = !!st?.loading;
  const refreshing = !!st?.refreshing;
  const details = st?.details;
  const detailsLoading = !!st?.detailsLoading;
  const detailsError = st?.detailsError;

  // ── Data: the list, and the summary above it ──────────────────────────────
  const listParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search || undefined,
      status: filter || undefined,
      reason: reason || undefined,
      sort: sort !== "newest" ? sort : undefined,
    }),
    [page, pageSize, search, filter, reason, sort],
  );
  const fetchList = useCallback(() => {
    dispatch(getChallans(listParams))
      .unwrap()
      .catch((e: any) => message.error({ key: "dc-list", content: reasonOf(e, "The challans didn't load. Please try again.") }));
  }, [dispatch, listParams]);
  // cacheGen moves on every quotation / invoice / challan change: refetch the
  // list with THIS page's filters.
  useEffect(() => {
    fetchList();
  }, [fetchList, cacheGen]);

  const [summary, setSummary] = useState<ChallanSummaryData | null>(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const summaryReq = useRef(0);
  const loadSummary = useCallback(() => {
    const id = ++summaryReq.current;
    challanService
      .getSummary(tzMinutes())
      .then((res: any) => {
        if (id !== summaryReq.current) return;
        if (res?.data?.success && res.data.data) {
          setSummary(res.data.data);
          setSummaryFailed(false);
        } else setSummaryFailed(true);
      })
      .catch(() => id === summaryReq.current && setSummaryFailed(true));
  }, []);
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
      dispatch(getChallanDetails(id));
    },
    [dispatch],
  );
  const reloadIfOpen = useCallback(
    (id: number) => {
      if (detailsVisible && selectedId === id) dispatch(getChallanDetails(id));
    },
    [detailsVisible, selectedId, dispatch],
  );

  // Until fresh details for the opened challan arrive, show its list row
  // (never another challan) and keep the actions that change it disabled.
  const freshDetails = details && Number(details.id) === Number(selectedId) ? details : null;
  const drawerC = freshDetails || rows.find((r) => Number(r.id) === Number(selectedId)) || null;
  const drawerStale = !freshDetails || detailsLoading;

  // A challan that can't be opened (deleted, or a bad link): say so and close.
  useEffect(() => {
    if (!detailsVisible || detailsLoading || !detailsError || freshDetails) return;
    notification.error({ title: "Couldn't open that challan", description: typeof detailsError === "string" ? detailsError : "It may have been deleted." });
    setDetailsVisible(false);
  }, [detailsVisible, detailsLoading, detailsError, freshDetails]);

  // Destination address for a stock transfer (needs warehouses.view; quietly skipped without it).
  const [warehouseMap, setWarehouseMap] = useState<Record<string, any>>({});
  const transferOpen = !!drawerC && isTransfer(drawerC);
  useEffect(() => {
    if (transferOpen) loadWarehouseMap().then(setWarehouseMap);
  }, [transferOpen]);

  // ── Dialogs and busy flags ────────────────────────────────────────────────
  const [chooser, setChooser] = useState<{ open: boolean; startWith?: "quotation" | "customer" | "transfer" }>({ open: false });
  const [form, setForm] = useState<FormState>({ open: false });
  const [invoiceTarget, setInvoiceTarget] = useState<InvoiceTarget | null>(null);
  const [remove, setRemove] = useState<{ target: any | null; mode: RemoveMode }>({ target: null, mode: "cancel" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const openNew = useCallback((startWith?: "quotation" | "customer" | "transfer") => setChooser({ open: true, startWith }), []);
  const startFromQuotation = useCallback((quotationId: number) => setForm({ open: true, quotationId }), []);

  // Deep links: /app/delivery-challans?open=<id> (old /delivery-challans/<id>
  // links land here too), ?new=1, and ?fromQuotation=<id> from the quotation page.
  useEffect(() => {
    const openId = Number(searchParams.get("open"));
    const isNew = searchParams.get("new") === "1";
    const fromQuotation = Number(searchParams.get("fromQuotation")) || null;
    if (!openId && !isNew && !fromQuotation) return;
    setParams({ open: null, new: null, fromQuotation: null });
    if (openId) openDetails(openId);
    else if (!canCreate) message.warning("You don't have permission to make delivery challans");
    else if (fromQuotation) startFromQuotation(fromQuotation);
    else openNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const run = useCallback(
    async (c: any, thunk: any, done: string, failTitle: string) => {
      setBusyId(c.id);
      try {
        await dispatch(thunk).unwrap();
        message.success(done);
        reloadIfOpen(Number(c.id));
        return true;
      } catch (e: any) {
        notification.error({ title: failTitle, description: reasonOf(e, "Please try again.") });
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [dispatch, reloadIfOpen],
  );
  const doDispatch = useCallback((c: any) => run(c, dispatchChallan(c.id), `${c.challan_number} is on its way`, "Couldn't dispatch it"), [run]);
  const doDeliver = useCallback((c: any) => run(c, deliverChallan(c.id), `${c.challan_number} marked as delivered`, "Couldn't mark it delivered"), [run]);

  const download = useCallback(async (c: any, valued = false) => {
    setDownloadingId(c.id);
    try {
      // jsPDF loads only for this action, keeping it out of the first page load.
      const { downloadChallanPDF } = await import("../pdf/challanPdf");
      await downloadChallanPDF(
        c,
        async (id: number) => (await challanService.getChallan(id))?.data?.data,
        { showValues: valued },
      );
    } catch (e: any) {
      notification.error({ title: "Download failed", description: errorText(e, "Couldn't make the challan PDF") });
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const copyNumber = useCallback(async (c: any) => {
    if (await copyText(c.challan_number)) message.success(`${c.challan_number} copied`);
    else message.error("Couldn't copy — select the number and copy it by hand");
  }, []);

  // The form needs the full challan (items, addresses): use fresh details when open, else fetch.
  const openEdit = useCallback(
    async (c: any) => {
      if (freshDetails && Number(freshDetails.id) === Number(c.id) && Array.isArray(freshDetails.items)) {
        setForm({ open: true, challan: freshDetails });
        return;
      }
      setBusyId(c.id);
      try {
        const res: any = await challanService.getChallan(c.id);
        if (res?.data?.data) setForm({ open: true, challan: res.data.data });
        else notification.error({ title: "Couldn't open the draft", description: res?.data?.message || "Please try again." });
      } catch (e: any) {
        notification.error({ title: "Couldn't open the draft", description: errorText(e) });
      } finally {
        setBusyId(null);
      }
    },
    [freshDetails],
  );

  // Opens the quotation's own panel (falls back to searching its number).
  const openQuotation = useCallback(
    (c: { quotation_id?: number | null; quotation_number?: string | null }) =>
      c.quotation_id
        ? navigate(`/app/quotation?open=${c.quotation_id}`)
        : c.quotation_number && navigate(`/app/quotation?q=${encodeURIComponent(c.quotation_number)}`),
    [navigate],
  );
  const openInvoice = useCallback((c: { invoice_id?: number | null }) => c.invoice_id && navigate(`/app/invoice?open=${c.invoice_id}`), [navigate]);

  const onPick = (choice: NewChallanChoice) => {
    setChooser({ open: false });
    if (choice.kind === "quotation") setForm({ open: true, quotationId: choice.quotationId });
    else if (choice.kind === "transfer") setForm({ open: true, reason: "STOCK_TRANSFER" });
    else setForm({ open: true });
  };

  // "Make invoice": a challan from a quotation is billed at the quotation's
  // prices (the dialog); one made without a quotation opens the invoice
  // editor filled with its customer and goods (prices and GST are chosen there).
  const startInvoice = useCallback(
    (c: any) => {
      if (!c) return;
      if (c.quotation_id || c.quotation_number) return setInvoiceTarget(invoiceTargetOf(c));
      if (!can("invoices.create")) {
        message.warning("Billing a challan made without a quotation needs permission to create invoices");
        return;
      }
      navigate(`/app/invoice?direct=1&challan=${c.id}`);
    },
    [can, navigate],
  );

  const onInvoiced = (result: InvoiceResult, target: InvoiceTarget) => {
    setInvoiceTarget(null);
    const inv = result.invoice;
    const n = result.converted_challan_ids?.length || 1;
    const key = `dc-inv-${target.id}`;
    notification.success({
      key,
      title: inv ? (result.invoice_generated ? `Invoice ${inv.invoice_number} created` : `Linked to invoice ${inv.invoice_number}`) : "Invoiced",
      description:
        n > 1
          ? `${n} challans of ${target.quotation_number || "the quotation"} are now marked invoiced.`
          : `${target.challan_number} is now marked invoiced.`,
      actions:
        canInvoices && inv ? (
          <button
            type="button"
            className="qp-btn primary sm"
            onClick={() => {
              notification.destroy(key);
              navigate(`/app/invoice?open=${inv.id}`);
            }}
          >
            Open invoice
          </button>
        ) : undefined,
    });
    reloadIfOpen(target.id);
  };

  const onRemoved = (c: any, mode: RemoveMode) => {
    setRemove({ target: null, mode });
    message.success(`${c.challan_number} ${mode === "delete" ? "deleted" : "cancelled"}`);
    if (Number(selectedId) === Number(c.id)) {
      if (mode === "delete") setDetailsVisible(false);
      else reloadIfOpen(Number(c.id));
    }
  };

  // ── Row / drawer actions ──────────────────────────────────────────────────
  const rowActions: RowActions = useMemo(
    () => ({
      canEdit,
      canDispatch,
      canConvert,
      canDelete,
      onDispatch: doDispatch,
      onDeliver: doDeliver,
      onInvoice: startInvoice,
      onDownload: download,
      onCopyNumber: copyNumber,
      onEdit: openEdit,
      onCancel: (c) => setRemove({ target: c, mode: "cancel" }),
      onDelete: (c) => setRemove({ target: c, mode: "delete" }),
      onOpenQuotation: canQuotations ? openQuotation : undefined,
      onOpenInvoice: canInvoices ? openInvoice : undefined,
      busyId,
      downloadingId,
    }),
    [canEdit, canDispatch, canConvert, canDelete, doDispatch, doDeliver, startInvoice, download, copyNumber, openEdit, canQuotations, openQuotation, canInvoices, openInvoice, busyId, downloadingId],
  );

  const status = drawerC?.status;
  const drawerActions: DrawerActions = {
    canDispatch: !!drawerC && canDispatch && status === "DRAFT",
    canDeliver: !!drawerC && canDispatch && status === "DISPATCHED",
    canInvoice: !!drawerC && canConvert && isToInvoice(drawerC),
    canEdit: !!drawerC && canEdit && status === "DRAFT",
    canCancel: !!drawerC && canDispatch && ["DRAFT", "DISPATCHED", "DELIVERED"].includes(status),
    canDelete: !!drawerC && canDelete && status === "DRAFT",
    onDispatch: () => drawerC && doDispatch(drawerC),
    onDeliver: () => drawerC && doDeliver(drawerC),
    onInvoice: () => drawerC && startInvoice(drawerC),
    onEdit: () => drawerC && openEdit(drawerC),
    onCancel: () => drawerC && setRemove({ target: drawerC, mode: "cancel" }),
    onDelete: () => drawerC && setRemove({ target: drawerC, mode: "delete" }),
    onDownload: (valued) => drawerC && download(drawerC, valued),
    onCopyNumber: () => drawerC && copyNumber(drawerC),
    onOpenQuotation: canQuotations && drawerC?.quotation_number ? () => openQuotation(drawerC) : undefined,
    onOpenInvoice: canInvoices && drawerC?.invoice_id ? () => openInvoice(drawerC) : undefined,
    busy: !!drawerC && busyId === drawerC.id,
    downloading: !!drawerC && downloadingId === drawerC.id,
  };

  const total = Number(pagination.total || 0);
  return (
    <div className="db-root qp-root ip-root dc-root">
      <ChallanHero
        s={summary}
        failed={summaryFailed}
        companyName={company?.name}
        canCreate={canCreate}
        canQuotations={canQuotations}
        onNew={() => openNew()}
        onFilter={applyFilter}
        onQuotations={() => navigate("/app/quotation")}
        onRetry={loadSummary}
        onBacklog={canCreate && summary?.backlog.quotations ? () => openNew("quotation") : undefined}
      />
      <ChallanTiles s={summary} onFilter={applyFilter} />
      {summary && (
        <ChallanInsights
          s={summary}
          open={insightsOpen}
          onToggle={toggleInsights}
          onFilter={applyFilter}
          onOpenChallan={openDetails}
          onDeliver={canDispatch ? (it) => doDeliver(it) : undefined}
          onDispatch={canDispatch ? (it) => doDispatch(it) : undefined}
          deliveringId={busyId}
          onInvoice={
            canConvert
              ? (it) =>
                  !it.quotation_id && !it.quotation_number
                    ? startInvoice(it)
                    : setInvoiceTarget({
                        id: it.id,
                        challan_number: it.challan_number,
                        customer_name: it.customer_name,
                        quotation_number: it.quotation_number,
                        total_value: it.total_value,
                        quotation_invoice_number: it.invoice_number,
                      })
              : undefined
          }
          onSendQuotation={(id, number) => {
            if (canCreate) startFromQuotation(id);
            else if (canQuotations) openQuotation({ quotation_number: number });
          }}
          onAllBacklog={canCreate ? () => openNew("quotation") : undefined}
        />
      )}

      <div ref={listTopRef} style={{ scrollMarginTop: 12 }} />
      <ChallanToolbar
        summary={summary}
        filter={filter}
        onFilter={applyFilter}
        search={searchInput}
        onSearch={setSearchInput}
        reason={reason}
        onReason={(v) => {
          setParams({ reason: v || null });
          setPage(1);
        }}
        sort={sort}
        onSort={(v) => {
          setParams({ sort: v === "newest" ? null : v });
          setPage(1);
        }}
        loading={loading || refreshing}
        onRefresh={refreshAll}
      />
      <ChallanList
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
          scrollToList();
        }}
        filtered={!!filter || !!search || !!reason}
        onClear={() => {
          setSearchInput("");
          setParams({ q: null, status: null, reason: null });
          setPage(1);
        }}
        selectedId={detailsVisible ? selectedId : null}
        onOpen={(c) => openDetails(c.id)}
        actions={rowActions}
        today={today}
        isMobile={isMobile}
        canCreate={canCreate}
        onNew={() => openNew()}
      />

      <ChallanDrawer
        open={detailsVisible}
        c={drawerC}
        fromCache={drawerStale}
        company={company}
        toWarehouse={drawerC?.to_warehouse_id ? warehouseMap[String(drawerC.to_warehouse_id)] : undefined}
        actions={drawerActions}
        onClose={() => setDetailsVisible(false)}
        isMobile={isMobile}
        today={today}
      />

      <NewChallanModal open={chooser.open} startWith={chooser.startWith} onCancel={() => setChooser({ open: false })} onPick={onPick} />

      <ChallanFormModal
        open={form.open}
        challan={form.challan}
        quotationId={form.quotationId}
        initialReason={form.reason}
        onClose={() => setForm({ open: false })}
        onSaved={(saved: any) => {
          const wasEdit = !!form.challan?.id;
          setForm({ open: false });
          if (saved?.id) {
            if (wasEdit) reloadIfOpen(Number(saved.id));
            else openDetails(Number(saved.id));
          }
        }}
      />

      <MakeInvoiceModal target={invoiceTarget} onCancel={() => setInvoiceTarget(null)} onDone={onInvoiced} />

      <RemoveChallanModal target={remove.target} mode={remove.mode} onCancel={() => setRemove((r) => ({ ...r, target: null }))} onDone={onRemoved} />
    </div>
  );
};

export default ChallanPage;
