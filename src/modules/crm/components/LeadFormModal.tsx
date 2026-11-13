import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, InputNumber, Modal, Select, message } from "antd";
import { DownOutlined, UpOutlined, UserAddOutlined, EditOutlined, WarningFilled } from "@ant-design/icons";
import { indianStates } from "@/utils/masterData/stata";
import { crmService } from "../services/crmService";
import { CrmMeta, LeadDetail, RATINGS, SOURCES, STAGE, emitCrmChanged, errText } from "../constants";
import { SOURCE_ICON } from "./Bits";
import FollowUpPicker from "./FollowUpPicker";

interface Props {
  open: boolean;
  meta: CrmMeta | null;
  /** Edit this lead's details; omit to add a new lead. */
  lead?: LeadDetail | null;
  onClose: () => void;
  onSaved: (lead: LeadDetail) => void;
  onOpenLead?: (id: number) => void;
}

const FIELDS = [
  "name",
  "company_name",
  "phone",
  "alt_phone",
  "email",
  "requirement",
  "message",
  "estimated_value",
  "source",
  "source_detail",
  "rating",
  "city",
  "state",
  "pincode",
  "address",
  "gst_number",
] as const;

const LeadFormModal: React.FC<Props> = ({ open, meta, lead, onClose, onSaved, onOpenLead }) => {
  const [form] = Form.useForm();
  const editing = !!lead;
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false);
  const [followUp, setFollowUp] = useState<string | null | undefined>(undefined);
  const [dupes, setDupes] = useState<any[]>([]);
  const phone = Form.useWatch("phone", form);
  const email = Form.useWatch("email", form);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setDupes([]);
    if (lead) {
      const v: any = {};
      FIELDS.forEach((k) => (v[k] = (lead as any)[k] ?? undefined));
      form.setFieldsValue(v);
      setMore(!!(lead.address || lead.gst_number || lead.pincode || lead.city || lead.state));
    } else {
      form.setFieldsValue({ source: "PHONE", owner_id: meta?.me || undefined });
      setMore(false);
      setFollowUp(undefined);
    }
  }, [open, lead, form, meta]);

  // Possible duplicates while typing a phone / email.
  useEffect(() => {
    if (!open) return;
    const p = String(phone || "").trim();
    const e = String(email || "").trim();
    if (p.replace(/\D/g, "").length < 8 && !/@.+\./.test(e)) {
      setDupes([]);
      return;
    }
    const t = setTimeout(() => {
      crmService
        .duplicates({ phone: p || undefined, email: e || undefined, exclude_id: lead?.id })
        .then((r) => setDupes(r.data?.data || []))
        .catch(() => setDupes([]));
    }, 450);
    return () => clearTimeout(t);
  }, [phone, email, open, lead?.id]);

  const ownerOptions = useMemo(
    () => [
      { value: 0, label: "Nobody yet (unassigned)" },
      ...(meta?.users || []).map((u) => ({ value: u.id, label: u.id === meta?.me ? `${u.name} (me)` : u.name })),
    ],
    [meta],
  );

  const submit = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (!values.phone?.trim() && !values.email?.trim()) {
      form.setFields([{ name: "phone", errors: ["Add a phone number or an email"] }]);
      return;
    }
    setSaving(true);
    try {
      let res;
      if (editing && lead) {
        const patch: any = {};
        FIELDS.forEach((k) => {
          const now = values[k] === undefined || values[k] === "" ? null : values[k];
          const was = (lead as any)[k] ?? null;
          if (k === "estimated_value" ? Number(now ?? -1) !== Number(was ?? -1) : (now ?? null) !== (was ?? null)) {
            patch[k] = k === "source" && now === null ? undefined : now;
          }
        });
        Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
        if (!Object.keys(patch).length) {
          onClose();
          return;
        }
        res = await crmService.update(lead.id, patch);
        message.success("Lead updated");
      } else {
        const payload: any = {};
        FIELDS.forEach((k) => {
          const v = values[k];
          if (v !== undefined && v !== null && v !== "") payload[k] = typeof v === "string" ? v.trim() : v;
        });
        if (meta?.can.manage && values.owner_id !== undefined) payload.owner_id = values.owner_id === 0 ? null : values.owner_id;
        if (followUp) payload.next_follow_up_at = followUp;
        res = await crmService.create(payload);
        message.success(`Lead ${res.data?.data?.key || ""} added`);
      }
      emitCrmChanged();
      onSaved(res.data.data as LeadDetail);
    } catch (err) {
      message.error(errText(err, editing ? "Couldn't save the lead" : "Couldn't add the lead"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText={editing ? "Save changes" : "Add lead"}
      confirmLoading={saving}
      width={720}
      destroyOnHidden
      className="crm-modal"
      title={
        <div className="crm-modal-title">
          <span className="crm-modal-icon">{editing ? <EditOutlined /> : <UserAddOutlined />}</span>
          <div>
            <b>{editing ? `Edit ${lead?.key}` : "New lead"}</b>
            <small>{editing ? "Contact and enquiry details" : "Someone who asked about your products or services"}</small>
          </div>
        </div>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional" className="crm-form">
        <div className="crm-form-grid">
          <Form.Item name="name" label="Contact person" rules={[{ required: true, whitespace: true, message: "Enter a name" }]}>
            <Input placeholder="e.g. Rahul Sharma" maxLength={150} autoFocus />
          </Form.Item>
          <Form.Item name="company_name" label="Company">
            <Input placeholder="e.g. Sharma Traders" maxLength={200} />
          </Form.Item>
          <Form.Item name="phone" label="Mobile">
            <Input placeholder="98765 43210" maxLength={30} inputMode="tel" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: "email", message: "That email doesn't look right" }]}>
            <Input placeholder="name@company.com" maxLength={200} inputMode="email" />
          </Form.Item>
        </div>

        {dupes.length > 0 && (
          <div className="crm-dupes" role="status">
            <WarningFilled />
            <div>
              <b>Already in your CRM?</b>
              {dupes.map((d) => (
                <div key={d.id} className="crm-dupe">
                  <span className="crm-key">{d.key}</span> {d.name} · {STAGE[d.stage as keyof typeof STAGE]?.label || d.stage}
                  {d.owner ? ` · ${d.owner.name}` : " · unassigned"} · same {d.match}
                  {d.visible && onOpenLead && (
                    <button type="button" className="crm-link" onClick={() => onOpenLead(d.id)}>
                      Open
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Form.Item name="requirement" label="What do they need?">
          <Input placeholder="e.g. 500 kg MS pipes, 2-inch" maxLength={300} />
        </Form.Item>
        <Form.Item name="message" label="Details">
          <Input.TextArea placeholder="Quantity, delivery place, timeline, anything they said…" autoSize={{ minRows: 2, maxRows: 6 }} maxLength={5000} />
        </Form.Item>

        <div className="crm-form-grid three">
          <Form.Item name="source" label="Came from">
            <Select
              options={SOURCES.map((s) => ({
                value: s.key,
                label: (
                  <span className="crm-opt">
                    <span style={{ color: s.color }}>{SOURCE_ICON[s.key]}</span> {s.label}
                  </span>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item name="estimated_value" label="Expected value (₹)">
            <InputNumber min={0} max={999999999999} style={{ width: "100%" }} placeholder="e.g. 150000" formatter={(v) => (v ? Number(v).toLocaleString("en-IN") : "")} parser={(v) => Number(String(v || "").replace(/[^\d.]/g, "")) as any} />
          </Form.Item>
          <Form.Item name="rating" label="How hot?">
            <Select
              allowClear
              placeholder="Not rated"
              options={RATINGS.map((r) => ({ value: r.key, label: <span className="crm-opt"><span style={{ color: r.color }}>●</span> {r.label} — {r.hint}</span> }))}
            />
          </Form.Item>
        </div>

        {!editing && meta?.can.manage && (
          <Form.Item name="owner_id" label="Assign to">
            <Select options={ownerOptions} showSearch optionFilterProp="label" />
          </Form.Item>
        )}

        <button type="button" className="crm-more-toggle" onClick={() => setMore((v) => !v)} aria-expanded={more}>
          {more ? <UpOutlined /> : <DownOutlined />} {more ? "Fewer details" : "Address, GSTIN and more"}
        </button>
        {more && (
          <div className="crm-form-more">
            <div className="crm-form-grid three">
              <Form.Item name="city" label="City">
                <Input maxLength={100} />
              </Form.Item>
              <Form.Item name="state" label="State">
                <Select allowClear showSearch placeholder="Select state" options={indianStates.map((s) => ({ value: s, label: s }))} />
              </Form.Item>
              <Form.Item name="pincode" label="PIN code">
                <Input maxLength={10} inputMode="numeric" />
              </Form.Item>
            </div>
            <Form.Item name="address" label="Address">
              <Input maxLength={500} />
            </Form.Item>
            <div className="crm-form-grid">
              <Form.Item name="gst_number" label="GSTIN">
                <Input maxLength={15} placeholder="27ABCDE1234F1Z5" style={{ textTransform: "uppercase" }} />
              </Form.Item>
              <Form.Item name="alt_phone" label="Other phone">
                <Input maxLength={30} inputMode="tel" />
              </Form.Item>
            </div>
            <Form.Item name="source_detail" label="Source detail">
              <Input maxLength={100} placeholder="Campaign, referred by, event name…" />
            </Form.Item>
          </div>
        )}

        {!editing && (
          <div className="crm-form-fu">
            <label>Next follow-up</label>
            <FollowUpPicker value={followUp} onChange={setFollowUp} size="sm" />
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default LeadFormModal;
