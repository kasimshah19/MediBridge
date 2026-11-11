import { Routes, Route } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import PublicOnlyRoute from '../components/common/PublicOnlyRoute';

// Public pages
import Home from '../pages/public/Home';
import NotFound from '../pages/public/NotFound';
import Unauthorized from '../pages/public/Unauthorized';

// Auth pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import ApprovalPending from '../pages/auth/ApprovalPending';

// Profile & Dashboard pages
import Profile from '../pages/user/Profile';
import DonorDashboard from '../pages/donor/DonorDashboard';
import PharmacistDashboard from '../pages/pharmacist/PharmacistDashboard';
import NgoDashboard from '../pages/ngo/NgoDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Public Layout Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Route>

      {/* 2. Public-Only Auth Routes (Redirects to dashboard if signed in) */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* 3. Protected Routes for All Authenticated Users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/approval-pending" element={<ApprovalPending />} />

        {/* Dashboard Shell Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/profile" element={<Profile />} />

          {/* Role-Guarded Dashboards */}
          <Route element={<ProtectedRoute allowedRoles={['donor', 'admin']} />}>
            <Route path="/donor/dashboard" element={<DonorDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['pharmacist', 'admin']} />}>
            <Route path="/pharmacist/dashboard" element={<PharmacistDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ngo', 'admin']} />}>
            <Route path="/ngo/dashboard" element={<NgoDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      {/* 4. Global 404 Catch-All */}
      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
