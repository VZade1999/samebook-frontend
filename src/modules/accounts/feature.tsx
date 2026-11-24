import React, { lazy } from "react";
import { BankOutlined, BarChartOutlined, BookOutlined, MinusCircleOutlined, RollbackOutlined, TeamOutlined } from "@ant-design/icons";
import type { FeatureManifest } from "@/features/types";

const LedgersPage = lazy(() => import("./LedgersPage"));
const CashBankPage = lazy(() => import("./CashBankPage"));
const ExpensesPage = lazy(() => import("./ExpensesPage"));
const NotesPage = lazy(() => import("./NotesPage"));
const ReportsPage = lazy(() => import("./ReportsPage"));

const VIEW = ["accounts.view", "accounts.record", "accounts.reports"];
const REPORTS = ["accounts.reports"];

/**
 * Accounts (the add-on "accounts"): books of accounts kept from invoices,
 * bills and payments — customer and supplier ledgers with statements,
 * receipts, expenses, cash and bank books, journals. Its sidebar group sits
 * after the sales documents (and Purchases).
 */
const accountsFeature: FeatureManifest = {
  key: "accounts",
  module: "accounts",
  name: "Accounts",
  placement: "sales",
  routes: [
    { path: "/ledger", element: <LedgersPage />, anyPermission: VIEW },
    { path: "/cash-bank", element: <CashBankPage />, anyPermission: VIEW },
    { path: "/expenses", element: <ExpensesPage />, anyPermission: VIEW },
    { path: "/notes", element: <NotesPage />, anyPermission: VIEW },
    { path: "/accounts-reports", element: <ReportsPage />, anyPermission: REPORTS },
  ],
  sidebar: [
    {
      key: "accounts",
      label: "Accounts",
      icon: <BookOutlined />,
      anyPermission: VIEW,
      children: [
        { key: "/app/ledger", label: "Ledgers", icon: <TeamOutlined />, anyPermission: VIEW },
        { key: "/app/cash-bank", label: "Cash & bank", icon: <BankOutlined />, anyPermission: VIEW },
        { key: "/app/expenses", label: "Expenses", icon: <MinusCircleOutlined />, anyPermission: VIEW },
        { key: "/app/notes", label: "Credit & debit notes", icon: <RollbackOutlined />, anyPermission: VIEW },
        { key: "/app/accounts-reports", label: "Reports", icon: <BarChartOutlined />, anyPermission: REPORTS },
      ],
    },
  ],
};

export default accountsFeature;
