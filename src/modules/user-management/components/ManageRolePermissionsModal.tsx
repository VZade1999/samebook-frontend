
import React, { useEffect, useState } from 'react';

import {
  Modal,
  Checkbox,
  Button,
  Spin,
  message,
  Typography,
  Divider,
} from 'antd';

import { useDispatch, useSelector } from 'react-redux';

import {
  getPermissions,
} from '../redux/permissionsActions';

import {
  getRolePermissions,
  assignRolePermissions,
} from '../redux/rolesActions';

const { Title } = Typography;

interface Props {
  visible: boolean;
  role: any;
  onClose: () => void;
}

const ManageRolePermissionsModal: React.FC<Props> = ({
  visible,
  role,
  onClose,
}) => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  const [selectedPermissions, setSelectedPermissions] =
    useState<number[]>([]);

  const permissions = useSelector(
    (state: any) => state.permissions.list,
  );

  const rolePermissions = useSelector(
    (state: any) =>
      state.roles.selectedRolePermissions,
  );

  useEffect(() => {
    if (!visible || !role) return;

    loadData();
  }, [visible, role]);

  const loadData = async () => {
    try {
      setLoading(true);

      await dispatch(
        getPermissions({
          page: 1,
          limit: 1000,
        }) as any,
      );

      const response = await dispatch(
        getRolePermissions(role.id) as any,
      );

      const assigned =
        response.payload?.permissions?.map(
          (item: any) => item.id,
        ) || [];

      setSelectedPermissions(assigned);
    } catch {
      message.error(
        'Failed to load permissions',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const response = await dispatch(
        assignRolePermissions({
          id: role.id,
          permission_ids:
            selectedPermissions,
        }) as any,
      );

      if (
        response.meta.requestStatus ===
        'fulfilled'
      ) {
        message.success(
          'Permissions updated successfully',
        );

        onClose();
      }
    } catch {
      message.error(
        'Failed to update permissions',
      );
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions =
    permissions.reduce(
      (
        acc: Record<string, any[]>,
        permission: any,
      ) => {
        const module =
          permission.name?.split('.')[0] ||
          'General';

        if (!acc[module]) {
          acc[module] = [];
        }

        acc[module].push(permission);

        return acc;
      },
      {},
    );

  return (
    <Modal
      title={`Manage Permissions - ${
        role?.name || ''
      }`}
      open={visible}
      onCancel={onClose}
      width={800}
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
        {Object.keys(
          groupedPermissions,
        ).map((module) => (
          <div key={module}>
            <Title
              level={5}
              style={{
                marginTop: 16,
              }}
            >
              {module.toUpperCase()}
            </Title>

            <Checkbox.Group
              style={{
                width: '100%',
              }}
              value={
                selectedPermissions
              }
              onChange={(values) =>
                setSelectedPermissions(
                  values as number[],
                )
              }
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(2,1fr)',
                  gap: 8,
                }}
              >
                {groupedPermissions[
                  module
                ].map(
                  (
                    permission: any,
                  ) => (
                    <Checkbox
                      key={
                        permission.id
                      }
                      value={
                        permission.id
                      }
                    >
                      {
                        permission.name
                      }
                    </Checkbox>
                  ),
                )}
              </div>
            </Checkbox.Group>

            <Divider />
          </div>
        ))}
      </Spin>
    </Modal>
  );
};

export default ManageRolePermissionsModal;

