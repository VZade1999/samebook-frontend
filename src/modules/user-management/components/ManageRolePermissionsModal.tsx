
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Checkbox,
  Button,
  Spin,
  message,
  Card,
  Row,
  Col,
} from 'antd';

import { useDispatch, useSelector } from 'react-redux';

import { getPermissions } from '../redux/permissionsActions';

import {
  getRolePermissions,
  assignRolePermissions,
} from '../redux/rolesActions';

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
    (state: any) => state.permissions.list || [],
  );

  useEffect(() => {
    if (visible && role) {
      loadData();
    }
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

      const assignedIds =
        response.payload?.permissions?.map(
          (permission: any) => permission.id,
        ) || [];

      setSelectedPermissions(assignedIds);
    } catch (error) {
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
          permission_ids: selectedPermissions,
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
    } catch (error) {
      message.error(
        'Failed to update permissions',
      );
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = useMemo(() => {
    return permissions.reduce(
      (
        acc: Record<string, any[]>,
        permission: any,
      ) => {
        const moduleName =
          permission.module_name ||
          'General';

        if (!acc[moduleName]) {
          acc[moduleName] = [];
        }

        acc[moduleName].push(permission);

        return acc;
      },
      {},
    );
  }, [permissions]);

  return (
    <Modal
      title={`Manage Permissions - ${
        role?.name || ''
      }`}
      open={visible}
      onCancel={onClose}
      width={1000}
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
          Save Permissions
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {Object.entries(
            groupedPermissions,
          ).map(
            ([
              moduleName,
              modulePermissions,
            ]) => (
              <Col
                xs={24}
                md={12}
                key={moduleName}
              >
                <Card
                  title={moduleName}
                  size="small"
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: 8,
                    }}
                  >
                    {(
                      modulePermissions as any[]
                    ).map(
                      (
                        permission: any,
                      ) => (
                        <Checkbox
                          key={
                            permission.id
                          }
                          checked={selectedPermissions.includes(
                            permission.id,
                          )}
                          onChange={(
                            e,
                          ) => {
                            if (
                              e.target
                                .checked
                            ) {
                              setSelectedPermissions(
                                (
                                  prev,
                                ) => [
                                  ...prev,
                                  permission.id,
                                ],
                              );
                            } else {
                              setSelectedPermissions(
                                (
                                  prev,
                                ) =>
                                  prev.filter(
                                    (
                                      id,
                                    ) =>
                                      id !==
                                      permission.id,
                                  ),
                              );
                            }
                          }}
                        >
                          {
                            permission.name
                          }
                        </Checkbox>
                      ),
                    )}
                  </div>
                </Card>
              </Col>
            ),
          )}
        </Row>
      </Spin>
    </Modal>
  );
};

export default ManageRolePermissionsModal;

