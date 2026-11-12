import React, { useEffect, useRef, useState } from "react";
import { Input, Modal, Select, Tooltip } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  CloseOutlined,
  CloudUploadOutlined,
  ExclamationCircleFilled,
  HistoryOutlined,
  LoadingOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { driveService } from "../services/driveService";
import { FileKind, emitDriveChanged, errText, fmtBytes } from "../constants";
import { FileIcon } from "./DriveBits";

// Mirrors the server's block-list so users find out before waiting for an upload.
const BLOCKED = new Set("exe msi bat cmd com scr pif cpl dll sys vbs vbe js jse wsf wsh ps1 psm1 sh bash jar app apk msp reg lnk hta html htm xhtml svgz php".split(" "));
const KIND_BY_EXT: Record<string, FileKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", bmp: "image", avif: "image", heic: "image",
  pdf: "pdf", doc: "doc", docx: "doc", odt: "doc", rtf: "doc", xls: "sheet", xlsx: "sheet", csv: "sheet", ods: "sheet",
  ppt: "slides", pptx: "slides", odp: "slides", txt: "text", md: "text", json: "text", xml: "text",
  zip: "archive", rar: "archive", "7z": "archive", gz: "archive", tar: "archive",
  mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video", mp3: "audio", wav: "audio", m4a: "audio", ogg: "audio",
};
const extOf = (name: string) => {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
};

type Status = "ready" | "uploading" | "done" | "error" | "conflict" | "skipped";
interface Item {
  uid: string;
  file: File;
  name: string;
  status: Status;
  progress: number;
  error?: string;
  existing?: { id: number; name: string; current_version: number };
  result?: string;
}

let seq = 0;

const UploadModal: React.FC<{
  open: boolean;
  folderId: number | null;
  folderName: string;
  initialFiles: File[];
  maxMb: number;
  tagOptions: string[];
  onClose: () => void;
}> = ({ open, folderId, folderName, initialFiles, maxMb, tagOptions, onClose }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  const validate = (f: File): string | undefined => {
    const ext = extOf(f.name);
    if (ext && BLOCKED.has(ext)) return `.${ext} files can't be stored in Drive`;
    if (f.size === 0) return "The file is empty";
    if (f.size > maxMb * 1024 * 1024) return `Larger than the ${maxMb} MB limit`;
    return undefined;
  };

  const addFiles = (list: FileList | File[]) => {
    const next = Array.from(list).map<Item>((file) => {
      const error = validate(file);
      return { uid: `u${++seq}`, file, name: file.name, status: error ? "error" : "ready", progress: 0, error };
    });
    setItems((cur) => [...cur, ...next]);
  };

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setTags([]);
    setDescription("");
    if (initialFiles.length) addFiles(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFiles]);

  const patch = (uid: string, p: Partial<Item>) => setItems((cur) => cur.map((i) => (i.uid === uid ? { ...i, ...p } : i)));

  const uploadOne = async (it: Item, mode: "ask" | "rename" = "ask") => {
    patch(it.uid, { status: "uploading", progress: 0, error: undefined });
    try {
      const single = itemsRef.current.filter((i) => i.status !== "error").length === 1;
      const res = await driveService.upload(
        it.file,
        {
          folder_id: folderId,
          name: single ? it.name : undefined,
          description: description.trim() || undefined,
          tags,
          on_conflict: mode,
        },
        (pct) => patch(it.uid, { progress: pct }),
      );
      const saved = res.data?.data?.file?.name;
      patch(it.uid, { status: "done", progress: 100, result: saved && saved !== it.name ? `Saved as ${saved}` : undefined });
      return true;
    } catch (e: any) {
      const body = e?.response?.data;
      if (e?.response?.status === 409 && body?.code === "NAME_EXISTS" && body.existing) {
        patch(it.uid, { status: "conflict", existing: body.existing, progress: 0 });
      } else {
        patch(it.uid, { status: "error", error: errText(e), progress: 0 });
      }
      return false;
    }
  };

  const asNewVersion = async (it: Item) => {
    if (!it.existing) return;
    patch(it.uid, { status: "uploading", progress: 0 });
    try {
      await driveService.uploadVersion(it.existing.id, it.file, description.trim() || "Uploaded from the upload dialog", (pct) =>
        patch(it.uid, { progress: pct }),
      );
      patch(it.uid, { status: "done", progress: 100, result: `Saved as version ${it.existing.current_version + 1}` });
      emitDriveChanged();
    } catch (e) {
      patch(it.uid, { status: "error", error: errText(e) });
    }
  };

  const keepBoth = async (it: Item) => {
    if (await uploadOne(it, "rename")) emitDriveChanged();
  };

  const start = async () => {
    setRunning(true);
    const queue = itemsRef.current.filter((i) => i.status === "ready");
    let any = false;
    // Two at a time: quick for many small files, gentle on the connection.
    const worker = async () => {
      while (queue.length) {
        const it = queue.shift()!;
        if (await uploadOne(it)) any = true;
      }
    };
    await Promise.all([worker(), worker()]);
    setRunning(false);
    if (any) emitDriveChanged();
  };

  const ready = items.filter((i) => i.status === "ready").length;
  const done = items.filter((i) => i.status === "done").length;
  const totalBytes = items.filter((i) => i.status !== "error" && i.status !== "skipped").reduce((a, i) => a + i.file.size, 0);
  const finished = items.length > 0 && !running && ready === 0 && !items.some((i) => i.status === "uploading");
  const singleEditable = items.length === 1 && items[0].status === "ready";

  return (
    <Modal
      open={open}
      onCancel={() => !running && onClose()}
      width={640}
      destroyOnHidden
      className="dv-modal"
      title={null}
      footer={
        <div className="dv-up-footer">
          <span className="dv-up-summary">
            {items.length ? (
              <>
                {items.length} file{items.length === 1 ? "" : "s"} · {fmtBytes(totalBytes)}
                {done > 0 && <span className="dv-up-done"> · {done} uploaded</span>}
              </>
            ) : (
              `Up to ${maxMb} MB per file`
            )}
          </span>
          <div className="dv-up-actions">
            <button className="dv-btn ghost" onClick={onClose} disabled={running}>
              {finished ? "Close" : "Cancel"}
            </button>
            {!finished && (
              <button className="dv-btn primary" onClick={start} disabled={!ready || running}>
                {running ? <LoadingOutlined /> : <CloudUploadOutlined />}
                {running ? "Uploading…" : `Upload ${ready || ""}`}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="dv-up">
        <div className="dv-up-head">
          <div className="dv-up-head-icon">
            <CloudUploadOutlined />
          </div>
          <div>
            <div className="dv-up-title">Upload files</div>
            <div className="dv-up-sub">
              to <b>{folderName}</b> · every upload is versioned and kept
            </div>
          </div>
        </div>

        <div
          className={`dv-drop${dragging ? " over" : ""}${items.length ? " compact" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
        >
          <div className="dv-drop-art">
            <span className="dv-drop-sheet a" />
            <span className="dv-drop-sheet b" />
            <span className="dv-drop-sheet c">
              <CloudUploadOutlined />
            </span>
          </div>
          <div className="dv-drop-text">
            <b>{dragging ? "Release to add files" : "Drag & drop files here"}</b>
            <span>or click to browse · PDFs, images, docs, sheets, media</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {items.length > 0 && (
          <div className="dv-up-list">
            {items.map((it) => {
              const ext = extOf(it.file.name);
              return (
                <div key={it.uid} className={`dv-up-item ${it.status}`}>
                  <FileIcon kind={KIND_BY_EXT[ext] || "other"} ext={ext} size={28} />
                  <div className="dv-up-item-main">
                    {singleEditable ? (
                      <Input
                        size="small"
                        value={it.name}
                        onChange={(e) => patch(it.uid, { name: e.target.value })}
                        className="dv-up-name-input"
                      />
                    ) : (
                      <div className="dv-up-name" title={it.name}>
                        {it.name}
                      </div>
                    )}
                    <div className="dv-up-meta">
                      {fmtBytes(it.file.size)}
                      {it.status === "error" && <span className="dv-up-err"> · {it.error}</span>}
                      {it.status === "done" && it.result && <span className="dv-up-ok"> · {it.result}</span>}
                      {it.status === "skipped" && <span> · skipped</span>}
                    </div>
                    {it.status === "uploading" && (
                      <div className="dv-up-bar">
                        <span style={{ width: `${it.progress}%` }} />
                      </div>
                    )}
                    {it.status === "conflict" && it.existing && (
                      <div className="dv-up-conflict">
                        <span>
                          <ExclamationCircleFilled /> <b>{it.existing.name}</b> already exists (v{it.existing.current_version})
                        </span>
                        <div className="dv-up-conflict-actions">
                          <button className="dv-chip-btn primary" onClick={() => asNewVersion(it)}>
                            <HistoryOutlined /> Save as v{it.existing.current_version + 1}
                          </button>
                          <button className="dv-chip-btn" onClick={() => keepBoth(it)}>
                            <CopyOutlined /> Keep both
                          </button>
                          <button className="dv-chip-btn" onClick={() => patch(it.uid, { status: "skipped" })}>
                            Skip
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="dv-up-state">
                    {it.status === "uploading" && <span className="dv-up-pct">{it.progress}%</span>}
                    {it.status === "done" && <CheckCircleFilled className="ok" />}
                    {it.status === "error" && <CloseCircleFilled className="bad" />}
                    {(it.status === "ready" || it.status === "error" || it.status === "skipped") && !running && (
                      <Tooltip title="Remove">
                        <button className="dv-x" onClick={() => setItems((cur) => cur.filter((i) => i.uid !== it.uid))}>
                          <CloseOutlined />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {items.some((i) => i.status === "ready") && (
          <div className="dv-up-fields">
            <div>
              <label className="dv-label">
                Tags <span className="dv-optional">applied to {ready === 1 ? "this file" : `all ${ready} files`}</span>
              </label>
              <Select
                mode="tags"
                value={tags}
                onChange={(v) => setTags((v as string[]).map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter(Boolean).slice(0, 12))}
                options={tagOptions.map((t) => ({ value: t, label: `#${t}` }))}
                placeholder="e.g. invoice, gst, q4"
                tokenSeparators={[","]}
                style={{ width: "100%" }}
                maxTagCount="responsive"
              />
            </div>
            <div>
              <label className="dv-label">
                Description <span className="dv-optional">optional</span>
              </label>
              <Input.TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoSize={{ minRows: 2, maxRows: 4 }}
                maxLength={5000}
                placeholder="What is this file about?"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UploadModal;
