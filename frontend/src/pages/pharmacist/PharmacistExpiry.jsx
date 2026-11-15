import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Search,
  Filter,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  BarChart2,
  CheckCircle2,
  User,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getExpirySummary, getExpiryItems, getExpiryTimeline } from '../../api/expiry.api.js';
import PriorityChip from '../../components/common/PriorityChip.jsx';
import ExpiryCountdown from '../../components/common/ExpiryCountdown.jsx';
import PriorityFilterChips from '../../components/common/PriorityFilterChips.jsx';
import PriorityLegendPopover from '../../components/common/PriorityLegendPopover.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function PharmacistExpiry() {
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

  // Load summary and timeline
  const loadSummaryData = useCallback(async () => {
    try {
      const [sumRes, timeRes] = await Promise.all([
        getExpirySummary(),
        getExpiryTimeline({ months: 6 }),
      ]);
      setSummary(sumRes.data);
      setTimeline(timeRes.data?.timeline || []);
    } catch (err) {
      console.error('Failed to load expiry metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load paginated inventory items
  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const res = await getExpiryItems({
        priority: priorityParam,
        status: statusParam,
        page: pageParam,
        limit: 15,
        search: searchParam,
        sort: sortParam,
        order: orderParam,
      });
      setItems(res.data?.items || []);
      setPagination(res.data?.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
    } catch (err) {
      console.error('Failed to load tracked items:', err);
    } finally {
      setItemsLoading(false);
    }
  }, [priorityParam, statusParam, pageParam, searchParam, sortParam, orderParam]);

  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const updateFilters = (updates) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || value === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });
    if (!updates.page && updates.page !== 1) {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput, page: 1 });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Network Expiry Oversight
            </h1>
            <PriorityLegendPopover />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            System-wide shelf-life monitoring across verified and pending medicines.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            loadSummaryData();
            loadItems();
          }}
          className="text-xs self-start sm:self-center"
        >
          <RefreshCw size={13} className="mr-1.5" />
          Refresh Status
        </Button>
      </div>

      {/* Summary KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Critical Shelf-Life"
            value={summary?.counts?.critical ?? 0}
            description="≤ 30 days remaining"
            color="danger"
          />
          <StatCard
            title="High Priority"
            value={summary?.counts?.high ?? 0}
            description="31 to 90 days remaining"
            color="warning"
          />
          <StatCard
            title="Medium Priority"
            value={summary?.counts?.medium ?? 0}
            description="91 to 180 days remaining"
            color="info"
          />
          <StatCard
            title="Normal Priority"
            value={summary?.counts?.normal ?? 0}
            description="> 180 days remaining"
            color="success"
          />
        </div>
      )}

      {/* Timeline Chart */}
      {timeline.length > 0 && (
        <Card className="p-5 bg-white border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                6-Month Expiry Forecast Distribution
              </h3>
            </div>
            <span className="text-xs text-slate-400">Monthly breakdown</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                />
                <Bar dataKey="critical" stackId="a" fill="#f43f5e" name="Critical (≤30d)" />
                <Bar dataKey="high" stackId="a" fill="#f59e0b" name="High (31-90d)" />
                <Bar dataKey="medium" stackId="a" fill="#0ea5e9" name="Medium (91-180d)" />
                <Bar dataKey="normal" stackId="a" fill="#10b981" name="Normal (>180d)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-xs space-y-3">
        <PriorityFilterChips
          activePriority={priorityParam}
          onSelect={(pri) => updateFilters({ priority: pri, page: 1 })}
          counts={summary?.counts}
        />

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by medicine name, generic name, batch number, or donor..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <Button type="submit" size="sm" className="text-xs">
            Filter
          </Button>
        </form>
      </Card>

      {/* Items Table */}
      {itemsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-2xl w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 bg-white border border-slate-200 shadow-soft">
          <EmptyState
            icon={Calendar}
            title="No tracked medicines found"
            description="No medicines in inventory match the chosen priority or search criteria."
          />
        </Card>
      ) : (
        <Card className="bg-white border border-slate-200 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Medicine Item</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Shelf-Life Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Donor Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{item.name}</div>
                      {item.genericName && (
                        <span className="text-[11px] text-slate-400 font-normal">
                          {item.genericName}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {item.batchNumber || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>
                        {new Date(item.expiryDate).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <ExpiryCountdown daysLeft={item.daysLeft} isExpired={item.isExpired} size="sm" />
                    </td>

                    <td className="py-3 px-4">
                      <PriorityChip priority={item.effectivePriority || item.priority} size="sm" />
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {item.donor?.name || item.donor?.firstName || 'Community Donor'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 text-xs text-slate-500">
              <span>
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} medicines)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => updateFilters({ page: pagination.page - 1 })}
                  className="text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => updateFilters({ page: pagination.page + 1 })}
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
