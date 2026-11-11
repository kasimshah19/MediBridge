import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, getDashboardPathForUser } from '../../context/AuthContext';
import Spinner from '../ui/Spinner';

/**
 * Route wrapper that prevents authenticated users from visiting public-only routes
 * like /login or /register, redirecting them automatically to their dashboard.
 */
export default function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#F0FDFA] to-[#F0F9FF]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={getDashboardPathForUser(user)} replace />;
  }

  return <Outlet />;
}

