import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ClipboardCheck,
  Clock,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Play,
  Flame,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getVerificationSummary } from '../../api/verification.api';
import { getVerificationHistory } from '../../api/verification.api';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import DecisionChip from '../../components/verification/DecisionChip';

export default function PharmacistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      try {
        const [sumRes, histRes] = await Promise.all([
          getVerificationSummary(),
          getVerificationHistory({ limit: 5 }),
        ]);

        if (active) {
          setSummary(sumRes.data);
          setRecentDecisions(histRes.data?.history || []);
        }
      } catch (err) {
        console.error('Failed to load pharmacist dashboard:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  const activeClaims = summary?.activeClaims || [];
  const primaryClaim = activeClaims[0];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-soft relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck size={14} className="text-white" />
            <span>Licensed Clinical Reviewer Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
            Welcome back, {user?.firstName || user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-teal-50/90 leading-relaxed">
            {user?.pharmacistProfile?.pharmacyName ? `${user.pharmacistProfile.pharmacyName} • ` : ''}
            License #{user?.pharmacistProfile?.licenseNumber || 'Active'}.
            Your clinical verification ensures strict packaging safety, batch traceability, and non-expired quality before donation redistribution.
          </p>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Critical Expiry Alert in Queue */}
      {summary?.criticalExpiryInQueue > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-amber-50 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
              <Flame size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-rose-900">
                {summary.criticalExpiryInQueue} Medicine Item{summary.criticalExpiryInQueue === 1 ? '' : 's'} with Urgent Expiry in Queue
              </p>
              <p className="text-xs text-rose-800/80 mt-0.5">
                Pending medicines have 90 or fewer days remaining shelf life. Prioritize verification to prevent expiration.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => navigate('/pharmacist/verification?sort=expiry_soonest')}
            className="self-end sm:self-center bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
          >
            Review Urgent Items
            <ArrowRight size={13} className="ml-1.5" />
          </Button>
        </div>
      )}

      {/* Continue Reviewing Banner (Active Claim) */}
      {primaryClaim && (
        <div className="p-4 sm:p-5 rounded-2xl border border-teal-200 bg-teal-50/90 text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-teal-950">Active Session: {primaryClaim.donationCode}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-800">
                  {primaryClaim.minutesLeft} min left
                </span>
              </div>
              <p className="text-xs text-teal-800/80 mt-0.5">
                You have reserved exclusive review rights for this donation. Continue where you left off.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => navigate(`/pharmacist/verification/${primaryClaim.donationId}`)}
            className="self-end sm:self-center bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
          >
            <Play size={13} className="mr-1.5 fill-current" />
            Resume Verification
          </Button>
        </div>
      )}

      {/* Real Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Awaiting Review"
          value={summary?.awaitingReview ?? 0}
          icon={ClipboardCheck}
          color="info"
          description="Unclaimed donations waiting in queue"
        />
        <StatCard
          title="In Review by Me"
          value={summary?.inReviewByMe ?? 0}
          icon={Clock}
          color="warning"
          description="Donations currently reserved by you"
        />
        <StatCard
          title="Awaiting Donor Info"
          value={summary?.awaitingDonorInfo ?? 0}
          icon={HelpCircle}
          color="warning"
          description="Clarifications pending donor response"
        />
        <StatCard
          title="Decided Today"
          value={summary?.decidedToday ?? 0}
          icon={CheckCircle2}
          color="success"
          description="Your completed reviews today"
        />
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Approved by Me
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">
              {summary?.approvedByMe ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">medicines approved</span>
          </div>
        </Card>

        <Card className="p-5 bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Rejected by Me
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-700">
              {summary?.rejectedByMe ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">safety violations blocked</span>
          </div>
        </Card>

        <Card className="p-5 bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Avg Turnaround Time (30d)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {summary?.avgReviewHoursLast30Days !== null ? `${summary.avgReviewHoursLast30Days}h` : '—'}
            </span>
            <span className="text-xs text-slate-500 font-medium">from submission to decision</span>
          </div>
        </Card>
      </div>

      {/* Recent Activity / Decisions */}
      <Card className="p-6 bg-white border border-slate-200/90 shadow-soft">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Verification Decisions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Your latest audited inspection decisions</p>
          </div>
          <Link
            to="/pharmacist/history"
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            View Complete History
            <ArrowRight size={13} />
          </Link>
        </div>

        {recentDecisions.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No decisions recorded yet"
            description="When you verify medicines from the queue, your decision audit log will appear here."
            actionText="Go to Verification Queue"
            onAction={() => navigate('/pharmacist/verification')}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {recentDecisions.map((item) => (
              <div
                key={item._id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-slate-50/50 -mx-2 px-2 rounded-xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{item.medicineName}</span>
                    <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      {item.batchNumber}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {item.donationCode}
                    </span>
                  </div>
                  {item.reason && (
                    <p className="text-slate-600 mt-1 line-clamp-1 italic">
                      {item.reasonLabel ? `${item.reasonLabel}: ` : ''}"{item.reason}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                  <DecisionChip decision={item.decision} size="sm" />
                  <span className="text-slate-400 text-[11px]">
                    {new Date(item.verifiedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
