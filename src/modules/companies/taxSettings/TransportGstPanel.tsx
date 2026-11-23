import React, { useState } from "react";
import { Modal, Switch, message } from "antd";
import { saveTransportGst, useTaxSettings } from "./taxSettings";
import "./taxSettings.scss";

const errorText = (e: any) => e?.response?.data?.message || e?.message || "Couldn't save — try again";

/**
 * Company page: "GST on transport". On (the GST rule) = transport on new
 * quotations and invoices gets the goods' GST rate. Turning it off asks
 * first, because it should only be done on a CA's advice.
 */
export const TransportGstPanel: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const { transportGst, known } = useTaxSettings();
  const [busy, setBusy] = useState(false);

  const save = async (on: boolean) => {
    setBusy(true);
    try {
      message.success(await saveTransportGst(on));
    } catch (e) {
      message.error(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const flip = (on: boolean) => {
    if (on) return void save(true);
    Modal.confirm({
      title: "Add transport without GST?",
      content:
        "Under GST, transport you charge on your own bill is taxed like the goods. Turn this off only if your CA says your freight is outside GST — for example, the transporter's bill is in the customer's name and you just pay it for them.",
      okText: "Turn off",
      okButtonProps: { danger: true },
      cancelText: "Keep GST on transport",
      onOk: () => save(false),
    });
  };

  return (
    <div className="tg-root">
      <div className="tg-row">
        <Switch
          className="tg-switch"
          checked={transportGst}
          onChange={flip}
          loading={busy}
          disabled={!canEdit || !known}
          aria-label="GST on transport"
        />
        <div className="tg-text">
          <b>{transportGst ? "Transport carries GST" : "Transport is added without GST"}</b>
          <p>
            {transportGst
              ? "Transport you charge on a quotation or invoice gets the same GST % as the goods — the GST rule."
              : "Turned off: transport is added after GST. Keep it this way only on your CA's advice."}
          </p>
        </div>
      </div>

      <div className="tg-example" aria-label="Example: item ₹100 and transport ₹100 at 18% GST">
        <div className={`tg-case${transportGst ? " on" : ""}`}>
          <strong>With GST on transport</strong>
          18% on ₹100 + ₹100 = ₹36 → <em>₹236</em>
        </div>
        <div className={`tg-case${transportGst ? "" : " on"}`}>
          <strong>Without</strong>
          18% on ₹100 = ₹18, + ₹100 → <em>₹218</em>
        </div>
      </div>

      <p className="tg-foot">
        Changes new quotations and invoices only. Ones already made keep their figures; an older quotation follows this when you edit and save it.
        {!canEdit && " Only someone who can edit the company can change this."}
      </p>
    </div>
  );
};

export default TransportGstPanel;
