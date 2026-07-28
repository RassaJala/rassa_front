import { useAppColors } from '~/hooks/useAppColors';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: Readonly<ConfirmDialogProps>) {
  const c = useAppColors();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Cerrar"
    >
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl"
        style={{
          background: c.surface,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4">
          <h3 className="text-base font-semibold" style={{ color: c.fg }}>
            {title}
          </h3>
          <p className="mt-2 text-sm" style={{ color: c.muted }}>
            {message}
          </p>
        </div>
        <div
          className="flex justify-end gap-2.5 px-5 py-4"
          style={{ borderTop: `1px solid ${c.border}` }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: c.coral,
              color: c.coral,
              background: 'transparent',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity"
            style={{ background: c.coral }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
