import { cn } from '../../utils/cn';

/**
 * Reusable EmptyState component for empty lists, search states, or pending items.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-teal-800/15 bg-white/50',
        className
      )}
    >
      {Icon && (
        <div className="p-4 rounded-2xl bg-primary-50 text-primary-600 mb-4 border border-primary-100">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h4 className="text-base font-heading font-bold text-text-heading mb-1.5">{title}</h4>
      {description && (
        <p className="text-sm text-text-body max-w-sm mb-4 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

