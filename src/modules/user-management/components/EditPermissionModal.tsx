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

import {
  updatePermission,
} from '../redux/permissionsActions';

interface Props {
  visible: boolean;
  permission: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditPermissionModal: React.FC<Props> = ({
  visible,
  permission,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();

  const dispatch = useDispatch();

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (
      visible &&
      permission
    ) {
      form.setFieldsValue({
        name: permission.name,
        description:
          permission.description,
      });
    }
  }, [
    visible,
    permission,
  ]);

  const handleSubmit = async (
    values: any,
  ) => {
    try {
      setLoading(true);

      const response = await dispatch(
        updatePermission({
          id: permission.id,
          payload: values,
        }) as any,
      );

      if (
        response.meta.requestStatus ===
        'fulfilled'
      ) {
        message.success(
          'Permission updated',
        );

        onSuccess();

        onClose();
      }
    } catch {
      message.error(
        'Failed to update permission',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Edit Permission"
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
          label="Permission"
          rules={[
            {
              required: true,
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

export default EditPermissionModal;