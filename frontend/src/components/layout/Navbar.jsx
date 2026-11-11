import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import Logo from '../common/Logo';
import Button from '../ui/Button';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'How it works', href: '#how-it-works' },
    { name: 'For NGOs', href: '#for-ngos' },
    { name: 'About', href: '#about' },
  ];

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

          {/* Action Buttons (Disabled in Phase 0) */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" disabled title="Auth opens in Phase 1">
              Login
            </Button>
            <Button variant="primary" size="sm" disabled title="Registration opens in Phase 1">
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
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
              <Button variant="outline" size="sm" disabled className="w-full">
                Login
              </Button>
              <Button variant="primary" size="sm" disabled className="w-full">
                Get Started
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

