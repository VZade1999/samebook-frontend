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
  AppstoreOutlined,
  ShopOutlined,
  FieldTimeOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccess } from "../../permissions/useAccess";

interface SidebarProps {
  collapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

const Sidebar = ({ collapsed = false, onClose, onToggleCollapse }: SidebarProps) => {
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
    (can("attendance.view") || can("attendance.manage")) && {
      key: "attendance-management",
      icon: <FieldTimeOutlined />,
      label: "Attendance",
      children: [
        can("attendance.view") && { key: "/app/attendance", icon: <FieldTimeOutlined />, label: "My Attendance" },
        can("attendance.manage") && { key: "/app/attendance/team", icon: <TeamOutlined />, label: "Team Attendance" },
      ].filter(Boolean),
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
      label: "My Company",
    },
    can("customers.view") && {
      key: "/app/customers",
      icon: <UserOutlined />,
      label: "Customers",
    },
    (can("products.view") || can("categories.view") || can("warehouses.view")) && {
      key: "products-management",
      icon: <ShoppingOutlined />,
      label: "Products",
      children: [
        can("products.view") && { key: "/app/products", icon: <ShoppingOutlined />, label: "Products" },
        can("categories.view") && { key: "/app/categories", icon: <AppstoreOutlined />, label: "Categories" },
        can("warehouses.view") && { key: "/app/warehouses", icon: <ShopOutlined />, label: "Warehouses" },
      ].filter(Boolean),
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
    can("invoices.view") && {
      key: "/app/invoice",
      icon: <FileTextOutlined />,
      label: "Invoice",
    },
  ].filter(Boolean) as any[];

  return (
    <div className="sidebar-shell">
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

      {/* Collapse / expand toggle — desktop only. Rendered outside the
          sidebar's own overflow:hidden so the circular button isn't
          clipped at the edge. */}
      {onToggleCollapse && (
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <RightOutlined /> : <LeftOutlined />}
        </button>
      )}
    </div>
  );
};

export default Sidebar;