import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** When set, the user must have this exact role or they are redirected to "/" */
  requiredRole?: "patient" | "doctor" | "admin";
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { accessToken, user } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
