import React, { useEffect, useMemo, useState } from "react";
import { Col, DatePicker, Form, Input, InputNumber, Row, Select } from "antd";
import { CalculatorOutlined, CalendarOutlined, GiftOutlined, InfoCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { StorageService } from "@/storage";
import {
  determineTaxType,
  getStateCodeFromName,
  resolveSellerStateCode,
} from "@/utils/taxType";
import FormSection from "./FormSection";
import { rupees } from "../view/shared";

const { TextArea } = Input;

export interface QuotationTotals {
  subTotal: number;
  discount: number;
  discountAmount: number;
  gstAmount: number;
  sgstAmount: number;
  cgstAmount: number;
  igstAmount: number;
  transport: number;
  grandTotal: number;
}

const ZERO: QuotationTotals = {
  subTotal: 0,
  discount: 0,
  discountAmount: 0,
  gstAmount: 0,
  sgstAmount: 0,
  cgstAmount: 0,
  igstAmount: 0,
  transport: 0,
  grandTotal: 0,
};

const VALIDITY_PRESETS = [7, 15, 30, 45];

/**
 * Pricing & tax (step 4) and validity & terms (step 5). The totals here are a
 * live preview; the backend recomputes everything from the items on save.
 */
const QuotationSummary: React.FC<{
  onTotals?: (t: QuotationTotals) => void;
  /** New quotation: fill in the company's default terms once they are known. */
  fillDefaultTerms?: boolean;
}> = ({ onTotals, fillDefaultTerms }) => {
  const form = Form.useFormInstance();
  const [totals, setTotals] = useState<QuotationTotals>(ZERO);

  const subTotal = Form.useWatch("subTotal", form);
  const discount = Form.useWatch("discount", form);
  const cgst = Form.useWatch("cgst", form);
  const sgst = Form.useWatch("sgst", form);
  const igst = Form.useWatch("igst", form);
  const transport = Form.useWatch("transport", form);
  const placeOfOrder = Form.useWatch("placeOfOrder", form);
  const issuingLocationId = Form.useWatch("issuing_location_id", form);
  const validity = Form.useWatch("validity_date", form);

  // The seller's GST registration decides CGST + SGST vs IGST. Prefer the
  // company details the Business section loads (always current); the stored
  // copy only covers the first render. Reading storage once used to race
  // that fetch and show "no GSTIN" for a company that has one.
  const companyDetails = useSelector((state: any) => state.companies?.companyDetails);
  const storedCompany = useMemo(() => {
    try {
      return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "null");
    } catch {
      return null;
    }
  }, []);
  const sellerCompany = companyDetails || storedCompany;

  // The stored company copy may predate the full details (no terms yet), so
  // fill the defaults when they arrive — never over what the user typed.
  const defaultTerms: string | undefined = companyDetails?.default_terms_conditions;
  useEffect(() => {
    if (!fillDefaultTerms || !defaultTerms?.trim()) return;
    if (form.getFieldValue("notes") || form.isFieldTouched("notes")) return;
    form.setFieldsValue({ notes: defaultTerms });
  }, [fillDefaultTerms, defaultTerms, form]);

  // Only companies with more than one GST-registered branch pick which one is
  // issuing this document — everyone else uses the primary GSTIN.
  const gstLocations: any[] = (sellerCompany?.locations || []).filter((l: any) => l?.gst_no);
  const selectedLocation = gstLocations.find((l) => l.id === issuingLocationId);

  const sellerStateCode = selectedLocation
    ? selectedLocation.gst_state_code || getStateCodeFromName(selectedLocation.address_state)
    : resolveSellerStateCode(sellerCompany);
  const taxType = determineTaxType(sellerStateCode, getStateCodeFromName(placeOfOrder));
  const isIntraState = taxType === "INTRA_STATE";
  const isNoGst = taxType === "NO_GST";

  useEffect(() => {
    const safe = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const sub = safe(subTotal);
    const discountPercent = safe(discount);
    const transportCharges = safe(transport);

    const discountAmount = (sub * discountPercent) / 100;
    const taxable = sub - discountAmount;
    const cgstAmount = !isNoGst && isIntraState ? (taxable * safe(cgst)) / 100 : 0;
    const sgstAmount = !isNoGst && isIntraState ? (taxable * safe(sgst)) / 100 : 0;
    const igstAmount = !isNoGst && !isIntraState ? (taxable * safe(igst)) / 100 : 0;
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const combinedTaxPercent = isNoGst ? 0 : isIntraState ? safe(cgst) + safe(sgst) : safe(igst);
    const round = (v: number) => parseFloat(safe(v).toFixed(2));

    const next: QuotationTotals = {
      subTotal: sub,
      discount: discountPercent,
      discountAmount: round(discountAmount),
      gstAmount: round(totalTax),
      sgstAmount: round(sgstAmount),
      cgstAmount: round(cgstAmount),
      igstAmount: round(igstAmount),
      transport: transportCharges,
      grandTotal: round(taxable + totalTax + transportCharges),
    };
    setTotals(next);
    onTotals?.(next);

    form?.setFieldsValue({
      subTotal: sub,
      discount: discountPercent,
      gst: combinedTaxPercent,
      transport: transportCharges,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTotal, discount, cgst, sgst, igst, transport, placeOfOrder, form, isIntraState, isNoGst]);

  const validityDays = validity && dayjs.isDayjs(validity) ? validity.startOf("day").diff(dayjs().startOf("day"), "day") : null;

  return (
    <>
      <FormSection id="qf-pricing" step={4} icon={<CalculatorOutlined />} title="Pricing & tax" sub="Discount, GST and transport on top of the items">
        {gstLocations.length > 0 && (
          <Row gutter={[14, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Issuing location (GSTIN)" name="issuing_location_id">
                <Select
                  allowClear
                  placeholder={`Primary — ${sellerCompany?.gst_no || "no GSTIN"}`}
                  options={gstLocations.map((l) => ({ value: l.id, label: `${l.name || "Location"} — ${l.gst_no}` }))}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <div className="qs-taxnote">
          <InfoCircleOutlined />
          <span>
            {isNoGst ? (
              <>GST doesn't apply — your company has no GSTIN on record.</>
            ) : isIntraState ? (
              <>
                Customer is in your state{placeOfOrder ? <> (<b>{placeOfOrder}</b>)</> : null}, so <b>CGST + SGST</b> apply.
              </>
            ) : (
              <>
                Customer is in another state{placeOfOrder ? <> (<b>{placeOfOrder}</b>)</> : null}, so <b>IGST</b> applies.
              </>
            )}
          </span>
        </div>

        <Row gutter={[14, 0]}>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="Items subtotal" name="subTotal">
              <InputNumber min={0} step={0.01} disabled prefix="₹" placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="Discount" name="discount">
              <InputNumber min={0} max={100} step={0.01} suffix="%" placeholder="0" />
            </Form.Item>
            {totals.discountAmount > 0 && (
              <div className="qs-hint">
                <GiftOutlined /> Saves the customer <b>{rupees(totals.discountAmount)}</b>
              </div>
            )}
          </Col>
          {isNoGst ? null : isIntraState ? (
            <>
              <Col xs={12} sm={6} lg={3}>
                <Form.Item label="CGST" name="cgst">
                  <InputNumber min={0} max={100} step={0.01} suffix="%" placeholder="9" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} lg={3}>
                <Form.Item label="SGST" name="sgst">
                  <InputNumber min={0} max={100} step={0.01} suffix="%" placeholder="9" />
                </Form.Item>
              </Col>
            </>
          ) : (
            <Col xs={24} sm={12} lg={6}>
              <Form.Item label="IGST" name="igst">
                <InputNumber min={0} max={100} step={0.01} suffix="%" placeholder="18" />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} sm={12} lg={6}>
            <Form.Item label="Transport" name="transport">
              <InputNumber min={0} step={0.01} prefix="₹" placeholder="0.00" />
            </Form.Item>
          </Col>
        </Row>

        <div className="qs-grand" aria-live="polite">
          <div>
            <div className="qs-grand-label">Grand total</div>
            <div className="qs-grand-amount">{rupees(totals.grandTotal)}</div>
          </div>
          <div className="qs-grand-break">
            <div>
              <span>Subtotal</span>
              <b>{rupees(totals.subTotal)}</b>
            </div>
            {totals.discountAmount > 0 && (
              <div>
                <span>Discount</span>
                <b>−{rupees(totals.discountAmount)}</b>
              </div>
            )}
            {totals.gstAmount > 0 && (
              <div>
                <span>{isIntraState ? "CGST + SGST" : "IGST"}</span>
                <b>+{rupees(totals.gstAmount)}</b>
              </div>
            )}
            {totals.transport > 0 && (
              <div>
                <span>Transport</span>
                <b>+{rupees(totals.transport)}</b>
              </div>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection id="qf-terms" step={5} icon={<CalendarOutlined />} title="Validity & terms" sub="How long the prices hold, and the terms printed on the quotation">
        <Row gutter={[14, 0]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Valid until"
              name="validity_date"
              rules={[{ required: true, message: "Pick the date this quotation is valid until" }]}
              extra={validityDays !== null && validityDays > 0 ? `${validityDays} day${validityDays === 1 ? "" : "s"} from today` : undefined}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="D MMM YYYY"
                placeholder="Select a date"
                disabledDate={(current) => current && current <= dayjs().endOf("day")}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Quick pick">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {VALIDITY_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`qp-btn ghost sm${validityDays === d ? " active" : ""}`}
                    onClick={() => form.setFieldsValue({ validity_date: dayjs().add(d, "day") })}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Terms & notes" name="notes" extra="Payment, delivery and warranty terms. Your company's default terms are filled in for new quotations.">
          <TextArea autoSize={{ minRows: 4, maxRows: 12 }} placeholder="e.g. Payment: 100% advance · Delivery: within 5 working days · Prices valid for 15 days" />
        </Form.Item>
      </FormSection>
    </>
  );
};

export default QuotationSummary;
