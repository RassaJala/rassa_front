import type { ReactNode } from 'react';
import type { BadgeVariant } from '../../types';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  success:
    'bg-green-50 text-brand-green-forest dark:bg-green-950 dark:text-green-400',
  warning:
    'bg-orange-50 text-brand-orange dark:bg-orange-950 dark:text-orange-400',
  error: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
};

export function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
