import { cn } from '../../utils/cn';

/**
 * Reusable PageHeader for dashboard and content views.
 */
export default function PageHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-2xl font-heading font-bold text-text-heading tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-text-body mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

