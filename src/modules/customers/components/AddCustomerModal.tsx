import React from "react";

import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
} from "antd";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useDispatch } from "react-redux";

import { createCustomer } from "../redux/customerActions";
import { indianStates } from "@/utils/masterData/stata";

const { Option } = Select;

const { TextArea } = Input;

interface AddCustomerModalProps {
  open: boolean;

  onClose: () => void;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useDispatch();

  const [form] = Form.useForm();

  // =========================================
  // WATCH CUSTOMER TYPE
  // =========================================

  const customerType = Form.useWatch("customer_type", form) || "INDIVIDUAL";

  // =========================================
  // CLOSE
  // =========================================

  const handleClose = () => {
    form.resetFields();

    onClose();
  };

  // =========================================
  // SAVE
  // =========================================

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // =========================================
      // BUSINESS CUSTOMER VALIDATION
      // =========================================

      if (values.customer_type === "BUSINESS") {
        const contacts = values.contacts || [];

        // Check if at least one contact has required fields
        const hasValidContact = contacts.some(
          (contact: any) =>
            contact.first_name && contact.last_name && contact.phone,
        );

        if (!hasValidContact) {
          return alert(
            "Business customers must have at least one contact with first name, last name, and phone number",
          );
        }
      }

      // =========================================
      // PRIMARY CONTACT VALIDATION
      // =========================================

      const primaryContacts = values.contacts.filter(
        (contact: any) => contact.is_primary,
      );

      if (primaryContacts.length > 1) {
        return alert("Only one primary contact allowed");
      }

      // =========================================
      // PRIMARY ADDRESS VALIDATION
      // =========================================

      const primaryAddresses = values.addresses.filter(
        (address: any) => address.is_primary,
      );

      if (primaryAddresses.length > 1) {
        return alert("Only one primary address allowed");
      }

      dispatch(createCustomer(values));

      form.resetFields();

      onClose();
    } catch (error) {
      console.log("Validation Failed", error);
    }
  };

  return (
    <Modal
      title="Create Customer"
      open={open}
      onCancel={handleClose}
      width={"95%"}
      style={{
        maxWidth: 1300,
        top: 20,
      }}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          customer_type: "INDIVIDUAL",

          contacts: [
            {
              is_primary: true,
            },
          ],

          addresses: [
            {
              address_type: "BILLING",

              is_primary: true,
            },
          ],
        }}
      >
        {/* =========================================
            CUSTOMER DETAILS
        ========================================= */}

        <Divider orientation="left">Customer Details</Divider>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="Customer Type"
              name="customer_type"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Select>
                <Option value="INDIVIDUAL">Individual</Option>

                <Option value="BUSINESS">Business</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={16}>
            <Form.Item
              label="Display Name"
              name="display_name"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input placeholder="Enter display name" />
            </Form.Item>
          </Col>
        </Row>

        {/* =========================================
            BUSINESS DETAILS
        ========================================= */}

        {customerType === "BUSINESS" && (
          <>
            <Divider orientation="left">Business Details</Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Company Name"
                  name="company_name"
                  rules={[
                    {
                      required: true,
                      message:
                        "Company Name is required for business customers",
                    },
                  ]}
                >
                  <Input placeholder="Company name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="GST Number" name="gst_number">
                  <Input placeholder="GST Number" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Website" name="website">
                  <Input placeholder="Website" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Industry" name="industry">
                  <Input placeholder="Industry" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {/* =========================================
            CONTACTS
        ========================================= */}

        <Divider orientation="left">Contacts</Divider>

        <Form.List name="contacts">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Card
                  key={key}
                  style={{
                    marginBottom: 20,
                  }}
                  title={`Contact ${index + 1}`}
                  extra={
                    fields.length > 1 ? (
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                      >
                        Remove
                      </Button>
                    ) : null
                  }
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        {...restField}
                        label="First Name"
                        name={[name, "first_name"]}
                        rules={[
                          {
                            required: true,
                            message: "First name is required",
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        {...restField}
                        label="Last Name"
                        name={[name, "last_name"]}
                        rules={[
                          {
                            required: true,
                            message: "Last name is required",
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        {...restField}
                        label="Email"
                        name={[name, "email"]}
                        rules={[
                          {
                            type: "email",
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        {...restField}
                        label="Phone"
                        name={[name, "phone"]}
                        rules={[
                          {
                            required: true,
                            message: "Phone number is required",
                          },
                          {
                            pattern: /^[6-9]\d{9}$/,
                            message:
                              "Please enter a valid Indian phone number (10 digits starting with 6-9)",
                          },
                        ]}
                      >
                        <Input placeholder="Enter 10-digit phone number" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    {customerType === "BUSINESS" && (
                      <Col xs={24} md={12}>
                        <Form.Item
                          {...restField}
                          label="Department"
                          name={[name, "department"]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    )}

                    {customerType === "BUSINESS" && (
                      <Col xs={24} md={12}>
                        <Form.Item
                          {...restField}
                          label="Designation"
                          name={[name, "designation"]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    )}
                  </Row>

                  <Form.Item
                    {...restField}
                    label="Primary Contact"
                    name={[name, "is_primary"]}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Card>
              ))}
              {customerType !== "INDIVIDUAL" ? (
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({
                      is_primary: false,
                    })
                  }
                >
                  Add Contact
                </Button>
              ) : null}
            </>
          )}
        </Form.List>

        {/* =========================================
            ADDRESSES
        ========================================= */}

        <Divider orientation="left">Addresses</Divider>

        <Form.List name="addresses">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Card
                  key={key}
                  style={{
                    marginBottom: 20,
                  }}
                  title={`Address ${index + 1}`}
                  extra={
                    fields.length > 1 ? (
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                      >
                        Remove
                      </Button>
                    ) : null
                  }
                >
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        {...restField}
                        label="Address Type"
                        name={[name, "address_type"]}
                      >
                        <Select>
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
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        {...restField}
                        label="Label"
                        name={[name, "label"]}
                      >
                        <Input placeholder="e.g Pune Office" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        {...restField}
                        label="GST Number"
                        name={[name, "gst_number"]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    {...restField}
                    label="Address Line 1"
                    name={[name, "address_line_1"]}
                  >
                    <Input />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    label="Address Line 2"
                    name={[name, "address_line_2"]}
                  >
                    <Input />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col xs={24} md={6}>
                      <Form.Item
                        {...restField}
                        label="City"
                        name={[name, "city"]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={6}>
                      <Form.Item
                        label="State (Place of Supply)"
                        name={[name, "state"]}
                        rules={[
                          {
                            required: true,
                            message: "State is required",
                          },
                        ]}
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
                            <Option key={state} value={state}>
                              {state}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={6}>
                      <Form.Item
                        {...restField}
                        label="Country"
                        name={[name, "country"]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={6}>
                      <Form.Item
                        {...restField}
                        label="Postal Code"
                        name={[name, "postal_code"]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    {...restField}
                    label="Primary Address"
                    name={[name, "is_primary"]}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Card>
              ))}

              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => {
                  // =========================================
                  // INDIVIDUAL CUSTOMER LIMIT
                  // =========================================

                  if (customerType === "INDIVIDUAL" && fields.length >= 2) {
                    return alert(
                      "Individual customer can only have Billing and Shipping addresses",
                    );
                  }

                  // =========================================
                  // AUTO ADDRESS TYPE FOR INDIVIDUAL
                  // =========================================

                  let addressType = "BILLING";

                  if (customerType === "INDIVIDUAL") {
                    addressType = fields.length === 0 ? "BILLING" : "SHIPPING";
                  }

                  add({
                    address_type: addressType,

                    is_primary: false,
                  });
                }}
              >
                Add Address
              </Button>
            </>
          )}
        </Form.List>

        {/* =========================================
            NOTES
        ========================================= */}

        <Divider orientation="left">Notes</Divider>

        <Form.Item name="notes">
          <TextArea rows={4} placeholder="Enter notes" />
        </Form.Item>

        {/* =========================================
            ACTIONS
        ========================================= */}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 24,
          }}
        >
          <Space>
            <Button onClick={handleClose}>Cancel</Button>

            <Button type="primary" onClick={handleSave}>
              Save Customer
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default AddCustomerModal;
