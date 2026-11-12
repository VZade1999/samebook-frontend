import React, { useEffect, useId, useRef, useState } from "react";
import { Tooltip } from "antd";
import {
  DriveFile,
  DriveMeta,
  FileKind,
  KIND_META,
  avatarColor,
  fmtBytes,
  folderHex,
  initials,
} from "../constants";
import { useBlobUrl } from "../hooks";

/** A document glyph with a folded corner and a coloured extension band. */
export const FileIcon: React.FC<{ kind: FileKind; ext?: string; size?: number }> = ({ kind, ext, size = 40 }) => {
  const c = KIND_META[kind]?.color || KIND_META.other.color;
  const label = (ext || KIND_META[kind]?.label || "FILE").slice(0, 4).toUpperCase();
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 40 48" className="dv-fileicon" aria-hidden>
      <path
        d="M7 1h19l12 12v30a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4z"
        fill="var(--card)"
        stroke={c}
        strokeOpacity="0.4"
        strokeWidth="1.2"
      />
      <path d="M26 1v8.5a3.5 3.5 0 0 0 3.5 3.5H38" fill={c} fillOpacity="0.16" stroke={c} strokeOpacity="0.4" strokeWidth="1.2" />
      <rect x="9" y="15" width="15" height="2.2" rx="1.1" fill={c} opacity="0.28" />
      <rect x="9" y="20" width="21" height="2.2" rx="1.1" fill={c} opacity="0.18" />
      <rect x="0" y="28" width={label.length > 3 ? 31 : 27} height="13" rx="3.5" fill={c} />
      <text
        x={label.length > 3 ? 15.5 : 13.5}
        y="37.4"
        textAnchor="middle"
        fontSize={label.length > 3 ? 7.4 : 8.2}
        fontWeight="800"
        fill="#fff"
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="0.3"
      >
        {label}
      </text>
    </svg>
  );
};

/** A two-tone folder in the folder's colour. */
export const FolderGlyph: React.FC<{ color?: string | null; size?: number; open?: boolean }> = ({ color, size = 44, open }) => {
  const id = useId().replace(/:/g, "");
  const c = folderHex(color);
  return (
    <svg width={size} height={(size * 38) / 48} viewBox="0 0 48 38" className="dv-folderglyph" aria-hidden>
      <defs>
        <linearGradient id={`fg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.88" />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      <path d="M5 1h12.5a3 3 0 0 1 2.2 1l4.3 4.6H43a4 4 0 0 1 4 4V14H1V5a4 4 0 0 1 4-4z" fill={c} opacity="0.5" />
      {open && <rect x="5" y="8" width="38" height="14" rx="2" fill="#fff" opacity="0.85" />}
      <path
        d={open ? "M1 15.5a3 3 0 0 1 3-3h40a3 3 0 0 1 3 3L45 34a4 4 0 0 1-4 3.5H7A4 4 0 0 1 3 34z" : "M1 12.5a3 3 0 0 1 3-3h40a3 3 0 0 1 3 3V33a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4z"}
        fill={`url(#fg${id})`}
      />
      <rect x="4" y={open ? 14.5 : 11.5} width="40" height="1.6" rx="0.8" fill="#fff" opacity="0.28" />
    </svg>
  );
};

export const Avatar: React.FC<{ user?: { id: number; name: string | null } | null; size?: number; ring?: boolean }> = ({
  user,
  size = 26,
  ring,
}) => (
  <Tooltip title={user?.name || "Unknown"}>
    <span
      className={`dv-avatar${ring ? " ring" : ""}`}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38), background: avatarColor(user?.id) }}
    >
      {initials(user?.name)}
    </span>
  </Tooltip>
);

/** Fires once when the element scrolls near the viewport. */
const useInView = <T extends Element>() => {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
};

const THUMB_MAX_BYTES = 8 * 1024 * 1024;

/** Card artwork: a real thumbnail for images, else a big type icon. */
export const FileThumb: React.FC<{ file: DriveFile; iconSize?: number }> = ({ file, iconSize = 46 }) => {
  const canThumb = file.kind === "image" && file.previewable && file.size_bytes <= THUMB_MAX_BYTES;
  const { ref, seen } = useInView<HTMLDivElement>();
  const { url } = useBlobUrl(file.id, file.current_version, canThumb && seen);
  const meta = KIND_META[file.kind] || KIND_META.other;
  return (
    <div ref={ref} className={`dv-thumb${url ? " has-img" : ""}`} style={{ ["--k" as any]: meta.color, ["--ks" as any]: meta.soft }}>
      {url ? <img src={url} alt="" loading="lazy" draggable={false} /> : <FileIcon kind={file.kind} ext={file.extension} size={iconSize} />}
    </div>
  );
};

export const TagChip: React.FC<{ tag: string; active?: boolean; onClick?: () => void; small?: boolean }> = ({
  tag,
  active,
  onClick,
  small,
}) => (
  <span
    className={`dv-tag${active ? " active" : ""}${onClick ? " clickable" : ""}${small ? " small" : ""}`}
    onClick={(e) => {
      if (!onClick) return;
      e.stopPropagation();
      onClick();
    }}
  >
    #{tag}
  </span>
);

const METER_ORDER: FileKind[] = ["pdf", "image", "doc", "sheet", "slides", "video", "audio", "archive", "text", "other"];

/** Glassy storage card for the hero: used / limit and a by-type breakdown. */
export const StorageMeter: React.FC<{ meta: DriveMeta | null }> = ({ meta }) => {
  const used = meta?.quota.used_bytes || 0;
  const limit = meta?.quota.limit_bytes || 1;
  const pct = Math.min(100, (used / limit) * 100);
  const segments = METER_ORDER.map((k) => ({ k, bytes: meta?.kinds?.[k]?.bytes || 0 })).filter((s) => s.bytes > 0);
  const total = segments.reduce((a, s) => a + s.bytes, 0) || 1;
  return (
    <div className="dv-meter">
      <div className="dv-meter-top">
        <span className="dv-meter-label">Storage</span>
        <span className="dv-meter-val">
          <b>{fmtBytes(used)}</b> of {fmtBytes(limit, 0)}
        </span>
      </div>
      <div className="dv-meter-track">
        <div className="dv-meter-fill" style={{ width: `${Math.max(pct, used ? 1.5 : 0)}%` }}>
          {segments.map((s) => (
            <Tooltip key={s.k} title={`${KIND_META[s.k].plural}: ${fmtBytes(s.bytes)}`}>
              <span style={{ width: `${(s.bytes / total) * 100}%`, background: KIND_META[s.k].color }} />
            </Tooltip>
          ))}
        </div>
      </div>
      <div className="dv-meter-foot">
        {segments.length ? (
          segments.slice(0, 4).map((s) => (
            <span key={s.k} className="dv-meter-key">
              <i style={{ background: KIND_META[s.k].color }} />
              {KIND_META[s.k].plural}
            </span>
          ))
        ) : (
          <span className="dv-meter-key">Nothing stored yet</span>
        )}
        <span className="dv-meter-pct">{pct < 0.1 && used ? "<0.1" : pct.toFixed(pct < 10 ? 1 : 0)}% used</span>
      </div>
    </div>
  );
};
