import React, { useEffect } from "react";
import { Modal, Form, Input, Button, Row, Col, Space, Checkbox, Divider, InputNumber } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { updateCompany } from "../../redux/companyActions";

interface EditCompanyModalProps {
  open: boolean;
  onClose: () => void;
  company: any;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  open,
  onClose,
  company,
}) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  useEffect(() => {
    if (company) {
      form.setFieldsValue({
        name: company.name,
        company_prefix: company.company_prefix,
        legal_name: company.legal_name,
        registration_number: company.registration_number,
        tax_id: company.tax_id,
        industry: company.industry,
        website: company.website,
        primary_email: company.primary_email,
        primary_phone: company.primary_phone,
        addresses: company.addresses || [],
        locations: company.locations || [],
        metadata: company.metadata || [],
      });
    }
  }, [company, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      dispatch(updateCompany({ id: company?.id, ...values }));
      form.resetFields();
      onClose();
    } catch {
      // validation handled by Ant Design
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Edit Company"
      open={open}
      onCancel={handleClose}
      width="90%"
      style={{ maxWidth: 720 }}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>
            Update
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Company Name"
              name="name"
              rules={[{ required: true, message: "Company name is required" }]}
            >
              <Input placeholder="Enter company name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Company Prefix"
              name="company_prefix"
              rules={[
                { required: true, message: "Company prefix is required" },
                {
                  pattern: /^[A-Z0-9]+$/,
                  message: "Company prefix must be uppercase alphanumeric without spaces",
                },
                { max: 10, message: "Company prefix must be at most 10 characters" },
              ]}
            >
              <Input placeholder="Enter company prefix" maxLength={10} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Legal Name" name="legal_name">
              <Input placeholder="Enter legal company name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Registration Number" name="registration_number">
              <Input placeholder="Enter registration number" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Tax ID" name="tax_id">
              <Input placeholder="Enter tax id" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Industry" name="industry">
              <Input placeholder="Enter industry" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Website" name="website">
              <Input placeholder="Enter website" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Primary Email" name="primary_email">
              <Input type="email" placeholder="Enter primary email" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Primary Phone" name="primary_phone">
              <Input placeholder="Enter primary phone" />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Addresses</Divider>
        <Form.List name="addresses">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space
                  key={field.key}
                  direction="vertical"
                  style={{ width: "100%", marginBottom: 16, padding: 16, border: "1px solid #f0f0f0", borderRadius: 6 }}
                >
                  <Form.Item name={[field.name, "id"]} hidden>
                    <Input type="hidden" />
                  </Form.Item>
                  <Row gutter={16} align="bottom">
                    <Col xs={24} md={8}>
                      <Form.Item label="Type" name={[field.name, "type"]}>
                        <Input placeholder="office / billing" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Label" name={[field.name, "label"]}>
                        <Input placeholder="Optional label" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Button
                        type="link"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(field.name)}
                      >
                        Remove address
                      </Button>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Line 1" name={[field.name, "line_1"]}>
                        <Input placeholder="Address line 1" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Line 2" name={[field.name, "line_2"]}>
                        <Input placeholder="Address line 2" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={6}>
                      <Form.Item label="City" name={[field.name, "city"]}>
                        <Input placeholder="City" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="State" name={[field.name, "state"]}>
                        <Input placeholder="State" />
                      </Form.Item>
                      
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="Country" name={[field.name, "country"]}>
                        <Input placeholder="Country" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="Postal Code" name={[field.name, "postal_code"]}>
                        <Input placeholder="Postal code" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Phone" name={[field.name, "phone"]}>
                        <Input placeholder="Phone" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Fax" name={[field.name, "fax"]}>
                        <Input placeholder="Fax" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name={[field.name, "is_default"]} valuePropName="checked">
                        <Checkbox>Default address</Checkbox>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="Notes" name={[field.name, "notes"]}>
                    <Input.TextArea rows={2} placeholder="Optional notes" />
                  </Form.Item>
                </Space>
              ))}

              <Form.Item>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>
                  Add address
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Divider>Locations</Divider>
        <Form.List name="locations">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space
                  key={field.key}
                  direction="vertical"
                  style={{ width: "100%", marginBottom: 16, padding: 16, border: "1px solid #f0f0f0", borderRadius: 6 }}
                >
                  <Form.Item name={[field.name, "id"]} hidden>
                    <Input type="hidden" />
                  </Form.Item>
                  <Row gutter={16} align="bottom">
                    <Col xs={24} md={8}>
                      <Form.Item label="Location Name" name={[field.name, "name"]}>
                        <Input placeholder="Warehouse / branch" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Location Type" name={[field.name, "location_type"]}>
                        <Input placeholder="e.g. headquarters" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Button
                        type="link"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(field.name)}
                      >
                        Remove location
                      </Button>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Address ID" name={[field.name, "address_id"]}>
                        <InputNumber style={{ width: "100%" }} placeholder="Optional address id" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Manager Name" name={[field.name, "manager_name"]}>
                        <Input placeholder="Manager name" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Manager Phone" name={[field.name, "manager_phone"]}>
                        <Input placeholder="Manager phone" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Capacity" name={[field.name, "capacity"]}>
                        <Input placeholder="e.g. 120 seats" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Operational Hours" name={[field.name, "operational_hours"]}>
                        <Input placeholder="e.g. 9am - 6pm" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider style={{ margin: "8px 0" }}>Address Details</Divider>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Address Line 1" name={[field.name, "address_line_1"]}>
                        <Input placeholder="Address line 1" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Address Line 2" name={[field.name, "address_line_2"]}>
                        <Input placeholder="Address line 2" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={6}>
                      <Form.Item label="City" name={[field.name, "address_city"]}>
                        <Input placeholder="City" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="State" name={[field.name, "address_state"]}>
                        <Input placeholder="State" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="Country" name={[field.name, "address_country"]}>
                        <Input placeholder="Country" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="Postal Code" name={[field.name, "address_postal_code"]}>
                        <Input placeholder="Postal code" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="Notes" name={[field.name, "notes"]}>
                    <Input.TextArea rows={2} placeholder="Optional notes" />
                  </Form.Item>
                </Space>
              ))}

              <Form.Item>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>
                  Add location
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Divider>Metadata</Divider>
        <Form.List name="metadata">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space
                  key={field.key}
                  direction="vertical"
                  style={{ width: "100%", marginBottom: 16, padding: 16, border: "1px solid #f0f0f0", borderRadius: 6 }}
                >
                  <Form.Item name={[field.name, "id"]} hidden>
                    <Input type="hidden" />
                  </Form.Item>
                  <Row gutter={16} align="bottom">
                    <Col xs={24} md={10}>
                      <Form.Item
                        label="Key"
                        name={[field.name, "key"]}
                        rules={[{ required: true, message: "Metadata key is required" }]}
                      >
                        <Input placeholder="Metadata key" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                      <Form.Item label="Value" name={[field.name, "value"]}>
                        <Input placeholder="Metadata value" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={4}>
                      <Button
                        type="link"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(field.name)}
                      >
                        Remove
                      </Button>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Data Type" name={[field.name, "data_type"]}>
                        <Input placeholder="e.g. string, number" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name={[field.name, "is_sensitive"]}
                        valuePropName="checked"
                      >
                        <Checkbox>Sensitive</Checkbox>
                      </Form.Item>
                    </Col>
                  </Row>
                </Space>
              ))}

              <Form.Item>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>
                  Add metadata
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default EditCompanyModal;
