import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Search,
  Filter,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  User,
  Unlock,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  getAdminVerificationSummary,
  getAdminVerificationLog,
  forceReleaseDonation,
} from '../../api/admin.api';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import DecisionChip from '../../components/verification/DecisionChip';

export default function AdminVerification() {
  const [summary, setSummary] = useState(null);
  const [log, setLog] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [decisionFilter, setDecisionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Drawer & Force Release Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [forceReleaseTarget, setForceReleaseTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const [sumRes, logRes] = await Promise.all([
        getAdminVerificationSummary(),
        getAdminVerificationLog({
          decision: decisionFilter || undefined,
          search: debouncedSearch || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          page,
          limit: 15,
        }),
      ]);

      setSummary(sumRes.data);
      setLog(logRes.data?.log || []);
      setPagination(logRes.data?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load admin verification oversight:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [decisionFilter, debouncedSearch, fromDate, toDate, page]);

  // Handle force release
  const handleForceRelease = async () => {
    if (!forceReleaseTarget) return;
    setActionLoading(true);

    try {
      await forceReleaseDonation(forceReleaseTarget.donationId);
      setToastMessage(`Force-released claim for donation ${forceReleaseTarget.donationCode}.`);
      setForceReleaseTarget(null);
      await loadData(true);
    } catch (err) {
      console.error('Force release error:', err);
      alert(err.response?.data?.message || 'Could not force release claim.');
    } finally {
      setActionLoading(false);
    }
  };

  const activeClaims = summary?.activeClaims || [];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs sm:text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-teal-600" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Verification Oversight & Compliance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supervise clinical decisions, active reviewer claims, and regulatory audit records.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => loadData()}
          className="text-xs self-start sm:self-center"
        >
          <RefreshCw size={13} className="mr-1.5" />
          Refresh Audit Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="In Verification Queue"
          value={summary?.pendingInQueue ?? 0}
          description="Donations under inspection"
          color="info"
        />
        <StatCard
          title="Oldest Waiting Time"
          value={summary?.oldestWaitingHours !== undefined ? `${summary.oldestWaitingHours}h` : '—'}
          description="Longest unverified donation"
          color="warning"
        />
        <StatCard
          title="Decisions Today"
          value={summary?.decisionsToday ?? 0}
          description="Clinical reviews completed today"
          color="success"
        />
        <StatCard
          title="30-Day Approval Rate"
          value={summary?.approvalRate30Days !== undefined ? `${summary.approvalRate30Days}%` : '—'}
          description="Approved vs rejected medicines"
          color="primary"
        />
      </div>

      {/* Active Claims in Progress */}
      <Card className="p-5 bg-white border border-slate-200 shadow-soft space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Active Pharmacist Claims in Progress ({activeClaims.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Lock TTL: 60 minutes</span>
        </div>

        {activeClaims.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No active claim locks held right now. Pharmacists can claim donations from the queue.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeClaims.map((claim) => (
              <div
                key={claim.donationId}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {claim.donationCode}
                    </span>
                    <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {claim.minutesLeft} min left
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Claimed by: <strong>{claim.pharmacist?.name}</strong>{' '}
                    {claim.pharmacist?.pharmacyName ? `(${claim.pharmacist.pharmacyName})` : ''} •{' '}
                    <span className="text-slate-400">{claim.pharmacist?.email}</span>
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setForceReleaseTarget(claim)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 self-end sm:self-center"
                >
                  <Unlock size={13} className="mr-1.5" />
                  Force Release Lock
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Verification Log Filter Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by medicine name, batch, or donation..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={decisionFilter}
              onChange={(e) => {
                setDecisionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="">All Decisions</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="more_info_requested">Clarifications</option>
            </select>
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-600 focus:bg-white"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-600 focus:bg-white"
            />
          </div>
        </div>
      </Card>

      {/* Verification Log Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-2xl w-full" />
          ))}
        </div>
      ) : log.length === 0 ? (
        <Card className="p-8 bg-white border border-slate-200 shadow-soft">
          <EmptyState
            icon={ClipboardCheck}
            title="No verification records found"
            description="No logged clinical decisions match your query."
          />
        </Card>
      ) : (
        <Card className="bg-white border border-slate-200 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Medicine Item</th>
                  <th className="py-3 px-4">Donation</th>
                  <th className="py-3 px-4">Pharmacist Reviewer</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4">Finding / Note</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {log.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{rec.medicineName}</div>
                      <span className="font-mono text-[11px] text-slate-400">
                        Batch: {rec.batchNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {rec.donationCode}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{rec.pharmacist?.name}</div>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {rec.pharmacist?.pharmacyName || rec.pharmacist?.email}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <DecisionChip decision={rec.decision} size="sm" />
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      {rec.reason ? (
                        <p className="text-slate-700 truncate" title={rec.reason}>
                          {rec.reasonLabel ? <strong>{rec.reasonLabel}: </strong> : null}
                          {rec.reason}
                        </p>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg text-teal-700 hover:bg-teal-50 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 text-xs text-slate-500">
              <span>
                Showing page {page} of {pagination.totalPages} ({pagination.total} records)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Record Inspection Drawer */}
      <Drawer
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title={`Verification Record: ${selectedRecord?.medicineName || 'Medicine'}`}
      >
        {selectedRecord && (
          <div className="space-y-5 text-xs text-slate-700">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {selectedRecord.medicineName}
                </span>
                <DecisionChip decision={selectedRecord.decision} size="sm" />
              </div>
              <p className="font-mono text-slate-500">
                Batch: {selectedRecord.batchNumber} • Donation: {selectedRecord.donationCode} • Round {selectedRecord.round}
              </p>
              <p className="text-slate-400 text-[11px]">
                Verified on {new Date(selectedRecord.verifiedAt).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Pharmacist Profile */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-xs">Reviewing Pharmacist</span>
              <p className="font-medium text-slate-800">{selectedRecord.pharmacist?.name}</p>
              <p className="text-slate-500">{selectedRecord.pharmacist?.email}</p>
              <p className="text-slate-500">
                {selectedRecord.pharmacist?.pharmacyName} • License #{selectedRecord.pharmacist?.licenseNumber || 'Active'}
              </p>
            </div>

            {/* 6-Point Checklist Snapshot */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 block">Checklist Snapshot</span>
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                {selectedRecord.checklist ? (
                  Object.entries(selectedRecord.checklist).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                      <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={v ? 'text-emerald-700 font-bold' : 'text-slate-400 font-medium'}>
                        {v ? 'Passed ✓' : 'Not verified'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No checklist recorded.</p>
                )}
              </div>
            </div>

            {/* Clinical Reason or Question */}
            {selectedRecord.reason && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                <span className="font-bold text-rose-900 block">Rejection Note</span>
                {selectedRecord.reasonLabel && (
                  <p className="font-semibold text-rose-800">{selectedRecord.reasonLabel}</p>
                )}
                <p className="leading-relaxed">{selectedRecord.reason}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Force Release Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(forceReleaseTarget)}
        onClose={() => setForceReleaseTarget(null)}
        onConfirm={handleForceRelease}
        isLoading={actionLoading}
        variant="warning"
        title="Force Release Claim Lock"
        description={`Are you sure you want to release the active review claim on donation ${forceReleaseTarget?.donationCode}? It will be returned to the general queue for any pharmacist to claim.`}
        confirmText="Force Release"
      />
    </div>
  );
}
