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
  AlertCircle,
  ArrowLeft,
  Ban,
  Eye,
  Camera,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  FileText,
  UploadCloud,
  Send,
  Check,
  HeartHandshake,
  Building2,
  QrCode,
  Download,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityChip from '../../components/common/PriorityChip';
import ExpiryCountdown from '../../components/common/ExpiryCountdown';
import Lightbox from '../../components/ui/Lightbox';
import HandoverDetailsDrawer from '../../components/matching/HandoverDetailsDrawer';
import QrCodeCard from '../../components/common/QrCodeCard';
import CustodyTimeline from '../../components/custody/CustodyTimeline';
import {
  getDonationById,
  cancelDonation,
  getItemPhotoBlob,
  uploadItemPhoto,
  respondToClarification,
} from '../../api/donation.api';
import { downloadLabelsPdf } from '../../api/qr.api';
import { getDonationCustody } from '../../api/custody.api';
import '../../utils/leafletSetup';
import { OSM_ATTRIBUTION } from '../../utils/leafletSetup';

function ItemClarificationForm({ donationId, item, onSubmitted }) {
  const [message, setMessage] = useState('');
  const [batchNumber, setBatchNumber] = useState(item.batchNumber || '');
  const [storageHistory, setStorageHistory] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requestedTypes = item.verification?.requestedTypes || [];
  const needsBatch = requestedTypes.includes('batch_number_correction');
  const needsStorage = requestedTypes.includes('storage_history');
  const needsPhoto = requestedTypes.some((t) => t.includes('photo'));

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      setUploadingPhotos(true);
      for (const file of files) {
        await uploadItemPhoto(donationId, item._id, file);
        toast.success(`Uploaded ${file.name}`);
      }
      onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 5) {
      toast.error('Clarification message must be at least 5 characters.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        message: message.trim(),
      };
      if (batchNumber && batchNumber.trim() && batchNumber !== item.batchNumber) {
        payload.batchNumber = batchNumber.trim().toUpperCase();
      }
      if (storageHistory && storageHistory.trim()) {
        payload.storageHistory = storageHistory.trim();
      }
      await respondToClarification(donationId, item._id, payload);
      toast.success('Clarification response sent! Item returned to review queue.');
      onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-300 space-y-3 mt-3"
    >
      <div className="flex items-center gap-2">
        <HelpCircle size={16} className="text-amber-700" />
        <h4 className="text-xs font-heading font-bold text-amber-950">
          Respond to Verifying Pharmacist
        </h4>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-amber-900 mb-1">
          Your Response / Clarification <span className="text-rose-500">*</span>
        </label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Explain the packaging condition, address the pharmacist's question, or provide details..."
          maxLength={500}
          className="w-full text-xs p-2.5 rounded-xl bg-white border border-amber-300 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
          required
        />
        <div className="flex justify-between text-[10px] text-amber-800/80 mt-0.5">
          <span>Minimum 5 characters</span>
          <span>{message.length} / 500</span>
        </div>
      </div>

      {(needsBatch || true) && (
        <div>
          <label className="block text-[11px] font-semibold text-amber-900 mb-1">
            Batch Number {needsBatch && <span className="text-amber-700 font-normal">(correction requested)</span>}
          </label>
          <input
            type="text"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="e.g. BATCH-9921"
            className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-amber-300 outline-none focus:border-amber-600 font-mono"
          />
        </div>
      )}

      {(needsStorage || true) && (
        <div>
          <label className="block text-[11px] font-semibold text-amber-900 mb-1">
            Storage Conditions History {needsStorage && <span className="text-amber-700 font-normal">(requested)</span>}
          </label>
          <input
            type="text"
            value={storageHistory}
            onChange={(e) => setStorageHistory(e.target.value)}
            placeholder="e.g. Stored in dry medicine cabinet at room temperature (< 25°C), away from sunlight."
            maxLength={300}
            className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-amber-300 outline-none focus:border-amber-600"
          />
        </div>
      )}

      {/* Upload Additional Photos */}
      <div>
        <label className="block text-[11px] font-semibold text-amber-900 mb-1">
          Upload Additional Photos {needsPhoto && <span className="text-amber-700 font-normal">(requested by pharmacist)</span>}
        </label>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 text-xs font-semibold shadow-xs">
            <UploadCloud size={14} className="text-amber-700" />
            <span>{uploadingPhotos ? 'Uploading...' : 'Choose Photos to Upload'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploadingPhotos}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <span className="text-[10px] text-amber-800/80">JPEG, PNG, WebP (max 5 MB)</span>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={submitting || uploadingPhotos || message.trim().length < 5}
          className="bg-amber-600 hover:bg-amber-700 font-bold text-xs"
        >
          {submitting ? (
            'Submitting...'
          ) : (
            <>
              <Send size={12} className="mr-1.5" />
              <span>Submit Clarification to Pharmacist</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

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

  // Handover drawer state
  const [handoverClaimId, setHandoverClaimId] = useState(null);
  const [handoverDrawerOpen, setHandoverDrawerOpen] = useState(false);

  // Lightbox preview state
  const [lightboxState, setLightboxState] = useState({ isOpen: false, src: '', title: '' });

  // Phase 7: Custody & Labels state
  const [downloadingLabels, setDownloadingLabels] = useState(false);
  const [custodyTrace, setCustodyTrace] = useState(null);
  const [loadingCustody, setLoadingCustody] = useState(false);

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

  useEffect(() => {
    if (donation?._id) {
      setLoadingCustody(true);
      getDonationCustody(donation._id)
        .then((res) => {
          if (res?.success) setCustodyTrace(res.data);
        })
        .catch(() => {})
        .finally(() => setLoadingCustody(false));
    }
  }, [donation?._id]);

  const handleDownloadLabels = async () => {
    try {
      setDownloadingLabels(true);
      const blob = await downloadLabelsPdf(donation._id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `labels-${donation.donationCode || donation._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Printable labels downloaded successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate labels PDF.');
    } finally {
      setDownloadingLabels(false);
    }
  };

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
          {['approved', 'matched', 'handed_over', 'completed'].includes(donation.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadLabels}
              disabled={downloadingLabels}
              className="text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
            >
              <Printer size={13} className="mr-1.5" />
              <span>{downloadingLabels ? 'Generating Labels...' : 'Download Labels (PDF)'}</span>
            </Button>
          )}

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
          {/* Phase 6: Matched State Banner */}
          {(donation.status === 'matched' ||
            (donation.claims && donation.claims.some((c) => c.status === 'accepted'))) && (
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700 shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">Matched with Healthcare Organization</h3>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    This donation has been matched and accepted. Mutual pickup and handover details are unlocked.
                  </p>
                </div>
              </div>
              {donation.claims?.find((c) => c.status === 'accepted') && (
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shrink-0"
                  onClick={() => {
                    const acceptedClaim = donation.claims.find((c) => c.status === 'accepted');
                    if (acceptedClaim) {
                      setHandoverClaimId(acceptedClaim._id);
                      setHandoverDrawerOpen(true);
                    }
                  }}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>View Handover Details</span>
                </Button>
              )}
            </div>
          )}

          {/* Phase 6: Approved for Matching Banner */}
          {donation.status === 'approved' && (
            <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-teal-950">Ready for Healthcare Matching</h3>
                  <p className="text-xs text-teal-800 mt-0.5 leading-relaxed">
                    All verified items in this donation are approved. You can explore nearby verified NGOs to initiate a direct donation offer.
                  </p>
                </div>
              </div>
              <Link to="/donor/nearby" className="shrink-0">
                <Button size="sm" variant="primary" className="bg-teal-600 hover:bg-teal-700 font-semibold">
                  Find Nearby NGOs
                </Button>
              </Link>
            </div>
          )}

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
                        <PriorityChip
                          priority={item.priority || item.effectivePriority}
                          isExpired={item.isExpired}
                          size="sm"
                        />
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
                          Expiration & Shelf-Life
                        </span>
                        <div className="flex flex-col gap-1 mt-0.5">
                          <span className="font-medium text-slate-700">
                            {new Date(item.expiryDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <ExpiryCountdown
                            daysLeft={item.daysLeft}
                            expiryLabel={item.expiryLabel}
                            isExpired={item.isExpired}
                            compact
                          />
                        </div>
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

                    {/* Expired state notice */}
                    {(item.isExpired || item.status === 'expired') && (
                      <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                        <AlertCircle size={14} className="text-slate-500 shrink-0" />
                        <span>This medicine reached expiration before distribution and was retired from active circulation.</span>
                      </div>
                    )}

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

                    {/* Pharmacist Verification Block */}
                    {item.verification && (
                      <div
                        className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                          item.verification.latestDecision === 'approved'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : item.verification.latestDecision === 'rejected'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                            : 'bg-amber-50/80 border-amber-300 text-amber-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 font-bold">
                            {item.verification.latestDecision === 'approved' && (
                              <>
                                <CheckCircle2 size={15} className="text-emerald-600" />
                                <span>Verified & Approved by Pharmacist</span>
                              </>
                            )}
                            {item.verification.latestDecision === 'rejected' && (
                              <>
                                <XCircle size={15} className="text-rose-600" />
                                <span>Verification Rejected: {item.verification.reasonLabel || item.verification.reasonCode}</span>
                              </>
                            )}
                            {item.verification.latestDecision === 'more_info_required' && (
                              <>
                                <HelpCircle size={15} className="text-amber-700" />
                                <span>Clarification Requested (Round {item.verification.round})</span>
                              </>
                            )}
                          </div>

                          <span className="text-[10px] font-semibold opacity-75">
                            {item.verification.pharmacist?.firstName && (
                              <span>By Pharm. {item.verification.pharmacist.firstName} • </span>
                            )}
                            {new Date(item.verification.decidedAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {item.verification.reason && (
                          <p className="text-[11px] leading-relaxed opacity-90 pl-5">
                            <strong>Notes:</strong> {item.verification.reason}
                          </p>
                        )}

                        {item.verification.latestDecision === 'more_info_required' && (
                          <div className="pl-5 space-y-2">
                            {item.verification.question && (
                              <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 text-[11px]">
                                <span className="font-bold text-amber-900 block mb-0.5">Pharmacist's Question:</span>
                                <p className="text-amber-950 font-medium">{item.verification.question}</p>
                              </div>
                            )}

                            {item.verification.requestedTypes && item.verification.requestedTypes.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] uppercase font-bold text-amber-800">Requested Items:</span>
                                {item.verification.requestedTypes.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200/70 text-amber-900 capitalize"
                                  >
                                    {t.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {item.verification.latestDecision === 'rejected' && (
                          <div className="pl-5 pt-1 space-y-2">
                            <p className="text-[11px] text-rose-800 leading-relaxed">
                              This medicine cannot be accepted for distribution under safety guidelines. We recommend safe local pharmaceutical disposal.
                            </p>
                            <Link to="/donor/donate">
                              <Button
                                variant="outline"
                                size="xs"
                                className="border-rose-300 text-rose-700 hover:bg-rose-100/50 text-[11px]"
                              >
                                Donate another medicine
                              </Button>
                            </Link>
                          </div>
                        )}

                        {item.verification.latestDecision === 'approved' && item.verification.checksPassedCount > 0 && (
                          <div className="pl-5 flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                            <ShieldCheck size={13} className="text-emerald-600" />
                            <span>{item.verification.checksPassedCount} of 6 safety points verified passed</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Clarification Response Form if item needs response */}
                    {item.status === 'more_info_required' && (
                      <ItemClarificationForm
                        donationId={donation._id}
                        item={item}
                        onSubmitted={fetchDetails}
                      />
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

          {/* Phase 7: Verified Package QR Codes & Labels */}
          {donation.items?.some(
            (it) => it.medicineId && ['approved', 'matched', 'handed_over', 'completed'].includes(it.status)
          ) && (
            <Card className="p-6 bg-white border border-teal-100 shadow-soft space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-bold text-text-heading">
                      Package QR Codes & Verification Seals
                    </h3>
                    <p className="text-xs text-text-muted">
                      Affix these cryptographic QR labels to individual medicine packages prior to physical handover.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleDownloadLabels}
                  disabled={downloadingLabels}
                  className="bg-teal-600 hover:bg-teal-700 text-xs shrink-0 font-semibold"
                >
                  <Printer size={13} className="mr-1.5" />
                  <span>{downloadingLabels ? 'Generating...' : 'Print All Labels (PDF)'}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                {donation.items
                  .filter(
                    (it) => it.medicineId && ['approved', 'matched', 'handed_over', 'completed'].includes(it.status)
                  )
                  .map((it) => (
                    <QrCodeCard key={it.medicineId || it._id} medicine={it} />
                  ))}
              </div>
            </Card>
          )}

          {/* Phase 7: Cryptographic Chain of Custody */}
          {custodyTrace?.medicines?.length > 0 && (
            <Card className="p-6 bg-white border border-slate-200 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-bold text-text-heading">
                      Immutable Chain of Custody
                    </h3>
                    <p className="text-xs text-text-muted">
                      Tamper-evident SHA-256 hash ledger verifying every event from submission to receipt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-2">
                {custodyTrace.medicines.map((med) => (
                  <div key={med.medicineId} className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {med.medicineCode || med.medicineId}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {med.events?.length || 0} Ledger Events
                      </span>
                    </div>
                    <CustodyTimeline
                      events={med.events || []}
                      chainValid={med.valid}
                      medicineId={med.medicineId}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

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

            {donation.status === 'more_info_required' && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 text-xs text-amber-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                  <span>Action Needed</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/90">
                  The verifying pharmacist has asked for clarification on one or more medicines above.
                  Please review and submit your responses to resume verification.
                </p>
              </div>
            )}

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

      {/* Handover Details Drawer */}
      <HandoverDetailsDrawer
        isOpen={handoverDrawerOpen}
        onClose={() => setHandoverDrawerOpen(false)}
        claimId={handoverClaimId}
        userRole="donor"
      />
    </div>
  );
}

