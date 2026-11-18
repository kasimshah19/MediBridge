import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Package,
  Sparkles,
  Calendar,
  Layers,
  Send,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getAvailableMedicines } from '../../api/ngo.api';
import { getMyRequirements } from '../../api/requirement.api';
import { createClaim } from '../../api/claim.api';
import NearbyMap from '../../components/matching/NearbyMap';
import RadiusSelector from '../../components/matching/RadiusSelector';
import DistanceBadge from '../../components/matching/DistanceBadge';
import MatchBadge from '../../components/matching/MatchBadge';
import ExpiryCountdown from '../../components/common/ExpiryCountdown';
import ItemSelectList from '../../components/matching/ItemSelectList';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

export default function NgoFindMedicines() {
  const { user } = useAuth();

  const [radiusKm, setRadiusKm] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);

  // Request modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [targetDonation, setTargetDonation] = useState(null);
  const [selectedMedicineIds, setSelectedMedicineIds] = useState([]);
  const [linkedReqId, setLinkedReqId] = useState('');
  const [openReqs, setOpenReqs] = useState([]);
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Fallback coordinates from organization
  const defaultCenter = {
    lat: user?.organizationId?.location?.coordinates?.[1] || 19.076,
    lng: user?.organizationId?.location?.coordinates?.[0] || 72.8777,
  };

  useEffect(() => {
    fetchAvailable();
  }, [radiusKm, search]);

  const fetchAvailable = async () => {
    setLoading(true);
    try {
      const res = await getAvailableMedicines({
        radiusKm,
        search: search.trim() || undefined,
        limit: 20,
      });
      setResults(res.data?.donations || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to search available medicines.');
    } finally {
      setLoading(false);
    }
  };

  const openRequestModal = async (donation) => {
    setTargetDonation(donation);
    setRequestMessage('');
    setLinkedReqId('');

    // Pre-select all available items in this donation
    const viable = (donation.items || []).filter(
      (m) => m.status === 'approved' && !m.reservation
    );
    setSelectedMedicineIds(viable.map((m) => m._id));
    setRequestModalOpen(true);

    try {
      const reqRes = await getMyRequirements({ status: 'open', limit: 20 });
      setOpenReqs(reqRes.data?.requirements || []);
    } catch (_err) {
      // Non-blocking
    }
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!targetDonation) return;
    if (selectedMedicineIds.length === 0) {
      toast.error('Please select at least 1 medicine to request.');
      return;
    }

    setSubmittingClaim(true);
    try {
      await createClaim({
        donationId: targetDonation._id,
        medicineIds: selectedMedicineIds,
        requirementId: linkedReqId || undefined,
        message: requestMessage.trim(),
      });
      toast.success('Medicine claim submitted! Donor will be notified.');
      setRequestModalOpen(false);
      fetchAvailable();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit claim.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  // Prepare Map markers with rounded approximate coordinates
  const mapMarkers = results.map((d) => ({
    id: d._id,
    lat: d.location?.lat,
    lng: d.location?.lng,
    title: `Donation ${d.donationCode}`,
    subtitle: `${d.city} (${d.items?.length || 0} medicines)`,
    distanceKm: d.distanceKm,
    type: 'medicine',
    actionLabel: 'Request Items',
    onAction: () => openRequestModal(d),
  }));

  const activeAvailableItems = (targetDonation?.items || []).filter(
    (m) => m.status === 'approved' && !m.reservation
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Find Available Medicines
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Discover verified, sealed medicines approved for donation within your healthcare delivery radius.
          </p>
        </div>

        <RadiusSelector value={radiusKm} onChange={setRadiusKm} />
      </div>

      {/* Search & Radius Info */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by medicine name, generic name, or therapeutic class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-end px-2">
          <MapPin className="w-3.5 h-3.5 text-teal-600" />
          <span>Radius: <strong>{radiusKm} km</strong></span>
        </div>
      </div>

      {/* Main Grid: Map & Donation Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map View */}
        <div className="lg:col-span-5 order-2 lg:order-1 sticky top-6">
          <NearbyMap
            center={defaultCenter}
            radiusKm={radiusKm}
            markers={mapMarkers}
            originLabel="Your Organization"
            height="460px"
          />
          <p className="text-[11px] text-slate-400 mt-2 px-1 text-center">
            Locations are displayed with privacy approximation (~1 km grid). Exact pickup address is disclosed upon match acceptance.
          </p>
        </div>

        {/* Results List */}
        <div className="lg:col-span-7 order-1 lg:order-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-semibold uppercase tracking-wider">
            <span>Available Donations ({total})</span>
            <span>Ranked by Matching Score</span>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Spinner size="lg" />
              <span className="text-xs">Scanning verified inventory within {radiusKm} km...</span>
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No Medicines Available in this Radius"
              description={`No approved donations found within ${radiusKm} km. Try expanding to 20 km or adjusting your search terms.`}
              action={
                radiusKm < 20 && (
                  <Button size="sm" variant="outline" onClick={() => setRadiusKm(20)}>
                    Expand to 20 km
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-4">
              {results.map((d) => (
                <div
                  key={d._id}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition space-y-3"
                >
                  {/* Donation Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {d.donationCode}
                        </span>
                        <DistanceBadge distanceKm={d.distanceKm} />
                        {d.bestMatchScore > 0 && (
                          <MatchBadge
                            score={d.bestMatchScore}
                            reasons={d.matchReasons}
                          />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Approximate Area: <strong className="text-slate-700">{d.city}</strong>
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-teal-600 hover:bg-teal-700 font-semibold"
                      onClick={() => openRequestModal(d)}
                    >
                      Request Items
                    </Button>
                  </div>

                  {/* Medicines List in this donation */}
                  <div className="divide-y divide-slate-100 bg-slate-50/60 rounded-xl p-3 border border-slate-100 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Approved Viable Medicines ({d.items?.length || 0})
                    </span>

                    {d.items?.map((item) => (
                      <div key={item._id} className="pt-2 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <h4 className="font-semibold text-slate-900 truncate">{item.name}</h4>
                          {item.genericName && (
                            <p className="text-[11px] text-slate-500 truncate">{item.genericName}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            <ExpiryCountdown expiryDate={item.expiryDate} size="xs" />
                            {item.matchScore > 0 && (
                              <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                                {item.matchScore}% Match
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-xs shrink-0">
                          {item.quantity} {item.unit || 'units'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Claim / Request Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title={targetDonation ? `Request Medicines (${targetDonation.donationCode})` : 'Request Medicines'}
      >
        <form onSubmit={handleSubmitClaim} className="space-y-4">
          <p className="text-xs text-slate-600">
            Select the medicine items you require. The donor will receive your request and can accept to unlock mutual collection coordinates.
          </p>

          {activeAvailableItems.length > 0 ? (
            <ItemSelectList
              items={activeAvailableItems}
              selectedIds={selectedMedicineIds}
              onChange={setSelectedMedicineIds}
            />
          ) : (
            <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded">
              No unreserved items available in this donation.
            </p>
          )}

          {/* Link to Open Clinic Requirement */}
          {openReqs.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Link to Clinic Requirement (Optional)
              </label>
              <select
                value={linkedReqId}
                onChange={(e) => setLinkedReqId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">-- No specific requirement (General Stock) --</option>
                {openReqs.map((req) => (
                  <option key={req._id} value={req._id}>
                    {req.medicineName} ({req.fulfilledQuantity || 0}/{req.quantityNeeded} {req.unit}) - {req.urgency}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 block mt-1">
                If selected, accepting this claim will automatically credit fulfilled quantities toward this requirement.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Message / Pickup Availability
            </label>
            <textarea
              rows={2}
              maxLength={300}
              placeholder="e.g. We can send a clinic representative to collect these items on Wednesday afternoon..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <span className="text-[10px] text-slate-400 block text-right">
              {requestMessage.length}/300 characters
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRequestModalOpen(false)}
              disabled={submittingClaim}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={submittingClaim || selectedMedicineIds.length === 0}
            >
              {submittingClaim ? 'Submitting Request...' : 'Submit Claim Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
