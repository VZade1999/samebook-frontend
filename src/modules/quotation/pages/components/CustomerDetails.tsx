import { useEffect, useMemo, useState } from "react";
import { Form, Input, AutoComplete, Spin, Row, Col, Select } from "antd";
import {
  EnvironmentOutlined,
  InfoCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { indianStates } from "../../../../utils/masterData/stata";
import { useDispatch, useSelector } from "react-redux";
import { getCustomers } from "@/modules/customers/redux/customerActions";
import AddCustomerModal from "@/modules/customers/components/AddCustomerModal";
import FormSection from "./FormSection";
import { Avatar } from "../view/shared";

const { TextArea } = Input;
const { Option } = Select;

const ADDRESS_TYPES = ["BILLING", "OFFICE", "BRANCH", "SHIPPING", "WAREHOUSE", "FACTORY"];

const joinAddress = (a: any) =>
  [a?.address_line_1, a?.address_line_2, a?.city, a?.state, a?.country, a?.postal_code].filter(Boolean).join(", ");

/**
 * Quotation form fields for a customer (primary contact, billing + shipping
 * address). Shared by picking a customer here and by opening a new quotation
 * for a customer from elsewhere (e.g. a CRM lead).
 */
export const customerFormFields = (customer: any) => {
  const primaryContact = customer.contacts?.find((c: any) => Number(c.is_primary) === 1) || customer.contacts?.[0];
  const billingAddress = customer.addresses?.find((a: any) => a.address_type === "BILLING") || customer.addresses?.find((a: any) => Number(a.is_primary) === 1) || customer.addresses?.[0];
  const shippingAddress = customer.addresses?.find((a: any) => a.address_type === "SHIPPING") || billingAddress;
  return {
    primaryContact,
    billingAddress,
    shippingAddress,
    fields: {
      customerId: customer.id, customerType: customer.customer_type,
      customerName: customer.display_name, companyName: customer.company_name,
      customerGSTN: customer.gst_number || billingAddress?.gst_number,
      customerEmail: primaryContact?.email, customerPhone: primaryContact?.phone,
      placeOfOrder: billingAddress?.state,
      contactPersonId: primaryContact?.id, billingAddressId: billingAddress?.id, shippingAddressId: shippingAddress?.id,
      billingAddress: joinAddress(billingAddress),
      shippingAddress: joinAddress(shippingAddress),
      billingAddressSnapshot: JSON.stringify(billingAddress), shippingAddressSnapshot: JSON.stringify(shippingAddress),
    },
  };
};

const CustomerDetails = () => {
  const form = Form.useFormInstance();
  const [searchValue, setSearchValue] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state: any) => state.customers);
  const customers = list || [];
  const [openCustomerModal, setOpenCustomerModal] = useState(false);
  const customerId = Form.useWatch("customerId", form);
  const pickedName = Form.useWatch("customerName", form);
  const pickedCompany = Form.useWatch("companyName", form);
  const pickedType = Form.useWatch("customerType", form);
  const pickedGst = Form.useWatch("customerGSTN", form);

  useEffect(() => {
    if (!customerId) return;
    const customer = customers.find((item: any) => Number(item.id) === Number(customerId));
    if (!customer) return;
    setSelectedCustomer(customer);
    setSearchValue(customer.display_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const mapped: any[] = customers.map((customer: any) => ({
      label: (
        <div className="qf-opt">
          <b>{customer.display_name}</b>
          <small>
            <span className={`qf-tag ${customer.customer_type === "BUSINESS" ? "" : "individual"}`}>
              {customer.customer_type === "BUSINESS" ? "Business" : "Individual"}
            </span>
            {customer.company_name && <span>{customer.company_name}</span>}
          </small>
        </div>
      ),
      value: customer.display_name,
      customer,
    }));
    if (debouncedSearch && !loading && customers.length === 0) {
      mapped.push({
        label: <span className="qf-opt-new">+ Create “{debouncedSearch}”</span>,
        value: "__create_customer__",
      });
    }
    return mapped;
  }, [customers, debouncedSearch, loading]);

  const handleCustomerSearch = (value: string) => {
    setSearchValue(value);
    form.setFieldsValue({ customerId: undefined });
  };

  const handleCustomerSelect = (value: string, option: any) => {
    if (value === "__create_customer__") {
      setOpenCustomerModal(true);
      return;
    }
    const customer = option.customer;
    if (!customer) return;
    setSelectedCustomer(customer);
    form.setFieldsValue(customerFormFields(customer).fields);
    setSearchValue(customer.display_name);
  };

  const isBusiness = (selectedCustomer?.customer_type || pickedType) === "BUSINESS";
  const addressOptions = (selectedCustomer?.addresses || []).filter((a: any) => ADDRESS_TYPES.includes(a.address_type));

  const pickAddress = (kind: "billing" | "shipping", id: any) => {
    const address = selectedCustomer?.addresses?.find((a: any) => a.id === id);
    form.setFieldsValue({
      [`${kind}Address`]: joinAddress(address),
      [`${kind}AddressSnapshot`]: JSON.stringify(address),
      customerGSTN: address?.gst_number || selectedCustomer?.gst_number,
    });
  };

  return (
    <>
      <FormSection id="qf-customer" step={1} icon={<TeamOutlined />} title="Customer" sub="Who is this quotation for?">
        <Form.Item name="customerId" hidden><Input /></Form.Item>
        <Form.Item name="customerType" hidden><Input /></Form.Item>
        <Form.Item name="billingAddressSnapshot" hidden><Input /></Form.Item>
        <Form.Item name="shippingAddressSnapshot" hidden><Input /></Form.Item>

        <div className="qf-find">
          <AutoComplete
            options={customerOptions}
            onSearch={handleCustomerSearch}
            onSelect={handleCustomerSelect}
            value={searchValue}
            notFoundContent={loading ? <Spin size="small" /> : debouncedSearch ? "No customers found" : "Type a name to search"}
            filterOption={false}
          >
            <Input placeholder="Search customers by name…" prefix={<SearchOutlined />} aria-label="Search customers" />
          </AutoComplete>
          <button type="button" className="qp-btn ghost" onClick={() => setOpenCustomerModal(true)}>
            <UserAddOutlined /> New
          </button>
        </div>

        {customerId || pickedName ? (
          <div className="qf-picked">
            <Avatar name={pickedName} seed={customerId || pickedName} size={42} />
            <div>
              <b>{pickedName || "Customer"}</b>
              <small>
                {[pickedCompany, isBusiness ? "Business" : "Individual", pickedGst ? `GSTIN ${pickedGst}` : null].filter(Boolean).join(" · ")}
              </small>
            </div>
          </div>
        ) : (
          <div className="qf-pick-hint">
            <InfoCircleOutlined /> Search for a customer — their contact person and addresses fill in automatically.
          </div>
        )}

        <Row gutter={[14, 0]}>
          <Col xs={24} md={isBusiness ? 12 : 24}>
            <Form.Item label="Display name" name="customerName">
              <Input placeholder="Customer name" prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
          {isBusiness && (
            <Col xs={24} md={12}>
              <Form.Item label="Company name" name="companyName">
                <Input placeholder="Company name" />
              </Form.Item>
            </Col>
          )}
        </Row>

        <Form.Item label="Contact person" name="contactPersonId" rules={[{ required: true, message: "Pick the contact person" }]}>
          <Select
            placeholder={selectedCustomer ? "Select contact person" : "Pick a customer first"}
            onChange={(id) => {
              const contact = selectedCustomer?.contacts?.find((c: any) => c.id === id);
              form.setFieldsValue({ customerEmail: contact?.email, customerPhone: contact?.phone, contactPersonId: contact?.id });
            }}
          >
            {selectedCustomer?.contacts?.map((c: any) => (
              <Option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={[14, 0]}>
          <Col xs={24} md={12}>
            <Form.Item label="Email" name="customerEmail">
              <Input type="email" placeholder="customer@email.com" prefix={<MailOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Phone" name="customerPhone">
              <Input placeholder="+91 XXXXX XXXXX" prefix={<PhoneOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[14, 0]}>
          <Col xs={24} md={12}>
            <Form.Item label="Place of supply" name="placeOfOrder" tooltip="Decides CGST + SGST (same state as you) or IGST (another state)">
              <Select
                showSearch
                placeholder="Select state"
                optionFilterProp="children"
                filterOption={(input, option) => (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())}
              >
                {indianStates.map((state) => (
                  <Option key={state} value={state}>
                    {state}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="GSTIN / UIN" name="customerGSTN">
              <Input placeholder="22AAAAA0000A1Z5" className="qp-mono" />
            </Form.Item>
          </Col>
        </Row>

        <div className="qf-addr-grid">
          {(["billing", "shipping"] as const).map((kind) => (
            <div className="qf-addr" key={kind}>
              <h5>
                <EnvironmentOutlined /> {kind === "billing" ? "Billing address" : "Shipping address"}
              </h5>
              <Form.Item name={`${kind}AddressId`} style={{ marginBottom: 6 }}>
                <Select
                  placeholder={selectedCustomer ? `Choose ${kind} address` : "Pick a customer first"}
                  onChange={(id) => pickAddress(kind, id)}
                  aria-label={`${kind} address`}
                >
                  {addressOptions.map((a: any) => (
                    <Option key={a.id} value={a.id}>
                      {a.label || a.address_type}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name={`${kind}Address`} style={{ marginBottom: 8 }}>
                <TextArea autoSize={{ minRows: 2, maxRows: 4 }} readOnly placeholder="—" aria-label={`${kind} address details`} />
              </Form.Item>
            </div>
          ))}
        </div>
      </FormSection>
      <AddCustomerModal open={openCustomerModal} onClose={() => setOpenCustomerModal(false)} />
    </>
  );
};

export default CustomerDetails;
