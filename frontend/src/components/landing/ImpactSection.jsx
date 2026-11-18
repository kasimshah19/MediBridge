import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Award,
  MapPinned,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  PackageCheck,
} from 'lucide-react';
import { getPublicStats } from '../../api/public.api';
import Card from '../ui/Card';
import Button from '../ui/Button';

function CountUpNumber({ end = 0, duration = 1800 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }
    let startTime = null;
    let frameId;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export default function ImpactSection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPublicStats();
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        setStats({
          verifiedOrganizations: 0,
          registeredDonors: 0,
          verifiedPharmacists: 0,
          citiesCovered: 0,
        });
      }
    } catch (err) {
      setError('Unable to load live statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const allZero =
    stats &&
    Number(stats.verifiedOrganizations || 0) === 0 &&
    Number(stats.registeredDonors || 0) === 0 &&
    Number(stats.verifiedPharmacists || 0) === 0 &&
    Number(stats.citiesCovered || 0) === 0 &&
    Number(stats.completedHandovers || 0) === 0 &&
    Number(stats.medicinesTransferred || 0) === 0;

  return (
    <section className="py-12 border-y border-teal-900/10 bg-white/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
            Real Community Impact
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-heading">
            Live Platform Telemetry
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1.5">
            Transparent, real-time statistics verified across our distributed network.
          </p>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-teal-50/70 border border-teal-100/70 animate-pulse p-5"
              />
            ))}
          </div>
        )}

        {/* Error State with Retry */}
        {!loading && error && (
          <div className="text-center py-6 bg-rose-50/70 rounded-2xl border border-rose-100 p-6 max-w-md mx-auto">
            <p className="text-xs text-rose-700 font-medium mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchStats}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry Connection
            </Button>
          </div>
        )}

        {/* If All Counts Are Zero: Friendly Launch Message */}
        {!loading && !error && allZero && (
          <Card className="max-w-2xl mx-auto text-center p-8 bg-gradient-to-r from-teal-50 to-sky-50 border-teal-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/15 text-teal-800 mx-auto flex items-center justify-center mb-4">
              <Sparkles size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-heading mb-1.5">
              We are just getting started!
            </h3>
            <p className="text-sm text-text-body max-w-md mx-auto leading-relaxed mb-4">
              Be among the pioneer donors, certified pharmacists, and charitable healthcare clinics shaping medicine equity in India.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a href="/register">
                <Button variant="primary" size="sm">
                  Join as First Contributor
                </Button>
              </a>
            </div>
          </Card>
        )}

        {/* Active Stats Grid */}
        {!loading && !error && !allZero && stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Stat 1: Verified Organizations */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-teal-100 shadow-soft hover:shadow-hover transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-2.5">
                <Building2 size={18} />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-teal-900 tracking-tight">
                <CountUpNumber end={stats.verifiedOrganizations || 0} />
              </p>
              <p className="text-[10px] sm:text-xs font-semibold text-text-muted mt-1 uppercase tracking-wider">
                Clinics & NGOs
              </p>
            </div>

            {/* Stat 2: Registered Donors */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-teal-100 shadow-soft hover:shadow-hover transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-2.5">
                <Users size={18} />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-sky-900 tracking-tight">
                <CountUpNumber end={stats.registeredDonors || 0} />
              </p>
              <p className="text-[10px] sm:text-xs font-semibold text-text-muted mt-1 uppercase tracking-wider">
                Active Donors
              </p>
            </div>

            {/* Stat 3: Verified Pharmacists */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-teal-100 shadow-soft hover:shadow-hover transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2.5">
                <Award size={18} />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-900 tracking-tight">
                <CountUpNumber end={stats.verifiedPharmacists || 0} />
              </p>
              <p className="text-[10px] sm:text-xs font-semibold text-text-muted mt-1 uppercase tracking-wider">
                Pharmacists
              </p>
            </div>

            {/* Stat 4: Cities Covered */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-teal-100 shadow-soft hover:shadow-hover transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2.5">
                <MapPinned size={18} />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-indigo-900 tracking-tight">
                <CountUpNumber end={stats.citiesCovered || 0} />
              </p>
              <p className="text-[10px] sm:text-xs font-semibold text-text-muted mt-1 uppercase tracking-wider">
                Cities Covered
              </p>
            </div>

            {/* Stat 5: Completed Handovers */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-teal-100 shadow-soft hover:shadow-hover transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2.5">
                <CheckCircle2 size={18} />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-purple-900 tracking-tight">
                <CountUpNumber end={stats.completedHandovers || 0} />
              </p>
              <p className="text-[10px] sm:text-xs font-semibold text-text-muted mt-1 uppercase tracking-wider">
                Handovers
              </p>
            </div>

            {/* Stat 6: Medicines Transferred */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-teal-100 shadow-soft hover:shadow-hover transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-2.5">
                <PackageCheck size={18} />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-rose-900 tracking-tight">
                <CountUpNumber end={stats.medicinesTransferred || 0} />
              </p>
              <p className="text-[10px] sm:text-xs font-semibold text-text-muted mt-1 uppercase tracking-wider">
                Units Transferred
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
