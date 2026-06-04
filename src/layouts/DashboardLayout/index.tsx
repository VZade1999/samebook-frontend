import React from "react";

import { Layout } from "antd";

import Sidebar from "./Sidebar";

import HeaderBar from "./Header";

import "./styles.scss";

const { Content } = Layout;

interface Props {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: Props) => {
  return (
    <Layout className="dashboard-layout">
      {/* Sidebar */}
      <Sidebar />

      <Layout>
        {/* Header */}
        <HeaderBar />

        {/* Main Content */}
        <Content className="dashboard-content">
          <div className="dashboard-container">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
