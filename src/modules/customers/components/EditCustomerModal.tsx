
import React, {
  useEffect,
} from "react";

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
  message,
} from "antd";

import {
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import { useDispatch } from "react-redux";

import { updateCustomer } from "../redux/customerActions";

const { Option } = Select;

const { TextArea } = Input;

interface EditCustomerModalProps {
  open: boolean;

  onClose: () => void;

  customer: any;
}

const EditCustomerModal: React.FC<
  EditCustomerModalProps
> = ({
  open,
  onClose,
  customer,
}) => {
  const dispatch = useDispatch();

  const [form] = Form.useForm();

  // =========================================
  // WATCH CUSTOMER TYPE
  // =========================================

  const customerType =
    Form.useWatch(
      "customer_type",
      form,
    ) || "INDIVIDUAL";

  // =========================================
  // PREFILL FORM
  // =========================================

  useEffect(() => {
    if (
      open &&
      customer
    ) {
      form.setFieldsValue({
        customer_type:
          customer.customer_type,

        display_name:
          customer.display_name,

        company_name:
          customer.company_name,

        gst_number:
          customer.gst_number,

        website:
          customer.website,

        industry:
          customer.industry,

        notes:
          customer.notes,

        contacts:
          customer.contacts
            ?.length
            ? customer.contacts
            : [
                {
                  is_primary: true,
                },
              ],

        addresses:
          customer.addresses
            ?.length
            ? customer.addresses
            : [
                {
                  address_type:
                    "BILLING",

                  is_primary: true,
                },
              ],
      });
    }
  }, [
    open,
    customer,
    form,
  ]);

  // =========================================
  // CLOSE
  // =========================================

  const handleClose = () => {
    form.resetFields();

    onClose();
  };

  // =========================================
  // UPDATE
  // =========================================

  const handleUpdate =
    async () => {
      try {
        const values =
          await form.validateFields();

        // =========================================
        // PRIMARY CONTACT VALIDATION
        // =========================================

        const primaryContacts =
          values.contacts.filter(
            (contact: any) =>
              contact.is_primary,
          );

        if (
          primaryContacts.length >
          1
        ) {
          return message.error(
            "Only one primary contact allowed",
          );
        }

        // =========================================
        // PRIMARY ADDRESS VALIDATION
        // =========================================

        const primaryAddresses =
          values.addresses.filter(
            (address: any) =>
              address.is_primary,
          );

        if (
          primaryAddresses.length >
          1
        ) {
          return message.error(
            "Only one primary address allowed",
          );
        }

        // =========================================
        // INDIVIDUAL ADDRESS LIMIT
        // =========================================

        if (
          customerType ===
            "INDIVIDUAL" &&
          values.addresses
            .length > 2
        ) {
          return message.error(
            "Individual customer can only have 2 addresses",
          );
        }

        dispatch(
          updateCustomer({
            id: customer.id,

            ...values,
          }),
        );

        handleClose();
      } catch (error) {
        console.log(
          "Validation failed",
          error,
        );
      }
    };

  return (
    <Modal
      title="Edit Customer"
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
      >
        {/* =========================================
            CUSTOMER DETAILS
        ========================================= */}

        <Divider orientation="left">
          Customer Details
        </Divider>

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
              <Select disabled>
                <Option value="INDIVIDUAL">
                  Individual
                </Option>

                <Option value="BUSINESS">
                  Business
                </Option>
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
                  message:
                    "Display name is required",
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

        {customerType ===
          "BUSINESS" && (
          <>
            <Divider orientation="left">
              Business Details
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Company Name"
                  name="company_name"
                >
                  <Input placeholder="Company name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="GST Number"
                  name="gst_number"
                >
                  <Input placeholder="GST Number" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Website"
                  name="website"
                >
                  <Input placeholder="Website" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Industry"
                  name="industry"
                >
                  <Input placeholder="Industry" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {/* =========================================
            CONTACTS
        ========================================= */}

        <Divider orientation="left">
          Contacts
        </Divider>

        <Form.List name="contacts">
          {(
            fields,
            {
              add,
              remove,
            },
          ) => (
            <>
              {fields.map(
                (
                  {
                    key,
                    name,
                    ...restField
                  },
                  index,
                ) => (
                  <Card
                    key={key}
                    style={{
                      marginBottom: 20,
                    }}
                    title={`Contact ${index + 1}`}
                    extra={
                      customerType ===
                        "BUSINESS" &&
                      fields.length >
                        1 ? (
                        <Button
                          danger
                          icon={
                            <DeleteOutlined />
                          }
                          onClick={() =>
                            remove(
                              name,
                            )
                          }
                        >
                          Remove
                        </Button>
                      ) : null
                    }
                  >
                    <Row gutter={16}>
                      <Col
                        xs={24}
                        md={12}
                      >
                        <Form.Item
                          {...restField}
                          label="First Name"
                          name={[
                            name,
                            "first_name",
                          ]}
                          rules={[
                            {
                              required: true,
                              message:
                                "First name required",
                            },
                          ]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={12}
                      >
                        <Form.Item
                          {...restField}
                          label="Last Name"
                          name={[
                            name,
                            "last_name",
                          ]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col
                        xs={24}
                        md={12}
                      >
                        <Form.Item
                          {...restField}
                          label="Email"
                          name={[
                            name,
                            "email",
                          ]}
                          rules={[
                            {
                              type: "email",
                            },
                          ]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={12}
                      >
                        <Form.Item
                          {...restField}
                          label="Phone"
                          name={[
                            name,
                            "phone",
                          ]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>

                    {customerType ===
                      "BUSINESS" && (
                      <Row gutter={16}>
                        <Col
                          xs={24}
                          md={12}
                        >
                          <Form.Item
                            {...restField}
                            label="Department"
                            name={[
                              name,
                              "department",
                            ]}
                          >
                            <Input />
                          </Form.Item>
                        </Col>

                        <Col
                          xs={24}
                          md={12}
                        >
                          <Form.Item
                            {...restField}
                            label="Designation"
                            name={[
                              name,
                              "designation",
                            ]}
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                      </Row>
                    )}

                    <Form.Item
                      {...restField}
                      label="Primary Contact"
                      name={[
                        name,
                        "is_primary",
                      ]}
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Card>
                ),
              )}

              {customerType ===
                "BUSINESS" && (
                <Button
                  type="dashed"
                  block
                  icon={
                    <PlusOutlined />
                  }
                  onClick={() =>
                    add({
                      is_primary: false,
                    })
                  }
                >
                  Add Contact
                </Button>
              )}
            </>
          )}
        </Form.List>

        {/* =========================================
            ADDRESSES
        ========================================= */}

        <Divider orientation="left">
          Addresses
        </Divider>

        <Form.List name="addresses">
          {(
            fields,
            {
              add,
              remove,
            },
          ) => (
            <>
              {fields.map(
                (
                  {
                    key,
                    name,
                    ...restField
                  },
                  index,
                ) => (
                  <Card
                    key={key}
                    style={{
                      marginBottom: 20,
                    }}
                    title={`Address ${index + 1}`}
                    extra={
                      fields.length >
                      1 ? (
                        <Button
                          danger
                          icon={
                            <DeleteOutlined />
                          }
                          onClick={() =>
                            remove(
                              name,
                            )
                          }
                        >
                          Remove
                        </Button>
                      ) : null
                    }
                  >
                    <Row gutter={16}>
                      <Col
                        xs={24}
                        md={8}
                      >
                        <Form.Item
                          {...restField}
                          label="Address Type"
                          name={[
                            name,
                            "address_type",
                          ]}
                        >
                          <Select>
                            <Option value="BILLING">
                              Billing
                            </Option>

                            <Option value="SHIPPING">
                              Shipping
                            </Option>

                            {customerType ===
                              "BUSINESS" && (
                              <>
                                <Option value="OFFICE">
                                  Office
                                </Option>

                                <Option value="WAREHOUSE">
                                  Warehouse
                                </Option>

                                <Option value="FACTORY">
                                  Factory
                                </Option>

                                <Option value="BRANCH">
                                  Branch
                                </Option>

                                <Option value="OTHER">
                                  Other
                                </Option>
                              </>
                            )}
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={8}
                      >
                        <Form.Item
                          {...restField}
                          label="Label"
                          name={[
                            name,
                            "label",
                          ]}
                        >
                          <Input placeholder="e.g Pune Office" />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={8}
                      >
                        <Form.Item
                          {...restField}
                          label="GST Number"
                          name={[
                            name,
                            "gst_number",
                          ]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      {...restField}
                      label="Address Line 1"
                      name={[
                        name,
                        "address_line_1",
                      ]}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <Input />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      label="Address Line 2"
                      name={[
                        name,
                        "address_line_2",
                      ]}
                    >
                      <Input />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col
                        xs={24}
                        md={6}
                      >
                        <Form.Item
                          {...restField}
                          label="City"
                          name={[
                            name,
                            "city",
                          ]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={6}
                      >
                        <Form.Item
                          {...restField}
                          label="State"
                          name={[
                            name,
                            "state",
                          ]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={6}
                      >
                        <Form.Item
                          {...restField}
                          label="Country"
                          name={[
                            name,
                            "country",
                          ]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={6}
                      >
                        <Form.Item
                          {...restField}
                          label="Postal Code"
                          name={[
                            name,
                            "postal_code",
                          ]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      {...restField}
                      label="Primary Address"
                      name={[
                        name,
                        "is_primary",
                      ]}
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Card>
                ),
              )}

              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => {
                  // =========================================
                  // INDIVIDUAL MAX 2 ADDRESS
                  // =========================================

                  if (
                    customerType ===
                      "INDIVIDUAL" &&
                    fields.length >=
                      2
                  ) {
                    return message.error(
                      "Individual customer can only have Billing and Shipping addresses",
                    );
                  }

                  add({
                    address_type:
                      fields.length ===
                      0
                        ? "BILLING"
                        : "SHIPPING",

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

        <Divider orientation="left">
          Notes
        </Divider>

        <Form.Item name="notes">
          <TextArea
            rows={4}
            placeholder="Enter notes"
          />
        </Form.Item>

        {/* =========================================
            ACTIONS
        ========================================= */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            marginTop: 24,
          }}
        >
          <Space>
            <Button
              onClick={
                handleClose
              }
            >
              Cancel
            </Button>

            <Button
              type="primary"
              onClick={
                handleUpdate
              }
            >
              Update Customer
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default EditCustomerModal;
