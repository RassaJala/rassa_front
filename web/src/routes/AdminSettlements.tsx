import { Component, useEffect, useMemo, useState } from 'react';
import * as Sentry from '@sentry/react';
import { useQuery } from '@tanstack/react-query';

import type {
  Settlement,
  SettlementEstado,
  SettlementListParams,
} from '@/common/settlements';
import { formatDateInput } from '@/common/waste';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettlementFilterBar } from '@/components/admin/settlements/SettlementFilterBar';
import { SettlementTable } from '@/components/admin/settlements/SettlementTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import type { ToastState } from '@/components/ui/Toast';
import { fetchFarmers, fetchSettlements } from '@/services/settlements';
import { parseApiError } from '@/utils/apiErrors';

// Client-side page size for the list slice (server is fetch-all, R2).
const SETTLEMENTS_PAGE_SIZE = 10;

// --- Error boundary ---

class SettlementsErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      '[SettlementsErrorBoundary] Error capturado:',
      error,
      errorInfo,
    );
    Sentry.captureException(error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <>
          <PageHeader title="Liquidaciones" />
          <EmptyState
            icon="⚠️"
            title="Error inesperado"
            message="Ocurrió un error al renderizar las liquidaciones."
            action={
              <button
                type="button"
                onClick={this.handleRetry}
                className="mt-3 rounded-lg bg-brand-green-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-forest/90"
              >
                Reintentar
              </button>
            }
          />
        </>
      );
    }
    return this.props.children;
  }
}

// --- Main component ---

export function AdminSettlements() {
  const [selectedEstado, setSelectedEstado] = useState<SettlementEstado | ''>(
    '',
  );
  const [farmerId, setFarmerId] = useState<number | undefined>(undefined);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [toast, setToast] = useState<ToastState | null>(null);

  const today = useMemo(() => formatDateInput(new Date()), []);

  const isDateRangeInvalid = Boolean(
    fechaDesde && fechaHasta && fechaHasta < fechaDesde,
  );

  const settlementsQuery = useQuery({
    queryKey: [
      'settlements',
      {
        agricultor: farmerId,
        estado: selectedEstado || undefined,
        periodo_inicio: fechaDesde || undefined,
        periodo_fin: fechaHasta || undefined,
      },
    ],
    queryFn: () => {
      const params: SettlementListParams = {
        ...(farmerId !== undefined ? { agricultor: farmerId } : {}),
        ...(selectedEstado !== '' ? { estado: selectedEstado } : {}),
        ...(fechaDesde !== '' ? { periodo_inicio: fechaDesde } : {}),
        ...(fechaHasta !== '' ? { periodo_fin: fechaHasta } : {}),
      };
      return fetchSettlements(params);
    },
    enabled: !isDateRangeInvalid,
    retry: false,
    // Keep the last loaded list when a refetch fails so the stale toast can
    // surface the error while the previous results stay visible.
    placeholderData: (prev: Settlement[] | undefined) => prev,
  });

  const farmersQuery = useQuery({
    queryKey: ['farmers'],
    queryFn: fetchFarmers,
    retry: false,
  });

  const data: Settlement[] = settlementsQuery.data ?? [];

  const errorMessage = parseApiError(
    settlementsQuery.error,
    'Error al cargar liquidaciones',
  );

  // Refetch failure with stale data: keep the list and surface the message.
  useEffect(() => {
    if (settlementsQuery.isError && data.length > 0) {
      setToast({ message: errorMessage, type: 'error' });
    }
  }, [settlementsQuery.isError, data.length, errorMessage]);

  const hasFilters = Boolean(
    fechaDesde !== '' ||
    fechaHasta !== '' ||
    farmerId !== undefined ||
    selectedEstado !== '',
  );

  function handleFilterChange<T>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    value: T,
  ) {
    setter(value);
    setPagina(1);
  }

  function handleReset() {
    setFechaDesde('');
    setFechaHasta('');
    setFarmerId(undefined);
    setSelectedEstado('');
    setPagina(1);
  }

  const totalPaginas = Math.max(
    1,
    Math.ceil(data.length / SETTLEMENTS_PAGE_SIZE),
  );
  const paginaSegura = Math.min(pagina, totalPaginas);
  const paginated = useMemo(
    () =>
      data.slice(
        (paginaSegura - 1) * SETTLEMENTS_PAGE_SIZE,
        paginaSegura * SETTLEMENTS_PAGE_SIZE,
      ),
    [data, paginaSegura],
  );

  const isLoading =
    settlementsQuery.isPending &&
    settlementsQuery.fetchStatus !== 'idle' &&
    !settlementsQuery.data;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Liquidaciones" />
        <LoadingSpinner className="py-20" />
      </>
    );
  }

  if (settlementsQuery.isError && !settlementsQuery.data) {
    return (
      <>
        <PageHeader title="Liquidaciones" />
        <EmptyState
          icon="⚠️"
          title="Error al cargar liquidaciones"
          message={errorMessage}
          action={
            <button
              type="button"
              onClick={() => void settlementsQuery.refetch()}
              className="mt-3 rounded-lg bg-brand-green-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-forest/90"
            >
              Reintentar
            </button>
          }
        />
      </>
    );
  }

  return (
    <SettlementsErrorBoundary>
      <div>
        <PageHeader title="Liquidaciones" />

        <SettlementFilterBar
          selectedEstado={selectedEstado}
          farmerId={farmerId}
          farmers={farmersQuery.data ?? []}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          hasFilters={hasFilters}
          isDateRangeInvalid={isDateRangeInvalid}
          today={today}
          onEstadoChange={(v) => handleFilterChange(setSelectedEstado, v)}
          onFarmerChange={(v) => handleFilterChange(setFarmerId, v)}
          onFechaDesdeChange={(v) => handleFilterChange(setFechaDesde, v)}
          onFechaHastaChange={(v) => handleFilterChange(setFechaHasta, v)}
          onReset={handleReset}
        />

        {data.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Sin resultados"
            message={
              hasFilters
                ? 'No se encontraron liquidaciones con los filtros seleccionados.'
                : 'No hay liquidaciones registradas.'
            }
            action={
              hasFilters ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Limpiar filtros
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {data.length} liquidaciones
            </p>
            <SettlementTable
              rows={paginated}
              total={data.length}
              totalPaginas={totalPaginas}
              paginaSegura={paginaSegura}
              onPrev={() => setPagina((p) => Math.max(1, p - 1))}
              onNext={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            />
          </>
        )}

        <Toast toast={toast} onDone={() => setToast(null)} />
      </div>
    </SettlementsErrorBoundary>
  );
}
