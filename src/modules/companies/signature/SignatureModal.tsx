import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { message, Modal, Spin, Switch } from "antd";
import {
  CheckOutlined,
  ClearOutlined,
  CloudUploadOutlined,
  ExclamationCircleFilled,
  HighlightOutlined,
  SignatureOutlined,
  SwapOutlined,
  UndoOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import SignaturePreview from "./SignaturePreview";
import { saveCompanySignature } from "./signatureStore";
import {
  ACCEPT,
  MAX_FILE_MB,
  type Prepared,
  type Source,
  type Stroke,
  drawStrokes,
  loadSource,
  prepareDrawing,
  prepareUpload,
} from "./signatureImage";

type Mode = "upload" | "draw";

const INKS = [
  { key: "blue", label: "Blue", color: "#1e3a8a" },
  { key: "black", label: "Black", color: "#111827" },
];
/** Pen width on the pad, in screen pixels. */
const PEN = 3.2;

const nextFrame = () => new Promise<void>((r) => setTimeout(r, 30));

// ── Upload ──────────────────────────────────────────────────────────────────

const UploadStep: React.FC<{ onResult: (r: Prepared | null) => void; onError: (e: string) => void; open: boolean }> = ({ onResult, onError, open }) => {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; url: string } | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [clean, setClean] = useState(true);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const run = useCallback(
    async (src: Source, cleanIt: boolean) => {
      setBusy(true);
      await nextFrame();
      try {
        onResult(prepareUpload(src, cleanIt));
        onError("");
      } catch (e: any) {
        onResult(null);
        onError(e?.message || "That image couldn't be used");
      } finally {
        setBusy(false);
      }
    },
    [onResult, onError],
  );

  const take = useCallback(
    async (f: File | null | undefined) => {
      if (!f) return;
      onError("");
      setBusy(true);
      await nextFrame();
      try {
        const src = await loadSource(f);
        setFile({ name: f.name || "Pasted image", url: URL.createObjectURL(f) });
        setSource(src);
        setClean(!src.transparent);
        await run(src, !src.transparent);
      } catch (e: any) {
        setBusy(false);
        onResult(null);
        onError(e?.message || "That image couldn't be opened");
      }
    },
    [onError, onResult, run],
  );

  // A copied image can be pasted straight in (Ctrl / ⌘ + V).
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.kind === "file" && i.type.startsWith("image/"));
      if (item) {
        e.preventDefault();
        take(item.getAsFile());
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, take]);

  // The thumbnail's object URL is released when it is replaced or the dialog closes.
  useEffect(
    () => () => {
      if (file) URL.revokeObjectURL(file.url);
    },
    [file],
  );

  const picker = (
    <input
      ref={input}
      type="file"
      accept={ACCEPT}
      hidden
      onChange={(e) => {
        take(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (busy && !source) {
    return (
      <div className="sg-busy">
        <Spin size="small" /> Opening your image…
      </div>
    );
  }

  if (!source || !file) {
    return (
      <>
        {picker}
        <button
          type="button"
          className={`sg-drop${over ? " over" : ""}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            take(e.dataTransfer.files?.[0]);
          }}
        >
          <CloudUploadOutlined />
          <b>Drop a photo or scan here, or click to choose</b>
          <span>PNG, JPG or WEBP · up to {MAX_FILE_MB} MB · a phone photo works fine</span>
          <span>You can also paste a copied image (Ctrl + V)</span>
        </button>
      </>
    );
  }

  return (
    <>
      {picker}
      <div className="sg-file">
        <span className="sg-thumb">
          <img src={file.url} alt="" />
        </span>
        <span className="sg-file-text">
          <b title={file.name}>{file.name}</b>
          <span>
            {source.transparent ? "Already has a see-through background" : "Trimmed to the ink and resized for printing"}
          </span>
        </span>
        <button type="button" className="sg-tool" onClick={() => input.current?.click()} disabled={busy}>
          <SwapOutlined /> Choose another
        </button>
      </div>
      {!source.transparent && (
        <label className="sg-clean">
          <Switch
            size="small"
            checked={clean}
            disabled={busy}
            onChange={(v) => {
              setClean(v);
              run(source, v);
            }}
            aria-label="Remove the paper background"
          />
          <span>
            <b>Remove the paper background</b>
            Makes it look like real ink on the page. Turn off if part of your stamp goes missing.
          </span>
        </label>
      )}
    </>
  );
};

// ── Draw ────────────────────────────────────────────────────────────────────

const DrawStep: React.FC<{ onResult: (r: Prepared | null) => void; onError: (e: string) => void }> = ({ onResult, onError }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const size = useRef({ w: 0, h: 0 });
  const [ink, setInk] = useState(INKS[0].color);
  const [count, setCount] = useState(0);

  const paint = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.current.w, size.current.h);
    drawStrokes(ctx, strokes.current, 1);
  }, []);

  // The canvas follows the pad's size (and the screen's pixel density).
  useLayoutEffect(() => {
    const el = wrap.current;
    const c = canvas.current;
    if (!el || !c) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      size.current = { w: el.clientWidth, h: el.clientHeight };
      c.width = Math.round(el.clientWidth * dpr);
      c.height = Math.round(el.clientHeight * dpr);
      paint();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paint]);

  const finishDrawing = useCallback(() => {
    setCount(strokes.current.length);
    if (!strokes.current.length) {
      onResult(null);
      onError("");
      return;
    }
    try {
      onResult(prepareDrawing(strokes.current, size.current.w, size.current.h));
      onError("");
    } catch (e: any) {
      onResult(null);
      onError(e?.message || "");
    }
  }, [onResult, onError]);

  const point = (e: { clientX: number; clientY: number; timeStamp: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    canvas.current?.setPointerCapture(e.pointerId);
    current.current = { color: ink, width: PEN, points: [point(e)] };
    strokes.current.push(current.current);
    paint();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = current.current;
    if (!s) return;
    const native = e.nativeEvent as PointerEvent;
    const events = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    (events.length ? events : [native]).forEach((ev) => s.points.push(point(ev)));
    paint();
  };
  const up = () => {
    if (!current.current) return;
    current.current = null;
    finishDrawing();
  };

  const undo = () => {
    strokes.current.pop();
    paint();
    finishDrawing();
  };
  const clear = () => {
    strokes.current = [];
    paint();
    finishDrawing();
  };

  return (
    <>
      <div className="sg-pad-bar">
        <span className="sg-inks" role="radiogroup" aria-label="Ink colour">
          {INKS.map((k) => (
            <button
              key={k.key}
              type="button"
              role="radio"
              aria-checked={ink === k.color}
              className={`sg-inkchip${ink === k.color ? " on" : ""}`}
              onClick={() => setInk(k.color)}
            >
              <i style={{ background: k.color }} /> {k.label}
            </button>
          ))}
        </span>
        <button type="button" className="sg-tool" onClick={undo} disabled={!count}>
          <UndoOutlined /> Undo
        </button>
        <button type="button" className="sg-tool" onClick={clear} disabled={!count}>
          <ClearOutlined /> Clear
        </button>
      </div>
      <div className="sg-pad" ref={wrap}>
        <span className="sg-pad-guide" aria-hidden />
        {!count && <span className="sg-pad-hint">Sign here with your mouse, finger or stylus</span>}
        <canvas
          ref={canvas}
          aria-label="Signature pad: draw your signature"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onLostPointerCapture={up}
        />
      </div>
    </>
  );
};

// ── Dialog ──────────────────────────────────────────────────────────────────

/** Add or change the company's signature / stamp: upload a photo or scan, or draw it. */
const SignatureModal: React.FC<{ open: boolean; company: string; replacing: boolean; onClose: () => void }> = ({ open, company, replacing, onClose }) => {
  const [mode, setMode] = useState<Mode>("upload");
  const [results, setResults] = useState<Record<Mode, Prepared | null>>({ upload: null, draw: null });
  const [errors, setErrors] = useState<Record<Mode, string>>({ upload: "", draw: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open) {
      setMode("upload");
      setResults({ upload: null, draw: null });
      setErrors({ upload: "", draw: "" });
      setSaveError("");
    }
  }, [open]);

  const setUpload = useCallback((r: Prepared | null) => setResults((p) => ({ ...p, upload: r })), []);
  const setDraw = useCallback((r: Prepared | null) => setResults((p) => ({ ...p, draw: r })), []);
  const errUpload = useCallback((e: string) => setErrors((p) => ({ ...p, upload: e })), []);
  const errDraw = useCallback((e: string) => setErrors((p) => ({ ...p, draw: e })), []);

  const result = results[mode];
  const error = saveError || errors[mode];

  const save = async () => {
    if (!result || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      message.success(await saveCompanySignature(result.dataUrl));
      onClose();
    } catch (e: any) {
      setSaveError(e?.message || "Couldn't save the signature");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => !saving && onClose()}
      title={null}
      footer={null}
      width={620}
      centered
      destroyOnHidden
      rootClassName="sg-portal"
    >
      <div className="sg-dlg">
        <div className="sg-head">
          <span className="sg-head-icon">
            <SignatureOutlined />
          </span>
          <div>
            <h3>{replacing ? "Change your signature & stamp" : "Add your signature & stamp"}</h3>
            <p>Printed above “Authorised Signatory” on every quotation, delivery challan and invoice.</p>
          </div>
        </div>

        <div className="sg-tabs" role="tablist" aria-label="How to add it">
          <button type="button" role="tab" aria-selected={mode === "upload"} className={`sg-tab${mode === "upload" ? " on" : ""}`} onClick={() => setMode("upload")}>
            <UploadOutlined /> <span className="long">Upload a photo or scan</span>
            <span className="short">Upload</span>
          </button>
          <button type="button" role="tab" aria-selected={mode === "draw"} className={`sg-tab${mode === "draw" ? " on" : ""}`} onClick={() => setMode("draw")}>
            <HighlightOutlined /> Draw it
          </button>
        </div>

        {/* Both stay mounted so switching tabs keeps what was done in each. */}
        <div hidden={mode !== "upload"} style={{ display: mode === "upload" ? "contents" : "none" }}>
          <UploadStep onResult={setUpload} onError={errUpload} open={open && mode === "upload"} />
        </div>
        <div hidden={mode !== "draw"} style={{ display: mode === "draw" ? "contents" : "none" }}>
          <DrawStep onResult={setDraw} onError={errDraw} />
        </div>

        <div className="sg-label">How it prints</div>
        <SignaturePreview
          company={company}
          src={result?.dataUrl || null}
          empty={mode === "upload" ? "Your signature appears here" : "Sign in the box above"}
        />

        {error && (
          <div className="sg-error" role="alert">
            <ExclamationCircleFilled /> {error}
          </div>
        )}

        <div className="sg-foot">
          <span className="sg-tip">
            {mode === "upload"
              ? "Tip: sign in blue or black ink on plain white paper; put your stamp beside or over it, then take a photo from straight above."
              : "Tip: sign slowly and large — it is scaled down to fit the box."}
          </span>
          <button type="button" className="sg-btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="sg-btn primary" onClick={save} disabled={!result || saving}>
            {saving ? <Spin size="small" /> : <CheckOutlined />} Save signature
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SignatureModal;
