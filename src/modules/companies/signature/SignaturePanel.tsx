import React, { useState } from "react";
import { message, Popconfirm } from "antd";
import { DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import SignaturePreview from "./SignaturePreview";
import { useCompanySignature } from "./signatureStore";
import "./signature.scss";

/** The documents it prints on, in each document's colour. */
export const PrintsOn: React.FC = () => (
  <span className="sg-where" aria-label="Prints on quotations, delivery challans and tax invoices">
    <span className="sg-doc quote">
      <i /> Quotations
    </span>
    <span className="sg-doc challan">
      <i /> Challans
    </span>
    <span className="sg-doc invoice">
      <i /> Invoices
    </span>
  </span>
);

/**
 * The Company page card body: the signature as it prints, and (for editors)
 * remove it; `onOpen` opens the add / change dialog (rendered by the page).
 * Without a signature, documents leave the box blank to sign by hand.
 */
const SignaturePanel: React.FC<{ company: string; onOpen?: () => void }> = ({ company, onOpen }) => {
  const { signature, status, save, reload } = useCompanySignature();
  const [removing, setRemoving] = useState(false);

  const remove = async () => {
    setRemoving(true);
    try {
      message.success(await save(null));
    } catch (e: any) {
      message.error(e?.message || "Couldn't remove the signature");
    } finally {
      setRemoving(false);
    }
  };

  if (status === "loading" && !signature) return <div className="sg-skel" aria-label="Loading your signature" />;

  if (status === "error" && !signature) {
    return (
      <div className="sg-problem">
        Couldn't load your signature.
        <button type="button" className="cp-head-btn" onClick={() => reload()}>
          <ReloadOutlined /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="sg-panel">
      <SignaturePreview company={company} src={signature} onAdd={onOpen} />
      {signature ? (
        <div className="sg-actions">
          <PrintsOn />
          {onOpen && (
            <Popconfirm
              title="Remove the signature?"
              description="Documents will leave the box blank to sign by hand."
              okText="Remove"
              okButtonProps={{ danger: true }}
              cancelText="Keep it"
              onConfirm={remove}
            >
              <button type="button" className="sg-remove" disabled={removing}>
                <DeleteOutlined /> Remove
              </button>
            </Popconfirm>
          )}
        </div>
      ) : (
        <p className="sg-blurb">Until you add one, documents leave this box blank to sign by hand.</p>
      )}
    </div>
  );
};

export default SignaturePanel;
