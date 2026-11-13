import React, { useEffect, useRef, useState } from "react";
import { Form, Input, Popover } from "antd";
import type { InputRef } from "antd";
import {
  ArrowRightOutlined,
  ArrowUpOutlined,
  ExclamationCircleFilled,
  LockOutlined,
  MailOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../redux/authActions";
import { RootState } from "../../../../app/store";
import "./styles.scss";

interface LoginValues {
  username: string;
  password: string;
}

const ForgotHelp = (
  <div className="sba-help">
    <b>Your admin can reset it</b>
    <p>
      SameBook passwords are managed by your company admin. Ask them to open{" "}
      <strong>Users</strong>, edit your account and set a new password.
    </p>
  </div>
);

const LoginPage = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.authn);
  const [form] = Form.useForm<LoginValues>();
  const passwordRef = useRef<InputRef>(null);

  // Only show an error that came from a sign-in attempt made on this screen,
  // and hide it again as soon as the person starts correcting their details.
  const [attempted, setAttempted] = useState(false);
  const [editedSinceError, setEditedSinceError] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const showError = attempted && !!error && !loading && !editedSinceError;

  useEffect(() => {
    if (attempted && error && !loading) {
      passwordRef.current?.focus({ cursor: "all" });
    }
  }, [error, loading, attempted]);

  const onFinish = (values: LoginValues) => {
    setAttempted(true);
    setEditedSinceError(false);
    dispatch(login({ username: values.username.trim(), password: values.password }));
  };

  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setCapsLock(e.getModifierState("CapsLock"));
  };

  return (
    <div className="sba-login">
      <div className="sba-login-head">
        <h1>Welcome back</h1>
        <p>Sign in to your SameBook workspace.</p>
      </div>

      {showError && (
        <div className="sba-alert" role="alert">
          <ExclamationCircleFilled />
          <div>
            <b>Couldn't sign you in</b>
            <span>{error}</span>
          </div>
        </div>
      )}

      <Form<LoginValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={onFinish}
        onValuesChange={() => {
          if (error && !editedSinceError) setEditedSinceError(true);
        }}
        className="sba-form"
      >
        <Form.Item
          name="username"
          label="Email"
          validateTrigger="onBlur"
          normalize={(v?: string) => (typeof v === "string" ? v.trimStart() : v)}
          rules={[
            { required: true, message: "Enter your email address" },
            { type: "email", transform: (v?: string) => v?.trim(), message: "That doesn't look like an email address" },
          ]}
        >
          <Input
            size="large"
            type="email"
            inputMode="email"
            prefix={<MailOutlined />}
            placeholder="you@company.com"
            autoComplete="username"
            autoFocus
            spellCheck={false}
          />
        </Form.Item>

        <div className="sba-password">
          <Popover
            content={ForgotHelp}
            trigger="click"
            placement="bottomRight"
            rootClassName="sba-help-pop"
          >
            <button type="button" className="sba-link sba-forgot">
              Forgot password?
            </button>
          </Popover>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Enter your password" }]}
            extra={
              capsLock ? (
                <span className="sba-caps">
                  <ArrowUpOutlined /> Caps Lock is on
                </span>
              ) : undefined
            }
          >
            <Input.Password
              ref={passwordRef}
              size="large"
              prefix={<LockOutlined />}
              placeholder="Your password"
              autoComplete="current-password"
              onKeyDown={trackCapsLock}
              onKeyUp={trackCapsLock}
              onBlur={() => setCapsLock(false)}
            />
          </Form.Item>
        </div>

        <button
          type="submit"
          className={`sba-submit${loading ? " is-loading" : ""}`}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="sba-spinner" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRightOutlined />
            </>
          )}
        </button>
      </Form>

      <div className="sba-invite">
        <span className="sba-invite-icon" aria-hidden="true">
          <TeamOutlined />
        </span>
        <p>
          <b>New to SameBook?</b> Your company admin can add you from{" "}
          <strong>Users</strong>. You'll sign in with the email they use.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
