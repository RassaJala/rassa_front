import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { formatearFecha } from '@/common/dates';
import {
  PAGOS_CLIENTE_QUERY_KEY,
  fetchPagos,
  type PaymentDetail,
} from '@/common/payments';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppColors } from '../hooks/useAppColors';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

export function BuyerReceipts() {
  const navigate = useNavigate();
  const colors = useAppColors();
  const { brand, fg, muted, border, surface } = colors;
  const { user } = useAuth();

  const {
    data: pagos = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<PaymentDetail[]>({
    queryKey: [PAGOS_CLIENTE_QUERY_KEY, user?.id],
    queryFn: () => fetchPagos(api),
  });

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Mis Recibos" />
        <div className="flex flex-col items-center gap-4 py-20 text-gray-500 dark:text-gray-400">
          <p>Error al cargar recibos</p>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => void refetch()}>
              Reintentar
            </Button>
            <Button variant="ghost" onClick={() => navigate('/cliente')}>
              Volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Mis Recibos" />
      {pagos.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-gray-500 dark:text-gray-400">
          <p>No tienes recibos aún</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pagos.map((pago) => (
            <Link
              key={pago.id_pago}
              to={`/cliente/recibos/${pago.id_pago}`}
              className="flex items-center justify-between gap-4 rounded-2xl px-6 py-4"
              style={{
                background: surface,
                border: `1px solid ${border}`,
                textDecoration: 'none',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: fg,
                    margin: 0,
                  }}
                >
                  {pago.folio}
                </p>
                <p style={{ fontSize: 13, color: muted, margin: '4px 0 0 0' }}>
                  {pago.pedido ? `Pedido #${pago.pedido} · ` : ''}
                  {formatearFecha(pago.fecha_pago)}
                </p>
              </div>
              <span style={{ fontSize: 17, fontWeight: 700, color: brand }}>
                ${Number(pago.monto).toFixed(2)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
