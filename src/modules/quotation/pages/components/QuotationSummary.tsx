import React, { useEffect, useState } from "react";
import {
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
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
    transport: 0,
    grandTotal: 0,
  });

  // Watch form values and calculate totals
  const subTotal = Form.useWatch("subTotal", form);
  const discount = Form.useWatch("discount", form);
  const gst = Form.useWatch("gst", form);
  const transport = Form.useWatch("transport", form);

  useEffect(() => {
    const calculateTotals = () => {
      const sub = Number(subTotal) || 0;
      const discountPercent = Number(discount) || 0;
      const gstPercent = Number(gst) || 0;
      const transportCharges = Number(transport) || 0;

      // Calculate discount amount
      const discountAmount = (sub * discountPercent) / 100;

      // Calculate subtotal after discount
      const subtotalAfterDiscount = sub - discountAmount;

      // Calculate GST amount
      const gstAmount = (subtotalAfterDiscount * gstPercent) / 100;

      // Calculate grand total
      const grandTotal = subtotalAfterDiscount + gstAmount + transportCharges;

      const safe = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const discountAmountSafe = safe(discountAmount);
      const gstAmountSafe = safe(gstAmount);
      const grandTotalSafe = safe(grandTotal);

      setTotals({
        subTotal: safe(sub),
        discount: safe(discountPercent),
        discountAmount: parseFloat(discountAmountSafe.toFixed(2)),
        gstAmount: parseFloat(gstAmountSafe.toFixed(2)),
        transport: safe(transportCharges),
        grandTotal: parseFloat(grandTotalSafe.toFixed(2)),
      });

      // Update form fields
      form?.setFieldsValue({
        subTotal: safe(sub),
        discount: safe(discountPercent),
        gst: safe(gstPercent),
        transport: safe(transportCharges),
      });
    };

    calculateTotals();
  }, [subTotal, discount, gst, transport, form]);

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
            <Form.Item label="GST (%)" name="gst">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="18"
                min={0}
                max={100}
                step={0.01}
              />
            </Form.Item>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
              Amount: ₹{totals.gstAmount}
            </div>
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
            <Form.Item label="Quotation Validity" name="validity">
              <Select
                placeholder="Select validity"
                options={[
                  {
                    label: "7 Days",
                    value: "7",
                  },
                  {
                    label: "15 Days",
                    value: "15",
                  },
                  {
                    label: "30 Days",
                    value: "30",
                  },
                ]}
              />
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
