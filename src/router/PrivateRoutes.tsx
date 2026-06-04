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
// import UsersList from "../modules/users/pages/UsersList";

// import QuotationList from "../modules/quotation/pages/InvoiceList";

import ProtectedRoute from "../permissions/ProtectedRoute";

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
          path="/customers"
          element={
            <ProtectedRoute permission="customer.view">
              <CustomerPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute permission="product.view">
              <ProductPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/companies"
          element={
            <ProtectedRoute permission="customer.view">
              <CompanyPage />
            </ProtectedRoute>
          }
        />

         <Route
          path="/ai-agent"
          element={
            <ProtectedRoute permission="customer.view">
              <AiAgent />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quotation"
          element={
            // <ProtectedRoute permission="quotation.view">
            <QuotationPage />
            // </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default PrivateRoutes;
