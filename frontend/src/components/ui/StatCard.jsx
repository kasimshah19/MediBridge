import { cn } from '../../utils/cn';
import Card from './Card';

/**
 * StatCard component displaying metric value, icon, label, and trend indicators.
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp = true,
  className,
}) {
  return (
    <Card hover className={cn('flex items-start gap-4', className)}>
      {Icon && (
        <div className="p-3 rounded-xl bg-primary-50 text-primary-600 border border-primary-100 flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</p>
        <p className="text-2xl font-bold font-heading text-text-heading mt-1 truncate">{value}</p>
        {trend && (
          <p
            className={cn(
              'text-xs font-medium mt-1 flex items-center gap-1',
              trendUp ? 'text-emerald-600' : 'text-rose-600'
            )}
          >
            <span>{trendUp ? '↑' : '↓'}</span>
            <span>{trend}</span>
          </p>
        )}
      </div>
    </Card>
  );
}

