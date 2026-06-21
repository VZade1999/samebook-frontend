import React, { useEffect } from "react";
import { Form, Input, Modal, Select, Switch, message } from "antd";
import { DeleteOutlined, PlusOutlined, LockOutlined, BankOutlined, UserOutlined, EditOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { updateCustomer } from "../redux/customerActions";
import { indianStates } from "@/utils/masterData/stata";

const { Option } = Select;
const { TextArea } = Input;

// ─── Global Styles ────────────────────────────────────────────────────────────
const ModalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .ecm-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #111827;
    }

    /* ── Modal overrides ── */
    .ecm-modal .ant-modal-content {
      border-radius: 16px !important;
      overflow: hidden !important;
      padding: 0 !important;
      box-shadow: 0 20px 60px rgba(0,0,0,.22) !important;
    }
    .ecm-modal .ant-modal-header { display: none !important; }
    .ecm-modal .ant-modal-body   { padding: 0 !important; }
    .ecm-modal .ant-modal-close  { display: none !important; }

    /* ── Header ── */
    .ecm-header {
      background: #1E1B4B;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .ecm-header::after {
      content: '';
      position: absolute;
      bottom: -1px; left: 0; right: 0;
      height: 16px;
      background: #fff;
      border-radius: 16px 16px 0 0;
    }
    .ecm-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .ecm-header-left {
      display: flex; align-items: center; gap: 12px;
      position: relative; z-index: 1;
    }
    .ecm-header-icon {
      width: 36px; height: 36px;
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 15px;
    }
    .ecm-header-title  { font-size: 17px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
    .ecm-header-sub    { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 2px; }
    .ecm-close-btn {
      position: relative; z-index: 1;
      width: 32px; height: 32px; border-radius: 8px; border: none;
      background: rgba(255,255,255,0.12); color: #fff; font-size: 16px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .15s; font-family: 'Inter', sans-serif;
    }
    .ecm-close-btn:hover { background: rgba(255,255,255,0.22); }

    /* ── Body ── */
    .ecm-body {
      padding: 20px 24px 0;
      max-height: 68vh;
      overflow-y: auto;
    }
    .ecm-body::-webkit-scrollbar { width: 5px; }
    .ecm-body::-webkit-scrollbar-track { background: transparent; }
    .ecm-body::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }

    /* ── Section label ── */
    .ecm-section {
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.6px;
      text-transform: uppercase; color: #6B7280;
      margin: 20px 0 12px;
    }
    .ecm-section::before {
      content: ''; flex: none; width: 3px; height: 14px;
      background: #4F46E5; border-radius: 2px;
    }
    .ecm-section::after {
      content: ''; flex: 1; height: 1px; background: #E5E7EB;
    }

    /* ── Customer type pills ── */
    .ecm-type-row  { display: flex; gap: 10px; margin-bottom: 14px; }
    .ecm-type-pill {
      flex: 1; display: flex; align-items: center; gap: 10px;
      padding: 11px 14px; border: 2px solid #E5E7EB;
      border-radius: 10px; cursor: not-allowed;
      background: #fff; opacity: 0.8;
    }
    .ecm-type-pill.active.business  { border-color: #1D4ED8; background: #EFF6FF; opacity: 1; }
    .ecm-type-pill.active.individual { border-color: #059669; background: #ECFDF5; opacity: 1; }
    .ecm-type-icon {
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; font-size: 14px;
    }
    .business  .ecm-type-icon { background: #DBEAFE; color: #1D4ED8; }
    .individual .ecm-type-icon { background: #D1FAE5; color: #059669; }
    .ecm-type-pill:not(.active) .ecm-type-icon { background: #F3F4F6; color: #9CA3AF; }
    .ecm-type-name { font-size: 13px; font-weight: 700; color: #111827; }
    .ecm-type-sub  { font-size: 11px; color: #6B7280; margin-top: 1px; }
    .ecm-locked {
      margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
      color: #9CA3AF; background: #F3F4F6;
      padding: 2px 7px; border-radius: 4px;
      display: flex; align-items: center; gap: 4px;
    }

    /* ── Grid helpers ── */
    .ecm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .ecm-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .ecm-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }

    /* ── Ant Design field overrides ── */
    .ecm-root .ant-form-item         { margin-bottom: 0 !important; }
    .ecm-root .ant-form-item-label   { padding-bottom: 4px !important; }
    .ecm-root .ant-form-item-label > label {
      font-size: 11px !important; font-weight: 600 !important;
      letter-spacing: 0.3px !important; color: #6B7280 !important;
      text-transform: uppercase !important; height: auto !important;
    }
    .ecm-root .ant-input,
    .ecm-root .ant-select-selector,
    .ecm-root .ant-input-affix-wrapper {
      border-radius: 8px !important;
      font-size: 13px !important;
      font-family: 'Inter', sans-serif !important;
      background: #FAFAFA !important;
      border-color: #E5E7EB !important;
    }
    .ecm-root .ant-input:focus,
    .ecm-root .ant-select-focused .ant-select-selector {
      border-color: #4F46E5 !important;
      box-shadow: 0 0 0 3px rgba(79,70,229,.1) !important;
      background: #fff !important;
    }
    .ecm-root .ant-input[disabled],
    .ecm-root .ant-select-disabled .ant-select-selector {
      background: #F3F4F6 !important;
      color: #9CA3AF !important;
    }
    .ecm-root textarea.ant-input { min-height: 80px !important; resize: vertical !important; }

    /* ── Contact / Address cards ── */
    .ecm-card {
      background: #FAFBFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .ecm-card-head {
      padding: 11px 16px;
      background: #fff;
      border-bottom: 1px solid #E5E7EB;
      display: flex; align-items: center; justify-content: space-between;
    }
    .ecm-card-head-left { display: flex; align-items: center; gap: 8px; }
    .ecm-card-num {
      width: 22px; height: 22px; border-radius: 6px;
      background: #EEF2FF; color: #4F46E5;
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .ecm-card-num.addr { background: #ECFDF5; color: #059669; }
    .ecm-card-title  { font-size: 13px; font-weight: 600; color: #111827; }
    .ecm-primary-badge {
      font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
      padding: 2px 7px; border-radius: 99px;
      background: #D1FAE5; color: #065F46;
    }
    .ecm-card-body {
      padding: 14px 16px;
      display: flex; flex-direction: column; gap: 10px;
    }

    /* ── Switch row ── */
    .ecm-switch-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 12px;
      background: #fff; border: 1px solid #E5E7EB; border-radius: 8px;
    }
    .ecm-switch-label { font-size: 12px; font-weight: 600; color: #111827; }
    .ecm-switch-sub   { font-size: 11px; color: #6B7280; margin-top: 1px; }

    /* ── Remove button ── */
    .ecm-remove-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 10px; border: 1px solid #FCA5A5;
      border-radius: 6px; background: #FFF5F5; color: #DC2626;
      font-size: 12px; font-weight: 500;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .12s;
    }
    .ecm-remove-btn:hover { background: #FEE2E2; border-color: #F87171; }

    /* ── Add button ── */
    .ecm-add-btn {
      display: flex; align-items: center; justify-content: center; gap: 7px;
      width: 100%; padding: 9px 16px;
      border: 1.5px dashed #C7D2FE; border-radius: 8px;
      background: #EEF2FF; color: #4F46E5;
      font-size: 13px; font-weight: 600;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .15s;
    }
    .ecm-add-btn:hover { background: #E0E7FF; border-color: #4F46E5; }

    /* ── Footer ── */
    .ecm-footer {
      padding: 16px 24px;
      border-top: 1px solid #E5E7EB;
      display: flex; align-items: center; justify-content: space-between;
      background: #fff;
      position: sticky; bottom: 0;
    }
    .ecm-footer-note { font-size: 11px; color: #6B7280; }
    .ecm-footer-note span { color: #4F46E5; font-weight: 700; }
    .ecm-footer-btns { display: flex; gap: 10px; }
    .ecm-cancel-btn {
      padding: 9px 20px; border: 1px solid #E5E7EB; border-radius: 8px;
      background: #fff; color: #111827; font-size: 13px; font-weight: 600;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .15s;
    }
    .ecm-cancel-btn:hover { background: #F3F4F6; }
    .ecm-save-btn {
      padding: 9px 22px; border: none; border-radius: 8px;
      background: #4F46E5; color: #fff; font-size: 13px; font-weight: 700;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .15s;
      display: flex; align-items: center; gap: 7px;
    }
    .ecm-save-btn:hover { background: #4338CA; transform: translateY(-1px); }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .ecm-grid-2, .ecm-grid-3, .ecm-grid-4 { grid-template-columns: 1fr !important; }
      .ecm-type-row { flex-direction: column; }
      .ecm-body { padding: 16px 16px 0; }
      .ecm-header, .ecm-footer { padding: 16px; }
    }
  `}</style>
);

interface EditCustomerModalProps {
  open: boolean;
  onClose: () => void;
  customer: any;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ open, onClose, customer }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  // ─── Watch customer type ───────────────────────────────────────────────────
  const customerType = Form.useWatch("customer_type", form) || "INDIVIDUAL";

  // ─── Prefill form ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && customer) {
      form.setFieldsValue({
        customer_type: customer.customer_type,
        display_name:  customer.display_name,
        company_name:  customer.company_name,
        gst_number:    customer.gst_number,
        website:       customer.website,
        industry:      customer.industry,
        notes:         customer.notes,
        contacts: customer.contacts?.length
          ? customer.contacts
          : [{ is_primary: true }],
        addresses: customer.addresses?.length
          ? customer.addresses
          : [{ address_type: "BILLING", is_primary: true }],
      });
    }
  }, [open, customer, form]);

  // ─── Close ─────────────────────────────────────────────────────────────────
  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  // ─── Update ────────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();

      if (values.customer_type === "BUSINESS") {
        const hasValidContact = (values.contacts || []).some(
          (c: any) => c.first_name && c.last_name && c.phone,
        );
        if (!hasValidContact)
          return message.error(
            "Business customers must have at least one contact with first name, last name, and phone number",
          );
      }

      const primaryContacts = values.contacts.filter((c: any) => c.is_primary);
      if (primaryContacts.length > 1)
        return message.error("Only one primary contact allowed");

      const primaryAddresses = values.addresses.filter((a: any) => a.is_primary);
      if (primaryAddresses.length > 1)
        return message.error("Only one primary address allowed");

      if (customerType === "INDIVIDUAL" && values.addresses.length > 2)
        return message.error("Individual customer can only have 2 addresses");

      dispatch(updateCustomer({ id: customer.id, ...values }));
      handleClose();
    } catch (error) {
      console.log("Validation failed", error);
    }
  };

  const isBusiness = customerType === "BUSINESS";

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
        className="ecm-modal"
      >
        <div className="ecm-root">

          {/* ── Header ── */}
          <div className="ecm-header">
            <div className="ecm-header-noise" />
            <div className="ecm-header-left">
              <div className="ecm-header-icon">
                <EditOutlined />
              </div>
              <div>
                <div className="ecm-header-title">Edit Customer</div>
                <div className="ecm-header-sub">
                  {customer?.display_name || "Update customer details"}
                </div>
              </div>
            </div>
            <button className="ecm-close-btn" onClick={handleClose}>✕</button>
          </div>

          {/* ── Body ── */}
          <div className="ecm-body">
            <Form form={form} layout="vertical">

              {/* ── Customer Details ── */}
              <div className="ecm-section">Customer Details</div>

              {/* Type pills (read-only visual) */}
              <div className="ecm-type-row">
                <div className={`ecm-type-pill ${isBusiness ? "active business" : ""}`}>
                  <div className="ecm-type-icon"><BankOutlined /></div>
                  <div>
                    <div className="ecm-type-name">Business</div>
                    <div className="ecm-type-sub">Company / Organisation</div>
                  </div>
                  <span className="ecm-locked"><LockOutlined style={{ fontSize: 10 }} /> Locked</span>
                </div>
                <div className={`ecm-type-pill ${!isBusiness ? "active individual" : ""}`}>
                  <div className="ecm-type-icon"><UserOutlined /></div>
                  <div>
                    <div className="ecm-type-name">Individual</div>
                    <div className="ecm-type-sub">Personal customer</div>
                  </div>
                  <span className="ecm-locked"><LockOutlined style={{ fontSize: 10 }} /> Locked</span>
                </div>
              </div>

              {/* Hidden field to keep customer_type in form values */}
              <Form.Item name="customer_type" hidden>
                <Input />
              </Form.Item>

              <div className="ecm-grid-2" style={{ marginBottom: 12 }}>
                <Form.Item
                  label="Display Name"
                  name="display_name"
                  rules={[{ required: true, message: "Display name is required" }]}
                >
                  <Input placeholder="Enter display name" />
                </Form.Item>

                {isBusiness && (
                  <Form.Item
                    label="Company Name"
                    name="company_name"
                    rules={[{ required: true, message: "Company name is required for business customers" }]}
                  >
                    <Input placeholder="Company name" />
                  </Form.Item>
                )}
              </div>

              {/* ── Business Details ── */}
              {isBusiness && (
                <>
                  <div className="ecm-section">Business Details</div>
                  <div className="ecm-grid-3" style={{ marginBottom: 12 }}>
                    <Form.Item label="GST Number" name="gst_number">
                      <Input placeholder="GST Number" style={{ fontFamily: "'Courier New', monospace", letterSpacing: "0.5px" }} />
                    </Form.Item>
                    <Form.Item label="Website" name="website">
                      <Input placeholder="https://" />
                    </Form.Item>
                    <Form.Item label="Industry" name="industry">
                      <Input placeholder="e.g. Information Technology" />
                    </Form.Item>
                  </div>
                </>
              )}

              {/* ── Contacts ── */}
              <div className="ecm-section">Contacts</div>

              <Form.List name="contacts">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <div className="ecm-card" key={key}>
                        <div className="ecm-card-head">
                          <div className="ecm-card-head-left">
                            <div className="ecm-card-num">{index + 1}</div>
                            <span className="ecm-card-title">Contact {index + 1}</span>
                            {index === 0 && (
                              <span className="ecm-primary-badge">Primary</span>
                            )}
                          </div>
                          {isBusiness && fields.length > 1 && (
                            <button className="ecm-remove-btn" onClick={() => remove(name)}>
                              <DeleteOutlined /> Remove
                            </button>
                          )}
                        </div>

                        <div className="ecm-card-body">
                          <div className="ecm-grid-2">
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
                          </div>

                          <div className="ecm-grid-2">
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
                                { required: true, message: "Phone number is required" },
                                {
                                  pattern: /^[6-9]\d{9}$/,
                                  message: "Enter a valid 10-digit Indian phone number",
                                },
                              ]}
                            >
                              <Input placeholder="10-digit phone number" />
                            </Form.Item>
                          </div>

                          {isBusiness && (
                            <div className="ecm-grid-2">
                              <Form.Item {...restField} label="Department" name={[name, "department"]}>
                                <Input placeholder="e.g. Engineering" />
                              </Form.Item>
                              <Form.Item {...restField} label="Designation" name={[name, "designation"]}>
                                <Input placeholder="e.g. CTO" />
                              </Form.Item>
                            </div>
                          )}

                          <div className="ecm-switch-row">
                            <div>
                              <div className="ecm-switch-label">Primary Contact</div>
                              <div className="ecm-switch-sub">Mark as the main point of contact</div>
                            </div>
                            <Form.Item
                              {...restField}
                              name={[name, "is_primary"]}
                              valuePropName="checked"
                              style={{ margin: 0 }}
                            >
                              <Switch />
                            </Form.Item>
                          </div>
                        </div>
                      </div>
                    ))}

                    {isBusiness && (
                      <button
                        className="ecm-add-btn"
                        onClick={() => add({ is_primary: false })}
                        style={{ marginBottom: 4 }}
                      >
                        <PlusOutlined /> Add Another Contact
                      </button>
                    )}
                  </>
                )}
              </Form.List>

              {/* ── Addresses ── */}
              <div className="ecm-section">Addresses</div>

              <Form.List name="addresses">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <div className="ecm-card" key={key}>
                        <div className="ecm-card-head">
                          <div className="ecm-card-head-left">
                            <div className="ecm-card-num addr">{index + 1}</div>
                            <span className="ecm-card-title">Address {index + 1}</span>
                            {index === 0 && (
                              <span className="ecm-primary-badge">Primary</span>
                            )}
                          </div>
                          {fields.length > 1 && (
                            <button className="ecm-remove-btn" onClick={() => remove(name)}>
                              <DeleteOutlined /> Remove
                            </button>
                          )}
                        </div>

                        <div className="ecm-card-body">
                          <div className="ecm-grid-3">
                            <Form.Item {...restField} label="Address Type" name={[name, "address_type"]}>
                              <Select placeholder="Select type">
                                <Option value="BILLING">Billing</Option>
                                <Option value="SHIPPING">Shipping</Option>
                                {isBusiness && (
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
                            <Form.Item {...restField} label="Label" name={[name, "label"]}>
                              <Input placeholder="e.g. Pune Office" />
                            </Form.Item>
                            <Form.Item {...restField} label="GST Number" name={[name, "gst_number"]}>
                              <Input
                                placeholder="GST Number"
                                style={{ fontFamily: "'Courier New', monospace", letterSpacing: "0.5px" }}
                              />
                            </Form.Item>
                          </div>

                          <Form.Item {...restField} label="Address Line 1" name={[name, "address_line_1"]}>
                            <Input placeholder="Street / Building / Plot" />
                          </Form.Item>
                          <Form.Item {...restField} label="Address Line 2" name={[name, "address_line_2"]}>
                            <Input placeholder="Area, Landmark" />
                          </Form.Item>

                          <div className="ecm-grid-4">
                            <Form.Item {...restField} label="City" name={[name, "city"]}>
                              <Input placeholder="City" />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              label="State"
                              name={[name, "state"]}
                              rules={[{ required: true, message: "State is required" }]}
                            >
                              <Select
                                showSearch
                                placeholder="Select State"
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                  (option?.children as unknown as string)
                                    ?.toLowerCase()
                                    .includes(input.toLowerCase())
                                }
                              >
                                {indianStates.map((state) => (
                                  <Option key={state} value={state}>{state}</Option>
                                ))}
                              </Select>
                            </Form.Item>
                            <Form.Item {...restField} label="Country" name={[name, "country"]}>
                              <Input placeholder="Country" />
                            </Form.Item>
                            <Form.Item {...restField} label="Postal Code" name={[name, "postal_code"]}>
                              <Input placeholder="6-digit code" />
                            </Form.Item>
                          </div>

                          <div className="ecm-switch-row">
                            <div>
                              <div className="ecm-switch-label">Primary Address</div>
                              <div className="ecm-switch-sub">Use as the default billing address</div>
                            </div>
                            <Form.Item
                              {...restField}
                              name={[name, "is_primary"]}
                              valuePropName="checked"
                              style={{ margin: 0 }}
                            >
                              <Switch />
                            </Form.Item>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      className="ecm-add-btn"
                      style={{ marginBottom: 4 }}
                      onClick={() => {
                        if (customerType === "INDIVIDUAL" && fields.length >= 2)
                          return message.error(
                            "Individual customers can only have Billing and Shipping addresses",
                          );
                        add({
                          address_type: fields.length === 0 ? "BILLING" : "SHIPPING",
                          is_primary: false,
                        });
                      }}
                    >
                      <PlusOutlined /> Add Address
                    </button>
                  </>
                )}
              </Form.List>

              {/* ── Notes ── */}
              <div className="ecm-section">Notes</div>
              <Form.Item name="notes" style={{ marginBottom: 20 }}>
                <TextArea rows={3} placeholder="Add any notes about this customer…" />
              </Form.Item>
            </Form>
          </div>

          {/* ── Footer ── */}
          <div className="ecm-footer">
            <div className="ecm-footer-note">
              <span>*</span> Required fields
            </div>
            <div className="ecm-footer-btns">
              <button className="ecm-cancel-btn" onClick={handleClose}>Cancel</button>
              <button className="ecm-save-btn" onClick={handleUpdate}>
                ✓ Update Customer
              </button>
            </div>
          </div>

        </div>
      </Modal>
    </>
  );
};

// Missing import added at top — add this with your other icon imports:
// import { EditOutlined } from "@ant-design/icons";

export default EditCustomerModal;