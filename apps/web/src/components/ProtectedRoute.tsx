import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { getRoleHomePath, useFrontendRole } from "../app/frontendRole";

interface Props {
  children: ReactNode;
  /** When set, the user must have this exact role or they are redirected to "/" */
  requiredRole?: "patient" | "doctor" | "admin";
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const role = useFrontendRole();
  const location = useLocation();

  if (!role) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }

  return <>{children}</>;
}
