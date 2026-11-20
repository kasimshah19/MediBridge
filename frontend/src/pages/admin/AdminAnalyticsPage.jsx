import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Package,
  Pill,
  ShieldCheck,
  CheckCircle2,
  HeartHandshake,
  Truck,
  Clock,
  Users,
  Building2,
  AlertTriangle,
  Server,
  Lock,
  MapPin,
  FileSpreadsheet,
} from 'lucide-react';
import analyticsApi from '../../api/analytics.api';
import { formatNumberIndian, formatPercent, formatDateIST } from '../../utils/format';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const PRESETS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last 1 Year', days: 365 },
];

const COLORS = ['#0284c7', '#0d9488', '#eab308', '#ef4444', '#8b5cf6', '#ec4899'];
const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  normal: '#0284c7',
};

export default function AdminAnalyticsPage() {
  const [selectedPreset, setSelectedPreset] = useState(30);
  const [customRange, setCustomRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });
  const [isCustom, setIsCustom] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Analytics data states
  const [overview, setOverview] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [tsMetric, setTsMetric] = useState('donations');
  const [tsInterval, setTsInterval] = useState('day');
  const [funnel, setFunnel] = useState([]);
  const [rejections, setRejections] = useState({ autoScreening: [], pharmacist: [], receipt: [] });
  const [rejectionTab, setRejectionTab] = useState('pharmacist');
  const [expiryData, setExpiryData] = useState(null);
  const [topMedicines, setTopMedicines] = useState({ mostDonated: [], mostRequested: [] });
  const [organizations, setOrganizations] = useState([]);
  const [pharmacists, setPharmacists] = useState([]);
  const [geoData, setGeoData] = useState({ donationCities: [], mapPoints: [] });
  const [systemHealth, setSystemHealth] = useState(null);

  // Active query range
  const queryParams = useMemo(() => {
    if (isCustom) {
      return { from: customRange.from, to: customRange.to };
    }
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - selectedPreset * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return { from, to };
  }, [selectedPreset, isCustom, customRange]);

  const loadAllAnalytics = async (isRefetch = false) => {
    try {
      if (isRefetch) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [
        overviewRes,
        tsRes,
        funnelRes,
        rejectionsRes,
        expiryRes,
        topMedsRes,
        orgsRes,
        pharmaRes,
        geoRes,
        systemRes,
      ] = await Promise.all([
        analyticsApi.getOverview(queryParams),
        analyticsApi.getTimeSeries({ ...queryParams, metric: tsMetric, interval: tsInterval }),
        analyticsApi.getFunnel(queryParams),
        analyticsApi.getRejections(queryParams),
        analyticsApi.getExpiry(),
        analyticsApi.getTopMedicines(8),
        analyticsApi.getOrganizations({ ...queryParams, limit: 10 }),
        analyticsApi.getPharmacists(queryParams),
        analyticsApi.getGeo(queryParams),
        analyticsApi.getSystem(),
      ]);

      setOverview(overviewRes.data);
      setTimeSeries(tsRes.data.series || []);
      setFunnel(funnelRes.data.steps || []);
      setRejections(rejectionsRes.data);
      setExpiryData(expiryRes.data);
      setTopMedicines(topMedsRes.data);
      setOrganizations(orgsRes.data.organizations || []);
      setPharmacists(pharmaRes.data.pharmacists || []);
      setGeoData(geoRes.data);
      setSystemHealth(systemRes.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.response?.data?.message || 'Failed to load platform analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [queryParams]);

  const handleMetricOrIntervalChange = async (metric, interval) => {
    try {
      setTsMetric(metric);
      setTsInterval(interval);
      const res = await analyticsApi.getTimeSeries({
        ...queryParams,
        metric,
        interval,
      });
      setTimeSeries(res.data.series || []);
    } catch (err) {
      console.error('Failed to update time series:', err);
    }
  };

  if (loading && !overview) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const curr = overview?.current || {};
  const chg = overview?.change || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Sticky Filter Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 sticky top-16 z-30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>Platform Analytics & Impact</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time aggregate data across donations, clinical verifications, and transfers in IST
          </p>
        </div>

        {/* Range Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => {
                  setIsCustom(false);
                  setSelectedPreset(p.days);
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  !isCustom && selectedPreset === p.days
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setIsCustom(true)}
              className={`px-3 py-1.5 rounded-lg transition ${
                isCustom ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          {isCustom && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customRange.from}
                onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
                className="bg-transparent text-slate-700 outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customRange.to}
                onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
                className="bg-transparent text-slate-700 outline-none"
              />
            </div>
          )}

          <button
            onClick={() => loadAllAnalytics(true)}
            disabled={refreshing}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition disabled:opacity-50"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Bento Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Donations */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Donations</span>
            <Package className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatNumberIndian(curr.donationsSubmitted)}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            {chg.donationsSubmitted >= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{chg.donationsSubmitted}%
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {chg.donationsSubmitted}%
              </span>
            )}
            <span className="text-slate-400 text-[10px]">vs prev</span>
          </div>
        </div>

        {/* Medicines */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Medicines</span>
            <Pill className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatNumberIndian(curr.medicinesSubmitted)}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            {chg.medicinesSubmitted >= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +{chg.medicinesSubmitted}%
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" /> {chg.medicinesSubmitted}%
              </span>
            )}
            <span className="text-slate-400 text-[10px]">vs prev</span>
          </div>
        </div>

        {/* Screening Pass Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Screening Pass</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{curr.screeningPassRate}%</div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className={chg.screeningPassRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {chg.screeningPassRate >= 0 ? `+${chg.screeningPassRate}%` : `${chg.screeningPassRate}%`}
            </span>
            <span className="text-slate-400 text-[10px]">diff</span>
          </div>
        </div>

        {/* Pharmacist Approval */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Approval Rate</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{curr.pharmacistApprovalRate}%</div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className={chg.pharmacistApprovalRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {chg.pharmacistApprovalRate >= 0 ? `+${chg.pharmacistApprovalRate}%` : `${chg.pharmacistApprovalRate}%`}
            </span>
            <span className="text-slate-400 text-[10px]">diff</span>
          </div>
        </div>

        {/* Matched */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Matched</span>
            <HeartHandshake className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatNumberIndian(curr.medicinesMatched)}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className={chg.medicinesMatched >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {chg.medicinesMatched >= 0 ? `+${chg.medicinesMatched}%` : `${chg.medicinesMatched}%`}
            </span>
            <span className="text-slate-400 text-[10px]">vs prev</span>
          </div>
        </div>

        {/* Completed Handovers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Handovers</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatNumberIndian(curr.handoversCompleted)}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className={chg.handoversCompleted >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {chg.handoversCompleted >= 0 ? `+${chg.handoversCompleted}%` : `${chg.handoversCompleted}%`}
            </span>
            <span className="text-slate-400 text-[10px]">vs prev</span>
          </div>
        </div>

        {/* Verification Hours */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Avg Verification</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{curr.avgVerificationHours}h</div>
          <div className="text-xs text-slate-400 mt-1">submit to decision</div>
        </div>

        {/* Active Donors */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Active Donors</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatNumberIndian(curr.activeDonors)}
          </div>
          <div className="text-xs text-slate-400 mt-1">in period</div>
        </div>

        {/* Verified NGOs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Verified NGOs</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatNumberIndian(curr.verifiedOrganizations)}
          </div>
          <div className="text-xs text-slate-400 mt-1">total active</div>
        </div>

        {/* Wastage Prevented Units */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm col-span-2 sm:col-span-1 xl:col-span-3 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-semibold">Wastage Prevented (Units Handed Over)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatNumberIndian(curr.wastagePreventedUnits)}{' '}
            <span className="text-xs font-normal text-emerald-600">units</span>
          </div>
          <p className="text-[11px] text-emerald-800/80 mt-1">
            Confirmed physical receipt by verified charitable clinics & NGOs
          </p>
        </div>
      </div>

      {/* Row: Interactive Time Series */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Platform Activity Trends</h2>
            <p className="text-xs text-slate-500">Zero-filled timeline grouped in Asia/Kolkata timezone</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
              {[
                { id: 'donations', label: 'Donations' },
                { id: 'medicines', label: 'Medicines' },
                { id: 'verifications', label: 'Verifications' },
                { id: 'matches', label: 'Matches' },
                { id: 'handovers', label: 'Handovers' },
                { id: 'users', label: 'Users' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleMetricOrIntervalChange(m.id, tsInterval)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    tsMetric === m.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Interval Selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
              {['day', 'week', 'month'].map((inv) => (
                <button
                  key={inv}
                  onClick={() => handleMetricOrIntervalChange(tsMetric, inv)}
                  className={`px-2 py-1 rounded-lg capitalize transition ${
                    tsInterval === inv ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {inv}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {tsMetric === 'verifications' ? (
              <BarChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="approved" name="Approved" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="more_info_required" name="More Info" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="value" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMetric)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row: Funnel & Rejections Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medicine Lifecycle Funnel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Medicine Lifecycle Funnel</h2>
            <p className="text-xs text-slate-500 mb-5">Step-by-step conversion from donation to verified physical handover</p>

            <div className="space-y-3">
              {funnel.map((step, idx) => (
                <div key={step.step} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{step.label}</span>
                    <span className="text-slate-900 font-bold">
                      {formatNumberIndian(step.count)} items ({step.overallConversion}%)
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-sky-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(step.overallConversion, 2)}%` }}
                    />
                  </div>
                  {idx > 0 && (
                    <div className="text-[10px] text-slate-400 text-right">
                      {step.stepConversion}% conversion from previous stage
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            • Safe drop-offs ensure zero unusable items reach verified recipients.
          </div>
        </div>

        {/* Rejection Reason Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Safety & Rejection Analysis</h2>
              <p className="text-xs text-slate-500">Reasons categorized by clinical & physical verification gate</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
              {[
                { id: 'pharmacist', label: 'Pharmacist' },
                { id: 'autoScreening', label: 'Auto-Screen' },
                { id: 'receipt', label: 'Receipt' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setRejectionTab(t.id)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    rejectionTab === t.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {(rejections[rejectionTab] || []).length === 0 ? (
              <EmptyState title="No rejections recorded" description="Zero rejections detected for this verification gate." />
            ) : (
              (rejections[rejectionTab] || []).map((r, i) => (
                <div key={r.code || i} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{r.label}</span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.code}</div>
                  </div>
                  <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold rounded-full">
                    {r.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row: Expiry Distribution & Top Medicines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiry Risk Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Active Medicine Shelf-Life Health</h2>
          <p className="text-xs text-slate-500 mb-4">Distribution by urgency threshold and 12-month expiry forecast</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {expiryData &&
              Object.entries(expiryData.distribution).map(([pKey, count]) => (
                <div
                  key={pKey}
                  className="p-2.5 rounded-xl border border-slate-100 flex flex-col items-center text-center"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full mb-1"
                    style={{ backgroundColor: PRIORITY_COLORS[pKey] || '#94a3b8' }}
                  />
                  <span className="text-[11px] font-medium text-slate-600 capitalize">{pKey}</span>
                  <span className="text-base font-bold text-slate-900">{formatNumberIndian(count)}</span>
                </div>
              ))}
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expiryData?.timeline || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="count" name="Expiring Items" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Donated vs Requested Medicines */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Most Donated vs Most Requested</h2>
          <p className="text-xs text-slate-500 mb-4">Top medicine demands and supply patterns across listings</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">Top Donated</h3>
              <div className="space-y-2">
                {topMedicines.mostDonated.slice(0, 5).map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-800 truncate pr-2">{m.name}</span>
                    <span className="font-bold text-slate-600 shrink-0">{formatNumberIndian(m.donationsCount)} units</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-sky-700 uppercase tracking-wider mb-2">Top NGO Requirements</h3>
              <div className="space-y-2">
                {topMedicines.mostRequested.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-800 truncate pr-2">{r.name}</span>
                    <span className="font-bold text-slate-600 shrink-0">{formatNumberIndian(r.totalNeeded)} req</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verified NGO Performance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Verified Organizations Activity</h2>
          <p className="text-xs text-slate-500 mb-4">Claim turnaround, acceptance rate, and items received</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Organization</th>
                  <th className="py-2.5 px-3">City</th>
                  <th className="py-2.5 px-3">Claims</th>
                  <th className="py-2.5 px-3">Acceptance</th>
                  <th className="py-2.5 px-3">Avg Response</th>
                  <th className="py-2.5 px-3">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-slate-400">
                      No verified organizations in this period
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr key={org.organizationId} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{org.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{org.city}</td>
                      <td className="py-2.5 px-3 text-slate-700">{org.claimsReceived}</td>
                      <td className="py-2.5 px-3 font-medium text-emerald-600">{org.acceptanceRate}%</td>
                      <td className="py-2.5 px-3 text-slate-500">{org.avgResponseHours}h</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{formatNumberIndian(org.itemsReceived)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pharmacist Verification Performance (Privacy Compliant) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Pharmacist Verification Activity</h2>
          <p className="text-xs text-slate-500 mb-4">First name and pharmacy only (Zero personal contact PII)</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Pharmacist</th>
                  <th className="py-2.5 px-3">Pharmacy</th>
                  <th className="py-2.5 px-3">Decisions</th>
                  <th className="py-2.5 px-3">Approved</th>
                  <th className="py-2.5 px-3">More Info</th>
                  <th className="py-2.5 px-3">Approval Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pharmacists.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-slate-400">
                      No pharmacist verifications in this period
                    </td>
                  </tr>
                ) : (
                  pharmacists.map((ph) => (
                    <tr key={ph.pharmacistId} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{ph.firstName}</td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[120px]">{ph.pharmacyName}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{ph.decisions}</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">{ph.approvedCount}</td>
                      <td className="py-2.5 px-3 text-amber-600 font-medium">{ph.moreInfoCount}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-600">{ph.approvalRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row: Geographic Activity & Platform Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Geographic Distribution Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-1">
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            <span>Top Cities by Donation</span>
          </h2>
          <p className="text-xs text-slate-500 mb-4">Aggregated city clusters (coordinates rounded to 2 decimals)</p>

          <div className="space-y-2">
            {(geoData.donationCities || []).length === 0 ? (
              <EmptyState title="No donations yet" description="City activity will appear as donations are listed." />
            ) : (
              (geoData.donationCities || []).slice(0, 7).map((c, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-800">{c.city}</span>
                  <span className="font-bold text-sky-700">{formatNumberIndian(c.count)} donations</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Health Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            <span>Platform Infrastructure & Security Health</span>
          </h2>
          <p className="text-xs text-slate-500 mb-4">Live collection volumes, cron jobs, and authentication defense</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[11px] text-slate-500">Total Users</span>
              <div className="text-lg font-bold text-slate-900">
                {formatNumberIndian(systemHealth?.collections?.users || 0)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[11px] text-slate-500">Transfers Tracked</span>
              <div className="text-lg font-bold text-slate-900">
                {formatNumberIndian(systemHealth?.collections?.transfers || 0)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[11px] text-slate-500">Custody Hashes</span>
              <div className="text-lg font-bold text-slate-900">
                {formatNumberIndian(systemHealth?.collections?.custodyEvents || 0)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[11px] text-slate-500">Unread Notifications</span>
              <div className="text-lg font-bold text-amber-600">
                {formatNumberIndian(systemHealth?.unreadNotificationsTotal || 0)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 border border-slate-100 rounded-xl">
              <span className="font-semibold text-slate-700 block mb-1">Last Automated Expiry Job</span>
              {systemHealth?.lastExpiryJob ? (
                <div className="space-y-0.5 text-slate-600">
                  <div>
                    Status:{' '}
                    <span className="font-bold text-emerald-600 uppercase">
                      {systemHealth.lastExpiryJob.status}
                    </span>
                  </div>
                  <div>Started: {formatDateIST(systemHealth.lastExpiryJob.startedAt)}</div>
                  <div>Duration: {systemHealth.lastExpiryJob.durationMs}ms</div>
                  <div>
                    Newly Expired: {systemHealth.lastExpiryJob.stats?.newlyExpired || 0} items
                  </div>
                </div>
              ) : (
                <span className="text-slate-400">No job runs recorded yet</span>
              )}
            </div>

            <div className="p-3 border border-slate-100 rounded-xl">
              <span className="font-semibold text-slate-700 block mb-1">Security Defense (24h)</span>
              <div className="space-y-0.5 text-slate-600">
                <div>Audit Logs Logged: {formatNumberIndian(systemHealth?.security?.auditEntriesLast24h || 0)}</div>
                <div>Failed Logins (24h): {formatNumberIndian(systemHealth?.security?.failedLoginsLast24h || 0)}</div>
                <div>Suspended Accounts: {formatNumberIndian(systemHealth?.security?.suspendedUsers || 0)}</div>
                <div>Blocked Accounts: {formatNumberIndian(systemHealth?.security?.blockedUsers || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Disclaimer */}
      <div className="p-4 bg-slate-100/70 border border-slate-200/60 rounded-xl text-center text-xs text-slate-500 leading-relaxed">
        {overview?.complianceNote}
      </div>
    </div>
  );
}
