import React, { useState } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  QrCode,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';

const REJECTION_REASONS = [
  { value: 'PACKAGING_DAMAGED', label: 'Packaging damaged or unsealed' },
  { value: 'BATCH_MISMATCH', label: 'Batch number does not match label' },
  { value: 'EXPIRED_AT_RECEIPT', label: 'Medicine expired before or at handover' },
  { value: 'DETAILS_MISMATCH', label: 'Physical details mismatch declared listing' },
  { value: 'QUANTITY_MISMATCH', label: 'Quantity significantly different than expected' },
  { value: 'OTHER', label: 'Other safety or verification concern' },
];

export const ItemReceiveCard = ({
  item,
  value = {},
  onChange,
  className = '',
}) => {
  const snapshot = item.snapshot || {};
  const decision = value.decision || 'received'; // 'received' | 'rejected' | 'not_presented'
  const checklist = value.checklist || {
    packagingIntact: false,
    batchMatches: false,
    expiryMatches: false,
    quantityMatches: false,
  };
  const receivedQuantity = value.receivedQuantity ?? snapshot.quantity ?? 1;
  const reasonCode = value.reasonCode || '';
  const note = value.note || '';
  const labelVerified = value.labelVerified || false;
  const labelToken = value.labelToken || '';

  const handleDecisionChange = (newDecision) => {
    onChange({
      ...value,
      medicineId: item.medicineId,
      decision: newDecision,
    });
  };

  const handleChecklistChange = (key, checked) => {
    const updatedChecklist = { ...checklist, [key]: checked };
    onChange({
      ...value,
      medicineId: item.medicineId,
      checklist: updatedChecklist,
    });
  };

  const allChecked =
    checklist.packagingIntact &&
    checklist.batchMatches &&
    checklist.expiryMatches &&
    checklist.quantityMatches;

  return (
    <Card className={`p-5 border transition-all ${decision === 'received' ? 'border-teal-300 bg-white shadow-sm' : decision === 'rejected' ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300 bg-slate-50'} ${className}`}>
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h4 className="font-bold text-slate-800 text-base">{snapshot.name}</h4>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
              {item.medicineCode || snapshot.name}
            </span>
            <span>•</span>
            <span>Batch: <strong className="text-slate-700">{snapshot.batchNumber}</strong></span>
            <span>•</span>
            <span>
              Exp:{' '}
              <strong className="text-slate-700">
                {snapshot.expiryDate
                  ? new Date(snapshot.expiryDate).toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </strong>
            </span>
            <span>•</span>
            <span>Offered: <strong className="text-teal-700">{snapshot.quantity} {snapshot.unit}</strong></span>
          </div>
        </div>

        {/* Decision Toggle Buttons */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleDecisionChange('received')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              decision === 'received'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Receive</span>
          </button>

          <button
            type="button"
            onClick={() => handleDecisionChange('rejected')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              decision === 'rejected'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>

          <button
            type="button"
            onClick={() => handleDecisionChange('not_presented')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              decision === 'not_presented'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Not Presented</span>
          </button>
        </div>
      </div>

      {/* Decision = Received Form */}
      {decision === 'received' && (
        <div className="mt-4 space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
              4-Point Physical Verification Checklist
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.packagingIntact}
                  onChange={(e) => handleChecklistChange('packagingIntact', e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span className="text-slate-700 font-medium">1. Packaging intact & tamper-seal unbroken</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.batchMatches}
                  onChange={(e) => handleChecklistChange('batchMatches', e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span className="text-slate-700 font-medium">2. Batch number ({snapshot.batchNumber}) matches</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.expiryMatches}
                  onChange={(e) => handleChecklistChange('expiryMatches', e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span className="text-slate-700 font-medium">3. Expiry date matches label & not expired</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.quantityMatches}
                  onChange={(e) => handleChecklistChange('quantityMatches', e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span className="text-slate-700 font-medium">4. Quantity verified physically</span>
              </label>
            </div>
            {!allChecked && (
              <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                All 4 criteria must be physically verified to receive this medicine.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Received Quantity ({snapshot.unit})
              </label>
              <Input
                type="number"
                min={1}
                max={snapshot.quantity}
                value={receivedQuantity}
                onChange={(e) =>
                  onChange({
                    ...value,
                    medicineId: item.medicineId,
                    receivedQuantity: parseInt(e.target.value, 10) || '',
                  })
                }
                className="w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Package QR Security Token (Optional Scan)
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Paste or scan token from package label"
                  value={labelToken}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      medicineId: item.medicineId,
                      labelToken: e.target.value.trim(),
                    })
                  }
                  className="w-full text-sm pr-9 font-mono"
                />
                <QrCode className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision = Rejected Form */}
      {decision === 'rejected' && (
        <div className="mt-4 space-y-3 bg-rose-50/50 p-3.5 rounded-xl border border-rose-200">
          <div>
            <label className="block text-xs font-semibold text-rose-900 mb-1">
              Rejection Reason *
            </label>
            <select
              value={reasonCode}
              onChange={(e) =>
                onChange({
                  ...value,
                  medicineId: item.medicineId,
                  reasonCode: e.target.value,
                })
              }
              className="w-full text-sm rounded-lg border border-rose-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            >
              <option value="">Select a reason code...</option>
              {REJECTION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-rose-900 mb-1">
              Rejection Note / Observation
            </label>
            <Input
              type="text"
              placeholder="e.g. Seal was broken or blister pack had missing tablets"
              value={note}
              onChange={(e) =>
                onChange({
                  ...value,
                  medicineId: item.medicineId,
                  note: e.target.value,
                })
              }
              className="w-full text-sm"
            />
          </div>
        </div>
      )}

      {/* Decision = Not Presented */}
      {decision === 'not_presented' && (
        <div className="mt-3 text-xs text-slate-600 bg-slate-100 p-3 rounded-lg">
          This item will remain pending for future handover or subsequent pass presentation.
        </div>
      )}
    </Card>
  );
};

export default ItemReceiveCard;
