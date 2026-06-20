import { Routes, Route, Navigate } from "react-router-dom";
import React from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { StorageService } from "@/storage";
import DashboardPage from "../modules/dashboard/pages/Dashboard/index";
import CustomerPage from "@/modules/customers/pages";
import CompanyPage from "@/modules/companies/pages";
import ProductPage from "@/modules/products/pages";
import AiAgent from "@/modules/ai-agent/index";
import QuotationPage from "@/modules/quotation/pages";
import UsersPage from "@/modules/users/pages";
// import UsersList from "../modules/users/pages/UsersList";
import RolesPage from "../modules/user-management/pages/RolesPage";
import PermissionsPage from "../modules/user-management/pages/PermissionsPage";
// import RolesList from "../modules/user-management/pages/RolesList";
// import PermissionsList from "../modules/user-management/pages/PermissionsList";

// import QuotationList from "../modules/quotation/pages/InvoiceList";

import ProtectedRoute from "../permissions/ProtectedRoute";
import InvoiceList from "@/modules/invoice/pages/InvoiceListPage";
import InvoiceDetails from "@/modules/invoice/pages/InvoiceDetails";
import Profile from "@/modules/auth/profile/page";

const PrivateRoutes = () => {
  const storageService = new StorageService();
  const token = storageService.getItem(StorageService.STORAGE_KEYS.TOKEN);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route
          path="/profile"
          element={
              <Profile />
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute permission="customers.view">
              <CustomerPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute permission="products.view">
              <ProductPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/companies"
          element={
            <ProtectedRoute permission="companies.view">
              <CompanyPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-agent"
          element={
            <ProtectedRoute permission="ai_agent.view">
              <AiAgent />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quotation"
          element={
            <ProtectedRoute permission="quotations.view">
              <QuotationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoice"
          element={
            <ProtectedRoute permission="quotations.view">
              <InvoiceList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoice-details/:id"
          element={
            <ProtectedRoute permission="quotations.view">
              <InvoiceDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute permission="users.view">
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute permission="roles.view">
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/permissions"
          element={
            <ProtectedRoute permission="permissions.view">
              <PermissionsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default PrivateRoutes;
