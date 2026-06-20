import React, { useState } from 'react';

import {
  Modal,
  Form,
  Input,
  Button,
  message,
} from 'antd';

import { useDispatch } from 'react-redux';

import {
  createPermission
} from '../redux/permissionsActions';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddPermissionModal: React.FC<Props> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();

  const dispatch = useDispatch();

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (
    values: any,
  ) => {
    try {
      setLoading(true);

      const response = await dispatch(
        createPermission(
          values,
        ) as any,
      );

      if (
        response.meta.requestStatus ===
        'fulfilled'
      ) {
        message.success(
          'Permission created',
        );

        form.resetFields();

        onSuccess();

        onClose();
      }
    } catch {
      message.error(
        'Failed to create permission',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add Permission"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button
          key="cancel"
          onClick={onClose}
        >
          Cancel
        </Button>,

        <Button
          key="save"
          type="primary"
          loading={loading}
          onClick={() =>
            form.submit()
          }
        >
          Create
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="name"
          label="Permission"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input placeholder="users.create" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddPermissionModal;