import { forwardRef, type TextareaHTMLAttributes } from 'react';
import type { AppColors } from '../../hooks/useAppColors';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  colors: AppColors;
  hasError?: boolean;
}

// ponytail: textarea reutilizable (#28) — reemplaza HTML raw en ProductFormModal
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ colors, hasError, className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full resize-vertical rounded-lg border px-3.5 py-2.5 text-[15px] font-[inherit] outline-none box-border min-h-[72px] ${className}`}
        style={{
          borderColor: hasError ? colors.coral : colors.inputBorder,
          background: colors.surface,
          color: colors.fg,
          borderWidth: '1.5px',
        }}
        {...props}
      />
    );
  },
);

TextArea.displayName = 'TextArea';
