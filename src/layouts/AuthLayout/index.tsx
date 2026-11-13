import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  FileDoneOutlined,
  LineChartOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useTheme } from "@/theme/ThemeProvider";
import "./styles.scss";

interface Props {
  children: React.ReactNode;
}

// The four-square SameBook mark.
export const SameBookMark = () => (
  <span className="sba-mark" aria-hidden="true">
    <i className="r" />
    <i className="g" />
    <i className="b" />
    <i className="y" />
  </span>
);

// Decorative only: heights of the little column chart in the preview card.
const PREVIEW_BARS = [36, 50, 42, 60, 54, 70, 63, 86];

const FEATURES = [
  { icon: <FileDoneOutlined />, label: "Quotations to GST invoices in one click" },
  { icon: <TeamOutlined />, label: "Customers, leads and follow-ups together" },
  { icon: <LineChartOutlined />, label: "Live sales, dues and collections" },
];

const AuthLayout = ({ children }: Props) => {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <div className="sba-root">
      {/* ── Brand panel (same gradient hero as the dashboard) ── */}
      <aside className="sba-brand">
        <span className="sba-orb a" aria-hidden="true" />
        <span className="sba-orb b" aria-hidden="true" />
        <span className="sba-grid" aria-hidden="true" />

        <div className="sba-brand-inner">
          <Link to="/" className="sba-wordmark">
            <SameBookMark />
            SameBook
          </Link>

          <div className="sba-pitch">
            <span className="sba-eyebrow">Business accounting</span>
            <p className="sba-headline">
              Every number,
              <br />
              in its place.
            </p>
            <p className="sba-sub">
              Quotations, invoices, challans, customers and stock: one calm
              workspace for your whole business.
            </p>
          </div>

          <div className="sba-preview" aria-hidden="true">
            <div className="sba-card">
              <div className="sba-card-top">
                <span>This month · Sales</span>
                <em>Example</em>
              </div>
              <div className="sba-card-num">₹4,82,600</div>
              <div className="sba-card-delta">
                <b>▲ 12.4%</b> vs last month
              </div>
              <div className="sba-bars">
                {PREVIEW_BARS.map((h, i) => (
                  <span key={i} style={{ height: `${h}%`, animationDelay: `${120 + i * 55}ms` }} />
                ))}
              </div>
              <div className="sba-meter">
                <div className="sba-meter-top">
                  <span>Collected</span>
                  <b>78%</b>
                </div>
                <div className="sba-track">
                  <span style={{ width: "78%" }} />
                </div>
              </div>
            </div>

            <div className="sba-toast">
              <CheckCircleFilled />
              <div>
                <b>QT-0142 approved</b>
                <span>Converted to invoice INV-0391</span>
              </div>
            </div>
          </div>

          <ul className="sba-features">
            {FEATURES.map((f) => (
              <li key={f.label}>
                <span className="sba-feature-icon" aria-hidden="true">
                  {f.icon}
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Form side ── */}
      <main className="sba-main">
        <header className="sba-top">
          <Link to="/" className="sba-back">
            <ArrowLeftOutlined /> Home
          </Link>
          <button
            type="button"
            className="sba-theme"
            onClick={toggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? <SunOutlined /> : <MoonOutlined />}
          </button>
        </header>

        <div className="sba-main-inner">{children}</div>

        <footer className="sba-foot">
          <span>© {new Date().getFullYear()} SameBook</span>
          <span>
            <SafetyCertificateOutlined /> Secure sign-in
          </span>
        </footer>
      </main>
    </div>
  );
};

export default AuthLayout;
