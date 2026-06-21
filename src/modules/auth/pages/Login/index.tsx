import React, { useState } from "react";
import { Form, Alert } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../redux/authActions";
import { RootState } from "../../../../app/store";
import "./styles.scss";

const LoginPage = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.authn);
  const [form] = Form.useForm();
  const [showPassword, setShowPassword] = useState(false);

  const onFinish = (values: any) => {
    dispatch(login(values));
  };

  return (
    <div className="lgn-shell">
      <div className="lgn-card">

        {/* ── Logo ── */}
        <div className="lgn-logo">
          <div className="lgn-logo-grid">
            <span className="lgn-logo-box lgn-logo-box--red"   />
            <span className="lgn-logo-box lgn-logo-box--green" />
            <span className="lgn-logo-box lgn-logo-box--blue"  />
            <span className="lgn-logo-box lgn-logo-box--yellow"/>
          </div>
        </div>

        {/* ── Heading ── */}
        <div className="lgn-heading">
          <h1 className="lgn-title">Welcome back</h1>
          <p className="lgn-sub">Sign in to manage your business</p>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="lgn-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.5" />
              <path d="M8 5v3.5M8 11h.01" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Form ── */}
        <Form form={form} layout="vertical" onFinish={onFinish} className="lgn-form">

          {/* Email */}
          <Form.Item
            name="username"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email",  message: "Enter a valid email address" },
            ]}
          >
            <div className="lgn-field">
              <label className="lgn-label" htmlFor="lgn-email">Email</label>
              <div className="lgn-input-wrap">
                <span className="lgn-input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M2 5.5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </span>
                <Form.Item name="username" noStyle>
                  <input
                    id="lgn-email"
                    className="lgn-input"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    autoFocus
                  />
                </Form.Item>
              </div>
            </div>
          </Form.Item>

          {/* Password */}
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <div className="lgn-field">
              <div className="lgn-label-row">
                <label className="lgn-label" htmlFor="lgn-password">Password</label>
                <button type="button" className="lgn-forgot">Forgot password?</button>
              </div>
              <div className="lgn-input-wrap">
                <span className="lgn-input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="4" y="7" width="8" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </span>
                <Form.Item name="password" noStyle>
                  <input
                    id="lgn-password"
                    className="lgn-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </Form.Item>
                <button
                  type="button"
                  className="lgn-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    /* eye-off */
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2l12 12M6.68 6.69A2 2 0 0010.3 9.3M5.06 4.07C3.5 5.1 2.3 6.45 1.5 8c1.3 2.7 4 4.5 6.5 4.5a7.1 7.1 0 003.44-.9M8 3.5C10.5 3.5 13.2 5.3 14.5 8c-.4.8-.9 1.54-1.56 2.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    /* eye */
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1.5 8C2.8 5.3 5.5 3.5 8 3.5S13.2 5.3 14.5 8C13.2 10.7 10.5 12.5 8 12.5S2.8 10.7 1.5 8z" stroke="currentColor" strokeWidth="1.3"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </Form.Item>

          {/* Submit */}
          <Form.Item noStyle>
            <button
              type="submit"
              className={`lgn-submit${loading ? " lgn-submit--loading" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="lgn-spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </Form.Item>

        </Form>

      </div>
    </div>
  );
};

export default LoginPage;