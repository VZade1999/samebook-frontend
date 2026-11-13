import { useCallback, useEffect, useState } from "react";
import api from "@/api/axios";
import type { DocType, Series, SeriesList } from "./rules";

export const numberingService = {
  list: () => api.get("/document-series"),
  preview: (payload: any) => api.post("/document-series/preview", payload),
  create: (payload: any) => api.post("/document-series", payload),
  update: (id: number, payload: any) => api.patch(`/document-series/${id}`, payload),
  remove: (id: number) => api.delete(`/document-series/${id}`),
};

export const apiError = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.payload?.message || err?.message || fallback;

// One shared copy for every form on the page; refreshed after changes and
// at most every 20 s otherwise (next numbers move as documents are made).
const TTL_MS = 20_000;
let cache: { at: number; data: SeriesList } | null = null;
let inflight: Promise<SeriesList> | null = null;
const listeners = new Set<() => void>();

export function loadSeries(force = false): Promise<SeriesList> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.data);
  if (inflight && !force) return inflight;
  const p = numberingService
    .list()
    .then((res) => {
      const data: SeriesList = res?.data?.data || { series: [], standard: {}, prefix: "" };
      cache = { at: Date.now(), data };
      listeners.forEach((l) => l());
      return data;
    })
    .finally(() => {
      if (inflight === p) inflight = null;
    });
  inflight = p;
  return p;
}

/** After a document is created its series moved on: drop the cached next numbers. */
export function invalidateSeries() {
  cache = null;
}

export function useSeriesList(enabled = true, fresh = false) {
  const [data, setData] = useState<SeriesList | null>(cache?.data ?? null);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (force = true) => {
    setLoading(true);
    try {
      setData(await loadSeries(force));
      setError(null);
    } catch (e: any) {
      setError(apiError(e, "Couldn't load numbering series"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const sync = () => cache && setData(cache.data);
    listeners.add(sync);
    reload(fresh);
    return () => {
      listeners.delete(sync);
    };
  }, [enabled, fresh, reload]);

  return { data, loading, error, reload };
}

/** Active series of one document type, default first. */
export function useActiveSeries(docType: DocType, enabled = true, fresh = false): { series: Series[]; loading: boolean } {
  const { data, loading } = useSeriesList(enabled, fresh);
  const series = (data?.series || [])
    .filter((s) => s.doc_type === docType && s.is_active)
    .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.id - b.id);
  return { series, loading };
}
