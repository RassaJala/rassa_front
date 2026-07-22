import { PageHeader } from '../components/layout/PageHeader';
import { useAuth } from '../hooks/useAuth';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  agricultor: 'Agricultor',
  vendedor: 'Vendedor',
  cliente: 'Cliente',
};

export function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <>
      <PageHeader title="Mi Perfil" />
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-forest text-2xl font-bold text-white">
              {user?.nombre?.charAt(0) ?? 'U'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {user?.nombre ?? 'Usuario'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email ?? ''}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Información personal
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Nombre</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {user?.nombre ?? '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Email</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {user?.email ?? '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Rol</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {roleLabels[user?.rol ?? ''] ?? user?.rol ?? '-'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="rounded-xl border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Cerrar sesión
        </button>
      </div>
    </>
  );
}
