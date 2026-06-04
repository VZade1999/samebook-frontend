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

const CustomerContactSection =
  () => {
    return (
      <Form.List name="contacts">
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
                Customer Contacts
              </h3>

              <Button
                type="primary"
                icon={
                  <PlusOutlined />
                }
                onClick={() =>
                  add({
                    is_primary: 0,
                  })
                }
              >
                Add Contact
              </Button>
            </div>

            {/* =========================
                CONTACT CARDS
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
                    title={`Contact ${
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
                        NAME
                    ========================= */}

                    <Row gutter={16}>
                      <Col
                        xs={24}
                        md={12}
                      >
                        <Form.Item
                          label="First Name"
                          name={[
                            field.name,
                            "first_name",
                          ]}
                          rules={[
                            {
                              required: true,
                              message:
                                "First name is required",
                            },
                          ]}
                        >
                          <Input placeholder="Enter first name" />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={12}
                      >
                        <Form.Item
                          label="Last Name"
                          name={[
                            field.name,
                            "last_name",
                          ]}
                        >
                          <Input placeholder="Enter last name" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* =========================
                        EMAIL PHONE
                    ========================= */}

                    <Row gutter={16}>
                      <Col
                        xs={24}
                        md={12}
                      >
                        <Form.Item
                          label="Email"
                          name={[
                            field.name,
                            "email",
                          ]}
                          rules={[
                            {
                              type: "email",
                              message:
                                "Invalid email",
                            },
                          ]}
                        >
                          <Input placeholder="Enter email" />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={12}
                      >
                        <Form.Item
                          label="Phone"
                          name={[
                            field.name,
                            "phone",
                          ]}
                        >
                          <Input placeholder="Enter phone number" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* =========================
                        DEPARTMENT DESIGNATION
                    ========================= */}

                    <Row gutter={16}>
                      <Col
                        xs={24}
                        md={12}
                      >
                        <Form.Item
                          label="Department"
                          name={[
                            field.name,
                            "department",
                          ]}
                        >
                          <Select
                            placeholder="Select department"
                            allowClear
                          >
                            <Option value="PURCHASE">
                              Purchase
                            </Option>

                            <Option value="FINANCE">
                              Finance
                            </Option>

                            <Option value="ACCOUNTS">
                              Accounts
                            </Option>

                            <Option value="OPERATIONS">
                              Operations
                            </Option>

                            <Option value="ADMIN">
                              Admin
                            </Option>

                            <Option value="MANAGEMENT">
                              Management
                            </Option>

                            <Option value="HR">
                              HR
                            </Option>

                            <Option value="OTHER">
                              Other
                            </Option>
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        md={12}
                      >
                        <Form.Item
                          label="Designation"
                          name={[
                            field.name,
                            "designation",
                          ]}
                        >
                          <Input placeholder="e.g Purchase Manager" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* =========================
                        PRIMARY CONTACT
                    ========================= */}

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          label="Primary Contact"
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

export default CustomerContactSection;