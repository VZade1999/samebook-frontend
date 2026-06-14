import React, { useEffect, useState } from "react";
import { Form, Row, Col, Select, Input, Card, Empty, Space } from "antd";
import { StorageService } from "@/storage";

const PaymentDetails: React.FC = () => {
  const form = Form.useFormInstance();
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

  useEffect(() => {
    const storage = new StorageService();
    const company = storage.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
    if (company) {
      try {
        const details = JSON.parse(company);
        if (details?.bank_accounts) {
          setBankAccounts(details.bank_accounts || []);
        }
      } catch (error) {
        console.error("Failed to parse company details from storage", error);
      }
    }

    const currentBankId = form.getFieldValue("paymentBankId");
    if (currentBankId !== undefined && currentBankId !== null) {
      setSelectedBankId(Number(currentBankId));
    }
  }, [form]);

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);

  useEffect(() => {
    if (!selectedBank) {
      return;
    }

    form.setFieldsValue({
      paymentBankName: selectedBank.bank_name || "",
      paymentAccountHolder: selectedBank.account_holder_name || "",
      paymentAccountNumber: selectedBank.account_number || "",
      paymentIFSC: selectedBank.ifsc_code || "",
      paymentBranchName: selectedBank.branch_name || "",
      paymentBranchAddress: selectedBank.branch_address || "",
      paymentAccountType: selectedBank.account_type || "",
      paymentIsDefault: selectedBank.is_default || false,
    });
  }, [selectedBank, form]);

  const handleBankChange = (bankId: number) => {
    setSelectedBankId(bankId);
    form.setFieldsValue({ paymentBankId: bankId });
  };

  return (
    <Card title="Payment Details" size="small">
      <Form.Item name="paymentBankId" hidden>
        <Input />
      </Form.Item>

      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Form.Item
          label="Select Bank Account"
          name="paymentBankId"
          rules={[{ required: true, message: 'Please select a bank account' }]}
        >
          <Select
            placeholder="Select a bank account"
            onChange={handleBankChange}
            options={bankAccounts.map((bank) => ({
              label: `${bank.bank_name} - ${bank.account_holder_name} (${bank.account_number})`,
              value: bank.id,
            }))}
            value={selectedBankId || undefined}
          />
        </Form.Item>

        {/* Hidden fields: keep values in form for payload, but don't render editable inputs */}
        <Form.Item name="paymentBankName" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="paymentAccountHolder" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="paymentAccountNumber" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="paymentIFSC" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="paymentBranchName" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="paymentBranchAddress" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="paymentAccountType" hidden>
          <Input />
        </Form.Item>

        {/* Display selected bank details as read-only text below the selector */}
        {selectedBankId && (
          <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4 }}>
            <div style={{ fontWeight: 600 }}>{selectedBank?.bank_name}</div>
            {selectedBank?.account_holder_name && (
              <div style={{ fontSize: 13, color: '#444' }}>Account Holder: {selectedBank.account_holder_name}</div>
            )}
            {selectedBank?.account_number && (
              <div style={{ fontSize: 13, color: '#444' }}>Account #: {selectedBank.account_number}</div>
            )}
            {selectedBank?.ifsc_code && (
              <div style={{ fontSize: 13, color: '#444' }}>IFSC: {selectedBank.ifsc_code}</div>
            )}
            {selectedBank?.branch_name && (
              <div style={{ fontSize: 13, color: '#444' }}>Branch: {selectedBank.branch_name}</div>
            )}
          </div>
        )}

        {bankAccounts.length === 0 && (
          <Empty
            description="No bank accounts available"
            style={{ padding: "20px 0" }}
          />
        )}
      </Space>
    </Card>
  );
};

export default PaymentDetails;
