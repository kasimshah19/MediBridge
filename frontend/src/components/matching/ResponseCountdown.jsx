import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export default function ResponseCountdown({ expiresAt, className = '' }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const calculate = () => {
      const now = new Date().getTime();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Window Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setIsUrgent(hours < 12);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        setTimeLeft(`${days}d ${remHours}h left`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m left`);
      }
    };

    calculate();
    const interval = setInterval(calculate, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${
        isExpired
          ? 'bg-slate-100 text-slate-500 border border-slate-200'
          : isUrgent
          ? 'bg-rose-50 text-rose-700 border border-rose-200/80 animate-pulse font-semibold'
          : 'bg-amber-50 text-amber-800 border border-amber-200/80'
      } ${className}`}
      title={new Date(expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
    >
      {isUrgent ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
      )}
      <span>{timeLeft}</span>
    </span>
  );
}
