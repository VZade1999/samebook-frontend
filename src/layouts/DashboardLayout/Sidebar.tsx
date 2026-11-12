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
  AppstoreAddOutlined,
  LeftOutlined,
  RightOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccess } from "../../permissions/useAccess";
import { useModules } from "@/session/useModules";
import { FEATURES } from "@/features/registry";
import type { FeatureSidebarItem } from "@/features/types";

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

  // Turn registry sidebar entries into antd menu items, dropping anything the
  // company hasn't connected or the user isn't allowed to see.
  const { hasModule } = useModules();
  const allowed = (i: FeatureSidebarItem) =>
    (!i.permission || can(i.permission)) &&
    (!i.anyPermission || i.anyPermission.some((p) => can(p)));
  const toMenu = (i: FeatureSidebarItem): any => {
    if (!allowed(i)) return null;
    if (!i.children) return { key: i.key, icon: i.icon, label: i.label };
    const children = i.children.map(toMenu).filter(Boolean);
    return children.length ? { key: i.key, icon: i.icon, label: i.label, children } : null;
  };
  const featureMenuItems = FEATURES.filter((f) => !f.module || hasModule(f.module))
    .flatMap((f) => f.sidebar.map(toMenu))
    .filter(Boolean);

  const menuItems = [
    can("dashboard.view") && {
      key: "/app/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    // Pluggable features (add-ons) — only when the company has connected them
    ...featureMenuItems,
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
    can("challans.view") && {
      key: "/app/delivery-challans",
      icon: <CarOutlined />,
      label: "Delivery Challans",
    },
    can("invoices.view") && {
      key: "/app/invoice",
      icon: <FileTextOutlined />,
      label: "Invoice",
    },
    can("company.modules.manage") && {
      key: "/app/settings/apps",
      icon: <AppstoreAddOutlined />,
      label: "Apps & Add-ons",
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