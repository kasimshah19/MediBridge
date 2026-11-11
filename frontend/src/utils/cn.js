import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines clsx and tailwind-merge for robust className composition.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

