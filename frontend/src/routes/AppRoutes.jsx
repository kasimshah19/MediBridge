import { Routes, Route } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import PublicOnlyRoute from '../components/common/PublicOnlyRoute';

// Public pages
import Home from '../pages/public/Home';
import ForNgos from '../pages/public/ForNgos';
import About from '../pages/public/About';
import Terms from '../pages/public/Terms';
import Privacy from '../pages/public/Privacy';
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
import DonateWizard from '../pages/donor/DonateWizard';
import MyDonations from '../pages/donor/MyDonations';
import DonationDetail from '../pages/donor/DonationDetail';
import DonorExpiry from '../pages/donor/DonorExpiry';
import PharmacistDashboard from '../pages/pharmacist/PharmacistDashboard';
import VerificationQueue from '../pages/pharmacist/VerificationQueue';
import VerificationDetail from '../pages/pharmacist/VerificationDetail';
import PharmacistHistory from '../pages/pharmacist/PharmacistHistory';
import PharmacistExpiry from '../pages/pharmacist/PharmacistExpiry';
import NgoDashboard from '../pages/ngo/NgoDashboard';
import NgoOnboarding from '../pages/ngo/NgoOnboarding';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminOrganizations from '../pages/admin/AdminOrganizations';
import AdminPharmacists from '../pages/admin/AdminPharmacists';
import AdminExpiry from '../pages/admin/AdminExpiry';
import AdminVerification from '../pages/admin/AdminVerification';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Public Layout Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/for-ngos" element={<ForNgos />} />
        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
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
            <Route path="/donor/donate" element={<DonateWizard />} />
            <Route path="/donor/donate/:id" element={<DonateWizard />} />
            <Route path="/donor/donations" element={<MyDonations />} />
            <Route path="/donor/donations/:id" element={<DonationDetail />} />
            <Route path="/donor/expiry" element={<DonorExpiry />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['pharmacist', 'admin']} />}>
            <Route path="/pharmacist/dashboard" element={<PharmacistDashboard />} />
            <Route path="/pharmacist/verification" element={<VerificationQueue />} />
            <Route path="/pharmacist/verification/:donationId" element={<VerificationDetail />} />
            <Route path="/pharmacist/history" element={<PharmacistHistory />} />
            <Route path="/pharmacist/expiry" element={<PharmacistExpiry />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ngo', 'admin']} />}>
            <Route path="/ngo/dashboard" element={<NgoDashboard />} />
            <Route path="/ngo/onboarding" element={<NgoOnboarding />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/organizations" element={<AdminOrganizations />} />
            <Route path="/admin/pharmacists" element={<AdminPharmacists />} />
            <Route path="/admin/verification" element={<AdminVerification />} />
            <Route path="/admin/expiry" element={<AdminExpiry />} />
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
