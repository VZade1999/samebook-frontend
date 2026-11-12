import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Dropdown, Input, Select, Skeleton, Tooltip, message } from "antd";
import type { MenuProps } from "antd";
import {
  AppstoreOutlined,
  BarsOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  EditOutlined,
  ExportOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  MoreOutlined,
  PlusOutlined,
  RightOutlined,
  SearchOutlined,
  SwapOutlined,
  TagsOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { downloadFile, driveService, openInBrowser } from "../services/driveService";
import {
  DRIVE_CHANGED_EVENT,
  DriveActivityItem,
  DriveFile,
  DriveFolder,
  KIND_FILTERS,
  KIND_META,
  PathPart,
  emitDriveChanged,
  errText,
  fmtAgo,
  fmtBytes,
  fmtDateTime,
  folderHex,
} from "../constants";
import { useDriveMeta } from "../hooks";
import { Avatar, FileIcon, FileThumb, FolderGlyph, StorageMeter, TagChip } from "../components/DriveBits";
import FolderModal, { FolderModalMode } from "../components/FolderModal";
import MoveModal from "../components/MoveModal";
import UploadModal from "../components/UploadModal";
import FileDrawer from "../components/FileDrawer";
import ActivityRow from "../components/ActivityRow";
import "../styles/drive.scss";

type View = "browse" | "recent" | "mine" | "activity";
type Sort = "name" | "updated" | "size";
type Layout = "grid" | "list";

const LAYOUT_KEY = "drive_layout";
const readLayout = (): Layout => {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};

const sortFiles = (files: DriveFile[], sort: Sort) =>
  [...files].sort((a, b) =>
    sort === "updated"
      ? dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
      : sort === "size"
        ? b.size_bytes - a.size_bytes
        : a.name.localeCompare(b.name, undefined, { numeric: true }),
  );

const dayLabel = (d: string | null) => {
  if (!d) return "Earlier";
  const day = dayjs(d);
  if (day.isSame(dayjs(), "day")) return "Today";
  if (day.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
  return day.format(day.isSame(dayjs(), "year") ? "dddd, D MMMM" : "D MMMM YYYY");
};

const DrivePage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const view = ((params.get("view") as View) || "browse") as View;
  const folderId = params.get("folder") ? Number(params.get("folder")) : null;
  const openFileId = params.get("file") ? Number(params.get("file")) : null;
  const q = params.get("q") || "";
  const tag = params.get("tag") || "";
  const kind = params.get("kind") || "all";
  const searching = !!(q || tag);

  const meta = useDriveMeta();
  const storageMissing = meta?.storage === "unconfigured";
  const canCreate = !!meta?.can.create && !storageMissing;
  const canUpdate = !!meta?.can.update;

  const [tree, setTree] = useState<{ folders: DriveFolder[]; root_file_count: number } | null>(null);
  const [listing, setListing] = useState<{ folder: DriveFolder | null; path: PathPart[]; folders: DriveFolder[]; files: DriveFile[] } | null>(null);
  const [results, setResults] = useState<DriveFile[] | null>(null);
  const [activity, setActivity] = useState<{ items: DriveActivityItem[]; has_more: boolean } | null>(null);
  const [tagList, setTagList] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [layout, setLayoutState] = useState<Layout>(readLayout);
  const [sort, setSort] = useState<Sort>("name");
  const [searchInput, setSearchInput] = useState(q);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [folderModal, setFolderModal] = useState<FolderModalMode | null>(null);
  const [upload, setUpload] = useState<{ open: boolean; files: File[] }>({ open: false, files: [] });
  const [moving, setMoving] = useState<{ type: "file"; item: DriveFile } | { type: "folder"; item: DriveFolder } | null>(null);
  const [dragDepth, setDragDepth] = useState(0);
  const reqId = useRef(0);

  const setLayout = (l: Layout) => {
    setLayoutState(l);
    try {
      localStorage.setItem(LAYOUT_KEY, l);
    } catch {
      // storage blocked: layout just isn't remembered
    }
  };

  const go = useCallback(
    (next: Record<string, string | number | null | undefined>, keep: string[] = []) => {
      const p = new URLSearchParams();
      keep.forEach((k) => params.get(k) && p.set(k, params.get(k)!));
      Object.entries(next).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
      });
      setParams(p);
    },
    [params, setParams],
  );
  const openFolder = useCallback((id: number | null) => go({ folder: id }), [go]);
  const openFile = useCallback(
    (id: number) => {
      const p = new URLSearchParams(params);
      p.set("file", String(id));
      setParams(p);
    },
    [params, setParams],
  );
  const closeFile = useCallback(() => {
    const p = new URLSearchParams(params);
    p.delete("file");
    setParams(p, { replace: true });
  }, [params, setParams]);

  // ── data ────────────────────────────────────────────────────────────────
  const loadTree = useCallback(() => {
    driveService
      .folders()
      .then((r) => setTree(r.data.data))
      .catch(() => undefined);
    driveService
      .tags()
      .then((r) => setTagList(r.data.data.tags))
      .catch(() => undefined);
  }, []);

  const loadView = useCallback(
    (quiet = false) => {
      const id = ++reqId.current;
      if (!quiet) setLoading(true);
      const done = () => id === reqId.current && setLoading(false);
      const onErr = (e: any) => {
        if (id !== reqId.current) return;
        message.error(errText(e, "Couldn't load Drive"));
        if (e?.response?.status === 404 && folderId) openFolder(null);
      };
      if (searching) {
        driveService
          .search({ q: q || undefined, tag: tag || undefined, kind })
          .then((r) => id === reqId.current && setResults(r.data.data.files))
          .catch(onErr)
          .finally(done);
      } else if (view === "recent" || view === "mine") {
        driveService
          .recent(view === "mine" ? "mine" : undefined)
          .then((r) => id === reqId.current && setResults(r.data.data.files))
          .catch(onErr)
          .finally(done);
      } else if (view === "activity") {
        driveService
          .activity({ limit: 40 })
          .then((r) => id === reqId.current && setActivity(r.data.data))
          .catch(onErr)
          .finally(done);
      } else {
        driveService
          .browse(folderId)
          .then((r) => id === reqId.current && setListing(r.data.data))
          .catch(onErr)
          .finally(done);
      }
    },
    [searching, q, tag, kind, view, folderId, openFolder],
  );

  useEffect(() => {
    loadTree();
  }, [loadTree]);
  useEffect(() => {
    loadView();
  }, [loadView]);
  useEffect(() => {
    const onChange = () => {
      loadTree();
      loadView(true);
    };
    window.addEventListener(DRIVE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(DRIVE_CHANGED_EVENT, onChange);
  }, [loadTree, loadView]);

  // Keep the search box in sync with the URL, and debounce typing into it.
  useEffect(() => setSearchInput(q), [q]);
  useEffect(() => {
    if (searchInput.trim() === q) return;
    const t = setTimeout(() => {
      const p = new URLSearchParams(params);
      if (searchInput.trim()) p.set("q", searchInput.trim());
      else p.delete("q");
      p.delete("file");
      setParams(p, { replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, q, params, setParams]);

  // Auto-expand the tree down to the open folder.
  useEffect(() => {
    if (!tree || !folderId) return;
    const byId = new Map(tree.folders.map((f) => [f.id, f]));
    setExpanded((cur) => {
      const n = new Set(cur);
      let f = byId.get(folderId);
      while (f) {
        n.add(f.id);
        f = f.parent_id ? byId.get(f.parent_id) : undefined;
      }
      return n;
    });
  }, [tree, folderId]);

  const children = useMemo(() => {
    const m = new Map<number | null, DriveFolder[]>();
    (tree?.folders || []).forEach((f) => {
      const k = f.parent_id ?? null;
      (m.get(k) || m.set(k, []).get(k)!).push(f);
    });
    return m;
  }, [tree]);

  const currentName = listing?.folder?.name || "My Drive";

  // ── drag & drop anywhere on the page ──────────────────────────────────
  const dropEnabled = canCreate && view === "browse" && !searching;
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types || []).includes("Files");
  const dragProps = dropEnabled
    ? {
        onDragEnter: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDragDepth((d) => d + 1);
        },
        onDragOver: (e: React.DragEvent) => {
          if (hasFiles(e)) e.preventDefault();
        },
        onDragLeave: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          setDragDepth((d) => Math.max(0, d - 1));
        },
        onDrop: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDragDepth(0);
          const files = Array.from(e.dataTransfer.files || []);
          if (files.length) setUpload({ open: true, files });
        },
      }
    : {};

  // ── derived lists ───────────────────────────────────────────────────────
  const visibleFiles = useMemo(() => {
    const src = searching || view === "recent" || view === "mine" ? results || [] : listing?.files || [];
    const filtered = !searching && kind !== "all" ? src.filter((f) => f.kind === kind) : src;
    return view === "recent" || view === "mine" ? filtered : sortFiles(filtered, sort);
  }, [searching, view, results, listing, kind, sort]);

  const visibleFolders = view === "browse" && !searching && kind === "all" ? listing?.folders || [] : [];

  // ── menus ───────────────────────────────────────────────────────────────
  const fileMenu = (f: DriveFile): MenuProps => ({
    items: [
      { key: "open", icon: <FolderOpenOutlined />, label: "Open details" },
      ...(f.previewable ? [{ key: "browser", icon: <ExportOutlined />, label: "Open in browser" }] : []),
      { key: "download", icon: <DownloadOutlined />, label: "Download" },
      ...(canUpdate ? [{ key: "move", icon: <SwapOutlined />, label: "Move to…" }] : []),
      ...(f.folder_id !== folderId || view !== "browse" ? [{ key: "reveal", icon: <FolderOpenOutlined />, label: "Show in folder" }] : []),
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation();
      if (key === "open") openFile(f.id);
      if (key === "browser") openInBrowser(f.id).catch((e) => message.error(errText(e, "Couldn't open the file")));
      if (key === "download") downloadFile(f.id, f.name).catch((e) => message.error(errText(e, "Download failed")));
      if (key === "move") setMoving({ type: "file", item: f });
      if (key === "reveal") openFolder(f.folder_id);
    },
  });

  const folderMenu = (f: DriveFolder): MenuProps => ({
    items: [
      { key: "open", icon: <FolderOpenOutlined />, label: "Open" },
      ...(canUpdate
        ? [
            { key: "edit", icon: <EditOutlined />, label: "Rename & colour" },
            { key: "move", icon: <SwapOutlined />, label: "Move to…" },
          ]
        : []),
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation();
      if (key === "open") openFolder(f.id);
      if (key === "edit") setFolderModal({ kind: "edit", folder: f });
      if (key === "move") setMoving({ type: "folder", item: f });
    },
  });

  // ── pieces ──────────────────────────────────────────────────────────────
  const renderTree = (parent: number | null, depth: number): React.ReactNode =>
    (children.get(parent) || []).map((f) => {
      const kids = children.get(f.id) || [];
      const open = expanded.has(f.id);
      const active = view === "browse" && !searching && folderId === f.id;
      return (
        <React.Fragment key={f.id}>
          <div
            className={`dv-tree-row${active ? " active" : ""}`}
            style={{ paddingLeft: 8 + depth * 14, ["--fc" as any]: folderHex(f.color) }}
            onClick={() => openFolder(f.id)}
            title={f.name}
          >
            <span
              className="dv-tree-caret"
              onClick={(e) => {
                e.stopPropagation();
                if (!kids.length) return;
                setExpanded((s) => {
                  const n = new Set(s);
                  n.has(f.id) ? n.delete(f.id) : n.add(f.id);
                  return n;
                });
              }}
            >
              {kids.length ? open ? <CaretDownOutlined /> : <CaretRightOutlined /> : null}
            </span>
            <FolderGlyph color={f.color} size={18} open={active} />
            <span className="dv-tree-name">{f.name}</span>
            {f.file_count > 0 && <span className="dv-tree-count">{f.file_count}</span>}
          </div>
          {open && kids.length > 0 && renderTree(f.id, depth + 1)}
        </React.Fragment>
      );
    });

  const navItem = (key: View, icon: React.ReactNode, label: string) => {
    const active = view === key && !searching && (key !== "browse" || folderId === null);
    return (
      <button className={`dv-nav-item${active ? " active" : ""}`} onClick={() => go(key === "browse" ? {} : { view: key })}>
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  const fileCard = (f: DriveFile, showPath?: boolean) => (
    <div key={f.id} className="dv-card" onClick={() => openFile(f.id)} style={{ ["--k" as any]: KIND_META[f.kind]?.color }}>
      <div className="dv-card-art">
        <FileThumb file={f} />
        {f.current_version > 1 && (
          <Tooltip title={`${f.current_version} versions`}>
            <span className="dv-card-ver">
              <HistoryOutlined /> v{f.current_version}
            </span>
          </Tooltip>
        )}
        <Dropdown menu={fileMenu(f)} trigger={["click"]} placement="bottomRight">
          <button className="dv-card-more" onClick={(e) => e.stopPropagation()} aria-label="More">
            <MoreOutlined />
          </button>
        </Dropdown>
      </div>
      <div className="dv-card-body">
        <div className="dv-card-name" title={f.name}>
          {f.name}
        </div>
        <div className="dv-card-sub">
          <span>{fmtBytes(f.size_bytes)}</span>
          <span className="dot" />
          <Tooltip title={`${fmtDateTime(f.updated_at)} by ${f.editor?.name || "—"}`}>
            <span>{fmtAgo(f.updated_at)}</span>
          </Tooltip>
        </div>
        {showPath && (
          <div className="dv-card-path" title={f.path?.map((p) => p.name).join(" / ") || "My Drive"}>
            <FolderOpenOutlined /> {f.path?.length ? f.path[f.path.length - 1].name : "My Drive"}
          </div>
        )}
        <div className="dv-card-foot">
          <div className="dv-card-tags">
            {f.tags.slice(0, 2).map((t) => (
              <TagChip key={t} tag={t} small onClick={() => go({ tag: t })} />
            ))}
            {f.tags.length > 2 && <span className="dv-tag small more">+{f.tags.length - 2}</span>}
          </div>
          <Avatar user={f.editor} size={22} />
        </div>
      </div>
    </div>
  );

  const folderCard = (f: DriveFolder) => (
    <div key={f.id} className="dv-folder" style={{ ["--fc" as any]: folderHex(f.color) }} onClick={() => openFolder(f.id)} title={f.description || f.name}>
      <FolderGlyph color={f.color} size={40} />
      <div className="dv-folder-text">
        <div className="dv-folder-name">{f.name}</div>
        <div className="dv-folder-sub">
          {[f.folder_count ? `${f.folder_count} folder${f.folder_count === 1 ? "" : "s"}` : null, `${f.file_count} file${f.file_count === 1 ? "" : "s"}`]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <Dropdown menu={folderMenu(f)} trigger={["click"]} placement="bottomRight">
        <button className="dv-folder-more" onClick={(e) => e.stopPropagation()} aria-label="More">
          <MoreOutlined />
        </button>
      </Dropdown>
    </div>
  );

  const fileTable = (files: DriveFile[], showPath?: boolean) => (
    <div className="dv-table">
      <div className="dv-tr dv-th">
        <span>Name</span>
        <span className="c-ver">Version</span>
        <span className="c-size">Size</span>
        {showPath && <span className="c-loc">Location</span>}
        <span className="c-mod">Last modified</span>
        <span className="c-act" />
      </div>
      {files.map((f) => (
        <div key={f.id} className="dv-tr" onClick={() => openFile(f.id)}>
          <span className="c-name">
            <FileIcon kind={f.kind} ext={f.extension} size={24} />
            <span className="c-name-text">
              <b title={f.name}>{f.name}</b>
              {f.tags.length > 0 && (
                <span className="c-tags">
                  {f.tags.slice(0, 3).map((t) => (
                    <TagChip key={t} tag={t} small onClick={() => go({ tag: t })} />
                  ))}
                </span>
              )}
            </span>
          </span>
          <span className="c-ver">
            <span className={`dv-vbadge${f.current_version > 1 ? "" : " muted"}`}>v{f.current_version}</span>
          </span>
          <span className="c-size">{fmtBytes(f.size_bytes)}</span>
          {showPath && (
            <span className="c-loc" title={f.path?.map((p) => p.name).join(" / ") || "My Drive"}>
              <a
                onClick={(e) => {
                  e.stopPropagation();
                  openFolder(f.folder_id);
                }}
              >
                {f.path?.length ? f.path.map((p) => p.name).join(" / ") : "My Drive"}
              </a>
            </span>
          )}
          <span className="c-mod">
            <Avatar user={f.editor} size={22} />
            <span>
              <b>{f.editor?.name}</b>
              <Tooltip title={fmtDateTime(f.updated_at)}>
                <small>{fmtAgo(f.updated_at)}</small>
              </Tooltip>
            </span>
          </span>
          <span className="c-act">
            <Dropdown menu={fileMenu(f)} trigger={["click"]} placement="bottomRight">
              <button className="dv-icon-btn" onClick={(e) => e.stopPropagation()} aria-label="More">
                <MoreOutlined />
              </button>
            </Dropdown>
          </span>
        </div>
      ))}
    </div>
  );

  const filesBlock = (files: DriveFile[], showPath?: boolean) =>
    layout === "grid" ? <div className="dv-grid">{files.map((f) => fileCard(f, showPath))}</div> : fileTable(files, showPath);

  const empty = (title: string, sub: string, cta?: boolean) => (
    <div className="dv-empty">
      <div className="dv-empty-art">
        <FolderGlyph color={listing?.folder?.color || "indigo"} size={88} open />
        <span className="dv-empty-file a">
          <FileIcon kind="pdf" ext="pdf" size={30} />
        </span>
        <span className="dv-empty-file b">
          <FileIcon kind="image" ext="jpg" size={26} />
        </span>
        <span className="dv-empty-file c">
          <FileIcon kind="sheet" ext="xlsx" size={28} />
        </span>
      </div>
      <div className="dv-empty-title">{title}</div>
      <div className="dv-empty-sub">{sub}</div>
      {cta && canCreate && (
        <div className="dv-empty-cta">
          <button className="dv-btn primary" onClick={() => setUpload({ open: true, files: [] })}>
            <CloudUploadOutlined /> Upload files
          </button>
          <button className="dv-btn ghost" onClick={() => setFolderModal({ kind: "create", parentId: folderId, parentName: currentName })}>
            <FolderAddOutlined /> New folder
          </button>
        </div>
      )}
    </div>
  );

  // ── title per view ──────────────────────────────────────────────────────
  const heading = (() => {
    if (searching)
      return (
        <div className="dv-heading">
          <SearchOutlined />
          <span>
            {q ? (
              <>
                Results for <b>“{q}”</b>
              </>
            ) : null}
            {q && tag ? " tagged " : null}
            {tag ? <b className="dv-heading-tag">#{tag}</b> : null}
          </span>
          <button className="dv-clear" onClick={() => go({})}>
            Clear
          </button>
        </div>
      );
    if (view === "recent") return <div className="dv-heading"><ClockCircleOutlined /> Recently updated</div>;
    if (view === "mine") return <div className="dv-heading"><UserOutlined /> Files I've worked on</div>;
    if (view === "activity") return <div className="dv-heading"><HistoryOutlined /> Activity across Drive</div>;
    return (
      <div className="dv-crumbs">
        <a className={!listing?.path?.length ? "current" : ""} onClick={() => openFolder(null)}>
          <CloudOutlined /> My Drive
        </a>
        {listing?.path?.map((p, i) => (
          <React.Fragment key={p.id}>
            <RightOutlined className="sep" />
            <a className={i === listing.path.length - 1 ? "current" : ""} onClick={() => openFolder(p.id)}>
              {p.name}
            </a>
          </React.Fragment>
        ))}
      </div>
    );
  })();

  const activityGroups = useMemo(() => {
    const groups: { label: string; items: DriveActivityItem[] }[] = [];
    (activity?.items || []).forEach((a) => {
      const label = dayLabel(a.created_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(a);
      else groups.push({ label, items: [a] });
    });
    return groups;
  }, [activity]);

  const loadMoreActivity = async () => {
    if (!activity?.items.length) return;
    setLoadingMore(true);
    try {
      const r = await driveService.activity({ before_id: activity.items[activity.items.length - 1].id, limit: 40 });
      setActivity({ items: [...activity.items, ...r.data.data.items], has_more: r.data.data.has_more });
    } catch (e) {
      message.error(errText(e));
    } finally {
      setLoadingMore(false);
    }
  };

  const stats = meta?.stats;
  const cur = listing?.folder;

  return (
    <div className="dv-root" {...dragProps}>
      {/* ── Hero ── */}
      <div className="dv-hero">
        <div className="dv-hero-orb a" />
        <div className="dv-hero-orb b" />
        <div className="dv-hero-grid" />
        <div className="dv-hero-inner">
          <div className="dv-hero-left">
            <div className="dv-hero-title">
              <div className="dv-hero-icon">
                <CloudOutlined />
              </div>
              Drive
            </div>
            <div className="dv-hero-sub">Your company's shared files — organised in folders, tagged, and every version kept.</div>
            <div className="dv-hero-stats">
              {[
                ["Files", stats?.files],
                ["Folders", stats?.folders],
                ["Versions", stats?.versions],
                ["Changed this week", stats?.changed_week],
              ].map(([label, value]) => (
                <div key={label as string} className="dv-hero-stat">
                  <b>{value ?? "–"}</b>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dv-hero-right">
            <StorageMeter meta={meta} />
            {canCreate && (
              <div className="dv-hero-btns">
                <button className="dv-btn glass" onClick={() => setFolderModal({ kind: "create", parentId: view === "browse" && !searching ? folderId : null, parentName: view === "browse" && !searching ? currentName : "My Drive" })}>
                  <FolderAddOutlined /> New folder
                </button>
                <button className="dv-btn white" onClick={() => setUpload({ open: true, files: [] })}>
                  <CloudUploadOutlined /> Upload
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dv-body">
        {/* ── Rail ── */}
        <aside className="dv-rail">
          <nav className="dv-nav">
            {navItem("browse", <CloudOutlined />, "My Drive")}
            {navItem("recent", <ClockCircleOutlined />, "Recent")}
            {navItem("mine", <UserOutlined />, "Worked on by me")}
            {navItem("activity", <HistoryOutlined />, "Activity")}
          </nav>

          <div className="dv-rail-section">
            <div className="dv-rail-head">
              <span>Folders</span>
              {canCreate && (
                <Tooltip title="New folder in My Drive">
                  <button className="dv-rail-add" onClick={() => setFolderModal({ kind: "create", parentId: null, parentName: "My Drive" })}>
                    <PlusOutlined />
                  </button>
                </Tooltip>
              )}
            </div>
            <div className="dv-tree">
              {tree ? (
                tree.folders.length ? (
                  renderTree(null, 0)
                ) : (
                  <div className="dv-rail-empty">No folders yet</div>
                )
              ) : (
                <Skeleton active paragraph={{ rows: 4 }} title={false} />
              )}
            </div>
          </div>

          {tagList.length > 0 && (
            <div className="dv-rail-section">
              <div className="dv-rail-head">
                <span>
                  <TagsOutlined /> Tags
                </span>
              </div>
              <div className="dv-rail-tags">
                {tagList.slice(0, 18).map((t) => (
                  <span
                    key={t.tag}
                    className={`dv-tag clickable${tag === t.tag ? " active" : ""}`}
                    onClick={() => (tag === t.tag ? go({}) : go({ tag: t.tag }))}
                  >
                    #{t.tag}
                    <em>{t.count}</em>
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <main className="dv-main">
          <div className="dv-toolbar">
            {heading}
            <div className="dv-toolbar-right">
              <Input
                className="dv-search"
                prefix={<SearchOutlined />}
                placeholder="Search names, descriptions, tags…"
                value={searchInput}
                allowClear
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {view !== "activity" && (
                <>
                  {!(view === "recent" || view === "mine") && (
                    <Select
                      className="dv-sort"
                      value={sort}
                      onChange={setSort}
                      options={[
                        { value: "name", label: "Name" },
                        { value: "updated", label: "Last modified" },
                        { value: "size", label: "Size" },
                      ]}
                    />
                  )}
                  <div className="dv-seg">
                    <Tooltip title="Grid">
                      <button className={layout === "grid" ? "active" : ""} onClick={() => setLayout("grid")}>
                        <AppstoreOutlined />
                      </button>
                    </Tooltip>
                    <Tooltip title="List">
                      <button className={layout === "list" ? "active" : ""} onClick={() => setLayout("list")}>
                        <BarsOutlined />
                      </button>
                    </Tooltip>
                  </div>
                </>
              )}
            </div>
          </div>

          {storageMissing && (
            <div className="dv-warn">
              <b>File storage isn't set up on this server yet.</b> You can browse folders and details, but uploads and
              downloads are disabled until an administrator connects cloud storage (S3 / R2).
            </div>
          )}
          {view !== "activity" && (
            <div className="dv-kinds">
              {KIND_FILTERS.map((k) => (
                <button
                  key={k.key}
                  className={`dv-kind${kind === k.key ? " active" : ""}`}
                  style={k.key !== "all" ? { ["--k" as any]: KIND_META[k.key as keyof typeof KIND_META].color } : undefined}
                  onClick={() => {
                    const p = new URLSearchParams(params);
                    if (k.key === "all") p.delete("kind");
                    else p.set("kind", k.key);
                    setParams(p, { replace: true });
                  }}
                >
                  {k.key !== "all" && <i />}
                  {k.label}
                </button>
              ))}
            </div>
          )}

          {/* Folder banner */}
          {view === "browse" && !searching && cur && (
            <div className="dv-banner" style={{ ["--fc" as any]: folderHex(cur.color) }}>
              <FolderGlyph color={cur.color} size={52} open />
              <div className="dv-banner-text">
                <div className="dv-banner-name">{cur.name}</div>
                {cur.description && <div className="dv-banner-desc">{cur.description}</div>}
                <div className="dv-banner-meta">
                  {cur.folder_count} folder{cur.folder_count === 1 ? "" : "s"} · {cur.file_count} file{cur.file_count === 1 ? "" : "s"} · created by{" "}
                  {cur.creator?.name || "—"} {fmtAgo(cur.created_at)}
                </div>
              </div>
              <div className="dv-banner-actions">
                {canUpdate && (
                  <>
                    <Tooltip title="Rename & colour">
                      <button className="dv-icon-btn" onClick={() => setFolderModal({ kind: "edit", folder: cur })}>
                        <EditOutlined />
                      </button>
                    </Tooltip>
                    <Tooltip title="Move folder">
                      <button className="dv-icon-btn" onClick={() => setMoving({ type: "folder", item: cur })}>
                        <SwapOutlined />
                      </button>
                    </Tooltip>
                  </>
                )}
                {canCreate && (
                  <button className="dv-btn ghost sm" onClick={() => setFolderModal({ kind: "create", parentId: cur.id, parentName: cur.name })}>
                    <FolderAddOutlined /> Subfolder
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="dv-content">
            {loading ? (
              <div className="dv-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="dv-card skeleton">
                    <div className="dv-card-art" />
                    <div className="dv-card-body">
                      <Skeleton active paragraph={{ rows: 1 }} title={{ width: "70%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : view === "activity" && !searching ? (
              activityGroups.length ? (
                <div className="dv-feed">
                  {activityGroups.map((g) => (
                    <div key={g.label} className="dv-feed-group">
                      <div className="dv-feed-day">{g.label}</div>
                      <div className="dv-feed-items">
                        {g.items.map((a) => (
                          <ActivityRow key={a.id} item={a} showSubject onOpenFile={openFile} onOpenFolder={openFolder} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {activity?.has_more && (
                    <button className="dv-btn ghost dv-more" onClick={loadMoreActivity} disabled={loadingMore}>
                      {loadingMore ? "Loading…" : "Load older activity"}
                    </button>
                  )}
                </div>
              ) : (
                empty("No activity yet", "Uploads, new versions, renames and moves will show up here.")
              )
            ) : (
              <>
                {visibleFolders.length > 0 && (
                  <section className="dv-section">
                    <div className="dv-section-head">
                      Folders <em>{visibleFolders.length}</em>
                    </div>
                    <div className="dv-folders">
                      {visibleFolders.map((f) => folderCard(f))}
                    </div>
                  </section>
                )}
                {visibleFiles.length > 0 && (
                  <section className="dv-section">
                    <div className="dv-section-head">
                      Files <em>{visibleFiles.length}</em>
                      {dropEnabled && <span className="dv-section-hint">Tip: drag files anywhere here to upload</span>}
                    </div>
                    {filesBlock(visibleFiles, searching || view === "recent" || view === "mine")}
                  </section>
                )}
                {!visibleFolders.length && !visibleFiles.length && (
                  searching ? (
                    empty("Nothing matches", "Try a different word, tag or file type.")
                  ) : view === "recent" || view === "mine" ? (
                    empty(view === "mine" ? "You haven't worked on any files yet" : "No files yet", "Files you upload or update will appear here.")
                  ) : kind !== "all" ? (
                    empty(`No ${KIND_FILTERS.find((k) => k.key === kind)?.label.toLowerCase()} here`, "Switch the filter back to All to see everything in this folder.")
                  ) : (
                    empty(
                      cur ? `${cur.name} is empty` : "Your Drive is ready",
                      canCreate ? "Drop files here, or create folders to keep things organised." : "Nothing has been added here yet.",
                      true,
                    )
                  )
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {dropEnabled && dragDepth > 0 && (
        <div className="dv-dropzone-overlay">
          <div className="dv-dropzone-card">
            <div className="dv-dropzone-icon">
              <CloudUploadOutlined />
            </div>
            <b>Drop to upload</b>
            <span>
              into <FolderGlyph color={cur?.color} size={16} /> {currentName}
            </span>
          </div>
        </div>
      )}

      <FolderModal
        mode={folderModal}
        onClose={() => setFolderModal(null)}
        onSaved={(f) => {
          if (folderModal?.kind === "create" && f.parent_id) {
            setExpanded((s) => new Set(s).add(f.parent_id!));
          }
        }}
      />
      <UploadModal
        open={upload.open}
        folderId={view === "browse" && !searching ? folderId : null}
        folderName={view === "browse" && !searching ? currentName : "My Drive"}
        initialFiles={upload.files}
        maxMb={meta?.max_upload_mb || 50}
        tagOptions={tagList.map((t) => t.tag)}
        onClose={() => setUpload({ open: false, files: [] })}
      />
      <MoveModal
        open={!!moving}
        itemName={moving?.item.name || ""}
        folders={tree?.folders || []}
        currentFolderId={moving ? (moving.type === "file" ? moving.item.folder_id : moving.item.parent_id) : null}
        movingFolderId={moving?.type === "folder" ? moving.item.id : null}
        onClose={() => setMoving(null)}
        onMove={async (target) => {
          if (!moving) return;
          try {
            if (moving.type === "file") await driveService.updateFile(moving.item.id, { folder_id: target });
            else await driveService.updateFolder(moving.item.id, { parent_id: target });
            message.success(`Moved ${moving.item.name}`);
            emitDriveChanged();
          } catch (e) {
            message.error(errText(e));
            throw e;
          }
        }}
      />
      <FileDrawer fileId={openFileId} folders={tree?.folders || []} onClose={closeFile} onOpenFolder={(id) => openFolder(id)} />
    </div>
  );
};

export default DrivePage;
