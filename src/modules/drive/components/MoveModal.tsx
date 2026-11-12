import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { CaretDownOutlined, CaretRightOutlined, CloudOutlined } from "@ant-design/icons";
import { DriveFolder } from "../constants";
import { FolderGlyph } from "./DriveBits";

/**
 * Pick a destination folder. When moving a folder, it and its subfolders are
 * disabled (a folder can't go inside itself).
 */
const MoveModal: React.FC<{
  open: boolean;
  itemName: string;
  folders: DriveFolder[];
  currentFolderId: number | null;
  movingFolderId?: number | null;
  onClose: () => void;
  onMove: (target: number | null) => Promise<void>;
}> = ({ open, itemName, folders, currentFolderId, movingFolderId, onClose, onMove }) => {
  const [selected, setSelected] = useState<number | null | undefined>(undefined);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const children = useMemo(() => {
    const m = new Map<number | null, DriveFolder[]>();
    folders.forEach((f) => {
      const k = f.parent_id ?? null;
      (m.get(k) || m.set(k, []).get(k)!).push(f);
    });
    m.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
    return m;
  }, [folders]);

  const blocked = useMemo(() => {
    const out = new Set<number>();
    if (!movingFolderId) return out;
    const walk = (id: number) => {
      out.add(id);
      (children.get(id) || []).forEach((c) => walk(c.id));
    };
    walk(movingFolderId);
    return out;
  }, [movingFolderId, children]);

  useEffect(() => {
    if (!open) return;
    setSelected(undefined);
    // Expand the path to the current location.
    const byId = new Map(folders.map((f) => [f.id, f]));
    const exp = new Set<number>();
    let cur = currentFolderId ? byId.get(currentFolderId) : undefined;
    while (cur) {
      exp.add(cur.id);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    setExpanded(exp);
  }, [open, currentFolderId, folders]);

  const toggle = (id: number) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const renderLevel = (parent: number | null, depth: number): React.ReactNode =>
    (children.get(parent) || []).map((f) => {
      const kids = children.get(f.id) || [];
      const isBlocked = blocked.has(f.id);
      const isHere = f.id === currentFolderId;
      return (
        <React.Fragment key={f.id}>
          <div
            className={`dv-mv-row${selected === f.id ? " selected" : ""}${isBlocked ? " blocked" : ""}`}
            style={{ paddingLeft: 10 + depth * 20 }}
            onClick={() => !isBlocked && setSelected(f.id)}
            onDoubleClick={() => kids.length && toggle(f.id)}
          >
            <span
              className="dv-mv-caret"
              onClick={(e) => {
                e.stopPropagation();
                if (kids.length) toggle(f.id);
              }}
            >
              {kids.length ? expanded.has(f.id) ? <CaretDownOutlined /> : <CaretRightOutlined /> : null}
            </span>
            <FolderGlyph color={f.color} size={22} />
            <span className="dv-mv-name">{f.name}</span>
            {isHere && <span className="dv-mv-here">current</span>}
            {isBlocked && f.id === movingFolderId && <span className="dv-mv-here">moving</span>}
          </div>
          {kids.length > 0 && expanded.has(f.id) && renderLevel(f.id, depth + 1)}
        </React.Fragment>
      );
    });

  const target = selected === undefined ? undefined : selected;
  const same = target !== undefined && target === currentFolderId;

  return (
    <Modal
      open={open}
      title={
        <span>
          Move <b>{itemName}</b>
        </span>
      }
      onCancel={() => !busy && onClose()}
      okText="Move here"
      okButtonProps={{ disabled: target === undefined || same, loading: busy }}
      onOk={async () => {
        if (target === undefined) return;
        setBusy(true);
        try {
          await onMove(target);
          onClose();
        } catch {
          // onMove already showed the error; keep the picker open to retry.
        } finally {
          setBusy(false);
        }
      }}
      width={480}
      destroyOnHidden
      className="dv-modal"
    >
      <div className="dv-mv">
        <div
          className={`dv-mv-row root${selected === null ? " selected" : ""}`}
          onClick={() => setSelected(null)}
        >
          <span className="dv-mv-caret" />
          <CloudOutlined className="dv-mv-root-icon" />
          <span className="dv-mv-name">My Drive</span>
          {currentFolderId === null && <span className="dv-mv-here">current</span>}
        </div>
        {renderLevel(null, 1)}
        {!folders.length && <div className="dv-mv-empty">No folders yet — create one first.</div>}
      </div>
    </Modal>
  );
};

export default MoveModal;
