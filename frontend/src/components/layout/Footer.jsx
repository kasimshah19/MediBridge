import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import { Heart, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-teal-900/10 bg-white/70 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <Logo size="md" />
            <p className="text-sm text-text-body max-w-md leading-relaxed">
              MediBridge is a technology-enabled medicine redistribution network connecting verified donors, licensed pharmacists, and non-profit healthcare institutions.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200/60 px-3.5 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Full Chain-of-Custody Pharmacist Verification</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-text-heading mb-3">Platform</h5>
            <ul className="space-y-2 text-sm text-text-body">
              <li><Link to="/#how-it-works" className="hover:text-teal-600 transition-colors">How It Works</Link></li>
              <li><Link to="/verify" className="hover:text-teal-600 transition-colors">Verify Medicine (QR)</Link></li>
              <li><Link to="/for-ngos" className="hover:text-teal-600 transition-colors">For NGOs & Clinics</Link></li>
              <li><Link to="/about" className="hover:text-teal-600 transition-colors">About Our Mission</Link></li>
              <li><Link to="/register" className="hover:text-teal-600 transition-colors">Join as Donor / Partner</Link></li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-text-heading mb-3">Compliance & Legal</h5>
            <ul className="space-y-2 text-sm text-text-body">
              <li><Link to="/terms" className="hover:text-teal-600 transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</Link></li>
              <li><span className="text-text-muted">Sealed Packaging Only</span></li>
              <li><span className="text-text-muted">Zero Expired Policy</span></li>
            </ul>
          </div>
        </div>

        {/* Regulatory Disclaimer */}
        <div className="pt-8 border-t border-slate-200/80">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-slate-700 leading-relaxed mb-6">
            <strong>Mandatory Regulatory Disclaimer:</strong> MediBridge is an academic & technology demonstration platform. Medicines are redistributed only through licensed, verified institutions as per applicable statutory regulations. The platform strictly prohibits open strips, loose tablets, injections, narcotics, and cold-chain items.
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-4">
            <p>© {new Date().getFullYear()} MediBridge Platform. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Developed with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for equitable healthcare access
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
