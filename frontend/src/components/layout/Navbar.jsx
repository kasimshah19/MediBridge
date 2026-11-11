import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, User, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import Logo from '../common/Logo';
import Button from '../ui/Button';
import { useAuth, getDashboardPathForUser } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'How it works', href: '/#how-it-works' },
    { name: 'For NGOs', href: '/#for-ngos' },
    { name: 'About', href: '/#about' },
  ];

  const dashboardPath = getDashboardPathForUser(user);

  return (
    <header className="sticky top-0 z-40 w-full glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo size="md" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-semibold text-text-body hover:text-primary-600 transition-colors"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Desktop User Section (Logged Out vs Logged In) */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pl-3 rounded-full hover:bg-white/80 transition-all border border-teal-900/10 shadow-soft"
                >
                  <div className="text-right">
                    <p className="text-xs font-bold text-text-heading leading-tight">{user.name}</p>
                    <p className="text-[10px] text-teal-700 font-semibold capitalize">{user.role}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full gradient-primary text-white text-xs font-bold flex items-center justify-center shadow-soft">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown size={14} className="text-text-muted" />
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-hover border border-teal-900/10 p-2 z-40 space-y-1">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-text-heading truncate">{user.name}</p>
                        <p className="text-[10px] text-text-muted truncate">{user.email}</p>
                      </div>
                      <Link
                        to={dashboardPath}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-body hover:bg-teal-50 hover:text-teal-800 transition-colors"
                      >
                        <LayoutDashboard size={15} />
                        <span>My Dashboard</span>
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-body hover:bg-teal-50 hover:text-teal-800 transition-colors"
                      >
                        <User size={15} />
                        <span>Profile & Security</span>
                      </Link>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
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
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-text-body hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200/60 bg-white/95 rounded-b-2xl shadow-soft px-4 space-y-3">
            {navLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-text-body hover:text-primary-600"
              >
                {item.name}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {!user ? (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to={dashboardPath} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Profile
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-rose-600 hover:bg-rose-50"
                  >
                    Sign Out
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
