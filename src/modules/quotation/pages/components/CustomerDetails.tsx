import React, { useEffect, useMemo, useState } from "react";
import { Card, Form, Input, AutoComplete, Spin, Row, Col, Select } from "antd";
import { indianStates } from "../../../../utils/masterData/stata";
import { useDispatch, useSelector } from "react-redux";
import { getCustomers } from "@/modules/customers/redux/customerActions";
import AddCustomerModal from "@/modules/customers/components/AddCustomerModal";

const { TextArea } = Input;
const { Option } = Select;

/* ─── Shared design tokens (import from shared tokens file in production) ── */
const tokens = {
  navy: "#0F1F3D",
  navyMid: "#1A3560",
  surface: "#F8F9FC",
  surfaceCard: "#FFFFFF",
  border: "#E4E8F0",
  borderFocus: "#3B6FE8",
  accent: "#3B6FE8",
  accentLight: "#EBF0FD",
  text: "#0F1F3D",
  textMuted: "#6B7A99",
  textLight: "#A0ABBF",
  green: "#10B981",
  greenLight: "#D1FAE5",
  radius: "12px",
  radiusSm: "8px",
  shadow: "0 1px 3px rgba(15,31,61,0.06), 0 4px 16px rgba(15,31,61,0.06)",
};

const injectStyles = () => {
  const id = "cd-premium-styles";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    .cd-card .ant-card {
      border-radius: ${tokens.radius} !important;
      border: 1px solid ${tokens.border} !important;
      box-shadow: ${tokens.shadow} !important;
      overflow: hidden;
    }
    .cd-card .ant-card-head {
      background: linear-gradient(135deg, ${tokens.navy} 0%, ${tokens.navyMid} 100%) !important;
      border-bottom: none !important;
      padding: 0 !important;
      min-height: unset !important;
    }
    .cd-card .ant-card-head-title { padding: 0 !important; }
    .cd-card .ant-card-body { padding: 28px 28px 20px !important; }

    .cd-card .ant-form-item-label > label {
      font-size: 11.5px !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px !important;
      text-transform: uppercase !important;
      color: ${tokens.textMuted} !important;
    }
    .cd-card .ant-input,
    .cd-card .ant-input-affix-wrapper,
    .cd-card .ant-select-selector,
    .cd-card .ant-input-number {
      border-radius: ${tokens.radiusSm} !important;
      border-color: ${tokens.border} !important;
      background: ${tokens.surface} !important;
      color: ${tokens.text} !important;
      font-size: 14px !important;
      transition: all 0.18s ease !important;
    }
    .cd-card .ant-input:focus,
    .cd-card .ant-select-focused .ant-select-selector {
      border-color: ${tokens.borderFocus} !important;
      box-shadow: 0 0 0 3px rgba(59,111,232,0.10) !important;
      background: #fff !important;
    }
    .cd-card textarea.ant-input { resize: none !important; }

    /* Search box override in header */
    .cd-header-search .ant-select-selector,
    .cd-header-search .ant-input {
      border-radius: 8px !important;
      border-color: rgba(255,255,255,0.2) !important;
      background: rgba(255,255,255,0.1) !important;
      color: #fff !important;
      backdrop-filter: blur(4px);
    }
    .cd-header-search .ant-input::placeholder,
    .cd-header-search .ant-select-selection-placeholder { color: rgba(255,255,255,0.5) !important; }
    .cd-header-search .ant-input { color: #fff !important; }

    /* Customer type badge */
    .cd-type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .cd-type-badge.business {
      background: ${tokens.accentLight};
      color: ${tokens.accent};
      border: 1px solid #C7D8FA;
    }
    .cd-type-badge.individual {
      background: ${tokens.greenLight};
      color: ${tokens.green};
      border: 1px solid #A7F3D0;
    }

    .cd-section-divider {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 20px 0 16px;
    }
    .cd-section-divider span {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: ${tokens.textLight};
      white-space: nowrap;
    }
    .cd-section-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: ${tokens.border};
    }

    @media (max-width: 575px) {
      .cd-card .ant-card-body { padding: 20px 16px 14px !important; }
      .cd-card-header-wrap { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
      .cd-header-search { width: 100% !important; }
    }
  `;
  document.head.appendChild(s);
};
injectStyles();

const SectionDivider = ({ label }: { label: string }) => (
  <div className="cd-section-divider"><span>{label}</span></div>
);

const CustomerDetails = () => {
  const form = Form.useFormInstance();
  const [searchValue, setSearchValue] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<any>(null);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<any>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state: any) => state.customers);
  const customers = list || [];
  const [openCustomerModal, setOpenCustomerModal] = useState(false);
  const customerId = Form.useWatch("customerId", form);

  useEffect(() => {
    if (!customerId) return;
    const customer = customers.find((item: any) => Number(item.id) === Number(customerId));
    if (!customer) return;
    setSelectedCustomer(customer);
    const contact = customer.contacts?.find((c: any) => Number(c.id) === Number(form.getFieldValue("contactPersonId"))) || customer.contacts?.[0];
    const billing = customer.addresses?.find((a: any) => Number(a.id) === Number(form.getFieldValue("billingAddressId"))) || customer.addresses?.[0];
    const shipping = customer.addresses?.find((a: any) => Number(a.id) === Number(form.getFieldValue("shippingAddressId"))) || customer.addresses?.[0];
    setSelectedContact(contact);
    setSelectedBillingAddress(billing);
    setSelectedShippingAddress(shipping);
    setSearchValue(customer.display_name);
  }, [customerId, customers]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchValue), 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    if (!debouncedSearch?.trim()) return;
    dispatch(getCustomers({ search: debouncedSearch, limit: 10, page: 1 }));
  }, [debouncedSearch, dispatch]);

  const customerOptions = useMemo(() => {
    if (!debouncedSearch?.trim()) return [];
    const mapped = customers.map((customer: any) => ({
      label: (
        <div style={{ padding: "2px 0" }}>
          <div style={{ fontWeight: 600, color: tokens.text }}>{customer.display_name}</div>
          <div style={{ fontSize: 12, color: tokens.textMuted, marginTop: 1 }}>
            <span style={{ background: customer.customer_type === "BUSINESS" ? tokens.accentLight : tokens.greenLight, color: customer.customer_type === "BUSINESS" ? tokens.accent : tokens.green, padding: "1px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{customer.customer_type}</span>
            {customer.company_name && <span style={{ marginLeft: 6 }}>{customer.company_name}</span>}
          </div>
        </div>
      ),
      value: customer.display_name,
      customer,
    }));
    if (debouncedSearch && !loading && customers.length === 0) {
      mapped.push({
        label: <div style={{ color: tokens.accent, fontWeight: 600 }}>+ Create "{debouncedSearch}"</div>,
        value: "__create_customer__",
      });
    }
    return mapped;
  }, [customers, debouncedSearch]);

  const handleCustomerSearch = (value: string) => {
    setSearchValue(value);
    form.setFieldsValue({ customerId: undefined });
  };

  const handleCustomerSelect = (value: string, option: any) => {
    if (value === "__create_customer__") { setOpenCustomerModal(true); return; }
    const customer = option.customer;
    if (!customer) return;
    setSelectedCustomer(customer);
    const primaryContact = customer.contacts?.find((c: any) => c.is_primary === 1) || customer.contacts?.[0];
    const billingAddress = customer.addresses?.find((a: any) => a.address_type === "BILLING") || customer.addresses?.find((a: any) => a.is_primary === 1) || customer.addresses?.[0];
    const shippingAddress = customer.addresses?.find((a: any) => a.address_type === "SHIPPING") || billingAddress;
    setSelectedContact(primaryContact);
    setSelectedBillingAddress(billingAddress);
    setSelectedShippingAddress(shippingAddress);
    form.setFieldsValue({
      customerId: customer.id, customerType: customer.customer_type,
      customerName: customer.display_name, companyName: customer.company_name,
      customerGSTN: customer.gst_number || billingAddress?.gst_number,
      customerEmail: primaryContact?.email, customerPhone: primaryContact?.phone,
      contactPersonId: primaryContact?.id, billingAddressId: billingAddress?.id, shippingAddressId: shippingAddress?.id,
      billingAddress: [billingAddress?.address_line_1, billingAddress?.address_line_2, billingAddress?.city, billingAddress?.state, billingAddress?.country, billingAddress?.postal_code].filter(Boolean).join(", "),
      shippingAddress: [shippingAddress?.address_line_1, shippingAddress?.address_line_2, shippingAddress?.city, shippingAddress?.state, shippingAddress?.country, shippingAddress?.postal_code].filter(Boolean).join(", "),
      billingAddressSnapshot: JSON.stringify(billingAddress), shippingAddressSnapshot: JSON.stringify(shippingAddress),
    });
    setSearchValue(customer.display_name);
  };

  const isBusiness = selectedCustomer?.customer_type === "BUSINESS";

  const cardTitle = (
    <div className="cd-card-header-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Customer Details</div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11.5, marginTop: 2 }}>Billing, shipping & contact info</div>
        </div>
      </div>
      <AutoComplete
        className="cd-header-search"
        style={{ width: 280, flexShrink: 0 }}
        options={customerOptions}
        onSearch={handleCustomerSearch}
        onSelect={handleCustomerSelect}
        value={searchValue}
        notFoundContent={loading ? <Spin size="small" /> : <span style={{ color: tokens.textMuted, fontSize: 13 }}>No customers found</span>}
        filterOption={false}
      >
        <Input
          placeholder="Search customer…"
          prefix={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>}
        />
      </AutoComplete>
    </div>
  );

  return (
    <>
      <div className="cd-card">
        <Card title={cardTitle} bordered={false}>
          <Form.Item name="customerId" hidden><Input /></Form.Item>
          <Form.Item name="contactPersonId" hidden><Input /></Form.Item>
          <Form.Item name="customerType" hidden><Input /></Form.Item>
          <Form.Item name="billingAddressSnapshot" hidden><Input /></Form.Item>
          <Form.Item name="shippingAddressSnapshot" hidden><Input /></Form.Item>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={isBusiness ? 12 : 24}>
              <Form.Item label="Display Name" name="customerName">
                <Input placeholder="Customer name" prefix={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tokens.textLight} strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                } />
              </Form.Item>
            </Col>
            {isBusiness && (
              <Col xs={24} md={12}>
                <Form.Item label="Company Name" name="companyName">
                  <Input placeholder="Company name" prefix={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tokens.textLight} strokeWidth="1.8"><path d="M3 21h18M9 8h1m5 0h1M9 12h1m5 0h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/></svg>
                  } />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Form.Item label="Contact Person" name="contactPersonId" rules={[{ required: true }]}>
            <Select onChange={(id) => {
              const contact = selectedCustomer?.contacts?.find((c: any) => c.id === id);
              setSelectedContact(contact);
              form.setFieldsValue({ customerEmail: contact?.email, customerPhone: contact?.phone, contactPersonId: contact?.id });
            }} placeholder="Select contact person">
              {selectedCustomer?.contacts?.map((c: any) => (
                <Option key={c.id} value={c.id}>{c.first_name} {c.last_name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Email" name="customerEmail">
                <Input type="email" placeholder="customer@email.com" prefix={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tokens.textLight} strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                } />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Phone" name="customerPhone">
                <Input placeholder="+91 XXXXX XXXXX" prefix={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tokens.textLight} strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 10.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
                } />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Place of Supply" name="placeOfOrder">
                <Select showSearch placeholder="Select state" optionFilterProp="children"
                  filterOption={(input, option) => (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())}>
                  {indianStates.map((state) => <Option key={state} value={state}>{state}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="GSTN / UIN" name="customerGSTN">
                <Input placeholder="22AAAAA0000A1Z5" />
              </Form.Item>
            </Col>
          </Row>

          <SectionDivider label="Billing Address" />

          <Form.Item label="Select Billing Address" name="billingAddressId">
            <Select placeholder="Choose billing address" onChange={(id) => {
              const address = selectedCustomer?.addresses?.find((a: any) => a.id === id);
              setSelectedBillingAddress(address);
              form.setFieldsValue({
                billingAddress: [address?.address_line_1, address?.address_line_2, address?.city, address?.state, address?.country, address?.postal_code].filter(Boolean).join(", "),
                billingAddressSnapshot: JSON.stringify(address),
                customerGSTN: address?.gst_number || selectedCustomer?.gst_number,
              });
            }}>
              {selectedCustomer?.addresses?.filter((a: any) => ["BILLING", "OFFICE", "BRANCH"].includes(a.address_type)).map((a: any) => (
                <Option key={a.id} value={a.id}>{a.label || a.address_type}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Billing Address Details" name="billingAddress">
            <TextArea rows={2} readOnly />
          </Form.Item>

          <SectionDivider label="Shipping Address" />

          <Form.Item label="Select Shipping Address" name="shippingAddressId">
            <Select placeholder="Choose shipping address" onChange={(id) => {
              const address = selectedCustomer?.addresses?.find((a: any) => a.id === id);
              setSelectedShippingAddress(address);
              form.setFieldsValue({
                shippingAddress: [address?.address_line_1, address?.address_line_2, address?.city, address?.state, address?.country, address?.postal_code].filter(Boolean).join(", "),
                shippingAddressSnapshot: JSON.stringify(address),
              });
            }}>
              {selectedCustomer?.addresses?.filter((a: any) => ["SHIPPING", "WAREHOUSE", "FACTORY"].includes(a.address_type)).map((a: any) => (
                <Option key={a.id} value={a.id}>{a.label || a.address_type}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Shipping Address Details" name="shippingAddress">
            <TextArea rows={2} readOnly />
          </Form.Item>
        </Card>
      </div>
      <AddCustomerModal open={openCustomerModal} onClose={() => setOpenCustomerModal(false)} />
    </>
  );
};

export default CustomerDetails;