import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export const IntegrityBadge = ({ valid = true, className = '', showLabel = true }) => {
  if (valid) {
    return (
      <span
        title="Ledger verified: SHA-256 cryptographic chain intact"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        {showLabel && <span>Cryptographically Verified</span>}
      </span>
    );
  }

  return (
    <span
      title="Integrity failure: SHA-256 chain hash mismatch detected!"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
    >
      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
      {showLabel && <span>Integrity Compromised</span>}
    </span>
  );
};

export default IntegrityBadge;
