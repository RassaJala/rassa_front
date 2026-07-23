import { forwardRef, type InputHTMLAttributes } from "react";
import type { AppColors } from "../../hooks/useAppColors";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  colors?: AppColors;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, colors, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`rounded-lg border px-3 py-2 text-sm outline-none ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : ""
          } ${className}`}
          style={
            colors
              ? {
                  borderColor: error ? colors.coral : colors.inputBorder,
                  background: colors.surface,
                  color: colors.fg,
                }
              : undefined
          }
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
