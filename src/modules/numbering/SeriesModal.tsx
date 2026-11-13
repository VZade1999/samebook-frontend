import React, { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, Form, Input, InputNumber, Modal, Segmented, Select, Tooltip, message } from "antd";
import type { InputRef } from "antd";
import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled, LoadingOutlined } from "@ant-design/icons";
import { apiError, numberingService } from "./numberingService";
import {
  DOC_TYPES,
  PRESETS,
  RESET_OPTIONS,
  TOKEN_HELP,
  docLabel,
  renderNumber,
  type DocType,
  type ResetPeriod,
  type Series,
} from "./rules";
import "./numbering.scss";

interface Values {
  doc_type: DocType;
  name: string;
  format: string;
  padding: number;
  reset_period: ResetPeriod;
  next_number: number;
  is_default?: boolean;
}

interface Check {
  errors: string[];
  warnings: string[];
  preview: string | null;
}

const DEFAULT_NAME: Record<DocType, string> = {
  INVOICE: "Tax invoices",
  QUOTATION: "Quotations",
  DELIVERY_CHALLAN: "Delivery challans",
};

const SeriesModal: React.FC<{
  open: boolean;
  /** Editing an existing series, or null to create one. */
  series: Series | null;
  docType: DocType;
  prefix: string;
  /** Names already used per type, to suggest a free one. */
  hasActive: (t: DocType) => boolean;
  onClose: () => void;
  onSaved: (s: Series) => void;
}> = ({ open, series, docType, prefix, hasActive, onClose, onSaved }) => {
  const [form] = Form.useForm<Values>();
  const formatRef = useRef<InputRef>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const editing = !!series;

  const values = Form.useWatch([], form) as Values | undefined;
  const type: DocType = values?.doc_type || series?.doc_type || docType;

  useEffect(() => {
    if (!open) return;
    setCheck(null);
    if (series) {
      form.setFieldsValue({
        doc_type: series.doc_type,
        name: series.name,
        format: series.format,
        padding: series.padding,
        reset_period: series.reset_period,
        next_number: series.next_number,
      });
    } else {
      const p = PRESETS[docType][0];
      form.setFieldsValue({
        doc_type: docType,
        name: DEFAULT_NAME[docType],
        format: p.format,
        padding: p.padding,
        reset_period: p.reset_period,
        next_number: 1,
        is_default: true,
      });
    }
  }, [open, series, docType, form]);

  // Instant local preview; the server check (debounced) adds errors, GST
  // warnings and whether the number is already used.
  const local = useMemo(() => {
    if (!values?.format) return "";
    return renderNumber(values.format, { padding: values.padding, seq: values.next_number, prefix });
  }, [values?.format, values?.padding, values?.next_number, prefix]);

  const key = JSON.stringify([values?.doc_type, values?.name, values?.format, values?.padding, values?.reset_period, values?.next_number]);
  useEffect(() => {
    if (!open || !values?.format) return;
    setChecking(true);
    const id = window.setTimeout(async () => {
      try {
        const res = await numberingService.preview({
          doc_type: type,
          name: values.name || "x",
          format: values.format,
          padding: values.padding,
          reset_period: values.reset_period,
          next_number: values.next_number,
          ...(series ? { exclude_id: series.id } : {}),
        });
        setCheck(res?.data?.data || null);
      } catch (e: any) {
        const d = e?.response?.data;
        setCheck({ errors: [d?.message ? String(Array.isArray(d.message) ? d.message[0] : d.message) : "Couldn't check this format"], warnings: [], preview: null });
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, open]);

  const insertToken = (token: string) => {
    const el = formatRef.current?.input;
    const cur = form.getFieldValue("format") || "";
    const start = el?.selectionStart ?? cur.length;
    const end = el?.selectionEnd ?? cur.length;
    const next = cur.slice(0, start) + token + cur.slice(end);
    form.setFieldValue("format", next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const applyPreset = (key: string) => {
    const p = PRESETS[type].find((x) => x.key === key);
    if (p) form.setFieldsValue({ format: p.format, padding: p.padding, reset_period: p.reset_period });
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const payload: any = {
        name: v.name.trim(),
        format: v.format.trim(),
        padding: v.padding,
        reset_period: v.reset_period,
      };
      // Only send the counter when it was changed, so a save doesn't race
      // documents being numbered meanwhile.
      if (!series || v.next_number !== series.next_number) payload.next_number = v.next_number;
      const res = series
        ? await numberingService.update(series.id, payload)
        : await numberingService.create({ ...payload, doc_type: v.doc_type, next_number: v.next_number, is_default: !!v.is_default });
      const saved: Series = res?.data?.data?.series;
      message.success(series ? "Series saved" : `${docLabel(v.doc_type)} series created — new ${docLabel(v.doc_type).toLowerCase()}s use it from now on`);
      onSaved(saved);
    } catch (e: any) {
      message.error(apiError(e, "Couldn't save the series"));
    } finally {
      setSaving(false);
    }
  };

  const errors = check?.errors || [];
  const warnings = check?.warnings || [];
  const shown = check?.preview || (errors.length ? null : local);
  const firstActive = !editing && !hasActive(type);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText={editing ? "Save series" : "Create series"}
      okButtonProps={{ loading: saving, disabled: checking || errors.length > 0 }}
      title={editing ? `Edit “${series!.name}”` : "New numbering series"}
      width={640}
      destroyOnHidden
      className="nm-modal"
    >
      <Form form={form} layout="vertical" requiredMark={false} className="nm-form">
        {!editing && (
          <Form.Item name="doc_type" label="For">
            <Segmented
              block
              options={DOC_TYPES.map((d) => ({ value: d.key, label: d.plural }))}
              onChange={(t) => {
                const p = PRESETS[t as DocType][0];
                form.setFieldsValue({ name: DEFAULT_NAME[t as DocType], format: p.format, padding: p.padding, reset_period: p.reset_period });
              }}
            />
          </Form.Item>
        )}

        <div className={`nm-preview ${errors.length ? "bad" : ""}`} aria-live="polite">
          <span className="nm-preview-label">
            Next {docLabel(type).toLowerCase()} will be
            {checking && <LoadingOutlined />}
          </span>
          <b className="nm-mono">{shown || "—"}</b>
          {!errors.length && values?.format && (
            <span className="nm-preview-then nm-mono">
              then {renderNumber(values.format, { padding: values.padding, seq: (values.next_number || 1) + 1, prefix })}, {renderNumber(values.format, { padding: values.padding, seq: (values.next_number || 1) + 2, prefix })} …
            </span>
          )}
        </div>

        {(errors.length > 0 || warnings.length > 0) && (
          <ul className="nm-issues">
            {errors.map((e) => (
              <li key={e} className="err">
                <CloseCircleFilled /> {e}
              </li>
            ))}
            {warnings.map((w) => (
              <li key={w} className="warn">
                <ExclamationCircleFilled /> {w}
              </li>
            ))}
          </ul>
        )}

        <Form.Item label="Start from a common style" className="nm-presets-item">
          <div className="nm-presets">
            {PRESETS[type].map((p) => {
              const active = values?.format === p.format && values?.reset_period === p.reset_period;
              return (
                <button type="button" key={p.key} className={`nm-preset ${active ? "on" : ""}`} onClick={() => applyPreset(p.key)}>
                  <b className="nm-mono">{renderNumber(p.format, { padding: p.padding, seq: 1, prefix })}</b>
                  <span>{p.hint}</span>
                </button>
              );
            })}
          </div>
        </Form.Item>

        <Form.Item
          name="format"
          label="Format"
          rules={[{ required: true, message: "Enter a format" }]}
          extra={
            <div className="nm-tokens">
              {TOKEN_HELP.map((t) => (
                <Tooltip key={t.token} title={`${t.label} — ${renderNumber(t.token, { padding: values?.padding || 4, seq: values?.next_number || 1, prefix })}`}>
                  <button type="button" className={`nm-token ${t.token === "{SEQ}" ? "seq" : ""}`} onClick={() => insertToken(t.token)}>
                    {t.token}
                  </button>
                </Tooltip>
              ))}
            </div>
          }
        >
          <Input ref={formatRef} className="nm-mono" maxLength={80} placeholder="{PREFIX}/{FY}/{SEQ}" autoComplete="off" spellCheck={false} />
        </Form.Item>

        <div className="nm-row">
          <Form.Item
            name="next_number"
            label="Next number"
            rules={[{ required: true, message: "Required" }]}
            extra="Moving from another system? Enter the number after your last one."
          >
            <InputNumber min={1} max={999999999} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="padding" label="Digits" tooltip="The running number is zero-filled to this many digits: 4 → 0042" rules={[{ required: true, message: "Required" }]}>
            <InputNumber min={1} max={9} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reset_period" label="Number restarts" rules={[{ required: true, message: "Required" }]}>
            <Select options={RESET_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          </Form.Item>
        </div>

        <Form.Item name="name" label="Series name" rules={[{ required: true, whitespace: true, message: "Name the series" }]} extra="Shown when someone picks a series, e.g. “Export invoices”.">
          <Input maxLength={60} />
        </Form.Item>

        {!editing && !firstActive && (
          <Form.Item name="is_default" valuePropName="checked" className="nm-default">
            <Checkbox>Make this the default for new {docLabel(type).toLowerCase()}s</Checkbox>
          </Form.Item>
        )}
        {firstActive && (
          <p className="nm-note">
            <CheckCircleFilled /> This becomes the numbering for every new {docLabel(type).toLowerCase()}. Documents you already made keep their numbers.
          </p>
        )}
      </Form>
    </Modal>
  );
};

export default SeriesModal;
