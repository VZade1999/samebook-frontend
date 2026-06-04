import React from "react";

import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
} from "antd";

import {
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";

const { Option } = Select;

const CustomerAddressSection =
  () => {
    return (
      <Form.List name="addresses">
        {(
          fields,
          {
            add,
            remove,
          },
        ) => (
          <div>
            {/* =========================
                HEADER
            ========================= */}

            <div
              style={{
                display: "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",

                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  margin: 0,
                }}
              >
                Customer Addresses
              </h3>

              <Button
                type="primary"
                icon={
                  <PlusOutlined />
                }
                onClick={() =>
                  add({
                    address_type:
                      "BILLING",

                    is_primary: 0,
                  })
                }
              >
                Add Address
              </Button>
            </div>

            {/* =========================
                ADDRESS CARDS
            ========================= */}

            <Space
              direction="vertical"
              style={{
                width: "100%",
              }}
              size={16}
            >
              {fields.map(
                (
                  field,
                  index,
                ) => (
                  <Card
                    key={
                      field.key
                    }
                    title={`Address ${
                      index + 1
                    }`}
                    extra={
                      fields.length >
                        1 && (
                        <Button
                          danger
                          type="text"
                          icon={
                            <DeleteOutlined />
                          }
                          onClick={() =>
                            remove(
                              field.name,
                            )
                          }
                        />
                      )
                    }
                  >
                    {/* =========================
                        ROW 1
                    ========================= */}

                    <Row gutter={16}>
                      <Col
                        xs={24}
                        md={8}
                      >
                        <Form.Item
                          label="Address Type"
                          name={[
                            field.name,
                            "address_type",
                          ]}
                          rules={[
                            {
                              required: true,
                              message:
                                "Address type is required",
                            },
                          ]}
                        >
                          <Select placeholder="Select address type">
                            <Option value="BILLING">
                              Billing
                            </Option>

                            <Option value="SHIPPING">
                              Shipping
                            </Option>

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
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={8}
                      >
                        <Form.Item
                          label="Address Label"
                          name={[
                            field.name,
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
                          label="GST Number"
                          name={[
                            field.name,
                            "gst_number",
                          ]}
                        >
                          <Input placeholder="GST for this location" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* =========================
                        ADDRESS LINE 1
                    ========================= */}

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          label="Address Line 1"
                          name={[
                            field.name,
                            "address_line_1",
                          ]}
                          rules={[
                            {
                              required: true,
                              message:
                                "Address line 1 is required",
                            },
                          ]}
                        >
                          <Input placeholder="Enter address line 1" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* =========================
                        ADDRESS LINE 2
                    ========================= */}

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          label="Address Line 2"
                          name={[
                            field.name,
                            "address_line_2",
                          ]}
                        >
                          <Input placeholder="Enter address line 2" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* =========================
                        CITY STATE COUNTRY ZIP
                    ========================= */}

                    <Row gutter={16}>
                      <Col
                        xs={24}
                        md={6}
                      >
                        <Form.Item
                          label="City"
                          name={[
                            field.name,
                            "city",
                          ]}
                        >
                          <Input placeholder="City" />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={6}
                      >
                        <Form.Item
                          label="State"
                          name={[
                            field.name,
                            "state",
                          ]}
                        >
                          <Input placeholder="State" />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={6}
                      >
                        <Form.Item
                          label="Country"
                          name={[
                            field.name,
                            "country",
                          ]}
                        >
                          <Input placeholder="Country" />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={6}
                      >
                        <Form.Item
                          label="Postal Code"
                          name={[
                            field.name,
                            "postal_code",
                          ]}
                        >
                          <Input placeholder="Postal code" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* =========================
                        PRIMARY SWITCH
                    ========================= */}

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          label="Primary Address"
                          name={[
                            field.name,
                            "is_primary",
                          ]}
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ),
              )}
            </Space>
          </div>
        )}
      </Form.List>
    );
  };

export default CustomerAddressSection;