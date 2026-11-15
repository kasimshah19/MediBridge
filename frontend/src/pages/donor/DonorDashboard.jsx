import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Package,
  Clock,
  ShieldCheck,
  Activity,
  PlusCircle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/common/StatusBadge';
import { getMyDonations, getMyDonationsSummary } from '../../api/donation.api';
import { getMyAuditLogs } from '../../api/user.api';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentDonations, setRecentDonations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sumRes, donRes, logsRes] = await Promise.all([
          getMyDonationsSummary().catch(() => null),
          getMyDonations({ limit: 5 }).catch(() => null),
          getMyAuditLogs().catch(() => null),
        ]);

        if (sumRes?.data) setSummary(sumRes.data);
        if (donRes?.data?.donations) setRecentDonations(donRes.data.donations);
        if (logsRes?.data?.logs) setLogs(logsRes.data.logs);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Primary CTA Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-soft relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
          <Heart size={280} />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-3">
            <Heart size={14} className="fill-white" />
            <span>Donor Community Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-white/90 mt-2 leading-relaxed">
            Every unused, sealed medicine you donate has the power to save lives in underserved
            communities. Each donation undergoes strict safety screening and licensed pharmacist
            inspection.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link to="/donor/donate">
              <Button
                variant="primary"
                size="md"
                className="bg-white text-teal-800 hover:bg-slate-100 font-bold shadow-md hover:shadow-lg text-xs"
              >
                <PlusCircle size={15} className="mr-1.5" />
                <span>Donate Medicines Now</span>
              </Button>
            </Link>
            <Link to="/donor/donations">
              <Button
                variant="outline"
                size="md"
                className="border-white/40 text-white hover:bg-white/10 text-xs"
              >
                <span>View My Donations</span>
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Real StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Donations */}
        <Card className="p-5 bg-white shadow-soft border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">Total Donations</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Package size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-extrabold text-text-heading mt-2">
            {loading ? <span className="text-slate-300">...</span> : summary?.total || 0}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            {summary?.totalMedicineItems || 0} total medicine items
          </p>
        </Card>

        {/* Under Verification */}
        <Card className="p-5 bg-white shadow-soft border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">In Review / Queue</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-extrabold text-sky-700 mt-2">
            {loading ? <span className="text-slate-300">...</span> : summary?.underVerification || 0}
          </p>
          <p className="text-[11px] text-text-muted mt-1">Awaiting pharmacist checks</p>
        </Card>

        {/* Approved */}
        <Card className="p-5 bg-white shadow-soft border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">Approved & Ready</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-700 mt-2">
            {loading ? <span className="text-slate-300">...</span> : summary?.approved || 0}
          </p>
          <p className="text-[11px] text-text-muted mt-1">Ready for clinic handover</p>
        </Card>

        {/* Rejected */}
        <Card className="p-5 bg-white shadow-soft border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">Screening Rejected</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-extrabold text-rose-700 mt-2">
            {loading ? <span className="text-slate-300">...</span> : summary?.rejected || 0}
          </p>
          <p className="text-[11px] text-text-muted mt-1">Policy non-compliant items</p>
        </Card>
      </div>

      {/* 3. Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Recent Donations List */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 bg-white shadow-soft border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <Package size={18} className="text-teal-700" />
                <h3 className="text-base font-heading font-bold text-text-heading">
                  Recent Donations
                </h3>
              </div>
              <Link
                to="/donor/donations"
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline"
              >
                <span>View all</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <Spinner size="md" />
                <p className="text-xs text-text-muted mt-2">Loading your donations...</p>
              </div>
            ) : recentDonations.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No Donations Yet"
                description="You haven't submitted any medicine donations yet. Start making a difference by donating your unexpired, sealed medicines."
                action={
                  <Link to="/donor/donate">
                    <Button variant="primary" size="sm" className="text-xs font-semibold">
                      <PlusCircle size={14} className="mr-1.5" />
                      Create First Donation
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentDonations.map((don) => (
                  <div
                    key={don._id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-teal-900">
                          {don.donationCode || 'DRAFT (In Progress)'}
                        </span>
                        <StatusBadge status={don.status} size="xs" />
                      </div>
                      <p className="text-xs text-text-heading font-semibold truncate">
                        {don.items?.map((i) => i.name).join(', ') || 'No medicines added'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-text-muted mt-0.5">
                        <span>{don.items?.length || 0} medicine item(s)</span>
                        <span>•</span>
                        <span>{don.pickupAddress?.city || 'City pending'}</span>
                        <span>•</span>
                        <span>{new Date(don.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {don.status === 'draft' ? (
                        <Link to={`/donor/donate/${don._id}`}>
                          <Button variant="outline" size="sm" className="text-xs py-1 px-3">
                            Resume Draft
                          </Button>
                        </Link>
                      ) : (
                        <Link to={`/donor/donations/${don._id}`}>
                          <Button variant="ghost" size="sm" className="text-xs py-1 px-2.5 text-teal-700">
                            Details
                            <ArrowRight size={13} className="ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Helper: What We Accept vs Never Accept */}
          <Card className="p-6 bg-gradient-to-br from-slate-50 to-teal-50/30 border border-teal-900/10 shadow-soft">
            <h4 className="text-sm font-heading font-bold text-text-heading mb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-teal-700" />
              <span>Safety & Donation Acceptance Guidelines</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-200/60 space-y-2">
                <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  What We Accept
                </p>
                <ul className="text-text-body space-y-1.5 pl-5 list-disc text-[11px] leading-relaxed">
                  <li>Sealed blister strips and untampered original boxes</li>
                  <li>At least 90 days remaining shelf life</li>
                  <li>Clear, legible batch number and expiry date</li>
                  <li>Stored at room temperature in hygienic domestic conditions</li>
                </ul>
              </div>

              <div className="p-3.5 bg-white/90 rounded-2xl border border-rose-200/60 space-y-2">
                <p className="font-bold text-rose-800 flex items-center gap-1.5">
                  <XCircle size={14} className="text-rose-600" />
                  What We Never Accept
                </p>
                <ul className="text-text-body space-y-1.5 pl-5 list-disc text-[11px] leading-relaxed">
                  <li>Expired pharmaceuticals (any days past expiry)</li>
                  <li>Opened bottles, loose tablets, or cut strips</li>
                  <li>Injectable medicines, insulin, and vaccines (cold chain)</li>
                  <li>Controlled, narcotic, or habit-forming substances</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (4 cols): Activity Timeline & Profile Shortcut */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 bg-white shadow-soft border border-slate-100">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
              <Activity size={18} className="text-teal-700" />
              <h3 className="text-base font-heading font-bold text-text-heading">
                Recent Activity
              </h3>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <Spinner size="sm" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">
                No recent activity recorded.
              </p>
            ) : (
              <div className="space-y-4">
                {logs.slice(0, 6).map((log) => (
                  <div key={log._id} className="flex items-start gap-3 text-xs">
                    <span className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text-heading truncate">
                        {log.action?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
