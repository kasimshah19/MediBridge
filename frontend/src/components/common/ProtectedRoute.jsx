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

  // Pharmacist or NGO account pending/rejected approval
  const isSpecialRole = user.role === 'pharmacist' || user.role === 'ngo';
  const isNotApproved = user.approvalStatus !== 'approved';
  const isAllowedPathWhenPending =
    location.pathname === '/approval-pending' || location.pathname === '/profile';

  if (isSpecialRole && isNotApproved && !isAllowedPathWhenPending) {
    return <Navigate to="/approval-pending" replace />;
  }

  // Role unauthorized
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
