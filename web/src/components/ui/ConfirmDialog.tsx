import type { AppColors } from '../../hooks/useAppColors';
import { Button } from './Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  colors: AppColors;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  colors,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-bold" style={{ color: colors.fg }}>
          {title}
        </h3>
        <p className="mb-6 text-[14px]" style={{ color: colors.muted }}>
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'primary' : 'primary'}
            onClick={onConfirm}
            style={
              variant === 'danger' ? { background: colors.coral } : undefined
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
