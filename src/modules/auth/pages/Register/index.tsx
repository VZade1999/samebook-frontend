import React from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Row,
  Col,
  Checkbox,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import "./styles.scss";
import logMessage from "../../../../utils/logger";
import { RootState } from "../../../../app/store";

const { Title, Text } = Typography;

const RegisterPage = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.authn);
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    logMessage("Form values:", values);
    // dispatch(registerRequest(values));
  };

  return (
    <div className="register-page">
      <div className="register-page__container">
        {/* Logo */}
        <div className="register-page__logo">
          <div className="logo-icon">
            <span className="logo-box red"></span>
            <span className="logo-box green"></span>
            <span className="logo-box blue"></span>
            <span className="logo-box yellow"></span>
          </div>
        </div>

        {/* Header */}
        <div className="register-page__header">
          <Title level={2}>Create Account</Title>
          <Text type="secondary">
            Join thousands of businesses using SameBook.
          </Text>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            className="register-page__alert"
            closable
          />
        )}

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="register-page__form"
          requiredMark="optional"
        >
          {/* Name Row */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="First Name"
                name="firstName"
                rules={[
                  { required: true, message: "Please enter first name" },
                  { min: 2, message: "Must be at least 2 characters" },
                ]}
              >
                <Input
                  size="large"
                  placeholder="John"
                  prefix={<UserOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Last Name"
                name="lastName"
                rules={[
                  { required: true, message: "Please enter last name" },
                  { min: 2, message: "Must be at least 2 characters" },
                ]}
              >
                <Input
                  size="large"
                  placeholder="Craig"
                  prefix={<UserOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Mobile Number */}
          <Form.Item
            label="Mobile Number"
            name="mobile"
            rules={[
              { required: true, message: "Please enter mobile number" },
              {
                pattern: /^[0-9]{10,}$/,
                message: "Enter valid mobile number",
              },
            ]}
          >
            <Input
              size="large"
              placeholder="9999999999"
              prefix={<span className="country-code">IN +91</span>}
            />
          </Form.Item>

          {/* Email */}
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Enter valid email" },
            ]}
          >
            <Input
              size="large"
              placeholder="your-email@gmail.com"
              prefix={<MailOutlined />}
            />
          </Form.Item>

          {/* Password */}
          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Please enter password" },
              { min: 8, message: "Password must be at least 8 characters" },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message:
                  "Password must contain uppercase, lowercase, and numbers",
              },
            ]}
          >
            <Input.Password
              size="large"
              placeholder="Password"
              prefix={<LockOutlined />}
            />
          </Form.Item>

          {/* Data Center Info */}
          <div className="register-page__info">
            <Text>
              Your data will be stored in the INDIA data center, as you are in
              India.
            </Text>
          </div>

          {/* Terms Checkbox */}
          <Form.Item
            name="terms"
            valuePropName="checked"
            rules={[{ required: true, message: "You must agree to the terms" }]}
            className="register-page__checkbox"
          >
            <Checkbox>
              <Text>
                I agree to the{" "}
                <a href="#" className="link-primary">
                  Terms of service
                </a>{" "}
                and{" "}
                <a href="#" className="link-primary">
                  Privacy policies
                </a>{" "}
                of SameBook
              </Text>
            </Checkbox>
          </Form.Item>

          {/* Submit Button */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              className="register-page__btn"
            >
              Create Account
            </Button>
          </Form.Item>
        </Form>

        {/* Footer */}
        <div className="register-page__footer">
          <Text type="secondary">
            Already have an account?{" "}
            <a href="/login" className="link-primary">
              Sign in
            </a>
          </Text>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
