import React from 'react';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

export default function UrgencyChip({ urgency = 'routine', className = '', size = 'sm' }) {
  const norm = (urgency || 'routine').toLowerCase();

  let config = {
    label: 'Routine',
    icon: CheckCircle2,
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  if (norm === 'urgent') {
    config = {
      label: 'Urgent',
      icon: AlertCircle,
      classes: 'bg-rose-50 text-rose-700 border-rose-200/80 font-semibold animate-pulse',
    };
  } else if (norm === 'soon') {
    config = {
      label: 'Needed Soon',
      icon: Clock,
      classes: 'bg-amber-50 text-amber-800 border-amber-200/80 font-medium',
    };
  }

  const Icon = config.icon;
  const iconSize = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textSize = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${config.classes} ${textSize} ${className}`}
    >
      <Icon className={`${iconSize} flex-shrink-0`} />
      <span>{config.label}</span>
    </span>
  );
}
