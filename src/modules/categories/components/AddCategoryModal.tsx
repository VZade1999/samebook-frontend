import React, { useState } from "react";
import { Modal, Form, Input, Select, Button, message } from "antd";
import { useDispatch } from "react-redux";
import { createCategory } from "../redux/categoriesActions";

interface Props {
  visible: boolean;
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const AddCategoryModal: React.FC<Props> = ({ visible, categories, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const response = await dispatch(createCategory(values) as any);
      if (response.meta.requestStatus === "fulfilled") {
        message.success("Category created successfully");
        form.resetFields();
        onSuccess();
        onClose();
      } else {
        message.error(response.payload?.message || "Failed to create category");
      }
    } catch {
      message.error("Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add Category"
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
          label="Category Name"
          rules={[{ required: true, message: "Category name required" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item name="parent_category_id" label="Parent Category (optional)">
          <Select
            allowClear
            showSearch
            placeholder="Leave empty for a top-level category"
            optionFilterProp="label"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddCategoryModal;
