import React, {
  useEffect,
  useState,
} from 'react';

import {
  Modal,
  Form,
  Input,
  Button,
  message,
} from 'antd';

import { useDispatch } from 'react-redux';

import { updateRole } from '../redux/rolesActions';

interface Props {
  visible: boolean;
  role: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditRoleModal: React.FC<Props> = ({
  visible,
  role,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();

  const dispatch = useDispatch();

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (visible && role) {
      form.setFieldsValue({
        name: role.name,
        description:
          role.description,
      });
    }
  }, [visible, role]);

  const handleSubmit = async (
    values: any,
  ) => {
    try {
      setLoading(true);

      const response = await dispatch(
        updateRole({
          id: role.id,
          payload: values,
        }) as any,
      );

      if (
        response.meta.requestStatus ===
        'fulfilled'
      ) {
        message.success(
          'Role updated successfully',
        );

        onSuccess();

        onClose();
      }
    } catch {
      message.error(
        'Failed to update role',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Edit Role"
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
          Update
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

export default EditRoleModal;