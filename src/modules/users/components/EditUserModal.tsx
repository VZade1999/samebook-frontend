import React, { useEffect, useState } from 'react';
import { Form, Input, Modal, Select, Button, message, Spin } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser, getRoles } from '../redux/usersActions';

interface EditUserModalProps {
  visible: boolean;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  user,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [submitting, setSubmitting] = useState(false);

  const { roles, rolesLoading } = useSelector((state: any) => state.users);

  useEffect(() => {
    if (visible && roles.length === 0) {
      dispatch(getRoles() as any);
    }
  }, [visible, roles.length, dispatch]);

  useEffect(() => {
    if (visible && user) {
      form.setFieldsValue({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role_ids: user.roles?.map((r: any) => r.id),
      });
    }
  }, [visible, user, form]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await dispatch(
        updateUser({ id: user.id, payload: values }) as any,
      );
      if (response.payload?.id) {
        message.success('User updated successfully');
        onSuccess();
        onClose();
      }
    } catch (error) {
      message.error('Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Edit User"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={() => form.submit()}
        >
          Update User
        </Button>,
      ]}
    >
      <Spin spinning={rolesLoading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark="optional"
        >
          <Form.Item
            name="first_name"
            label="First Name"
            rules={[{ required: true, message: 'Please enter first name' }]}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>

          <Form.Item
            name="last_name"
            label="Last Name"
            rules={[{ required: true, message: 'Please enter last name' }]}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter valid email' },
            ]}
          >
            <Input placeholder="Enter email" type="email" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <Input placeholder="Enter phone number" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password (Leave blank to keep current)"
            rules={[
              {
                min: 6,
                message: 'Password must be at least 6 characters',
              },
            ]}
          >
            <Input.Password placeholder="Enter new password (optional)" />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default EditUserModal;
