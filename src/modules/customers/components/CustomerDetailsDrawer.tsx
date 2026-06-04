import React from "react";

import {
  Drawer,
  Typography,
  Row,
  Col,
  Card,
  Tag,
  Divider,
  Empty,
} from "antd";

const { Title, Text } = Typography;

interface CustomerDetailsDrawerProps {
  open: boolean;

  onClose: () => void;

  customer: any;
}

const CustomerDetailsDrawer: React.FC<
  CustomerDetailsDrawerProps
> = ({
  open,
  onClose,
  customer,
}) => {
  return (
    <Drawer
      title="Customer Details"
      placement="right"
      width={900}
      open={open}
      onClose={onClose}
    >
      {!customer ? (
        <Empty description="No Customer Selected" />
      ) : (
        <>
          {/* =========================================
              BASIC INFO
          ========================================= */}

          <Card>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">
                  Display Name
                </Text>

                <Title level={5}>
                  {customer.display_name || "-"}
                </Title>
              </Col>

              <Col span={12}>
                <Text type="secondary">
                  Customer Type
                </Text>

                <div style={{ marginTop: 8 }}>
                  <Tag
                    color={
                      customer.customer_type ===
                      "BUSINESS"
                        ? "blue"
                        : "green"
                    }
                  >
                    {customer.customer_type}
                  </Tag>
                </div>
              </Col>

              <Col span={12}>
                <Text type="secondary">
                  Company Name
                </Text>

                <div>
                  {customer.company_name || "-"}
                </div>
              </Col>

              <Col span={12}>
                <Text type="secondary">
                  GST Number
                </Text>

                <div>
                  {customer.gst_number || "-"}
                </div>
              </Col>

              <Col span={12}>
                <Text type="secondary">
                  Industry
                </Text>

                <div>
                  {customer.industry || "-"}
                </div>
              </Col>

              <Col span={12}>
                <Text type="secondary">
                  Website
                </Text>

                <div>
                  {customer.website || "-"}
                </div>
              </Col>

              <Col span={24}>
                <Text type="secondary">
                  Notes
                </Text>

                <div>
                  {customer.notes || "-"}
                </div>
              </Col>
            </Row>
          </Card>

          <Divider />

          {/* =========================================
              CONTACTS
          ========================================= */}

          <Title level={5}>
            Contacts
          </Title>

          {customer.contacts?.length ? (
            customer.contacts.map(
              (
                contact: any,
                index: number,
              ) => (
                <Card
                  key={index}
                  style={{
                    marginBottom: 16,
                  }}
                >
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Text type="secondary">
                        Name
                      </Text>

                      <div>
                        {
                          contact.first_name
                        }{" "}
                        {
                          contact.last_name
                        }
                      </div>
                    </Col>

                    <Col span={12}>
                      <Text type="secondary">
                        Email
                      </Text>

                      <div>
                        {contact.email ||
                          "-"}
                      </div>
                    </Col>

                    <Col span={12}>
                      <Text type="secondary">
                        Phone
                      </Text>

                      <div>
                        {contact.phone ||
                          "-"}
                      </div>
                    </Col>

                    <Col span={12}>
                      <Text type="secondary">
                        Department
                      </Text>

                      <div>
                        {contact.department ||
                          "-"}
                      </div>
                    </Col>

                    <Col span={12}>
                      <Text type="secondary">
                        Designation
                      </Text>

                      <div>
                        {contact.designation ||
                          "-"}
                      </div>
                    </Col>

                    <Col span={12}>
                      {contact.is_primary ? (
                        <Tag color="green">
                          Primary Contact
                        </Tag>
                      ) : null}
                    </Col>
                  </Row>
                </Card>
              ),
            )
          ) : (
            <Empty description="No Contacts Found" />
          )}

          <Divider />

          {/* =========================================
              ADDRESSES
          ========================================= */}

          <Title level={5}>
            Addresses
          </Title>

          {customer.addresses?.length ? (
            customer.addresses.map(
              (
                address: any,
                index: number,
              ) => (
                <Card
                  key={index}
                  style={{
                    marginBottom: 16,
                  }}
                >
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Text type="secondary">
                        Address Type
                      </Text>

                      <div>
                        <Tag color="blue">
                          {
                            address.address_type
                          }
                        </Tag>
                      </div>
                    </Col>

                    <Col span={12}>
                      <Text type="secondary">
                        Label
                      </Text>

                      <div>
                        {address.label ||
                          "-"}
                      </div>
                    </Col>

                    <Col span={24}>
                      <Text type="secondary">
                        Address
                      </Text>

                      <div>
                        {
                          address.address_line_1
                        }
                        {address.address_line_2
                          ? `, ${address.address_line_2}`
                          : ""}
                      </div>
                    </Col>

                    <Col span={8}>
                      <Text type="secondary">
                        City
                      </Text>

                      <div>
                        {address.city ||
                          "-"}
                      </div>
                    </Col>

                    <Col span={8}>
                      <Text type="secondary">
                        State
                      </Text>

                      <div>
                        {address.state ||
                          "-"}
                      </div>
                    </Col>

                    <Col span={8}>
                      <Text type="secondary">
                        Postal Code
                      </Text>

                      <div>
                        {address.postal_code ||
                          "-"}
                      </div>
                    </Col>

                    <Col span={12}>
                      <Text type="secondary">
                        GST Number
                      </Text>

                      <div>
                        {address.gst_number ||
                          "-"}
                      </div>
                    </Col>

                    <Col span={12}>
                      {address.is_primary ? (
                        <Tag color="green">
                          Primary Address
                        </Tag>
                      ) : null}
                    </Col>
                  </Row>
                </Card>
              ),
            )
          ) : (
            <Empty description="No Addresses Found" />
          )}
        </>
      )}
    </Drawer>
  );
};

export default CustomerDetailsDrawer;