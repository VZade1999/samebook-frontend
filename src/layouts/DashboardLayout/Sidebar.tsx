import React, { useState } from "react";
import { Menu } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  RobotOutlined,
  TeamOutlined,
  BankOutlined,
  KeyOutlined,
  DownOutlined,
  SafetyOutlined,
  UsergroupDeleteOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccess } from "../../permissions/useAccess";

interface SidebarProps {
  collapsed?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ collapsed = false, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useAccess();

  const handleNav = (key: string) => {
    navigate(key);
    onClose?.();
  };

  const menuItems = [
    can("dashboard.view") && {
      key: "/app/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    (can("users.view") || can("roles.view") || can("permissions.view")) && {
      key: "user-management",
      icon: <TeamOutlined />,
      label: "User Management",
      children: [
        can("users.view") && { key: "/app/users", icon: <UserOutlined />, label: "Users" },
        can("roles.view") && { key: "/app/roles", icon: <UsergroupDeleteOutlined />, label: "Roles" },
        can("permissions.view") && { key: "/app/permissions", icon: <SafetyOutlined />, label: "Permissions" },
      ].filter(Boolean),
    },
    can("companies.view") && {
      key: "/app/companies",
      icon: <BankOutlined />,
      label: "Companies",
    },
    can("customers.view") && {
      key: "/app/customers",
      icon: <UserOutlined />,
      label: "Customers",
    },
    can("products.view") && {
      key: "/app/products",
      icon: <ShoppingOutlined />,
      label: "Products",
    },
    can("ai_agent.view") && {
      key: "/app/ai-agent",
      icon: <RobotOutlined />,
      label: "AI Agent",
    },
    can("quotations.view") && {
      key: "/app/quotation",
      icon: <FileTextOutlined />,
      label: "Quotation",
    },
  ].filter(Boolean) as any[];

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      {/* Brand */}
      <div className="brand">
        <div className="logo-icon">
          <span className="logo-box red" />
          <span className="logo-box green" />
          <span className="logo-box blue" />
          <span className="logo-box yellow" />
        </div>
        {!collapsed && (
          <div className="logo">
            Same<span>Book</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={["user-management"]}
        onClick={({ key }) => handleNav(key)}
        items={menuItems}
        inlineCollapsed={collapsed}
        className="sidebar-menu"
      />
    </aside>
  );
};

export default Sidebar;