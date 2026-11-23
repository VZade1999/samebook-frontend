import React, { useEffect, useState } from "react";
import { Checkbox, Form, Input, message, Modal, Spin } from "antd";
import { HomeOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { type WarehouseCard, apiError, createWarehouse, updateWarehouse } from "./stockApi";

type Values = { name: string; address?: string; city?: string; state?: string; is_default?: boolean };

/** Add a warehouse, or edit one's name and address. */
const WarehouseForm: React.FC<{ open: boolean; warehouse: WarehouseCard | null; first: boolean; onClose: (saved: boolean) => void }> = ({ open, warehouse, first, onClose }) => {
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  const editing = !!warehouse;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(
      warehouse
        ? { name: warehouse.name, address: warehouse.address || "", city: warehouse.city || "", state: warehouse.state || "", is_default: warehouse.is_default }
        : { is_default: first },
    );
  }, [open, warehouse, first, form]);

  const save = async () => {
    let v: Values;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    const body = { name: v.name.trim(), address: v.address?.trim() || "", city: v.city?.trim() || "", state: v.state?.trim() || "", is_default: !!v.is_default };
    setSaving(true);
    try {
      const r = editing ? await updateWarehouse(warehouse!.id, body) : await createWarehouse(body);
      message.success(r?.message || (editing ? "Saved" : "Warehouse added"));
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the warehouse"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onCancel={() => onClose(false)} footer={null} closable={false} width={520} destroyOnHidden className="pc-dialog" rootClassName="pc-portal" centered>
      <div className="pc-dlg-head">
        <span className="pc-thumb">
          <HomeOutlined />
        </span>
        <div>
          <h3>{editing ? "Edit warehouse" : "Add a warehouse"}</h3>
          <p>{editing ? warehouse!.name : "A godown, shop or site store where you keep goods."}</p>
        </div>
        <button type="button" className="pc-x" onClick={() => onClose(false)} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="pc-dlg-body">
        <Form form={form} layout="vertical" requiredMark="optional" onFinish={save}>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Give it a name" }, { max: 255 }]}>
            <Input placeholder="e.g. Main godown, Wakad shop" autoFocus maxLength={255} />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ max: 255 }]}>
            <Input placeholder="Street, area" maxLength={255} />
          </Form.Item>
          <div className="pc-grid">
            <Form.Item name="city" label="City" rules={[{ max: 100 }]}>
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="state" label="State" rules={[{ max: 100 }]}>
              <Input maxLength={100} />
            </Form.Item>
          </div>
          <Form.Item name="is_default" valuePropName="checked" extra="New stock and new products go here unless you pick another.">
            <Checkbox disabled={editing && warehouse!.is_default}>Make this the default warehouse</Checkbox>
          </Form.Item>
        </Form>
      </div>
      <div className="pc-dlg-foot">
        <span className="pc-foot-gap" />
        <button type="button" className="pc-btn ghost" onClick={() => onClose(false)} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="pc-btn primary" onClick={save} disabled={saving}>
          {saving ? <Spin size="small" /> : editing ? <SaveOutlined /> : <PlusOutlined />} {editing ? "Save" : "Add warehouse"}
        </button>
      </div>
    </Modal>
  );
};

export default WarehouseForm;
