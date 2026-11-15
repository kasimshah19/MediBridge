import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Heart,
  PackagePlus,
  Clock,
  ClipboardCheck,
  ShieldCheck,
  Building2,
  GitPullRequest,
  QrCode,
  Users,
  FileText,
  Activity,
  LogOut,
  Stethoscope,
} from 'lucide-react';
import { useAuth, getDashboardPathForUser } from '../../context/AuthContext';
import Logo from '../common/Logo';
import Badge from '../ui/Badge';

export default function Sidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const dashboardPath = getDashboardPathForUser(user);

  // Common navigation items
  const primaryNav = [
    {
      name: 'Dashboard',
      path: dashboardPath,
      icon: LayoutDashboard,
      active: location.pathname === dashboardPath,
    },
    {
      name: 'Profile & Security',
      path: '/profile',
      icon: User,
      active: location.pathname === '/profile',
    },
  ];

  // Admin active navigation
  if (user.role === 'admin') {
    primaryNav.push(
      {
        name: 'Organizations',
        path: '/admin/organizations',
        icon: Building2,
        active: location.pathname.startsWith('/admin/organizations'),
      },
      {
        name: 'Pharmacists',
        path: '/admin/pharmacists',
        icon: Stethoscope,
        active: location.pathname.startsWith('/admin/pharmacists'),
      },
      {
        name: 'Expiry Tracker',
        path: '/admin/expiry',
        icon: Clock,
        active: location.pathname.startsWith('/admin/expiry'),
      },
      {
        name: 'Verification Log',
        path: '/admin/verification',
        icon: ClipboardCheck,
        active: location.pathname.startsWith('/admin/verification'),
      }
    );
  }

  // Pharmacist active navigation
  if (user.role === 'pharmacist') {
    primaryNav.splice(
      1,
      0,
      {
        name: 'Verification Queue',
        path: '/pharmacist/verification',
        icon: ClipboardCheck,
        active: location.pathname.startsWith('/pharmacist/verification'),
      },
      {
        name: 'My History',
        path: '/pharmacist/history',
        icon: FileText,
        active: location.pathname.startsWith('/pharmacist/history'),
      },
      {
        name: 'Expiry Tracker',
        path: '/pharmacist/expiry',
        icon: Clock,
        active: location.pathname.startsWith('/pharmacist/expiry'),
      }
    );
  }

  // NGO active navigation
  if (user.role === 'ngo') {
    primaryNav.push({
      name: 'Organization Profile',
      path: '/ngo/onboarding',
      icon: Building2,
      active: location.pathname === '/ngo/onboarding',
    });
  }

  // Donor active navigation
  if (user.role === 'donor') {
    primaryNav.splice(
      1,
      0,
      {
        name: 'Donate Medicines',
        path: '/donor/donate',
        icon: PackagePlus,
        active: location.pathname.startsWith('/donor/donate'),
      },
      {
        name: 'My Donations',
        path: '/donor/donations',
        icon: Heart,
        active: location.pathname.startsWith('/donor/donations'),
      },
      {
        name: 'Expiry Tracker',
        path: '/donor/expiry',
        icon: Clock,
        active: location.pathname.startsWith('/donor/expiry'),
      }
    );
  }

  // Role-specific roadmap features (planned for subsequent phases)
  const roleUpcoming = {
    donor: [
      { name: 'QR Handover Tracking', icon: QrCode, phase: 'Phase 7' },
    ],
    pharmacist: [
      { name: 'NGO Allocation & Matching', icon: Building2, phase: 'Phase 6' },
      { name: 'QR Handover Tracking', icon: QrCode, phase: 'Phase 7' },
    ],
    ngo: [
      { name: 'Browse Available Meds', icon: Building2, phase: 'Phase 6' },
      { name: 'Urgent Requests', icon: GitPullRequest, phase: 'Phase 6' },
      { name: 'QR Handover Log', icon: QrCode, phase: 'Phase 7' },
    ],
    admin: [
      { name: 'Platform Oversight', icon: Activity, phase: 'Phase 8' },
      { name: 'Audit & Compliance', icon: FileText, phase: 'Phase 8' },
    ],
  };

  const upcomingItems = roleUpcoming[user.role] || [];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white/95 backdrop-blur-xl border-r border-teal-900/10 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex-1 overflow-y-auto">
          {/* Logo Area */}
          <div className="pb-6 border-b border-slate-100 mb-6">
            <Logo size="md" />
          </div>

          {/* Active Navigation */}
          <div className="space-y-1 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-3 mb-2">
              Navigation
            </p>
            {primaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    item.active
                      ? 'gradient-primary text-white shadow-soft'
                      : 'text-text-body hover:bg-teal-50 hover:text-teal-800'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Upcoming Features (Planned for Later Phases) */}
          {upcomingItems.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {user.role.toUpperCase()} Workspace
                </span>
                <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                  Roadmap
                </span>
              </div>

              {upcomingItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-slate-400 select-none cursor-not-allowed group hover:bg-slate-50"
                    title={`${item.name} will be unlocked in ${item.phase}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className="text-slate-300 group-hover:text-slate-400" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-400 border border-slate-200 rounded px-1.5 py-0.2">
                      {item.phase}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Area: User Card & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-soft flex-shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-heading truncate">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  color={
                    user.role === 'admin'
                      ? 'danger'
                      : user.role === 'pharmacist'
                      ? 'info'
                      : user.role === 'ngo'
                      ? 'warning'
                      : 'success'
                  }
                  className="text-[10px] px-1.5 py-0"
                >
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
