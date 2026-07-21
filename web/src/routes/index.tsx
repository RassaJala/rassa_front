import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute } from '~/components/guards/AdminRoute';
import { ProtectedRoute } from '~/components/guards/ProtectedRoute';
import { DashboardLayout } from '~/components/layout/DashboardLayout';
import { LoginScreen, RegisterScreen } from './auth';
import { FarmerProducts, FarmerOrders } from './farmer';
import { SellerOrders, SellerSales } from './seller';
import { AdminDashboard } from './AdminDashboard';
import { AdminCategories } from './AdminCategories';
import { AdminUnits } from './AdminUnits';
import { AdminProducts } from './AdminProducts';
import { AdminProfile } from './AdminProfile';
import { AdminUsers } from './AdminUsers';

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand-green-forest">404</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Página no encontrada
        </p>
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* Redirect root to /agricultor (or /login if not auth) */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Agricultor */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/agricultor/*"
          element={
            <DashboardLayout role="agricultor">
              <Routes>
                <Route path="productos" element={<FarmerProducts />} />
                <Route path="pedidos" element={<FarmerOrders />} />
                <Route
                  path="*"
                  element={<Navigate to="/agricultor/productos" replace />}
                />
              </Routes>
            </DashboardLayout>
          }
        />
      </Route>

      {/* Vendedor */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/vendedor/*"
          element={
            <DashboardLayout role="vendedor">
              <Routes>
                <Route path="ventas" element={<SellerSales />} />
                <Route path="pedidos" element={<SellerOrders />} />
                <Route
                  path="*"
                  element={<Navigate to="/vendedor/ventas" replace />}
                />
              </Routes>
            </DashboardLayout>
          }
        />
      </Route>

      {/* Admin */}
      <Route element={<AdminRoute />}>
        <Route
          path="/admin/*"
          element={
            <DashboardLayout role="admin">
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="productos" element={<AdminProducts />} />
                <Route path="categorias" element={<AdminCategories />} />
                <Route path="unidades" element={<AdminUnits />} />
                <Route path="perfil" element={<AdminProfile />} />
                <Route path="usuarios" element={<AdminUsers />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </DashboardLayout>
          }
        />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
