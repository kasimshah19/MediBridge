import React from 'react';
import { MapPin } from 'lucide-react';

export default function DistanceBadge({ distanceKm, className = '', showIcon = true }) {
  if (distanceKm === undefined || distanceKm === null) return null;

  const formatted =
    typeof distanceKm === 'number'
      ? distanceKm < 0.1
        ? '< 100 m'
        : distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} m`
        : `${distanceKm.toFixed(1)} km`
      : `${distanceKm} km`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${className}`}
    >
      {showIcon && <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
      <span>{formatted}</span>
    </span>
  );
}
