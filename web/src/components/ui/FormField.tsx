import type { AppColors } from '../../hooks/useAppColors';

interface FormFieldProps {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
  colors: AppColors;
}

export function FormField({ label, error, children, colors }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[13px] font-semibold" style={{ color: colors.fg }}>
        {label}
      </label>
      {children}
      {error && (
        <span className="text-xs" style={{ color: colors.coral }}>
          {error}
        </span>
      )}
    </div>
  );
}
