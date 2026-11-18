import { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Search,
  Filter,
  Send,
  Sparkles,
  Phone,
  Mail,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getNearbyOrganizations } from '../../api/geo.api';
import { getMyDonations } from '../../api/donation.api';
import { createClaim } from '../../api/claim.api';
import NearbyMap from '../../components/matching/NearbyMap';
import RadiusSelector from '../../components/matching/RadiusSelector';
import DistanceBadge from '../../components/matching/DistanceBadge';
import ItemSelectList from '../../components/matching/ItemSelectList';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

export default function DonorNearby() {
  const { user } = useAuth();

  // Coordinates default to user location or Mumbai
  const [coords, setCoords] = useState({
    lat: user?.location?.coordinates?.[1] || 19.076,
    lng: user?.location?.coordinates?.[0] || 72.8777,
  });

  const [radiusKm, setRadiusKm] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [total, setTotal] = useState(0);

  // Offer modal state
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [targetOrg, setTargetOrg] = useState(null);
  const [approvedDonations, setApprovedDonations] = useState([]);
  const [selectedDonationId, setSelectedDonationId] = useState('');
  const [selectedMedicineIds, setSelectedMedicineIds] = useState([]);
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  useEffect(() => {
    fetchNearby();
  }, [coords.lat, coords.lng, radiusKm, search]);

  const fetchNearby = async () => {
    setLoading(true);
    try {
      const res = await getNearbyOrganizations({
        lat: coords.lat,
        lng: coords.lng,
        radiusKm,
        search: search.trim() || undefined,
        limit: 20,
      });
      setOrganizations(res.data?.organizations || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to find nearby organizations.');
    } finally {
      setLoading(false);
    }
  };

  const openOfferModal = async (org) => {
    setTargetOrg(org);
    setOfferMessage('');
    setSelectedMedicineIds([]);
    setOfferModalOpen(true);

    try {
      const res = await getMyDonations({ status: 'approved', limit: 20 });
      const available = res.data?.donations || [];
      setApprovedDonations(available);
      if (available.length > 0) {
        setSelectedDonationId(available[0]._id);
        const viableMeds = (available[0].items || []).filter(
          (m) => m.status === 'approved' && !m.reservation
        );
        setSelectedMedicineIds(viableMeds.map((m) => m._id));
      } else {
        setSelectedDonationId('');
      }
    } catch (_err) {
      toast.error('Failed to load your approved donations.');
    }
  };

  const handleDonationChange = (e) => {
    const donationId = e.target.value;
    setSelectedDonationId(donationId);
    const donation = approvedDonations.find((d) => d._id === donationId);
    if (donation) {
      const viableMeds = (donation.items || []).filter(
        (m) => m.status === 'approved' && !m.reservation
      );
      setSelectedMedicineIds(viableMeds.map((m) => m._id));
    } else {
      setSelectedMedicineIds([]);
    }
  };

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    if (!selectedDonationId) {
      toast.error('Please select an approved donation to offer.');
      return;
    }
    if (selectedMedicineIds.length === 0) {
      toast.error('Please select at least 1 medicine to offer.');
      return;
    }

    setSubmittingOffer(true);
    try {
      await createClaim({
        donationId: selectedDonationId,
        organizationId: targetOrg._id,
        medicineIds: selectedMedicineIds,
        message: offerMessage.trim(),
      });
      toast.success(`Medicine offer sent to ${targetOrg.name}! 🎉`);
      setOfferModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit offer.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const activeDonation = approvedDonations.find((d) => d._id === selectedDonationId);
  const activeAvailableItems = (activeDonation?.items || []).filter(
    (m) => m.status === 'approved' && !m.reservation
  );

  // Markers for Leaflet map
  const mapMarkers = organizations.map((org) => ({
    id: org._id,
    lat: org.location?.coordinates?.[1],
    lng: org.location?.coordinates?.[0],
    title: org.name,
    subtitle: `${org.type?.replace('_', ' ')} • ${org.city}`,
    distanceKm: org.distanceKm,
    type: 'org',
    actionLabel: 'Offer Donation',
    onAction: () => openOfferModal(org),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Nearby Healthcare Organizations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Discover verified NGOs, clinics, and charitable healthcare centers near your location.
          </p>
        </div>

        <RadiusSelector value={radiusKm} onChange={setRadiusKm} />
      </div>

      {/* Search & Location Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by organization name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-end px-2">
          <MapPin className="w-3.5 h-3.5 text-teal-600" />
          <span>Searching within <strong>{radiusKm} km</strong></span>
        </div>
      </div>

      {/* Map & Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Map */}
        <div className="lg:col-span-6 xl:col-span-5 order-2 lg:order-1 sticky top-6">
          <NearbyMap
            center={coords}
            radiusKm={radiusKm}
            markers={mapMarkers}
            originLabel="Your Location"
            height="460px"
          />
          <p className="text-[11px] text-slate-400 mt-2 px-1 text-center">
            Click pins on the map to view organization summary and directly initiate donation offers.
          </p>
        </div>

        {/* Organizations List */}
        <div className="lg:col-span-6 xl:col-span-7 order-1 lg:order-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-semibold uppercase tracking-wider">
            <span>Verified Organizations ({total})</span>
            <span>Sorted by Distance</span>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Spinner size="lg" />
              <span className="text-xs">Searching verified organizations within {radiusKm} km...</span>
            </div>
          ) : organizations.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No Organizations Found"
              description={`No verified NGOs found within ${radiusKm} km. Try increasing your search radius to 20 km.`}
              action={
                radiusKm < 20 && (
                  <Button size="sm" variant="outline" onClick={() => setRadiusKm(20)}>
                    Expand to 20 km
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {organizations.map((org) => (
                <div
                  key={org._id}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{org.name}</h3>
                        <DistanceBadge distanceKm={org.distanceKm} />
                      </div>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">
                        {org.type?.replace('_', ' ')} • {org.city}, {org.state}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-teal-600 hover:bg-teal-700 font-semibold"
                      onClick={() => openOfferModal(org)}
                    >
                      Offer Donation
                    </Button>
                  </div>

                  {org.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 my-2.5">
                      {org.description}
                    </p>
                  )}

                  {/* Services offered badges */}
                  {org.servicesOffered && org.servicesOffered.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 my-3">
                      {org.servicesOffered.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium capitalize"
                        >
                          {s.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Open Requirements Highlights */}
                  {org.openRequirements && org.openRequirements.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Active Medicine Requests ({org.openRequirementsCount || org.openRequirements.length})
                      </span>
                      <div className="space-y-1.5">
                        {org.openRequirements.slice(0, 3).map((req) => (
                          <div
                            key={req._id}
                            className="flex items-center justify-between text-xs bg-teal-50/50 border border-teal-100/70 p-2 rounded-lg"
                          >
                            <span className="font-semibold text-slate-800">{req.medicineName}</span>
                            <span className="text-[11px] text-teal-800 font-medium">
                              Needs {req.quantityNeeded} {req.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Offer Medicine Modal */}
      <Modal
        isOpen={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        title={targetOrg ? `Offer Medicine to ${targetOrg.name}` : 'Offer Donation'}
      >
        <form onSubmit={handleSubmitOffer} className="space-y-4">
          <p className="text-xs text-slate-600">
            Select one of your approved donations to offer directly to this healthcare organization.
          </p>

          {approvedDonations.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <AlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-amber-900">No Approved Donations Available</p>
              <p className="text-xs text-amber-700 mt-1">
                You do not have any verified donations in "Approved" status ready for matching.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Choose Approved Donation
                </label>
                <select
                  value={selectedDonationId}
                  onChange={handleDonationChange}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {approvedDonations.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.donationCode} - {d.pickupAddress?.city || 'Local'} ({d.items?.length || 0} items)
                    </option>
                  ))}
                </select>
              </div>

              {activeAvailableItems.length > 0 ? (
                <ItemSelectList
                  items={activeAvailableItems}
                  selectedIds={selectedMedicineIds}
                  onChange={setSelectedMedicineIds}
                />
              ) : (
                <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded">
                  No unreserved approved items in this donation.
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Optional Note for NGO
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  placeholder="e.g. Can arrange pickup on weekdays between 10 AM and 2 PM..."
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
                <span className="text-[10px] text-slate-400 block text-right">
                  {offerMessage.length}/300 characters
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOfferModalOpen(false)}
                  disabled={submittingOffer}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingOffer || selectedMedicineIds.length === 0}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {submittingOffer ? 'Sending Offer...' : 'Send Medicine Offer'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
