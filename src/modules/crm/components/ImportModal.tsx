import React, { useMemo, useState } from "react";
import { Modal, Select, Spin, Upload, message } from "antd";
import {
  CheckCircleFilled,
  CloudUploadOutlined,
  DownloadOutlined,
  ExclamationCircleFilled,
  FileExcelOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { crmService } from "../services/crmService";
import { CrmMeta, RATINGS, SOURCES, emitCrmChanged, errText } from "../constants";

const MAX_ROWS = 1000;

/** RFC 4180 CSV (quotes, embedded commas / new lines), comma, semicolon or tab separated. */
export const parseCsv = (text: string): string[][] => {
  const s = text.replace(/^﻿/, "");
  const first = s.split(/\r?\n/, 1)[0] || "";
  const delim = ([",", ";", "\t"] as const)
    .map((d) => [d, first.split(d).length] as const)
    .sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
};

const TARGETS: { key: string; label: string; aliases: string[] }[] = [
  { key: "name", label: "Contact name", aliases: ["name", "fullname", "contactname", "contactperson", "customername", "person", "leadname", "firstname", "lastname", "sendername"] },
  { key: "company_name", label: "Company", aliases: ["company", "companyname", "organisation", "organization", "business", "firm", "sendercompany"] },
  { key: "phone", label: "Mobile", aliases: ["phone", "mobile", "mobilenumber", "phonenumber", "contactnumber", "contactno", "mobileno", "whatsapp", "cell", "sendermobile"] },
  { key: "alt_phone", label: "Other phone", aliases: ["altphone", "alternatephone", "landline", "phone2", "mobile2", "otherphone"] },
  { key: "email", label: "Email", aliases: ["email", "emailaddress", "emailid", "mail", "senderemail"] },
  { key: "requirement", label: "Requirement", aliases: ["requirement", "product", "productname", "service", "interest", "subject", "lookingfor", "item", "category"] },
  { key: "message", label: "Details / notes", aliases: ["message", "details", "notes", "note", "comments", "remarks", "enquiry", "inquiry", "description", "querymessage"] },
  { key: "estimated_value", label: "Value (₹)", aliases: ["value", "amount", "budget", "dealvalue", "estimatedvalue"] },
  { key: "city", label: "City", aliases: ["city", "town", "district", "sendercity"] },
  { key: "state", label: "State", aliases: ["state", "region", "province", "senderstate"] },
  { key: "pincode", label: "PIN code", aliases: ["pincode", "pin", "zip", "zipcode", "postalcode", "senderpincode"] },
  { key: "address", label: "Address", aliases: ["address", "street", "fulladdress", "senderaddress"] },
  { key: "gst_number", label: "GSTIN", aliases: ["gst", "gstin", "gstno", "gstnumber"] },
  { key: "source", label: "Source", aliases: ["source", "leadsource", "channel"] },
];
const key = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");
const guess = (header: string) => TARGETS.find((t) => t.aliases.includes(key(header)))?.key || "";

const TEMPLATE =
  "Name,Company,Mobile,Email,Requirement,Details,Value,City,State,Source\n" +
  'Rahul Sharma,Sharma Traders,9876543210,rahul@example.com,MS pipes 2 inch,"500 kg, delivery in Pune",150000,Pune,Maharashtra,Referral\n';

interface Props {
  open: boolean;
  meta: CrmMeta | null;
  onClose: () => void;
}

interface Result {
  total: number;
  created: number;
  skipped: number;
  invalid: number;
  problems: { index: number; status: string; reason: string | null }[];
}

const ImportModal: React.FC<Props> = ({ open, meta, onClose }) => {
  const [step, setStep] = useState<"upload" | "map" | "done">("upload");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<string[]>([]);
  const [source, setSource] = useState("OTHER");
  const [owner, setOwner] = useState<number>(0);
  const [rating, setRating] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const header = rows[0] || [];
  const body = rows.slice(1);
  const usable = body.slice(0, MAX_ROWS);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setMapping([]);
    setResult(null);
    setFileName("");
    setSource("OTHER");
    setOwner(meta?.me || 0);
    setRating(undefined);
  };

  const readFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      message.error("That file is over 5 MB. Split it into smaller files.");
      return false;
    }
    if (/\.xlsx?$/i.test(file.name)) {
      message.warning("Save the Excel sheet as CSV first (File → Save As → CSV), then upload that file.");
      return false;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result || ""));
      if (parsed.length < 2) {
        message.error("No rows found. The first row should be the column names.");
        return;
      }
      setRows(parsed);
      setMapping(parsed[0].map(guess));
      setFileName(file.name);
      setOwner(meta?.me || 0);
      setStep("map");
    };
    reader.onerror = () => message.error("Couldn't read the file");
    reader.readAsText(file);
    return false;
  };

  const mapped = useMemo(() => new Set(mapping.filter(Boolean)), [mapping]);
  const hasContact = mapped.has("phone") || mapped.has("email") || mapped.has("alt_phone");

  const run = async () => {
    if (!hasContact) {
      message.warning("Match a column to Mobile or Email — every lead needs a way to reach them.");
      return;
    }
    const payloadRows = usable.map((r) => {
      const o: Record<string, string> = {};
      mapping.forEach((t, i) => {
        const v = (r[i] ?? "").trim();
        if (!t || !v) return;
        o[t] = o[t] ? `${o[t]}${t === "message" ? "\n" : " "}${v}` : v;
      });
      return o;
    });
    setBusy(true);
    try {
      const res = await crmService.importRows({
        rows: payloadRows,
        source,
        ...(rating ? { rating } : {}),
        ...(meta?.can.manage ? { owner_id: owner === 0 ? null : owner } : {}),
      });
      setResult(res.data.data as Result);
      setStep("done");
      emitCrmChanged();
    } catch (err) {
      message.error(errText(err, "Import failed"));
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "samebook-leads-template.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      width={780}
      className="crm-modal"
      destroyOnHidden
      title={
        <div className="crm-modal-title">
          <span className="crm-modal-icon"><FileExcelOutlined /></span>
          <div>
            <b>Import leads</b>
            <small>{fileName || "From a CSV file — Excel, Google Sheets or another CRM"}</small>
          </div>
        </div>
      }
      footer={
        step === "map" ? (
          <div className="crm-modal-foot">
            <button className="crm-btn ghost" onClick={reset} disabled={busy}>
              Choose another file
            </button>
            <button className="crm-btn primary" onClick={run} disabled={busy}>
              {busy ? <Spin size="small" /> : <CloudUploadOutlined />} Import {usable.length} lead{usable.length === 1 ? "" : "s"}
            </button>
          </div>
        ) : step === "done" ? (
          <div className="crm-modal-foot">
            <button className="crm-btn ghost" onClick={reset}>
              Import another file
            </button>
            <button className="crm-btn primary" onClick={close}>
              Done
            </button>
          </div>
        ) : null
      }
    >
      {step === "upload" && (
        <div className="crm-import-upload">
          <Upload.Dragger accept=".csv,.txt,.xls,.xlsx" multiple={false} showUploadList={false} beforeUpload={readFile}>
            <p className="crm-drop-icon">
              <CloudUploadOutlined />
            </p>
            <p className="crm-drop-title">Drop a CSV file here, or click to choose</p>
            <p className="crm-drop-sub">First row = column names. Up to {MAX_ROWS} leads per file.</p>
          </Upload.Dragger>
          <div className="crm-import-tips">
            <button className="crm-link" onClick={downloadTemplate}>
              <DownloadOutlined /> Download a sample file
            </button>
            <span>From Excel: File → Save As → “CSV UTF-8”. Rows with a phone or email that's already an open lead are skipped.</span>
          </div>
        </div>
      )}

      {step === "map" && (
        <div className="crm-import-map">
          {body.length > MAX_ROWS && (
            <div className="crm-banner warn">
              <WarningFilled /> This file has {body.length} rows. The first {MAX_ROWS} will be imported — split the rest into another file.
            </div>
          )}
          <p className="crm-lede">Check which column is which. We guessed from the column names.</p>
          <div className="crm-map-table" role="table">
            <div className="crm-map-row head" role="row">
              <span role="columnheader">Column in your file</span>
              <span role="columnheader">Example</span>
              <span role="columnheader">Import as</span>
            </div>
            {header.map((h, i) => (
              <div className="crm-map-row" role="row" key={i}>
                <span role="cell" className="crm-map-col">{h || `Column ${i + 1}`}</span>
                <span role="cell" className="crm-map-sample">
                  {usable
                    .slice(0, 3)
                    .map((r) => r[i])
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
                <span role="cell">
                  <Select
                    size="small"
                    value={mapping[i] || ""}
                    onChange={(v) => setMapping((m) => m.map((x, j) => (j === i ? v : x)))}
                    style={{ width: "100%" }}
                    options={[{ value: "", label: "Don't import" }, ...TARGETS.map((t) => ({ value: t.key, label: t.label }))]}
                  />
                </span>
              </div>
            ))}
          </div>
          {!hasContact && (
            <div className="crm-banner bad">
              <ExclamationCircleFilled /> Match a column to Mobile or Email.
            </div>
          )}
          <div className="crm-import-opts">
            <label>
              <span>Lead source{mapped.has("source") ? " (when the Source column is empty)" : ""}</span>
              <Select value={source} onChange={setSource} options={SOURCES.map((s) => ({ value: s.key, label: s.label }))} />
            </label>
            {meta?.can.manage && (
              <label>
                <span>Assign to</span>
                <Select
                  value={owner}
                  onChange={setOwner}
                  showSearch
                  optionFilterProp="label"
                  options={[{ value: 0, label: "Unassigned" }, ...(meta?.users || []).map((u) => ({ value: u.id, label: u.name }))]}
                />
              </label>
            )}
            <label>
              <span>Rating</span>
              <Select allowClear placeholder="Not rated" value={rating} onChange={setRating} options={RATINGS.map((r) => ({ value: r.key, label: r.label }))} />
            </label>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="crm-import-done">
          <div className="crm-import-stats">
            <div className="good">
              <CheckCircleFilled />
              <b>{result.created}</b>
              <span>added</span>
            </div>
            <div className="muted">
              <b>{result.skipped}</b>
              <span>already in CRM</span>
            </div>
            <div className={result.invalid ? "bad" : "muted"}>
              <b>{result.invalid}</b>
              <span>couldn't be read</span>
            </div>
          </div>
          {result.problems.length > 0 && (
            <ul className="crm-import-problems">
              {result.problems.slice(0, 50).map((p) => (
                <li key={p.index}>
                  <b>Row {p.index + 2}</b> {p.reason || p.status}
                </li>
              ))}
              {result.problems.length > 50 && <li>…and {result.problems.length - 50} more</li>}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ImportModal;
