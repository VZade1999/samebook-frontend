import React, { useEffect, useState } from "react";
import { Form, Input, Modal, Radio, Select, message } from "antd";
import { ApiOutlined, GlobalOutlined, ShopOutlined } from "@ant-design/icons";
import { crmService } from "../services/crmService";
import { CrmMeta, RATINGS, SOURCES, errText } from "../constants";

export interface LeadSource {
  id: number;
  type: "INDIAMART" | "WEBHOOK";
  name: string;
  is_active: boolean;
  settings: {
    assign_mode: "POOL" | "USER" | "ROUND_ROBIN";
    assign_user_ids: number[];
    lead_source: string;
    default_rating: string | null;
    redirect_url: string | null;
  };
  intake_token: string | null;
  has_api_key: boolean;
  api_key_hint: string | null;
  needs_reconnect: boolean;
  sync: { last_at: string | null; status: string | null; message: string | null; cursor: string | null; next_allowed_at: string | null } | null;
  last_lead_at: string | null;
  leads_total: number;
  creator: { id: number; name: string } | null;
  created_at: string;
}

interface Props {
  open: boolean;
  meta: CrmMeta | null;
  /** Edit this source; omit to add one of `type`. */
  source?: LeadSource | null;
  type?: "INDIAMART" | "WEBHOOK";
  /** Jump straight to the key field (IndiaMART "Change key"). */
  focusKey?: boolean;
  onClose: () => void;
  onSaved: (source: LeadSource, sync?: any) => void;
}

const SourceModal: React.FC<Props> = ({ open, meta, source, type, focusKey, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const kind = source?.type || type || "WEBHOOK";
  const editing = !!source;
  const mode = Form.useWatch("assign_mode", form);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      name: source?.name || (kind === "INDIAMART" ? "IndiaMART" : "Website form"),
      api_key: "",
      assign_mode: source?.settings.assign_mode || "POOL",
      assign_user_ids:
        source?.settings.assign_mode === "USER" ? source.settings.assign_user_ids[0] : source?.settings.assign_user_ids || [],
      lead_source: source?.settings.lead_source || "WEBSITE",
      default_rating: source?.settings.default_rating || undefined,
      redirect_url: source?.settings.redirect_url || "",
    });
  }, [open, source, kind, form]);

  const save = async () => {
    let v: any;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    const ids = v.assign_mode === "USER" ? (v.assign_user_ids ? [v.assign_user_ids] : []) : v.assign_mode === "ROUND_ROBIN" ? v.assign_user_ids || [] : [];
    const settings: any = {
      assign_mode: v.assign_mode,
      assign_user_ids: ids,
      default_rating: v.default_rating || null,
      ...(kind === "WEBHOOK" ? { lead_source: v.lead_source, redirect_url: v.redirect_url?.trim() || null } : {}),
    };
    setSaving(true);
    try {
      let res;
      if (editing && source) {
        res = await crmService.updateSource(source.id, {
          name: v.name.trim(),
          settings,
          ...(kind === "INDIAMART" && v.api_key?.trim() ? { api_key: v.api_key.trim() } : {}),
        });
      } else {
        res = await crmService.createSource({
          type: kind,
          name: v.name.trim(),
          settings,
          ...(kind === "INDIAMART" && v.api_key?.trim() ? { api_key: v.api_key.trim() } : {}),
        });
      }
      const d = res.data.data;
      onSaved(d.source, d.sync);
    } catch (err) {
      message.error(errText(err, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };

  const people = (meta?.users || []).map((u) => ({ value: u.id, label: u.name }));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={save}
      okText={editing ? "Save" : kind === "INDIAMART" ? "Connect IndiaMART" : "Create link"}
      confirmLoading={saving}
      width={620}
      className="crm-modal"
      destroyOnHidden
      title={
        <div className="crm-modal-title">
          <span className="crm-modal-icon">{kind === "INDIAMART" ? <ShopOutlined /> : <GlobalOutlined />}</span>
          <div>
            <b>{editing ? `${source?.name} settings` : kind === "INDIAMART" ? "Connect IndiaMART" : "Website form & other apps"}</b>
            <small>{kind === "INDIAMART" ? "Enquiries from your IndiaMART Lead Manager" : "A secure link that any form or app can send leads to"}</small>
          </div>
        </div>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional" className="crm-form">
        <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Give it a name" }]}>
          <Input maxLength={100} placeholder={kind === "INDIAMART" ? "IndiaMART" : "e.g. Website contact form, Facebook ads"} />
        </Form.Item>

        {kind === "INDIAMART" && (
          <Form.Item
            name="api_key"
            label={source?.has_api_key ? `CRM key (saved: ${source.api_key_hint}) — paste a new one to replace it` : "CRM key"}
            extra={
              <span>
                In IndiaMART: <b>Lead Manager → ⋮ → Import/Export Leads → Pull API → Generate Key</b>. Optional — without
                a key, use the instant Push link shown on the card.
              </span>
            }
          >
            <Input.Password autoFocus={focusKey} placeholder="Paste the key from IndiaMART" autoComplete="off" maxLength={300} />
          </Form.Item>
        )}

        {kind === "WEBHOOK" && (
          <div className="crm-form-grid">
            <Form.Item name="lead_source" label="Tag leads as" extra="Shown on each lead and in Insights">
              <Select options={SOURCES.filter((s) => s.key !== "INDIAMART").map((s) => ({ value: s.key, label: s.label }))} />
            </Form.Item>
            <Form.Item
              name="redirect_url"
              label="Thank-you page (optional)"
              extra="Where a visitor goes after a plain HTML form"
              rules={[{ pattern: /^https?:\/\/\S+$/i, message: "Full address starting with https://" }]}
            >
              <Input placeholder="https://yoursite.com/thank-you" maxLength={500} />
            </Form.Item>
          </div>
        )}

        <Form.Item name="assign_mode" label="Who gets new leads?">
          <Radio.Group className="crm-radio-cards">
            <Radio value="POOL">
              <b>Unassigned</b>
              <small>Anyone in sales can take them; managers are notified</small>
            </Radio>
            <Radio value="USER">
              <b>One person</b>
              <small>Every new lead goes to them</small>
            </Radio>
            <Radio value="ROUND_ROBIN">
              <b>Take turns</b>
              <small>Shared evenly between the people you pick</small>
            </Radio>
          </Radio.Group>
        </Form.Item>
        {mode === "USER" && (
          <Form.Item name="assign_user_ids" label="Person" rules={[{ required: true, message: "Pick someone" }]}>
            <Select showSearch optionFilterProp="label" options={people} placeholder="Choose a person" />
          </Form.Item>
        )}
        {mode === "ROUND_ROBIN" && (
          <Form.Item name="assign_user_ids" label="People" rules={[{ required: true, type: "array", min: 2, message: "Pick at least two people" }]}>
            <Select mode="multiple" showSearch optionFilterProp="label" options={people} placeholder="Choose people" />
          </Form.Item>
        )}
        <Form.Item name="default_rating" label="Rating for new leads (optional)">
          <Select allowClear placeholder="Not rated" options={RATINGS.map((r) => ({ value: r.key, label: `${r.label} — ${r.hint}` }))} />
        </Form.Item>
        {!meta?.users.length && (
          <p className="crm-hint">
            <ApiOutlined /> Only people whose role has CRM access can receive leads.
          </p>
        )}
      </Form>
    </Modal>
  );
};

export default SourceModal;
