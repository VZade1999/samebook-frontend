import React, { useEffect, useMemo, useState } from "react";
import { Card, Form, Input, AutoComplete, Spin, Row, Col, Select } from "antd";
import { indianStates } from "../../../../utils/masterData/stata";
import { useDispatch, useSelector } from "react-redux";
import { getCustomers } from "@/modules/customers/redux/customerActions";
import AddCustomerModal from "@/modules/customers/components/AddCustomerModal";

const { TextArea } = Input;
const { Option } = Select;

// Indian States List

// Mock customer data

const CustomerDetails = () => {
  const form = Form.useFormInstance();

  const [searchValue, setSearchValue] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [selectedContact, setSelectedContact] = useState<any>(null);

  const [selectedBillingAddress, setSelectedBillingAddress] =
    useState<any>(null);

  const [selectedShippingAddress, setSelectedShippingAddress] =
    useState<any>(null);

  // options are derived from `customers` + `debouncedSearch`
  // compute via useMemo to avoid updating state on every render
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const dispatch = useDispatch();

  const { list, loading } = useSelector((state: any) => state.customers);
  const customerState = useSelector((state: any) => state.customers);
  const customers = list || [];
  const [openCustomerModal, setOpenCustomerModal] = useState(false);
  const customerId = Form.useWatch("customerId", form);

  useEffect(() => {
    if (!customerId) {
      return;
    }

    const customer = customers.find(
      (item: any) => Number(item.id) === Number(customerId),
    );

    if (!customer) {
      return;
    }

    setSelectedCustomer(customer);

    const selectedContact =
      customer.contacts?.find(
        (contact: any) =>
          Number(contact.id) === Number(form.getFieldValue("contactPersonId")),
      ) || customer.contacts?.[0];

    const selectedBilling =
      customer.addresses?.find(
        (address: any) =>
          Number(address.id) === Number(form.getFieldValue("billingAddressId")),
      ) || customer.addresses?.[0];

    const selectedShipping =
      customer.addresses?.find(
        (address: any) =>
          Number(address.id) ===
          Number(form.getFieldValue("shippingAddressId")),
      ) || customer.addresses?.[0];

    setSelectedContact(selectedContact);

    setSelectedBillingAddress(selectedBilling);

    setSelectedShippingAddress(selectedShipping);

    setSearchValue(customer.display_name);
  }, [customerId, customers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    if (!debouncedSearch?.trim()) {
      return;
    }

    dispatch(
      getCustomers({
        search: debouncedSearch,
        limit: 10,
        page: 1,
      }),
    );
  }, [debouncedSearch, dispatch]);

  const customerOptions = useMemo(() => {
    if (!debouncedSearch?.trim()) return [];

    const mapped = customers.map((customer: any) => ({
      label: (
        <div>
          <div>{customer.display_name}</div>

          <div
            style={{
              fontSize: 12,
              color: "#8c8c8c",
            }}
          >
            {customer.customer_type}•{customer.company_name}
          </div>
        </div>
      ),
      value: customer.display_name,
      customer,
    }));

    if (debouncedSearch && !loading && customers.length === 0) {
      mapped.push({
        label: (
          <div style={{ color: "#1677ff", fontWeight: 500 }}>
            + Create Customer "{debouncedSearch}"
          </div>
        ),
        value: "__create_customer__",
      });
    }

    return mapped;
  }, [customers, debouncedSearch]);

  // Handle customer search
  const handleCustomerSearch = (value: string) => {
    setSearchValue(value);
  };

  // Handle customer selection
  const handleCustomerSelect = (value: string, option: any) => {
    if (value === "__create_customer__") {
      setOpenCustomerModal(true);
      return;
    }

    const customer = option.customer;

    if (!customer) return;

    setSelectedCustomer(customer);

    const primaryContact =
      customer.contacts?.find((c: any) => c.is_primary === 1) ||
      customer.contacts?.[0];

    const billingAddress =
      customer.addresses?.find((a: any) => a.address_type === "BILLING") ||
      customer.addresses?.find((a: any) => a.is_primary === 1) ||
      customer.addresses?.[0];

    const shippingAddress =
      customer.addresses?.find((a: any) => a.address_type === "SHIPPING") ||
      billingAddress;

    setSelectedContact(primaryContact);
    setSelectedBillingAddress(billingAddress);
    setSelectedShippingAddress(shippingAddress);

    form.setFieldsValue({
      customerId: customer.id,

      customerType: customer.customer_type,

      customerName: customer.display_name,

      companyName: customer.company_name,

      customerGSTN: customer.gst_number || billingAddress?.gst_number,

      customerEmail: primaryContact?.email,

      customerPhone: primaryContact?.phone,

      contactPersonId: primaryContact?.id,

      billingAddressId: billingAddress?.id,

      shippingAddressId: shippingAddress?.id,

      billingAddress: [
        billingAddress?.address_line_1,
        billingAddress?.address_line_2,
        billingAddress?.city,
        billingAddress?.state,
        billingAddress?.country,
        billingAddress?.postal_code,
      ]
        .filter(Boolean)
        .join(", "),

      shippingAddress: [
        shippingAddress?.address_line_1,
        shippingAddress?.address_line_2,
        shippingAddress?.city,
        shippingAddress?.state,
        shippingAddress?.country,
        shippingAddress?.postal_code,
      ]
        .filter(Boolean)
        .join(", "),

      billingAddressSnapshot: JSON.stringify(billingAddress),

      shippingAddressSnapshot: JSON.stringify(shippingAddress),
    });

    setSearchValue(customer.display_name);
  };

  // Card title with search
  const cardTitle = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
      }}
    >
      <span>Customer Details</span>

      <AutoComplete
        style={{ width: 350, height: 42 }}
        options={customerOptions}
        onSearch={(value) => handleCustomerSearch(value)}
        onSelect={(value, option) => handleCustomerSelect(value, option)}
        value={searchValue}
        placeholder="Search customer..."
        notFoundContent={loading ? <Spin size="small" /> : "No customers found"}
        filterOption={false}
      />
    </div>
  );

  const isBusiness = selectedCustomer?.customer_type === "BUSINESS";

  return (
    <>
      <Card title={cardTitle} className="section-card">
        <Form.Item name="customerId" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="contactPersonId" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="customerType" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="billingAddressSnapshot" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="shippingAddressSnapshot" hidden>
          <Input />
        </Form.Item>
        {/* First Row */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Display Name" name="customerName">
              <Input placeholder="Enter customer name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            {isBusiness && (
              <Form.Item label="Company Name" name="companyName">
                <Input />
              </Form.Item>
            )}
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              label="Contact Person"
              name="contactPersonId"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Select
                onChange={(id) => {
                  const contact = selectedCustomer?.contacts?.find(
                    (c: any) => c.id === id,
                  );

                  setSelectedContact(contact);

                  form.setFieldsValue({
                    customerEmail: contact?.email,

                    customerPhone: contact?.phone,

                    contactPersonId: contact?.id,
                  });
                }}
              >
                {selectedCustomer?.contacts?.map((contact: any) => (
                  <Option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Second Row */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Email" name="customerEmail">
              <Input type="email" placeholder="Enter customer email" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Phone Number" name="customerPhone">
              <Input placeholder="Enter customer phone" />
            </Form.Item>
          </Col>
        </Row>

        {/* Third Row */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Place of Supply" name="placeOfOrder">
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
                  <Option key={state} value={state}>
                    {state}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="GSTN/UIN" name="customerGSTN">
              <Input placeholder="Enter GSTN/UIN" />
            </Form.Item>
          </Col>
        </Row>

        {/* Billing Address */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Billing Address" name="billingAddressId">
              <Select
                placeholder="Select Billing Address"
                onChange={(id) => {
                  const address = selectedCustomer?.addresses?.find(
                    (a: any) => a.id === id,
                  );

                  setSelectedBillingAddress(address);

                  form.setFieldsValue({
                    billingAddress: [
                      address?.address_line_1,
                      address?.address_line_2,
                      address?.city,
                      address?.state,
                      address?.country,
                      address?.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", "),

                    billingAddressSnapshot: JSON.stringify(address),
                    customerGSTN:
                      address?.gst_number || selectedCustomer?.gst_number,
                  });
                }}
              >
                {selectedCustomer?.addresses
                  ?.filter(
                    (address: any) =>
                      address.address_type === "BILLING" ||
                      address.address_type === "OFFICE" ||
                      address.address_type === "BRANCH",
                  )
                  .map((address: any) => (
                    <Option key={address.id} value={address.id}>
                      {address.label || address.address_type}
                    </Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Billing Address Details" name="billingAddress">
          <TextArea rows={3} readOnly />
        </Form.Item>

        {/* Shipping Address */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Shipping Address" name="shippingAddressId">
              <Select
                placeholder="Select Shipping Address"
                onChange={(id) => {
                  const address = selectedCustomer?.addresses?.find(
                    (a: any) => a.id === id,
                  );

                  setSelectedShippingAddress(address);

                  form.setFieldsValue({
                    shippingAddress: [
                      address?.address_line_1,
                      address?.address_line_2,
                      address?.city,
                      address?.state,
                      address?.country,
                      address?.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", "),

                    shippingAddressSnapshot: JSON.stringify(address),
                  });
                }}
              >
                {selectedCustomer?.addresses
                  ?.filter(
                    (address: any) =>
                      address.address_type === "SHIPPING" ||
                      address.address_type === "WAREHOUSE" ||
                      address.address_type === "FACTORY",
                  )
                  .map((address: any) => (
                    <Option key={address.id} value={address.id}>
                      {address.label || address.address_type}
                    </Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Shipping Address Details" name="shippingAddress">
          <TextArea rows={3} readOnly />
        </Form.Item>
      </Card>
      <AddCustomerModal
        open={openCustomerModal}
        onClose={() => setOpenCustomerModal(false)}
      />
    </>
  );
};

export default CustomerDetails;
