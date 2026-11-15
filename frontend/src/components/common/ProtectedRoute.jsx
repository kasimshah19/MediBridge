import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../ui/Spinner';

/**
 * Route guard that ensures the user is logged in, has the allowed role,
 * and handles approval status for pharmacists and NGOs.
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#F0FDFA] to-[#F0F9FF]">
        <Spinner size="lg" />
        <p className="text-xs text-text-muted mt-3 font-medium">Verifying authorization...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // NGO approval flow routes to /ngo/onboarding
  if (user.role === 'ngo' && user.approvalStatus !== 'approved') {
    if (location.pathname !== '/ngo/onboarding' && location.pathname !== '/profile') {
      return <Navigate to="/ngo/onboarding" replace />;
    }
  }

  // Pharmacist approval flow routes to /approval-pending
  if (user.role === 'pharmacist' && user.approvalStatus !== 'approved') {
    if (location.pathname !== '/approval-pending' && location.pathname !== '/profile') {
      return <Navigate to="/approval-pending" replace />;
    }
  }

  // Role unauthorized
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
