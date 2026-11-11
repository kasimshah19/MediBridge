import { cn } from '../../utils/cn';

const colorStyles = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
  info: 'bg-sky-50 text-sky-700 border-sky-200/80',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
};

/**
 * Reusable Badge component for statuses, tags, and pills.
 */
export default function Badge({ children, color = 'neutral', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide',
        colorStyles[color] || colorStyles.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

