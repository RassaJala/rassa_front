import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';
import { Input } from '~/components/ui/Input';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AdminChangePasswordProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordError: string | null;
  passwordSuccess: string | null;
  passwordSubmitting: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordErrorClear: () => void;
  onSubmit: () => void;
}

export function AdminChangePassword({
  currentPassword,
  newPassword,
  confirmPassword,
  passwordError,
  passwordSuccess,
  passwordSubmitting,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onPasswordErrorClear,
  onSubmit,
}: AdminChangePasswordProps) {
  return (
    <Card className="space-y-4 p-6">
      <h3 className="text-lg font-bold text-brand-ink dark:text-gray-100">
        Cambiar Contraseña
      </h3>

      {passwordError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-600 dark:border-red-700 dark:bg-red-950 dark:text-red-400">
          {passwordError}
        </div>
      )}

      {passwordSuccess && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-600 dark:border-green-700 dark:bg-green-950 dark:text-green-400">
          {passwordSuccess}
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="Contraseña Actual *"
          type="password"
          value={currentPassword}
          onChange={(e) => {
            onCurrentPasswordChange(e.target.value);
            onPasswordErrorClear();
          }}
          required
        />
        <Input
          label="Nueva Contraseña (mínimo 8 caracteres) *"
          type="password"
          value={newPassword}
          onChange={(e) => {
            onNewPasswordChange(e.target.value);
            onPasswordErrorClear();
          }}
          required
        />
        <Input
          label="Confirmar Nueva Contraseña *"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            onConfirmPasswordChange(e.target.value);
            onPasswordErrorClear();
          }}
          required
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          variant="primary"
          disabled={passwordSubmitting}
          onClick={onSubmit}
        >
          {passwordSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
        </Button>
      </div>
    </Card>
  );
}
