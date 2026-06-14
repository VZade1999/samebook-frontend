import React, { useEffect, useState } from "react";
import { Form, Row, Col, Select, Input, Card, Empty, Space } from "antd";
import { StorageService } from "@/storage";

const PaymentDetailsComponent: React.FC = () => {
  const form = Form.useFormInstance();
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Load bank accounts on mount
  useEffect(() => {
    const storageService = new StorageService();
    const companyDetails = storageService.getItem(
      StorageService.STORAGE_KEYS.COMPANY_DETAILS,
    );
    if (companyDetails) {
      try {
        const company = JSON.parse(companyDetails);
        if (company?.bank_accounts) {
          setBankAccounts(company.bank_accounts);
        }
      } catch (error) {
        console.error("Error parsing company details:", error);
      }
    }
  }, []);

  // Handle bank selection and auto-populate fields
  const handleBankChange = (bankId: number) => {
    setSelectedBankId(bankId);
    const selectedBank = bankAccounts.find((b) => b.id === bankId);

    if (selectedBank && form) {
      form.setFieldsValue({
        paymentBankId: bankId,
        paymentBankName: selectedBank.bank_name || "",
        paymentAccountHolder: selectedBank.account_holder_name || "",
        paymentAccountNumber: selectedBank.account_number || "",
        paymentIFSC: selectedBank.ifsc_code || "",
        paymentBranchName: selectedBank.branch_name || "",
        paymentBranchAddress: selectedBank.branch_address || "",
        paymentAccountType: selectedBank.account_type || "",
        paymentIsDefault: selectedBank.is_default || false,
      });
    }
  };

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);

  return (
    <Card title="Payment Details" size="small" style={{ marginBottom: 16 }}>
      <Form.Item name="paymentBankId" hidden>
        <Input />
      </Form.Item>

      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Form.Item label="Select Bank Account">
          <Select
            placeholder="Select a bank account from company details"
            onChange={handleBankChange}
            allowClear
            options={bankAccounts.map((bank) => ({
              label: `${bank.bank_name} - ${bank.account_holder_name} (${bank.account_number})`,
              value: bank.id,
            }))}
            value={selectedBankId || undefined}
          />
        </Form.Item>

        {selectedBank && (
          <>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Bank Name">
                  <Input
                    readOnly
                    value={selectedBank.bank_name || ""}
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Account Holder">
                  <Input
                    readOnly
                    value={selectedBank.account_holder_name || ""}
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Account Number">
                  <Input
                    readOnly
                    value={selectedBank.account_number || ""}
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="IFSC / Routing Code">
                  <Input
                    readOnly
                    value={selectedBank.ifsc_code || ""}
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Branch Name">
                  <Input
                    readOnly
                    value={selectedBank.branch_name || ""}
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Branch Address">
                  <Input
                    readOnly
                    value={selectedBank.branch_address || ""}
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Account Type">
                  <Input
                    readOnly
                    value={selectedBank.account_type || ""}
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {!selectedBankId && bankAccounts.length === 0 && (
          <Empty
            description="No bank accounts available in company details"
            style={{ padding: "20px 0" }}
          />
        )}
      </Space>
    </Card>
  );
};

export default PaymentDetailsComponent;
