import React from 'react';
import { Sparkles } from 'lucide-react';

export default function MatchBadge({ score, reasons = [], showScore = true, className = '' }) {
  if (score === undefined || score === null) return null;

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = 'Match';

  if (score >= 80) {
    colorClasses = 'bg-teal-50 text-teal-800 border-teal-200/80';
    label = 'Strong Match';
  } else if (score >= 60) {
    colorClasses = 'bg-blue-50 text-blue-800 border-blue-200/80';
    label = 'Good Match';
  } else if (score >= 40) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/80';
    label = 'Moderate Match';
  } else {
    colorClasses = 'bg-slate-50 text-slate-700 border-slate-200';
    label = 'Nearby Match';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-xs ${colorClasses} ${className}`}
      title={reasons.length > 0 ? reasons.join(' • ') : undefined}
    >
      <Sparkles className="w-3 h-3 flex-shrink-0" />
      <span>{label}</span>
      {showScore && <span className="font-semibold text-[11px] opacity-90">({score}%)</span>}
    </span>
  );
}
