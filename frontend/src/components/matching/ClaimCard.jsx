import { useState } from 'react';
import {
  Building2,
  User,
  ArrowRight,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Ban,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import ClaimStatusBadge from './ClaimStatusBadge';
import DistanceBadge from './DistanceBadge';
import ResponseCountdown from './ResponseCountdown';
import ClaimTimeline from './ClaimTimeline';
import Button from '../ui/Button';

export default function ClaimCard({
  claim,
  userRole = 'donor', // 'donor' | 'ngo' | 'admin'
  userId = '',
  onAccept,
  onDecline,
  onWithdraw,
  onCancel,
  onViewHandover,
  className = '',
}) {
  const [showTimeline, setShowTimeline] = useState(false);

  if (!claim) return null;

  const isDonor = userRole === 'donor';
  const isNgo = userRole === 'ngo';
  const isAdmin = userRole === 'admin';

  const isPending = claim.status === 'pending';
  const isAccepted = claim.status === 'accepted';
  const isInitiator = claim.initiatedByUserId === userId || (isDonor && claim.initiatedBy === 'donor') || (isNgo && claim.initiatedBy === 'ngo');

  // Can the current user accept/decline?
  // If NGO initiated -> Donor can respond.
  // If Donor initiated -> NGO can respond.
  const canRespond = isPending && !isInitiator;

  // Counterparty display
  const counterpartyName = isDonor
    ? claim.organizationId?.name || 'Verified NGO'
    : claim.donorId?.name || 'Donor';

  const counterpartySub = isDonor
    ? `${claim.organizationId?.type?.replace('_', ' ') || 'NGO'} • ${claim.organizationId?.city || ''}`
    : `${claim.donorId?.city || 'Local area'}`;

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs transition hover:shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
            {claim.claimCode}
          </span>
          <ClaimStatusBadge status={claim.status} size="sm" />
          {claim.distanceKm !== undefined && (
            <DistanceBadge distanceKm={claim.distanceKm} />
          )}
        </div>

        {isPending && claim.expiresAt && (
          <ResponseCountdown expiresAt={claim.expiresAt} />
        )}
      </div>

      {/* Counterparty & Donation info */}
      <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
            {isDonor ? <Building2 className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-teal-600" />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{counterpartyName}</h4>
            <p className="text-xs text-slate-500 capitalize">{counterpartySub}</p>
          </div>
        </div>

        {claim.donationId && (
          <div className="text-left sm:text-right text-xs">
            <span className="text-slate-400 block text-[11px] font-medium">Donation Ref</span>
            <span className="font-mono font-semibold text-slate-700">
              {claim.donationId.donationCode || claim.donationId}
            </span>
          </div>
        )}
      </div>

      {/* Items Snapshot Preview */}
      <div className="bg-slate-50/70 border border-slate-100 rounded-lg p-3 my-2 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
          <span>Requested Medicines</span>
          <span>{claim.itemsSnapshot?.length || 0} item(s)</span>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {claim.itemsSnapshot?.map((item, idx) => (
            <div key={idx} className="py-1 flex items-center justify-between">
              <span className="font-medium text-slate-800 truncate mr-2">{item.name}</span>
              <span className="font-semibold text-slate-600 flex-shrink-0">
                {item.quantity} {item.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {claim.message && (
        <p className="text-xs text-slate-600 italic bg-amber-50/40 p-2.5 rounded-md border border-amber-100/60 my-2">
          "{claim.message}"
        </p>
      )}

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => setShowTimeline(!showTimeline)}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <span>Timeline</span>
          {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <div className="flex items-center gap-2">
          {/* Handover contact disclosure button when accepted */}
          {isAccepted && onViewHandover && (
            <Button
              size="xs"
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
              onClick={() => onViewHandover(claim)}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Handover Coordinates</span>
            </Button>
          )}

          {/* Respond actions if pending */}
          {canRespond && (
            <>
              {onDecline && (
                <Button
                  size="xs"
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => onDecline(claim)}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Decline
                </Button>
              )}
              {onAccept && (
                <Button
                  size="xs"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={() => onAccept(claim)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Accept Match
                </Button>
              )}
            </>
          )}

          {/* Withdraw if initiator */}
          {isPending && isInitiator && onWithdraw && (
            <Button
              size="xs"
              variant="outline"
              className="text-slate-600"
              onClick={() => onWithdraw(claim)}
            >
              Withdraw
            </Button>
          )}

          {/* Cancel if active */}
          {(isPending || isAccepted) && onCancel && (
            <Button
              size="xs"
              variant="ghost"
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
              onClick={() => onCancel(claim)}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Timeline Drawer/Section */}
      {showTimeline && (
        <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-3 rounded-lg">
          <h5 className="text-xs font-semibold text-slate-700 mb-3">Status Audit History</h5>
          <ClaimTimeline statusHistory={claim.statusHistory} />
        </div>
      )}
    </div>
  );
}
