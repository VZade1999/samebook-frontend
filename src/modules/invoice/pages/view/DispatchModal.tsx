import React, { useEffect, useMemo, useState } from "react";
import { Input, Modal, Spin } from "antd";
import { CarOutlined, ExclamationCircleFilled, InfoCircleOutlined, SaveOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import InvoiceService from "../../services/invoiceService";
import { invoiceDispatchUpdated } from "../../redux/invoiceActions";
import { errorText } from "./shared";

const service = new InvoiceService();

export type DispatchFields = { vehicle_number: string; transporter_name: string; lr_number: string; eway_bill_number: string };
const FIELDS: (keyof DispatchFields)[] = ["vehicle_number", "transporter_name", "lr_number", "eway_bill_number"];

const fromInvoice = (inv: any): DispatchFields => ({
  vehicle_number: inv?.vehicle_number || "",
  transporter_name: inv?.transporter_name || "",
  lr_number: inv?.lr_number || "",
  eway_bill_number: inv?.eway_bill_number || "",
});

/** The same checks as the server (parseDispatch); "" means none. */
export const dispatchProblem = (f: DispatchFields): string | null => {
  const vehicle = f.vehicle_number.trim().toUpperCase();
  if (vehicle.length > 20) return "The vehicle number looks too long";
  if (vehicle && !/^[A-Z0-9][A-Z0-9 -]*$/.test(vehicle)) return "A vehicle number has only letters, digits, spaces and dashes";
  if (f.transporter_name.trim().length > 100) return "Keep the transporter name under 100 characters";
  if (f.lr_number.trim().length > 50) return "Keep the LR number under 50 characters";
  const eway = f.eway_bill_number.replace(/\s/g, "");
  if (eway && !/^\d{12}$/.test(eway)) return "An e-way bill number has 12 digits";
  return null;
};

/**
 * Vehicle, transporter, LR (lorry receipt) and e-way bill of an invoice that
 * travels with the goods — printed in the invoice's dispatch box.
 */
const DispatchModal: React.FC<{
  inv: any | null;
  onCancel: () => void;
  onDone: (message: string) => void;
}> = ({ inv, onCancel, onDone }) => {
  const dispatch = useDispatch();
  const [f, setF] = useState<DispatchFields>(fromInvoice(inv));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setF(fromInvoice(inv));
    setError("");
  }, [inv?.id]);

  const before = useMemo(() => fromInvoice(inv), [inv]);
  const changed = FIELDS.filter((k) => f[k].trim() !== before[k].trim());
  const set = (k: keyof DispatchFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setError("");
  };

  const submit = async () => {
    if (!inv) return;
    const problem = dispatchProblem(f);
    if (problem) return setError(problem);
    if (!changed.length) return onCancel();
    setSaving(true);
    setError("");
    try {
      // Only what changed is sent; an emptied field clears it.
      const body = Object.fromEntries(changed.map((k) => [k, f[k].trim()]));
      const res: any = await service.updateDispatch(inv.id, body);
      dispatch(invoiceDispatchUpdated(inv.id));
      onDone(res?.data?.message || `Dispatch details saved on ${inv.invoice_number}`);
    } catch (e) {
      setError(errorText(e, "The dispatch details weren't saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!inv} onCancel={() => !saving && onCancel()} title={null} footer={null} width={560} centered destroyOnHidden rootClassName="qp-portal ip-portal">
      {inv && (
        <div className="qc">
          <div className="qc-head">
            <span className="qc-head-icon po">
              <CarOutlined />
            </span>
            <div>
              <h3>Dispatch details</h3>
              <p>
                <span className="qp-mono">{inv.invoice_number}</span> · {inv.customer_name || "Customer"}
              </p>
            </div>
          </div>

          <div className="ip-dispatch-form">
            <label>
              <span className="qc-label">Vehicle no.</span>
              <Input value={f.vehicle_number} onChange={set("vehicle_number")} placeholder="MH 12 AB 1234" maxLength={20} autoFocus aria-label="Vehicle number" />
            </label>
            <label>
              <span className="qc-label">Transporter</span>
              <Input value={f.transporter_name} onChange={set("transporter_name")} placeholder="e.g. VRL Logistics" maxLength={100} aria-label="Transporter" />
            </label>
            <label>
              <span className="qc-label">LR no. (lorry receipt)</span>
              <Input value={f.lr_number} onChange={set("lr_number")} placeholder="Optional" maxLength={50} aria-label="LR number" />
            </label>
            <label>
              <span className="qc-label">E-way bill no.</span>
              <Input
                value={f.eway_bill_number}
                onChange={set("eway_bill_number")}
                placeholder="12 digits"
                maxLength={16}
                inputMode="numeric"
                aria-label="E-way bill number"
              />
            </label>
          </div>

          {error && (
            <div className="qc-error" role="alert">
              <ExclamationCircleFilled /> {error}
            </div>
          )}

          <div className="qc-note">
            <InfoCircleOutlined />
            <span>
              Fill these in when this invoice travels with the goods. Goods worth ₹50,000 or more usually need an e-way bill before they move. Leave a box empty to remove it.
            </span>
          </div>

          <div className="qc-foot">
            <button type="button" className="qp-btn ghost" onClick={onCancel} disabled={saving}>
              Close
            </button>
            <button type="button" className="qp-btn primary" onClick={submit} disabled={saving || !changed.length}>
              {saving ? <Spin size="small" /> : <SaveOutlined />} Save
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DispatchModal;
