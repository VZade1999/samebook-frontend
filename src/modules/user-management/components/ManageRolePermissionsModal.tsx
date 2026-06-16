import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Modal, Button, Spin, message, Input, Badge, Tooltip } from 'antd';
import {
  SearchOutlined,
  CheckOutlined,
  CloseOutlined,
  SaveOutlined,
   SafetyOutlined,
  CheckSquareOutlined,
  BorderOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { getPermissions } from '../redux/permissionsActions';
import { getRolePermissions, assignRolePermissions } from '../redux/rolesActions';

interface Props {
  visible: boolean;
  role: any;
  onClose: () => void;
}

// ─── Module colour map ───────────────────────────────────────────────────────

const MODULE_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  customers:  { bg: '#E6F1FB', color: '#185FA5', icon: '👥' },
  products:   { bg: '#EAF3DE', color: '#3B6D11', icon: '🛍️' },
  quotations: { bg: '#FAEEDA', color: '#854F0B', icon: '📄' },
  users:      { bg: '#EEEDFE', color: '#534AB7', icon: '👤' },
  roles:      { bg: '#FBEAF0', color: '#993556', icon: '🔐' },
  companies:  { bg: '#E1F5EE', color: '#0F6E56', icon: '🏢' },
  ai_agent:   { bg: '#FAECE7', color: '#993C1D', icon: '🤖' },
  dashboard:  { bg: '#F1EFE8', color: '#5F5E5A', icon: '📊' },
  general:    { bg: '#F1EFE8', color: '#5F5E5A', icon: '⚙️' },
};

function getModuleStyle(moduleName: string) {
  const key = moduleName.toLowerCase().replace(/\s+/g, '_');
  return MODULE_STYLES[key] ?? MODULE_STYLES.general;
}

// ─── Permission Item ─────────────────────────────────────────────────────────

const PermissionItem = React.memo(({
  permission,
  checked,
  onToggle,
}: {
  permission: any;
  checked: boolean;
  onToggle: (id: number) => void;
}) => (
  <div
    onClick={() => onToggle(permission.id)}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '7px 10px',
      borderRadius: 8,
      cursor: 'pointer',
      transition: 'background 0.12s',
      background: checked ? '#EAF3DE' : 'transparent',
    }}
    onMouseEnter={e => {
      if (!checked) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.background = checked ? '#EAF3DE' : 'transparent';
    }}
  >
    {/* Custom checkbox */}
    <div style={{
      width: 17,
      height: 17,
      borderRadius: 4,
      border: checked ? 'none' : '1.5px solid #d9d9d9',
      background: checked ? '#639922' : '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 0.15s',
    }}>
      {checked && <CheckOutlined style={{ fontSize: 10, color: '#fff' }} />}
    </div>

    <span style={{
      fontSize: 13,
      color: checked ? '#27500A' : 'rgba(0,0,0,0.85)',
      flex: 1,
      lineHeight: 1.4,
    }}>
      {permission.name}
    </span>
  </div>
));

// ─── Module Card ─────────────────────────────────────────────────────────────

const ModuleCard = React.memo(({
  moduleName,
  permissions,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  moduleName: string;
  permissions: any[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: (ids: number[], check: boolean) => void;
}) => {
  const style = getModuleStyle(moduleName);
  const ids = permissions.map(p => p.id);
  const selectedCount = ids.filter(id => selectedIds.has(id)).length;
  const allChecked = selectedCount === ids.length;
  const someChecked = selectedCount > 0 && !allChecked;

  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(0,0,0,0.1)',
      borderRadius: 12,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '0.5px solid rgba(0,0,0,0.07)',
        background: '#fafafa',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: style.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}>
            {style.icon}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
            {moduleName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11,
            color: 'rgba(0,0,0,0.45)',
            background: '#fff',
            border: '0.5px solid rgba(0,0,0,0.1)',
            borderRadius: 20,
            padding: '2px 8px',
          }}>
            {selectedCount}/{permissions.length}
          </span>
          <Tooltip title={allChecked ? 'Deselect all' : 'Select all'}>
            <Button
              type="text"
              size="small"
              icon={allChecked ? <CheckSquareOutlined style={{ color: '#639922' }} /> : <BorderOutlined />}
              onClick={() => onToggleAll(ids, !allChecked)}
              style={{ color: 'rgba(0,0,0,0.45)', padding: '0 4px' }}
            />
          </Tooltip>
        </div>
      </div>

      {/* Permissions list */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {permissions.map(p => (
          <PermissionItem
            key={p.id}
            permission={p}
            checked={selectedIds.has(p.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

const ManageRolePermissionsModal: React.FC<Props> = ({ visible, role, onClose }) => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const permissions: any[] = useSelector((state: any) => state.permissions.list || []);

  useEffect(() => {
    if (visible && role) loadData();
    if (!visible) setSearchQuery('');
  }, [visible, role]);

  const loadData = async () => {
    try {
      setLoading(true);
      await dispatch(getPermissions({ page: 1, limit: 1000 }) as any);
      const res = await dispatch(getRolePermissions(role.id) as any);
      const ids: number[] = res.payload?.permissions?.map((p: any) => p.id) || [];
      setSelectedIds(new Set(ids));
    } catch {
      message.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await dispatch(
        assignRolePermissions({ id: role.id, permission_ids: [...selectedIds] }) as any,
      );
      if (res.meta.requestStatus === 'fulfilled') {
        message.success('Permissions updated successfully');
        onClose();
      }
    } catch {
      message.error('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback((ids: number[], check: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => check ? next.add(id) : next.delete(id));
      return next;
    });
  }, []);

  const selectAll = () => setSelectedIds(new Set(permissions.map(p => p.id)));
  const clearAll = () => setSelectedIds(new Set());

  const groupedPermissions = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return permissions.reduce((acc: Record<string, any[]>, p: any) => {
      if (q && !p.name?.toLowerCase().includes(q)) return acc;
      const mod = p.module_name || 'General';
      (acc[mod] ??= []).push(p);
      return acc;
    }, {});
  }, [permissions, searchQuery]);

  const totalCount = permissions.length;
  const selectedCount = selectedIds.size;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width="min(960px, 96vw)"
      centered
      styles={{
        body: { padding: 0 },
        header: { display: 'none' },
        footer: { display: 'none' },
        content: { borderRadius: 16, overflow: 'hidden', padding: 0 },
      }}
      closeIcon={null}
    >
      {/* ── Custom header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#EAF3DE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <SafetyOutlined style={{ fontSize: 18, color: '#3B6D11' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,0.85)', lineHeight: 1.3 }}>
              Manage permissions
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 1 }}>
              Role: <strong style={{ color: 'rgba(0,0,0,0.65)' }}>{role?.name || '—'}</strong>
            </div>
          </div>
        </div>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{
            borderRadius: 8,
            border: '0.5px solid rgba(0,0,0,0.1)',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        borderBottom: '0.5px solid rgba(0,0,0,0.07)',
        background: '#fafafa',
        flexWrap: 'wrap',
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.3)' }} />}
          placeholder="Search permissions…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
          style={{ flex: 1, minWidth: 140, maxWidth: 280, borderRadius: 8, height: 34 }}
        />
        <Button
          size="small"
          icon={<CheckOutlined />}
          onClick={selectAll}
          style={{ borderRadius: 8, height: 34, padding: '0 12px', fontSize: 13 }}
        >
          Select all
        </Button>
        <Button
          size="small"
          icon={<CloseOutlined />}
          danger
          onClick={clearAll}
          style={{ borderRadius: 8, height: 34, padding: '0 12px', fontSize: 13 }}
        >
          Clear
        </Button>
        <span style={{
          marginLeft: 'auto',
          fontSize: 12,
          padding: '2px 10px',
          borderRadius: 20,
          background: '#EAF3DE',
          color: '#3B6D11',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          {selectedCount} selected
        </span>
      </div>

      {/* ── Body ── */}
      <Spin spinning={loading}>
        <div style={{
          maxHeight: 'min(460px, 55vh)',
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
          alignContent: 'start',
        }}>
          {Object.entries(groupedPermissions).map(([moduleName, modulePerms]) => (
            <ModuleCard
              key={moduleName}
              moduleName={moduleName}
              permissions={modulePerms as any[]}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
            />
          ))}

          {Object.keys(groupedPermissions).length === 0 && !loading && (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '40px 0',
              color: 'rgba(0,0,0,0.35)',
              fontSize: 14,
            }}>
              No permissions match "{searchQuery}"
            </div>
          )}
        </div>
      </Spin>

      {/* ── Footer ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderTop: '0.5px solid rgba(0,0,0,0.08)',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>
          <strong style={{ color: 'rgba(0,0,0,0.7)' }}>{selectedCount}</strong> of {totalCount} permissions selected
        </span>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <Button onClick={onClose} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={loading}
            icon={<SaveOutlined />}
            onClick={handleSave}
            style={{ borderRadius: 8 }}
          >
            Save permissions
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ManageRolePermissionsModal;