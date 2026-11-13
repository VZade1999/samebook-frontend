import { useCallback, useEffect, useRef, useState } from "react";
import { notification } from "antd";
import { crmService } from "./services/crmService";
import { CRM_CHANGED_EVENT, CrmMeta, CrmSummary, emitCrmChanged } from "./constants";

// Meta (people, permissions, integrations) rarely changes — one shared
// request, refreshed at most once a minute.
let metaCache: { at: number; promise: Promise<CrmMeta> } | null = null;
const loadMeta = (force = false) => {
  if (!force && metaCache && Date.now() - metaCache.at < 60_000) return metaCache.promise;
  const promise = crmService
    .meta()
    .then((r) => r.data.data as CrmMeta)
    .catch((e) => {
      metaCache = null;
      throw e;
    });
  metaCache = { at: Date.now(), promise };
  return promise;
};
export const refreshCrmMeta = () => loadMeta(true);

const EMPTY_META: CrmMeta = {
  me: 0,
  users: [],
  integrations: [],
  can: {
    create: false,
    manage: false,
    quotations_view: false,
    quotations_create: false,
    customers_view: false,
    customers_create: false,
  },
};

export const useCrmMeta = () => {
  const [meta, setMeta] = useState<CrmMeta | null>(null);
  useEffect(() => {
    let alive = true;
    loadMeta()
      .then((m) => alive && setMeta(m))
      .catch(() => alive && setMeta(EMPTY_META));
    return () => {
      alive = false;
    };
  }, []);
  return meta;
};

// Sidebar badge, reminder and pages ask at the same moment: share one request.
let summaryInFlight: { at: number; promise: Promise<CrmSummary> } | null = null;
const fetchSummary = () => {
  if (summaryInFlight && Date.now() - summaryInFlight.at < 2000) return summaryInFlight.promise;
  const promise = crmService.summary().then((r) => r.data.data as CrmSummary);
  summaryInFlight = { at: Date.now(), promise };
  return promise;
};

/** My follow-up counts; refreshes on focus, every 5 minutes and after changes. */
export const useCrmSummary = (enabled = true) => {
  const [summary, setSummary] = useState<CrmSummary | null>(null);
  const load = useCallback(() => {
    if (!enabled) return;
    fetchSummary()
      .then(setSummary)
      .catch(() => undefined);
  }, [enabled]);
  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60_000);
    window.addEventListener("focus", load);
    window.addEventListener(CRM_CHANGED_EVENT, load);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", load);
      window.removeEventListener(CRM_CHANGED_EVENT, load);
    };
  }, [load]);
  return { summary, reload: load };
};

const AUTO_SYNC_KEY = "crm_auto_sync_at";

/**
 * Opening the CRM fetches new IndiaMART enquiries when the last fetch is old
 * (the server decides; this only avoids asking more than every 10 minutes per tab).
 */
export const useAutoSync = () => {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    try {
      const last = Number(sessionStorage.getItem(AUTO_SYNC_KEY) || 0);
      if (Date.now() - last < 10 * 60_000) return;
      sessionStorage.setItem(AUTO_SYNC_KEY, String(Date.now()));
    } catch {
      // storage blocked: still sync once per page load
    }
    crmService
      .autoSync()
      .then((r) => {
        const d = r.data?.data;
        if (d && (d.created || d.merged)) {
          emitCrmChanged();
          notification.success({
            key: "crm-auto-sync",
            message: d.created ? `${d.created} new lead${d.created === 1 ? "" : "s"} from IndiaMART` : "New enquiries from IndiaMART",
            description: d.merged ? `${d.merged} repeat enquir${d.merged === 1 ? "y" : "ies"} added to existing leads.` : undefined,
            placement: "bottomRight",
          });
        }
      })
      .catch(() => undefined);
  }, []);
};
