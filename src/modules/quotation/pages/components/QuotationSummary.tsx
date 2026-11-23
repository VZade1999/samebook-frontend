import React, { useEffect, useMemo, useState } from "react";
import { Col, DatePicker, Form, Input, InputNumber, Row, Select } from "antd";
import { CalculatorOutlined, CalendarOutlined, CarOutlined, GiftOutlined, InfoCircleOutlined } from "@ant-design/icons";
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
import { useTaxSettings } from "@/modules/companies/taxSettings/taxSettings";

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
  /** GST is charged on the transport too (the company's "GST on transport" setting). */
  transportTaxed: boolean;
  /** The value GST is charged on: items after the discount, plus transport when it is taxed. */
  taxable: number;
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
  transportTaxed: false,
  taxable: 0,
  grandTotal: 0,
};

const VALIDITY_PRESETS = [7, 15, 30, 45];

/** Payment terms for an invoice made in the editor (days after the invoice date). */
const DUE_PRESETS = [
  { days: 0, label: "On receipt" },
  { days: 15, label: "15 days" },
  { days: 30, label: "30 days" },
  { days: 45, label: "45 days" },
];

/** The same checks as the server's parseDispatch. */
const VEHICLE_RULE = {
  validator: (_: unknown, v?: string) =>
    !v || /^[A-Z0-9][A-Z0-9 -]*$/.test(String(v).trim().toUpperCase())
      ? Promise.resolve()
      : Promise.reject(new Error("Only letters, digits, spaces and dashes")),
};
const EWAY_RULE = {
  validator: (_: unknown, v?: string) =>
    !v || /^\d{12}$/.test(String(v).replace(/\s/g, "")) ? Promise.resolve() : Promise.reject(new Error("An e-way bill number has 12 digits")),
};

/**
 * Pricing & tax (step 4) and validity & terms (step 5). The totals here are a
 * live preview; the backend recomputes everything from the items on save.
 */
const QuotationSummary: React.FC<{
  onTotals?: (t: QuotationTotals) => void;
  /** New quotation: fill in the company's default terms once they are known. */
  fillDefaultTerms?: boolean;
  /** "invoice": an invoice made without a quotation — invoice and due dates instead of validity. */
  mode?: "quotation" | "invoice";
  /** Invoice mode: also ask for the vehicle / transporter / LR / e-way bill. */
  showDispatch?: boolean;
}> = ({ onTotals, fillDefaultTerms, mode = "quotation", showDispatch = true }) => {
  const form = Form.useFormInstance();
  const [totals, setTotals] = useState<QuotationTotals>(ZERO);
  // Transport is part of the sale under GST, so it is taxed like the goods —
  // unless an Admin turned that off on the Company page. The server does the same.
  const { transportGst } = useTaxSettings();
  const invoiceDate = Form.useWatch("invoice_date", form);
  const dueDate = Form.useWatch("payment_due_date", form);
  const dueIn =
    dayjs.isDayjs(invoiceDate) && dayjs.isDayjs(dueDate) ? dueDate.startOf("day").diff(invoiceDate.startOf("day"), "day") : null;

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
    // The GST base: transport joins the items when it is taxed.
    const base = taxable + (transportGst ? transportCharges : 0);
    const cgstAmount = !isNoGst && isIntraState ? (base * safe(cgst)) / 100 : 0;
    const sgstAmount = !isNoGst && isIntraState ? (base * safe(sgst)) / 100 : 0;
    const igstAmount = !isNoGst && !isIntraState ? (base * safe(igst)) / 100 : 0;
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
      transportTaxed: transportGst && transportCharges > 0,
      taxable: round(base),
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
  }, [subTotal, discount, cgst, sgst, igst, transport, placeOfOrder, form, isIntraState, isNoGst, transportGst]);

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
            <Form.Item
              label="Transport"
              name="transport"
              extra={
                totals.transport > 0 && !isNoGst
                  ? transportGst
                    ? "GST is added on transport too, like the goods"
                    : "Added without GST (Company page setting)"
                  : undefined
              }
            >
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
            {/* Taxed transport is part of the value GST is charged on, so it comes first. */}
            {totals.transportTaxed && (
              <div>
                <span>Transport</span>
                <b>+{rupees(totals.transport)}</b>
              </div>
            )}
            {totals.gstAmount > 0 && (
              <div>
                <span>
                  {isIntraState ? "CGST + SGST" : "IGST"}
                  {totals.transportTaxed ? ` on ${rupees(totals.taxable)}` : ""}
                </span>
                <b>+{rupees(totals.gstAmount)}</b>
              </div>
            )}
            {totals.transport > 0 && !totals.transportTaxed && (
              <div>
                <span>Transport</span>
                <b>+{rupees(totals.transport)}</b>
              </div>
            )}
          </div>
        </div>
      </FormSection>

      {mode === "invoice" ? (
        <FormSection
          id="qf-terms"
          step={5}
          icon={<CalendarOutlined />}
          title={showDispatch ? "Dates, dispatch & terms" : "Dates & terms"}
          sub={showDispatch ? "When it's dated and due, how the goods travel, and the terms printed on the invoice" : "When it's dated and due, and the terms printed on the invoice"}
        >
          <Row gutter={[14, 0]}>
            <Col xs={24} md={8}>
              <Form.Item label="Invoice date" name="invoice_date" rules={[{ required: true, message: "Pick the invoice date" }]}>
                <DatePicker
                  style={{ width: "100%" }}
                  format="D MMM YYYY"
                  allowClear={false}
                  disabledDate={(d) => !!d && d.isAfter(dayjs(), "day")}
                  // Keep the same payment terms when the date moves.
                  onChange={(d) => d && dueIn !== null && form.setFieldsValue({ payment_due_date: d.add(dueIn, "day") })}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Payment due"
                name="payment_due_date"
                dependencies={["invoice_date"]}
                extra={dueIn === null ? undefined : dueIn === 0 ? "Due on receipt" : `${dueIn} day${dueIn === 1 ? "" : "s"} after the invoice date`}
                rules={[
                  { required: true, message: "Choose when payment is due" },
                  ({ getFieldValue }) => ({
                    validator: (_, v) => {
                      const inv = getFieldValue("invoice_date");
                      return !v || !inv || !v.isBefore(inv, "day") ? Promise.resolve() : Promise.reject(new Error("The due date can't be before the invoice date"));
                    },
                  }),
                ]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="D MMM YYYY"
                  allowClear={false}
                  disabledDate={(d) => !!d && dayjs.isDayjs(invoiceDate) && d.isBefore(invoiceDate, "day")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Payment terms">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DUE_PRESETS.map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      className={`qp-btn ghost sm${dueIn === p.days ? " active" : ""}`}
                      onClick={() => form.setFieldsValue({ payment_due_date: (dayjs.isDayjs(invoiceDate) ? invoiceDate : dayjs()).add(p.days, "day") })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </Form.Item>
            </Col>
          </Row>

          {showDispatch && (
            <>
              <div className="qs-subhead">
                <CarOutlined /> Dispatch <em>only if this invoice travels with the goods</em>
              </div>
              <Row gutter={[14, 0]}>
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item label="Vehicle no." name="vehicle_number" rules={[VEHICLE_RULE]} normalize={(v) => (typeof v === "string" ? v.toUpperCase() : v)}>
                    <Input placeholder="MH 12 AB 1234" maxLength={20} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item label="Transporter" name="transporter_name">
                    <Input placeholder="Optional" maxLength={100} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item label="LR no." name="lr_number">
                    <Input placeholder="Lorry receipt, optional" maxLength={50} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item label="E-way bill no." name="eway_bill_number" rules={[EWAY_RULE]}>
                    <Input placeholder="12 digits" maxLength={16} inputMode="numeric" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Form.Item label="Terms & notes" name="notes" extra="Printed on the invoice. Your company's default terms are filled in.">
            <TextArea autoSize={{ minRows: 4, maxRows: 12 }} placeholder="e.g. Payment within 30 days · Goods once sold will not be taken back" />
          </Form.Item>
        </FormSection>
      ) : (
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
      )}
    </>
  );
};

export default QuotationSummary;
