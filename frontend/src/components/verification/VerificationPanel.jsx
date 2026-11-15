import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import ChecklistToggle, { CHECKLIST_ITEMS } from './ChecklistToggle';
import ConfirmDialog from '../ui/ConfirmDialog';
import Button from '../ui/Button';
import { submitMedicineDecision } from '../../api/verification.api';

const REJECTION_REASONS = [
  { value: 'PACKAGING_COMPROMISED', label: 'Packaging compromised, torn, or opened' },
  { value: 'BATCH_UNVERIFIABLE', label: 'Batch number unverifiable, illegible, or mismatched' },
  { value: 'EXPIRY_INVALID_OR_UNREADABLE', label: 'Expiry date invalid, unreadable, or missing' },
  { value: 'STORAGE_UNRELIABLE', label: 'Storage history unreliable or exposed to extreme heat/moisture' },
  { value: 'SUSPECTED_COUNTERFEIT_OR_TAMPERED', label: 'Suspected counterfeit, altered, or tampered product' },
  { value: 'POLICY_INELIGIBLE', label: 'Ineligible under medicine donation policy (Schedule X/cold-chain)' },
  { value: 'OTHER', label: 'Other clinical, quality, or regulatory concern' },
];

const MORE_INFO_TYPES = [
  { value: 'clearer_batch_photo', label: 'Clearer batch photo' },
  { value: 'clearer_expiry_photo', label: 'Clearer expiry photo' },
  { value: 'packaging_photos', label: 'Full packaging photos' },
  { value: 'storage_details', label: 'Storage details' },
  { value: 'source_details', label: 'Source / pharmacy bill' },
  { value: 'other', label: 'Other clarification' },
];

export default function VerificationPanel({
  item,
  isClaimedByMe = false,
  onDecisionSuccess,
  className = '',
}) {
  const [decision, setDecision] = useState(null); // 'approved' | 'rejected' | 'more_info_requested'
  const [checklist, setChecklist] = useState({
    packagingIntact: false,
    batchReadable: false,
    expiryValid: false,
    storageReliable: false,
    authenticityEstablished: false,
    policyEligible: false,
  });

  const [reasonCode, setReasonCode] = useState('');
  const [reason, setReason] = useState('');
  const [requestedTypes, setRequestedTypes] = useState([]);
  const [question, setQuestion] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Reset form when active item changes
  useEffect(() => {
    setDecision(null);
    setChecklist({
      packagingIntact: false,
      batchReadable: false,
      expiryValid: false,
      storageReliable: false,
      authenticityEstablished: false,
      policyEligible: false,
    });
    setReasonCode('');
    setReason('');
    setRequestedTypes([]);
    setQuestion('');
    setServerError(null);
  }, [item?._id]);

  if (!item) {
    return (
      <div className="p-8 rounded-3xl border border-slate-200 bg-white text-center text-slate-500 space-y-2">
        <ShieldCheck size={32} className="mx-auto text-slate-300" />
        <p className="font-semibold text-slate-700">No Item Selected</p>
        <p className="text-xs text-slate-400">
          Select a pending medicine from the left list to record verification decisions.
        </p>
      </div>
    );
  }

  const allChecksPassed = CHECKLIST_ITEMS.every((c) => Boolean(checklist[c.key]));

  // Validation rules for submit enablement
  const canSubmitApprove = decision === 'approved' && allChecksPassed;
  const canSubmitReject =
    decision === 'rejected' &&
    Boolean(reasonCode) &&
    reason.trim().length >= 10 &&
    reason.trim().length <= 500;
  const canSubmitMoreInfo =
    decision === 'more_info_requested' &&
    requestedTypes.length > 0 &&
    question.trim().length >= 10 &&
    question.trim().length <= 500;

  const isFormValid = canSubmitApprove || canSubmitReject || canSubmitMoreInfo;

  const handleToggleRequestType = (typeVal) => {
    setRequestedTypes((prev) =>
      prev.includes(typeVal) ? prev.filter((t) => t !== typeVal) : [...prev, typeVal]
    );
  };

  const handleSubmitConfirm = async () => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        decision,
        checklist,
        reasonCode: decision === 'rejected' ? reasonCode : null,
        reason: decision === 'rejected' ? reason.trim() : null,
        requestedTypes: decision === 'more_info_requested' ? requestedTypes : [],
        question: decision === 'more_info_requested' ? question.trim() : null,
      };

      const res = await submitMedicineDecision(item._id, payload);
      setShowConfirmModal(false);
      if (onDecisionSuccess) {
        onDecisionSuccess(res.data);
      }
    } catch (err) {
      console.error('Decision submission error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to submit decision.';
      setServerError(msg);
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5 ${className}`}
    >
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 block mb-0.5">
          Active Clinical Review
        </span>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
          {item.name}
        </h3>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Batch: {item.batchNumber || '—'} • Qty: {item.quantity} {item.unit}
        </p>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertTriangle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{serverError}</div>
        </div>
      )}

      {/* Checklist Toggles */}
      <ChecklistToggle
        values={checklist}
        onChange={setChecklist}
        disabled={!isClaimedByMe}
      />

      {/* Decision Selection: 3 Cards */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700">
          Verification Decision
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Approve Card */}
          <button
            type="button"
            disabled={!isClaimedByMe}
            onClick={() => setDecision('approved')}
            className={`p-3 rounded-xl border text-left transition-all relative ${
              decision === 'approved'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200'
                : 'bg-white border-slate-200 hover:border-slate-300'
            } ${!allChecksPassed ? 'opacity-85' : ''}`}
          >
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
              <CheckCircle2 size={16} />
              <span>Approve</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              Eligible for distribution
            </p>
            {!allChecksPassed && decision === 'approved' && (
              <span className="text-[10px] text-amber-700 font-medium block mt-1.5">
                Requires all 6 checks
              </span>
            )}
          </button>

          {/* 2. Reject Card */}
          <button
            type="button"
            disabled={!isClaimedByMe}
            onClick={() => setDecision('rejected')}
            className={`p-3 rounded-xl border text-left transition-all ${
              decision === 'rejected'
                ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-200'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
              <XCircle size={16} />
              <span>Reject</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              Clinical safety violation
            </p>
          </button>

          {/* 3. More Info Card */}
          <button
            type="button"
            disabled={!isClaimedByMe}
            onClick={() => setDecision('more_info_requested')}
            className={`p-3 rounded-xl border text-left transition-all ${
              decision === 'more_info_requested'
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
              <HelpCircle size={16} />
              <span>Clarification</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              Ask donor for details
            </p>
          </button>
        </div>
      </div>

      {/* Decision-Specific Input Fields */}
      {decision === 'rejected' && (
        <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-3 animate-fade-in text-xs">
          <div>
            <label className="block font-semibold text-rose-950 mb-1">
              Rejection Reason Code <span className="text-rose-600">*</span>
            </label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-rose-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            >
              <option value="">Select reason code...</option>
              {REJECTION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-rose-950">
                Clinical Note <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {reason.length} / 500 (min 10)
              </span>
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a clear, respectful clinical explanation of why this item cannot be accepted..."
              className="w-full p-2.5 text-xs rounded-xl border border-rose-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
            />
          </div>
        </div>
      )}

      {decision === 'more_info_requested' && (
        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-3 animate-fade-in text-xs">
          <div>
            <label className="block font-semibold text-amber-950 mb-1.5">
              Requested Information Types <span className="text-amber-600">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MORE_INFO_TYPES.map((t) => {
                const isSelectedType = requestedTypes.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleToggleRequestType(t.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      isSelectedType
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-amber-950">
                Specific Question for Donor <span className="text-amber-600">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {question.length} / 500 (min 10)
              </span>
            </div>
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Please provide a close-up photo showing the printed batch number and expiry date clearly..."
              className="w-full p-2.5 text-xs rounded-xl border border-amber-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
            />
          </div>
        </div>
      )}

      {/* Submit Action */}
      <div className="pt-2">
        <Button
          type="button"
          disabled={!isFormValid || !isClaimedByMe || isSubmitting}
          onClick={() => setShowConfirmModal(true)}
          className={`w-full py-3 text-sm font-semibold rounded-xl text-white transition-all shadow-sm ${
            decision === 'approved'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : decision === 'rejected'
              ? 'bg-rose-600 hover:bg-rose-700'
              : decision === 'more_info_requested'
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'bg-slate-400'
          }`}
        >
          {decision === 'approved' && 'Confirm Clinical Approval'}
          {decision === 'rejected' && 'Submit Rejection'}
          {decision === 'more_info_requested' && 'Send Clarification Request'}
          {!decision && 'Select Decision Above'}
        </Button>

        {!isClaimedByMe && (
          <p className="text-[11px] text-slate-400 text-center mt-2">
            You must hold an active claim on this donation to record decisions.
          </p>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSubmitConfirm}
        isLoading={isSubmitting}
        variant={
          decision === 'approved'
            ? 'success'
            : decision === 'rejected'
            ? 'danger'
            : 'warning'
        }
        title={
          decision === 'approved'
            ? `Approve ${item.name}?`
            : decision === 'rejected'
            ? `Reject ${item.name}?`
            : `Request Clarification for ${item.name}?`
        }
        description={
          decision === 'approved'
            ? `Are you sure you want to approve batch ${item.batchNumber}? It will be added to viable inventory for NGO allocation.`
            : decision === 'rejected'
            ? `Are you sure you want to reject this item? The donor will be notified with reason "${
                REJECTION_REASONS.find((r) => r.value === reasonCode)?.label || reasonCode
              }".`
            : `Send clarification inquiry to the donor? The item will be placed on hold until the donor provides the requested details.`
        }
        confirmText={
          decision === 'approved'
            ? 'Approve Item'
            : decision === 'rejected'
            ? 'Confirm Rejection'
            : 'Send Inquiry'
        }
      />
    </div>
  );
}
