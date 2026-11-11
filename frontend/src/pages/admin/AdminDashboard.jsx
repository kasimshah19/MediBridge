import { useState, useEffect } from 'react';
import { Shield, Users, Activity, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { getMyAuditLogs } from '../../api/user.api';

export default function AdminDashboard() {
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
      <div className="bg-gradient-to-r from-teal-700 via-sky-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-soft">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-3">
          <Shield size={14} className="text-white" />
          <span>System Administration & Platform Governance</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
          Admin Console: {user?.name}
        </h1>
        <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl leading-relaxed">
          Full governance over user role verifications, NGO onboarding validations, and chain of custody compliance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification Oversight (Phase 2 feature) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 bg-white shadow-soft">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <Users size={18} className="text-teal-700" />
                <h3 className="text-base font-heading font-bold text-text-heading">
                  Pending Professional Verifications
                </h3>
              </div>
              <Badge color="info">Phase 2 Feature</Badge>
            </div>

            <EmptyState
              icon={Users}
              title="Verification Dashboard Locked"
              description="Full pharmacist license approval and NGO 12A/80G validation tooling activates in Phase 2: Organization Onboarding."
            />
          </Card>
        </div>

        {/* Real Audit Trail */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 bg-white shadow-soft">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <Activity size={18} className="text-teal-600" />
                <h3 className="text-base font-heading font-bold text-text-heading">
                  System Audit Trail
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
