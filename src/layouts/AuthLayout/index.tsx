import React from "react";

import "./styles.scss";

interface Props {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: Props) => {
  return (
    <div className="auth-layout">
      {/* Left Section */}
      <div className="auth-layout__left">
        <div className="branding">
          <h1>SameBook</h1>

          <p>Smart accounting platform for modern businesses.</p>
        </div>
      </div>

      {/* Right Section */}
      <div className="auth-layout__right">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
