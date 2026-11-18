import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  FilePlus,
  Search,
  HeartHandshake,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
  Activity,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getNgoSummary } from '../../api/ngo.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import ClaimStatusBadge from '../../components/matching/ClaimStatusBadge';
import EmptyState from '../../components/ui/EmptyState';

export default function NgoDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await getNgoSummary();
      setSummary(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load NGO summary metrics.');
    } finally {
      setLoading(false);
    }
  };

  const orgName = user?.organizationId?.name || user?.ngoContact?.organizationName || 'Healthcare Organization';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-soft">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-3">
          <Building2 size={14} className="text-white" />
          <span>Verified Healthcare Organization Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
          {orgName}
        </h1>
        <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl leading-relaxed">
          Logged in as <strong>{user?.name}</strong> ({user?.ngoContact?.designation || 'Representative'}).
          Discover verified medicines within your delivery radius and publish clinic requirements.
        </p>

        {/* Action Buttons in Banner */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link to="/ngo/find">
            <Button
              variant="primary"
              size="md"
              className="bg-white text-teal-800 hover:bg-slate-100 font-bold shadow-md hover:shadow-lg text-xs"
            >
              <Search size={15} className="mr-1.5" />
              <span>Find Medicines Nearby</span>
            </Button>
          </Link>
          <Link to="/ngo/requirements">
            <Button
              variant="outline"
              size="md"
              className="border-white/40 text-white hover:bg-white/10 text-xs"
            >
              <FilePlus size={15} className="mr-1.5" />
              <span>Post New Requirement</span>
            </Button>
          </Link>
          <Link to="/ngo/matches">
            <Button
              variant="outline"
              size="md"
              className="border-white/40 text-white hover:bg-white/10 text-xs"
            >
              <HeartHandshake size={15} className="mr-1.5" />
              <span>View Matches ({summary?.pendingClaims || 0})</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Real StatCards Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Open Demands
              </span>
              <FilePlus className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
              {summary?.openRequirements || 0}
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Active clinic requests
            </span>
          </Card>

          <Card className="p-4 bg-white border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Fulfilled Demands
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
              {summary?.fulfilledRequirements || 0}
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Fully completed requests
            </span>
          </Card>

          <Card className="p-4 bg-white border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pending Claims
              </span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
              {summary?.pendingClaims || 0}
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Awaiting donor response
            </span>
          </Card>

          <Card className="p-4 bg-white border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Confirmed Matches
              </span>
              <HeartHandshake className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
              {summary?.acceptedMatches || 0}
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Ready for collection / handover
            </span>
          </Card>
        </div>
      )}

      {/* Main Grid: Available Discovery Spotlight vs Recent Claims */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Nearby Medicines Discovery Callout */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-6 bg-white border border-slate-200 shadow-soft h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-600" />
                  <h3 className="text-base font-bold text-slate-900">Available Medicines Nearby</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full">
                  10 km Radius
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                There are currently <strong>{summary?.availableNearbyCount || 0} approved donations</strong> with verified, unexpired medicine items available within your immediate healthcare delivery radius.
              </p>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% verified by licensed volunteer pharmacists</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automated AI and keyword compliance checks passed</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tamper-evident batch & expiry verification</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <Link to="/ngo/find" className="w-full">
                <Button variant="primary" className="w-full bg-teal-600 hover:bg-teal-700 font-semibold text-xs">
                  <span>Explore Available Inventory</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Right Column: Recent Claims Activity */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-6 bg-white border border-slate-200 shadow-soft h-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Recent Claims & Requests</h3>
              </div>
              <Link to="/ngo/matches" className="text-xs font-semibold text-teal-600 hover:underline">
                View All
              </Link>
            </div>

            {summary?.recentClaims && summary.recentClaims.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {summary.recentClaims.map((claim) => (
                  <div key={claim._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{claim.claimCode}</span>
                        <ClaimStatusBadge status={claim.status} size="xs" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Donation {claim.donationId?.donationCode || ''} • {claim.donorId?.city || 'Local area'}
                      </p>
                    </div>

                    <Link to="/ngo/matches">
                      <Button size="xs" variant="outline" className="text-xs">
                        Details
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                <HeartHandshake className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No active claims or requests yet.</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
