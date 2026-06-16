import React, { useEffect, useState } from 'react';
import { Form, Input, Modal, Select, Button, message, Spin } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { createUser, getRoles } from '../redux/usersActions';

interface AddUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({
  visible,
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

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await dispatch(createUser(values) as any);

      if (response.meta.requestStatus === 'fulfilled') {
        message.success('User created successfully');
        form.resetFields();
        onSuccess();
        onClose();
        return;
      }

      const errorMessage =
        response.payload?.message || response.error?.message ||
        'Failed to create user';
      message.error(errorMessage);
    } catch (error) {
      message.error('Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Create New User"
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
          Create User
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
            label="Password"
            rules={[
              { required: true, message: 'Please enter password' },
              {
                min: 6,
                message: 'Password must be at least 6 characters',
              },
            ]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

        </Form>
      </Spin>
    </Modal>
  );
};

export default AddUserModal;
