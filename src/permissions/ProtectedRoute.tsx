import { Navigate } from "react-router-dom";
import React from "react";
import { useAccess } from "./useAccess";

const ProtectedRoute = ({ children, permission }) => {
  const { can } = useAccess();

  if (!can(permission)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
