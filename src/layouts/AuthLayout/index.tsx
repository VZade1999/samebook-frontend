import React from "react";
import "./styles.scss";

interface Props {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: Props) => {
  return (
    <div className="al-root">

      {/* ── Left panel ── */}
      <div className="al-left" aria-hidden="true">
        <div className="al-left__noise" />

        {/* Top-left logo grid */}
        <div className="al-left__logo">
          <div className="al-logo-grid">
            <span className="al-logo-box al-logo-box--red"    />
            <span className="al-logo-box al-logo-box--green"  />
            <span className="al-logo-box al-logo-box--blue"   />
            <span className="al-logo-box al-logo-box--yellow" />
          </div>
          <span className="al-left__logo-name">SameBook</span>
        </div>

        {/* Centre branding */}
        <div className="al-left__body">
          <div className="al-tagline">
            <p className="al-tagline__eyebrow">Business accounting</p>
            <h1 className="al-tagline__headline">
              Every number,<br />in its place.
            </h1>
            <p className="al-tagline__sub">
              Smart accounting for modern businesses — invoices, customers,
              inventory and reports, all in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="al-pills">
            {[
              { icon: "📄", label: "GST-ready invoicing"    },
              { icon: "👥", label: "Customer management"    },
              { icon: "📦", label: "Inventory tracking"     },
              { icon: "📊", label: "Real-time reports"      },
            ].map(({ icon, label }) => (
              <div className="al-pill" key={label}>
                <span className="al-pill__icon">{icon}</span>
                <span className="al-pill__label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="al-left__footer">
          <span className="al-left__footer-text">
            Trusted by businesses across India
          </span>
        </div>
      </div>

      {/* ── Right panel — the login card lives here ── */}
      <div className="al-right">
        <div className="al-right__inner">
          {children}
        </div>
      </div>

    </div>
  );
};

export default AuthLayout;