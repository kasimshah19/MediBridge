import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Input component with label, error message, and helper text.
 */
const Input = forwardRef(
  ({ className, label, helperText, error, id, type = 'text', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-text-heading mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border bg-white text-text-heading placeholder:text-text-muted transition-all duration-200 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-500',
            error
              ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
              : 'border-slate-200 hover:border-primary-300',
            className
          )}
          {...props}
        />
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

Input.displayName = 'Input';

export default Input;

