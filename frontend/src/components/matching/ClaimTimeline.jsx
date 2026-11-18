import React from 'react';
import ClaimStatusBadge from './ClaimStatusBadge';

export default function ClaimTimeline({ statusHistory = [], className = '' }) {
  if (!statusHistory || statusHistory.length === 0) return null;

  return (
    <div className={`space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 ${className}`}>
      {statusHistory.map((item, idx) => {
        const isLatest = idx === statusHistory.length - 1;
        const formattedDate = item.at
          ? new Date(item.at).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '';

        return (
          <div key={idx} className="relative flex items-start space-x-3.5 group">
            {/* Timeline bullet node */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0 border-2 transition-all ${
                isLatest
                  ? 'bg-teal-600 border-teal-200 text-white shadow-sm ring-4 ring-teal-50'
                  : 'bg-white border-slate-300 text-slate-500'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
            </div>

            {/* Content card */}
            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <ClaimStatusBadge status={item.status} size="xs" />
                <span className="text-[11px] text-slate-400 font-medium">{formattedDate}</span>
              </div>
              {item.note && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
