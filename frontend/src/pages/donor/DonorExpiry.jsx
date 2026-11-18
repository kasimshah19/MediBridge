import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  PlusCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  XCircle,
  RefreshCw,
  BarChart2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getExpirySummary, getExpiryItems, getExpiryTimeline } from '../../api/expiry.api.js';
import PriorityChip from '../../components/common/PriorityChip.jsx';
import ExpiryCountdown from '../../components/common/ExpiryCountdown.jsx';
import ExpiryAlertBanner from '../../components/common/ExpiryAlertBanner.jsx';
import PriorityFilterChips from '../../components/common/PriorityFilterChips.jsx';
import PriorityLegendPopover from '../../components/common/PriorityLegendPopover.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';

export default function DonorExpiry() {
  const [searchParams, setSearchParams] = useSearchParams();

  const priorityParam = searchParams.get('priority') || 'all';
  const statusParam = searchParams.get('status') || 'all';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'expiryDate';
  const orderParam = searchParams.get('order') || 'asc';

  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParam);

  // Sync search input with URL query with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParam) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput.trim()) next.set('search', searchInput.trim());
          else next.delete('search');
          next.set('page', '1');
          return next;
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, searchParam, setSearchParams]);

  // Load overall metrics and timeline once
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, timeRes] = await Promise.all([
        getExpirySummary(),
        getExpiryTimeline(),
      ]);
      setSummary(sumRes.data);
      setTimeline(timeRes.data?.timeline || []);
    } catch (err) {
      console.error('Failed to load expiry overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load items when query filters change
  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const res = await getExpiryItems({
        priority: priorityParam,
        status: statusParam,
        search: searchParam,
        sort: sortParam,
        order: orderParam,
        page: pageParam,
        limit: 15,
      });

      setItems(res.data.items || []);
      setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
    } catch (err) {
      console.error('Failed to load expiry items:', err);
    } finally {
      setItemsLoading(false);
    }
  }, [priorityParam, statusParam, searchParam, sortParam, orderParam, pageParam]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handlePrioritySelect = (key) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (key === 'all') next.delete('priority');
      else next.set('priority', key);
      next.set('page', '1');
      return next;
    });
  };

  const handleStatusChange = (e) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val === 'all') next.delete('status');
      else next.set('status', val);
      next.set('page', '1');
      return next;
    });
  };

  const toggleSortOrder = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('order', orderParam === 'asc' ? 'desc' : 'asc');
      return next;
    });
  };

  const goToPage = (p) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', p.toString());
      return next;
    });
  };

  const hasTimelineData = timeline.some((t) => t.count > 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Medicine Expiry Tracker
            </h1>
            <PriorityLegendPopover />
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Real-time shelf-life tracking, automated expiry alerts, and priority redistribution monitoring.
          </p>
        </div>

        <Link
          to="/donor/donate"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-sky-600 text-white font-bold text-sm shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 transition-all self-start sm:self-auto"
        >
          <PlusCircle size={18} />
          <span>Donate Medicines</span>
        </Link>
      </div>

      {/* Urgent Shelf-Life Banner */}
      {summary && (
        <ExpiryAlertBanner
          criticalCount={summary.critical || 0}
          expiringIn7Days={summary.expiringIn7Days || 0}
          expiredCount={summary.expiredTotal || 0}
          linkTo="/donor/expiry?priority=critical"
        />
      )}

      {/* Top Summary Cards (Clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          {
            key: 'critical',
            label: 'Critical',
            count: summary?.critical ?? 0,
            sub: '≤ 30 days left',
            icon: AlertTriangle,
            activeColor: 'ring-2 ring-rose-500 bg-rose-50/60',
            iconBg: 'bg-rose-100 text-rose-600',
            badgeBg: 'bg-rose-100 text-rose-700',
          },
          {
            key: 'high',
            label: 'High Urgency',
            count: summary?.high ?? 0,
            sub: '31 - 90 days',
            icon: Clock,
            activeColor: 'ring-2 ring-amber-500 bg-amber-50/60',
            iconBg: 'bg-amber-100 text-amber-600',
            badgeBg: 'bg-amber-100 text-amber-700',
          },
          {
            key: 'medium',
            label: 'Medium Urgency',
            count: summary?.medium ?? 0,
            sub: '91 - 180 days',
            icon: Clock,
            activeColor: 'ring-2 ring-sky-500 bg-sky-50/60',
            iconBg: 'bg-sky-100 text-sky-600',
            badgeBg: 'bg-sky-100 text-sky-700',
          },
          {
            key: 'normal',
            label: 'Normal',
            count: summary?.normal ?? 0,
            sub: '> 180 days',
            icon: ShieldCheck,
            activeColor: 'ring-2 ring-emerald-500 bg-emerald-50/60',
            iconBg: 'bg-emerald-100 text-emerald-600',
            badgeBg: 'bg-emerald-100 text-emerald-700',
          },
          {
            key: 'expired',
            label: 'Expired',
            count: summary?.expiredTotal ?? 0,
            sub: 'Past shelf life',
            icon: XCircle,
            activeColor: 'ring-2 ring-slate-500 bg-slate-100/70',
            iconBg: 'bg-slate-200 text-slate-700',
            badgeBg: 'bg-slate-200 text-slate-700',
          },
        ].map((card) => {
          const isSelected = priorityParam === card.key;
          const Icon = card.icon;

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => handlePrioritySelect(isSelected ? 'all' : card.key)}
              className={`p-4 rounded-2xl border text-left bg-white transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
                isSelected
                  ? `${card.activeColor} border-transparent`
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`p-2 rounded-xl shrink-0 ${card.iconBg}`}>
                  <Icon size={16} />
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${card.badgeBg}`}>
                  {card.sub}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {loading ? '...' : card.count}
              </div>
              <div className="text-xs font-semibold text-text-heading mt-0.5">
                {card.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* 12-Month Expiry Timeline Chart */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <BarChart2 size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">12-Month Expiry Timeline</h3>
              <p className="text-xs text-text-muted">
                Medicines approaching expiration month-by-month across your donations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-text-muted">
            <span className="inline-block w-2.5 h-2.5 rounded-xs bg-rose-500" /> Critical
            <span className="inline-block w-2.5 h-2.5 rounded-xs bg-amber-500 ml-1.5" /> High
            <span className="inline-block w-2.5 h-2.5 rounded-xs bg-sky-500 ml-1.5" /> Medium
            <span className="inline-block w-2.5 h-2.5 rounded-xs bg-emerald-500 ml-1.5" /> Normal
          </div>
        </div>

        {hasTimelineData ? (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="critical" name="Critical (≤30d)" stackId="a" fill="#E11D48" />
                <Bar dataKey="high" name="High (31-90d)" stackId="a" fill="#D97706" />
                <Bar dataKey="medium" name="Medium (91-180d)" stackId="a" fill="#0EA5E9" />
                <Bar dataKey="normal" name="Normal (>180d)" stackId="a" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Calendar size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
            No active medicine shelf-life records available yet.
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Priority Chips Filter */}
          <PriorityFilterChips
            selected={priorityParam}
            onSelect={handlePrioritySelect}
            counts={{
              totalTracked: summary?.totalTracked,
              critical: summary?.critical,
              high: summary?.high,
              medium: summary?.medium,
              normal: summary?.normal,
              expiredTotal: summary?.expiredTotal,
            }}
          />

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={() => {
              loadOverview();
              loadItems();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 self-end lg:self-center cursor-pointer transition-colors"
          >
            <RefreshCw size={13} className={itemsLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by medicine name, generic name, batch, or donation code..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-500"
            />
          </div>

          {/* Status Select */}
          <div className="flex items-center gap-2">
            <select
              value={statusParam}
              onChange={handleStatusChange}
              className="py-2 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="reserved">Reserved</option>
              <option value="expired">Expired</option>
            </select>

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={toggleSortOrder}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
              title="Toggle sort direction"
            >
              <ArrowUpDown size={14} />
              <span>{orderParam === 'asc' ? 'Soonest Expiry' : 'Latest Expiry'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Medicines Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {itemsLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between gap-4">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-4 bg-slate-200 rounded w-1/6" />
                <div className="h-4 bg-slate-200 rounded w-1/6" />
                <div className="h-4 bg-slate-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <Calendar size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No Tracked Medicines Found
            </h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 mb-5">
              {searchParam || priorityParam !== 'all' || statusParam !== 'all'
                ? 'Try clearing your search or adjusting your status/priority filters.'
                : 'You do not have any medicines under active tracking yet. Submit a donation to track shelf-life!'}
            </p>
            {searchParam || priorityParam !== 'all' || statusParam !== 'all' ? (
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                to="/donor/donate"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-colors"
              >
                <PlusCircle size={15} />
                <span>Donate Medicines</span>
              </Link>
            )}
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Medicine Info</th>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Shelf-Life</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Donation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const isMuted = item.isExpired || item.status === 'expired';
                    const expDateFormatted = item.expiryDate
                      ? new Date(item.expiryDate).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-';

                    return (
                      <tr
                        key={item._id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isMuted ? 'bg-slate-50/50 opacity-75' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {item.genericName && (
                            <div className="text-[11px] text-text-muted mt-0.5">
                              {item.genericName}
                            </div>
                          )}
                          {isMuted && (
                            <div className="text-[10px] text-rose-600 mt-1 font-semibold">
                              Expired — please dispose safely at pharmacy
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                          {item.batchNumber}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {item.quantity} {item.unit}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {expDateFormatted}
                        </td>

                        <td className="py-3.5 px-4">
                          <ExpiryCountdown
                            daysLeft={item.daysLeft}
                            expiryLabel={item.expiryLabel}
                            isExpired={item.isExpired}
                            compact
                          />
                        </td>

                        <td className="py-3.5 px-4">
                          <PriorityChip
                            priority={item.priority}
                            isExpired={item.isExpired}
                            size="sm"
                          />
                        </td>

                        <td className="py-3.5 px-4">
                          <StatusBadge status={item.status} size="sm" />
                          {item.status === 'reserved' && (
                            <span className="block mt-1 text-[10px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/80 w-max">
                              Reserved for match
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {item.donationId ? (
                            <Link
                              to={`/donor/donations/${item.donationId}`}
                              className="inline-flex items-center gap-1 font-bold text-primary-600 hover:text-primary-700 hover:underline"
                            >
                              <span>{item.donationCode || 'View'}</span>
                              <ExternalLink size={12} />
                            </Link>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {items.map((item) => {
                const isMuted = item.isExpired || item.status === 'expired';
                const expDateFormatted = item.expiryDate
                  ? new Date(item.expiryDate).toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-';

                return (
                  <div
                    key={item._id}
                    className={`p-4 space-y-3 ${isMuted ? 'bg-slate-50/70 opacity-80' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                        {item.genericName && (
                          <p className="text-xs text-text-muted">{item.genericName}</p>
                        )}
                      </div>
                      <PriorityChip
                        priority={item.priority}
                        isExpired={item.isExpired}
                        size="sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Batch</span>
                        <span className="font-mono font-medium">{item.batchNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Quantity</span>
                        <span className="font-semibold">{item.quantity} {item.unit}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Expiry Month</span>
                        <span className="font-medium">{expDateFormatted}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Status</span>
                        <StatusBadge status={item.status} size="sm" />
                        {item.status === 'reserved' && (
                          <span className="block mt-1 text-[10px] font-semibold text-teal-800 bg-teal-50 px-1 py-0.5 rounded border border-teal-200/80 w-max">
                            Reserved
                          </span>
                        )}
                      </div>
                    </div>

                    <ExpiryCountdown
                      daysLeft={item.daysLeft}
                      expiryLabel={item.expiryLabel}
                      isExpired={item.isExpired}
                    />

                    {isMuted && (
                      <p className="text-[11px] text-rose-600 font-medium">
                        Expired items can no longer be redistributed. Please dispose of them safely at your local pharmacy.
                      </p>
                    )}

                    {item.donationId && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <Link
                          to={`/donor/donations/${item.donationId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700"
                        >
                          <span>Donation {item.donationCode || ''}</span>
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Page {pagination.page} of {pagination.pages} ({pagination.total} medicines)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

