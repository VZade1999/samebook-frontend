import React, { useEffect, useRef } from "react";
import { message as toast } from "antd";
import { CloseOutlined, FileTextOutlined, LoadingOutlined, PaperClipOutlined, SendOutlined } from "@ant-design/icons";

export const DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
/** Stays under the server's 15 MB body limit after base64. */
export const DOCUMENT_MAX_BYTES = 12 * 1024 * 1024;

export interface PendingFile {
  name: string;
  type: string;
  size: number;
  base64: string;
}

/** Reads a picked, pasted or dropped file; refuses types and sizes the server won't take. */
export function readDocument(file: File): Promise<PendingFile | null> {
  if (!DOCUMENT_TYPES.includes(file.type)) {
    toast.error("Attach a photo (JPG, PNG, WEBP) or a PDF.");
    return Promise.resolve(null);
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    toast.error("That file is over 12 MB — try a smaller photo or PDF.");
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      resolve({ name: file.name || "pasted-image.png", type: file.type, size: file.size, base64: s.slice(s.indexOf(",") + 1) });
    };
    reader.onerror = () => {
      toast.error("Couldn't read that file. Try again.");
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
}

const sizeText = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const Composer: React.FC<{
  text: string;
  onText: (t: string) => void;
  file: PendingFile | null;
  onFile: (f: PendingFile | null) => void;
  busy: boolean;
  /** Why sending is off (no permission, limit reached…), or null. */
  blocked: string | null;
  focusKey: number;
  onSend: () => void;
}> = ({ text, onText, file, onFile, busy, blocked, focusKey, onSend }) => {
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);
  useEffect(() => {
    if (!focusKey) return;
    const el = area.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
  }, [focusKey]);

  if (blocked) {
    return (
      <div className="ai-composer blocked" role="note">
        {blocked}
      </div>
    );
  }

  const canSend = !busy && (!!text.trim() || !!file);
  return (
    <div className="ai-composer">
      {file && (
        <div className="ai-file">
          <FileTextOutlined />
          <span className="ai-file-name">{file.name}</span>
          <em>{sizeText(file.size)}</em>
          <button type="button" aria-label="Remove the attached file" onClick={() => onFile(null)} disabled={busy}>
            <CloseOutlined />
          </button>
        </div>
      )}
      <div className="ai-input-row">
        <input
          ref={picker}
          type="file"
          accept={DOCUMENT_TYPES.join(",")}
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onFile(await readDocument(f));
          }}
        />
        <button type="button" className="ai-icon-btn" aria-label="Attach a photo or PDF" title="Attach a photo or PDF (requirement list, PO…)" disabled={busy} onClick={() => picker.current?.click()}>
          <PaperClipOutlined />
        </button>
        <textarea
          ref={area}
          rows={1}
          value={text}
          maxLength={4000}
          disabled={busy}
          placeholder={file ? "Add a note, or just send" : "Ask or tell it what to do…"}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          onPaste={async (e) => {
            const f = Array.from(e.clipboardData?.files || []).find((x) => DOCUMENT_TYPES.includes(x.type));
            if (f) {
              e.preventDefault();
              onFile(await readDocument(f));
            }
          }}
          aria-label="Message to the assistant"
        />
        <button type="button" className="ai-send" aria-label="Send" disabled={!canSend} onClick={onSend}>
          {busy ? <LoadingOutlined /> : <SendOutlined />}
        </button>
      </div>
      <div className="ai-hint">Enter to send · Shift+Enter for a new line · drop or paste a photo / PDF to make a quotation from it</div>
    </div>
  );
};

export default Composer;
