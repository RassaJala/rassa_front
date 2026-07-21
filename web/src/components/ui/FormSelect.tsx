import { forwardRef, type SelectHTMLAttributes } from 'react';
import type { AppColors } from '../../hooks/useAppColors';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  colors: AppColors;
  hasError?: boolean;
}

// ponytail: select reutilizable (#28) — reemplaza HTML raw en ProductFormModal
export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ colors, hasError, className = '', children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-[15px] font-[inherit] outline-none box-border ${className}`}
        style={{
          borderColor: hasError ? colors.coral : colors.inputBorder,
          background: colors.surface,
          color: colors.fg,
          borderWidth: '1.5px',
        }}
        {...props}
      >
        {children}
      </select>
    );
  },
);

FormSelect.displayName = 'FormSelect';
