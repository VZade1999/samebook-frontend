
import React, { useEffect, useState } from 'react';

import {
  Modal,
  Select,
  Button,
  Spin,
  message,
  Form,
} from 'antd';

import { useDispatch, useSelector } from 'react-redux';

import { rolesService } from '../services/rolesService';
import api from '../../users/redux/instance';

interface Props {
  visible: boolean;
  user: any;
  onClose: () => void;
  onSuccess?: () => void;
}

const ManageUserRolesModal: React.FC<Props> = ({
  visible,
  user,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch();

  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);

  const [roles, setRoles] = useState<any[]>([]);

  const [selectedRoles, setSelectedRoles] =
    useState<number[]>([]);

  useEffect(() => {
    if (visible && user) {
      loadData();
    }
  }, [visible, user]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [rolesResponse, userRolesResponse] =
        await Promise.all([
          rolesService.listRoles(),
          api.get(`/users/${user.id}/roles`),
        ]);

      setRoles(rolesResponse.data.roles || []);

      const assignedRoles =
        userRolesResponse.data?.roles?.map(
          (role: any) => role.id,
        ) || [];

      setSelectedRoles(assignedRoles);

      form.setFieldsValue({
        role_ids: assignedRoles,
      });
    } catch (error) {
      message.error(
        'Failed to load roles',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      await api.post(
        `/users/${user.id}/roles`,
        {
          role_ids: selectedRoles,
        },
      );

      message.success(
        'Roles assigned successfully',
      );

      onSuccess?.();

      onClose();
    } catch (error) {
      message.error(
        'Failed to assign roles',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Manage Roles - ${
        user?.first_name || ''
      } ${user?.last_name || ''}`}
      open={visible}
      onCancel={onClose}
      width={600}
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
          onClick={handleSave}
        >
          Save
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="Assigned Roles"
            name="role_ids"
          >
            <Select
              mode="multiple"
              placeholder="Select roles"
              value={selectedRoles}
              onChange={(values) =>
                setSelectedRoles(
                  values,
                )
              }
              options={roles.map(
                (role: any) => ({
                  label: role.name,
                  value: role.id,
                }),
              )}
            />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ManageUserRolesModal;

