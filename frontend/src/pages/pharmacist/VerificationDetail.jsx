import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ClipboardList,
  Check,
} from 'lucide-react';
import {
  getVerificationDonationDetail,
  claimDonation,
  releaseDonation,
} from '../../api/verification.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import StatusBadge from '../../components/common/StatusBadge';
import ClaimBanner from '../../components/verification/ClaimBanner';
import ItemReviewCard from '../../components/verification/ItemReviewCard';
import VerificationPanel from '../../components/verification/VerificationPanel';

export default function VerificationDetail() {
  const { donationId } = useParams();
  const navigate = useNavigate();

  const [donation, setDonation] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimLoading, setClaimLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Fetch full review payload
  const fetchDetail = async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);

    try {
      const res = await getVerificationDonationDetail(donationId);
      const donData = res.data;
      setDonation(donData);

      // Select first pending item by default if none selected or current is decided
      const pendingItems = (donData.items || []).filter((i) => i.status === 'pending');
      if (pendingItems.length > 0) {
        setSelectedItem((prev) => {
          if (!prev) return pendingItems[0];
          const updated = (donData.items || []).find((i) => i._id === prev._id);
          return updated && updated.status === 'pending' ? updated : pendingItems[0];
        });
      } else {
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Failed to load donation detail for verification:', err);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to retrieve donation review payload.'
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [donationId]);

  // Handle claim
  const handleClaim = async () => {
    setClaimLoading(true);
    try {
      await claimDonation(donationId);
      setSuccessToast('Donation reserved for review (60 minutes).');
      await fetchDetail(true);
    } catch (err) {
      console.error('Claim error:', err);
      setErrorMessage(err.response?.data?.message || 'Could not claim donation.');
    } finally {
      setClaimLoading(false);
    }
  };

  // Handle release
  const handleRelease = async () => {
    setClaimLoading(true);
    try {
      await releaseDonation(donationId);
      setSuccessToast('Donation claim released.');
      await fetchDetail(true);
    } catch (err) {
      console.error('Release error:', err);
      setErrorMessage(err.response?.data?.message || 'Could not release claim.');
    } finally {
      setClaimLoading(false);
    }
  };

  // Handle successful decision from VerificationPanel
  const handleDecisionSuccess = async () => {
    setSuccessToast('Verification decision recorded.');
    await fetchDetail(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage && !donation) {
    return (
      <Card className="p-8 text-center bg-white border border-rose-200 space-y-4 max-w-lg mx-auto">
        <AlertTriangle size={36} className="mx-auto text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900">Verification Access Error</h2>
        <p className="text-xs sm:text-sm text-slate-600">{errorMessage}</p>
        <Button onClick={() => navigate('/pharmacist/verification')} className="text-xs">
          Back to Verification Queue
        </Button>
      </Card>
    );
  }

  const items = donation?.items || [];
  const pendingItems = items.filter((i) => i.status === 'pending');
  const isReviewComplete = items.length > 0 && pendingItems.length === 0;

  const approvedCount = items.filter((i) => i.status === 'approved').length;
  const rejectedCount = items.filter((i) => i.status === 'rejected').length;
  const moreInfoCount = items.filter((i) => i.status === 'more_info_required').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/pharmacist/verification"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Queue</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 tracking-tight">
              {donation.donationCode}
            </h1>
            <StatusBadge status={donation.status} size="sm" />
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
              <Clock size={12} />
              Waiting {donation.waitingHours || 0}h
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Submitted by <strong className="text-slate-700">{donation.donor?.firstName}</strong> in{' '}
            <strong className="text-slate-700">{donation.donor?.city}</strong> • {items.length} declared medicine{items.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Declarations confirmation pill */}
        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200/80 px-3 py-1.5 rounded-xl text-xs text-teal-900">
          <ShieldCheck size={16} className="text-teal-600 flex-shrink-0" />
          <span>Donor confirmed sealed packaging & non-controlled status</span>
        </div>
      </div>

      {/* Claim Management Banner */}
      <ClaimBanner
        claim={donation.claim}
        isClaimedByMe={donation.isClaimedByMe}
        isReadOnly={donation.isReadOnly}
        onClaim={handleClaim}
        onRelease={handleRelease}
        loading={claimLoading}
      />

      {/* Two Column Layout: Items on Left, VerificationPanel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Medicine Items */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>DECLARED MEDICINES ({items.length})</span>
            <span>
              {pendingItems.length > 0
                ? `${pendingItems.length} awaiting inspection`
                : 'All items reviewed'}
            </span>
          </div>

          {items.map((item, idx) => (
            <ItemReviewCard
              key={item._id}
              item={item}
              donationId={donation._id}
              index={idx}
              isSelected={selectedItem?._id === item._id}
              onSelect={(it) => setSelectedItem(it)}
              isClaimedByMe={donation.isClaimedByMe}
            />
          ))}
        </div>

        {/* Right Column: Sticky Verification Decision Panel */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          {isReviewComplete ? (
            /* Review Complete Celebratory Box */
            <div className="p-6 rounded-3xl bg-gradient-to-b from-teal-50 to-emerald-50 border border-teal-200 shadow-sm text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-sm">
                <Check size={26} strokeWidth={3} />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Clinical Review Complete
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  All items in donation <strong>{donation.donationCode}</strong> have been evaluated and recorded.
                </p>
              </div>

              {/* Outcomes breakdown */}
              <div className="grid grid-cols-3 gap-2 py-2">
                <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                  <span className="text-[11px] text-emerald-700 font-bold block">Approved</span>
                  <span className="text-lg font-extrabold text-emerald-800">{approvedCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-rose-200">
                  <span className="text-[11px] text-rose-700 font-bold block">Rejected</span>
                  <span className="text-lg font-extrabold text-rose-800">{rejectedCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-amber-200">
                  <span className="text-[11px] text-amber-700 font-bold block">Needs Info</span>
                  <span className="text-lg font-extrabold text-amber-800">{moreInfoCount}</span>
                </div>
              </div>

              <Button
                onClick={() => navigate('/pharmacist/verification')}
                className="w-full text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
              >
                Return to Verification Queue
              </Button>
            </div>
          ) : (
            /* Active Item Review Panel */
            <VerificationPanel
              item={selectedItem}
              isClaimedByMe={donation.isClaimedByMe}
              onDecisionSuccess={handleDecisionSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
