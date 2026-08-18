import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Button, message } from "antd";
import { useDispatch } from "react-redux";
import { updateWarehouse } from "../redux/warehousesActions";

interface Props {
  visible: boolean;
  warehouse: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditWarehouseModal: React.FC<Props> = ({ visible, warehouse, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && warehouse) {
      form.setFieldsValue({
        name: warehouse.name,
        address: warehouse.address,
        city: warehouse.city,
        state: warehouse.state,
      });
    }
  }, [visible, warehouse, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const response = await dispatch(
        updateWarehouse({ id: warehouse.id, payload: values }) as any,
      );
      if (response.meta.requestStatus === "fulfilled") {
        message.success("Warehouse updated successfully");
        onSuccess();
        onClose();
      } else {
        message.error(response.payload?.message || "Failed to update warehouse");
      }
    } catch {
      message.error("Failed to update warehouse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Edit Warehouse"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={() => form.submit()}>
          Update
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

export default EditWarehouseModal;
