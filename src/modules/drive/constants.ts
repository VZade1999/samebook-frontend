import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export type FileKind = "image" | "pdf" | "doc" | "sheet" | "slides" | "text" | "archive" | "video" | "audio" | "other";

export interface UserRef {
  id: number;
  name: string | null;
}

export interface PathPart {
  id: number;
  name: string;
}

export interface DriveFolder {
  id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  color: string;
  created_at: string | null;
  updated_at: string | null;
  file_count: number;
  folder_count: number;
  creator?: UserRef | null;
  editor?: UserRef | null;
}

export interface DriveFile {
  id: number;
  folder_id: number | null;
  name: string;
  description: string | null;
  tags: string[];
  extension: string;
  mime_type: string;
  kind: FileKind;
  previewable: boolean;
  size_bytes: number;
  current_version: number;
  created_at: string | null;
  updated_at: string | null;
  creator: UserRef | null;
  editor: UserRef | null;
  path?: PathPart[];
}

export interface DriveVersion {
  id: number;
  version_no: number;
  original_name: string;
  extension: string;
  mime_type: string;
  kind: FileKind;
  previewable: boolean;
  size_bytes: number;
  checksum: string | null;
  note: string | null;
  restored_from: number | null;
  is_current: boolean;
  uploaded_by: UserRef | null;
  created_at: string | null;
}

export interface DriveActivityItem {
  id: number;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  version_no: number | null;
  created_at: string | null;
  user: UserRef | null;
  file?: { id: number; name: string; extension: string; kind: FileKind } | null;
  folder?: { id: number; name: string; color: string } | null;
  path?: PathPart[];
}

export interface DriveFileDetail {
  file: DriveFile;
  versions: DriveVersion[];
  activity: DriveActivityItem[];
  can: { update: boolean };
}

export interface DriveMeta {
  can: { view: boolean; create: boolean; update: boolean };
  max_upload_mb: number;
  colors: string[];
  quota: { used_bytes: number; limit_bytes: number };
  stats: { files: number; folders: number; versions: number; changed_week: number };
  kinds: Partial<Record<FileKind, { count: number; bytes: number }>>;
}

export const KIND_META: Record<FileKind, { label: string; plural: string; color: string; soft: string }> = {
  image: { label: "Image", plural: "Images", color: "#DB2777", soft: "#FDF2F8" },
  pdf: { label: "PDF", plural: "PDFs", color: "#DC2626", soft: "#FEF2F2" },
  doc: { label: "Document", plural: "Documents", color: "#2563EB", soft: "#EFF6FF" },
  sheet: { label: "Spreadsheet", plural: "Sheets", color: "#059669", soft: "#ECFDF5" },
  slides: { label: "Presentation", plural: "Slides", color: "#EA580C", soft: "#FFF7ED" },
  text: { label: "Text", plural: "Text", color: "#475569", soft: "#F1F5F9" },
  archive: { label: "Archive", plural: "Archives", color: "#A16207", soft: "#FEFCE8" },
  video: { label: "Video", plural: "Videos", color: "#7C3AED", soft: "#F5F3FF" },
  audio: { label: "Audio", plural: "Audio", color: "#0891B2", soft: "#ECFEFF" },
  other: { label: "File", plural: "Other", color: "#64748B", soft: "#F8FAFC" },
};

export const KIND_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pdf", label: "PDFs" },
  { key: "image", label: "Images" },
  { key: "doc", label: "Docs" },
  { key: "sheet", label: "Sheets" },
  { key: "slides", label: "Slides" },
  { key: "video", label: "Video" },
  { key: "archive", label: "Archives" },
];

export const FOLDER_COLOR: Record<string, string> = {
  indigo: "#6366F1",
  blue: "#3B82F6",
  teal: "#14B8A6",
  green: "#22C55E",
  amber: "#F59E0B",
  orange: "#F97316",
  rose: "#F43F5E",
  violet: "#8B5CF6",
  slate: "#64748B",
};
export const folderHex = (c?: string | null) => FOLDER_COLOR[c || "indigo"] || FOLDER_COLOR.indigo;

export const fmtBytes = (n: number, digits = 1) => {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(Math.abs(n)) / Math.log(1024)), units.length - 1);
  const v = n / Math.pow(1024, i);
  return `${i === 0 ? v : v.toFixed(v >= 100 ? 0 : digits)} ${units[i]}`;
};

export const fmtDelta = (n: number) => (n === 0 ? "same size" : `${n > 0 ? "+" : "−"}${fmtBytes(Math.abs(n))}`);
export const fmtDateTime = (v?: string | null) => (v ? dayjs(v).format("DD MMM YYYY, hh:mm A") : "—");
export const fmtAgo = (v?: string | null) => (v ? dayjs(v).fromNow() : "—");

export const initials = (name?: string | null) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

export const AVATAR_COLORS = ["#4F46E5", "#0891B2", "#059669", "#D97706", "#DB2777", "#7C3AED", "#DC2626", "#0D9488"];
export const avatarColor = (id?: number | null) => AVATAR_COLORS[Math.abs(Number(id || 0)) % AVATAR_COLORS.length];

export const errText = (err: any, fallback = "Something went wrong") => {
  const status = err?.response?.status;
  if (status === 413) return err?.response?.data?.message && !/too large/i.test(err.response.data.message)
    ? err.response.data.message
    : "This file is larger than the upload limit.";
  return err?.response?.data?.message || err?.message || fallback;
};

export const DRIVE_CHANGED_EVENT = "samebook:drive-changed";
export const emitDriveChanged = () => window.dispatchEvent(new CustomEvent(DRIVE_CHANGED_EVENT));

/** Human sentence pieces for an activity row. */
export const ACTION_META: Record<string, { verb: string; color: string; icon: string }> = {
  FILE_UPLOADED: { verb: "uploaded", color: "#2563EB", icon: "upload" },
  VERSION_UPLOADED: { verb: "uploaded a new version of", color: "#7C3AED", icon: "version" },
  VERSION_RESTORED: { verb: "restored an older version of", color: "#D97706", icon: "restore" },
  FILE_RENAMED: { verb: "renamed", color: "#0891B2", icon: "rename" },
  FILE_UPDATED: { verb: "updated", color: "#475569", icon: "edit" },
  FILE_MOVED: { verb: "moved", color: "#059669", icon: "move" },
  FOLDER_CREATED: { verb: "created folder", color: "#4F46E5", icon: "folder" },
  FOLDER_RENAMED: { verb: "renamed folder", color: "#0891B2", icon: "rename" },
  FOLDER_MOVED: { verb: "moved folder", color: "#059669", icon: "move" },
  FOLDER_UPDATED: { verb: "updated folder", color: "#475569", icon: "edit" },
};

export const FIELD_LABEL: Record<string, string> = {
  name: "name",
  description: "description",
  tags: "tags",
  color: "colour",
  folder: "location",
};
