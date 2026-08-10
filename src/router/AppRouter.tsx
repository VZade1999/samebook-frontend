import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import React, { useEffect } from "react";
import PublicRoutes from "./PublicRoutes";
import PrivateRoutes from "./PrivateRoutes";
import LandingPage from "../pages/Landing";
import { useSelector } from "react-redux";

const AppRouter = () => {
  const authDetails = useSelector((state: any) => state.authn);
  const navigate = useNavigate();
  const location = useLocation();

  // Only bounce an already-logged-in visitor away from the login form itself.
  // The landing page ("/") and any other public route must stay reachable
  // regardless of auth state — this used to unconditionally redirect on every
  // mount, which hijacked any route (including a public marketing page).
  useEffect(() => {
    if (authDetails?.isLoggedIn && location.pathname === "/login") {
      navigate("/app/dashboard");
    }
  }, [authDetails?.isLoggedIn, location.pathname]);

  return (
    <Routes>
      {/* Public marketing page — no auth required */}
      <Route path="/" element={<LandingPage />} />

      {/* Public Routes (login, etc.) */}
      <Route path="/*" element={<PublicRoutes />} />

      {/* Private Routes */}
      <Route path="/app/*" element={<PrivateRoutes />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
