import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, HeartHandshake, Building2, CheckCircle2, MapPin, QrCode } from 'lucide-react';
import Button from '../ui/Button';

export default function HeroSection() {
  return (
    <section className="relative pt-8 pb-16 md:pt-14 md:pb-24 overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-teal-200/30 via-sky-200/30 to-mint-200/20 blur-3xl pointer-events-none -z-10 rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & Action Buttons */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold shadow-xs">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Verified by licensed pharmacists & regulated clinics</span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-text-heading tracking-tight leading-[1.12]">
              Turn unused medicines into{' '}
              <span className="bg-gradient-to-r from-teal-600 via-teal-700 to-sky-600 bg-clip-text text-transparent">
                second chances
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-text-body max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Every month, thousands of sealed, usable medicines expire unused while underserved patients struggle for care. MediBridge connects verified donors, certified pharmacists, and charitable clinics with complete chain-of-custody verification.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link to="/register" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-md hover:shadow-lg">
                  <HeartHandshake className="w-5 h-5 mr-1" />
                  Donate Medicines
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto border-teal-200 bg-white hover:bg-teal-50/70 text-teal-900">
                  <Building2 className="w-5 h-5 mr-1 text-teal-700" />
                  Register Your NGO / Clinic
                </Button>
              </Link>
            </div>

            {/* Micro Trust Proof */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>100% Free Platform</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Zero Expired Policy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>QR Custody Tracking</span>
              </div>
            </div>
          </div>

          {/* Right Column: Layered SVG/CSS Illustration with Floating Glass Cards */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md h-[400px] flex items-center justify-center">
              {/* Outer decorative ring */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/80 to-teal-50/60 backdrop-blur-xl border border-teal-100 shadow-xl" />

              {/* Central Bridge SVG Graphic */}
              <svg
                viewBox="0 0 360 260"
                className="w-full h-full p-6 text-teal-600 drop-shadow-sm select-none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Bridge Arc */}
                <path
                  d="M50 180 C 110 90, 250 90, 310 180"
                  stroke="url(#bridgeGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="6 6"
                />
                {/* Bridge Pillars */}
                <line x1="120" y1="125" x2="120" y2="185" stroke="#0D9488" strokeWidth="2.5" strokeOpacity="0.4" />
                <line x1="180" y1="112" x2="180" y2="185" stroke="#0D9488" strokeWidth="3" strokeOpacity="0.6" />
                <line x1="240" y1="125" x2="240" y2="185" stroke="#0D9488" strokeWidth="2.5" strokeOpacity="0.4" />
                <line x1="40" y1="185" x2="320" y2="185" stroke="#99F6E4" strokeWidth="3" strokeLinecap="round" />

                {/* Left: Home / Donor Node */}
                <g transform="translate(30, 150)">
                  <circle cx="20" cy="20" r="22" fill="#E6FFFA" stroke="#0D9488" strokeWidth="2" />
                  <path d="M12 24 L20 16 L28 24 V27 H12 Z" fill="#0D9488" />
                  <rect x="17" y="22" width="6" height="5" fill="#FFFFFF" />
                </g>

                {/* Right: Hospital / Clinic Node */}
                <g transform="translate(290, 150)">
                  <circle cx="20" cy="20" r="22" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="2" />
                  <rect x="13" y="14" width="14" height="14" rx="2" fill="#0EA5E9" />
                  <path d="M18 21 H22 M20 19 V23" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                </g>

                {/* Center Pharmacist Verification Node */}
                <g transform="translate(160, 85)">
                  <circle cx="20" cy="20" r="20" fill="#FFFFFF" stroke="#0D9488" strokeWidth="2.5" />
                  <path d="M14 20 L18 24 L26 15" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </g>

                <defs>
                  <linearGradient id="bridgeGradient" x1="50" y1="180" x2="310" y2="180" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0D9488" />
                    <stop offset="0.5" stopColor="#0EA5E9" />
                    <stop offset="1" stopColor="#14B8A6" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Floating Glass Card 1: Verified */}
              <div className="absolute -top-3 left-4 sm:-left-3 bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-md border border-teal-100 flex items-center gap-2.5 animate-bounce-gentle">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-700 flex items-center justify-center font-bold">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-heading">100% Sealed & Verified</p>
                  <p className="text-[10px] text-teal-700 font-medium">Pharmacist checked</p>
                </div>
              </div>

              {/* Floating Glass Card 2: Matched nearby */}
              <div className="absolute top-1/2 -right-3 sm:-right-4 -translate-y-1/2 bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-md border border-sky-100 flex items-center gap-2.5 animate-bounce-delayed">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-700 flex items-center justify-center font-bold">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-heading">Matched Nearby</p>
                  <p className="text-[10px] text-sky-700 font-medium">Geo-radius routing</p>
                </div>
              </div>

              {/* Floating Glass Card 3: Handover Recorded */}
              <div className="absolute -bottom-3 left-6 sm:left-4 bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-md border border-teal-100 flex items-center gap-2.5 animate-bounce-gentle">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold">
                  <QrCode size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-heading">Handover Recorded</p>
                  <p className="text-[10px] text-emerald-700 font-medium">QR Chain-of-Custody</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
