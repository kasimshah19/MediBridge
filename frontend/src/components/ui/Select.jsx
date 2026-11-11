import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable Select component with label, error message, and helper text.
 */
const Select = forwardRef(
  ({ className, label, helperText, error, id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-semibold text-text-heading mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border bg-white text-text-heading transition-all duration-200 text-sm cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-500',
              error
                ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                : 'border-slate-200 hover:border-primary-300',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-muted">
            <ChevronDown size={16} />
          </div>
        </div>
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-text-muted leading-relaxed">{helperText}</p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-rose-600 font-medium leading-relaxed">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;

