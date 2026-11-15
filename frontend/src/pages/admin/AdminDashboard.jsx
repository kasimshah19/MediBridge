import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Activity,
  AlertCircle,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { getAdminOverview } from '../../api/admin.api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminOverview()
      .then((res) => setOverview(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-text-muted">Loading administrative console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-sky-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-soft">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-3">
          <Shield size={14} className="text-white" />
          <span>Platform Governance & Compliance Console</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
          Welcome back, {user?.name}
        </h1>
        <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl leading-relaxed">
          Manage organization verification requests, review licensed pharmacists, and monitor tamper-proof platform audit activity.
        </p>
      </div>

      {/* Real Live StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/organizations?status=pending">
          <StatCard
            title="Pending Organizations"
            value={overview?.pendingOrganizations ?? 0}
            icon={Clock}
            color="amber"
            description="Awaiting document verification"
            className="hover:border-amber-300 transition-all cursor-pointer"
          />
        </Link>

        <Link to="/admin/organizations?status=verified">
          <StatCard
            title="Verified Organizations"
            value={overview?.verifiedOrganizations ?? 0}
            icon={CheckCircle2}
            color="teal"
            description="Active clinics & NGOs"
            className="hover:border-teal-300 transition-all cursor-pointer"
          />
        </Link>

        <Link to="/admin/pharmacists?status=pending">
          <StatCard
            title="Pending Pharmacists"
            value={overview?.pendingPharmacists ?? 0}
            icon={Stethoscope}
            color="sky"
            description="Awaiting license review"
            className="hover:border-sky-300 transition-all cursor-pointer"
          />
        </Link>

        <StatCard
          title="Total Registered Donors"
          value={overview?.totalDonors ?? 0}
          icon={Users}
          color="emerald"
          description={`From ${overview?.totalUsers ?? 0} total platform users`}
        />
      </div>

      {/* Quick Action Shortcuts & Verification Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification Queues */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 bg-white shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-teal-700" />
                <h3 className="text-base font-bold text-text-heading">
                  Organization Verification Queue
                </h3>
              </div>
              <Link to="/admin/organizations">
                <Button variant="ghost" size="sm">
                  View All Organizations
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </Link>
            </div>

            {overview?.pendingOrganizations > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    {overview.pendingOrganizations}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">
                      Organizations Pending Review
                    </p>
                    <p className="text-xs text-amber-700">
                      Official registration certificates & licenses require audit.
                    </p>
                  </div>
                </div>
                <Link to="/admin/organizations?status=pending">
                  <Button variant="primary" size="sm">
                    Review Queue
                  </Button>
                </Link>
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="All Organizations Reviewed"
                description="No organization profiles are currently pending review."
              />
            )}
          </Card>

          {/* Pharmacists Queue */}
          <Card className="p-6 bg-white shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Stethoscope size={18} className="text-sky-700" />
                <h3 className="text-base font-bold text-text-heading">
                  Pharmacist Licensing Queue
                </h3>
              </div>
              <Link to="/admin/pharmacists">
                <Button variant="ghost" size="sm">
                  View All Pharmacists
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </Link>
            </div>

            {overview?.pendingPharmacists > 0 ? (
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    {overview.pendingPharmacists}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-sky-900">
                      Pharmacists Awaiting Approval
                    </p>
                    <p className="text-xs text-sky-700">
                      Verify state registration numbers & pharmacy affiliations.
                    </p>
                  </div>
                </div>
                <Link to="/admin/pharmacists?status=pending">
                  <Button variant="primary" size="sm">
                    Review Licenses
                  </Button>
                </Link>
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="All Pharmacists Reviewed"
                description="No pharmacist accounts are currently pending review."
              />
            )}
          </Card>
        </div>

        {/* Real Platform Audit Trail */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 bg-white shadow-soft">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
              <Activity size={18} className="text-teal-700" />
              <h3 className="text-base font-bold text-text-heading">Recent Platform Events</h3>
            </div>

            {!overview?.recentActivity || overview.recentActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No Events Recorded"
                description="Platform activity will be logged here automatically."
              />
            ) : (
              <div className="space-y-3">
                {overview.recentActivity.map((log) => (
                  <div
                    key={log._id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-800">{log.action}</span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-text-muted truncate">
                      By: {log.userId?.name || 'System / Guest'} ({log.userId?.role || 'anonymous'})
                    </p>
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <p className="text-[10px] text-slate-500 truncate">
                        {JSON.stringify(log.meta)}
                      </p>
                    )}
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
