import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import React, { useEffect } from "react";
import PublicRoutes from "./PublicRoutes";
import PrivateRoutes from "./PrivateRoutes";
import { useSelector } from "react-redux";

const AppRouter = () => {
  const authDetails = useSelector((state: any) => state.authn);
  const navigate = useNavigate();
  useEffect(() => {
    if (authDetails?.isLoggedIn) {
      navigate("app/dashboard");
    } else {
      navigate("/login");
    }
  }, [authDetails?.isLoggedIn]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/*" element={<PublicRoutes />} />

      {/* Private Routes */}
      <Route path="/app/*" element={<PrivateRoutes />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
