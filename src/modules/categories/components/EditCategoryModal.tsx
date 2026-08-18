import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Button, message } from "antd";
import { useDispatch } from "react-redux";
import { updateCategory } from "../redux/categoriesActions";

interface Props {
  visible: boolean;
  category: any;
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const EditCategoryModal: React.FC<Props> = ({ visible, category, categories, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && category) {
      form.setFieldsValue({
        name: category.name,
        description: category.description,
        parent_category_id: category.parent_category_id ?? undefined,
      });
    }
  }, [visible, category, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const response = await dispatch(
        updateCategory({ id: category.id, payload: values }) as any,
      );
      if (response.meta.requestStatus === "fulfilled") {
        message.success("Category updated successfully");
        onSuccess();
        onClose();
      } else {
        message.error(response.payload?.message || "Failed to update category");
      }
    } catch {
      message.error("Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  const options = categories
    .filter((c) => c.id !== category?.id)
    .map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal
      title="Edit Category"
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
            options={options}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditCategoryModal;
