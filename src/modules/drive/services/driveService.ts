import api from "@/api/axios";
import type { AxiosProgressEvent } from "axios";

export interface UploadFields {
  folder_id?: number | null;
  name?: string;
  description?: string;
  tags?: string[];
  on_conflict?: "ask" | "rename";
}

const form = (file: File, fields: Record<string, any>) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    fd.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
  });
  fd.append("file", file, file.name);
  return fd;
};

// Uploads and downloads can be large: no 30s client timeout for those.
const LONG = { timeout: 0 };

export const driveService = {
  meta: () => api.get("/drive/meta"),
  folders: () => api.get("/drive/folders"),
  browse: (folderId: number | null) => api.get("/drive/browse", { params: folderId ? { folder_id: folderId } : {} }),
  search: (params: { q?: string; tag?: string; kind?: string }) => api.get("/drive/search", { params }),
  recent: (scope?: "mine") => api.get("/drive/recent", { params: scope ? { scope } : {} }),
  tags: () => api.get("/drive/tags"),
  activity: (params: { before_id?: number; limit?: number } = {}) => api.get("/drive/activity", { params }),
  file: (id: number) => api.get(`/drive/files/${id}`),

  createFolder: (payload: { name: string; parent_id?: number | null; description?: string; color?: string }) =>
    api.post("/drive/folders", payload),
  updateFolder: (id: number, payload: Record<string, any>) => api.patch(`/drive/folders/${id}`, payload),
  updateFile: (id: number, payload: Record<string, any>) => api.patch(`/drive/files/${id}`, payload),

  upload: (file: File, fields: UploadFields, onProgress?: (pct: number) => void, signal?: AbortSignal) =>
    api.post("/drive/files", form(file, fields as any), {
      ...LONG,
      signal,
      onUploadProgress: (e: AxiosProgressEvent) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    }),
  uploadVersion: (id: number, file: File, note?: string, onProgress?: (pct: number) => void) =>
    api.post(`/drive/files/${id}/versions`, form(file, { note }), {
      ...LONG,
      onUploadProgress: (e: AxiosProgressEvent) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    }),
  restore: (id: number, versionId: number, note?: string) =>
    api.post(`/drive/files/${id}/versions/${versionId}/restore`, note ? { note } : {}),

  /** Bytes as a Blob (goes through the axios auth/refresh interceptor). */
  blob: (id: number, opts: { version?: number; inline?: boolean } = {}) =>
    api.get(`/drive/files/${id}/download`, {
      ...LONG,
      responseType: "blob",
      params: { ...(opts.version ? { version: opts.version } : {}), ...(opts.inline ? { inline: 1 } : {}) },
    }),
};

/**
 * Direct URL of a version. Auth is the httpOnly session cookie, which the
 * browser sends on same-origin navigations (the /api proxy), so these URLs
 * work in <a href>, new tabs and iframes without any JS blob handling.
 */
export const fileUrl = (id: number, opts: { version?: number; inline?: boolean } = {}) => {
  const base = (api.defaults.baseURL || "/api").replace(/\/$/, "");
  const q = new URLSearchParams();
  if (opts.version) q.set("version", String(opts.version));
  if (opts.inline) q.set("inline", "1");
  const qs = q.toString();
  return `${base}/drive/files/${id}/download${qs ? `?${qs}` : ""}`;
};

/**
 * A plain navigation can't refresh an expired access token, so first make one
 * cheap API call through axios: its interceptor refreshes the cookie if needed.
 */
let authCheckedAt = 0;
export const ensureFreshAuth = async () => {
  if (Date.now() - authCheckedAt < 60_000) return;
  await api.get("/drive/meta");
  authCheckedAt = Date.now();
};

/** Native browser download (progress in the download bar, real file name). */
export const downloadFile = async (id: number, _fallbackName?: string, version?: number) => {
  await ensureFreshAuth();
  const a = document.createElement("a");
  a.href = fileUrl(id, { version });
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

/**
 * Opens a PDF / image / video in a new browser tab with the browser's own
 * viewer (zoom, print, Ctrl+F search in PDFs). The tab is opened synchronously
 * inside the click so popup blockers allow it, then pointed at the file.
 */
export const openInBrowser = (id: number, version?: number) => {
  const tab = window.open("", "_blank");
  const url = fileUrl(id, { version, inline: true });
  if (tab) {
    try {
      tab.document.title = "Opening…";
      tab.document.body.innerHTML =
        '<p style="font:14px system-ui,sans-serif;color:#64748b;padding:24px">Opening file…</p>';
    } catch {
      // cross-origin about:blank edge cases: just navigate
    }
  }
  return ensureFreshAuth()
    .then(() => {
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url; // popup blocked: open in this tab
      }
    })
    .catch((e) => {
      tab?.close();
      throw e;
    });
};
