import React, { useEffect, useState } from "react";
import {
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Typography,
} from "antd";

const { TextArea } = Input;
const { Title } = Typography;

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

  // Watch form values and calculate totals
  const subTotal = Form.useWatch("subTotal", form);
  const discount = Form.useWatch("discount", form);
  const cgst = Form.useWatch("cgst", form);
  const sgst = Form.useWatch("sgst", form);
  const igst = Form.useWatch("igst", form);
  const transport = Form.useWatch("transport", form);
  const placeOfOrder = Form.useWatch("placeOfOrder", form);

  useEffect(() => {
    const calculateTotals = () => {
      const sub = Number(subTotal) || 0;
      const discountPercent = Number(discount) || 0;
      const cgstPercent = Number(cgst) || 0;
      const sgstPercent = Number(sgst) || 0;
      const igstPercent = Number(igst) || 0;
      const transportCharges = Number(transport) || 0;

      const isMaharashtra =
        String(placeOfOrder || "").trim().toLowerCase() === "maharashtra";

      // Calculate discount amount
      const discountAmount = (sub * discountPercent) / 100;

      // Calculate subtotal after discount
      const subtotalAfterDiscount = sub - discountAmount;

      // Calculate tax amounts
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
      const combinedTaxPercent = isMaharashtra
        ? cgstPercent + sgstPercent
        : igstPercent;

      // Calculate grand total
      const grandTotal = subtotalAfterDiscount + totalTaxAmount + transportCharges;

      const safe = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const discountAmountSafe = safe(discountAmount);
      const totalTaxAmountSafe = safe(totalTaxAmount);
      const sgstAmountSafe = safe(sgstAmount);
      const cgstAmountSafe = safe(cgstAmount);
      const igstAmountSafe = safe(igstAmount);
      const grandTotalSafe = safe(grandTotal);

      setTotals({
        subTotal: safe(sub),
        discount: safe(discountPercent),
        discountAmount: parseFloat(discountAmountSafe.toFixed(2)),
        gstAmount: parseFloat(totalTaxAmountSafe.toFixed(2)),
        sgstAmount: parseFloat(sgstAmountSafe.toFixed(2)),
        cgstAmount: parseFloat(cgstAmountSafe.toFixed(2)),
        igstAmount: parseFloat(igstAmountSafe.toFixed(2)),
        transport: safe(transportCharges),
        grandTotal: parseFloat(grandTotalSafe.toFixed(2)),
      });

      // Keep legacy GST field synced for payload compatibility
      form?.setFieldsValue({
        subTotal: safe(sub),
        discount: safe(discountPercent),
        gst: safe(combinedTaxPercent),
        transport: safe(transportCharges),
      });
    };

    calculateTotals();
  }, [subTotal, discount, cgst, sgst, igst, transport, placeOfOrder, form]);

  return (
    <>
      {/* Total Calculations */}
      <Card title="Quotation Summary" className="section-card">
        <Row gutter={20}>
          <Col xs={24} md={6}>
            <Form.Item label="Sub Total" name="subTotal">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="0.00"
                min={0}
                step={0.01}
                disabled
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={6}>
            <Form.Item label="Discount (%)" name="discount">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="0"
                min={0}
                max={100}
                step={0.01}
              />
            </Form.Item>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
              Amount: ₹{totals.discountAmount}
            </div>
          </Col>

          <Col xs={24} md={6}>
            {String(placeOfOrder || "").trim().toLowerCase() === "maharashtra" ? (
              <>
                <Form.Item label="CGST (%)" name="cgst">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="9"
                    min={0}
                    max={100}
                    step={0.01}
                  />
                </Form.Item>
                <Form.Item label="SGST (%)" name="sgst">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="9"
                    min={0}
                    max={100}
                    step={0.01}
                  />
                </Form.Item>
                <div
                  style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}
                >
                  <div>CGST Amount: ₹{totals.cgstAmount}</div>
                  <div>SGST Amount: ₹{totals.sgstAmount}</div>
                </div>
              </>
            ) : (
              <>
                <Form.Item label="IGST (%)" name="igst">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="18"
                    min={0}
                    max={100}
                    step={0.01}
                  />
                </Form.Item>
                <div
                  style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}
                >
                  <div>IGST Amount: ₹{totals.igstAmount}</div>
                </div>
              </>
            )}
          </Col>

          <Col xs={24} md={6}>
            <Form.Item label="Transport Charges" name="transport">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <div
          className="grand-total"
          style={{ textAlign: "right", marginBottom: "16px" }}
        >
          <Title level={3} style={{ marginBottom: 0 }}>
            Grand Total: ₹{totals.grandTotal}
          </Title>
        </div>
      </Card>

      {/* Terms & Conditions */}
      <Card title="Terms & Conditions" className="section-card">
        <Row gutter={20}>
          <Col xs={24} md={12}>
            <Form.Item label="Quotation Validity" name="validity_date">
              <DatePicker style={{ width: "100%" }} placeholder="Select expiry date" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Delivery Time" name="deliveryTime">
              <Input placeholder="Ex: Within 5 working days" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Additional Notes" name="notes">
          <TextArea rows={4} placeholder="Enter quotation notes..." />
        </Form.Item>
      </Card>
    </>
  );
};

export default QuotationSummary;
