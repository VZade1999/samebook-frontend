import React, { lazy } from "react";
import { ShopOutlined, ShoppingCartOutlined, WalletOutlined } from "@ant-design/icons";
import type { FeatureManifest } from "@/features/types";

const OrdersPage = lazy(() => import("./OrdersPage"));
const SuppliersPage = lazy(() => import("./SuppliersPage"));
const BillsPage = lazy(() => import("./BillsPage"));

/**
 * Purchases (the add-on "purchases"): purchase orders with approval and goods
 * received into stock, suppliers, supplier bills and payments. Its sidebar
 * group sits after the sales documents.
 */
const purchasesFeature: FeatureManifest = {
  key: "purchases",
  module: "purchases",
  name: "Purchases",
  placement: "sales",
  routes: [
    { path: "/purchase-orders", element: <OrdersPage />, anyPermission: ["purchases.view", "purchases.receive", "purchases.create"] },
    { path: "/suppliers", element: <SuppliersPage />, anyPermission: ["purchases.view", "purchases.create", "purchases.bills"] },
    { path: "/purchase-bills", element: <BillsPage />, anyPermission: ["purchases.view", "purchases.bills"] },
  ],
  sidebar: [
    {
      key: "purchases",
      label: "Purchases",
      icon: <ShoppingCartOutlined />,
      anyPermission: ["purchases.view", "purchases.create", "purchases.receive", "purchases.bills"],
      children: [
        { key: "/app/purchase-orders", label: "Purchase orders", icon: <ShoppingCartOutlined />, anyPermission: ["purchases.view", "purchases.receive", "purchases.create"] },
        { key: "/app/purchase-bills", label: "Supplier bills", icon: <WalletOutlined />, anyPermission: ["purchases.view", "purchases.bills"] },
        { key: "/app/suppliers", label: "Suppliers", icon: <ShopOutlined />, anyPermission: ["purchases.view", "purchases.create", "purchases.bills"] },
      ],
    },
  ],
};

export default purchasesFeature;
