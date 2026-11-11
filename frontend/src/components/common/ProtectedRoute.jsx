// Implemented in Phase 1: Authentication & Role Guard
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles = [] }) {
  // Phase 1 implementation will verify token and roles from AuthContext
  return <Outlet />;
}

