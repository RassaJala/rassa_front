import { forwardRef, type TextareaHTMLAttributes } from "react";
import type { AppColors } from "../../hooks/useAppColors";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  colors: AppColors;
  hasError?: boolean;
}

// ponytail: textarea reutilizable (#28) — reemplaza HTML raw en ProductFormModal
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ colors, hasError, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`resize-vertical box-border min-h-[72px] w-full rounded-lg border px-3.5 py-2.5 font-[inherit] text-[15px] outline-none ${className}`}
        style={{
          borderColor: hasError ? colors.coral : colors.inputBorder,
          background: colors.surface,
          color: colors.fg,
          borderWidth: "1.5px",
        }}
        {...props}
      />
    );
  },
);

TextArea.displayName = "TextArea";
