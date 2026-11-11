import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Menu, User, LogOut, ShieldCheck, ChevronDown } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/ui/Badge';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#F0FDFA] to-[#F0F9FF]">
      {/* Sidebar Component */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-teal-900/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-text-body hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                MediBridge Workspace
              </span>
              <span className="text-slate-300">•</span>
              <Badge color="info" className="capitalize text-[10px]">
                {user?.role || 'User'}
              </Badge>
            </div>
          </div>

          {/* User Profile Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pl-3 rounded-full hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-text-heading leading-tight">{user?.name}</p>
                <p className="text-[10px] text-text-muted capitalize">{user?.role}</p>
              </div>
              <div className="w-8 h-8 rounded-full gradient-primary text-white text-xs font-bold flex items-center justify-center shadow-soft">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <ChevronDown size={14} className="text-text-muted" />
            </button>

            {/* Dropdown Menu Modal */}
            {userDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setUserDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-hover border border-teal-900/10 p-2 z-40 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-text-heading truncate">{user?.name}</p>
                    <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-body hover:bg-teal-50 hover:text-teal-800 transition-colors"
                  >
                    <User size={15} />
                    <span>My Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Dashboard Page View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
