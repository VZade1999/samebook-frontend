import React from "react";
import { Tooltip } from "antd";
import {
  CloudUploadOutlined,
  EditOutlined,
  FolderAddOutlined,
  FontSizeOutlined,
  HistoryOutlined,
  RollbackOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { ACTION_META, DriveActivityItem, FIELD_LABEL, fmtAgo, fmtDateTime, folderHex } from "../constants";
import { Avatar } from "./DriveBits";

const ICONS: Record<string, React.ReactNode> = {
  upload: <CloudUploadOutlined />,
  version: <HistoryOutlined />,
  restore: <RollbackOutlined />,
  rename: <FontSizeOutlined />,
  edit: <EditOutlined />,
  move: <SwapOutlined />,
  folder: <FolderAddOutlined />,
};

const clip = (s: string | null, n = 80) => (s && s.length > n ? `${s.slice(0, n)}…` : s);

/** old → new, with the old value struck through. */
const Diff: React.FC<{ from: string | null; to: string | null; color?: boolean }> = ({ from, to, color }) => (
  <span className="dv-diff">
    {from ? <s>{color ? <Swatch c={from} /> : clip(from)}</s> : <i>empty</i>}
    <span className="dv-diff-arrow">→</span>
    {to ? <b>{color ? <Swatch c={to} /> : clip(to)}</b> : <i>empty</i>}
  </span>
);
const Swatch: React.FC<{ c: string }> = ({ c }) => (
  <span className="dv-diff-swatch">
    <i style={{ background: folderHex(c) }} />
    {c}
  </span>
);

/**
 * One line of history. `showSubject` adds the file/folder name (company feed);
 * the file drawer leaves it out because the subject is obvious there.
 */
const ActivityRow: React.FC<{
  item: DriveActivityItem;
  showSubject?: boolean;
  onOpenFile?: (id: number) => void;
  onOpenFolder?: (id: number) => void;
}> = ({ item, showSubject, onOpenFile, onOpenFolder }) => {
  const meta = ACTION_META[item.action] || { verb: item.action.toLowerCase(), color: "#64748B", icon: "edit" };
  const isFolder = item.action.startsWith("FOLDER_");

  const subject = showSubject ? (
    isFolder && item.folder ? (
      <a className="dv-act-subject" onClick={() => onOpenFolder?.(item.folder!.id)}>
        <i className="dv-act-dot" style={{ background: folderHex(item.folder.color) }} />
        {item.folder.name}
      </a>
    ) : item.file ? (
      <a className="dv-act-subject" onClick={() => onOpenFile?.(item.file!.id)}>
        {item.file.name}
      </a>
    ) : null
  ) : null;

  let verb = meta.verb;
  if (!showSubject) {
    verb = {
      FILE_UPLOADED: "uploaded this file",
      VERSION_UPLOADED: "uploaded a new version",
      VERSION_RESTORED: "restored an older version",
      FILE_RENAMED: "renamed the file",
      FILE_MOVED: "moved the file",
      FILE_UPDATED: `changed the ${FIELD_LABEL[item.field || ""] || item.field}`,
    }[item.action] || verb;
  } else if (item.action === "FILE_UPDATED" || item.action === "FOLDER_UPDATED") {
    verb = `changed the ${FIELD_LABEL[item.field || ""] || item.field} of${isFolder ? " folder" : ""}`;
  }

  let detail: React.ReactNode = null;
  switch (item.action) {
    case "FILE_UPLOADED":
      detail = <span className="dv-vbadge">v1</span>;
      break;
    case "VERSION_UPLOADED":
      detail = (
        <>
          <span className="dv-vbadge">v{item.version_no}</span>
          {item.new_value && <span className="dv-act-note">“{clip(item.new_value, 120)}”</span>}
        </>
      );
      break;
    case "VERSION_RESTORED":
      detail = (
        <>
          <span className="dv-vbadge muted">v{item.old_value}</span>
          <span className="dv-diff-arrow">→</span>
          <span className="dv-vbadge">v{item.version_no}</span>
        </>
      );
      break;
    case "FILE_RENAMED":
    case "FOLDER_RENAMED":
    case "FILE_MOVED":
    case "FOLDER_MOVED":
    case "FILE_UPDATED":
    case "FOLDER_UPDATED":
      detail = <Diff from={item.old_value} to={item.new_value} color={item.field === "color"} />;
      break;
  }

  return (
    <div className="dv-act" style={{ ["--ac" as any]: meta.color }}>
      <div className="dv-act-icon">{ICONS[meta.icon] || <EditOutlined />}</div>
      <div className="dv-act-body">
        <div className="dv-act-line">
          <Avatar user={item.user} size={20} />
          <b className="dv-act-user">{item.user?.name || "Someone"}</b>
          <span className="dv-act-verb">{verb}</span>
          {subject}
          {showSubject && item.path && item.path.length > 0 && (
            <span className="dv-act-path">in {item.path.map((p) => p.name).join(" / ")}</span>
          )}
        </div>
        {detail && <div className="dv-act-detail">{detail}</div>}
      </div>
      <Tooltip title={fmtDateTime(item.created_at)}>
        <span className="dv-act-time">{fmtAgo(item.created_at)}</span>
      </Tooltip>
    </div>
  );
};

export default ActivityRow;
