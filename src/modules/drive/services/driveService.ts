import axios from "axios";
import type { AxiosProgressEvent } from "axios";
import api from "@/api/axios";

export interface UploadFields {
  folder_id?: number | null;
  name?: string;
  description?: string;
  tags?: string[];
  on_conflict?: "ask" | "rename";
}

interface UploadTarget {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  via_api: boolean;
  /** Database storage: send the file in parts of this size. */
  chunk_size?: number;
}

interface FileLink {
  url: string;
  via_api: boolean;
  filename: string;
  /** Database storage: the file comes in `parts` pieces, joined in the browser. */
  chunked?: { parts: number; size: number; mime: string };
}

const withRetry = async <T,>(fn: () => Promise<T>, tries = 3): Promise<T> => {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.response?.status;
      // Only retry network hiccups and server errors, not "no permission" etc.
      if (i >= tries || (status && status < 500)) throw e;
      await new Promise((r) => setTimeout(r, 400 * i));
    }
  }
};

// Uploads can be large: no 30s client timeout for those.
const LONG = { timeout: 0 };
const apiBase = () => (api.defaults.baseURL || "/api").replace(/\/$/, "");

/** Turns a link from the API into something the browser can open. */
const absolute = (l: { url: string; via_api: boolean }) => (l.via_api ? `${apiBase()}${l.url}` : l.url);

/** SHA-256 of the file, computed in the browser (null where unavailable). */
const sha256 = async (file: File): Promise<string | null> => {
  try {
    if (!globalThis.crypto?.subtle || file.size > 100 * 1024 * 1024) return null;
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
};

/**
 * Sends the bytes to wherever presign said: straight to the bucket (S3 /
 * R2, no cookies) or to the API's own receiver in local development.
 */
const putBytes = async (target: UploadTarget, file: File, onProgress?: (pct: number) => void, signal?: AbortSignal) => {
  if (target.chunk_size) {
    // Database storage: 2 MB parts (each well under Vercel's 4.5 MB body limit).
    const size = target.chunk_size;
    const parts = Math.max(1, Math.ceil(file.size / size));
    for (let i = 0; i < parts; i++) {
      const slice = file.slice(i * size, Math.min(file.size, (i + 1) * size));
      await withRetry(() =>
        api.put(`${target.url}?part=${i}`, slice, {
          ...LONG,
          signal,
          headers: target.headers,
          onUploadProgress: (e: AxiosProgressEvent) => {
            const done = i * size + (e.loaded || 0);
            onProgress?.(Math.min(99, Math.round((done / file.size) * 100)));
          },
        }),
      );
    }
    return;
  }
  const opts = {
    ...LONG,
    signal,
    headers: target.headers,
    onUploadProgress: (e: AxiosProgressEvent) => onProgress?.(e.total ? Math.min(99, Math.round((e.loaded / e.total) * 100)) : 0),
  };
  return target.via_api
    ? api.put(target.url, file, opts)
    : axios.put(target.url, file, { ...opts, withCredentials: false, transformRequest: [(d) => d] });
};

/** presign → upload bytes → commit. Throws axios errors with the API's body. */
const directUpload = async (
  presignBody: Record<string, any>,
  commit: (p: { key: string; mime: string; checksum: string | null }) => Promise<any>,
  file: File,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
) => {
  const [presign, checksum] = await Promise.all([
    api.post("/drive/uploads/presign", {
      ...presignBody,
      original_name: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
    }),
    sha256(file),
  ]);
  const { key, upload, mime } = presign.data.data as { key: string; upload: UploadTarget; mime: string };
  await putBytes(upload, file, onProgress, signal);
  const res = await commit({ key, mime, checksum });
  onProgress?.(100);
  return res;
};

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

  /** New file. A 409 { code: "NAME_EXISTS", existing } comes back before any bytes are sent. */
  upload: (file: File, fields: UploadFields, onProgress?: (pct: number) => void, signal?: AbortSignal) =>
    directUpload(
      { purpose: "file", folder_id: fields.folder_id ?? null, name: fields.name || file.name, on_conflict: fields.on_conflict },
      ({ key, mime, checksum }) =>
        api.post("/drive/files/commit", {
          key,
          mime,
          checksum,
          original_name: file.name,
          folder_id: fields.folder_id ?? null,
          name: fields.name || file.name,
          description: fields.description,
          tags: fields.tags,
          on_conflict: fields.on_conflict,
        }),
      file,
      onProgress,
      signal,
    ),

  uploadVersion: (id: number, file: File, note?: string, onProgress?: (pct: number) => void) =>
    directUpload(
      { purpose: "version", file_id: id },
      ({ key, mime, checksum }) =>
        api.post(`/drive/files/${id}/versions/commit`, { key, mime, checksum, original_name: file.name, note }),
      file,
      onProgress,
    ),

  restore: (id: number, versionId: number, note?: string) =>
    api.post(`/drive/files/${id}/versions/${versionId}/restore`, note ? { note } : {}),

  /** A short-lived link to a version (pre-signed storage URL, or the API route locally). */
  link: async (id: number, opts: { version?: number; inline?: boolean } = {}): Promise<FileLink & { href: string }> => {
    const r = await api.get(`/drive/files/${id}/link`, {
      params: { ...(opts.version ? { version: opts.version } : {}), ...(opts.inline ? { inline: 1 } : {}) },
    });
    const l = r.data.data as FileLink;
    return { ...l, href: absolute(l) };
  },

  /** The bytes of a version as a Blob, for thumbnails and text previews. */
  blob: async (id: number, opts: { version?: number; inline?: boolean } = {}): Promise<Blob> => {
    const l = await driveService.link(id, opts);
    if (l.chunked) return fetchParts(l);
    const res = await fetch(l.href, { credentials: l.via_api ? "include" : "omit" });
    if (!res.ok) {
      let message = `Couldn't load the file (${res.status})`;
      try {
        message = (await res.json()).message || message;
      } catch {
        // not JSON (storage error page)
      }
      throw new Error(message);
    }
    return res.blob();
  },
};

/** Database storage: fetch every part (3 at a time) and join them in order. */
async function fetchParts(l: FileLink & { href: string }): Promise<Blob> {
  const { parts, mime } = l.chunked!;
  const sep = l.href.includes("?") ? "&" : "?";
  const out: Blob[] = new Array(parts);
  let next = 0;
  const worker = async () => {
    while (next < parts) {
      const i = next++;
      out[i] = await withRetry(async () => {
        const res = await fetch(`${l.href}${sep}part=${i}`, { credentials: "include" });
        if (!res.ok) {
          let message = `Couldn't load the file (${res.status})`;
          try {
            message = (await res.json()).message || message;
          } catch {
            // not JSON
          }
          throw Object.assign(new Error(message), { response: { status: res.status, data: { message } } });
        }
        return res.blob();
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, parts) }, worker));
  // Only safe types keep their real MIME (the server sends octet-stream for
  // anything that could run script, e.g. SVG/HTML), so blob URLs stay inert.
  return new Blob(out, { type: mime });
}

/**
 * A URL the browser can open for a version: the storage / API link itself, or
 * (database storage) a blob: URL built from the parts. Call revoke() when done.
 */
export const viewUrl = async (id: number, opts: { version?: number; inline?: boolean } = {}) => {
  const l = await driveService.link(id, opts);
  if (!l.chunked) return { href: l.href, filename: l.filename, via_api: l.via_api, revoke: () => undefined };
  const href = URL.createObjectURL(await fetchParts(l));
  return { href, filename: l.filename, via_api: true, revoke: () => URL.revokeObjectURL(href) };
};

/** Download with the real file name. */
export const downloadFile = async (id: number, _fallbackName?: string, version?: number) => {
  const v = await viewUrl(id, { version });
  const a = document.createElement("a");
  a.href = v.href;
  a.rel = "noopener";
  if (v.via_api) a.download = v.filename; // cross-origin (S3) links rely on Content-Disposition instead
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(v.revoke, 60_000);
};

/**
 * Opens a PDF / image / video in a new tab with the browser's own viewer
 * (zoom, print, Ctrl+F search in PDFs). The tab opens synchronously inside the
 * click so popup blockers allow it, then gets pointed at the file.
 */
export const openInBrowser = (id: number, version?: number) => {
  const tab = window.open("", "_blank");
  if (tab) {
    try {
      tab.document.title = "Opening…";
      tab.document.body.innerHTML =
        '<p style="font:14px system-ui,sans-serif;color:#64748b;padding:24px">Opening file…</p>';
    } catch {
      // ignore: just navigate
    }
  }
  return viewUrl(id, { version, inline: true })
    .then((v) => {
      if (tab) {
        tab.opener = null;
        tab.location.href = v.href;
      } else {
        window.location.href = v.href; // popup blocked: open here
      }
      // The new tab has loaded the blob by then; free the memory later.
      setTimeout(v.revoke, 5 * 60_000);
    })
    .catch((e) => {
      tab?.close();
      throw e;
    });
};
