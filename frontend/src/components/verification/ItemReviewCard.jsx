import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  AlertTriangle,
  FileText,
  Thermometer,
  ShieldAlert,
  Camera,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { getItemPhotoBlob } from '../../api/donation.api';
import PriorityChip from '../common/PriorityChip';
import ExpiryCountdown from '../common/ExpiryCountdown';
import DecisionChip from './DecisionChip';
import Lightbox from '../ui/Lightbox';
import Button from '../ui/Button';

export default function ItemReviewCard({
  item,
  donationId,
  index = 0,
  isSelected = false,
  onSelect,
  isClaimedByMe = false,
}) {
  const [isExpanded, setIsExpanded] = useState(index === 0 || isSelected);
  const [photoUrls, setPhotoUrls] = useState({});
  const [activeLightboxSrc, setActiveLightboxSrc] = useState(null);

  // Fetch photos on mount/when item.photos changes
  useEffect(() => {
    let active = true;
    const urlsToRevoke = [];

    if (item?.photos?.length && donationId) {
      item.photos.forEach(async (photo) => {
        try {
          const url = await getItemPhotoBlob(donationId, item._id, photo._id);
          if (active && url) {
            urlsToRevoke.push(url);
            setPhotoUrls((prev) => ({ ...prev, [photo._id]: url }));
          }
        } catch (err) {
          console.error('Failed to load item photo blob:', err);
        }
      });
    }

    return () => {
      active = false;
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [donationId, item._id, item?.photos]);

  useEffect(() => {
    if (isSelected) {
      setIsExpanded(true);
    }
  }, [isSelected]);

  const isPending = item.status === 'pending';
  const hasDecided = ['approved', 'rejected', 'more_info_required'].includes(item.status);

  // Format expiry label (e.g. Nov 2026)
  const formattedExpiry = item.expiryDate
    ? new Date(item.expiryDate).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <>
      <div
        className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
          isSelected
            ? 'border-teal-500 ring-2 ring-teal-200/80 shadow-md bg-white'
            : isPending
            ? 'border-slate-200 hover:border-slate-300 bg-white shadow-sm'
            : 'border-slate-200 bg-slate-50/60'
        }`}
      >
        {/* Card Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                item.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : item.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800'
                  : item.status === 'more_info_required'
                  ? 'bg-amber-100 text-amber-800'
                  : isSelected
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              #{index + 1}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {item.name}
                </h4>
                {item.isPrescriptionOnly && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
                    Rx Only
                  </span>
                )}
                {isSelected && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    Reviewing now
                  </span>
                )}
              </div>

              {item.genericName && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Generic: <span className="text-slate-700">{item.genericName}</span>
                </p>
              )}

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 flex-wrap">
                <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                  Batch: {item.batchNumber || '—'}
                </span>
                <span>•</span>
                <span>
                  Qty: <strong>{item.quantity}</strong> {item.unit}
                </span>
                <span>•</span>
                <span className="capitalize">{item.packagingCondition}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {hasDecided ? (
              <DecisionChip decision={item.status} size="sm" />
            ) : (
              <PriorityChip priority={item.effectivePriority || item.priority} size="sm" />
            )}

            <button
              type="button"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={isExpanded ? 'Collapse item details' : 'Expand item details'}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Collapsed quick strip */}
        {!isExpanded && (
          <div className="px-4 pb-3 pt-0 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-slate-400" />
              <span>Expires {formattedExpiry}</span>
              <ExpiryCountdown daysLeft={item.daysLeft} isExpired={item.isExpired} />
            </div>

            {isPending && isClaimedByMe && !isSelected && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item);
                }}
                className="text-xs py-1 h-7 border-teal-500 text-teal-700 hover:bg-teal-50"
              >
                Review Item
              </Button>
            )}
          </div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-slate-100 space-y-5">
            {/* Expiry and Shelf-Life Row */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    Expiry: {formattedExpiry}
                  </p>
                  <p className="text-slate-500">
                    Calculated shelf life remaining from Asia/Kolkata reference
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ExpiryCountdown daysLeft={item.daysLeft} isExpired={item.isExpired} />
                <PriorityChip priority={item.effectivePriority || item.priority} />
              </div>
            </div>

            {/* Grid of Medical & Storage Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Dosage Form</span>
                <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                  {item.medicineType || 'Tablet'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Manufacturer</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                  {item.manufacturer || 'Not declared'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Units per Pack</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {item.unitsPerPack ? `${item.unitsPerPack} units` : 'Standard pack'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Packaging Condition</span>
                <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                  {item.packagingCondition?.replace(/_/g, ' ') || 'Sealed'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Declared Storage</span>
                <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                  {item.storageCondition?.replace(/_/g, ' ') || 'Room temperature'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Prescription Flag</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {item.isPrescriptionOnly ? 'Requires Rx' : 'OTC / General'}
                </span>
              </div>
            </div>

            {/* Storage History Note */}
            {item.storageHistory && (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs">
                <span className="font-semibold text-amber-900 block flex items-center gap-1.5 mb-1">
                  <Thermometer size={14} className="text-amber-700" />
                  Donor's Storage Description
                </span>
                <p className="text-amber-950/90 leading-relaxed">{item.storageHistory}</p>
              </div>
            )}

            {/* Automated Screening Check Result */}
            {item.screening && (
              <div className="text-xs">
                <span className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-teal-600" />
                  Automated Phase 3 Screening Result
                </span>
                {item.screening.status === 'passed' ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Passed all 10 automated pre-screening checks
                  </div>
                ) : (
                  <div className="space-y-1">
                    {item.screening.reasons?.map((reason, rIdx) => (
                      <div
                        key={rIdx}
                        className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs"
                      >
                        <ShieldAlert size={14} className="text-rose-600 flex-shrink-0" />
                        <span>{reason.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Photo Evidence Gallery */}
            <div className="space-y-2">
              <span className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                <Camera size={14} className="text-slate-500" />
                Physical Photo Evidence ({item.photos?.length || 0})
              </span>

              {item.photos?.length ? (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {item.photos.map((photo) => {
                    const blobUrl = photoUrls[photo._id];
                    return (
                      <div
                        key={photo._id}
                        onClick={() => blobUrl && setActiveLightboxSrc(blobUrl)}
                        className="relative group w-24 h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer shadow-sm hover:border-teal-500 transition-all"
                      >
                        {blobUrl ? (
                          <img
                            src={blobUrl}
                            alt={photo.originalName || 'Medicine photo'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Camera size={20} className="animate-pulse" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold">
                          Inspect
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No photographs uploaded for this item.</p>
              )}
            </div>

            {/* Previous Verification Rounds / Clarification History */}
            {item.previousVerifications?.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <span className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-500" />
                  Verification Rounds History
                </span>

                <div className="space-y-2">
                  {item.previousVerifications.map((v) => (
                    <div
                      key={v._id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">Round {v.round}</span>
                          <DecisionChip decision={v.decision} size="sm" />
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(v.verifiedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-slate-600">
                        Reviewer: <strong>{v.pharmacist?.firstName || 'Pharmacist'}</strong>
                        {v.pharmacist?.pharmacyName ? ` (${v.pharmacist.pharmacyName})` : ''}
                      </p>

                      {v.reason && (
                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                          {v.reasonLabel ? <strong>{v.reasonLabel}: </strong> : null}
                          {v.reason}
                        </p>
                      )}

                      {v.question && (
                        <p className="text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          <strong>Question asked:</strong> {v.question}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Donor Clarification Response if present */}
            {item.verificationState?.moreInfo?.donorResponse?.message && (
              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs space-y-1">
                <span className="font-semibold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-teal-700" />
                  Donor's Latest Clarification Response
                </span>
                <p className="text-teal-950 font-medium leading-relaxed bg-white/80 p-2.5 rounded-lg border border-teal-100">
                  "{item.verificationState.moreInfo.donorResponse.message}"
                </p>
                <span className="text-[11px] text-teal-700 block">
                  Responded on{' '}
                  {new Date(
                    item.verificationState.moreInfo.donorResponse.respondedAt
                  ).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            {/* Action button if pending and not currently selected in panel */}
            {isPending && isClaimedByMe && !isSelected && (
              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => onSelect(item)}
                  className="text-xs bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Review Item in Verification Panel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox for Zoom */}
      <Lightbox
        isOpen={Boolean(activeLightboxSrc)}
        onClose={() => setActiveLightboxSrc(null)}
        src={activeLightboxSrc}
        title={`Medicine Inspection - ${item.name}`}
      />
    </>
  );
}
