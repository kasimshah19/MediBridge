import React from 'react';
import {
  Layers,
  AlertTriangle,
  AlertCircle,
  Clock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

const FILTER_ITEMS = [
  { key: 'all', label: 'All Tracked', icon: Layers },
  { key: 'critical', label: 'Critical', icon: AlertTriangle, activeClass: 'bg-rose-600 text-white border-rose-600' },
  { key: 'high', label: 'High', icon: AlertCircle, activeClass: 'bg-amber-600 text-white border-amber-600' },
  { key: 'medium', label: 'Medium', icon: Clock, activeClass: 'bg-sky-600 text-white border-sky-600' },
  { key: 'normal', label: 'Normal', icon: ShieldCheck, activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { key: 'expired', label: 'Expired', icon: XCircle, activeClass: 'bg-slate-700 text-white border-slate-700' },
];

export default function PriorityFilterChips({
  selected = 'all',
  onSelect,
  counts = {},
  className = '',
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} role="tablist">
      {FILTER_ITEMS.map((item) => {
        const isSelected = selected === item.key;
        const Icon = item.icon;
        const count =
          item.key === 'all'
            ? counts.totalTracked || 0
            : item.key === 'expired'
            ? counts.expiredTotal || 0
            : counts[item.key] || 0;

        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(item.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer ${
              isSelected
                ? item.activeClass || 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-primary-300 hover:bg-slate-50'
            }`}
          >
            <Icon size={14} className="shrink-0" />
            <span>{item.label}</span>
            {count !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

