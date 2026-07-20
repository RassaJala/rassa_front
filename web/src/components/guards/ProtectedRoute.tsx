import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '~/hooks/useAuth';
import type { Role } from '~/types';

export function ProtectedRoute({ role }: { role?: Role } = {}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-red-coral dark:border-gray-700" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.rol !== role) {
    // Redirect to their own dashboard
    const fallback = user?.rol === 'admin' ? '/admin' : user?.rol === 'vendedor' ? '/vendedor/ventas' : '/agricultor/productos';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
