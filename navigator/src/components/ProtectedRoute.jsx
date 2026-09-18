import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const sessionRaw = localStorage.getItem("user_session");

  if (!sessionRaw) {
    return <Navigate to="/login" replace />;
  }

  const session = JSON.parse(sessionRaw);
  const now = new Date().getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (now - session.loginTimestamp > twentyFourHours) {
    localStorage.removeItem("user_session");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
