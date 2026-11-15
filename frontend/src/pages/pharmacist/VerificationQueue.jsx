import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Search,
  Clock,
  ArrowUpDown,
  Filter,
  MapPin,
  Package,
  ShieldAlert,
  UserCheck,
  ArrowRight,
  Flame,
  Lock,
} from 'lucide-react';
import { getVerificationQueue } from '../../api/verification.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import PriorityChip from '../../components/common/PriorityChip';
import ExpiryCountdown from '../../components/common/ExpiryCountdown';
import StatusBadge from '../../components/common/StatusBadge';

const TABS = [
  { id: 'awaiting', label: 'Awaiting Review' },
  { id: 'mine', label: 'My Reviews' },
  { id: 'needs_info', label: 'Needs Donor Info' },
  { id: 'all', label: 'All Active' },
];

const SORT_OPTIONS = [
  { value: 'oldest', label: 'Oldest First (FIFO)' },
  { value: 'expiry_soonest', label: 'Expiry Soonest (Critical First)' },
  { value: 'newest', label: 'Newest First' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'critical', label: 'Critical (≤30d)' },
  { value: 'high', label: 'High (31-90d)' },
  { value: 'medium', label: 'Medium (91-180d)' },
  { value: 'normal', label: 'Normal (>180d)' },
];

export default function VerificationQueue() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('awaiting');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('oldest');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);

  const [queue, setQueue] = useState([]);
  const [counts, setCounts] = useState({ awaiting: 0, mine: 0, needs_info: 0, all: 0 });
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

  // Load queue data
  useEffect(() => {
    let active = true;
    setLoading(true);

    async function fetchQueue() {
      try {
        const res = await getVerificationQueue({
          tab: activeTab,
          priority: priorityFilter || undefined,
          search: debouncedSearch || undefined,
          sort: sortBy,
          page,
          limit: 10,
        });

        if (active) {
          setQueue(res.data?.queue || []);
          setCounts(res.data?.counts || { awaiting: 0, mine: 0, needs_info: 0, all: 0 });
          setPagination(res.data?.pagination || { totalPages: 1, total: 0 });
        }
      } catch (err) {
        console.error('Failed to load verification queue:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchQueue();
    return () => {
      active = false;
    };
  }, [activeTab, debouncedSearch, sortBy, priorityFilter, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Verification Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Clinical inspection pipeline for medicine donations across India.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border border-slate-200/90 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by donation code (e.g. DON-202611)..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>

          {/* Sort Select */}
          <div className="sm:col-span-4 relative">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="sm:col-span-3 relative">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Queue Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-28 rounded-2xl w-full" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <Card className="p-8 bg-white border border-slate-200/90 shadow-soft">
          <EmptyState
            icon={ClipboardCheck}
            title="The verification queue is clear"
            description="There are currently no donations matching your filter criteria. New community submissions will appear here automatically."
            actionText="Refresh Queue"
            onAction={() => setPage(1)}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {queue.map((card) => {
            // Waiting time color rules (amber > 24h, rose > 48h)
            const waitingHours = card.waitingHours || 0;
            const isWaitingCritical = waitingHours >= 48;
            const isWaitingWarning = waitingHours >= 24 && waitingHours < 48;

            return (
              <Card
                key={card.donationId}
                className="p-4 sm:p-5 bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left block: Code, Donor, Waiting time */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {card.donationCode}
                    </span>
                    <StatusBadge status={card.status} size="sm" />

                    {/* Waiting time pill */}
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isWaitingCritical
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isWaitingWarning
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Clock size={11} />
                      Waiting {waitingHours}h
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span>
                      Donor: <strong className="text-slate-700">{card.donor?.firstName}</strong> ({card.donor?.city})
                    </span>
                    <span>•</span>
                    <span>
                      Items: <strong>{card.itemCount}</strong> total ({card.pendingItemCount} pending)
                    </span>
                  </div>

                  {/* Most urgent item display */}
                  {card.mostUrgentItem && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-xs text-slate-400">Most Urgent:</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {card.mostUrgentItem.name}
                      </span>
                      <PriorityChip priority={card.mostUrgentItem.effectivePriority} size="sm" />
                      <ExpiryCountdown daysLeft={card.mostUrgentItem.daysLeft} size="sm" />
                    </div>
                  )}
                </div>

                {/* Right block: Claim status & Action */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:self-center flex-shrink-0">
                  {/* Claim state */}
                  {card.claim ? (
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 ${
                        card.claim.claimedByMe
                          ? 'bg-teal-50 border-teal-200 text-teal-800 font-semibold'
                          : 'bg-sky-50 border-sky-200 text-sky-800'
                      }`}
                    >
                      {card.claim.claimedByMe ? (
                        <>
                          <UserCheck size={14} className="text-teal-600" />
                          <span>Reserved for you</span>
                        </>
                      ) : (
                        <>
                          <Lock size={13} className="text-sky-600" />
                          <span>In review by {card.claim.claimedByName}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={13} />
                      Unclaimed
                    </span>
                  )}

                  <Button
                    size="sm"
                    onClick={() => navigate(`/pharmacist/verification/${card.donationId}`)}
                    className="w-full sm:w-auto text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  >
                    <span>Inspect & Review</span>
                    <ArrowRight size={13} className="ml-1.5" />
                  </Button>
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500">
              <span>
                Showing page {page} of {pagination.totalPages} ({pagination.total} donations)
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
        </div>
      )}
    </div>
  );
}
