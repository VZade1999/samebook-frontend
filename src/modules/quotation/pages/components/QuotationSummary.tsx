import React, { useEffect, useState } from "react";
import {
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Typography,
} from "antd";
import dayjs from "dayjs";

const { TextArea } = Input;

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
  green: "#10B981",
  greenLight: "#ECFDF5",
  amber: "#F59E0B",
  radius: "12px",
  radiusSm: "8px",
  shadow: "0 1px 3px rgba(15,31,61,0.06), 0 4px 16px rgba(15,31,61,0.06)",
};

const injectStyles = () => {
  const id = "qs-premium-styles";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    .qs-card .ant-card {
      border-radius: ${tokens.radius} !important;
      border: 1px solid ${tokens.border} !important;
      box-shadow: ${tokens.shadow} !important;
      overflow: hidden;
    }
    .qs-card .ant-card-head {
      background: linear-gradient(135deg, ${tokens.navy} 0%, ${tokens.navyMid} 100%) !important;
      border-bottom: none !important;
      padding: 0 !important;
      min-height: unset !important;
    }
    .qs-card .ant-card-head-title { padding: 0 !important; }
    .qs-card .ant-card-body { padding: 24px 28px 20px !important; }

    .qs-card .ant-form-item-label > label {
      font-size: 11.5px !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px !important;
      text-transform: uppercase !important;
      color: ${tokens.textMuted} !important;
    }
    .qs-card .ant-input,
    .qs-card .ant-input-number,
    .qs-card .ant-input-number-input,
    .qs-card .ant-picker {
      border-radius: ${tokens.radiusSm} !important;
      border-color: ${tokens.border} !important;
      background: ${tokens.surface} !important;
      color: ${tokens.text} !important;
      font-size: 14px !important;
      transition: all 0.18s ease !important;
      width: 100% !important;
    }
    .qs-card .ant-input:focus,
    .qs-card .ant-input-number-focused {
      border-color: ${tokens.borderFocus} !important;
      box-shadow: 0 0 0 3px rgba(59,111,232,0.10) !important;
      background: #fff !important;
    }
    .qs-card .ant-input-number-disabled,
    .qs-card .ant-input-number-disabled .ant-input-number-input {
      background: ${tokens.surface} !important;
      color: ${tokens.textMuted} !important;
      cursor: default !important;
    }
    .qs-card textarea.ant-input { resize: none !important; }

    /* Tax breakdown pills */
    .qs-amount-hint {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: ${tokens.textMuted};
      margin-top: 5px;
      font-weight: 500;
    }
    .qs-amount-hint strong {
      color: ${tokens.text};
      font-weight: 700;
    }

    /* Grand total strip */
    .qs-grand-total {
      background: linear-gradient(135deg, ${tokens.navy} 0%, ${tokens.navyMid} 100%);
      border-radius: 10px;
      padding: 18px 24px;
      margin: 8px 0 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .qs-grand-total-label {
      color: rgba(255,255,255,0.7);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .qs-grand-total-amount {
      color: #fff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .qs-grand-total-breakdown {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .qs-breakdown-item {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .qs-breakdown-item-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.45);
    }
    .qs-breakdown-item-val {
      font-size: 13px;
      font-weight: 700;
      color: rgba(255,255,255,0.85);
    }

    /* Section divider */
    .qs-section-divider {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 20px 0 16px;
    }
    .qs-section-divider span {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: ${tokens.textLight};
      white-space: nowrap;
    }
    .qs-section-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: ${tokens.border};
    }

    @media (max-width: 575px) {
      .qs-card .ant-card-body { padding: 20px 16px 14px !important; }
      .qs-grand-total { padding: 14px 16px; }
      .qs-grand-total-amount { font-size: 22px; }
      .qs-grand-total-breakdown { display: none; }
    }
  `;
  document.head.appendChild(s);
};
injectStyles();

const CardHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "18px 24px",
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: "rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <div
        style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.55)",
          fontSize: 11.5,
          marginTop: 2,
        }}
      >
        {subtitle}
      </div>
    </div>
  </div>
);

const SectionDivider = ({ label }: { label: string }) => (
  <div className="qs-section-divider">
    <span>{label}</span>
  </div>
);

const fmt = (v: number) =>
  v.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const QuotationSummary = () => {
  const form = Form.useFormInstance();
  const [totals, setTotals] = useState({
    subTotal: 0,
    discount: 0,
    discountAmount: 0,
    gstAmount: 0,
    sgstAmount: 0,
    cgstAmount: 0,
    igstAmount: 0,
    transport: 0,
    grandTotal: 0,
  });

  const subTotal = Form.useWatch("subTotal", form);
  const discount = Form.useWatch("discount", form);
  const cgst = Form.useWatch("cgst", form);
  const sgst = Form.useWatch("sgst", form);
  const igst = Form.useWatch("igst", form);
  const transport = Form.useWatch("transport", form);
  const placeOfOrder = Form.useWatch("placeOfOrder", form);

  const isMaharashtra =
    String(placeOfOrder || "")
      .trim()
      .toLowerCase() === "maharashtra";

  useEffect(() => {
    const sub = Number(subTotal) || 0;
    const discountPercent = Number(discount) || 0;
    const cgstPercent = Number(cgst) || 0;
    const sgstPercent = Number(sgst) || 0;
    const igstPercent = Number(igst) || 0;
    const transportCharges = Number(transport) || 0;

    const discountAmount = (sub * discountPercent) / 100;
    const subtotalAfterDiscount = sub - discountAmount;
    const cgstAmount = isMaharashtra
      ? (subtotalAfterDiscount * cgstPercent) / 100
      : 0;
    const sgstAmount = isMaharashtra
      ? (subtotalAfterDiscount * sgstPercent) / 100
      : 0;
    const igstAmount = isMaharashtra
      ? 0
      : (subtotalAfterDiscount * igstPercent) / 100;
    const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
    const grandTotal =
      subtotalAfterDiscount + totalTaxAmount + transportCharges;
    const combinedTaxPercent = isMaharashtra
      ? cgstPercent + sgstPercent
      : igstPercent;

    const safe = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    setTotals({
      subTotal: safe(sub),
      discount: safe(discountPercent),
      discountAmount: parseFloat(safe(discountAmount).toFixed(2)),
      gstAmount: parseFloat(safe(totalTaxAmount).toFixed(2)),
      sgstAmount: parseFloat(safe(sgstAmount).toFixed(2)),
      cgstAmount: parseFloat(safe(cgstAmount).toFixed(2)),
      igstAmount: parseFloat(safe(igstAmount).toFixed(2)),
      transport: safe(transportCharges),
      grandTotal: parseFloat(safe(grandTotal).toFixed(2)),
    });

    form?.setFieldsValue({
      subTotal: safe(sub),
      discount: safe(discountPercent),
      gst: safe(combinedTaxPercent),
      transport: safe(transportCharges),
    });
  }, [subTotal, discount, cgst, sgst, igst, transport, placeOfOrder, form]);

  return (
    <>
      {/* ─── Summary card ─── */}
      <div className="qs-card">
        <Card
          bordered={false}
          title={
            <CardHeader
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              }
              title="Quotation Summary"
              subtitle="Pricing, taxes & grand total"
            />
          }
        >
          <Row gutter={[16, 0]}>
            {/* Sub-total */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Sub Total (₹)" name="subTotal">
                <InputNumber min={0} step={0.01} disabled placeholder="0.00" />
              </Form.Item>
            </Col>

            {/* Discount */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Discount (%)" name="discount">
                <InputNumber min={0} max={100} step={0.01} placeholder="0" />
              </Form.Item>
              {totals.discountAmount > 0 && (
                <div className="qs-amount-hint">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 12V22H4V12" />
                    <path d="M22 7H2v5h20V7z" />
                    <path d="M12 22V7" />
                    <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                  </svg>
                  Saves <strong>₹{fmt(totals.discountAmount)}</strong>
                </div>
              )}
            </Col>

            {/* Tax */}
            <Col xs={24} sm={12} md={6}>
              {isMaharashtra ? (
                <>
                  <Form.Item label="CGST (%)" name="cgst">
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.01}
                      placeholder="9"
                    />
                  </Form.Item>
                  <Form.Item
                    label="SGST (%)"
                    name="sgst"
                    style={{ marginTop: 8 }}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.01}
                      placeholder="9"
                    />
                  </Form.Item>
                  {(totals.cgstAmount > 0 || totals.sgstAmount > 0) && (
                    <div style={{ marginTop: 5 }}>
                      <div className="qs-amount-hint">
                        CGST <strong>₹{fmt(totals.cgstAmount)}</strong>
                      </div>
                      <div className="qs-amount-hint">
                        SGST <strong>₹{fmt(totals.sgstAmount)}</strong>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Form.Item label="IGST (%)" name="igst">
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.01}
                      placeholder="18"
                    />
                  </Form.Item>
                  {totals.igstAmount > 0 && (
                    <div className="qs-amount-hint">
                      IGST <strong>₹{fmt(totals.igstAmount)}</strong>
                    </div>
                  )}
                </>
              )}
            </Col>

            {/* Transport */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Transport (₹)" name="transport">
                <InputNumber min={0} step={0.01} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>

          {/* Grand total strip */}
          <div className="qs-grand-total">
            <div>
              <div className="qs-grand-total-label">Grand Total</div>
              <div className="qs-grand-total-amount">
                ₹{fmt(totals.grandTotal)}
              </div>
            </div>
            <div className="qs-grand-total-breakdown">
              {totals.discountAmount > 0 && (
                <div className="qs-breakdown-item">
                  <span className="qs-breakdown-item-label">Discount</span>
                  <span className="qs-breakdown-item-val">
                    −₹{fmt(totals.discountAmount)}
                  </span>
                </div>
              )}
              {totals.gstAmount > 0 && (
                <div className="qs-breakdown-item">
                  <span className="qs-breakdown-item-label">Tax</span>
                  <span className="qs-breakdown-item-val">
                    +₹{fmt(totals.gstAmount)}
                  </span>
                </div>
              )}
              {totals.transport > 0 && (
                <div className="qs-breakdown-item">
                  <span className="qs-breakdown-item-label">Transport</span>
                  <span className="qs-breakdown-item-val">
                    +₹{fmt(totals.transport)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Terms card ─── */}
      <div className="qs-card" style={{ marginTop: 16 }}>
        <Card
          bordered={false}
          title={
            <CardHeader
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              }
              title="Terms & Conditions"
              subtitle="Validity, delivery & additional notes"
            />
          }
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Valid Until" name="validity_date"  >
                <DatePicker
                  style={{ width: "100%" }}
                  placeholder="Select expiry date"
                  disabledDate={(current) =>
                    current && current <= dayjs().endOf("day")
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Delivery Time" name="deliveryTime">
                <Input
                  placeholder="e.g. Within 5 working days"
                  prefix={
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={tokens.textLight}
                      strokeWidth="1.8"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Additional Notes" name="notes">
            <TextArea
              rows={4}
              placeholder="Payment terms, warranty, special conditions…"
            />
          </Form.Item>
        </Card>
      </div>
    </>
  );
};

export default QuotationSummary;
