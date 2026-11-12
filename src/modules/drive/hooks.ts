import { useCallback, useEffect, useState } from "react";
import { driveService } from "./services/driveService";
import { DRIVE_CHANGED_EVENT, DriveMeta } from "./constants";

// ── Meta (capabilities, quota, stats) ──────────────────────────────────────

let metaCache: { at: number; promise: Promise<DriveMeta> } | null = null;
const loadMeta = (force = false) => {
  if (!force && metaCache && Date.now() - metaCache.at < 30_000) return metaCache.promise;
  const promise = driveService
    .meta()
    .then((r) => r.data.data as DriveMeta)
    .catch((e) => {
      metaCache = null;
      throw e;
    });
  metaCache = { at: Date.now(), promise };
  return promise;
};

/** Shared Drive meta; refreshes itself whenever Drive content changes. */
export const useDriveMeta = () => {
  const [meta, setMeta] = useState<DriveMeta | null>(null);
  const refresh = useCallback((force = true) => {
    loadMeta(force)
      .then(setMeta)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    refresh(false);
    const onChange = () => refresh(true);
    window.addEventListener(DRIVE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(DRIVE_CHANGED_EVENT, onChange);
  }, [refresh]);
  return meta;
};

// ── Blob URLs for previews and thumbnails ──────────────────────────────────
// Versions are immutable, so "file:version" is a perfect cache key. Bounded so
// browsing a big image folder can't hold unlimited memory.

const BLOB_CACHE_MAX = 80;
const blobCache = new Map<string, Promise<string>>();

const getBlobUrl = (fileId: number, version: number) => {
  const key = `${fileId}:${version}`;
  const hit = blobCache.get(key);
  if (hit) {
    blobCache.delete(key);
    blobCache.set(key, hit); // LRU bump
    return hit;
  }
  const p = driveService
    .blob(fileId, { version, inline: true })
    .then((r) => URL.createObjectURL(r.data as Blob));
  p.catch(() => blobCache.delete(key));
  blobCache.set(key, p);
  while (blobCache.size > BLOB_CACHE_MAX) {
    const [oldKey, oldP] = blobCache.entries().next().value as [string, Promise<string>];
    blobCache.delete(oldKey);
    // Give any <img> still showing it a moment before revoking.
    oldP.then((u) => setTimeout(() => URL.revokeObjectURL(u), 60_000)).catch(() => undefined);
  }
  return p;
};

export const useBlobUrl = (fileId: number | null | undefined, version: number | null | undefined, enabled = true) => {
  const [state, setState] = useState<{ url: string | null; loading: boolean; error: boolean }>({
    url: null,
    loading: false,
    error: false,
  });
  useEffect(() => {
    if (!enabled || !fileId || !version) {
      setState({ url: null, loading: false, error: false });
      return;
    }
    let alive = true;
    setState((s) => ({ url: s.url, loading: true, error: false }));
    getBlobUrl(fileId, version)
      .then((url) => alive && setState({ url, loading: false, error: false }))
      .catch(() => alive && setState({ url: null, loading: false, error: true }));
    return () => {
      alive = false;
    };
  }, [fileId, version, enabled]);
  return state;
};

/** Text preview: the first ~200 KB of a text/CSV file. */
export const useTextPreview = (fileId: number | null, version: number | null, enabled: boolean) => {
  const [text, setText] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    if (!enabled || !fileId || !version) return;
    let alive = true;
    setText(null);
    driveService
      .blob(fileId, { version, inline: true })
      .then(async (r) => {
        const blob = r.data as Blob;
        const limit = 200 * 1024;
        const t = await blob.slice(0, limit).text();
        if (alive) {
          setText(t);
          setTruncated(blob.size > limit);
        }
      })
      .catch(() => alive && setText(""));
    return () => {
      alive = false;
    };
  }, [fileId, version, enabled]);
  return { text, truncated };
};
