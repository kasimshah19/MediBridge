import { Link } from 'react-router-dom';
import { Pill } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * MediBridge brand Logo component.
 */
export default function Logo({ className, size = 'md', to = '/' }) {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const content = (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <div
        className={cn(
          'gradient-primary rounded-xl flex items-center justify-center text-white shadow-soft relative overflow-hidden group',
          iconSizes[size]
        )}
      >
        {/* Subtle bridge arc accent overlay */}
        <div className="absolute inset-x-1 bottom-0.5 h-2 border-t-2 border-white/40 rounded-t-full pointer-events-none" />
        <Pill className="w-5 h-5 -rotate-45" />
      </div>
      <div className="flex flex-col">
        <span className={cn('font-heading font-extrabold text-gradient tracking-tight leading-none', textSizes[size])}>
          MediBridge
        </span>
        <span className="text-[10px] tracking-wider text-text-muted font-semibold uppercase mt-0.5">
          Healthcare Exchange
        </span>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="focus:outline-none rounded-xl focus:ring-2 focus:ring-primary-400">
        {content}
      </Link>
    );
  }

  return content;
}

