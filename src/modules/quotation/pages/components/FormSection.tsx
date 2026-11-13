import React from "react";

/** The numbered card every part of the quotation editor sits in. */
const FormSection: React.FC<{
  id: string;
  step: number;
  icon: React.ReactNode;
  title: string;
  sub?: React.ReactNode;
  extra?: React.ReactNode;
  /** Body without side padding (tables that run edge to edge). */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ id, step, icon, title, sub, extra, flush, className = "", children }) => (
  <section id={id} className={`qf-section ${className}`} aria-labelledby={`${id}-title`}>
    <header className="qf-section-head">
      <span className="qf-section-no" aria-hidden>
        {step}
      </span>
      <div className="qf-section-titles">
        <h3 id={`${id}-title`}>
          {icon}
          {title}
        </h3>
        {sub && <p>{sub}</p>}
      </div>
      {extra && <div className="qf-section-extra">{extra}</div>}
    </header>
    <div className={`qf-section-body${flush ? " flush" : ""}`}>{children}</div>
  </section>
);

export default FormSection;
