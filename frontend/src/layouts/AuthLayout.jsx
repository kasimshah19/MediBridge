import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  QrCode,
  HeartHandshake,
  CheckCircle2,
  Home,
  Building2,
  Pill,
} from 'lucide-react';
import Logo from '../components/common/Logo';

export default function AuthLayout({
  children,
  heading,
  subheading,
}) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-gradient-to-br from-[#F0FDFA] to-[#F0F9FF]">
      {/* ============================================================== */}
      {/* LEFT COLUMN: BRAND VISUAL PANEL (Desktop) / TOP BANNER (Mobile) */}
      {/* ============================================================== */}
      <div className="relative w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-gradient-to-br from-[#0D9488] via-[#0284C7] to-[#14B8A6] text-white overflow-hidden shadow-2xl">
        {/* Subtle mesh background circles & grid pattern */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top Header Row with Back Link */}
        <div className="relative z-10 flex items-center justify-between mb-8 lg:mb-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold backdrop-blur-md transition-all duration-200"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
          <div className="lg:hidden">
            <span className="text-xs font-bold tracking-wider uppercase text-white/80">
              MediBridge
            </span>
          </div>
        </div>

        {/* Center Editorial Visual & Floating Diagram (Desktop Only) */}
        <div className="relative z-10 hidden lg:flex flex-col my-auto py-8">
          {/* Logo in White */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-soft">
              <Pill className="w-6 h-6 -rotate-45" />
            </div>
            <span className="text-2xl font-heading font-extrabold tracking-tight text-white">
              MediBridge
            </span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-heading font-extrabold leading-tight tracking-tight text-white mb-4">
            Bridging unused medicines to people who need them
          </h2>
          <p className="text-sm xl:text-base text-white/85 max-w-md leading-relaxed mb-8">
            A trusted healthcare exchange bringing together verified donors, licensed pharmacists, and charitable community clinics.
          </p>

          {/* Stylized SVG Bridge Diagram with Floating Glass Cards */}
          <div className="relative w-full max-w-md h-52 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 overflow-hidden mb-8 shadow-soft">
            <svg viewBox="0 0 400 180" className="w-full h-full" fill="none">
              {/* Ground & Bridge Arc */}
              <path
                d="M 50 140 Q 200 40 350 140"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 60 140 Q 200 55 340 140"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              {/* Pillars */}
              <line x1="120" y1="102" x2="120" y2="140" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
              <line x1="200" y1="90" x2="200" y2="140" stroke="rgba(255,255,255,0.8)" strokeWidth="3" />
              <line x1="280" y1="102" x2="280" y2="140" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
            </svg>

            {/* Left Node: Donor House */}
            <div className="absolute left-4 bottom-4 p-2.5 rounded-xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center gap-1.5 text-[11px] font-semibold text-white shadow-soft">
              <Home size={14} className="text-mint" />
              <span>Donor</span>
            </div>

            {/* Right Node: Verified Clinic */}
            <div className="absolute right-4 bottom-4 p-2.5 rounded-xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center gap-1.5 text-[11px] font-semibold text-white shadow-soft">
              <Building2 size={14} className="text-mint" />
              <span>NGO Clinic</span>
            </div>

            {/* Floating Glassmorphism Cards with subtle gentle motion */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute top-3 left-6 px-3 py-1.5 rounded-xl bg-white/25 backdrop-blur-md border border-white/40 text-[11px] font-medium text-white shadow-soft flex items-center gap-1.5"
            >
              <CheckCircle2 size={12} className="text-mint" />
              <span>Medicine Verified</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut', delay: 0.6 }}
              className="absolute top-8 right-6 px-3 py-1.5 rounded-xl bg-white/25 backdrop-blur-md border border-white/40 text-[11px] font-medium text-white shadow-soft flex items-center gap-1.5"
            >
              <HeartHandshake size={12} className="text-white" />
              <span>NGO Matched Nearby</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4.2, ease: 'easeInOut', delay: 1.2 }}
              className="absolute top-24 left-1/3 px-3 py-1.5 rounded-xl bg-white/25 backdrop-blur-md border border-white/40 text-[11px] font-medium text-white shadow-soft flex items-center gap-1.5"
            >
              <QrCode size={12} className="text-mint" />
              <span>Handover Recorded</span>
            </motion.div>
          </div>

          {/* 3 Real Platform Trust Points */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs font-medium text-white/95">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={12} className="text-mint" />
              </div>
              <span>Pharmacist-verified donations ensure safety and pack integrity</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-white/95">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <QrCode size={12} className="text-mint" />
              </div>
              <span>Chain-of-custody QR tracking from donor to final dispensing</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-white/95">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <HeartHandshake size={12} className="text-mint" />
              </div>
              <span>Geo-radius matching with verified non-profit community clinics</span>
            </div>
          </div>
        </div>

        {/* Footer info strip */}
        <div className="relative z-10 text-[11px] text-white/70 hidden lg:block">
          MediBridge Platform • Regulated Healthcare Redistribution Architecture
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: CENTERED GLASS FORM CARD                          */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 relative overflow-y-auto">
        {/* Soft background blurred decorative blobs */}
        <div className="pointer-events-none absolute top-10 right-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-10 w-80 h-80 bg-sky-200/30 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md my-auto relative z-10"
        >
          {/* Main Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/60 shadow-hover">
            {/* Logo Mark for Form */}
            <div className="flex justify-center mb-5">
              <Logo size="md" to="/" />
            </div>

            {/* Header Titles */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-heading font-extrabold text-text-heading tracking-tight">
                {heading}
              </h1>
              {subheading && (
                <p className="text-xs sm:text-sm text-text-body mt-1 leading-relaxed">
                  {subheading}
                </p>
              )}
            </div>

            {/* Child Form Component */}
            {children}

            {/* Terms and Privacy Footer Note */}
            <div className="mt-8 pt-5 border-t border-slate-100 text-center text-[11px] text-text-muted leading-relaxed">
              By proceeding, you agree to MediBridge's{' '}
              <span className="text-teal-700 font-semibold cursor-pointer hover:underline">
                Terms of Service
              </span>{' '}
              and{' '}
              <span className="text-teal-700 font-semibold cursor-pointer hover:underline">
                Healthcare Privacy Policy
              </span>
              .
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
