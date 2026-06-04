import { useState } from "react";
import React from "react";
import { Form, Input, Button, Typography, Alert } from "antd";

import { EyeOutlined, MailOutlined } from "@ant-design/icons";

import { useDispatch, useSelector } from "react-redux";

import { login } from "../../redux/authActions";

import { RootState } from "../../../../app/store";

import "./styles.scss";

const { Title, Text } = Typography;

const LoginPage = () => {
  const dispatch = useDispatch();

  const { loading, error } = useSelector((state: RootState) => state.authn);

  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    dispatch(login(values));
  };

  return (
    <div className="login-page">
      {/* Logo */}
      <div className="login-page__logo">
        <div className="logo-icon">
          <span className="logo-box red"></span>
          <span className="logo-box green"></span>
          <span className="logo-box blue"></span>
          <span className="logo-box yellow"></span>
        </div>
      </div>
      <div className="login-page__header">
        <Title level={2}>Welcome Back 👋</Title>

        <Text type="secondary">Login to manage your business smarter.</Text>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* Email */}
        <Form.Item
          label="Email"
          name="username"
          rules={[
            {
              required: true,
              message: "Please enter your email",
            },
            {
              type: "email",
              message: "Enter valid email",
            },
          ]}
        >
          <Input
            size="large"
            placeholder="Enter email"
            prefix={<MailOutlined />}
          />
        </Form.Item>

        {/* Password */}
        <Form.Item
          label="Password"
          name="password"
          rules={[
            {
              required: true,
              message: "Please enter password",
            },
          ]}
        >
          <Input.Password
            size="large"
            placeholder="Enter password"
            prefix={<EyeOutlined />}
          />
        </Form.Item>

        {/* Submit */}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
          >
            Login
          </Button>
        </Form.Item>
      </Form>

      <div className="login-page__footer">
        <Text type="secondary">Forgot password?</Text>
      </div>
    </div>
  );
};

export default LoginPage;
