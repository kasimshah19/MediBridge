import React from 'react';
import { AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ExpiryAlertBanner Component
 * Shows urgent shelf-life warnings for medicines approaching expiration.
 */
export default function ExpiryAlertBanner({
  criticalCount = 0,
  expiringIn7Days = 0,
  expiredCount = 0,
  linkTo = '/donor/expiry?priority=critical',
  className = '',
}) {
  if (criticalCount === 0 && expiringIn7Days === 0 && expiredCount === 0) {
    return null;
  }

  const isUrgent = expiringIn7Days > 0 || criticalCount > 0;

  const bgStyle = isUrgent
    ? 'bg-rose-50 border-rose-200 text-rose-900'
    : 'bg-amber-50 border-amber-200 text-amber-900';

  const iconColor = isUrgent ? 'text-rose-600' : 'text-amber-600';
  const Icon = isUrgent ? AlertTriangle : AlertCircle;

  let message = '';
  if (expiringIn7Days > 0) {
    message = `${expiringIn7Days} medicine${expiringIn7Days === 1 ? '' : 's'} expire within 7 days! Action recommended.`;
  } else if (criticalCount > 0) {
    message = `${criticalCount} medicine${criticalCount === 1 ? '' : 's'} expire within 30 days.`;
  } else if (expiredCount > 0) {
    message = `${expiredCount} medicine${expiredCount === 1 ? '' : 's'} reached expiration and must be safely retired.`;
  }

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${bgStyle} ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-white/80 border border-current/10 shrink-0 ${iconColor}`}>
          <Icon size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold leading-tight">Attention: Shelf-Life Alert</h4>
          <p className="text-xs opacity-90 mt-0.5">{message}</p>
        </div>
      </div>

      {linkTo && (
        <Link
          to={linkTo}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-current/20 shadow-xs hover:bg-white/80 transition-all shrink-0 self-end sm:self-center"
        >
          <span>View Urgent Items</span>
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

