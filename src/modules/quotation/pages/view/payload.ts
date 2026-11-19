import { parseJsonField } from "./shared";

/**
 * The editor's form values as API document fields — shared by quotations and
 * by invoices made without a quotation (the same editor). The server
 * recomputes every total from the items; these are what the user saw.
 */
export const documentPayload = (values: any) => {
  const items = (values.items || []).map((item: any) => ({
    product_name: item?.itemName,
    hsn_code: item?.hsn_code,
    unit: item?.unit,
    qty: Number(item?.quantity || item?.qty || 0),
    rate: Number(item?.price || item?.rate || 0),
    discount_percent: Number(item?.discount || 0),
  }));
  const subTotal = Number(values.subTotal || 0);
  const discountPercent = Number(values.discount || 0);
  // The overall discount on top of the line discounts, as an amount.
  const discountAmount = Number(values.discount_amount ?? (subTotal * discountPercent) / 100);
  const taxableAmount = subTotal - discountAmount;
  const cgstPercent = Number(values.cgst || 0),
    sgstPercent = Number(values.sgst || 0),
    igstPercent = Number(values.igst || 0);
  const cgstAmount = (taxableAmount * cgstPercent) / 100,
    sgstAmount = (taxableAmount * sgstPercent) / 100,
    igstAmount = (taxableAmount * igstPercent) / 100;
  const transportCharges = Number(values.transport || 0);
  const grandTotal = Number(values.grandTotal || taxableAmount + cgstAmount + sgstAmount + igstAmount + transportCharges);

  return {
    customer_id: Number(values.customerId) || undefined,
    contact_person_id: values.contactPersonId,
    billing_address_id: values.billingAddressId,
    shipping_address_id: values.shippingAddressId,
    issuing_location_id: values.issuing_location_id,
    customer_name: values.customerName,
    customer_type: values.customerType,
    customer_gst_number: values.customerGSTN,
    contact_person_name: values.customerName,
    contact_person_email: values.customerEmail,
    contact_person_phone: values.customerPhone,
    billing_address_snapshot: parseJsonField(values.billingAddressSnapshot),
    shipping_address_snapshot: parseJsonField(values.shippingAddressSnapshot),
    business_details_snapshot: values.businessDetailsSnapshot ? parseJsonField(values.businessDetailsSnapshot) : undefined,
    payment_details_snapshot: values.paymentBankId
      ? JSON.stringify({
          bank_id: values.paymentBankId,
          bank_name: values.paymentBankName,
          account_holder_name: values.paymentAccountHolder,
          account_number: values.paymentAccountNumber,
          ifsc_code: values.paymentIFSC,
          branch_name: values.paymentBranchName,
          branch_address: values.paymentBranchAddress,
          account_type: values.paymentAccountType,
          is_default: values.paymentIsDefault,
        })
      : undefined,
    notes: values.notes,
    sub_total: subTotal,
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    cgst_percent: cgstPercent,
    cgst_amount: cgstAmount,
    sgst_percent: sgstPercent,
    sgst_amount: sgstAmount,
    igst_percent: igstPercent,
    igst_amount: igstAmount,
    transport_charges: transportCharges,
    grand_total: grandTotal,
    items,
  };
};
