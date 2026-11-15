import React from 'react';
import { Check, ShieldCheck } from 'lucide-react';

export const CHECKLIST_ITEMS = [
  {
    key: 'packagingIntact',
    title: 'Packaging Intact & Sealed',
    description: 'Blister strip or bottle is manufacturer-sealed, undamaged, and unopened.',
  },
  {
    key: 'batchReadable',
    title: 'Batch Number Legible',
    description: 'Printed batch number clearly matches photo evidence and packaging imprint.',
  },
  {
    key: 'expiryValid',
    title: 'Expiry Date Verified',
    description: 'Expiry date is genuine, readable, and meets remaining shelf-life criteria.',
  },
  {
    key: 'storageReliable',
    title: 'Storage History Reliable',
    description: 'No history of adverse exposure to high humidity, direct sunlight, or extreme heat.',
  },
  {
    key: 'authenticityEstablished',
    title: 'Authenticity & Source Established',
    description: 'Genuine pharmaceutical product with no physical indications of tampering or counterfeit.',
  },
  {
    key: 'policyEligible',
    title: 'Donation Policy Eligible',
    description: 'Not a controlled substance (Narcotic/Schedule X), non-refrigerated, and eligible for transfer.',
  },
];

export default function ChecklistToggle({ values = {}, onChange, disabled = false }) {
  const checkedCount = CHECKLIST_ITEMS.filter((item) => Boolean(values[item.key])).length;
  const allChecked = checkedCount === CHECKLIST_ITEMS.length;

  const handleToggle = (key) => {
    if (disabled || !onChange) return;
    onChange({
      ...values,
      [key]: !values[key],
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className={allChecked ? 'text-emerald-600' : 'text-teal-600'} />
          <span className="text-xs sm:text-sm font-semibold text-slate-900">
            Clinical Verification Checklist
          </span>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            allChecked
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {checkedCount} of {CHECKLIST_ITEMS.length} verified
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            allChecked ? 'bg-emerald-500' : 'bg-teal-500'
          }`}
          style={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
        />
      </div>

      {/* Toggles */}
      <div className="space-y-2 mt-2">
        {CHECKLIST_ITEMS.map((item) => {
          const isChecked = Boolean(values[item.key]);
          return (
            <label
              key={item.key}
              onClick={() => handleToggle(item.key)}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                disabled ? 'opacity-60 cursor-not-allowed' : ''
              } ${
                isChecked
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                role="switch"
                aria-checked={isChecked}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(item.key);
                }}
                className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-colors ${
                  isChecked
                    ? 'bg-emerald-600 text-white'
                    : 'border-2 border-slate-300 hover:border-teal-500 bg-white'
                }`}
              >
                {isChecked && <Check size={14} strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs sm:text-sm font-medium leading-snug ${
                    isChecked ? 'text-emerald-950 font-semibold' : 'text-slate-800'
                  }`}
                >
                  {item.title}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
