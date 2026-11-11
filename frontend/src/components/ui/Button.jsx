import { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import Spinner from './Spinner';

const variantClasses = {
  primary:
    'gradient-primary text-white shadow-soft hover:shadow-hover hover:-translate-y-0.5 active:translate-y-0 focus:ring-primary-400',
  secondary:
    'bg-secondary-50 text-secondary-700 border border-secondary-200 hover:bg-secondary-100 hover:border-secondary-300 focus:ring-secondary-300',
  outline:
    'bg-white text-primary-700 border border-primary-300 hover:bg-primary-50 hover:border-primary-400 focus:ring-primary-300',
  ghost:
    'bg-transparent text-text-body hover:bg-primary-50 hover:text-primary-700 focus:ring-primary-200',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 shadow-soft focus:ring-rose-300',
};

const sizeClasses = {
  sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2 rounded-xl gap-2',
  lg: 'text-base px-6 py-2.5 rounded-xl gap-2.5',
};

/**
 * Reusable Button component with accessible variants, sizes, and loading state.
 */
const Button = forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 focus-ring cursor-pointer select-none',
          'disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
          variantClasses[variant] || variantClasses.primary,
          sizeClasses[size] || sizeClasses.md,
          className
        )}
        {...props}
      >
        {loading && <Spinner size="sm" className="border-current border-t-transparent" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

