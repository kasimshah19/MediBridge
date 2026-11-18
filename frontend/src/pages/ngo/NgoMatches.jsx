import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  HeartHandshake,
  Inbox,
  Send,
  CheckCircle2,
  Archive,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  getMyClaims,
  acceptClaim,
  declineClaim,
  withdrawClaim,
  cancelClaim,
} from '../../api/claim.api';
import ClaimCard from '../../components/matching/ClaimCard';
import HandoverDetailsDrawer from '../../components/matching/HandoverDetailsDrawer';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const TABS = [
  { key: 'incoming', label: 'Incoming Offers', icon: Inbox },
  { key: 'outgoing', label: 'Sent Requests', icon: Send },
  { key: 'accepted', label: 'Accepted Matches', icon: CheckCircle2 },
  { key: 'closed', label: 'Past / Closed', icon: Archive },
];

export default function NgoMatches() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'incoming';

  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Handover drawer state
  const [handoverClaimId, setHandoverClaimId] = useState(null);
  const [handoverDrawerOpen, setHandoverDrawerOpen] = useState(false);

  // Accept modal state
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [acceptNote, setAcceptNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Decline modal state
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchClaims();
  }, [currentTab, pagination.page]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await getMyClaims({
        tab: currentTab,
        page: pagination.page,
        limit: 10,
      });
      setClaims(res.data?.claims || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load claims.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Accept Flow
  const handleOpenAccept = (claim) => {
    setSelectedClaim(claim);
    setAcceptNote('');
    setAcceptModalOpen(true);
  };

  const handleConfirmAccept = async (e) => {
    e.preventDefault();
    if (!selectedClaim) return;
    setSubmittingAction(true);
    try {
      await acceptClaim(selectedClaim._id, { note: acceptNote.trim() });
      toast.success('Offer accepted! Handover coordinates unlocked.');
      setAcceptModalOpen(false);
      fetchClaims();
      setHandoverClaimId(selectedClaim._id);
      setHandoverDrawerOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept claim.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Decline Flow
  const handleOpenDecline = (claim) => {
    setSelectedClaim(claim);
    setDeclineReason('');
    setDeclineModalOpen(true);
  };

  const handleConfirmDecline = async (e) => {
    e.preventDefault();
    if (!selectedClaim) return;
    if (declineReason.trim().length < 5) {
      toast.error('Decline reason must be at least 5 characters.');
      return;
    }
    setSubmittingAction(true);
    try {
      await declineClaim(selectedClaim._id, { reason: declineReason.trim() });
      toast.success('Offer declined.');
      setDeclineModalOpen(false);
      fetchClaims();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline claim.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Withdraw Flow
  const handleWithdraw = async (claim) => {
    if (!window.confirm(`Withdraw request ${claim.claimCode}?`)) return;
    try {
      await withdrawClaim(claim._id);
      toast.success('Request withdrawn.');
      fetchClaims();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw claim.');
    }
  };

  // Cancel Flow
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
    setSubmittingAction(true);
    try {
      await cancelClaim(selectedClaim._id, { reason: cancelReason.trim() });
      toast.success('Claim cancelled.');
      setCancelModalOpen(false);
      fetchClaims();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel claim.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handover coordinates drawer trigger
  const handleViewHandover = (claim) => {
    setHandoverClaimId(claim._id);
    setHandoverDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Matches & Claims</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review incoming donation offers from donors and track outgoing medicine requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-4 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <span className="text-xs text-slate-400">Loading matches...</span>
        </div>
      ) : claims.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title={
            currentTab === 'incoming'
              ? 'No Incoming Donation Offers'
              : currentTab === 'outgoing'
              ? 'No Sent Medicine Requests'
              : currentTab === 'accepted'
              ? 'No Accepted Matches Yet'
              : 'No Past Matches'
          }
          description={
            currentTab === 'incoming'
              ? 'When donors directly offer verified medicines to your organization, they will appear here.'
              : currentTab === 'outgoing'
              ? 'You have not sent any medicine claim requests to donors.'
              : currentTab === 'accepted'
              ? 'Confirmed matches ready for collection and handover will appear here with full contact coordinates.'
              : 'No closed, cancelled, or expired claims found.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {claims.map((claim) => (
            <ClaimCard
              key={claim._id}
              claim={claim}
              userRole="ngo"
              userId={user?._id}
              onAccept={handleOpenAccept}
              onDecline={handleOpenDecline}
              onWithdraw={handleWithdraw}
              onCancel={handleOpenCancel}
              onViewHandover={handleViewHandover}
            />
          ))}
        </div>
      )}

      {/* Accept Modal */}
      <Modal
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        title="Accept Medicine Offer"
      >
        <form onSubmit={handleConfirmAccept} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            By accepting this offer, the medicine items will be reserved for your organization, and full mutual pickup and contact details will be unlocked.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Optional Note for Donor
            </label>
            <textarea
              rows={2}
              maxLength={300}
              placeholder="e.g. Thank you! Our volunteer will arrange collection tomorrow afternoon..."
              value={acceptNote}
              onChange={(e) => setAcceptNote(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAcceptModalOpen(false)}
              disabled={submittingAction}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={submittingAction}
            >
              {submittingAction ? 'Accepting...' : 'Confirm & Accept Offer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Decline Modal */}
      <Modal
        isOpen={declineModalOpen}
        onClose={() => setDeclineModalOpen(false)}
        title="Decline Medicine Offer"
      >
        <form onSubmit={handleConfirmDecline} className="space-y-4">
          <p className="text-xs text-slate-600">
            Please provide a brief reason for declining this offer.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason for Declining *
            </label>
            <textarea
              rows={3}
              required
              minLength={5}
              maxLength={300}
              placeholder="e.g. Sufficient inventory in clinic, or outside immediate geographic priority..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeclineModalOpen(false)}
              disabled={submittingAction}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={submittingAction || declineReason.trim().length < 5}
            >
              {submittingAction ? 'Declining...' : 'Decline Offer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Claim / Match"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <p className="text-xs text-slate-600">
            Cancelling this claim will release reserved medicine items back to inventory.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              required
              minLength={10}
              maxLength={300}
              placeholder="e.g. Transport unavailable or clinic requirements changed..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
              disabled={submittingAction}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={submittingAction || cancelReason.trim().length < 10}
            >
              {submittingAction ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Handover Details Drawer */}
      <HandoverDetailsDrawer
        isOpen={handoverDrawerOpen}
        onClose={() => setHandoverDrawerOpen(false)}
        claimId={handoverClaimId}
        userRole="ngo"
      />
    </div>
  );
}
