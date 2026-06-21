import React from "react";
import { Form, Input, Select, Switch } from "antd";
import { DeleteOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";

const { Option } = Select;

// ─── Styles ───────────────────────────────────────────────────────────────────
const SectionStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .ccs-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* ── Section header ── */
    .ccs-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 0 14px;
      border-bottom: 1px solid #E5E7EB;
      margin-bottom: 16px;
    }
    .ccs-header-icon {
      width: 28px; height: 28px;
      border-radius: 7px;
      background: #EEF2FF;
      color: #4F46E5;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
    }
    .ccs-header-title {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      flex: 1;
    }
    .ccs-header-add-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border: 1px solid #C7D2FE;
      background: #EEF2FF;
      color: #4F46E5;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all .12s;
    }
    .ccs-header-add-btn:hover {
      background: #E0E7FF;
      border-color: #818CF8;
    }

    /* ── Contact card ── */
    .ccs-card {
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      margin-bottom: 12px;
      overflow: hidden;
      background: #fff;
    }
    .ccs-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 14px;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
    }
    .ccs-card-num {
      width: 20px; height: 20px;
      border-radius: 50%;
      background: #EEF2FF;
      color: #4F46E5;
      font-size: 10px;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ccs-card-title {
      font-size: 12px;
      font-weight: 700;
      color: #374151;
      flex: 1;
    }
    .ccs-remove-btn {
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
    .ccs-remove-btn:hover { background: #FEE2E2; border-color: #DC2626; }
    .ccs-card-body { padding: 16px 14px 4px; }

    /* ── Form grid ── */
    .ccs-grid {
      display: grid;
      gap: 0 14px;
    }
    .ccs-grid-2 { grid-template-columns: 1fr 1fr; }

    /* ── Form overrides ── */
    .ccs-root .ant-form-item {
      margin-bottom: 14px !important;
    }
    .ccs-root .ant-form-item-label > label {
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #374151 !important;
      font-family: 'Inter', sans-serif !important;
    }
    .ccs-root .ant-input,
    .ccs-root .ant-select-selector {
      font-family: 'Inter', sans-serif !important;
      font-size: 13px !important;
      border-radius: 7px !important;
      border-color: #E5E7EB !important;
      background: #FAFAFA !important;
    }
    .ccs-root .ant-input:focus,
    .ccs-root .ant-input:hover,
    .ccs-root .ant-select-focused .ant-select-selector {
      border-color: #4F46E5 !important;
      box-shadow: 0 0 0 3px rgba(79,70,229,.08) !important;
      background: #fff !important;
    }

    /* ── Switch row ── */
    .ccs-switch-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0 12px;
      border-top: 1px solid #F3F4F6;
      margin-top: 4px;
    }
    .ccs-switch-label { font-size: 12px; font-weight: 600; color: #374151; }
    .ccs-switch-desc  { font-size: 11px; color: #9CA3AF; }

    /* ── Add-more button ── */
    .ccs-add-more-btn {
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
      margin-top: 4px;
    }
    .ccs-add-more-btn:hover { background: #EEF2FF; border-color: #818CF8; }

    @media (max-width: 640px) {
      .ccs-grid-2 { grid-template-columns: 1fr; }
    }
  `}</style>
);

// ─── Component ────────────────────────────────────────────────────────────────
const CustomerContactSection: React.FC = () => {
  return (
    <>
      <SectionStyles />
      <div className="ccs-root">
        <Form.List name="contacts">
          {(fields, { add, remove }) => (
            <>
              {/* ── Section header ── */}
              <div className="ccs-header">
                <div className="ccs-header-icon"><UserOutlined /></div>
                <span className="ccs-header-title">Contacts</span>
                <button
                  className="ccs-header-add-btn"
                  type="button"
                  onClick={() => add({ is_primary: false })}
                >
                  <PlusOutlined style={{ fontSize: 11 }} />
                  Add Contact
                </button>
              </div>

              {/* ── Contact cards ── */}
              {fields.map(({ key, name, ...restField }, index) => (
                <div key={key} className="ccs-card">
                  <div className="ccs-card-header">
                    <div className="ccs-card-num">{index + 1}</div>
                    <span className="ccs-card-title">Contact {index + 1}</span>
                    {fields.length > 1 && (
                      <button
                        className="ccs-remove-btn"
                        type="button"
                        onClick={() => remove(name)}
                      >
                        <DeleteOutlined style={{ fontSize: 11 }} />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="ccs-card-body">
                    {/* Name row */}
                    <div className="ccs-grid ccs-grid-2">
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
                      >
                        <Input placeholder="Last name" />
                      </Form.Item>
                    </div>

                    {/* Contact row */}
                    <div className="ccs-grid ccs-grid-2">
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
                      >
                        <Input placeholder="10-digit number" />
                      </Form.Item>
                    </div>

                    {/* Department / Designation */}
                    <div className="ccs-grid ccs-grid-2">
                      <Form.Item
                        {...restField}
                        label="Department"
                        name={[name, "department"]}
                      >
                        <Select placeholder="Select department" allowClear>
                          <Option value="PURCHASE">Purchase</Option>
                          <Option value="FINANCE">Finance</Option>
                          <Option value="ACCOUNTS">Accounts</Option>
                          <Option value="OPERATIONS">Operations</Option>
                          <Option value="ADMIN">Admin</Option>
                          <Option value="MANAGEMENT">Management</Option>
                          <Option value="HR">HR</Option>
                          <Option value="OTHER">Other</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        label="Designation"
                        name={[name, "designation"]}
                      >
                        <Input placeholder="e.g. Purchase Manager" />
                      </Form.Item>
                    </div>

                    {/* Primary switch */}
                    <div className="ccs-switch-row">
                      <Form.Item
                        {...restField}
                        name={[name, "is_primary"]}
                        valuePropName="checked"
                        noStyle
                      >
                        <Switch size="small" />
                      </Form.Item>
                      <div>
                        <div className="ccs-switch-label">Primary contact</div>
                        <div className="ccs-switch-desc">Main point of contact for this customer</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* ── Add more ── */}
              <button
                className="ccs-add-more-btn"
                type="button"
                onClick={() => add({ is_primary: false })}
              >
                <PlusOutlined style={{ fontSize: 11 }} />
                Add another contact
              </button>
            </>
          )}
        </Form.List>
      </div>
    </>
  );
};

export default CustomerContactSection;