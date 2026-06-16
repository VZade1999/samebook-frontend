import { Layout, Menu } from "antd";
import React from "react";
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  RobotOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";

import { useAccess } from "../../permissions/useAccess";
import { StorageService } from "@/storage";

const { Sider } = Layout;

const Sidebar = () => {
  const navigate = useNavigate();
  const { can } = useAccess();

  const menuItems = [
    {
      key: "/app/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      visible: can("customer.view"),
    },
    {

      icon: <TeamOutlined />,
      label: "User Management",
      children: [
        {
          key: "/app/users",
          label: "Users",
        },

        {
          key: "/app/roles",
          label: "Roles",
        },

        {
          key: "/app/permissions",
          label: "Permissions",
        },
      ],
      visible: can("invoice.view"),
    },
    {
      key: "/app/companies",
      icon: <UserOutlined />,
      label: "Companies",
      visible: can("customer.view"),
    },

    {
      key: "/app/customers",
      icon: <UserOutlined />,
      label: "Customers",
      visible: can("customer.view"),
    },
    {
      key: "/app/products",
      icon: <ShoppingOutlined />,
      label: "Products",
      visible: can("product.view"),
    },

    {
      key: "/app/ai-agent",
      icon: <RobotOutlined />,
      label: "Ai Agent",
      visible: can("customer.view"),
    },

    {
      key: "/app/quotation",
      icon: <FileTextOutlined />,
      label: "Quotation",
      visible: can("invoice.view"),
    },
  ];

  return (
    <Sider width={240} theme="light" breakpoint="lg" collapsedWidth={0}>
      <div className="brand">
        <div className="logo-icon">
          <span className="logo-box red"></span>
          <span className="logo-box green"></span>
          <span className="logo-box blue"></span>
          <span className="logo-box yellow"></span>
        </div>
        <div className="logo">
          Same<span>Book</span>
        </div>
      </div>

      <Menu
        mode="inline"
        defaultSelectedKeys={[window.location.pathname]}
        onClick={({ key }) => navigate(key)}
        items={menuItems
          .filter((item) => item.visible)
          .map(({ visible, ...item }) => item)}
      />
    </Sider>
  );
};

export default Sidebar;
