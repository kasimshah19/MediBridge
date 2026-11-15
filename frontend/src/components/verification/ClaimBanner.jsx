import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, UserCheck, AlertCircle, Play, RefreshCw, Lock } from 'lucide-react';
import Button from '../ui/Button';

export default function ClaimBanner({
  claim = null,
  isClaimedByMe = false,
  isReadOnly = false,
  onClaim,
  onRelease,
  loading = false,
}) {
  const [timeLeftMinutes, setTimeLeftMinutes] = useState(claim?.minutesLeft || 0);

  useEffect(() => {
    if (!claim?.claimExpiresAt) return;

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const exp = new Date(claim.claimExpiresAt).getTime();
      const diffMin = Math.max(0, Math.ceil((exp - now) / 60000));
      setTimeLeftMinutes(diffMin);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 30000);
    return () => clearInterval(interval);
  }, [claim?.claimExpiresAt]);

  // Case 1: Active Claim Held by Me
  if (claim && isClaimedByMe) {
    const isExpiringSoon = timeLeftMinutes <= 10;
    return (
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isExpiringSoon
            ? 'bg-amber-50/90 border-amber-200 text-amber-900'
            : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isExpiringSoon ? 'bg-amber-200/80 text-amber-800' : 'bg-emerald-200/80 text-emerald-800'
            }`}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm">Reserved for your review</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/80 border border-current">
                Active session
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5">
              <Clock size={12} className="text-slate-500" />
              <span>
                {timeLeftMinutes > 0
                  ? `${timeLeftMinutes} minutes remaining in verification lock`
                  : 'Claim lock expired — please extend session to proceed'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={onClaim}
            isLoading={loading}
            className="text-xs bg-white hover:bg-slate-50 border-slate-300"
          >
            <RefreshCw size={13} className="mr-1.5" />
            Extend (60m)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRelease}
            disabled={loading}
            className="text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50"
          >
            Release Lock
          </Button>
        </div>
      </div>
    );
  }

  // Case 2: Held by another pharmacist
  if (claim && !isClaimedByMe) {
    return (
      <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/90 text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-200/80 text-sky-800 flex items-center justify-center flex-shrink-0">
            <Lock size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm">
                Under active review by {claim.claimedByName || 'another pharmacist'}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/80 border border-sky-300 text-sky-700">
                Read-only mode
              </span>
            </div>
            <p className="text-xs text-sky-800/80 mt-0.5 flex items-center gap-1.5">
              <Clock size={12} />
              <span>
                {claim.minutesLeft || 0} minutes left in current claim session. If inactive, you can take over.
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Unclaimed -> Can be claimed
  return (
    <div className="p-4 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/90 to-sky-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
          <UserCheck size={18} />
        </div>
        <div>
          <p className="font-semibold text-xs sm:text-sm text-slate-900">
            Ready for Clinical Verification
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            Claim this donation to reserve exclusive review rights for 60 minutes.
          </p>
        </div>
      </div>

      <Button
        size="sm"
        onClick={onClaim}
        isLoading={loading}
        className="self-end sm:self-center text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
      >
        <Play size={13} className="mr-1.5 fill-current" />
        Start Review
      </Button>
    </div>
  );
}
