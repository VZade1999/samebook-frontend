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
import UsersPage from "@/modules/team/TeamPage";
import PlatformPage from "@/modules/platform/PlatformPage";
// import UsersList from "../modules/users/pages/UsersList";
import RolesPage from "../modules/user-management/pages/RolesPage";
import PermissionsPage from "../modules/user-management/pages/PermissionsPage";
import CategoriesPage from "@/modules/stock/CategoriesPage";
import WarehousesPage from "@/modules/stock/StockPage";
import { FEATURES } from "@/features/registry";
import ModuleRoute from "@/features/ModuleRoute";
import AppsPage from "@/modules/apps/pages/AppsPage";
// import RolesList from "../modules/user-management/pages/RolesList";
// import PermissionsList from "../modules/user-management/pages/PermissionsList";

// import QuotationList from "../modules/quotation/pages/InvoiceList";

import ProtectedRoute from "../permissions/ProtectedRoute";
import InvoicePage from "@/modules/invoice/pages";
import InvoiceDetailsRedirect from "@/modules/invoice/pages/InvoiceDetailsRedirect";
import Profile from "@/modules/auth/profile/page";
import ChallanPage from "@/modules/delivery-challan/pages";
import ChallanDetailsRedirect from "@/modules/delivery-challan/pages/ChallanDetailsRedirect";

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

        {/* Pluggable features (add-ons) — routes come from the registry */}
        {FEATURES.flatMap((f) =>
          f.routes.map((r) => (
            <Route
              key={`${f.key}:${r.path}`}
              path={r.path}
              element={
                <ModuleRoute module={f.module} name={f.name} permission={r.permission}>
                  {r.element}
                </ModuleRoute>
              }
            />
          )),
        )}

        <Route
          path="/settings/apps"
          element={
            <ProtectedRoute permission="company.modules.manage">
              <AppsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/categories"
          element={
            <ProtectedRoute permission="categories.view">
              <CategoriesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouses"
          element={
            <ProtectedRoute permission="warehouses.view">
              <WarehousesPage />
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
            <ProtectedRoute permission="invoices.view">
              <InvoicePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoice-details/:id"
          element={
            <ProtectedRoute permission="invoices.view">
              <InvoiceDetailsRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery-challans"
          element={
            <ProtectedRoute permission="challans.view">
              <ChallanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery-challans/:id"
          element={
            <ProtectedRoute permission="challans.view">
              <ChallanDetailsRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform"
          element={
            <ProtectedRoute permission="tenants.view">
              <PlatformPage />
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
