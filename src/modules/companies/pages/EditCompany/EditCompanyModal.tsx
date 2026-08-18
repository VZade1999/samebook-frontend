import React, { useEffect, useRef, useState } from "react";
import { Form, Input, Modal, Checkbox, InputNumber, notification, Spin } from "antd";
import {
  PlusOutlined, DeleteOutlined, EditOutlined, ShopOutlined, UploadOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { updateCompany } from "../../redux/companyActions";

// ─── Global Styles ────────────────────────────────────────────────────────────
// Mirrors EditCustomerModal's design system (.ecm-*) exactly, under an
// .eco- prefix so the two modals' scoped <style> blocks never collide.
const ModalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .eco-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--foreground);
    }

    /* ── Modal overrides ── */
    .eco-modal .ant-modal-content {
      border-radius: 16px !important;
      overflow: hidden !important;
      padding: 0 !important;
      box-shadow: 0 20px 60px rgba(0,0,0,.22) !important;
    }
    .eco-modal .ant-modal-header { display: none !important; }
    .eco-modal .ant-modal-body   { padding: 0 !important; }
    .eco-modal .ant-modal-close  { display: none !important; }

    /* ── Header ── */
    .eco-header {
      background:
        radial-gradient(120% 180% at 100% 0%, #4338CA 0%, transparent 55%),
        linear-gradient(135deg, #14123A 0%, #1E1B4B 55%, #2A2470 100%);
      padding: 20px 24px;
      display: flex; align-items: center; justify-content: space-between;
      position: relative; overflow: hidden;
    }
    .eco-header::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0; height: 16px;
      background: var(--card); border-radius: 16px 16px 0 0;
    }
    .eco-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .eco-header-left { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
    .eco-header-icon {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px;
      background: linear-gradient(135deg, #818CF8, #4F46E5 70%);
      box-shadow: 0 4px 12px rgba(79,70,229,.45);
    }
    .eco-header-title { font-size: 17px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
    .eco-header-sub   { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 2px; }
    .eco-close-btn {
      position: relative; z-index: 1;
      width: 32px; height: 32px; border-radius: 8px; border: none;
      background: rgba(255,255,255,0.12); color: #fff; font-size: 16px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .15s; font-family: 'Inter', sans-serif;
    }
    .eco-close-btn:hover { background: rgba(255,255,255,0.22); }

    /* ── Body ── */
    .eco-body { padding: 20px 24px 0; max-height: 68vh; overflow-y: auto; }
    .eco-body::-webkit-scrollbar { width: 5px; }
    .eco-body::-webkit-scrollbar-track { background: transparent; }
    .eco-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

    /* ── Section label ── */
    .eco-section {
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.6px;
      text-transform: uppercase; color: var(--muted-foreground);
      margin: 20px 0 12px;
    }
    .eco-section::before { content: ''; flex: none; width: 3px; height: 14px; background: #4F46E5; border-radius: 2px; }
    .eco-section::after  { content: ''; flex: 1; height: 1px; background: var(--border); }

    /* ── Grid helpers ── */
    .eco-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .eco-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .eco-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }

    /* ── Ant Design field overrides ── */
    .eco-root .ant-form-item       { margin-bottom: 12px !important; }
    .eco-root .ant-form-item-label { padding-bottom: 4px !important; }
    .eco-root .ant-form-item-label > label {
      font-size: 11px !important; font-weight: 600 !important;
      letter-spacing: 0.3px !important; color: var(--muted-foreground) !important;
      text-transform: uppercase !important; height: auto !important;
    }
    .eco-root .ant-input,
    .eco-root .ant-input-affix-wrapper,
    .eco-root .ant-input-number {
      border-radius: 8px !important;
      font-size: 13px !important;
      font-family: 'Inter', sans-serif !important;
      background: var(--muted) !important;
      border-color: var(--border) !important;
    }
    .eco-root .ant-input-number { width: 100% !important; }
    .eco-root .ant-input:focus,
    .eco-root .ant-input-number-focused {
      border-color: #4F46E5 !important;
      box-shadow: 0 0 0 3px rgba(79,70,229,.1) !important;
      background: var(--card) !important;
    }
    .eco-root textarea.ant-input { min-height: 90px !important; resize: vertical !important; }

    /* ── Logo upload ── */
    .eco-logo-row { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
    .eco-logo-preview {
      width: 64px; height: 64px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--muted); display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0;
    }
    .eco-logo-preview img { width: 100%; height: 100%; object-fit: contain; }
    .eco-logo-upload-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1px solid var(--border); border-radius: 8px;
      background: var(--muted); color: var(--foreground); font-size: 12px; font-weight: 600;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .15s;
    }
    .eco-logo-upload-btn:hover { background: var(--card); border-color: #4F46E5; color: #4F46E5; }
    .eco-logo-upload-btn input { display: none; }
    .eco-logo-remove-btn {
      font-size: 12px; font-weight: 600; color: #DC2626; background: none; border: none;
      cursor: pointer; font-family: 'Inter', sans-serif; padding: 0;
    }
    .eco-logo-hint { font-size: 11px; color: var(--muted-foreground); }

    /* ── Repeatable cards ── */
    .eco-card {
      background: var(--muted); border: 1px solid var(--border); border-radius: 12px;
      margin-bottom: 12px; overflow: hidden;
    }
    .eco-card-head {
      padding: 11px 16px; background: var(--card); border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .eco-card-head-left { display: flex; align-items: center; gap: 8px; }
    .eco-card-num {
      width: 22px; height: 22px; border-radius: 6px; background: #EEF2FF; color: #4F46E5;
      font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
    }
    .eco-card-title { font-size: 13px; font-weight: 600; color: var(--foreground); }
    .eco-default-badge {
      font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
      padding: 2px 7px; border-radius: 99px; background: #D1FAE5; color: #065F46;
    }
    .eco-card-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }

    /* ── Remove / add buttons ── */
    .eco-remove-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 10px; border: 1px solid #FCA5A5; border-radius: 6px;
      background: #FFF5F5; color: #DC2626; font-size: 12px; font-weight: 500;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .12s;
    }
    .eco-remove-btn:hover { background: #FEE2E2; border-color: #F87171; }
    .eco-add-btn {
      display: flex; align-items: center; justify-content: center; gap: 7px;
      width: 100%; padding: 9px 16px; border: 1.5px dashed #C7D2FE; border-radius: 8px;
      background: #EEF2FF; color: #4F46E5; font-size: 13px; font-weight: 600;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .15s; margin-bottom: 4px;
    }
    .eco-add-btn:hover { background: #E0E7FF; border-color: #4F46E5; }

    /* ── Checkbox row ── */
    .eco-check-row .ant-checkbox-wrapper { font-size: 12px; font-weight: 500; color: var(--foreground); }

    /* ── Footer ── */
    .eco-footer {
      padding: 16px 24px; border-top: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
      background: var(--card); position: sticky; bottom: 0;
    }
    .eco-footer-note { font-size: 11px; color: var(--muted-foreground); }
    .eco-footer-note span { color: #4F46E5; font-weight: 700; }
    .eco-footer-btns { display: flex; gap: 10px; }
    .eco-cancel-btn {
      padding: 9px 20px; border: 1px solid var(--border); border-radius: 8px;
      background: var(--card); color: var(--foreground); font-size: 13px; font-weight: 600;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .15s;
    }
    .eco-cancel-btn:hover { background: var(--muted); }
    .eco-cancel-btn:disabled { opacity: .6; cursor: not-allowed; }
    .eco-save-btn {
      padding: 9px 22px; border: none; border-radius: 8px;
      background: #4F46E5; color: #fff; font-size: 13px; font-weight: 700;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .15s;
      display: flex; align-items: center; gap: 7px;
    }
    .eco-save-btn:hover:not(:disabled) { background: #4338CA; transform: translateY(-1px); }
    .eco-save-btn:disabled { opacity: .75; cursor: not-allowed; transform: none; }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .eco-grid-2, .eco-grid-3, .eco-grid-4 { grid-template-columns: 1fr !important; }
      .eco-body { padding: 16px 16px 0; }
      .eco-header, .eco-footer { padding: 16px; }
    }
  `}</style>
);

interface EditCompanyModalProps {
  open: boolean;
  onClose: () => void;
  company: any;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  open,
  onClose,
  company,
}) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Unable to read file'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.type !== 'image/png') {
      notification.error({
        message: 'Invalid file type',
        description: 'Please upload a PNG logo.',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notification.error({
        message: 'File too large',
        description: 'Logo must be 2MB or smaller.',
      });
      return;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      setLogoPreview(dataUrl);
      form.setFieldsValue({ logo: dataUrl });
    } catch {
      notification.error({
        message: 'Upload failed',
        description: 'Unable to read the selected logo.',
      });
    }
  };

  useEffect(() => {
    if (company) {
      form.setFieldsValue({
        name: company.name,
        company_prefix: company.company_prefix,
        legal_name: company.legal_name,
        registration_number: company.registration_number,
        gst_no: company.gst_no,
        industry: company.industry,
        website: company.website,
        primary_email: company.primary_email,
        primary_phone: company.primary_phone,
        default_terms_conditions: company.default_terms_conditions,
        logo: company.logo || null,
        addresses: company.addresses || [],
        locations: company.locations || [],
        metadata: company.metadata || [],
        bank_accounts: company.bank_accounts || [],
      });

      setLogoPreview(company.logo || null);
    }
  }, [company, form]);

  const companyState = useSelector((state: any) => state.companies);
  const updateLoading = companyState?.updateLoading || false;
  const error = companyState?.error;

  const prevUpdateLoadingRef = useRef<boolean>(updateLoading);

  useEffect(() => {
    if (prevUpdateLoadingRef.current && !updateLoading && !error) {
      form.resetFields();
      setLogoPreview(null);
      onClose();
    }
    prevUpdateLoadingRef.current = updateLoading;
  }, [updateLoading, error]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      dispatch(updateCompany({ id: company?.id, ...values }));
    } catch {
      // validation handled by Ant Design
    }
  };

  const handleClose = () => {
    if (updateLoading) return;
    form.resetFields();
    setLogoPreview(null);
    onClose();
  };

  return (
    <>
      <ModalStyles />
      <Modal
        open={open}
        onCancel={handleClose}
        width="95%"
        style={{ maxWidth: 1000, top: 20 }}
        footer={null}
        destroyOnClose
        className="eco-modal"
      >
        <div className="eco-root">

          {/* ── Header ── */}
          <div className="eco-header">
            <div className="eco-header-noise" />
            <div className="eco-header-left">
              <div className="eco-header-icon">
                <EditOutlined />
              </div>
              <div>
                <div className="eco-header-title">Edit Company</div>
                <div className="eco-header-sub">
                  {company?.name || "Update company details"}
                </div>
              </div>
            </div>
            <button className="eco-close-btn" onClick={handleClose}>✕</button>
          </div>

          {/* ── Body ── */}
          <div className="eco-body">
            <Form form={form} layout="vertical">

              {/* ── Company Details ── */}
              <div className="eco-section">Company Details</div>
              <div className="eco-grid-2">
                <Form.Item
                  label="Company Name"
                  name="name"
                  rules={[{ required: true, message: "Company name is required" }]}
                >
                  <Input placeholder="Enter company name" />
                </Form.Item>
                <Form.Item
                  label="Company Prefix"
                  name="company_prefix"
                  rules={[
                    { required: true, message: "Company prefix is required" },
                    { pattern: /^[A-Z0-9]+$/, message: "Uppercase alphanumeric only, no spaces" },
                    { max: 10, message: "At most 10 characters" },
                  ]}
                >
                  <Input placeholder="Enter company prefix" maxLength={10} />
                </Form.Item>
              </div>
              <div className="eco-grid-2">
                <Form.Item label="Legal Name" name="legal_name">
                  <Input placeholder="Enter legal company name" />
                </Form.Item>
                <Form.Item label="Registration Number" name="registration_number">
                  <Input placeholder="Enter registration number" />
                </Form.Item>
              </div>
              <div className="eco-grid-2">
                <Form.Item label="GST No." name="gst_no">
                  <Input placeholder="Enter tax id" />
                </Form.Item>
                <Form.Item label="Industry" name="industry">
                  <Input placeholder="Enter industry" />
                </Form.Item>
              </div>
              <div className="eco-grid-2">
                <Form.Item label="Website" name="website">
                  <Input placeholder="Enter website" />
                </Form.Item>
                <Form.Item label="Primary Email" name="primary_email">
                  <Input type="email" placeholder="Enter primary email" />
                </Form.Item>
              </div>
              <div className="eco-grid-2">
                <Form.Item label="Primary Phone" name="primary_phone">
                  <Input placeholder="Enter primary phone" />
                </Form.Item>
              </div>

              {/* ── Logo ── */}
              <div className="eco-section">Company Logo</div>
              <div className="eco-logo-row">
                <div className="eco-logo-preview">
                  {logoPreview ? <img src={logoPreview} alt="Logo preview" /> : <ShopOutlined style={{ color: "var(--muted-foreground)", fontSize: 22 }} />}
                </div>
                <label className="eco-logo-upload-btn">
                  <UploadOutlined /> Upload PNG
                  <input type="file" accept="image/png" onChange={handleLogoChange} />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    className="eco-logo-remove-btn"
                    onClick={() => { setLogoPreview(null); form.setFieldsValue({ logo: null }); }}
                  >
                    Remove logo
                  </button>
                )}
                <span className="eco-logo-hint">PNG only, up to 2MB</span>
              </div>
              <Form.Item name="logo" hidden>
                <Input />
              </Form.Item>

              {/* ── Terms & Conditions ── */}
              <div className="eco-section">Default Terms & Conditions</div>
              <Form.Item
                name="default_terms_conditions"
                tooltip="These will be auto-filled in all new quotations created for this company"
              >
                <Input.TextArea
                  rows={5}
                  placeholder="Enter default terms and conditions that will be used for quotations (e.g., Payment due within 30 days, Delivery warranty, etc.)"
                />
              </Form.Item>

              {/* ── Addresses ── */}
              <div className="eco-section">Addresses</div>
              <Form.List name="addresses">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <div className="eco-card" key={field.key}>
                        <div className="eco-card-head">
                          <div className="eco-card-head-left">
                            <div className="eco-card-num">{index + 1}</div>
                            <span className="eco-card-title">Address {index + 1}</span>
                          </div>
                          <button type="button" className="eco-remove-btn" onClick={() => remove(field.name)}>
                            <DeleteOutlined /> Remove
                          </button>
                        </div>
                        <div className="eco-card-body">
                          <Form.Item name={[field.name, "id"]} hidden><Input /></Form.Item>
                          <div className="eco-grid-2">
                            <Form.Item label="Type" name={[field.name, "type"]}>
                              <Input placeholder="office / billing" />
                            </Form.Item>
                            <Form.Item label="Label" name={[field.name, "label"]}>
                              <Input placeholder="Optional label" />
                            </Form.Item>
                          </div>
                          <div className="eco-grid-2">
                            <Form.Item label="Line 1" name={[field.name, "line_1"]}>
                              <Input placeholder="Address line 1" />
                            </Form.Item>
                            <Form.Item label="Line 2" name={[field.name, "line_2"]}>
                              <Input placeholder="Address line 2" />
                            </Form.Item>
                          </div>
                          <div className="eco-grid-4">
                            <Form.Item label="City" name={[field.name, "city"]}>
                              <Input placeholder="City" />
                            </Form.Item>
                            <Form.Item label="State" name={[field.name, "state"]}>
                              <Input placeholder="State" />
                            </Form.Item>
                            <Form.Item label="Country" name={[field.name, "country"]}>
                              <Input placeholder="Country" />
                            </Form.Item>
                            <Form.Item label="Postal Code" name={[field.name, "postal_code"]}>
                              <Input placeholder="Postal code" />
                            </Form.Item>
                          </div>
                          <div className="eco-grid-3">
                            <Form.Item label="Phone" name={[field.name, "phone"]}>
                              <Input placeholder="Phone" />
                            </Form.Item>
                            <Form.Item label="Fax" name={[field.name, "fax"]}>
                              <Input placeholder="Fax" />
                            </Form.Item>
                            <Form.Item name={[field.name, "is_default"]} valuePropName="checked" className="eco-check-row" style={{ alignSelf: "center", marginTop: 14 }}>
                              <Checkbox>Default address</Checkbox>
                            </Form.Item>
                          </div>
                          <Form.Item label="Notes" name={[field.name, "notes"]}>
                            <Input.TextArea rows={2} placeholder="Optional notes" />
                          </Form.Item>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="eco-add-btn" onClick={() => add()}>
                      <PlusOutlined /> Add address
                    </button>
                  </>
                )}
              </Form.List>

              {/* ── Locations ── */}
              <div className="eco-section">Locations</div>
              <Form.List name="locations">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <div className="eco-card" key={field.key}>
                        <div className="eco-card-head">
                          <div className="eco-card-head-left">
                            <div className="eco-card-num">{index + 1}</div>
                            <span className="eco-card-title">Location {index + 1}</span>
                          </div>
                          <button type="button" className="eco-remove-btn" onClick={() => remove(field.name)}>
                            <DeleteOutlined /> Remove
                          </button>
                        </div>
                        <div className="eco-card-body">
                          <Form.Item name={[field.name, "id"]} hidden><Input /></Form.Item>
                          <div className="eco-grid-2">
                            <Form.Item label="Location Name" name={[field.name, "name"]}>
                              <Input placeholder="Warehouse / branch" />
                            </Form.Item>
                            <Form.Item label="Location Type" name={[field.name, "location_type"]}>
                              <Input placeholder="e.g. headquarters" />
                            </Form.Item>
                          </div>
                          <div className="eco-grid-3">
                            <Form.Item label="Address ID" name={[field.name, "address_id"]}>
                              <InputNumber placeholder="Optional address id" />
                            </Form.Item>
                            <Form.Item label="Manager Name" name={[field.name, "manager_name"]}>
                              <Input placeholder="Manager name" />
                            </Form.Item>
                            <Form.Item label="Manager Phone" name={[field.name, "manager_phone"]}>
                              <Input placeholder="Manager phone" />
                            </Form.Item>
                          </div>
                          <div className="eco-grid-2">
                            <Form.Item label="Capacity" name={[field.name, "capacity"]}>
                              <Input placeholder="e.g. 120 seats" />
                            </Form.Item>
                            <Form.Item label="Operational Hours" name={[field.name, "operational_hours"]}>
                              <Input placeholder="e.g. 9am - 6pm" />
                            </Form.Item>
                          </div>
                          <div className="eco-grid-2">
                            <Form.Item label="Address Line 1" name={[field.name, "address_line_1"]}>
                              <Input placeholder="Address line 1" />
                            </Form.Item>
                            <Form.Item label="Address Line 2" name={[field.name, "address_line_2"]}>
                              <Input placeholder="Address line 2" />
                            </Form.Item>
                          </div>
                          <div className="eco-grid-4">
                            <Form.Item label="City" name={[field.name, "address_city"]}>
                              <Input placeholder="City" />
                            </Form.Item>
                            <Form.Item label="State" name={[field.name, "address_state"]}>
                              <Input placeholder="State" />
                            </Form.Item>
                            <Form.Item label="Country" name={[field.name, "address_country"]}>
                              <Input placeholder="Country" />
                            </Form.Item>
                            <Form.Item label="Postal Code" name={[field.name, "address_postal_code"]}>
                              <Input placeholder="Postal code" />
                            </Form.Item>
                          </div>
                          <Form.Item label="Notes" name={[field.name, "notes"]}>
                            <Input.TextArea rows={2} placeholder="Optional notes" />
                          </Form.Item>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="eco-add-btn" onClick={() => add()}>
                      <PlusOutlined /> Add location
                    </button>
                  </>
                )}
              </Form.List>

              {/* ── Bank Accounts ── */}
              <div className="eco-section">Bank Accounts</div>
              <Form.List name="bank_accounts">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <div className="eco-card" key={field.key}>
                        <div className="eco-card-head">
                          <div className="eco-card-head-left">
                            <div className="eco-card-num">{index + 1}</div>
                            <span className="eco-card-title">Bank Account {index + 1}</span>
                          </div>
                          <button type="button" className="eco-remove-btn" onClick={() => remove(field.name)}>
                            <DeleteOutlined /> Remove
                          </button>
                        </div>
                        <div className="eco-card-body">
                          <Form.Item name={[field.name, "id"]} hidden><Input /></Form.Item>
                          <div className="eco-grid-2">
                            <Form.Item label="Bank Name" name={[field.name, "bank_name"]}>
                              <Input placeholder="Enter bank name" />
                            </Form.Item>
                            <Form.Item label="Account Holder" name={[field.name, "account_holder_name"]}>
                              <Input placeholder="Account holder name" />
                            </Form.Item>
                          </div>
                          <div className="eco-grid-3">
                            <Form.Item label="Account Number" name={[field.name, "account_number"]}>
                              <Input placeholder="Enter account number" />
                            </Form.Item>
                            <Form.Item label="IFSC / Routing" name={[field.name, "ifsc_code"]}>
                              <Input placeholder="IFSC or routing code" />
                            </Form.Item>
                            <Form.Item label="Account Type" name={[field.name, "account_type"]}>
                              <Input placeholder="e.g. savings" />
                            </Form.Item>
                          </div>
                          <div className="eco-grid-2">
                            <Form.Item label="Branch Name" name={[field.name, "branch_name"]}>
                              <Input placeholder="Branch name" />
                            </Form.Item>
                            <Form.Item label="Branch Address" name={[field.name, "branch_address"]}>
                              <Input placeholder="Branch address" />
                            </Form.Item>
                          </div>
                          <Form.Item name={[field.name, "is_default"]} valuePropName="checked" className="eco-check-row">
                            <Checkbox>Default account</Checkbox>
                          </Form.Item>
                          <Form.Item label="Notes" name={[field.name, "notes"]}>
                            <Input.TextArea rows={2} placeholder="Optional notes" />
                          </Form.Item>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="eco-add-btn" onClick={() => add()}>
                      <PlusOutlined /> Add bank account
                    </button>
                  </>
                )}
              </Form.List>

              {/* ── Metadata ── */}
              <div className="eco-section">Metadata</div>
              <Form.List name="metadata">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <div className="eco-card" key={field.key}>
                        <div className="eco-card-head">
                          <div className="eco-card-head-left">
                            <div className="eco-card-num">{index + 1}</div>
                            <span className="eco-card-title">Metadata {index + 1}</span>
                          </div>
                          <button type="button" className="eco-remove-btn" onClick={() => remove(field.name)}>
                            <DeleteOutlined /> Remove
                          </button>
                        </div>
                        <div className="eco-card-body">
                          <Form.Item name={[field.name, "id"]} hidden><Input /></Form.Item>
                          <div className="eco-grid-2">
                            <Form.Item
                              label="Key"
                              name={[field.name, "key"]}
                              rules={[{ required: true, message: "Metadata key is required" }]}
                            >
                              <Input placeholder="Metadata key" />
                            </Form.Item>
                            <Form.Item label="Value" name={[field.name, "value"]}>
                              <Input placeholder="Metadata value" />
                            </Form.Item>
                          </div>
                          <div className="eco-grid-2">
                            <Form.Item label="Data Type" name={[field.name, "data_type"]}>
                              <Input placeholder="e.g. string, number" />
                            </Form.Item>
                            <Form.Item name={[field.name, "is_sensitive"]} valuePropName="checked" className="eco-check-row" style={{ alignSelf: "center", marginTop: 14 }}>
                              <Checkbox>Sensitive</Checkbox>
                            </Form.Item>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="eco-add-btn" onClick={() => add()}>
                      <PlusOutlined /> Add metadata
                    </button>
                  </>
                )}
              </Form.List>
            </Form>
          </div>

          {/* ── Footer ── */}
          <div className="eco-footer">
            <div className="eco-footer-note">
              <span>*</span> Required fields
            </div>
            <div className="eco-footer-btns">
              <button className="eco-cancel-btn" onClick={handleClose} disabled={updateLoading}>Cancel</button>
              <button className="eco-save-btn" onClick={handleSave} disabled={updateLoading}>
                {updateLoading ? <Spin size="small" /> : "✓"} {updateLoading ? "Updating…" : "Update Company"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EditCompanyModal;
