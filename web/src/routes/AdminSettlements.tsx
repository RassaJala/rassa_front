import { Component, useMemo, useState } from 'react';
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
import { fetchFarmers, fetchSettlements } from '@/services/settlements';
import type { SettlementsResult } from '@/services/settlements';
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
    // CRIT-2: an invalid range disables the query instead of running a
    // nonsensical request; placeholderData keeps the last loaded list visible
    // so the screen never pretends there are no results because the dates are
    // wrong.
    enabled: !isDateRangeInvalid,
    retry: false,
    // Keep the last loaded list when a refetch fails so the persistent banner
    // can surface the error while the previous results stay visible (WARN-3).
    placeholderData: (prev: SettlementsResult<Settlement> | undefined) => prev,
  });

  const farmersQuery = useQuery({
    queryKey: ['farmers'],
    queryFn: fetchFarmers,
    retry: false,
  });

  const data: Settlement[] = settlementsQuery.data?.items ?? [];
  // WARN-1: the server total reported on the first page of the fetch-all walk.
  const serverCount = settlementsQuery.data?.count ?? 0;
  // JD-003: the fetch-all walk stops at the SETTLEMENTS_MAX_PAGES cap while
  // the server still exposes more pages — surface it instead of rendering the
  // list as if it were complete.
  const isTruncated = settlementsQuery.data?.truncated === true;
  // CONV-4: placeholder rows are not the current dataset — flag the moment
  // they are being replaced so stale data is never presented as fresh.
  const isReplacingPlaceholder =
    settlementsQuery.isPlaceholderData && settlementsQuery.isFetching;

  const errorMessage = parseApiError(
    settlementsQuery.error,
    'Error al cargar liquidaciones',
  );

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

        {/* CRIT-2: explicit rango inválido hint — the list below stays visible
            while the range is invalid; the problem is the dates, not the data. */}
        {isDateRangeInvalid && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            El rango de fechas es inválido. Corrige las fechas para actualizar
            los resultados.
          </div>
        )}

        {/* WARN-3: persistent refetch-error surface — a stale list is never
            mistaken for valid data, and the retry lives next to the message. */}
        {settlementsQuery.isError && data.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            <span>{errorMessage} — Mostrando la última consulta exitosa.</span>
            <button
              type="button"
              onClick={() => void settlementsQuery.refetch()}
              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* CONV-4: placeholder rows are visible but marked as not-current. */}
        {isReplacingPlaceholder && (
          <p className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            Actualizando resultados…
          </p>
        )}

        {data.length === 0 ? (
          // CRIT-2: an invalid range must never render the "no results" empty
          // state — the banner above already explains the situation.
          isDateRangeInvalid ? null : (
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
          )
        ) : (
          <>
            <p className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {data.length} liquidaciones
            </p>
            {isTruncated && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {/* WARN-1: actionable truncation notice — fetched count vs the
                    server total plus a hint to narrow the results. */}
                <p>
                  Mostrando las primeras {data.length} de {serverCount}{' '}
                  liquidaciones.
                </p>
                <p className="mt-1">
                  Aplica un filtro para acotar los resultados.
                </p>
              </div>
            )}
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
      </div>
    </SettlementsErrorBoundary>
  );
}
