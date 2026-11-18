import React from 'react';
import { Pill, Calendar, Building2, CheckCircle2 } from 'lucide-react';
import UrgencyChip from './UrgencyChip';
import Button from '../ui/Button';

export default function RequirementCard({
  requirement,
  showOrg = true,
  onAction,
  actionLabel = 'Offer Medicine',
  onEdit,
  onClose,
  isOwner = false,
  className = '',
}) {
  if (!requirement) return null;

  const isFulfilled = requirement.status === 'fulfilled';
  const isCancelled = requirement.status === 'cancelled' || requirement.status === 'expired';

  const neededByDate = requirement.neededBy
    ? new Date(requirement.neededBy).toLocaleDateString('en-IN', {
        dateStyle: 'medium',
        timeZone: 'Asia/Kolkata',
      })
    : null;

  return (
    <div
      className={`bg-white border rounded-xl p-4 shadow-xs transition hover:shadow-sm ${
        isFulfilled
          ? 'border-emerald-200 bg-emerald-50/20'
          : isCancelled
          ? 'border-slate-200 opacity-70'
          : 'border-slate-200'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 truncate">{requirement.medicineName}</h3>
            <UrgencyChip urgency={requirement.urgency} size="xs" />
          </div>
          {requirement.genericName && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{requirement.genericName}</p>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Needed</span>
          <span className="text-sm font-bold text-slate-900">
            {requirement.quantityNeeded} {requirement.unit || 'units'}
          </span>
        </div>
      </div>

      {showOrg && requirement.organizationId && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="font-medium truncate">{requirement.organizationId.name}</span>
          {requirement.organizationId.city && (
            <span className="text-slate-400">({requirement.organizationId.city})</span>
          )}
        </div>
      )}

      {requirement.description && (
        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-md mb-3 line-clamp-2">
          {requirement.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-3">
          {neededByDate && (
            <span className="inline-flex items-center gap-1 text-[11px]">
              <Calendar className="w-3 h-3 text-slate-400" />
              Needed by: {neededByDate}
            </span>
          )}
          {requirement.fulfilledQuantity > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Fulfilled: {requirement.fulfilledQuantity} / {requirement.quantityNeeded}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOwner && onEdit && !isFulfilled && !isCancelled && (
            <button
              type="button"
              onClick={() => onEdit(requirement)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
            >
              Edit
            </button>
          )}
          {isOwner && onClose && !isFulfilled && !isCancelled && (
            <button
              type="button"
              onClick={() => onClose(requirement)}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 px-2 py-1"
            >
              Close
            </button>
          )}
          {!isOwner && onAction && !isFulfilled && !isCancelled && (
            <Button size="xs" variant="primary" onClick={() => onAction(requirement)}>
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
