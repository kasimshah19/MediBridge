import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import {
  Package,
  Clock,
  MapPin,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Eye,
  Camera,
  RotateCcw,
  ShieldAlert,
  HelpCircle,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import Lightbox from '../../components/ui/Lightbox';
import { getDonationById, cancelDonation, getItemPhotoBlob } from '../../api/donation.api';
import '../../utils/leafletSetup';
import { OSM_ATTRIBUTION } from '../../utils/leafletSetup';

export default function DonationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoBlobMap, setPhotoBlobMap] = useState({});

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Lightbox preview state
  const [lightboxState, setLightboxState] = useState({ isOpen: false, src: '', title: '' });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await getDonationById(id);
      const don = res.data;
      setDonation(don);

      // Fetch blobs for all photos across items
      don?.items?.forEach((item) => {
        item.photos?.forEach((photo) => {
          getItemPhotoBlob(don._id, item._id, photo._id)
            .then((blobUrl) => {
              setPhotoBlobMap((prev) => ({ ...prev, [photo._id]: blobUrl }));
            })
            .catch(() => {});
        });
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load donation details.');
      navigate('/donor/donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleCancel = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      toast.error('Please enter a cancellation reason (minimum 5 characters).');
      return;
    }

    try {
      setCancelling(true);
      await cancelDonation(donation._id, cancelReason.trim());
      toast.success('Donation cancelled successfully.');
      setCancelModalOpen(false);
      fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel donation.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <Spinner size="lg" />
        <p className="text-xs text-text-muted mt-2 font-medium">Loading donation details...</p>
      </div>
    );
  }

  if (!donation) return null;

  const cancellableStatuses = ['submitted', 'under_verification', 'more_info_required'];
  const canCancel = cancellableStatuses.includes(donation.status);

  const coordinates = donation.location?.coordinates || [72.8777, 19.076];
  const position = [coordinates[1], coordinates[0]]; // [lat, lng]

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/donor/donations"
            className="text-xs text-text-muted hover:text-teal-700 transition-colors flex items-center gap-1 mb-1.5"
          >
            <ArrowLeft size={13} />
            <span>Back to My Donations</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-extrabold text-text-heading font-mono">
              {donation.donationCode || 'DRAFT DONATION'}
            </h1>
            <StatusBadge status={donation.status} />
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Submitted on{' '}
            {donation.submittedAt
              ? new Date(donation.submittedAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : new Date(donation.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {donation.status === 'draft' && (
            <Link to={`/donor/donate/${donation._id}`}>
              <Button variant="primary" size="sm" className="text-xs font-bold">
                Continue Editing Draft
              </Button>
            </Link>
          )}

          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Ban size={13} className="mr-1" />
              <span>Cancel Donation</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Details + Items vs. Status Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Items list & Pickup */}
        <div className="lg:col-span-8 space-y-6">
          {/* Medicines List */}
          <Card className="p-6 bg-white border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package size={17} className="text-teal-700" />
                <h3 className="text-sm font-heading font-bold text-text-heading">
                  Donated Medicines ({donation.items?.length || 0})
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              {donation.items?.map((item, idx) => {
                const isPassed = item.screening?.status === 'passed';
                const isRejected = item.screening?.status === 'rejected';

                return (
                  <div
                    key={item._id || idx}
                    className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3 text-xs"
                  >
                    {/* Header item */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-text-heading">{item.name}</span>
                          {item.medicineId && (
                            <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded-full">
                              {item.medicineId}
                            </span>
                          )}
                        </div>
                        {item.genericName && (
                          <p className="text-[11px] text-text-muted italic">{item.genericName}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.priority && <StatusBadge status={item.priority} size="xs" />}
                        <StatusBadge status={item.status} size="xs" />
                      </div>
                    </div>

                    {/* Metadata chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-text-muted">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Batch No.
                        </span>
                        <span className="font-mono font-bold text-slate-700">{item.batchNumber}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Expiration
                        </span>
                        <span className="font-medium text-slate-700">
                          {new Date(item.expiryDate).toLocaleDateString('en-IN', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Quantity
                        </span>
                        <span className="font-medium text-slate-700">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Condition
                        </span>
                        <span className="capitalize font-medium text-slate-700">
                          {item.packagingCondition?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Screening Results if present */}
                    {item.screening?.status && item.screening.status !== 'not_checked' && (
                      <div
                        className={`p-3 rounded-xl border text-[11px] ${
                          isPassed
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50/70 border-rose-200 text-rose-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          {isPassed ? (
                            <>
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Automated Screening Passed</span>
                            </>
                          ) : (
                            <>
                              <AlertOctagon size={13} className="text-rose-600" />
                              <span>Automated Screening Not Passed</span>
                            </>
                          )}
                        </div>

                        {isRejected && item.screening.reasons && (
                          <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                            {item.screening.reasons.map((r, rIdx) => (
                              <li key={rIdx}>{r.message}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Photos Gallery */}
                    {item.photos && item.photos.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                          <Camera size={11} />
                          <span>Verification Photographs ({item.photos.length})</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {item.photos.map((p) => {
                            const blobUrl = photoBlobMap[p._id];
                            return (
                              <div
                                key={p._id}
                                onClick={() =>
                                  blobUrl &&
                                  setLightboxState({
                                    isOpen: true,
                                    src: blobUrl,
                                    title: `${item.name} (${p.originalName})`,
                                  })
                                }
                                className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center shadow-xs"
                              >
                                {blobUrl ? (
                                  <img
                                    src={blobUrl}
                                    alt={p.originalName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Spinner size="xs" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Pickup Address & Leaflet Map */}
          <Card className="p-6 bg-white border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <MapPin size={17} className="text-teal-700" />
              <h3 className="text-sm font-heading font-bold text-text-heading">
                Pickup Location Details
              </h3>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-semibold text-text-heading">
                {donation.pickupAddress?.line1}
              </p>
              <p className="text-text-muted">
                {donation.pickupAddress?.city}, {donation.pickupAddress?.state} - {donation.pickupAddress?.pincode}
              </p>
              <p className="text-text-muted pt-1">
                Contact: <strong className="text-text-heading">{donation.contactPhone}</strong>
                {donation.preferredTimeSlot && (
                  <span> • Preferred Time: {donation.preferredTimeSlot}</span>
                )}
              </p>
              {donation.notes && (
                <p className="text-text-muted italic pt-1">Notes: "{donation.notes}"</p>
              )}
            </div>

            {/* Static Leaflet Map Preview */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 h-52">
              <MapContainer
                center={position}
                zoom={14}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer attribution={OSM_ATTRIBUTION} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={position} />
              </MapContainer>
            </div>
          </Card>
        </div>

        {/* Right Column (4 cols): Real Status History Timeline */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 bg-white border border-slate-200 shadow-soft">
            <h3 className="text-sm font-heading font-bold text-text-heading pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-teal-700" />
              <span>Status History Timeline</span>
            </h3>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {donation.statusHistory?.map((entry, idx) => (
                <div key={idx} className="relative pl-7 text-xs">
                  <span className="absolute left-1.5 top-1 -translate-x-1/2 w-3 h-3 rounded-full bg-teal-600 border-2 border-white shadow-xs" />
                  <p className="font-bold text-text-heading capitalize">
                    {entry.status?.replace(/_/g, ' ')}
                  </p>
                  {entry.note && (
                    <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                      {entry.note}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(entry.at).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>

            {donation.cancelReason && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <p className="font-bold">Cancellation Reason:</p>
                <p className="text-[11px] mt-0.5">{donation.cancelReason}</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Cancel Donation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Medicine Donation"
      >
        <div className="space-y-4 text-xs text-text-body">
          <p>
            Are you sure you want to cancel this donation? This action cannot be reversed, and any
            active review check will be closed.
          </p>

          <div>
            <label className="block text-xs font-semibold text-text-heading mb-1.5">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Relocated to another city, already donated locally, etc."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelling}
            >
              Keep Donation
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-rose-600 hover:bg-rose-700 font-bold"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Full-size Photo Lightbox */}
      <Lightbox
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState({ isOpen: false, src: '', title: '' })}
        src={lightboxState.src}
        title={lightboxState.title}
      />
    </div>
  );
}

