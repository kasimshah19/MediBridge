import React from 'react';
import { CheckCircle2, XCircle, HelpCircle, Clock } from 'lucide-react';

const DECISION_CONFIGS = {
  approved: {
    label: 'Approved',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: XCircle,
    iconColor: 'text-rose-600',
  },
  more_info_requested: {
    label: 'Clarification Requested',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: HelpCircle,
    iconColor: 'text-amber-600',
  },
  more_info_required: {
    label: 'Clarification Needed',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: HelpCircle,
    iconColor: 'text-amber-600',
  },
  pending: {
    label: 'Pending Review',
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: Clock,
    iconColor: 'text-slate-500',
  },
};

export default function DecisionChip({ decision, className = '', size = 'md' }) {
  if (!decision) return null;

  const key = decision.toLowerCase();
  const config = DECISION_CONFIGS[key] || {
    label: decision.replace(/_/g, ' '),
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: Clock,
    iconColor: 'text-slate-500',
  };

  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${config.bg} ${
        isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm'
      } ${className}`}
    >
      <Icon size={isSm ? 12 : 14} className={`flex-shrink-0 ${config.iconColor}`} />
      <span>{config.label}</span>
    </span>
  );
}
