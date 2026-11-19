import React from "react";
import { PlusOutlined } from "@ant-design/icons";

/**
 * The bottom corner of a document as it prints: bank details and terms on the
 * left, and the "For <company> · Authorised Signatory" box with the signature
 * sitting on its line — the same layout as the PDFs.
 */
const SignaturePreview: React.FC<{
  company: string;
  src: string | null;
  /** Shown in the box when there is no signature. */
  empty?: React.ReactNode;
  /** Makes the empty box a button that adds one. */
  onAdd?: () => void;
}> = ({ company, src, empty = "Blank — signed by hand", onAdd }) => (
  <div className="sg-sheet" aria-label={src ? "Your signature as it prints on documents" : "The signature box on documents (empty)"}>
    <div className="sg-ghost" aria-hidden>
      <small>Bank details</small>
      <span className="w80" />
      <span className="w60" />
      <small style={{ marginTop: 6 }}>Terms &amp; conditions</small>
      <span className="w70" />
      <span className="w40" />
    </div>
    <div className="sg-box">
      <span className="sg-for">For {company || "your company"}</span>
      <div className="sg-ink">
        {src ? (
          <img src={src} alt="Your signature and stamp" />
        ) : onAdd ? (
          <button type="button" className="sg-ink-empty sg-ink-add" onClick={onAdd}>
            <PlusOutlined /> Add signature or stamp
          </button>
        ) : (
          <span className="sg-ink-empty">{empty}</span>
        )}
      </div>
      <i className="sg-line" />
      <span className="sg-role">Authorised Signatory</span>
    </div>
  </div>
);

export default SignaturePreview;
