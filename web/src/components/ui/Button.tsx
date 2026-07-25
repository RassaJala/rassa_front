import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ButtonVariant } from '../../types';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-red-coral text-white hover:bg-[#c72f30] focus:ring-brand-red-coral',
  secondary:
    'border border-brand-red-coral text-brand-red-coral bg-transparent hover:bg-red-50 dark:hover:bg-red-950 focus:ring-brand-red-coral',
  ghost:
    'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-400',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
