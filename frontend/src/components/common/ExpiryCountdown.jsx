import React from 'react';
import { Calendar, AlertCircle, Clock } from 'lucide-react';

/**
 * ExpiryCountdown Component
 * Displays server-computed expiryLabel with visual shelf-life indicator.
 */
export default function ExpiryCountdown({
  daysLeft = 0,
  expiryLabel = '',
  isExpired = false,
  maxReferenceDays = 365,
  compact = false,
  className = '',
}) {
  const isExpiresToday = !isExpired && daysLeft === 0;

  // Calculate percentage remaining (0% = expired or today, 100% = 365+ days)
  const clampedDays = Math.max(0, Math.min(daysLeft, maxReferenceDays));
  const percentRemaining = Math.round((clampedDays / maxReferenceDays) * 100);

  // Determine urgency color
  let colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let barColor = 'bg-emerald-500';

  if (isExpired) {
    colorClass = 'text-slate-600 bg-slate-100 border-slate-300';
    barColor = 'bg-slate-400';
  } else if (isExpiresToday) {
    colorClass = 'text-rose-700 bg-rose-50 border-rose-300 animate-pulse font-bold';
    barColor = 'bg-rose-500';
  } else if (daysLeft <= 30) {
    colorClass = 'text-rose-700 bg-rose-50 border-rose-200';
    barColor = 'bg-rose-500';
  } else if (daysLeft <= 90) {
    colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
    barColor = 'bg-amber-500';
  } else if (daysLeft <= 180) {
    colorClass = 'text-sky-700 bg-sky-50 border-sky-200';
    barColor = 'bg-sky-500';
  }

  const displayText = expiryLabel || (isExpired ? 'Expired' : `${daysLeft} days left`);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${colorClass} ${className}`}
        title={`Shelf life: ${displayText}`}
      >
        {isExpiresToday || daysLeft <= 30 ? (
          <AlertCircle size={12} className="shrink-0" />
        ) : (
          <Clock size={12} className="shrink-0" />
        )}
        <span>{displayText}</span>
      </span>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border font-semibold ${colorClass}`}>
        {isExpiresToday || (daysLeft <= 30 && !isExpired) ? (
          <AlertCircle size={13} className="shrink-0" />
        ) : (
          <Calendar size={13} className="shrink-0" />
        )}
        <span>{displayText}</span>
      </div>

      {!isExpired && (
        <div
          className="w-full bg-slate-100 rounded-full h-1 overflow-hidden"
          title={`${percentRemaining}% shelf life remaining`}
        >
          <div
            className={`h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      )}
    </div>
  );
}

