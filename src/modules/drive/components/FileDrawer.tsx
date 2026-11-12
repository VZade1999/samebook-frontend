import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Drawer, Input, Popconfirm, Select, Spin, Tooltip, message } from "antd";
import {
  CloseOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  EyeOutlined,
  ExportOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { downloadFile, driveService, ensureFreshAuth, fileUrl, openInBrowser } from "../services/driveService";
import {
  DriveFileDetail,
  DriveFolder,
  DriveVersion,
  FileKind,
  KIND_META,
  emitDriveChanged,
  errText,
  fmtAgo,
  fmtBytes,
  fmtDateTime,
  fmtDelta,
} from "../constants";
import { useBlobUrl, useTextPreview } from "../hooks";
import { Avatar, FileIcon } from "./DriveBits";
import ActivityRow from "./ActivityRow";
import MoveModal from "./MoveModal";

type Tab = "details" | "versions" | "activity";

// ── Preview ────────────────────────────────────────────────────────────────

const parseCsv = (text: string, maxRows = 60) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length && rows.length < maxRows; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if ((cell || row.length) && rows.length < maxRows) rows.push([...row, cell]);
  return rows;
};

const Preview: React.FC<{
  fileId: number;
  version: number;
  kind: FileKind;
  ext: string;
  mime: string;
  previewable: boolean;
  name: string;
}> = ({ fileId, version, kind, ext, mime, previewable, name }) => {
  const isPdf = previewable && kind === "pdf";
  const media = previewable && ["image", "video", "audio"].includes(kind);
  const isText = previewable && /^text\//.test(mime);
  const { url, loading, error } = useBlobUrl(fileId, version, media);
  const [pdfSrc, setPdfSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!isPdf) return;
    let alive = true;
    setPdfSrc(null);
    ensureFreshAuth()
      .catch(() => undefined)
      .then(() => alive && setPdfSrc(fileUrl(fileId, { version, inline: true })));
    return () => {
      alive = false;
    };
  }, [isPdf, fileId, version]);
  const { text, truncated } = useTextPreview(fileId, version, isText);
  const meta = KIND_META[kind];

  if (isPdf) {
    return (
      <div className="dv-pv dv-pv-pdf">
        <div className="dv-pv-bar">
          <span>
            <FileSearchOutlined /> Use <kbd>Ctrl</kbd> + <kbd>F</kbd> inside the document to search its text
          </span>
          <button className="dv-chip-btn primary" onClick={() => openInBrowser(fileId, version).catch((e) => message.error(errText(e)))}>
            <ExportOutlined /> Open in new tab
          </button>
        </div>
        {pdfSrc ? <iframe src={pdfSrc} title={name} /> : <div className="dv-pv-loading"><Spin /></div>}
      </div>
    );
  }
  if (!previewable || (!media && !isText)) {
    return (
      <div className="dv-pv dv-pv-none" style={{ ["--k" as any]: meta.color, ["--ks" as any]: meta.soft }}>
        <FileIcon kind={kind} ext={ext} size={64} />
        <div className="dv-pv-none-title">No preview for {ext ? `.${ext}` : "this"} files</div>
        <div className="dv-pv-none-sub">Download it to open in {meta.label === "File" ? "its app" : `your ${meta.label.toLowerCase()} app`}.</div>
        <button className="dv-btn primary" onClick={() => downloadFile(fileId, name, version).catch((e) => message.error(errText(e)))}>
          <DownloadOutlined /> Download
        </button>
      </div>
    );
  }
  if (isText) {
    if (text === null) return <div className="dv-pv dv-pv-loading"><Spin /></div>;
    if (mime === "text/csv" || ext === "csv") {
      const rows = parseCsv(text);
      return (
        <div className="dv-pv dv-pv-table">
          <table>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={i === 0 ? "head" : ""}>
                  <td className="rn">{i + 1}</td>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {(truncated || rows.length >= 60) && <div className="dv-pv-more">Showing the first rows · download for the full file</div>}
        </div>
      );
    }
    return (
      <div className="dv-pv dv-pv-text">
        <pre>{text || "(empty file)"}</pre>
        {truncated && <div className="dv-pv-more">Showing the first 200 KB</div>}
      </div>
    );
  }
  if (loading || (!url && !error)) return <div className="dv-pv dv-pv-loading"><Spin /></div>;
  if (error || !url) return <div className="dv-pv dv-pv-loading">Couldn't load the preview.</div>;
  if (kind === "image")
    return (
      <Tooltip title="Click to open full size in a new tab">
        <div className="dv-pv dv-pv-image" onClick={() => openInBrowser(fileId, version).catch((e) => message.error(errText(e)))}>
          <img src={url} alt={name} />
        </div>
      </Tooltip>
    );
  if (kind === "video") return <div className="dv-pv dv-pv-video"><video src={url} controls /></div>;
  return (
    <div className="dv-pv dv-pv-audio" style={{ ["--k" as any]: meta.color }}>
      <FileIcon kind={kind} ext={ext} size={52} />
      <audio src={url} controls />
    </div>
  );
};

// ── New version panel ─────────────────────────────────────────────────────

const NewVersion: React.FC<{ fileId: number; next: number; onUploaded: (d: DriveFileDetail) => void }> = ({
  fileId,
  next,
  onUploaded,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async () => {
    if (!file) return;
    setPct(0);
    try {
      const res = await driveService.uploadVersion(fileId, file, note.trim() || undefined, setPct);
      message.success(res.data.message || `Version ${next} uploaded`);
      setFile(null);
      setNote("");
      emitDriveChanged();
      onUploaded(res.data.data);
    } catch (e) {
      message.error(errText(e));
    } finally {
      setPct(null);
    }
  };

  return (
    <div className="dv-nv">
      <div
        className={`dv-nv-drop${over ? " over" : ""}${file ? " has" : ""}`}
        onClick={() => pct === null && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
      >
        <div className="dv-nv-badge">v{next}</div>
        {file ? (
          <div className="dv-nv-file">
            <b>{file.name}</b>
            <span>{fmtBytes(file.size)} · click to choose another</span>
          </div>
        ) : (
          <div className="dv-nv-file">
            <b>Upload a new version</b>
            <span>Drop the updated file here or click to browse. Older versions stay in history.</span>
          </div>
        )}
        <CloudUploadOutlined className="dv-nv-cloud" />
        <input
          ref={input}
          type="file"
          hidden
          onChange={(e) => {
            if (e.target.files?.[0]) setFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>
      {file && (
        <div className="dv-nv-form">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="What changed in this version? (optional)"
            onPressEnter={upload}
            disabled={pct !== null}
          />
          <button className="dv-btn primary" onClick={upload} disabled={pct !== null}>
            {pct !== null ? <LoadingOutlined /> : <CloudUploadOutlined />}
            {pct !== null ? `${pct}%` : `Save as v${next}`}
          </button>
          {pct !== null && (
            <div className="dv-up-bar wide">
              <span style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Drawer ────────────────────────────────────────────────────────────────

const FileDrawer: React.FC<{
  fileId: number | null;
  folders: DriveFolder[];
  onClose: () => void;
  onOpenFolder: (id: number | null) => void;
}> = ({ fileId, folders, onClose, onOpenFolder }) => {
  const [detail, setDetail] = useState<DriveFileDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("details");
  const [previewVersion, setPreviewVersion] = useState<DriveVersion | null>(null);
  const [moving, setMoving] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  // Editable details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const apply = useCallback((d: DriveFileDetail) => {
    setDetail(d);
    setName(d.file.name);
    setDescription(d.file.description || "");
    setTags(d.file.tags);
    setPreviewVersion(null);
  }, []);

  const load = useCallback(
    (id: number) => {
      setLoading(true);
      driveService
        .file(id)
        .then((r) => apply(r.data.data))
        .catch((e) => {
          message.error(errText(e, "Couldn't open the file"));
          onClose();
        })
        .finally(() => setLoading(false));
    },
    [apply, onClose],
  );

  useEffect(() => {
    if (!fileId) {
      setDetail(null);
      return;
    }
    setTab("details");
    load(fileId);
    driveService
      .tags()
      .then((r) => setTagOptions((r.data.data.tags as { tag: string }[]).map((t) => t.tag)))
      .catch(() => undefined);
  }, [fileId, load]);

  const f = detail?.file;
  const can = detail?.can.update;
  const current = detail?.versions.find((v) => v.is_current) || detail?.versions[0];
  const dirty =
    !!f && (name.trim() !== f.name || (description.trim() || null) !== (f.description || null) || tags.join(",") !== f.tags.join(","));

  const save = async () => {
    if (!f) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (name.trim() !== f.name) payload.name = name.trim();
      if ((description.trim() || null) !== (f.description || null)) payload.description = description.trim() || null;
      if (tags.join(",") !== f.tags.join(",")) payload.tags = tags;
      const res = await driveService.updateFile(f.id, payload);
      apply(res.data.data);
      message.success("Details saved");
      emitDriveChanged();
    } catch (e) {
      message.error(errText(e));
    } finally {
      setSaving(false);
    }
  };

  const download = async (v?: DriveVersion) => {
    if (!f) return;
    setDownloading(v?.version_no ?? 0);
    try {
      await downloadFile(f.id, f.name, v && !v.is_current ? v.version_no : undefined);
    } catch (e) {
      message.error(errText(e, "Download failed"));
    } finally {
      setDownloading(null);
    }
  };

  const restore = async (v: DriveVersion) => {
    if (!f) return;
    setRestoring(v.id);
    try {
      const res = await driveService.restore(f.id, v.id);
      apply(res.data.data);
      message.success(res.data.message);
      emitDriveChanged();
    } catch (e) {
      message.error(errText(e));
    } finally {
      setRestoring(null);
    }
  };

  const sizeDelta = useMemo(() => {
    const m = new Map<number, number | null>();
    const list = detail?.versions || [];
    list.forEach((v, i) => {
      const prev = list[i + 1];
      m.set(v.id, prev ? v.size_bytes - prev.size_bytes : null);
    });
    return m;
  }, [detail]);

  const shown = previewVersion || current;
  const meta = f ? KIND_META[f.kind] || KIND_META.other : KIND_META.other;
  const contributors = useMemo(() => {
    const m = new Map<number, { id: number; name: string | null }>();
    detail?.versions.forEach((v) => v.uploaded_by && m.set(v.uploaded_by.id, v.uploaded_by));
    return [...m.values()];
  }, [detail]);

  return (
    <Drawer
      open={!!fileId}
      onClose={onClose}
      width={Math.min(760, typeof window !== "undefined" ? window.innerWidth : 760)}
      rootClassName="dv-drawer"
      closable={false}
      title={null}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      {!f ? (
        <div className="dv-center">
          <Spin />
        </div>
      ) : (
        <div className="dv-fd" style={{ ["--k" as any]: meta.color, ["--ks" as any]: meta.soft }}>
          {/* Hero */}
          <div className="dv-fd-hero">
            <div className="dv-fd-hero-glow" />
            <div className="dv-fd-top">
              <div className="dv-fd-crumbs">
                <a onClick={() => onOpenFolder(null)}>My Drive</a>
                {f.path?.map((p) => (
                  <React.Fragment key={p.id}>
                    <span>/</span>
                    <a onClick={() => onOpenFolder(p.id)}>{p.name}</a>
                  </React.Fragment>
                ))}
              </div>
              <button className="dv-fd-close" onClick={onClose} aria-label="Close">
                <CloseOutlined />
              </button>
            </div>
            <div className="dv-fd-head">
              <div className="dv-fd-icon">
                <FileIcon kind={f.kind} ext={f.extension} size={54} />
              </div>
              <div className="dv-fd-title-wrap">
                <div className="dv-fd-title" title={f.name}>
                  {f.name}
                </div>
                <div className="dv-fd-chips">
                  <span className="dv-fd-chip strong">
                    <HistoryOutlined /> v{f.current_version}
                  </span>
                  <span className="dv-fd-chip">{meta.label}</span>
                  <span className="dv-fd-chip">{fmtBytes(f.size_bytes)}</span>
                  <span className="dv-fd-chip">Updated {fmtAgo(f.updated_at)}</span>
                  {loading && <LoadingOutlined className="dv-fd-spin" />}
                </div>
              </div>
            </div>
            <div className="dv-fd-actions">
              <button className="dv-btn white" onClick={() => download()} disabled={downloading !== null}>
                {downloading === 0 ? <LoadingOutlined /> : <DownloadOutlined />} Download
              </button>
              {current?.previewable && (
                <button className="dv-btn glass" onClick={() => openInBrowser(f.id).catch((e) => message.error(errText(e)))}>
                  <ExportOutlined /> Open in browser
                </button>
              )}
              {can && (
                <button className="dv-btn glass" onClick={() => setTab("versions")}>
                  <CloudUploadOutlined /> New version
                </button>
              )}
              {can && (
                <button className="dv-btn glass" onClick={() => setMoving(true)}>
                  <SwapOutlined /> Move
                </button>
              )}
              <div className="dv-fd-people">
                {contributors.slice(0, 5).map((u) => (
                  <Avatar key={u.id} user={u} size={26} ring />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="dv-fd-preview">
            {previewVersion && !previewVersion.is_current && (
              <div className="dv-fd-pv-banner">
                <HistoryOutlined /> Viewing <b>version {previewVersion.version_no}</b> from {fmtDateTime(previewVersion.created_at)}
                <a onClick={() => setPreviewVersion(null)}>Back to current</a>
              </div>
            )}
            {shown && (
              <Preview
                key={`${f.id}:${shown.version_no}`}
                fileId={f.id}
                version={shown.version_no}
                kind={shown.kind}
                ext={shown.extension}
                mime={shown.mime_type}
                previewable={shown.previewable}
                name={f.name}
              />
            )}
          </div>

          {/* Tabs */}
          <div className="dv-fd-tabs">
            {(
              [
                ["details", "Details", <InfoCircleOutlined key="i" />],
                ["versions", `Versions`, <HistoryOutlined key="h" />],
                ["activity", `History`, <UnorderedListOutlined key="u" />],
              ] as [Tab, string, React.ReactNode][]
            ).map(([k, label, icon]) => (
              <button key={k} className={`dv-fd-tab${tab === k ? " active" : ""}`} onClick={() => setTab(k)}>
                {icon} {label}
                {k === "versions" && <span className="dv-fd-count">{detail!.versions.length}</span>}
                {k === "activity" && <span className="dv-fd-count">{detail!.activity.length}</span>}
              </button>
            ))}
          </div>

          <div className="dv-fd-body">
            {tab === "details" && (
              <div className="dv-fd-details">
                <div className="dv-fd-edit">
                  <label className="dv-label">Name</label>
                  {can ? (
                    <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} onPressEnter={() => dirty && save()} />
                  ) : (
                    <div className="dv-ro">{f.name}</div>
                  )}
                  <label className="dv-label">Description</label>
                  {can ? (
                    <Input.TextArea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      autoSize={{ minRows: 2, maxRows: 6 }}
                      maxLength={5000}
                      placeholder="Add a description so others know what this file is"
                    />
                  ) : (
                    <div className="dv-ro">{f.description || <i>No description</i>}</div>
                  )}
                  <label className="dv-label">Tags</label>
                  {can ? (
                    <Select
                      mode="tags"
                      value={tags}
                      onChange={(v) =>
                        setTags([...new Set((v as string[]).map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter(Boolean))].slice(0, 12))
                      }
                      options={tagOptions.map((t) => ({ value: t, label: `#${t}` }))}
                      tokenSeparators={[","]}
                      placeholder="Add tags"
                      style={{ width: "100%" }}
                    />
                  ) : (
                    <div className="dv-ro">
                      {f.tags.length ? f.tags.map((t) => <span key={t} className="dv-tag">#{t}</span>) : <i>No tags</i>}
                    </div>
                  )}
                  {can && dirty && (
                    <div className="dv-fd-save">
                      <span>Unsaved changes</span>
                      <button
                        className="dv-btn ghost"
                        onClick={() => {
                          setName(f.name);
                          setDescription(f.description || "");
                          setTags(f.tags);
                        }}
                      >
                        Reset
                      </button>
                      <button className="dv-btn primary" onClick={save} disabled={saving || !name.trim()}>
                        {saving && <LoadingOutlined />} Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="dv-fd-grid">
                  <div className="dv-fd-cell">
                    <span>Type</span>
                    <b>
                      {meta.label}
                      {f.extension && <em> · .{f.extension}</em>}
                    </b>
                  </div>
                  <div className="dv-fd-cell">
                    <span>Size</span>
                    <b>{fmtBytes(f.size_bytes)}</b>
                  </div>
                  <div className="dv-fd-cell">
                    <span>Created</span>
                    <b className="who">
                      <Avatar user={f.creator} size={20} /> {f.creator?.name}
                    </b>
                    <small>{fmtDateTime(f.created_at)}</small>
                  </div>
                  <div className="dv-fd-cell">
                    <span>Last modified</span>
                    <b className="who">
                      <Avatar user={f.editor} size={20} /> {f.editor?.name}
                    </b>
                    <small>{fmtDateTime(f.updated_at)}</small>
                  </div>
                  <div className="dv-fd-cell">
                    <span>Location</span>
                    <b>
                      <a onClick={() => onOpenFolder(f.folder_id)}>
                        {f.path?.length ? f.path.map((p) => p.name).join(" / ") : "My Drive"}
                      </a>
                    </b>
                  </div>
                  <div className="dv-fd-cell">
                    <span>Versions</span>
                    <b>
                      {detail!.versions.length} saved · current v{f.current_version}
                    </b>
                  </div>
                  {current && (
                    <div className="dv-fd-cell wide">
                      <span>
                        <SafetyCertificateOutlined /> SHA-256 of current version
                      </span>
                      <Tooltip title={current.checksum}>
                        <code>{current.checksum ? `${current.checksum.slice(0, 20)}…${current.checksum.slice(-8)}` : "—"}</code>
                      </Tooltip>
                      <small>Original upload name: {current.original_name}</small>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "versions" && (
              <div className="dv-fd-versions">
                {can && <NewVersion fileId={f.id} next={f.current_version + 1} onUploaded={apply} />}
                <div className="dv-vt">
                  {detail!.versions.map((v) => {
                    const delta = sizeDelta.get(v.id);
                    return (
                      <div key={v.id} className={`dv-vt-item${v.is_current ? " current" : ""}`}>
                        <div className="dv-vt-rail">
                          <span className="dv-vt-dot">{v.version_no}</span>
                        </div>
                        <div className="dv-vt-card">
                          <div className="dv-vt-head">
                            <b>Version {v.version_no}</b>
                            {v.is_current && <span className="dv-pill current">Current</span>}
                            {v.restored_from && (
                              <span className="dv-pill restored">
                                <RollbackOutlined /> Restored from v{v.restored_from}
                              </span>
                            )}
                            <Tooltip title={fmtDateTime(v.created_at)}>
                              <span className="dv-vt-time">{fmtAgo(v.created_at)}</span>
                            </Tooltip>
                          </div>
                          <div className="dv-vt-by">
                            <Avatar user={v.uploaded_by} size={20} />
                            <span>
                              <b>{v.uploaded_by?.name || "Someone"}</b> · {fmtDateTime(v.created_at)}
                            </span>
                          </div>
                          {v.note && <div className="dv-vt-note">{v.note}</div>}
                          <div className="dv-vt-meta">
                            <span>
                              <FileSearchOutlined /> {v.original_name}
                            </span>
                            <span>{fmtBytes(v.size_bytes)}</span>
                            {delta !== null && delta !== undefined && (
                              <span className={`dv-vt-delta ${delta > 0 ? "up" : delta < 0 ? "down" : ""}`}>{fmtDelta(delta)}</span>
                            )}
                          </div>
                          <div className="dv-vt-actions">
                            {v.previewable && (
                              <button
                                className={`dv-chip-btn${shown?.id === v.id ? " primary" : ""}`}
                                onClick={() => setPreviewVersion(v.is_current ? null : v)}
                              >
                                <EyeOutlined /> {shown?.id === v.id ? "Previewing" : "Preview"}
                              </button>
                            )}
                            {v.previewable && (
                              <button
                                className="dv-chip-btn"
                                onClick={() => openInBrowser(f.id, v.is_current ? undefined : v.version_no).catch((e) => message.error(errText(e)))}
                              >
                                <ExportOutlined /> Open
                              </button>
                            )}
                            <button className="dv-chip-btn" onClick={() => download(v)} disabled={downloading !== null}>
                              {downloading === v.version_no ? <LoadingOutlined /> : <DownloadOutlined />} Download
                            </button>
                            {can && !v.is_current && (
                              <Popconfirm
                                title={`Restore version ${v.version_no}?`}
                                description={`It will be saved as version ${f.current_version + 1}. Nothing is lost — the current version stays in history.`}
                                okText="Restore"
                                onConfirm={() => restore(v)}
                              >
                                <button className="dv-chip-btn warn" disabled={restoring !== null}>
                                  {restoring === v.id ? <LoadingOutlined /> : <RollbackOutlined />} Restore
                                </button>
                              </Popconfirm>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "activity" && (
              <div className="dv-fd-activity">
                {detail!.activity.length ? (
                  detail!.activity.map((a) => <ActivityRow key={a.id} item={a} />)
                ) : (
                  <div className="dv-empty-mini">No history yet.</div>
                )}
              </div>
            )}
          </div>

          <MoveModal
            open={moving}
            itemName={f.name}
            folders={folders}
            currentFolderId={f.folder_id}
            onClose={() => setMoving(false)}
            onMove={async (target) => {
              try {
                const res = await driveService.updateFile(f.id, { folder_id: target });
                apply(res.data.data);
                message.success("File moved");
                emitDriveChanged();
              } catch (e) {
                message.error(errText(e));
                throw e;
              }
            }}
          />
        </div>
      )}
    </Drawer>
  );
};

export default FileDrawer;
