import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '~/hooks/useAuth';
import type { Role } from '~/types';

interface ProtectedRouteProps {
  roles?: Role[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
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

  if (roles && user && !roles.includes(user.rol)) {
    return <Navigate to="/404" replace />;
  }

  return <Outlet />;
}
