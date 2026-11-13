import React, { useCallback, useEffect, useState } from "react";
import { Form, Modal, Spin, message } from "antd";
import type { FormInstance } from "antd";
import { ArrowLeftOutlined, CheckOutlined, EditOutlined, FileAddOutlined } from "@ant-design/icons";
import SeriesField from "@/modules/numbering/SeriesField";
import BusinessDetails from "../components/BusinessDetails";
import CustomerDetails from "../components/CustomerDetails";
import QuotationItems from "../components/QuotationItems";
import QuotationSummary, { type QuotationTotals } from "../components/QuotationSummary";
import PaymentDetails from "../components/PaymentDetails";
import { StagePill, rupees } from "./shared";

const SECTIONS = [
  { id: "qf-customer", label: "Customer" },
  { id: "qf-business", label: "Your business" },
  { id: "qf-items", label: "Items" },
  { id: "qf-pricing", label: "Pricing & tax" },
  { id: "qf-terms", label: "Validity & terms" },
  { id: "qf-payment", label: "Payment" },
];

const filled = (v: any) => v !== undefined && v !== null && v !== "";

/**
 * The create / edit screen: six numbered sections, a step bar that follows
 * the scroll, and a footer with the live total and the save button. The
 * section components own their fields; the page owns saving (onFinish).
 */
const QuotationEditor: React.FC<{
  form: FormInstance;
  editing: any | null;
  saving: boolean;
  canSave: boolean;
  loadingDetails: boolean;
  onFinish: (values: any) => void;
  onCancel: () => void;
}> = ({ form, editing, saving, canSave, loadingDetails, onFinish, onCancel }) => {
  const [totals, setTotals] = useState<QuotationTotals | null>(null);
  const [active, setActive] = useState(SECTIONS[0].id);

  const customerId = Form.useWatch("customerId", form);
  const contactId = Form.useWatch("contactPersonId", form);
  const addrs = Form.useWatch("selectedAddress", form);
  const locs = Form.useWatch("selectedLocation", form);
  const phones = Form.useWatch("selectedPhones", form);
  const emails = Form.useWatch("selectedEmails", form);
  const items = Form.useWatch("items", form);
  const validity = Form.useWatch("validity_date", form);
  const bank = Form.useWatch("paymentBankId", form);

  const itemList: any[] = Array.isArray(items) ? items : [];
  const done: Record<string, boolean> = {
    "qf-customer": filled(customerId) && filled(contactId),
    "qf-business": (addrs?.length || 0) + (locs?.length || 0) > 0 && (phones?.length || 0) > 0 && (emails?.length || 0) > 0,
    "qf-items": itemList.length > 0 && itemList.every((i) => i?.itemName && i?.quantity && filled(i?.price) && i?.hsn_code && i?.unit),
    "qf-pricing": itemList.length > 0,
    "qf-terms": filled(validity),
    "qf-payment": filled(bank),
  };
  const doneCount = Object.values(done).filter(Boolean).length;

  // Highlight the section being read.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-100px 0px -55% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loadingDetails]);

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancel = useCallback(() => {
    if (saving) return;
    if (form.isFieldsTouched()) {
      Modal.confirm({
        title: editing ? "Discard your changes?" : "Discard this quotation?",
        content: "What you entered here will be lost.",
        okText: "Discard",
        okButtonProps: { danger: true },
        cancelText: "Keep editing",
        onOk: onCancel,
      });
    } else {
      onCancel();
    }
  }, [editing, form, onCancel, saving]);

  // Ctrl / Cmd + S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canSave && !saving) form.submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canSave, form, saving]);

  const onFinishFailed = ({ errorFields }: any) => {
    if (!errorFields?.length) return;
    form.scrollToField(errorFields[0].name, { block: "center", behavior: "smooth" });
    message.error(`${errorFields.length} field${errorFields.length === 1 ? " needs" : "s need"} your attention`);
  };

  return (
    <div className="qf-root">
      <div className="qf-hero">
        <button type="button" className="qf-back" onClick={cancel}>
          <ArrowLeftOutlined /> Quotations
        </button>
        <div className="qf-hero-main">
          <span className="qf-hero-icon">{editing ? <EditOutlined /> : <FileAddOutlined />}</span>
          <div className="qf-hero-text">
            <h1>{editing ? `Edit ${editing.quotation_number}` : "New quotation"}</h1>
            <p>
              {editing
                ? "Saving keeps the current version in this quotation's history."
                : "Pick a customer and add items — the total updates as you type."}
            </p>
          </div>
          {editing && <StagePill q={editing} />}
          {loadingDetails && <Spin size="small" />}
        </div>
      </div>

      <nav className="qf-steps" aria-label="Sections">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`qf-step${active === s.id ? " active" : ""}${done[s.id] ? " done" : ""}`}
            onClick={() => jump(s.id)}
            aria-current={active === s.id ? "step" : undefined}
          >
            <span className="qf-step-no">{done[s.id] && active !== s.id ? <CheckOutlined /> : i + 1}</span>
            {s.label}
          </button>
        ))}
      </nav>

      <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed} autoComplete="off" scrollToFirstError={false}>
        {!editing && <SeriesField docType="QUOTATION" form={form} className="qf-series" />}
        <div className="qf-grid-2">
          <CustomerDetails />
          <BusinessDetails />
        </div>
        <QuotationItems />
        <QuotationSummary onTotals={setTotals} fillDefaultTerms={!editing} />
        <PaymentDetails />
      </Form>

      <div className="qf-footer">
        <div className="qf-sum" aria-live="polite">
          <span>
            <small>Items</small>
            <b>{itemList.length}</b>
          </span>
          <span>
            <small>Subtotal</small>
            <b>{rupees(totals?.subTotal || 0)}</b>
          </span>
          <span>
            <small>GST</small>
            <b>{rupees(totals?.gstAmount || 0)}</b>
          </span>
          <span className="grand">
            <small>Grand total</small>
            <b>{rupees(totals?.grandTotal || 0)}</b>
          </span>
          <span>
            <small>Ready</small>
            <b>
              {doneCount} / {SECTIONS.length}
            </b>
          </span>
        </div>
        <div className="qf-footer-actions">
          <button type="button" className="qp-btn ghost" onClick={cancel} disabled={saving}>
            Cancel
          </button>
          {canSave && (
            <button type="button" className="qp-btn primary" onClick={() => form.submit()} disabled={saving} title="Ctrl + S">
              {saving ? <Spin size="small" /> : <CheckOutlined />}
              {saving ? "Saving…" : editing ? "Save changes" : "Save quotation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationEditor;
