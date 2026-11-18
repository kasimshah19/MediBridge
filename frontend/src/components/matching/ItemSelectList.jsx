import React from 'react';
import { Package, CheckSquare, Square } from 'lucide-react';
import ExpiryCountdown from '../common/ExpiryCountdown';

export default function ItemSelectList({
  items = [],
  selectedIds = [],
  onChange,
  disabled = false,
  className = '',
}) {
  const allSelected = items.length > 0 && items.every((i) => selectedIds.includes(i._id));

  const toggleItem = (id) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (disabled) return;
    if (allSelected) {
      onChange([]);
    } else {
      onChange(items.map((i) => i._id));
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Available Items ({selectedIds.length}/{items.length} selected)
        </span>
        {items.length > 1 && !disabled && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-teal-600 hover:text-teal-700 transition"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item._id);

          return (
            <div
              key={item._id}
              onClick={() => toggleItem(item._id)}
              className={`flex items-start gap-3 p-3 rounded-lg border transition cursor-pointer select-none ${
                isSelected
                  ? 'border-teal-500 bg-teal-50/40 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="mt-0.5 text-teal-600 flex-shrink-0">
                {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{item.name}</h4>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {item.quantity} {item.unit || 'units'}
                  </span>
                </div>

                {item.genericName && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.genericName}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                  <span>Batch: <code className="font-mono text-slate-700">{item.batchNumber}</code></span>
                  <span>•</span>
                  <ExpiryCountdown expiryDate={item.expiryDate} size="xs" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
