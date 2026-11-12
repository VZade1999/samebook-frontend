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

/** Downloads a version to the user's disk with the server-chosen file name. */
export const downloadFile = async (id: number, fallbackName: string, version?: number) => {
  const res = await driveService.blob(id, { version });
  const cd: string = res.headers["content-disposition"] || "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  const plain = /filename="([^"]+)"/i.exec(cd);
  const name = star ? decodeURIComponent(star[1]) : plain ? plain[1] : fallbackName;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
};
