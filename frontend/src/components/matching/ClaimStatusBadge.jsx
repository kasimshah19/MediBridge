import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  CornerUpLeft,
  Ban,
  CalendarX,
  Layers,
} from 'lucide-react';

const STATUS_CONFIGS = {
  pending: {
    label: 'Pending Response',
    icon: Clock,
    classes: 'bg-amber-50 text-amber-800 border-amber-200/90 font-medium',
  },
  accepted: {
    label: 'Match Accepted',
    icon: CheckCircle2,
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 font-semibold',
  },
  declined: {
    label: 'Declined',
    icon: XCircle,
    classes: 'bg-rose-50 text-rose-700 border-rose-200/80',
  },
  withdrawn: {
    label: 'Withdrawn',
    icon: CornerUpLeft,
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  expired: {
    label: 'Expired',
    icon: CalendarX,
    classes: 'bg-slate-100 text-slate-500 border-slate-200',
  },
  superseded: {
    label: 'Superseded',
    icon: Layers,
    classes: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

export default function ClaimStatusBadge({ status, className = '', size = 'sm' }) {
  const norm = (status || 'pending').toLowerCase();
  const config = STATUS_CONFIGS[norm] || {
    label: norm,
    icon: Clock,
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const Icon = config.icon;
  const iconSize = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textSize = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs ${config.classes} ${textSize} ${className}`}
    >
      <Icon className={`${iconSize} flex-shrink-0`} />
      <span>{config.label}</span>
    </span>
  );
}
