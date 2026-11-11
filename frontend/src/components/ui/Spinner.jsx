import { cn } from '../../utils/cn';

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
};

/**
 * Reusable animated Spinner.
 */
export default function Spinner({ size = 'md', className }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-spin rounded-full border-primary-200 border-t-primary-600',
        sizeMap[size] || sizeMap.md,
        className
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

