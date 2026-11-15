import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { getVerificationHistory } from '../../api/verification.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import DecisionChip from '../../components/verification/DecisionChip';

const DECISION_FILTER_OPTIONS = [
  { value: '', label: 'All Decisions' },
  { value: 'approved', label: 'Approved Only' },
  { value: 'rejected', label: 'Rejected Only' },
  { value: 'more_info_requested', label: 'Clarifications Only' },
];

export default function PharmacistHistory() {
  const [history, setHistory] = useState([]);
  const [decisionFilter, setDecisionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load history records
  useEffect(() => {
    let active = true;
    setLoading(true);

    async function fetchHistory() {
      try {
        const res = await getVerificationHistory({
          decision: decisionFilter || undefined,
          search: debouncedSearch || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          page,
          limit: 15,
        });

        if (active) {
          setHistory(res.data?.history || []);
          setPagination(res.data?.pagination || { totalPages: 1, total: 0 });
        }
      } catch (err) {
        console.error('Failed to load verification history:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      active = false;
    };
  }, [decisionFilter, debouncedSearch, fromDate, toDate, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
          Inspection History & Audit
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Complete, immutable regulatory audit trail of all medicine items verified by your license.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="sm:col-span-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by medicine name or batch..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>

          {/* Decision Select */}
          <div className="sm:col-span-3">
            <select
              value={decisionFilter}
              onChange={(e) => {
                setDecisionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              {DECISION_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range inputs */}
          <div className="sm:col-span-5 flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-600 focus:bg-white focus:outline-none"
              title="From date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-600 focus:bg-white focus:outline-none"
              title="To date"
            />
          </div>
        </div>
      </Card>

      {/* History Log Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-2xl w-full" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <Card className="p-8 bg-white border border-slate-200 shadow-soft">
          <EmptyState
            icon={FileText}
            title="No verification records found"
            description="No verification decisions matched your filter criteria."
            actionText="Clear Filters"
            onAction={() => {
              setDecisionFilter('');
              setSearch('');
              setFromDate('');
              setToDate('');
            }}
          />
        </Card>
      ) : (
        <Card className="bg-white border border-slate-200 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Medicine & Batch</th>
                  <th className="py-3 px-4">Donation</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4">Clinical Findings / Reason</th>
                  <th className="py-3 px-4">Round</th>
                  <th className="py-3 px-4 text-right">Verified At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{record.medicineName}</div>
                      <span className="font-mono text-[11px] text-slate-500 font-normal">
                        Batch: {record.batchNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {record.donationCode}
                    </td>

                    <td className="py-3 px-4">
                      <DecisionChip decision={record.decision} size="sm" />
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      {record.reason ? (
                        <p className="text-slate-700 truncate" title={record.reason}>
                          {record.reasonLabel ? <strong>{record.reasonLabel}: </strong> : null}
                          {record.reason}
                        </p>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      Round {record.round}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                      {new Date(record.verifiedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
    </div>
  );
}
