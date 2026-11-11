import { cn } from '../../utils/cn';

/**
 * Reusable animated Skeleton placeholder component.
 */
export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse bg-slate-200/70 rounded-xl', className)}
      {...props}
    />
  );
}

