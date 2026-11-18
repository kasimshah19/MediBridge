import React from 'react';

const RADII = [5, 10, 20];

export default function RadiusSelector({ value = 10, onChange, disabled = false, className = '' }) {
  return (
    <div className={`inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2.5 select-none">
        Radius
      </span>
      <div className="flex space-x-1">
        {RADII.map((r) => {
          const isActive = value === r;
          return (
            <button
              key={r}
              type="button"
              disabled={disabled}
              onClick={() => onChange && onChange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                isActive
                  ? 'bg-white text-primary-700 shadow-sm border border-slate-200/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {r} km
            </button>
          );
        })}
      </div>
    </div>
  );
}
