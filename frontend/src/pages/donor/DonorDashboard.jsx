import { useState, useEffect } from 'react';
import { Heart, Package, Clock, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { getMyAuditLogs } from '../../api/user.api';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAuditLogs()
      .then((res) => setLogs(res.data?.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-soft relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-3">
            <Heart size={14} className="fill-white" />
            <span>Donor Community Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl leading-relaxed">
            Your unused sealed medicines can save lives. Submit items for pharmacist safety checks and connect with nearby verified clinics.
          </p>
        </div>
      </div>

      {/* Grid: Donations Placeholder & Real Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Medicine Donations (Phase 3 placeholder) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 bg-white shadow-soft">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <Package size={18} className="text-primary-600" />
                <h3 className="text-base font-heading font-bold text-text-heading">
                  My Active Donations
                </h3>
              </div>
              <Badge color="info">Phase 3 Feature</Badge>
            </div>

            <EmptyState
              icon={Package}
              title="No Medicine Submissions Yet"
              description="The medicine donation submission workflow opens in Phase 3. You will be able to upload packaging photos, batch numbers, and expiry dates."
            />
          </Card>
        </div>

        {/* Right Column: Real Account Activity */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 bg-white shadow-soft">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <Activity size={18} className="text-teal-600" />
                <h3 className="text-base font-heading font-bold text-text-heading">
                  Recent Account Activity
                </h3>
              </div>
              <Badge color="neutral">Live Audit</Badge>
            </div>

            {loading ? (
              <div className="py-8 flex justify-center">
                <Spinner size="md" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">No logged activity yet</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.slice(0, 5).map((log) => (
                  <div key={log._id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-text-heading font-mono text-[11px]">
                        {log.action}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        IP: {log.ip || 'Localhost'}
                      </p>
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
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
