import React from 'react';

import {
  Modal,
  Form,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Button,
} from 'antd';

import dayjs from 'dayjs';

interface Props {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
}

const PaymentModal: React.FC<Props> = ({
  visible,
  loading,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Add Payment"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,

        <Button
          key="save"
          type="primary"
          loading={loading}
          onClick={() => form.submit()}
        >
          Save Payment
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Form.Item
          name="payment_date"
          label="Payment Date"
          initialValue={dayjs()}
          rules={[{ required: true }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount"
          rules={[{ required: true }]}
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="payment_mode"
          label="Payment Method"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              {
                label: 'Cash',
                value: 'CASH',
              },
              {
                label: 'Bank Transfer',
                value: 'BANK_TRANSFER',
              },
              {
                label: 'UPI',
                value: 'UPI',
              },
              {
                label: 'Cheque',
                value: 'CHEQUE',
              },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="transaction_reference"
          label="Reference"
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PaymentModal;