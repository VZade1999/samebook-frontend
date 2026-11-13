import React, { useEffect, useState } from "react";
import { Empty, Form, Input, Select, Spin } from "antd";
import { BankOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { StorageService } from "@/storage";
import FormSection from "./FormSection";

const last4 = (n: any) => String(n || "").slice(-4);
const grouped = (n: any) => String(n || "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

const PaymentDetails: React.FC = () => {
  const form = Form.useFormInstance();
  // Company details (including bank_accounts) are fetched by the Business
  // section and land in the same Redux slice; stay reactive to it so the
  // accounts show up whenever they arrive.
  const companyState = useSelector((state: any) => state.companies || {});
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const formBankId = Form.useWatch("paymentBankId", form);

  // Synchronous seed from storage so a returning user doesn't see an empty flash.
  useEffect(() => {
    const storage = new StorageService();
    const company = storage.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
    if (company) {
      try {
        const details = JSON.parse(company);
        if (details?.bank_accounts) setBankAccounts(details.bank_accounts || []);
      } catch (error) {
        console.error("Failed to parse company details from storage", error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const details = companyState?.companyDetails;
    if (details?.bank_accounts) setBankAccounts(details.bank_accounts || []);
  }, [companyState?.companyDetails]);

  // Follow the form (edit fills paymentBankId after this mounts).
  useEffect(() => {
    if (formBankId != null && formBankId !== "") setSelectedBankId(Number(formBankId));
  }, [formBankId]);

  const bankAccountsLoading = !!companyState?.loading && bankAccounts.length === 0;
  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);

  useEffect(() => {
    if (!selectedBank) return;
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
    <FormSection id="qf-payment" step={6} icon={<BankOutlined />} title="Payment details" sub="The bank account your customer pays into">
      {/* Hidden fields for the payload */}
      <Form.Item name="paymentBankName" hidden><Input /></Form.Item>
      <Form.Item name="paymentAccountHolder" hidden><Input /></Form.Item>
      <Form.Item name="paymentAccountNumber" hidden><Input /></Form.Item>
      <Form.Item name="paymentIFSC" hidden><Input /></Form.Item>
      <Form.Item name="paymentBranchName" hidden><Input /></Form.Item>
      <Form.Item name="paymentBranchAddress" hidden><Input /></Form.Item>
      <Form.Item name="paymentAccountType" hidden><Input /></Form.Item>

      <Form.Item label="Bank account" name="paymentBankId" rules={[{ required: true, message: "Pick the bank account to print" }]}>
        <Select
          placeholder={bankAccountsLoading ? "Loading bank accounts…" : "Select bank account"}
          loading={bankAccountsLoading}
          onChange={handleBankChange}
          optionLabelProp="label"
          notFoundContent={bankAccountsLoading ? <Spin size="small" /> : "No bank accounts — add one under My Company"}
        >
          {bankAccounts.map((bank) => (
            <Select.Option
              key={bank.id}
              value={bank.id}
              label={
                <span>
                  <strong>{bank.bank_name}</strong> ···{last4(bank.account_number)}
                </span>
              }
            >
              <div className="qf-opt">
                <b>
                  {bank.bank_name} ···{last4(bank.account_number)}
                </b>
                <small>
                  {bank.account_holder_name}
                  {bank.is_default ? <span className="qf-tag">Default</span> : null}
                </small>
              </div>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      {selectedBank ? (
        <div className="pd-bank">
          <div className="pd-bank-top">
            <b>{selectedBank.bank_name}</b>
            {selectedBank.is_default ? <span className="pd-default">Default</span> : null}
          </div>
          <div className="pd-acct">{grouped(selectedBank.account_number) || "—"}</div>
          <div className="pd-grid">
            {selectedBank.account_holder_name && (
              <div>
                <span>Account holder</span>
                <b>{selectedBank.account_holder_name}</b>
              </div>
            )}
            {selectedBank.ifsc_code && (
              <div>
                <span>IFSC</span>
                <b className="qp-mono">{selectedBank.ifsc_code}</b>
              </div>
            )}
            {selectedBank.account_type && (
              <div>
                <span>Type</span>
                <b>{selectedBank.account_type}</b>
              </div>
            )}
            {selectedBank.branch_name && (
              <div>
                <span>Branch</span>
                <b>{selectedBank.branch_name}</b>
              </div>
            )}
          </div>
        </div>
      ) : (
        !bankAccountsLoading &&
        bankAccounts.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No bank accounts in your company details" />
      )}
    </FormSection>
  );
};

export default PaymentDetails;
