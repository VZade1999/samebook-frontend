import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  message,
} from 'antd';

import { useDispatch } from 'react-redux';

import { createRole } from '../redux/rolesActions';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddRoleModal: React.FC<Props> = ({
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
        createRole(values) as any,
      );

      if (
        response.meta.requestStatus ===
        'fulfilled'
      ) {
        message.success(
          'Role created successfully',
        );

        form.resetFields();

        onSuccess();

        onClose();
      }
    } catch {
      message.error(
        'Failed to create role',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add Role"
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
          label="Role Name"
          rules={[
            {
              required: true,
              message:
                'Role name required',
            },
          ]}
        >
          <Input />
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

export default AddRoleModal;