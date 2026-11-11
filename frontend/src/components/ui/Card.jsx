import { cn } from '../../utils/cn';

/**
 * Reusable Card component styled with pure white surface, rounded-2xl corners, and soft teal shadow.
 */
export default function Card({ className, children, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-surface rounded-2xl border border-teal-900/5 shadow-soft p-6 transition-all duration-200',
        hover && 'hover:shadow-hover hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

