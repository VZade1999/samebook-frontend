import React, { useEffect, useState } from "react";
import { Form, Select, Input, Card, Empty, Space } from "antd";
import { StorageService } from "@/storage";

/* ─── Shared tokens ──────────────────────────────────────────────────────── */
const tokens = {
  navy: "#0F1F3D",
  navyMid: "#1A3560",
  surface: "#F8F9FC",
  surfaceCard: "#FFFFFF",
  border: "#E4E8F0",
  borderFocus: "#3B6FE8",
  accent: "#3B6FE8",
  accentLight: "#EBF0FD",
  text: "#0F1F3D",
  textMuted: "#6B7A99",
  textLight: "#A0ABBF",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  radius: "12px",
  radiusSm: "8px",
  shadow: "0 1px 3px rgba(15,31,61,0.06), 0 4px 16px rgba(15,31,61,0.06)",
};

const injectStyles = () => {
  const id = "pd-premium-styles";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    .pd-card .ant-card {
      border-radius: ${tokens.radius} !important;
      border: 1px solid ${tokens.border} !important;
      box-shadow: ${tokens.shadow} !important;
      overflow: hidden;
    }
    .pd-card .ant-card-head {
      background: linear-gradient(135deg, ${tokens.navy} 0%, ${tokens.navyMid} 100%) !important;
      border-bottom: none !important;
      padding: 0 !important;
      min-height: unset !important;
    }
    .pd-card .ant-card-head-title { padding: 0 !important; }
    .pd-card .ant-card-body { padding: 28px 28px 20px !important; }

    .pd-card .ant-form-item-label > label {
      font-size: 11.5px !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px !important;
      text-transform: uppercase !important;
      color: ${tokens.textMuted} !important;
    }
    .pd-card .ant-select-selector {
      border-radius: ${tokens.radiusSm} !important;
      border-color: ${tokens.border} !important;
      background: ${tokens.surface} !important;
      color: ${tokens.text} !important;
      font-size: 14px !important;
      transition: all 0.18s ease !important;
      min-height: 40px !important;
    }
    .pd-card .ant-select-focused .ant-select-selector {
      border-color: ${tokens.borderFocus} !important;
      box-shadow: 0 0 0 3px rgba(59,111,232,0.10) !important;
      background: #fff !important;
    }
    .pd-card .ant-select-selection-item {
      display: flex !important;
      align-items: center !important;
    }

    /* Bank detail card */
    .pd-bank-detail {
      background: linear-gradient(135deg, #F0F5FF 0%, #F8F9FC 100%);
      border: 1px solid #C7D8FA;
      border-radius: 10px;
      padding: 16px 20px;
      margin-top: 4px;
    }
    .pd-bank-name {
      font-size: 16px;
      font-weight: 700;
      color: ${tokens.navy};
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pd-bank-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
    }
    .pd-bank-field { }
    .pd-bank-field-label {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: ${tokens.textLight};
      margin-bottom: 2px;
    }
    .pd-bank-field-value {
      font-size: 13.5px;
      font-weight: 500;
      color: ${tokens.text};
    }
    .pd-ifsc-badge {
      display: inline-block;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 13px;
      font-weight: 600;
      color: ${tokens.accent};
      background: ${tokens.accentLight};
      padding: 2px 8px;
      border-radius: 5px;
      letter-spacing: 0.5px;
    }
    @media (max-width: 480px) {
      .pd-bank-grid { grid-template-columns: 1fr; }
      .pd-card .ant-card-body { padding: 20px 16px 14px !important; }
    }
  `;
  document.head.appendChild(s);
};
injectStyles();

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
        if (details?.bank_accounts) setBankAccounts(details.bank_accounts || []);
      } catch (error) {
        console.error("Failed to parse company details from storage", error);
      }
    }
    const currentBankId = form.getFieldValue("paymentBankId");
    if (currentBankId != null) setSelectedBankId(Number(currentBankId));
  }, [form]);

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
    <div className="pd-card">
      <Card
        bordered={false}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Payment Details</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11.5, marginTop: 2 }}>Bank account for this quotation</div>
            </div>
          </div>
        }
      >
        {/* Hidden form fields for payload */}
        <Form.Item name="paymentBankId" hidden><Input /></Form.Item>
        <Form.Item name="paymentBankName" hidden><Input /></Form.Item>
        <Form.Item name="paymentAccountHolder" hidden><Input /></Form.Item>
        <Form.Item name="paymentAccountNumber" hidden><Input /></Form.Item>
        <Form.Item name="paymentIFSC" hidden><Input /></Form.Item>
        <Form.Item name="paymentBranchName" hidden><Input /></Form.Item>
        <Form.Item name="paymentBranchAddress" hidden><Input /></Form.Item>
        <Form.Item name="paymentAccountType" hidden><Input /></Form.Item>

        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          <Form.Item
            label="Bank Account"
            name="paymentBankId"
            rules={[{ required: true, message: "Please select a bank account" }]}
            style={{ marginBottom: 0 }}
          >
            <Select
              placeholder="Select bank account"
              onChange={handleBankChange}
              value={selectedBankId || undefined}
              optionLabelProp="label"
            >
              {bankAccounts.map((bank) => (
                <Select.Option
                  key={bank.id}
                  value={bank.id}
                  label={
                    <span>
                      <strong>{bank.bank_name}</strong>
                      <span style={{ color: tokens.textMuted, marginLeft: 6, fontSize: 12 }}>
                        ···{String(bank.account_number || "").slice(-4)}
                      </span>
                    </span>
                  }
                >
                  <div style={{ padding: "2px 0" }}>
                    <div style={{ fontWeight: 600, color: tokens.text }}>{bank.bank_name}</div>
                    <div style={{ fontSize: 12, color: tokens.textMuted }}>
                      {bank.account_holder_name} · ···{String(bank.account_number || "").slice(-4)}
                      {bank.is_default ? <span style={{ marginLeft: 6, background: tokens.amberLight, color: tokens.amber, padding: "1px 5px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>DEFAULT</span> : null}
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedBankId && selectedBank && (
            <div className="pd-bank-detail">
              <div className="pd-bank-name">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tokens.accent} strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
                {selectedBank.bank_name}
                {selectedBank.is_default && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: tokens.amberLight, color: tokens.amber, padding: "2px 7px", borderRadius: 12, border: `1px solid #FDE68A` }}>DEFAULT</span>
                )}
              </div>
              <div className="pd-bank-grid">
                {selectedBank.account_holder_name && (
                  <div className="pd-bank-field">
                    <div className="pd-bank-field-label">Account Holder</div>
                    <div className="pd-bank-field-value">{selectedBank.account_holder_name}</div>
                  </div>
                )}
                {selectedBank.account_number && (
                  <div className="pd-bank-field">
                    <div className="pd-bank-field-label">Account Number</div>
                    <div className="pd-bank-field-value">{selectedBank.account_number}</div>
                  </div>
                )}
                {selectedBank.ifsc_code && (
                  <div className="pd-bank-field">
                    <div className="pd-bank-field-label">IFSC Code</div>
                    <div className="pd-bank-field-value"><span className="pd-ifsc-badge">{selectedBank.ifsc_code}</span></div>
                  </div>
                )}
                {selectedBank.account_type && (
                  <div className="pd-bank-field">
                    <div className="pd-bank-field-label">Account Type</div>
                    <div className="pd-bank-field-value">{selectedBank.account_type}</div>
                  </div>
                )}
                {selectedBank.branch_name && (
                  <div className="pd-bank-field">
                    <div className="pd-bank-field-label">Branch</div>
                    <div className="pd-bank-field-value">{selectedBank.branch_name}</div>
                  </div>
                )}
                {selectedBank.branch_address && (
                  <div className="pd-bank-field">
                    <div className="pd-bank-field-label">Branch Address</div>
                    <div className="pd-bank-field-value">{selectedBank.branch_address}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {bankAccounts.length === 0 && (
            <Empty description={<span style={{ color: tokens.textMuted }}>No bank accounts found in company details</span>} style={{ padding: "24px 0" }} />
          )}
        </Space>
      </Card>
    </div>
  );
};

export default PaymentDetails;