import React from 'react';
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

const PRIORITY_CONFIG = {
  normal: {
    label: 'Normal',
    icon: ShieldCheck,
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    description: '> 180 days shelf life',
  },
  medium: {
    label: 'Medium',
    icon: Clock,
    bg: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
    description: '91 - 180 days shelf life',
  },
  high: {
    label: 'High',
    icon: AlertCircle,
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    description: '31 - 90 days shelf life',
  },
  critical: {
    label: 'Critical',
    icon: AlertTriangle,
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    description: '≤ 30 days shelf life',
  },
  expired: {
    label: 'Expired',
    icon: XCircle,
    bg: 'bg-slate-100 text-slate-600 border-slate-300',
    dot: 'bg-slate-400',
    description: 'Past expiration date',
  },
};

export default function PriorityChip({
  priority = 'normal',
  isExpired = false,
  size = 'md',
  className = '',
  showDot = false,
}) {
  const key = isExpired ? 'expired' : (priority || 'normal').toLowerCase();
  const config = PRIORITY_CONFIG[key] || PRIORITY_CONFIG.normal;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3 py-1.5 gap-2 font-bold',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg border transition-all duration-150 ${config.bg} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title={config.description}
      role="status"
      aria-label={`Priority: ${config.label}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`}
          aria-hidden="true"
        />
      )}
      <Icon size={iconSizes[size] || 14} className="shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

