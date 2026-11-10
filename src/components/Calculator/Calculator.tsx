import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip, message } from "antd";
import {
  CalculatorOutlined,
  CloseOutlined,
  CopyOutlined,
  ExportOutlined,
  HolderOutlined,
  MinusOutlined,
  BorderOutlined,
} from "@ant-design/icons";
import "./calculator.scss";

// ─── Engine ──────────────────────────────────────────────────────────────────
// Immediate-execution calculator (like a phone calculator). No eval().
type Op = "+" | "-" | "×" | "÷";

interface CalcState {
  display: string; // what the user is typing / the current result
  acc: number | null; // left operand
  op: Op | null; // pending operator
  fresh: boolean; // next digit starts a new number
  expr: string; // small history line, e.g. "1,250 ×"
  error: boolean;
}

const INITIAL: CalcState = { display: "0", acc: null, op: null, fresh: true, expr: "", error: false };
const MAX_DIGITS = 15;

// Round away binary noise (0.1 + 0.2 → 0.3).
const clean = (n: number) => Number.parseFloat(n.toPrecision(12));

const apply = (a: number, op: Op, b: number): number | null => {
  switch (op) {
    case "+": return clean(a + b);
    case "-": return clean(a - b);
    case "×": return clean(a * b);
    case "÷": return b === 0 ? null : clean(a / b);
  }
};

const toDisplay = (n: number) => {
  if (!Number.isFinite(n)) return "Error";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return n.toExponential(6);
  return String(n);
};

// Indian digit grouping for readability, keeping what the user typed (e.g. "12.50").
const pretty = (raw: string) => {
  if (raw === "Error" || raw.includes("e")) return raw;
  const neg = raw.startsWith("-");
  const [int, dec] = raw.replace("-", "").split(".");
  const grouped = Number(int || 0).toLocaleString("en-IN");
  return `${neg ? "-" : ""}${grouped}${dec !== undefined ? `.${dec}` : ""}`;
};

const reducer = (s: CalcState, key: string): CalcState => {
  if (s.error && key !== "AC") return reducer(INITIAL, key);
  const cur = Number(s.display);

  if (/^\d$/.test(key)) {
    if (s.fresh) return { ...s, display: key, fresh: false };
    if (s.display.replace(/[-.]/g, "").length >= MAX_DIGITS) return s;
    return { ...s, display: s.display === "0" ? key : s.display + key };
  }
  switch (key) {
    case ".":
      if (s.fresh) return { ...s, display: "0.", fresh: false };
      return s.display.includes(".") ? s : { ...s, display: s.display + "." };
    case "AC":
      return INITIAL;
    case "C": // clear entry
      return { ...s, display: "0", fresh: true };
    case "⌫":
      if (s.fresh) return s;
      return {
        ...s,
        display: s.display.length > 1 && s.display !== "-0" ? s.display.slice(0, -1).replace(/^-$/, "0") : "0",
      };
    case "±":
      if (s.display === "0") return s;
      return { ...s, display: s.display.startsWith("-") ? s.display.slice(1) : `-${s.display}` };
    case "%": {
      // 200 + 10% → 200 + 20 (percent of the left operand), else value / 100.
      const v = s.acc !== null && (s.op === "+" || s.op === "-") ? clean((s.acc * cur) / 100) : clean(cur / 100);
      return { ...s, display: toDisplay(v), fresh: true };
    }
    case "+":
    case "-":
    case "×":
    case "÷": {
      const op = key as Op;
      if (s.op && s.acc !== null && !s.fresh) {
        const r = apply(s.acc, s.op, cur);
        if (r === null) return { ...INITIAL, display: "Error", error: true, expr: "Cannot divide by 0" };
        return { display: toDisplay(r), acc: r, op, fresh: true, expr: `${pretty(toDisplay(r))} ${op}`, error: false };
      }
      const base = s.fresh && s.acc !== null && s.op ? s.acc : cur; // allow changing operator
      return { ...s, acc: base, op, fresh: true, expr: `${pretty(toDisplay(base))} ${op}` };
    }
    case "=": {
      if (!s.op || s.acc === null) return { ...s, fresh: true };
      const r = apply(s.acc, s.op, cur);
      if (r === null) return { ...INITIAL, display: "Error", error: true, expr: "Cannot divide by 0" };
      return {
        display: toDisplay(r),
        acc: null,
        op: null,
        fresh: true,
        expr: `${pretty(toDisplay(s.acc))} ${s.op} ${pretty(toDisplay(cur))} =`,
        error: false,
      };
    }
    default:
      return s;
  }
};

// ─── Native calculator links (best effort — browsers can't launch apps freely)
type Platform = "windows" | "android" | "other";
const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "android";
  if (/Windows/i.test(ua)) return "windows";
  return "other";
};
const NATIVE_LINK: Record<Platform, { href: string; label: string } | null> = {
  // Windows registers the calculator: URI (the browser asks once for permission).
  windows: { href: "calculator:", label: "Open Windows Calculator" },
  // Chrome on Android resolves this intent to the phone's default calculator app.
  android: {
    href: "intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end",
    label: "Open phone calculator",
  },
  other: null,
};

const MOBILE_QUERY = "(max-width: 768px)";
const useIsMobile = () => {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setMobile(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mobile;
};

const KEYS: { k: string; cls?: string; label?: React.ReactNode }[] = [
  { k: "AC", cls: "fn" }, { k: "±", cls: "fn" }, { k: "%", cls: "fn" }, { k: "÷", cls: "op" },
  { k: "7" }, { k: "8" }, { k: "9" }, { k: "×", cls: "op" },
  { k: "4" }, { k: "5" }, { k: "6" }, { k: "-", cls: "op", label: "−" },
  { k: "1" }, { k: "2" }, { k: "3" }, { k: "+", cls: "op" },
  { k: "0", cls: "zero" }, { k: "." }, { k: "⌫", cls: "fn" }, { k: "=", cls: "eq" },
];

const KEY_MAP: Record<string, string> = {
  "*": "×", x: "×", X: "×", "/": "÷", Enter: "=", "=": "=", Backspace: "⌫",
  Escape: "AC", Delete: "C", ",": ".",
};

// ─── Pad ─────────────────────────────────────────────────────────────────────
// Keyboard input is handled only while focus is inside the calculator, so it
// never steals keystrokes from the page underneath.
const CalculatorPad: React.FC<{ mobile: boolean; padRef: React.RefObject<HTMLDivElement | null> }> = ({
  mobile,
  padRef,
}) => {
  const [state, setState] = useState<CalcState>(INITIAL);
  const press = useCallback((k: string) => setState((s) => reducer(s, k)), []);
  const native = NATIVE_LINK[detectPlatform()];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = /^[\d.+\-%]$/.test(e.key) ? e.key : KEY_MAP[e.key];
    if (!key) return;
    e.preventDefault();
    e.stopPropagation();
    press(key);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.display);
      message.success(`Copied ${pretty(state.display)}`);
    } catch {
      message.error("Could not copy");
    }
  };

  const shown = pretty(state.display);
  const clearLabel = !state.fresh && state.display !== "0" ? "C" : "AC";

  return (
    <div
      ref={padRef}
      className={`calc-pad${mobile ? " is-mobile" : ""}`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="calc-screen">
        <div className="calc-expr">{state.expr || " "}</div>
        <div className="calc-display-row">
          <Tooltip title="Copy result">
            <button className="calc-copy" onClick={copy} aria-label="Copy result" disabled={state.error}>
              <CopyOutlined />
            </button>
          </Tooltip>
          <div
            className={`calc-display${shown.length > 12 ? " sm" : ""}${shown.length > 17 ? " xs" : ""}`}
            aria-live="polite"
          >
            {shown}
          </div>
        </div>
      </div>
      <div className="calc-keys">
        {KEYS.map(({ k, cls, label }) => {
          const activeOp = cls === "op" && state.op === k && state.fresh;
          const isClear = k === "AC";
          return (
            <button
              key={k}
              type="button"
              className={`calc-key ${cls || "num"}${activeOp ? " active" : ""}`}
              onClick={() => press(isClear ? clearLabel : k)}
              aria-label={k === "⌫" ? "Backspace" : isClear ? clearLabel : k}
            >
              {isClear ? clearLabel : label ?? k}
            </button>
          );
        })}
      </div>
      {native && (
        <a className="calc-native" href={native.href}>
          <ExportOutlined /> {native.label}
        </a>
      )}
      {!mobile && <div className="calc-hint">Click here, then type · Esc clears</div>}
    </div>
  );
};

// ─── Floating window ─────────────────────────────────────────────────────────
type Pos = { x: number; y: number };
const POS_KEY = "samebook.calculator.pos";
const EDGE = 8; // keep the window this far inside the viewport

const readPos = (): Pos | null => {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || "null");
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
  } catch {
    return null;
  }
};
const savePos = (p: Pos) => {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {
    // private mode etc. — position just isn't remembered
  }
};

const FloatingCalculator: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const mobile = useIsMobile();
  const winRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number; id: number } | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);

  const clamp = useCallback((p: Pos): Pos => {
    const el = winRef.current;
    const w = el?.offsetWidth ?? 300;
    const h = el?.offsetHeight ?? 420;
    return {
      x: Math.min(Math.max(EDGE, p.x), Math.max(EDGE, window.innerWidth - w - EDGE)),
      y: Math.min(Math.max(EDGE, p.y), Math.max(EDGE, window.innerHeight - h - EDGE)),
    };
  }, []);

  // Initial position: last saved spot, else top-right under the header
  // (desktop) or bottom-centre (mobile).
  useLayoutEffect(() => {
    const el = winRef.current;
    const w = el?.offsetWidth ?? 300;
    const h = el?.offsetHeight ?? 420;
    const fallback = mobile
      ? { x: (window.innerWidth - w) / 2, y: window.innerHeight - h - 16 }
      : { x: window.innerWidth - w - 24, y: 72 };
    setPos(clamp(readPos() ?? fallback));
    padRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep it on screen when the window is resized / rotated or the size changes.
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);
  useEffect(() => {
    setPos((p) => (p ? clamp(p) : p));
  }, [minimized, mobile, clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return; // header buttons stay clickable
    if (!pos) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setPos(clamp({ x: e.clientX - d.dx, y: e.clientY - d.dy }));
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    setPos((p) => {
      if (p) savePos(p);
      return p;
    });
    if (!minimized) padRef.current?.focus({ preventScroll: true });
  };

  return createPortal(
    <div
      ref={winRef}
      className={`calc-window${mobile ? " is-mobile" : ""}${dragging ? " is-dragging" : ""}${minimized ? " is-min" : ""}`}
      style={pos ? { left: pos.x, top: pos.y } : { visibility: "hidden", left: 0, top: 0 }}
      role="dialog"
      aria-label="Calculator"
    >
      <div
        className="calc-titlebar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => setMinimized((m) => !m)}
      >
        <HolderOutlined className="calc-grip" />
        <CalculatorOutlined />
        <span className="calc-title">Calculator</span>
        <Tooltip title={minimized ? "Expand" : "Minimise"}>
          <button
            className="calc-win-btn"
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? "Expand calculator" : "Minimise calculator"}
          >
            {minimized ? <BorderOutlined /> : <MinusOutlined />}
          </button>
        </Tooltip>
        <Tooltip title="Close">
          <button className="calc-win-btn close" onClick={onClose} aria-label="Close calculator">
            <CloseOutlined />
          </button>
        </Tooltip>
      </div>
      {/* Kept mounted while minimised so the current calculation survives. */}
      <div className="calc-body" hidden={minimized}>
        <CalculatorPad mobile={mobile} padRef={padRef} />
      </div>
    </div>,
    document.body,
  );
};

// ─── Header button ───────────────────────────────────────────────────────────
const CalculatorButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title={open ? "Close calculator" : "Calculator"}>
        <button
          className={`header-icon-btn${open ? " is-active" : ""}`}
          aria-label="Calculator"
          aria-pressed={open}
          onClick={() => setOpen((o) => !o)}
        >
          <CalculatorOutlined />
        </button>
      </Tooltip>
      {open && <FloatingCalculator onClose={() => setOpen(false)} />}
    </>
  );
};

export default CalculatorButton;
