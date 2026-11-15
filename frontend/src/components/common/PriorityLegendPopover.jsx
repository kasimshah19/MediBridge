import React, { useState, useEffect } from 'react';
import { HelpCircle, X, ShieldCheck, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { getPublicConfig } from '../../api/public.api.js';

export default function PriorityLegendPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [thresholds, setThresholds] = useState({
    critical: 30,
    high: 90,
    medium: 180,
  });

  useEffect(() => {
    getPublicConfig()
      .then((res) => {
        if (res.data?.priorityThresholds) {
          setThresholds(res.data.priorityThresholds);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-primary-600 transition-colors cursor-pointer font-medium"
        aria-expanded={isOpen}
      >
        <HelpCircle size={14} />
        <span>Priority Rules</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <h5 className="font-bold text-slate-900">Shelf-Life Priority Tiers</h5>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="p-1 rounded-md bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                <AlertTriangle size={13} />
              </span>
              <div>
                <strong className="text-rose-700 font-semibold">Critical:</strong>
                <p className="text-slate-500 mt-0.5">
                  ≤ {thresholds.critical} calendar days left. Requires immediate verification and matching.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="p-1 rounded-md bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                <AlertCircle size={13} />
              </span>
              <div>
                <strong className="text-amber-700 font-semibold">High:</strong>
                <p className="text-slate-500 mt-0.5">
                  {thresholds.critical + 1} to {thresholds.high} calendar days left. Prioritized queue.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="p-1 rounded-md bg-sky-50 text-sky-600 border border-sky-200 shrink-0">
                <Clock size={13} />
              </span>
              <div>
                <strong className="text-sky-700 font-semibold">Medium:</strong>
                <p className="text-slate-500 mt-0.5">
                  {thresholds.high + 1} to {thresholds.medium} calendar days left. Standard queue.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="p-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                <ShieldCheck size={13} />
              </span>
              <div>
                <strong className="text-emerald-700 font-semibold">Normal:</strong>
                <p className="text-slate-500 mt-0.5">
                  &gt; {thresholds.medium} calendar days left. Ample shelf-life reserve.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            Dates calculated relative to midnight Asia/Kolkata (IST).
          </p>
        </div>
      )}
    </div>
  );
}

