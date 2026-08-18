import React, { useState } from "react";
import { Modal, Form, Input, Button, message } from "antd";
import { useDispatch } from "react-redux";
import { createWarehouse } from "../redux/warehousesActions";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddWarehouseModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const response = await dispatch(createWarehouse(values) as any);
      if (response.meta.requestStatus === "fulfilled") {
        message.success("Warehouse created successfully");
        form.resetFields();
        onSuccess();
        onClose();
      } else {
        message.error(response.payload?.message || "Failed to create warehouse");
      }
    } catch {
      message.error("Failed to create warehouse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add Warehouse"
      open={visible}
      onCancel={onClose}
      afterClose={() => form.resetFields()}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={() => form.submit()}>
          Create
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Warehouse Name"
          rules={[{ required: true, message: "Warehouse name required" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="address" label="Address">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="city" label="City">
          <Input />
        </Form.Item>

        <Form.Item name="state" label="State">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddWarehouseModal;
