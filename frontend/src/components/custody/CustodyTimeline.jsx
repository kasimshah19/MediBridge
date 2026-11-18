import React, { useState } from 'react';
import Card from '../ui/Card';
import IntegrityBadge from '../common/IntegrityBadge';
import {
  CheckCircle,
  Clock,
  ShieldCheck,
  QrCode,
  FileText,
  User,
  Building,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Hash,
} from 'lucide-react';

const EVENT_CONFIG = {
  SUBMITTED: {
    title: 'Donation Submitted',
    color: 'border-blue-400 bg-blue-50 text-blue-700',
    icon: FileText,
  },
  AUTO_SCREENED: {
    title: 'Automated Safety Screening',
    color: 'border-indigo-400 bg-indigo-50 text-indigo-700',
    icon: ShieldCheck,
  },
  PHARMACIST_APPROVED: {
    title: 'Pharmacist Inspection Approved',
    color: 'border-teal-400 bg-teal-50 text-teal-700',
    icon: CheckCircle,
  },
  PHARMACIST_REJECTED: {
    title: 'Pharmacist Inspection Rejected',
    color: 'border-rose-400 bg-rose-50 text-rose-700',
    icon: ShieldCheck,
  },
  QR_ISSUED: {
    title: 'Digital QR Passport Issued',
    color: 'border-emerald-400 bg-emerald-50 text-emerald-700',
    icon: QrCode,
  },
  MATCH_ACCEPTED: {
    title: 'Redistribution Match Accepted',
    color: 'border-amber-400 bg-amber-50 text-amber-700',
    icon: Building,
  },
  HANDOVER_SCHEDULED: {
    title: 'Physical Handover Scheduled',
    color: 'border-purple-400 bg-purple-50 text-purple-700',
    icon: Clock,
  },
  HANDOVER_RECEIVED: {
    title: 'Physical Receipt Confirmed',
    color: 'border-emerald-500 bg-emerald-100 text-emerald-800',
    icon: CheckCircle,
  },
  HANDOVER_REJECTED_AT_RECEIPT: {
    title: 'Rejected at Physical Receipt',
    color: 'border-rose-500 bg-rose-100 text-rose-800',
    icon: ShieldCheck,
  },
  EXPIRED: {
    title: 'Shelf-Life Expired',
    color: 'border-slate-400 bg-slate-100 text-slate-700',
    icon: Clock,
  },
  DONOR_CANCELLED: {
    title: 'Donation Cancelled by Donor',
    color: 'border-slate-400 bg-slate-100 text-slate-700',
    icon: FileText,
  },
  MATCH_CANCELLED: {
    title: 'Match Cancelled',
    color: 'border-slate-400 bg-slate-100 text-slate-700',
    icon: Clock,
  },
};

export const CustodyTimeline = ({
  events = [],
  chainValid = true,
  medicineId = '',
  className = '',
}) => {
  const [expandedSeq, setExpandedSeq] = useState(null);

  const toggleExpand = (seq) => {
    setExpandedSeq(expandedSeq === seq ? null : seq);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Banner with Integrity Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">
            Immutable SHA-256 Ledger
          </span>
          <span className="text-xs text-slate-400">({events.length} event{events.length === 1 ? '' : 's'})</span>
        </div>
        <IntegrityBadge valid={chainValid} />
      </div>

      {/* Timeline Steps */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {events.map((ev, index) => {
          const cfg = EVENT_CONFIG[ev.type] || {
            title: ev.type?.replace(/_/g, ' ') || 'Custody Event',
            color: 'border-slate-300 bg-slate-50 text-slate-700',
            icon: Clock,
          };
          const Icon = cfg.icon;
          const isExpanded = expandedSeq === ev.seq;

          const dateStr = ev.at
            ? new Date(ev.at).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : 'IST';

          const prevHashShort = ev.prevHash
            ? ev.prevHash === 'GENESIS'
              ? 'GENESIS'
              : `${ev.prevHash.substring(0, 8)}...`
            : 'GENESIS';

          const hashShort = ev.hash ? `${ev.hash.substring(0, 10)}...` : 'N/A';

          return (
            <div key={ev.seq || index} className="relative group">
              {/* Timeline circle icon */}
              <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border-2 border-teal-600 flex items-center justify-center shadow-xs">
                <span className="text-[10px] font-bold text-teal-700 font-mono">
                  {ev.seq}
                </span>
              </div>

              {/* Event Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${cfg.color}`}>
                      {cfg.title}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 capitalize bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                      {ev.actorRole || ev.actorType || 'system'}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">{dateStr} IST</span>
                </div>

                {/* Cryptographic Hash Trail */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400">prev:</span>
                  <span className="text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {prevHashShort}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <span className="text-slate-400">hash:</span>
                  <span className="text-teal-700 font-bold bg-white px-1.5 py-0.5 rounded border border-teal-200">
                    {hashShort}
                  </span>
                </div>

                {/* Metadata & Toggle */}
                {ev.meta && Object.keys(ev.meta).length > 0 && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => toggleExpand(ev.seq)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium inline-flex items-center gap-1 focus:outline-none"
                    >
                      <span>{isExpanded ? 'Hide Event Details' : 'View Verified Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 text-xs bg-slate-900 text-teal-300 p-3 rounded-lg font-mono overflow-x-auto shadow-inner">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(ev.meta, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustodyTimeline;
