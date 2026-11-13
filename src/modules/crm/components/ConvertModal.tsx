import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, Modal, Radio, Select, Spin, message } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  FileAddOutlined,
  PlusOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { indianStates } from "@/utils/masterData/stata";
import { crmService } from "../services/crmService";
import { CrmMeta, LeadDetail, emitCrmChanged, errText } from "../constants";

interface Match {
  id: number;
  display_name: string;
  company_name: string | null;
  gst_number: string | null;
  customer_type: string;
  contact: { name: string; phone: string | null; email: string | null } | null;
  place: string | null;
  reasons: string[];
}

const REASON_LABEL: Record<string, string> = {
  gstin: "Same GSTIN",
  phone: "Same phone",
  email: "Same email",
  name: "Same name",
};

const matchState = (s?: string | null) => {
  if (!s) return undefined;
  const k = s.trim().toLowerCase();
  return indianStates.find((x) => x.toLowerCase() === k) || indianStates.find((x) => k.includes(x.toLowerCase()));
};

const isMobile = (p?: string | null) => !!p && /^[6-9]\d{9}$/.test(p);

interface Props {
  open: boolean;
  lead: LeadDetail | null;
  meta: CrmMeta | null;
  onClose: () => void;
  onConverted: (lead: LeadDetail) => void;
}

/**
 * "Create quotation" from a lead: a quotation needs a customer, so first link
 * the lead to an existing customer (matched by phone / email / GSTIN / name) or
 * create one from the lead's details — then open a new quotation for them.
 */
const ConvertModal: React.FC<Props> = ({ open, lead, meta, onClose, onConverted }) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [step, setStep] = useState<"match" | "create">("match");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const canQuote = !!meta?.can.quotations_create;
  const canCreate = !!meta?.can.customers_create;
  const canView = !!meta?.can.customers_view;

  useEffect(() => {
    if (!open || !lead) return;
    setStep("match");
    setPicked(null);
    setMatches(null);
    if (!canView) {
      setMatches([]);
      setStep("create");
    } else {
      crmService
        .matches(lead.id)
        .then((r) => {
          const m: Match[] = r.data?.data?.matches || [];
          setMatches(m);
          if (!m.length) setStep("create");
          else setPicked(m[0].id);
        })
        .catch(() => {
          setMatches([]);
          setStep("create");
        });
    }
    const parts = (lead.name || "").trim().split(/\s+/);
    const business = !!(lead.company_name || lead.gst_number);
    form.setFieldsValue({
      customer_type: business ? "BUSINESS" : "INDIVIDUAL",
      display_name: lead.company_name || lead.name,
      company_name: lead.company_name || undefined,
      gst_number: lead.gst_number || undefined,
      first_name: /buyer|visitor|unnamed/i.test(lead.name) ? undefined : parts[0],
      last_name: parts.length > 1 && !/buyer|visitor/i.test(lead.name) ? parts.slice(1).join(" ") : undefined,
      phone: isMobile(lead.phone) ? lead.phone : isMobile(lead.alt_phone) ? lead.alt_phone : undefined,
      email: lead.email || undefined,
      address_line_1: lead.address || undefined,
      city: lead.city || undefined,
      state: matchState(lead.state),
      postal_code: lead.pincode || undefined,
    });
  }, [open, lead, form, canView]);

  const afterConvert = (data: any, verb: string) => {
    emitCrmChanged();
    onConverted(data as LeadDetail);
    if (canQuote && lead) {
      message.success(`${verb} Opening a new quotation…`);
      const back = encodeURIComponent(`/app/crm/leads?lead=${lead.id}`);
      navigate(`/app/quotation?new=1&customer=${data.customer_id}&returnTo=${back}`);
    } else {
      message.success(`${verb} Ask someone with quotation access to send the quotation.`);
    }
  };

  const link = async () => {
    if (!lead || !picked) return;
    setSaving(true);
    try {
      const res = await crmService.convert(lead.id, { mode: "link", customer_id: picked });
      afterConvert(res.data.data, "Customer linked.");
    } catch (err) {
      message.error(errText(err, "Couldn't link the customer"));
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    if (!lead) return;
    let v: any;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const res = await crmService.convert(lead.id, {
        mode: "create",
        customer: {
          customer_type: v.customer_type,
          display_name: v.display_name.trim(),
          ...(v.company_name?.trim() ? { company_name: v.company_name.trim() } : {}),
          ...(v.gst_number?.trim() ? { gst_number: v.gst_number.trim().toUpperCase() } : {}),
          contact: {
            first_name: v.first_name.trim(),
            ...(v.last_name?.trim() ? { last_name: v.last_name.trim() } : {}),
            ...(v.phone?.trim() ? { phone: v.phone.replace(/\D/g, "").slice(-10) } : {}),
            ...(v.email?.trim() ? { email: v.email.trim() } : {}),
          },
          address: {
            address_line_1: v.address_line_1.trim(),
            ...(v.address_line_2?.trim() ? { address_line_2: v.address_line_2.trim() } : {}),
            ...(v.city?.trim() ? { city: v.city.trim() } : {}),
            state: v.state,
            ...(v.postal_code?.trim() ? { postal_code: v.postal_code.trim() } : {}),
            country: "India",
          },
        },
      });
      afterConvert(res.data.data, "Customer created.");
    } catch (err: any) {
      const existing = err?.response?.data?.data?.existing_customer_id;
      if (existing && canView) {
        message.warning(errText(err, "That customer already exists"));
        setPicked(existing);
        setStep("match");
        const named: Match = {
          id: existing,
          display_name: v.display_name.trim(),
          company_name: null,
          gst_number: null,
          customer_type: v.customer_type,
          contact: null,
          place: null,
          reasons: ["name"],
        };
        crmService
          .matches(lead.id)
          .then((r) => {
            const m: Match[] = r.data?.data?.matches || [];
            setMatches(m.some((x) => x.id === existing) ? m : [named, ...m]);
          })
          .catch(() => setMatches([named]));
      } else message.error(errText(err, "Couldn't create the customer"));
    } finally {
      setSaving(false);
    }
  };

  const type = Form.useWatch("customer_type", form);
  const title = useMemo(
    () => (
      <div className="crm-modal-title">
        <span className="crm-modal-icon"><FileAddOutlined /></span>
        <div>
          <b>{canQuote ? "Create quotation" : "Make this lead a customer"}</b>
          <small>
            {lead?.key} · {lead?.name}
            {lead?.company_name ? ` · ${lead.company_name}` : ""}
          </small>
        </div>
      </div>
    ),
    [lead, canQuote],
  );

  const footer =
    step === "match" ? (
      <div className="crm-modal-foot">
        {canCreate ? (
          <button className="crm-btn ghost" onClick={() => setStep("create")}>
            <PlusOutlined /> New customer instead
          </button>
        ) : (
          <span />
        )}
        <button className="crm-btn primary" disabled={!picked || saving} onClick={link}>
          {saving ? <Spin size="small" /> : <CheckCircleFilled />} Use this customer{canQuote ? " & continue" : ""}
        </button>
      </div>
    ) : (
      <div className="crm-modal-foot">
        {matches && matches.length > 0 ? (
          <button className="crm-btn ghost" onClick={() => setStep("match")}>
            <ArrowLeftOutlined /> Back to matches
          </button>
        ) : (
          <span />
        )}
        <button className="crm-btn primary" disabled={!canCreate || saving} onClick={create}>
          {saving ? <Spin size="small" /> : <PlusOutlined />} Create customer{canQuote ? " & continue" : ""}
        </button>
      </div>
    );

  return (
    <Modal open={open} onCancel={onClose} footer={footer} width={720} className="crm-modal" destroyOnHidden title={title}>
      <ol className="crm-convert-steps" aria-label="Steps">
        <li className="on">Customer</li>
        <li className={canQuote ? "" : "off"}>Quotation</li>
        <li className="">Lead moves to Quoted</li>
      </ol>

      {matches === null ? (
        <div className="crm-center"><Spin /></div>
      ) : step === "match" ? (
        <div className="crm-matches">
          <p className="crm-lede">
            This looks like someone who's already a customer. Use the existing record so quotations and invoices stay
            in one place.
          </p>
          <Radio.Group value={picked} onChange={(e) => setPicked(e.target.value)} className="crm-match-list">
            {matches.map((m) => (
              <label key={m.id} className={`crm-match${picked === m.id ? " on" : ""}`}>
                <Radio value={m.id} />
                <span className="crm-match-icon">{m.customer_type === "BUSINESS" ? <ShopOutlined /> : <UserOutlined />}</span>
                <span className="crm-match-body">
                  <b>{m.display_name}</b>
                  <small>
                    {[m.company_name && m.company_name !== m.display_name ? m.company_name : null, m.contact?.name, m.contact?.phone, m.place]
                      .filter(Boolean)
                      .join(" · ") || "No contact details"}
                  </small>
                  <span className="crm-match-reasons">
                    {m.reasons.map((r) => (
                      <i key={r} className={r}>
                        {REASON_LABEL[r] || r}
                      </i>
                    ))}
                    {m.gst_number && <em>GSTIN {m.gst_number}</em>}
                  </span>
                </span>
              </label>
            ))}
          </Radio.Group>
        </div>
      ) : (
        <Form form={form} layout="vertical" requiredMark="optional" className="crm-form">
          {!canCreate && <div className="crm-banner warn">You don't have permission to create customers. Ask an admin, or link an existing customer.</div>}
          <Form.Item name="customer_type" label="Customer type">
            <Radio.Group optionType="button" buttonStyle="solid" options={[{ value: "BUSINESS", label: "Business" }, { value: "INDIVIDUAL", label: "Individual" }]} />
          </Form.Item>
          <div className="crm-form-grid">
            <Form.Item name="display_name" label="Customer name (shown on quotations)" rules={[{ required: true, whitespace: true, min: 2, message: "At least 2 characters" }]}>
              <Input maxLength={255} />
            </Form.Item>
            {type === "BUSINESS" ? (
              <Form.Item name="company_name" label="Registered company name">
                <Input maxLength={255} />
              </Form.Item>
            ) : (
              <span />
            )}
            <Form.Item name="first_name" label="Contact first name" rules={[{ required: true, whitespace: true, min: 2, message: "At least 2 characters" }]}>
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="last_name" label="Last name">
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Mobile"
              rules={[{ pattern: /^[6-9]\d{9}$/, message: "10-digit Indian mobile number" }]}
              extra={!isMobile(lead?.phone) && lead?.phone ? `Lead's number: ${lead.phone}` : undefined}
              normalize={(v) => (v ? String(v).replace(/[^\d]/g, "").slice(-10) : v)}
            >
              <Input maxLength={14} inputMode="tel" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: "email", message: "That email doesn't look right" }]}>
              <Input maxLength={200} />
            </Form.Item>
          </div>
          {type === "BUSINESS" && (
            <Form.Item
              name="gst_number"
              label="GSTIN"
              rules={[{ pattern: /^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]$/, message: "15 characters, like 27ABCDE1234F1Z5" }]}
            >
              <Input maxLength={15} style={{ textTransform: "uppercase" }} />
            </Form.Item>
          )}
          <div className="crm-form-sub">Billing address</div>
          <Form.Item name="address_line_1" label="Address" rules={[{ required: true, whitespace: true, message: "Needed on the quotation" }]}>
            <Input maxLength={255} placeholder="Building, street, area" />
          </Form.Item>
          <div className="crm-form-grid three">
            <Form.Item name="city" label="City">
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="state" label="State" rules={[{ required: true, message: "Needed for GST (place of supply)" }]}>
              <Select showSearch placeholder="Select state" options={indianStates.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="postal_code" label="PIN code">
              <Input maxLength={10} inputMode="numeric" />
            </Form.Item>
          </div>
        </Form>
      )}
    </Modal>
  );
};

export default ConvertModal;
