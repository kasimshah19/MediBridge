import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  PackageCheck,
  ClipboardCheck,
  GitCompare,
  QrCode,
  ArrowRight,
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Activity,
  Shield,
  Layers,
  Clock,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { getHealth } from '../../api/health.api';

export default function Home() {
  const [healthData, setHealthData] = useState(null);
  const [healthStatus, setHealthStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = useCallback(async () => {
    setHealthStatus('loading');
    setErrorMessage('');
    try {
      const data = await getHealth();
      setHealthData(data);
      setHealthStatus('success');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setHealthStatus('error');
      setErrorMessage(
        err.response?.data?.message || err.message || 'Unable to connect to the MediBridge Health API.'
      );
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const workflowSteps = [
    {
      step: '01',
      title: 'Donor Submits',
      desc: 'Donors register unused, sealed, non-expired medications with batch and pack photos.',
      icon: PackageCheck,
      color: 'text-teal-600 bg-teal-50 border-teal-200/70',
    },
    {
      step: '02',
      title: 'Pharmacist Verifies',
      desc: 'Licensed pharmacists physically inspect packaging integrity, authenticity & expiry safety.',
      icon: ClipboardCheck,
      color: 'text-sky-600 bg-sky-50 border-sky-200/70',
    },
    {
      step: '03',
      title: 'Geo-Radius Matching',
      desc: 'Verified medicines are matched with certified NGOs and charitable clinics within optimal radius.',
      icon: GitCompare,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/70',
    },
    {
      step: '04',
      title: 'QR Handover Tracking',
      desc: 'Encrypted QR codes record custody handover at every step for complete regulatory accountability.',
      icon: QrCode,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200/70',
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Decorative blurred gradient blobs behind hero */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-teal-300/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-20 -right-40 w-96 h-96 bg-sky-300/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/3 w-80 h-80 bg-mint/20 rounded-full blur-3xl" />

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/70 text-xs font-semibold text-teal-800 shadow-soft">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Phase 0 Foundation • Production-Ready Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-text-heading tracking-tight leading-[1.12]">
              Turn unused medicines into{' '}
              <span className="text-gradient">second chances</span>
            </h1>

            <p className="text-base sm:text-lg text-text-body max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              MediBridge is a technology-enabled medicine redistribution network. Connect verified donors, licensed pharmacists, and certified charitable clinics with geo-radius dispatch and full QR-based chain of custody.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button size="lg" disabled className="w-full sm:w-auto shadow-hover">
                Donate Sealed Medicine
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button variant="outline" size="lg" disabled className="w-full sm:w-auto">
                Explore Verified Clinics
              </Button>
            </div>

            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-teal-600" />
                <span>Zero Expired Policy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Pharmacist Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>Tamper-Proof QR</span>
              </div>
            </div>
          </motion.div>

          {/* Hero Right Visual: Clean CSS/SVG Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-5 flex justify-center"
          >
            <div className="relative w-full max-w-md p-6 bg-white/80 backdrop-blur-md rounded-3xl border border-teal-900/10 shadow-hover">
              {/* Decorative Pill/Bridge Diagram */}
              <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-teal-50 via-sky-50 to-white border border-teal-100/60 p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <Badge color="success">Regulated Exchange</Badge>
                  <span className="text-xs font-semibold text-text-muted">ISO/GMP Inspired</span>
                </div>

                {/* Center SVG Graphic */}
                <div className="my-auto flex flex-col items-center">
                  <svg viewBox="0 0 200 120" className="w-48 h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Bridge Arch */}
                    <path
                      d="M20 90 Q 100 20 180 90"
                      stroke="#0D9488"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M30 90 Q 100 35 170 90"
                      stroke="#0EA5E9"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    {/* Bridge Piers */}
                    <line x1="60" y1="58" x2="60" y2="92" stroke="#0D9488" strokeWidth="4" strokeLinecap="round" />
                    <line x1="100" y1="46" x2="100" y2="92" stroke="#0D9488" strokeWidth="4" strokeLinecap="round" />
                    <line x1="140" y1="58" x2="140" y2="92" stroke="#0D9488" strokeWidth="4" strokeLinecap="round" />
                    <line x1="10" y1="92" x2="190" y2="92" stroke="#0F766E" strokeWidth="4" strokeLinecap="round" />
                    {/* Floating Pill Accent */}
                    <g transform="translate(75, 10)">
                      <rect x="0" y="0" width="50" height="20" rx="10" fill="#14B8A6" />
                      <rect x="25" y="0" width="25" height="20" rx="10" fill="#38BDF8" />
                      <line x1="25" y1="0" x2="25" y2="20" stroke="white" strokeWidth="2" />
                    </g>
                  </svg>
                  <p className="text-xs font-semibold text-teal-800 mt-2">Verified Peer-to-Clinic Distribution</p>
                </div>

                {/* Mini trust markers */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-teal-100/60 text-center">
                  <div>
                    <div className="text-xs font-bold text-teal-700">100%</div>
                    <div className="text-[10px] text-text-muted">Sealed Packs</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-sky-700">Real-Time</div>
                    <div className="text-[10px] text-text-muted">Pharmacist Log</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-700">Geo Match</div>
                    <div className="text-[10px] text-text-muted">Nearby Clinics</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SYSTEM STATUS CARD (REAL LIVE API HEALTH CHECK) */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-teal-900/10 bg-white shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-text-heading flex items-center gap-2">
                    Backend Architecture & Service Health
                    {healthStatus === 'success' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </h3>
                  <p className="text-xs text-text-muted">
                    Live verification against <code className="text-teal-700 font-mono">GET /api/health</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {lastChecked && (
                  <span className="text-xs text-text-muted hidden sm:inline">
                    Checked at {lastChecked}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchHealth}
                  loading={healthStatus === 'loading'}
                  className="text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Re-check API
                </Button>
              </div>
            </div>

            {/* Health Content States */}
            <div className="pt-6">
              {healthStatus === 'loading' && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Spinner size="lg" />
                  <p className="text-xs text-text-muted mt-3 font-medium">Probing MediBridge API and Database status...</p>
                </div>
              )}

              {healthStatus === 'error' && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-rose-800">API Connection Offline or Unreachable</p>
                    <p className="text-rose-700 mt-1">{errorMessage}</p>
                    <p className="text-rose-600 mt-2 font-mono">
                      Target URL: {import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/health
                    </p>
                  </div>
                </div>
              )}

              {healthStatus === 'success' && healthData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* API Status */}
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span className="font-semibold uppercase tracking-wider">API Status</span>
                      <Server className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-lg font-bold font-heading text-text-heading capitalize">
                        {healthData.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1 font-mono truncate">{healthData.app}</p>
                  </div>

                  {/* Database State */}
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span className="font-semibold uppercase tracking-wider">MongoDB Atlas</span>
                      <Database className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {healthData.database?.state === 'connected' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span className="text-lg font-bold font-heading text-emerald-700">Connected</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                          <span className="text-lg font-bold font-heading text-amber-700 capitalize">
                            {healthData.database?.state || 'Disconnected'}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Real Mongoose readyState</p>
                  </div>

                  {/* Environment */}
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span className="font-semibold uppercase tracking-wider">Environment</span>
                      <Badge color="info">Runtime</Badge>
                    </div>
                    <div className="text-lg font-bold font-heading text-text-heading mt-2 capitalize">
                      {healthData.environment}
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Node.js LTS ES-Modules</p>
                  </div>

                  {/* Uptime */}
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span className="font-semibold uppercase tracking-wider">Process Uptime</span>
                      <Clock className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-lg font-bold font-heading text-text-heading mt-2 font-mono">
                      {healthData.uptime !== undefined ? `${healthData.uptime}s` : 'N/A'}
                    </div>
                    <p className="text-[11px] text-text-muted mt-1 font-mono truncate">
                      {healthData.timestamp ? new Date(healthData.timestamp).toISOString() : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge color="info">Redistribution Architecture</Badge>
          <h2 className="text-3xl font-heading font-extrabold text-text-heading tracking-tight">
            How MediBridge Works
          </h2>
          <p className="text-sm sm:text-base text-text-body leading-relaxed">
            Four regulated operational milestones guaranteeing that no counterfeit, expired, or unsafe medicines ever enter the redistribution stream.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {workflowSteps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
              >
                <Card hover className="h-full flex flex-col justify-between bg-white/90">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl border ${item.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-heading font-extrabold text-slate-300 font-mono">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-lg font-heading font-bold text-text-heading mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-text-body leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-primary-700">
                    <span>Phase {idx === 0 ? '3' : idx === 1 ? '5' : idx === 2 ? '6' : '7'} Feature</span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

