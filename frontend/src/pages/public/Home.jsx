import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Building2,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  HeartHandshake,
  QrCode,
  FileCheck2,
  AlertCircle,
  RefreshCw,
  Home as HomeIcon,
  Stethoscope,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Accordion from '../../components/ui/Accordion';
import { getPublicStats, getPublicOrganizations } from '../../api/public.api';
import useCountUp from '../../hooks/useCountUp';

function AnimatedStat({ value, label, icon: Icon, color }) {
  const animatedValue = useCountUp(value, 1500);
  return (
    <StatCard
      title={label}
      value={animatedValue}
      icon={Icon}
      color={color}
      className="bg-white/80 backdrop-blur-sm border-teal-900/10 shadow-soft"
    />
  );
}

export default function Home() {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const [partners, setPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(true);

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await getPublicStats();
      if (res?.success) {
        setStats(res.data);
      }
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPartners = async () => {
    setPartnersLoading(true);
    try {
      const res = await getPublicOrganizations(6);
      if (res?.success) {
        setPartners(res.data.organizations || []);
      }
    } catch {
      setPartners([]);
    } finally {
      setPartnersLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchPartners();
  }, []);

  const allStatsZero =
    stats &&
    stats.verifiedOrganizations === 0 &&
    stats.registeredDonors === 0 &&
    stats.verifiedPharmacists === 0 &&
    stats.citiesCovered === 0;

  const faqItems = [
    {
      question: 'What medicines are eligible for donation?',
      answer:
        'We only accept unused, sealed, and undamaged medicines with clear expiry dates printed on the original blister strip or bottle. Medicines must have at least 60 days of remaining shelf life. Opened strips, loose tablets, injections, narcotics, and refrigerated cold-chain medicines are strictly prohibited.',
    },
    {
      question: 'How are donated medicines verified for safety?',
      answer:
        'Every medicine batch is inspected by registered, licensed pharmacists before redistribution. Pharmacists verify batch integrity, packaging seals, expiration dates, and physical conditions against regulated standards.',
    },
    {
      question: 'How are NGOs and Charitable Clinics verified?',
      answer:
        'Non-profit organizations and clinics must complete our multi-step verification process, submitting their official registration certificates, 12A/80G tax exemption records, ID proofs, and healthcare licenses. Every profile is independently audited and approved by the MediBridge administrative compliance team.',
    },
    {
      question: 'Is MediBridge free to use for donors and NGOs?',
      answer:
        'Yes, MediBridge is 100% free. We are a social impact platform dedicated to eliminating medicine wastage and expanding healthcare accessibility. No fees are charged to donors or receiving charitable clinics.',
    },
    {
      question: 'How is user and location data protected?',
      answer:
        'All data is encrypted in transit and at rest. Precise home addresses of donors are never publicly displayed; only general neighborhood coordinates are utilized for radius-based matching with verified clinics.',
    },
    {
      question: 'Is this process legally and regulatory compliant?',
      answer:
        'MediBridge adheres to strict drug safety guidelines. By routing all donations through licensed pharmacists and accredited charitable dispensaries with digital chain-of-custody tracking, every medicine exchange is fully documented and audit-ready.',
    },
  ];

  return (
    <div className="space-y-24 py-6 sm:py-10">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO SECTION
         ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Headline & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold tracking-wide">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Verified by licensed pharmacists</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-heading leading-tight">
              Turn unused medicines into{' '}
              <span className="bg-gradient-to-r from-teal-600 via-teal-700 to-sky-600 bg-clip-text text-transparent">
                second chances
              </span>
            </h1>

            <p className="text-base sm:text-lg text-text-body max-w-2xl leading-relaxed mx-auto lg:mx-0">
              Millions of sealed, unexpired medicines go to waste each year while underserved patients struggle for basic treatment. MediBridge bridges this gap through verified pharmacist inspection, geo-matched clinics, and QR-coded chain of custody.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <Link to="/register">
                <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-hover">
                  Donate medicines
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Register your NGO
                </Button>
              </Link>
            </div>

            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>100% Free Platform</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Geo-Radius Matching</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Tamper-evident Audits</span>
              </div>
            </div>
          </div>

          {/* Right Layered SVG/CSS Illustration */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-3xl bg-gradient-to-tr from-teal-100/60 via-sky-50/70 to-teal-50 p-6 flex items-center justify-center border border-teal-900/10 shadow-xl overflow-hidden">
              {/* Background ambient gradient blobs */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-300/30 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-sky-300/30 rounded-full blur-2xl" />

              {/* Central Bridge Diagram (SVG) */}
              <svg
                viewBox="0 0 360 260"
                className="w-full h-auto drop-shadow-md z-10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Connecting Arc (Bridge) */}
                <path
                  d="M 60 160 Q 180 40 300 160"
                  stroke="url(#bridgeGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                />
                <path
                  d="M 60 160 Q 180 80 300 160"
                  stroke="#0EA5E9"
                  strokeWidth="2"
                  opacity="0.5"
                />

                {/* Left Node: Donor House */}
                <circle cx="60" cy="160" r="34" fill="#FFFFFF" stroke="#0D9488" strokeWidth="3" />
                <circle cx="60" cy="160" r="28" fill="#F0FDFA" />

                {/* Right Node: Verified Clinic */}
                <circle cx="300" cy="160" r="34" fill="#FFFFFF" stroke="#0EA5E9" strokeWidth="3" />
                <circle cx="300" cy="160" r="28" fill="#F0F9FF" />

                {/* Center Pharmacist Node */}
                <circle cx="180" cy="95" r="24" fill="#0D9488" filter="drop-shadow(0 4px 10px rgba(13,148,136,0.3))" />

                <defs>
                  <linearGradient id="bridgeGradient" x1="60" y1="160" x2="300" y2="160" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0D9488" />
                    <stop offset="0.5" stopColor="#0EA5E9" />
                    <stop offset="1" stopColor="#0D9488" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Icons Overlay */}
              <div className="absolute left-[54px] top-[148px] z-20 text-teal-700 pointer-events-none">
                <HomeIcon size={24} />
              </div>
              <div className="absolute right-[54px] top-[148px] z-20 text-sky-700 pointer-events-none">
                <Building2 size={24} />
              </div>
              <div className="absolute top-[83px] z-20 text-white pointer-events-none">
                <Stethoscope size={20} />
              </div>

              {/* Floating Glass Card 1: Verified */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-soft border border-teal-900/10 flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-heading">Pharmacist Verified</p>
                  <p className="text-[9px] text-text-muted">Batch & Expiry Checked</p>
                </div>
              </motion.div>

              {/* Floating Glass Card 2: Matched Nearby */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-soft border border-teal-900/10 flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center">
                  <MapPin size={14} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-heading">Matched Nearby</p>
                  <p className="text-[9px] text-text-muted">Radius-based allocation</p>
                </div>
              </motion.div>

              {/* Floating Glass Card 3: Handover Recorded */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute top-10 right-4 z-20 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-soft border border-teal-900/10 flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <QrCode size={14} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-text-heading">Chain of Custody</p>
                  <p className="text-[9px] text-text-muted">QR Handover Tracking</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE IMPACT STRIP
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge color="success">Real-Time Telemetry</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-heading">Live Platform Impact</h2>
          <p className="text-xs sm:text-sm text-text-muted">
            Directly synced from real database registrations and verified operations.
          </p>
        </div>

        {statsLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        )}

        {statsError && !statsLoading && (
          <div className="p-6 rounded-2xl bg-white border border-rose-200 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-text-heading">Unable to load live impact metrics</p>
            <Button variant="outline" size="sm" onClick={fetchStats}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </div>
        )}

        {!statsLoading && !statsError && stats && (
          <>
            {allStatsZero ? (
              <Card className="p-8 text-center bg-gradient-to-r from-teal-50/80 via-white to-sky-50/80 border-teal-200/80">
                <Sparkles className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-teal-900">We are just getting started!</h3>
                <p className="text-sm text-text-muted max-w-md mx-auto mt-1 mb-4">
                  Be among the first community donors, registered pharmacists, or non-profit clinics to join the network.
                </p>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Become a Founding Member
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <AnimatedStat
                  label="Verified Organizations"
                  value={stats.verifiedOrganizations}
                  icon={Building2}
                  color="teal"
                />
                <AnimatedStat
                  label="Registered Donors"
                  value={stats.registeredDonors}
                  icon={Users}
                  color="sky"
                />
                <AnimatedStat
                  label="Licensed Pharmacists"
                  value={stats.verifiedPharmacists}
                  icon={ShieldCheck}
                  color="emerald"
                />
                <AnimatedStat
                  label="Cities Covered"
                  value={stats.citiesCovered}
                  icon={MapPin}
                  color="amber"
                />
              </div>
            )}
          </>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. HOW IT WORKS TIMELINE
         ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge color="info">Simple 4-Step Journey</Badge>
          <h2 className="text-3xl font-extrabold text-text-heading">How MediBridge Works</h2>
          <p className="text-sm text-text-muted">
            End-to-end transparent process ensuring every strip of medicine is handled safely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Step 1 */}
          <div className="relative bg-white rounded-2xl p-6 border border-teal-900/10 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-text-heading">Donate Medicine</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Donors submit details and photos of sealed, unexpired medicines with batch and expiry details.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative bg-white rounded-2xl p-6 border border-teal-900/10 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-text-heading">Pharmacist Verification</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Licensed pharmacists review batch safety, expiry dates, and seal authenticity before approval.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative bg-white rounded-2xl p-6 border border-teal-900/10 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-text-heading">Geo-Matching</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Approved medicines are matched with verified local NGOs or clinics based on proximity and patient need.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative bg-white rounded-2xl p-6 border border-teal-900/10 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
              04
            </div>
            <h3 className="text-base font-bold text-text-heading">QR Code Handover</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Medicine handover is tracked with mutual QR verification, completing an immutable custody audit.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. WHO IS IT FOR (BENTO GRID)
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge color="info">Ecosystem Roles</Badge>
          <h2 className="text-3xl font-extrabold text-text-heading">Who Is MediBridge For?</h2>
          <p className="text-sm text-text-muted">
            A collaborative platform bringing together citizens, medical professionals, and charitable organizations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Donors */}
          <Card className="p-8 flex flex-col justify-between hover:border-teal-300 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center">
                <HeartHandshake size={24} />
              </div>
              <h3 className="text-xl font-bold text-text-heading">For Donors</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Have unexpired, sealed medicines after recovery? Don’t let them end up in landfills.
              </p>
              <ul className="space-y-2 text-xs text-text-body pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal-600 flex-shrink-0" />
                  <span>Simple upload with medicine details</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal-600 flex-shrink-0" />
                  <span>Live tracking until patient handover</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal-600 flex-shrink-0" />
                  <span>Direct community healthcare impact</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link to="/register">
                <Button variant="outline" size="sm" className="w-full">
                  Join as Donor
                </Button>
              </Link>
            </div>
          </Card>

          {/* Card 2: Pharmacists */}
          <Card className="p-8 flex flex-col justify-between hover:border-teal-300 transition-colors bg-gradient-to-b from-white to-teal-50/30">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-text-heading">For Pharmacists</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Volunteer your pharmaceutical expertise to ensure maximum safety and compliance for donated stocks.
              </p>
              <ul className="space-y-2 text-xs text-text-body pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                  <span>Digital inspection workbench</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                  <span>Batch & packaging validity verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                  <span>Accredited public health contribution</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link to="/register">
                <Button variant="primary" size="sm" className="w-full">
                  Volunteer as Pharmacist
                </Button>
              </Link>
            </div>
          </Card>

          {/* Card 3: NGOs & Clinics */}
          <Card className="p-8 flex flex-col justify-between hover:border-teal-300 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-text-heading">For NGOs & Clinics</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Registered non-profits and charitable dispensaries receive free, verified medicines for patients.
              </p>
              <ul className="space-y-2 text-xs text-text-body pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-sky-600 flex-shrink-0" />
                  <span>Streamlined online verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-sky-600 flex-shrink-0" />
                  <span>Request specific medicine categories</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-sky-600 flex-shrink-0" />
                  <span>Digital inventory management</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link to="/for-ngos">
                <Button variant="outline" size="sm" className="w-full">
                  NGO Onboarding Guide
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. SAFETY & COMPLIANCE (TWO COLUMNS)
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-8 bg-slate-50/60 p-8 sm:p-12 rounded-3xl border border-teal-900/10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge color="warning">Zero Compromise Standards</Badge>
          <h2 className="text-3xl font-extrabold text-text-heading">Safety & Regulatory Compliance</h2>
          <p className="text-sm text-text-muted">
            We adhere to strict medical standards. Nothing is approved without pharmacist verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* What We Accept */}
          <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-soft space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-base border-b border-emerald-100 pb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>What We Accept</span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-text-body">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Intact Sealed Packaging:</strong> Completely sealed blister strips, foil packs, and sealed bottles.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Unexpired Products:</strong> Minimum 60 days of remaining shelf life from the date of submission.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Legible Manufacturer Info:</strong> Clear batch number, manufacturing date, and expiry date.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Standard Formulations:</strong> Sealed tablets, capsules, sealed syrups, and unopened topical ointments.</span>
              </li>
            </ul>
          </div>

          {/* What We Never Accept */}
          <div className="bg-white rounded-2xl p-6 border border-rose-200 shadow-soft space-y-4">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-base border-b border-rose-100 pb-3">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>What We Never Accept</span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-text-body">
              <li className="flex items-start gap-2.5">
                <XCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <span><strong>Opened or Cut Strips:</strong> Cut foil strips or broken protective seals of any kind.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <span><strong>Loose Tablets / Capsules:</strong> Medicines stored in unlabelled containers or zip-lock bags.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <span><strong>Injections & Cold-Chain:</strong> Vaccines, insulin, vials, and temperature-sensitive biologicals.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <span><strong>Narcotics & Controlled Substances:</strong> Schedule X or H1 psychotropic drugs are blocked.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs font-semibold text-teal-800 bg-teal-50 inline-block px-4 py-2 rounded-full border border-teal-200/60">
            ⚖️ Strict rule: Nothing is approved without pharmacist verification.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. VERIFIED PARTNERS SHOWCASE
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge color="info">Our Network</Badge>
          <h2 className="text-3xl font-extrabold text-text-heading">Verified Partner Organizations</h2>
          <p className="text-sm text-text-muted">
            Accredited clinics and charities verified by our compliance team.
          </p>
        </div>

        {partnersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        ) : partners.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Our first partner organizations will appear here"
            description="Organizations are currently undergoing verification. Verified non-profits and clinics will be listed automatically."
            actionLabel="Register your organization"
            onAction={() => (window.location.href = '/register')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner) => (
              <Card key={partner._id || partner.name} className="p-6 hover:shadow-hover transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-text-heading">{partner.name}</h3>
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                      <MapPin size={12} className="text-teal-600" />
                      <span>{partner.city}, {partner.state}</span>
                    </p>
                  </div>
                  <Badge color="success" className="capitalize text-[10px]">
                    {partner.type?.replace('_', ' ')}
                  </Badge>
                </div>
                {partner.servicesOffered && partner.servicesOffered.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                    {partner.servicesOffered.slice(0, 3).map((srv) => (
                      <span
                        key={srv}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-700 capitalize"
                      >
                        {srv.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. FAQ ACCORDION
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-8 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <Badge color="info">Got Questions?</Badge>
          <h2 className="text-3xl font-extrabold text-text-heading">Frequently Asked Questions</h2>
          <p className="text-sm text-text-muted">
            Everything you need to know about safety, verification, and donation protocols.
          </p>
        </div>

        <Accordion items={faqItems} />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. FINAL CALL TO ACTION BANNER
         ───────────────────────────────────────────────────────────── */}
      <section className="rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-teal-600 via-teal-700 to-sky-600 text-white shadow-xl text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to make healthcare accessible?
          </h2>
          <p className="text-teal-50 text-sm sm:text-base leading-relaxed">
            Join MediBridge today. Whether you have unused medicines to share or are a clinic serving patients in need, your participation saves lives.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Link to="/register">
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto bg-white text-teal-800 hover:bg-teal-50 border-none shadow-md font-bold"
            >
              Get Started Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link to="/for-ngos">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-white border-white/60 hover:bg-white/10"
            >
              Learn about NGO Onboarding
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
