import { Routes, Route, Navigate } from "react-router-dom";
import React from "react";
import AuthLayout from "../layouts/AuthLayout";
import LoginPage from "../modules/auth/pages/Login/index";
import RegisterPage from "../modules/auth/pages/Register";
import { StorageService } from "@/storage";

const PublicRoutes = () => {
  const storageService = new StorageService();
  const token = storageService.getItem(StorageService.STORAGE_KEYS.TOKEN);

  if (token) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <AuthLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />}></Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthLayout>
  );
};

export default PublicRoutes;
