import React from 'react';

/**
 * Circular progress ring for timer countdowns (e.g. 15 min handover TTL).
 */
export const CountdownRing = ({
  secondsLeft,
  totalSeconds = 900, // 15 mins default
  size = 64,
  strokeWidth = 5,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedSeconds = Math.max(0, Math.min(secondsLeft, totalSeconds));
  const progress = totalSeconds > 0 ? clampedSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const mins = Math.floor(clampedSeconds / 60);
  const secs = clampedSeconds % 60;
  const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;

  const isLow = clampedSeconds <= 120; // 2 minutes left
  const strokeColor = isLow ? '#EF4444' : progress < 0.5 ? '#F59E0B' : '#0D9488';

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-mono text-xs font-bold ${
            isLow ? 'text-rose-600 animate-pulse' : 'text-slate-800'
          }`}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

export default CountdownRing;
