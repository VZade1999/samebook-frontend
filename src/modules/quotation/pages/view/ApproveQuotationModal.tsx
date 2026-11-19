import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker, Input, Modal, Spin, message } from "antd";
import type { InputRef } from "antd";
import { CheckOutlined, DeleteOutlined, FileProtectOutlined, InfoCircleOutlined, SaveOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import QuotationService from "../../redux";
import { ASYNC_APPROVE_QUOTATION_SUCCESS, quotationPoChanged } from "../../redux/quotationActions";
import { inr } from "./shared";

/** Approve a quotation (asking for the customer's PO), or add / change its PO later. */
export type PoTarget = { q: any; mode: "approve" | "po" };

const PO_MAX = 40;

const ApproveQuotationModal: React.FC<{
  target: PoTarget | null;
  onCancel: () => void;
  onDone: (fresh: any, mode: "approve" | "po") => void;
}> = ({ target, onCancel, onDone }) => {
  const service = useMemo(() => new QuotationService(), []);
  const dispatch = useDispatch();
  const q = target?.q;
  const mode = target?.mode ?? "approve";
  const required = Number(q?.customer?.po_required) === 1;
  const hadPo = !!q?.customer_po_number;
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState<Dayjs | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poRef = useRef<InputRef>(null);

  useEffect(() => {
    if (!q) return;
    setPoNumber(q.customer_po_number || "");
    setPoDate(q.customer_po_date ? dayjs(q.customer_po_date) : null);
    setError(null);
  }, [q?.id, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (clear = false) => {
    if (!q) return;
    const po = clear ? "" : poNumber.trim().replace(/\s+/g, " ");
    if (!clear) {
      if (required && !po) return setError(`${q.customer_name || "This customer"} always sends a purchase order — enter the PO number`);
      if (po.length > PO_MAX) return setError(`The PO number can have at most ${PO_MAX} characters`);
      if (!po && poDate) return setError("Enter the PO number for this PO date");
    }
    const body = {
      customer_po_number: po || null,
      customer_po_date: po && poDate ? poDate.format("YYYY-MM-DD") : null,
    };
    setSaving(true);
    setError(null);
    try {
      const res = mode === "approve" ? await service.approveQuotation({ id: q.id, ...body }) : await service.setCustomerPo(q.id, body);
      if (res?.data?.success) {
        message.success(res.data.message || (mode === "approve" ? "Quotation approved" : "PO saved"));
        // Both are billing changes: lists, panels and linked documents refresh.
        dispatch(mode === "approve" ? { type: ASYNC_APPROVE_QUOTATION_SUCCESS } : quotationPoChanged(q.id));
        onDone(res.data.data, mode);
      } else {
        setError(res?.data?.message || (mode === "approve" ? "Couldn't approve the quotation" : "Couldn't save the PO"));
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || (mode === "approve" ? "Couldn't approve the quotation" : "Couldn't save the PO"));
    } finally {
      setSaving(false);
    }
  };

  const empty = !poNumber.trim();
  return (
    <Modal
      open={!!q}
      onCancel={() => !saving && onCancel()}
      title={null}
      footer={null}
      width={560}
      centered
      destroyOnHidden
      rootClassName="qp-portal"
      // Start typing the PO straight away (the dialog would focus its × otherwise).
      afterOpenChange={(v) => v && poRef.current?.focus()}
    >
      {q && (
        <div className="qc">
          <div className="qc-head">
            <span className={`qc-head-icon ${mode === "approve" ? "approve" : "po"}`}>{mode === "approve" ? <CheckOutlined /> : <FileProtectOutlined />}</span>
            <div>
              <h3>{mode === "approve" ? "Approve quotation" : hadPo ? "Change the customer's PO" : "Add the customer's PO"}</h3>
              <p>
                <span className="qp-mono">{q.quotation_number}</span> · {q.customer_name || "Customer"} · {inr(q.grand_total)}
              </p>
            </div>
          </div>

          <div className="qc-po">
            <div>
              <label className="qc-label" htmlFor="qc-po-number">
                Customer's PO number <em>{required ? "required for this customer" : "optional"}</em>
              </label>
              <Input
                ref={poRef}
                id="qc-po-number"
                value={poNumber}
                onChange={(e) => {
                  setPoNumber(e.target.value);
                  setError(null);
                }}
                onPressEnter={() => submit()}
                maxLength={PO_MAX}
                placeholder="e.g. 4500123456"
                autoFocus
                autoComplete="off"
              />
            </div>
            <div>
              <label className="qc-label" htmlFor="qc-po-date">
                PO date <em>optional</em>
              </label>
              <DatePicker
                id="qc-po-date"
                value={poDate}
                onChange={(d) => {
                  setPoDate(d);
                  setError(null);
                }}
                format="D MMM YYYY"
                disabledDate={(d) => d.isAfter(dayjs(), "day")}
                style={{ width: "100%" }}
                placeholder="Date on the PO"
              />
            </div>
          </div>

          {error && (
            <div className="qc-error" role="alert">
              {error}
            </div>
          )}

          <div className="qc-note">
            <InfoCircleOutlined />
            <span>
              Printed as <b>“Buyer's Order No. &amp; Date”</b> on this quotation's delivery challans and invoice, and you can search by it.
              {mode === "approve" ? " You can add or change it later, until the invoice is made." : " It locks once the invoice is made."}
            </span>
          </div>

          <div className="qc-foot">
            {mode === "po" && hadPo && !required && (
              <button type="button" className="qp-btn ghost" onClick={() => submit(true)} disabled={saving} style={{ marginRight: "auto" }}>
                <DeleteOutlined /> Remove PO
              </button>
            )}
            <button type="button" className="qp-btn ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="qp-btn primary" onClick={() => submit()} disabled={saving}>
              {saving ? <Spin size="small" /> : mode === "approve" ? <CheckOutlined /> : <SaveOutlined />}{" "}
              {mode === "approve" ? (empty && !required ? "Approve without PO" : "Approve") : "Save PO"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ApproveQuotationModal;
