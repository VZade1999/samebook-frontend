import React from "react";
import { Form, Input, Modal, Select, Switch, Popconfirm } from "antd";
import { DeleteOutlined, PlusOutlined, BankOutlined, UserOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { createCustomer } from "../redux/customerActions";
import { indianStates } from "@/utils/masterData/stata";

const { Option } = Select;
const { TextArea } = Input;

// ─── Global styles (scoped with acm- prefix) ─────────────────────────────────
const ModalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .acm-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* ── Modal overrides ── */
    .acm-modal .ant-modal-header {
      background: #1E1B4B !important;
      border-radius: 12px 12px 0 0 !important;
      padding: 20px 24px !important;
      border-bottom: none !important;
    }
    .acm-modal .ant-modal-title {
      color: #fff !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .acm-modal .ant-modal-close {
      color: rgba(255,255,255,0.6) !important;
      top: 18px !important;
    }
    .acm-modal .ant-modal-close:hover { color: #fff !important; }
    .acm-modal .ant-modal-content {
      border-radius: 12px !important;
      overflow: hidden;
      padding: 0 !important;
    }
    .acm-modal .ant-modal-body { padding: 0 !important; }

    /* ── Section divider ── */
    .acm-section {
      padding: 0 24px;
      margin-bottom: 4px;
    }
    .acm-section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 0 14px;
      border-bottom: 1px solid #E5E7EB;
      margin-bottom: 20px;
    }
    .acm-section-icon {
      width: 28px; height: 28px;
      border-radius: 7px;
      background: #EEF2FF;
      color: #4F46E5;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
    }
    .acm-section-title {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      letter-spacing: 0.1px;
    }
    .acm-section-sub {
      font-size: 11px;
      color: #6B7280;
      margin-left: auto;
    }

    /* ── Form grid ── */
    .acm-grid {
      display: grid;
      gap: 0 16px;
    }
    .acm-grid-2 { grid-template-columns: 1fr 1fr; }
    .acm-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
    .acm-grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

    /* ── Form items ── */
    .acm-root .ant-form-item {
      margin-bottom: 16px !important;
    }
    .acm-root .ant-form-item-label > label {
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #374151 !important;
      font-family: 'Inter', sans-serif !important;
      letter-spacing: 0.2px;
    }
    .acm-root .ant-input,
    .acm-root .ant-select-selector,
    .acm-root .ant-input-textarea textarea {
      font-family: 'Inter', sans-serif !important;
      font-size: 13px !important;
      border-radius: 8px !important;
      border-color: #E5E7EB !important;
      background: #FAFAFA !important;
    }
    .acm-root .ant-input:focus,
    .acm-root .ant-input:hover,
    .acm-root .ant-select-selector:hover,
    .acm-root .ant-select-focused .ant-select-selector {
      border-color: #4F46E5 !important;
      box-shadow: 0 0 0 3px rgba(79,70,229,.08) !important;
      background: #fff !important;
    }

    /* ── Sub-card (for contacts/addresses) ── */
    .acm-sub-card {
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      margin-bottom: 12px;
      overflow: hidden;
      background: #fff;
    }
    .acm-sub-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
    }
    .acm-sub-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #374151;
      letter-spacing: 0.2px;
    }
    .acm-sub-card-num {
      width: 20px; height: 20px;
      border-radius: 50%;
      background: #EEF2FF;
      color: #4F46E5;
      font-size: 10px;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .acm-sub-card-body { padding: 16px 16px 4px; }

    /* ── Remove button ── */
    .acm-remove-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border: 1px solid #FECACA;
      background: #FEF2F2;
      color: #DC2626;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all .12s;
    }
    .acm-remove-btn:hover {
      background: #FEE2E2;
      border-color: #DC2626;
    }

    /* ── Add button ── */
    .acm-add-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 10px;
      border: 1.5px dashed #C7D2FE;
      border-radius: 8px;
      background: #F5F3FF;
      color: #4F46E5;
      font-size: 12px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all .15s;
      margin-bottom: 16px;
    }
    .acm-add-btn:hover {
      background: #EEF2FF;
      border-color: #818CF8;
    }

    /* ── Switch row ── */
    .acm-switch-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0 14px;
      border-top: 1px solid #F3F4F6;
      margin-top: 4px;
    }
    .acm-switch-label {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
    }
    .acm-switch-desc { font-size: 11px; color: #9CA3AF; }

    /* ── Primary badge ── */
    .acm-primary-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: #DCFCE7;
      color: #166534;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
    }

    /* ── Type selector ── */
    .acm-type-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }
    .acm-type-card {
      border: 1.5px solid #E5E7EB;
      border-radius: 10px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all .15s;
      display: flex;
      align-items: center;
      gap: 12px;
      background: #FAFAFA;
    }
    .acm-type-card.active {
      border-color: #4F46E5;
      background: #EEF2FF;
      box-shadow: 0 0 0 3px rgba(79,70,229,.08);
    }
    .acm-type-card-icon {
      width: 36px; height: 36px;
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    .acm-type-card.active .acm-type-card-icon { background: #C7D2FE; color: #4F46E5; }
    .acm-type-card:not(.active) .acm-type-card-icon { background: #F3F4F6; color: #9CA3AF; }
    .acm-type-card-label { font-size: 13px; font-weight: 700; color: #111827; }
    .acm-type-card-sub { font-size: 11px; color: #6B7280; margin-top: 1px; }

    /* ── GST monospace ── */
    .acm-root .acm-gst-input input {
      font-family: 'Courier New', monospace !important;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* ── Address type badge colors ── */
    .acm-addr-type {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
    }
    .acm-addr-BILLING  { background: #DBEAFE; color: #1D4ED8; }
    .acm-addr-SHIPPING { background: #ECFDF5; color: #059669; }
    .acm-addr-OFFICE   { background: #FEF3C7; color: #92400E; }
    .acm-addr-OTHER    { background: #F3F4F6; color: #374151; }

    /* ── Notes ── */
    .acm-root .ant-input-textarea textarea {
      resize: vertical;
      min-height: 80px;
    }

    /* ── Footer ── */
    .acm-footer {
      padding: 16px 24px;
      border-top: 1px solid #E5E7EB;
      background: #F9FAFB;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .acm-footer-hint { font-size: 11px; color: #9CA3AF; }
    .acm-footer-actions { display: flex; gap: 8px; }
    .acm-cancel-btn {
      padding: 9px 18px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      background: #fff;
      color: #374151;
      font-size: 13px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all .12s;
    }
    .acm-cancel-btn:hover { background: #F9FAFB; border-color: #D1D5DB; }
    .acm-save-btn {
      padding: 9px 20px;
      border: none;
      border-radius: 8px;
      background: #4F46E5;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all .12s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .acm-save-btn:hover { background: #4338CA; transform: translateY(-1px); }
    .acm-save-btn:active { transform: translateY(0); }

    /* ── Scrollable body ── */
    .acm-body {
      max-height: calc(100vh - 200px);
      overflow-y: auto;
      padding-bottom: 4px;
    }
    .acm-body::-webkit-scrollbar { width: 4px; }
    .acm-body::-webkit-scrollbar-track { background: transparent; }
    .acm-body::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 99px; }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .acm-grid-2, .acm-grid-3, .acm-grid-4 { grid-template-columns: 1fr; }
      .acm-type-row { grid-template-columns: 1fr; }
    }
  `}</style>
);

interface AddCustomerModalProps {
  open: boolean;
  onClose: () => void;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const customerType = Form.useWatch("customer_type", form) || "INDIVIDUAL";

  // ─── Close ────────────────────────────────────────────────────────────────
  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (values.customer_type === "BUSINESS") {
        const contacts = values.contacts || [];
        const hasValidContact = contacts.some(
          (c: any) => c.first_name && c.last_name && c.phone,
        );
        if (!hasValidContact) {
          return alert(
            "Business customers must have at least one contact with first name, last name, and phone number",
          );
        }
      }

      const primaryContacts = (values.contacts || []).filter((c: any) => c.is_primary);
      if (primaryContacts.length > 1) return alert("Only one primary contact allowed");

      const primaryAddresses = (values.addresses || []).filter((a: any) => a.is_primary);
      if (primaryAddresses.length > 1) return alert("Only one primary address allowed");

      dispatch(createCustomer(values));
      form.resetFields();
      onClose();
    } catch (error) {
      console.log("Validation Failed", error);
    }
  };

  // ─── Type card click ───────────────────────────────────────────────────────
  const handleTypeSelect = (type: string) => {
    form.setFieldValue("customer_type", type);
  };

  return (
    <>
      <ModalStyles />
      <Modal
        className="acm-modal"
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 7,
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <PlusOutlined style={{ fontSize: 13, color: "#fff" }} />
            </span>
            Create Customer
          </span>
        }
        open={open}
        onCancel={handleClose}
        width="95%"
        style={{ maxWidth: 860, top: 20 }}
        footer={null}
        destroyOnClose
      >
        <div className="acm-root">
          <div className="acm-body">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                customer_type: "INDIVIDUAL",
                contacts: [{ is_primary: true }],
                addresses: [{ address_type: "BILLING", is_primary: true }],
              }}
            >

              {/* ── Customer type visual selector ── */}
              <div className="acm-section" style={{ paddingTop: 20 }}>
                <Form.Item name="customer_type" noStyle>
                  <div className="acm-type-row">
                    {[
                      {
                        value: "INDIVIDUAL",
                        label: "Individual",
                        sub: "Single person or sole trader",
                        icon: <UserOutlined />,
                      },
                      {
                        value: "BUSINESS",
                        label: "Business",
                        sub: "Company, firm or organization",
                        icon: <BankOutlined />,
                      },
                    ].map((t) => (
                      <div
                        key={t.value}
                        className={`acm-type-card ${customerType === t.value ? "active" : ""}`}
                        onClick={() => handleTypeSelect(t.value)}
                      >
                        <div className="acm-type-card-icon">{t.icon}</div>
                        <div>
                          <div className="acm-type-card-label">{t.label}</div>
                          <div className="acm-type-card-sub">{t.sub}</div>
                        </div>
                        {customerType === t.value && (
                          <div style={{ marginLeft: "auto" }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: "50%",
                              background: "#4F46E5",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Form.Item>

                {/* Display name */}
                <Form.Item
                  label="Display Name"
                  name="display_name"
                  rules={[{ required: true, message: "Display name is required" }]}
                >
                  <Input placeholder="How this customer appears in lists and documents" />
                </Form.Item>
              </div>

              {/* ── Business details (conditional) ── */}
              {customerType === "BUSINESS" && (
                <div className="acm-section">
                  <div className="acm-section-header">
                    <div className="acm-section-icon"><BankOutlined /></div>
                    <span className="acm-section-title">Business Details</span>
                  </div>
                  <div className="acm-grid acm-grid-2">
                    <Form.Item
                      label="Company Name"
                      name="company_name"
                      rules={[{ required: true, message: "Company name is required" }]}
                    >
                      <Input placeholder="Legal entity name" />
                    </Form.Item>
                    <Form.Item label="GST Number" name="gst_number">
                      <Input className="acm-gst-input" placeholder="22AAAAA0000A1Z5" />
                    </Form.Item>
                    <Form.Item label="Website" name="website">
                      <Input placeholder="https://company.com" />
                    </Form.Item>
                    <Form.Item label="Industry" name="industry">
                      <Input placeholder="e.g. Manufacturing, IT, Pharma" />
                    </Form.Item>
                  </div>
                </div>
              )}

              {/* ── Contacts ── */}
              <div className="acm-section">
                <div className="acm-section-header">
                  <div className="acm-section-icon"><UserOutlined /></div>
                  <span className="acm-section-title">Contacts</span>
                  <span className="acm-section-sub">
                    {customerType === "INDIVIDUAL" ? "Primary contact" : "All contacts for this business"}
                  </span>
                </div>

                <Form.List name="contacts">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }, index) => (
                        <div key={key} className="acm-sub-card">
                          <div className="acm-sub-card-header">
                            <div className="acm-sub-card-title">
                              <div className="acm-sub-card-num">{index + 1}</div>
                              Contact {index + 1}
                            </div>
                            {fields.length > 1 && (
                              <button
                                className="acm-remove-btn"
                                type="button"
                                onClick={() => remove(name)}
                              >
                                <DeleteOutlined style={{ fontSize: 11 }} />
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="acm-sub-card-body">
                            <div className="acm-grid acm-grid-2">
                              <Form.Item
                                {...restField}
                                label="First Name"
                                name={[name, "first_name"]}
                                rules={[{ required: true, message: "First name is required" }]}
                              >
                                <Input placeholder="First name" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                label="Last Name"
                                name={[name, "last_name"]}
                                rules={[{ required: true, message: "Last name is required" }]}
                              >
                                <Input placeholder="Last name" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                label="Email"
                                name={[name, "email"]}
                                rules={[{ type: "email", message: "Enter a valid email" }]}
                              >
                                <Input placeholder="email@example.com" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                label="Phone"
                                name={[name, "phone"]}
                                rules={[
                                  { required: true, message: "Phone is required" },
                                  {
                                    pattern: /^[6-9]\d{9}$/,
                                    message: "Enter a valid 10-digit Indian number",
                                  },
                                ]}
                              >
                                <Input placeholder="9876543210" />
                              </Form.Item>
                              {customerType === "BUSINESS" && (
                                <>
                                  <Form.Item
                                    {...restField}
                                    label="Department"
                                    name={[name, "department"]}
                                  >
                                    <Input placeholder="e.g. Finance, Purchase" />
                                  </Form.Item>
                                  <Form.Item
                                    {...restField}
                                    label="Designation"
                                    name={[name, "designation"]}
                                  >
                                    <Input placeholder="e.g. Purchase Manager" />
                                  </Form.Item>
                                </>
                              )}
                            </div>
                            <div className="acm-switch-row">
                              <Form.Item
                                {...restField}
                                name={[name, "is_primary"]}
                                valuePropName="checked"
                                noStyle
                              >
                                <Switch size="small" />
                              </Form.Item>
                              <div>
                                <div className="acm-switch-label">Primary contact</div>
                                <div className="acm-switch-desc">Used as the main point of contact</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {customerType !== "INDIVIDUAL" && (
                        <button
                          className="acm-add-btn"
                          type="button"
                          onClick={() => add({ is_primary: false })}
                        >
                          <PlusOutlined style={{ fontSize: 12 }} />
                          Add another contact
                        </button>
                      )}
                    </>
                  )}
                </Form.List>
              </div>

              {/* ── Addresses ── */}
              <div className="acm-section">
                <div className="acm-section-header">
                  <div className="acm-section-icon">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 8 4 8s4-4.75 4-8c0-2.21-1.79-4-4-4z" stroke="#4F46E5" strokeWidth="1.2" fill="none"/>
                      <circle cx="7" cy="5" r="1.2" stroke="#4F46E5" strokeWidth="1.2" fill="none"/>
                    </svg>
                  </div>
                  <span className="acm-section-title">Addresses</span>
                  <span className="acm-section-sub">
                    {customerType === "INDIVIDUAL" ? "Billing & Shipping only" : "All business locations"}
                  </span>
                </div>

                <Form.List name="addresses">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }, index) => (
                        <div key={key} className="acm-sub-card">
                          <div className="acm-sub-card-header">
                            <div className="acm-sub-card-title">
                              <div className="acm-sub-card-num">{index + 1}</div>
                              Address {index + 1}
                            </div>
                            {fields.length > 1 && (
                              <button
                                className="acm-remove-btn"
                                type="button"
                                onClick={() => remove(name)}
                              >
                                <DeleteOutlined style={{ fontSize: 11 }} />
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="acm-sub-card-body">
                            <div className="acm-grid acm-grid-3">
                              <Form.Item
                                {...restField}
                                label="Address Type"
                                name={[name, "address_type"]}
                              >
                                <Select placeholder="Select type">
                                  <Option value="BILLING">Billing</Option>
                                  <Option value="SHIPPING">Shipping</Option>
                                  {customerType === "BUSINESS" && (
                                    <>
                                      <Option value="OFFICE">Office</Option>
                                      <Option value="WAREHOUSE">Warehouse</Option>
                                      <Option value="FACTORY">Factory</Option>
                                      <Option value="BRANCH">Branch</Option>
                                      <Option value="OTHER">Other</Option>
                                    </>
                                  )}
                                </Select>
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                label="Label"
                                name={[name, "label"]}
                              >
                                <Input placeholder="e.g. Pune Office" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                label="GST Number"
                                name={[name, "gst_number"]}
                              >
                                <Input className="acm-gst-input" placeholder="Location GST" />
                              </Form.Item>
                            </div>

                            <Form.Item
                              {...restField}
                              label="Address Line 1"
                              name={[name, "address_line_1"]}
                            >
                              <Input placeholder="Street, building, plot number" />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              label="Address Line 2"
                              name={[name, "address_line_2"]}
                            >
                              <Input placeholder="Area, landmark (optional)" />
                            </Form.Item>

                            <div className="acm-grid acm-grid-4">
                              <Form.Item
                                {...restField}
                                label="City"
                                name={[name, "city"]}
                              >
                                <Input placeholder="City" />
                              </Form.Item>
                              <Form.Item
                                label="State"
                                name={[name, "state"]}
                                rules={[{ required: true, message: "State is required" }]}
                              >
                                <Select
                                  showSearch
                                  placeholder="State"
                                  optionFilterProp="children"
                                  filterOption={(input, option) =>
                                    (option?.children as unknown as string)
                                      ?.toLowerCase()
                                      .includes(input.toLowerCase())
                                  }
                                >
                                  {indianStates.map((s) => (
                                    <Option key={s} value={s}>{s}</Option>
                                  ))}
                                </Select>
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                label="Country"
                                name={[name, "country"]}
                              >
                                <Input placeholder="Country" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                label="Postal Code"
                                name={[name, "postal_code"]}
                              >
                                <Input placeholder="PIN code" />
                              </Form.Item>
                            </div>

                            <div className="acm-switch-row">
                              <Form.Item
                                {...restField}
                                name={[name, "is_primary"]}
                                valuePropName="checked"
                                noStyle
                              >
                                <Switch size="small" />
                              </Form.Item>
                              <div>
                                <div className="acm-switch-label">Primary address</div>
                                <div className="acm-switch-desc">Used on invoices and documents by default</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        className="acm-add-btn"
                        type="button"
                        onClick={() => {
                          if (customerType === "INDIVIDUAL" && fields.length >= 2) {
                            return alert("Individual customers can only have Billing and Shipping addresses");
                          }
                          let addressType = "BILLING";
                          if (customerType === "INDIVIDUAL") {
                            addressType = fields.length === 0 ? "BILLING" : "SHIPPING";
                          }
                          add({ address_type: addressType, is_primary: false });
                        }}
                      >
                        <PlusOutlined style={{ fontSize: 12 }} />
                        Add another address
                      </button>
                    </>
                  )}
                </Form.List>
              </div>

              {/* ── Notes ── */}
              <div className="acm-section">
                <div className="acm-section-header">
                  <div className="acm-section-icon">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="2" width="10" height="10" rx="2" stroke="#4F46E5" strokeWidth="1.2" fill="none"/>
                      <path d="M4.5 5h5M4.5 7h5M4.5 9h3" stroke="#4F46E5" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="acm-section-title">Notes</span>
                  <span className="acm-section-sub">Internal only, not shown to customer</span>
                </div>
                <Form.Item name="notes">
                  <TextArea
                    rows={3}
                    placeholder="Payment terms, special instructions, or anything else worth noting…"
                  />
                </Form.Item>
              </div>

              {/* spacer before sticky footer */}
              <div style={{ height: 8 }} />
            </Form>
          </div>

          {/* ── Footer ── */}
          <div className="acm-footer">
            <span className="acm-footer-hint">* Required fields must be filled before saving</span>
            <div className="acm-footer-actions">
              <button className="acm-cancel-btn" type="button" onClick={handleClose}>
                Cancel
              </button>
              <button className="acm-save-btn" type="button" onClick={handleSave}>
                <PlusOutlined style={{ fontSize: 12 }} />
                Save Customer
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AddCustomerModal;