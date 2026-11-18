import { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Layers,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Search,
  Filter,
  Building2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getMatchingSummary,
  getAdminClaims,
  cancelAdminClaim,
  getAdminRequirements,
  getOrganizationsMap,
} from '../../api/admin.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import ClaimStatusBadge from '../../components/matching/ClaimStatusBadge';
import DistanceBadge from '../../components/matching/DistanceBadge';
import UrgencyChip from '../../components/matching/UrgencyChip';
import NearbyMap from '../../components/matching/NearbyMap';

const TABS = [
  { key: 'claims', label: 'Claims Registry' },
  { key: 'requirements', label: 'Clinic Requirements' },
  { key: 'map', label: 'Organizations Map' },
];

export default function AdminMatching() {
  const [activeTab, setActiveTab] = useState('claims');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Claims state
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimStatus, setClaimStatus] = useState('all');
  const [claimSearch, setClaimSearch] = useState('');
  const [claimPage, setClaimPage] = useState(1);
  const [claimPagination, setClaimPagination] = useState({ total: 0, pages: 1 });

  // Force cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Requirements state
  const [requirements, setRequirements] = useState([]);
  const [reqsLoading, setReqsLoading] = useState(false);
  const [reqSearch, setReqSearch] = useState('');
  const [reqPage, setReqPage] = useState(1);
  const [reqPagination, setReqPagination] = useState({ total: 0, pages: 1 });

  // Organizations map state
  const [mapOrgs, setMapOrgs] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'claims') {
      loadClaims();
    } else if (activeTab === 'requirements') {
      loadRequirements();
    } else if (activeTab === 'map') {
      loadMap();
    }
  }, [activeTab, claimStatus, claimSearch, claimPage, reqSearch, reqPage]);

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await getMatchingSummary();
      setSummary(res.data);
    } catch (_err) {
      toast.error('Failed to load matching summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadClaims = async () => {
    setClaimsLoading(true);
    try {
      const res = await getAdminClaims({
        status: claimStatus !== 'all' ? claimStatus : undefined,
        search: claimSearch.trim() || undefined,
        page: claimPage,
        limit: 15,
      });
      setClaims(res.data?.claims || []);
      setClaimPagination(res.data?.pagination || { total: 0, pages: 1 });
    } catch (_err) {
      toast.error('Failed to load claims.');
    } finally {
      setClaimsLoading(false);
    }
  };

  const loadRequirements = async () => {
    setReqsLoading(true);
    try {
      const res = await getAdminRequirements({
        search: reqSearch.trim() || undefined,
        page: reqPage,
        limit: 15,
      });
      setRequirements(res.data?.requirements || []);
      setReqPagination(res.data?.pagination || { total: 0, pages: 1 });
    } catch (_err) {
      toast.error('Failed to load requirements.');
    } finally {
      setReqsLoading(false);
    }
  };

  const loadMap = async () => {
    setMapLoading(true);
    try {
      const res = await getOrganizationsMap();
      setMapOrgs(res.data?.organizations || []);
    } catch (_err) {
      toast.error('Failed to load organizations map.');
    } finally {
      setMapLoading(false);
    }
  };

  const handleOpenCancel = (claim) => {
    setSelectedClaim(claim);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!selectedClaim) return;
    if (cancelReason.trim().length < 10) {
      toast.error('Cancellation reason must be at least 10 characters.');
      return;
    }

    setCancelling(true);
    try {
      await cancelAdminClaim(selectedClaim._id, cancelReason.trim());
      toast.success('Claim force-cancelled by administrator.');
      setCancelModalOpen(false);
      loadClaims();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel claim.');
    } finally {
      setCancelling(false);
    }
  };

  const mapMarkers = mapOrgs.map((org) => ({
    id: org._id,
    lat: org.location?.coordinates?.[1],
    lng: org.location?.coordinates?.[0],
    title: org.name,
    subtitle: `${org.type?.replace('_', ' ')} • ${org.city}, ${org.state}`,
    type: 'org',
  }));

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Geo-Matching & Claims Control</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor matching demand, investigate active claims, force-cancel disputed transactions, and view verified coverage.
        </p>
      </div>

      {/* Summary StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Claims
          </span>
          <p className="text-xl font-extrabold text-slate-900 font-mono mt-1">
            {summaryLoading ? '...' : summary?.totalClaims || 0}
          </p>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Pending Claims
          </span>
          <p className="text-xl font-extrabold text-amber-600 font-mono mt-1">
            {summaryLoading ? '...' : summary?.pendingClaims || 0}
          </p>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Accepted Matches
          </span>
          <p className="text-xl font-extrabold text-emerald-600 font-mono mt-1">
            {summaryLoading ? '...' : summary?.acceptedClaims || 0}
          </p>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Awaiting Match
          </span>
          <p className="text-xl font-extrabold text-teal-600 font-mono mt-1">
            {summaryLoading ? '...' : summary?.donationsAwaitingMatch || 0}
          </p>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Open Demands
          </span>
          <p className="text-xl font-extrabold text-blue-600 font-mono mt-1">
            {summaryLoading ? '...' : summary?.openRequirements || 0}
          </p>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Avg Distance
          </span>
          <p className="text-xl font-extrabold text-slate-800 font-mono mt-1">
            {summaryLoading ? '...' : `${summary?.avgDistanceKm || 0} km`}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === t.key
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Claims Registry */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={claimStatus}
                onChange={(e) => {
                  setClaimStatus(e.target.value);
                  setClaimPage(1);
                }}
                className="text-xs border border-slate-200 rounded-lg p-1.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="superseded">Superseded</option>
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search claim code (e.g. CLM-2026)..."
                value={claimSearch}
                onChange={(e) => {
                  setClaimSearch(e.target.value);
                  setClaimPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {claimsLoading ? (
            <div className="py-20 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : claims.length === 0 ? (
            <EmptyState
              icon={HeartHandshake}
              title="No Claims Found"
              description="No claims matching the active filters were found in the registry."
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Claim Code</th>
                      <th className="py-3 px-4">Organization (NGO)</th>
                      <th className="py-3 px-4">Donor</th>
                      <th className="py-3 px-4">Distance</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claims.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {c.claimCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {c.organizationId?.name || 'N/A'}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {c.organizationId?.city}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {c.donorId?.name || 'Donor'}
                          <span className="text-[10px] text-slate-400 block">
                            {c.donorId?.city}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <DistanceBadge distanceKm={c.distanceKm} />
                        </td>
                        <td className="py-3 px-4">
                          <ClaimStatusBadge status={c.status} size="xs" />
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString('en-IN', {
                            dateStyle: 'medium',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {['pending', 'accepted'].includes(c.status) && (
                            <Button
                              size="xs"
                              variant="outline"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              onClick={() => handleOpenCancel(c)}
                            >
                              Force Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Clinic Requirements */}
      {activeTab === 'requirements' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search medicine name..."
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          {reqsLoading ? (
            <div className="py-20 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : requirements.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No Requirements Registered"
              description="No clinic requirements found."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requirements.map((req) => (
                <div key={req._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm truncate">{req.medicineName}</h4>
                      <p className="text-xs text-slate-500">{req.organizationId?.name} ({req.organizationId?.city})</p>
                    </div>
                    <UrgencyChip urgency={req.urgency} size="xs" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span>Needed: <strong>{req.quantityNeeded} {req.unit}</strong></span>
                    <span className="capitalize px-2 py-0.5 rounded text-[11px] bg-slate-100 font-medium">
                      Status: {req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Organizations Map */}
      {activeTab === 'map' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>Verified Healthcare Organizations Across India ({mapOrgs.length})</span>
            <span>Blue pins indicate verified charitable clinics & NGOs</span>
          </div>

          {mapLoading ? (
            <div className="py-24 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <NearbyMap
              center={{ lat: 20.5937, lng: 78.9629 }}
              radiusKm={0}
              markers={mapMarkers}
              originLabel="Geographic Center"
              height="550px"
            />
          )}
        </div>
      )}

      {/* Force Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Admin Force Cancel Claim"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p>
              Administrative force-cancellation is logged in the permanent audit trail. Any reserved medicines will be released immediately.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason for Force Cancellation *
            </label>
            <textarea
              rows={3}
              required
              minLength={10}
              maxLength={300}
              placeholder="e.g. Disputed handover or policy compliance violation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <span className="text-[10px] text-slate-400 block text-right">
              {cancelReason.length}/300 characters (min 10)
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelling}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 font-bold"
              disabled={cancelling || cancelReason.trim().length < 10}
            >
              {cancelling ? 'Cancelling...' : 'Force Cancel Claim'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
