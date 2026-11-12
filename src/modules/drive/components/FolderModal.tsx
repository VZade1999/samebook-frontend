import React, { useEffect, useRef, useState } from "react";
import { Input, Modal, message } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { driveService } from "../services/driveService";
import { DriveFolder, FOLDER_COLOR, emitDriveChanged, errText, folderHex } from "../constants";
import { FolderGlyph } from "./DriveBits";

export type FolderModalMode =
  | { kind: "create"; parentId: number | null; parentName: string }
  | { kind: "edit"; folder: DriveFolder };

/** Create or edit a folder, with a live preview of how it will look. */
const FolderModal: React.FC<{
  mode: FolderModalMode | null;
  onClose: () => void;
  onSaved: (f: DriveFolder) => void;
}> = ({ mode, onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("indigo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<any>(null);

  useEffect(() => {
    if (!mode) return;
    setError(null);
    if (mode.kind === "edit") {
      setName(mode.folder.name);
      setDescription(mode.folder.description || "");
      setColor(mode.folder.color || "indigo");
    } else {
      setName("");
      setDescription("");
      setColor("indigo");
    }
    setTimeout(() => nameRef.current?.focus?.(), 80);
  }, [mode]);

  const save = async () => {
    if (!mode) return;
    const n = name.trim();
    if (!n) {
      setError("Give the folder a name");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res =
        mode.kind === "create"
          ? await driveService.createFolder({ name: n, parent_id: mode.parentId, description: description.trim() || undefined, color })
          : await driveService.updateFolder(mode.folder.id, { name: n, description: description.trim() || null, color });
      message.success(mode.kind === "create" ? `Folder "${n}" created` : "Folder updated");
      emitDriveChanged();
      onSaved(res.data.data);
      onClose();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const hex = folderHex(color);
  const where = mode?.kind === "create" ? mode.parentName : null;

  return (
    <Modal
      open={!!mode}
      onCancel={() => !busy && onClose()}
      onOk={save}
      okText={mode?.kind === "create" ? "Create folder" : "Save changes"}
      okButtonProps={{ loading: busy }}
      width={520}
      destroyOnHidden
      className="dv-modal"
      title={null}
    >
      <div className="dv-fm" style={{ ["--fc" as any]: hex }}>
        <div className="dv-fm-hero">
          <div className="dv-fm-glyph">
            <FolderGlyph color={color} size={72} open />
          </div>
          <div className="dv-fm-hero-text">
            <div className="dv-fm-eyebrow">{mode?.kind === "create" ? "New folder" : "Edit folder"}</div>
            <div className="dv-fm-title">{name.trim() || "Untitled folder"}</div>
            {where && <div className="dv-fm-where">in {where}</div>}
          </div>
        </div>

        <label className="dv-label">Name</label>
        <Input
          ref={nameRef}
          value={name}
          maxLength={120}
          placeholder="e.g. Contracts 2026"
          onChange={(e) => setName(e.target.value)}
          onPressEnter={save}
          status={error ? "error" : undefined}
        />
        {error && <div className="dv-field-error">{error}</div>}

        <label className="dv-label">
          Description <span className="dv-optional">optional</span>
        </label>
        <Input.TextArea
          value={description}
          maxLength={500}
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder="What goes in this folder?"
          onChange={(e) => setDescription(e.target.value)}
        />

        <label className="dv-label">Colour</label>
        <div className="dv-swatches">
          {Object.entries(FOLDER_COLOR).map(([key, value]) => (
            <button
              key={key}
              type="button"
              className={`dv-swatch${color === key ? " active" : ""}`}
              style={{ background: value }}
              onClick={() => setColor(key)}
              aria-label={key}
            >
              {color === key && <CheckOutlined />}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default FolderModal;
