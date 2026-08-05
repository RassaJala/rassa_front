import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute } from '~/components/guards/AdminRoute';
import { ProtectedRoute } from '~/components/guards/ProtectedRoute';
import { DashboardLayout } from '~/components/layout/DashboardLayout';
import { LoginScreen } from './Login';
import { RegisterScreen } from './Register';
import { FarmerProducts, FarmerOrders } from './farmer';
import { FarmerPublications } from './FarmerPublications';
import { PublicationWizard } from './PublicationWizard';
import { SellerSales } from './seller';
import { VendorCorteCaja } from './VendorCorteCaja';
import { PaymentPage } from './PaymentPage';
import { ReceiptPage } from './ReceiptPage';
import { SellerRecolecciones } from './SellerRecolecciones';
import { VendorPanelScreen } from './VendorPanelScreen';
import { AdminDashboard } from './AdminDashboard';
import { AdminMermasDashboard } from './AdminMermasDashboard';
import { AdminCategories } from './AdminCategories';
import { AdminFamilies } from './AdminFamilies';
import { AdminFamilyDetail } from './AdminFamilyDetail';
import { AdminUnits } from './AdminUnits';
import { AdminProducts } from './AdminProducts';
import { AdminMunicipios } from './AdminMunicipios';
import { AdminLocalidades } from './AdminLocalidades';
import { AdminUsers } from './AdminUsers';
import { AdminOrderDetail } from './AdminOrderDetail';
import { BuyerHome } from './BuyerHome';
import { BuyerCatalog } from './BuyerCatalog';
import { BuyerCart } from './BuyerCart';
import { BuyerCheckout } from './BuyerCheckout';
import { BuyerOrderDetail } from './BuyerOrderDetail';
import { BuyerOrders } from './BuyerOrders';
import { ProfilePage } from './ProfilePage';
import { ChatListPage } from './chat/ChatListPage';
import { ChatDetailPage } from './chat/ChatDetailPage';
import { GroupDetailPage } from './chat/GroupDetailPage';
import { StartChatPage } from './chat/StartChatPage';
import { CreateGroupPage } from './chat/CreateGroupPage';
import { useAuth } from '../hooks/useAuth';

const CHAT_ROUTE_CONFIGS = [
  { path: 'chat', element: <ChatListPage /> },
  { path: 'chat/nuevo', element: <StartChatPage /> },
  { path: 'chat/nuevo/grupo', element: <CreateGroupPage /> },
  { path: 'chat/:id', element: <ChatDetailPage /> },
  { path: 'chat/:id/grupo', element: <GroupDetailPage /> },
];

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-brand-green-forest text-6xl font-bold">404</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Página no encontrada
        </p>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="border-t-brand-red-coral h-8 w-8 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const routes: Record<string, string> = {
    admin: '/admin',
    agricultor: '/agricultor/productos',
    vendedor: '/vendedor/ventas',
    cliente: '/cliente',
  };

  return <Navigate to={routes[user.rol] ?? '/login'} replace />;
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* Redirect root to role dashboard or login */}
      <Route path="/" element={<RootRedirect />} />

      {/* Agricultor */}
      <Route element={<ProtectedRoute role="agricultor" />}>
        <Route
          path="/agricultor/*"
          element={
            <DashboardLayout role="agricultor">
              <Routes>
                <Route path="productos" element={<FarmerProducts />} />
                <Route path="pedidos" element={<FarmerOrders />} />
                <Route path="publicaciones" element={<FarmerPublications />} />
                <Route
                  path="publicaciones/nueva"
                  element={<PublicationWizard />}
                />
                <Route
                  path="publicaciones/:id/editar"
                  element={<PublicationWizard />}
                />
                <Route path="perfil" element={<ProfilePage />} />
                {CHAT_ROUTE_CONFIGS.map((cfg) => (
                  <Route key={cfg.path} path={cfg.path} element={cfg.element} />
                ))}
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
      <Route element={<ProtectedRoute role="vendedor" />}>
        <Route
          path="/vendedor/*"
          element={
            <DashboardLayout role="vendedor">
              <Routes>
                <Route path="ventas" element={<SellerSales />} />
                <Route path="pedidos" element={<VendorPanelScreen />} />
                <Route path="recolecciones" element={<SellerRecolecciones />} />
                <Route path="corte-caja" element={<VendorCorteCaja />} />
                <Route path="cobrar/:orderId" element={<PaymentPage />} />
                <Route path="recibo/:paymentId" element={<ReceiptPage />} />
                <Route path="perfil" element={<ProfilePage />} />
                {CHAT_ROUTE_CONFIGS.map((cfg) => (
                  <Route key={cfg.path} path={cfg.path} element={cfg.element} />
                ))}
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
                <Route path="familias" element={<AdminFamilies />} />
                <Route
                  path="familias/detalle"
                  element={<AdminFamilyDetail />}
                />
                <Route path="perfil" element={<ProfilePage />} />
                <Route path="municipios" element={<AdminMunicipios />} />
                <Route path="localidades" element={<AdminLocalidades />} />
                <Route path="usuarios" element={<AdminUsers />} />
                <Route path="mermas" element={<AdminMermasDashboard />} />
                <Route path="pedidos/:id" element={<AdminOrderDetail />} />
                {CHAT_ROUTE_CONFIGS.map((cfg) => (
                  <Route key={cfg.path} path={cfg.path} element={cfg.element} />
                ))}
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </DashboardLayout>
          }
        />
      </Route>

      {/* Cliente */}
      <Route element={<ProtectedRoute role="cliente" />}>
        <Route
          path="/cliente/*"
          element={
            <DashboardLayout role="cliente">
              <Routes>
                <Route index element={<BuyerHome />} />
                <Route path="catalogo" element={<BuyerCatalog />} />
                <Route path="carrito" element={<BuyerCart />} />
                <Route path="checkout" element={<BuyerCheckout />} />
                <Route path="pedidos" element={<BuyerOrders />} />
                <Route path="pedidos/:id" element={<BuyerOrderDetail />} />
                <Route path="perfil" element={<ProfilePage />} />
                {CHAT_ROUTE_CONFIGS.map((cfg) => (
                  <Route key={cfg.path} path={cfg.path} element={cfg.element} />
                ))}
                <Route path="*" element={<Navigate to="/cliente" replace />} />
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
