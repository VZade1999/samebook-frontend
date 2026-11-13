import React, { useRef, useState } from "react";
import { Tooltip } from "antd";
import {
  BankOutlined,
  CarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CopyOutlined,
  EnvironmentOutlined,
  ExportOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  LockOutlined,
  PhoneOutlined,
  PlusOutlined,
  ShopOutlined,
  StarFilled,
  TeamOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import {
  type CheckItem,
  addressLines,
  bankText,
  copyText,
  distinctLegalName,
  docNumberParts,
  groupAccount,
  initials,
  LOCATION_ADDRESS_KEYS,
  mapsUrl,
  maskAccount,
  panFromGstin,
  truthy,
  websiteText,
} from "../utils/companyView";

// ── Card frame ──────────────────────────────────────────────────────────────

export const Panel: React.FC<{
  icon: React.ReactNode;
  tint?: string;
  title: string;
  sub?: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  className?: string;
  index?: number;
  children: React.ReactNode;
}> = ({ icon, tint = "var(--cp-accent)", title, sub, count, action, className = "", index = 0, children }) => (
  <section className={`cp-panel ${className}`} style={{ ["--tint" as any]: tint, ["--i" as any]: index }}>
    <header className="cp-panel-head">
      <span className="cp-panel-icon">{icon}</span>
      <div className="cp-panel-titles">
        <h3>
          {title}
          {count !== undefined && <em>{count}</em>}
        </h3>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </header>
    <div className="cp-panel-body">{children}</div>
  </section>
);

export const CopyBtn: React.FC<{ text: string; label?: string; what?: string; small?: boolean }> = ({ text, label, what, small }) => (
  <Tooltip title={label || "Copy"}>
    <button
      type="button"
      className={`cp-copy${small ? " sm" : ""}`}
      aria-label={label || "Copy"}
      onClick={(e) => {
        e.stopPropagation();
        copyText(text, what || "Copied to clipboard");
      }}
    >
      <CopyOutlined />
    </button>
  </Tooltip>
);

// ── Identity field tile ─────────────────────────────────────────────────────

export const FieldTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  href?: string | null;
  external?: boolean;
  badge?: React.ReactNode;
  mono?: boolean;
  missing?: string;
  onAdd?: () => void;
  copy?: boolean;
}> = ({ icon, label, value, href, external, badge, mono, missing = "Not added", onAdd, copy = true }) => (
  <div className={`cp-field${value ? "" : " empty"}`}>
    <span className="cp-field-icon">{icon}</span>
    <div className="cp-field-text">
      <span className="cp-field-label">
        {label}
        {badge}
      </span>
      {value ? (
        href ? (
          <a className={`cp-field-value${mono ? " mono" : ""}`} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
            {value}
            {external && <ExportOutlined className="cp-ext" />}
          </a>
        ) : (
          <span className={`cp-field-value${mono ? " mono" : ""}`}>{value}</span>
        )
      ) : onAdd ? (
        <button type="button" className="cp-field-add" onClick={onAdd}>
          <PlusOutlined /> Add {label.toLowerCase()}
        </button>
      ) : (
        <span className="cp-field-missing">{missing}</span>
      )}
    </div>
    {value && copy && <CopyBtn text={value} label={`Copy ${label.toLowerCase()}`} what={`${label} copied`} small />}
  </div>
);

/** QT-KD-261113-001-0001, each part coloured and explained. */
export const DocNumber: React.FC<{ prefix?: string | null }> = ({ prefix }) => {
  const parts = docNumberParts(prefix);
  return (
    <div className="cp-docno">
      <div className="cp-docno-code" aria-label={`Example document number ${parts.map((p) => p.part).join("-")}`}>
        {parts.map((p, i) => (
          <React.Fragment key={p.label}>
            {i > 0 && <span className="cp-docno-dash">-</span>}
            <Tooltip title={p.label}>
              <span className={`cp-docno-part p${i}`}>{p.part}</span>
            </Tooltip>
          </React.Fragment>
        ))}
      </div>
      <div className="cp-docno-legend">
        {parts.map((p, i) => (
          <span key={p.label}>
            <i className={`p${i}`} /> {p.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Profile checklist ───────────────────────────────────────────────────────

export const Checklist: React.FC<{ items: CheckItem[]; onFix?: () => void }> = ({ items, onFix }) => {
  const done = items.filter((i) => i.done).length;
  return (
    <div className="cp-check">
      <div className="cp-check-bar" role="img" aria-label={`${done} of ${items.length} profile items complete`}>
        {items.map((i, n) => (
          <span key={i.key} className={i.done ? "on" : ""} style={{ ["--n" as any]: n }} />
        ))}
      </div>
      <ul>
        {items.map((i) => (
          <li key={i.key} className={i.done ? "done" : "todo"}>
            <span className="cp-check-mark">{i.done ? <CheckCircleFilled /> : <span className="cp-check-ring" />}</span>
            <span className="cp-check-text">
              <b>{i.label}</b>
              {!i.done && <small>{i.hint}</small>}
            </span>
            {!i.done && onFix && (
              <button type="button" className="cp-pill-btn" onClick={onFix}>
                Add
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── Bank card ───────────────────────────────────────────────────────────────

const BANK_THEMES = ["t0", "t1", "t2", "t3"];

export const BankCard: React.FC<{ bank: any; index: number }> = ({ bank, index }) => {
  const [show, setShow] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isDefault = truthy(bank.is_default);

  // Gentle 3D tilt toward the pointer.
  const onMove = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(0)}%`);
    el.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(0)}%`);
  };
  const onLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="cp-bank" style={{ ["--i" as any]: index }}>
      <div className="cp-bank-stage" onPointerMove={onMove} onPointerLeave={onLeave}>
        <div className={`cp-bankcard ${BANK_THEMES[index % BANK_THEMES.length]}`} ref={cardRef}>
          <span className="cp-bankcard-glare" />
          <div className="cp-bankcard-top">
            <span className="cp-bankcard-bank">
              <BankOutlined /> {bank.bank_name || "Bank account"}
            </span>
            {isDefault ? (
              <span className="cp-bankcard-default">
                <StarFilled /> Default
              </span>
            ) : (
              <WifiOutlined className="cp-bankcard-wave" />
            )}
          </div>
          <div className="cp-bankcard-chip" aria-hidden />
          <div className="cp-bankcard-number">
            <span>{show ? groupAccount(bank.account_number) : maskAccount(bank.account_number) || "—"}</span>
            {bank.account_number && (
              <span className="cp-bankcard-actions">
                <Tooltip title={show ? "Hide number" : "Show full number"}>
                  <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide account number" : "Show account number"}>
                    {show ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
                </Tooltip>
                <Tooltip title="Copy account number">
                  <button
                    type="button"
                    onClick={() => copyText(String(bank.account_number).replace(/\s+/g, ""), "Account number copied")}
                    aria-label="Copy account number"
                  >
                    <CopyOutlined />
                  </button>
                </Tooltip>
              </span>
            )}
          </div>
          <div className="cp-bankcard-foot">
            <div>
              <small>Account holder</small>
              <b>{bank.account_holder_name || "—"}</b>
            </div>
            <div>
              <small>IFSC</small>
              <b className="mono">{bank.ifsc_code || "—"}</b>
            </div>
          </div>
        </div>
      </div>
      <div className="cp-bank-meta">
        {bank.account_type && <span className="cp-tag">{String(bank.account_type).toLowerCase()}</span>}
        {(bank.branch_name || bank.branch_address) && (
          <span className="cp-bank-branch">
            <EnvironmentOutlined /> {[bank.branch_name, bank.branch_address].filter(Boolean).join(" · ")}
          </span>
        )}
        {bank.notes && <span className="cp-note">{bank.notes}</span>}
        <button type="button" className="cp-ghost-btn" onClick={() => copyText(bankText(bank), "Bank details copied — paste them anywhere")}>
          <CopyOutlined /> Copy bank details
        </button>
      </div>
    </div>
  );
};

// ── Address card ────────────────────────────────────────────────────────────

const ADDRESS_ICON = (type?: string) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("ware") || t.includes("godown") || t.includes("store")) return <InboxOutlined />;
  if (t.includes("ship") || t.includes("deliver")) return <CarOutlined />;
  if (t.includes("bill") || t.includes("invoice")) return <FileTextOutlined />;
  if (t.includes("home") || t.includes("resid")) return <HomeOutlined />;
  if (t.includes("shop") || t.includes("retail")) return <ShopOutlined />;
  return <BankOutlined />;
};

export const AddressCard: React.FC<{ a: any; index: number }> = ({ a, index }) => {
  const lines = addressLines(a);
  return (
    <article className="cp-addr" style={{ ["--i" as any]: index }}>
      <div className="cp-addr-map" aria-hidden>
        <span className="cp-addr-pin">
          <EnvironmentOutlined />
        </span>
      </div>
      <div className="cp-addr-body">
        <div className="cp-addr-head">
          <span className="cp-addr-icon">{ADDRESS_ICON(a.type)}</span>
          <div className="cp-addr-title">
            <b>{a.label || a.type || "Address"}</b>
            <span>
              {a.type && <span className="cp-tag">{a.type}</span>}
              {truthy(a.is_default) && (
                <span className="cp-tag gold">
                  <StarFilled /> Default
                </span>
              )}
            </span>
          </div>
        </div>
        <address className="cp-addr-lines">
          {lines.length ? lines.map((l, i) => <span key={i}>{l}</span>) : <span className="cp-field-missing">No address lines</span>}
        </address>
        {(a.phone || a.fax) && (
          <div className="cp-addr-contact">
            {a.phone && (
              <a href={`tel:${a.phone}`}>
                <PhoneOutlined /> {a.phone}
              </a>
            )}
            {a.fax && <span>Fax {a.fax}</span>}
          </div>
        )}
        {a.notes && <p className="cp-note">{a.notes}</p>}
        {lines.length > 0 && (
          <div className="cp-addr-actions">
            <button type="button" className="cp-ghost-btn" onClick={() => copyText(lines.join("\n"), "Address copied")}>
              <CopyOutlined /> Copy
            </button>
            <a className="cp-ghost-btn" href={mapsUrl(lines)} target="_blank" rel="noopener noreferrer">
              <EnvironmentOutlined /> Open in Maps
            </a>
          </div>
        )}
      </div>
    </article>
  );
};

// ── Location card ───────────────────────────────────────────────────────────

export const LocationCard: React.FC<{ l: any; index: number }> = ({ l, index }) => {
  const lines = addressLines(l, LOCATION_ADDRESS_KEYS);
  return (
    <article className="cp-loc" style={{ ["--i" as any]: index }}>
      <div className="cp-loc-head">
        <span className="cp-loc-icon">
          <ShopOutlined />
        </span>
        <div>
          <b>{l.name || "Location"}</b>
          {l.location_type && <span className="cp-tag">{l.location_type}</span>}
        </div>
      </div>
      {lines.length > 0 && <address className="cp-addr-lines">{lines.map((x, i) => <span key={i}>{x}</span>)}</address>}
      <div className="cp-loc-facts">
        {l.manager_name && (
          <span className="cp-loc-person">
            <i>{initials(l.manager_name)}</i>
            {l.manager_name}
            {l.manager_phone && <a href={`tel:${l.manager_phone}`}>{l.manager_phone}</a>}
          </span>
        )}
        {l.operational_hours && (
          <span>
            <ClockCircleOutlined /> {l.operational_hours}
          </span>
        )}
        {l.capacity && (
          <span>
            <TeamOutlined /> {l.capacity}
          </span>
        )}
        {l.gst_no && <span className="mono">GSTIN {l.gst_no}</span>}
      </div>
      {l.notes && <p className="cp-note">{l.notes}</p>}
    </article>
  );
};

// ── Custom fields (metadata) ────────────────────────────────────────────────

export const MetaRow: React.FC<{ m: any }> = ({ m }) => {
  const sensitive = truthy(m.is_sensitive);
  const [show, setShow] = useState(!sensitive);
  return (
    <li className="cp-meta">
      <span className="cp-meta-key">
        {sensitive && <LockOutlined className="cp-meta-lock" />}
        {m.key}
      </span>
      <span className={`cp-meta-val${show ? "" : " masked"}`}>{show ? m.value || "—" : "••••••••"}</span>
      <span className="cp-meta-tools">
        {m.data_type && <span className="cp-tag">{m.data_type}</span>}
        {sensitive && (
          <Tooltip title={show ? "Hide" : "Show"}>
            <button type="button" className="cp-copy sm" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide value" : "Show value"}>
              {show ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </button>
          </Tooltip>
        )}
        {m.value && <CopyBtn text={String(m.value)} label={`Copy ${m.key}`} what={`${m.key} copied`} small />}
      </span>
    </li>
  );
};

// ── Terms & conditions ──────────────────────────────────────────────────────

export const Terms: React.FC<{ text: string }> = ({ text }) => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const numbered = lines.length > 1 && !lines.some((l) => /^(\d+[.)]|[-•*])\s/.test(l));
  return (
    <div className="cp-terms">
      {numbered ? (
        <ol>
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      ) : (
        lines.map((l, i) => <p key={i}>{l}</p>)
      )}
    </div>
  );
};

// ── Letterhead preview ──────────────────────────────────────────────────────

export const Letterhead: React.FC<{ c: any }> = ({ c }) => {
  const addr = (c.addresses || []).find((a: any) => truthy(a.is_default)) || c.addresses?.[0];
  const bank = (c.bank_accounts || []).find((b: any) => truthy(b.is_default)) || c.bank_accounts?.[0];
  const pan = panFromGstin(c.gst_no);
  const terms = String(c.default_terms_conditions || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2);
  const docNo = docNumberParts(c.company_prefix, "INV")
    .map((p) => p.part)
    .join("-");
  return (
    <div className="cp-paper-wrap">
      <div className="cp-paper" aria-label="Preview of how your company details appear on an invoice">
        <div className="cp-paper-head">
          <div className="cp-paper-logo">{c.logo ? <img src={c.logo} alt="" /> : <span>{initials(c.name)}</span>}</div>
          <div className="cp-paper-co">
            <b>{c.name || "Your company"}</b>
            {distinctLegalName(c) && <span>{distinctLegalName(c)}</span>}
            {addr && <span>{addressLines(addr).join(", ")}</span>}
            <span>
              {[c.primary_phone, c.primary_email, websiteText(c.website)].filter(Boolean).join("  ·  ")}
            </span>
            {(c.gst_no || pan) && (
              <span className="strong">
                {c.gst_no && <>GSTIN {c.gst_no}</>}
                {pan && <>  ·  PAN {pan}</>}
              </span>
            )}
          </div>
          <div className="cp-paper-doc">
            <span className="cp-paper-title">TAX INVOICE</span>
            <small>{docNo}</small>
          </div>
        </div>
        <div className="cp-paper-rule" />
        <div className="cp-paper-lines" aria-hidden>
          <span className="w70" />
          <span className="w45" />
          <div className="cp-paper-table">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i}>
                <span className="w60" />
                <span className="w15" />
                <span className="w20" />
              </div>
            ))}
          </div>
        </div>
        <div className="cp-paper-foot">
          <div className="cp-paper-bank">
            <small>Bank details</small>
            {bank ? (
              <>
                <span>{bank.bank_name}</span>
                <span>A/c {maskAccount(bank.account_number)}</span>
                <span>IFSC {bank.ifsc_code}</span>
              </>
            ) : (
              <span className="missing">Add a bank account</span>
            )}
          </div>
          <div className="cp-paper-terms">
            <small>Terms</small>
            {terms.length ? terms.map((t, i) => <span key={i}>{t}</span>) : <span className="missing">Add default terms</span>}
          </div>
          <div className="cp-paper-sign">
            <span>For {c.name || "your company"}</span>
            <i />
            <small>Authorised signatory</small>
          </div>
        </div>
      </div>
    </div>
  );
};
