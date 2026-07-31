import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  extractProducts,
  formatDateInput,
  getDecisionColor,
  groupBy,
  periodLabel,
  WASTE_DETAIL_LIMIT,
  WASTE_PAGE_SIZE,
  WASTE_RETRY_LIMIT,
  WASTE_STALE_TIME_MS,
  type DecisionPalette,
  type MermaResumenItem,
  type MermaResumenResponse,
} from '@/common/waste';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PageHeader } from '../components/layout/PageHeader';
import { DetailTable } from '../components/admin/merma/DetailTable';
import { PeriodTrendCard } from '../components/admin/merma/PeriodTrendCard';
import { RankingBar } from '../components/admin/merma/RankingBar';
import { fetchMermaResumen } from '../services/waste';

// --- Error boundary ---

class DashboardErrorBoundary extends Component<
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
    // Always log: production monitoring depends on this surface.
    console.error(
      '[DashboardErrorBoundary] Error capturado:',
      error,
      errorInfo,
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <>
          <PageHeader title="Dashboard de Mermas" />
          <EmptyState
            icon="⚠️"
            title="Error inesperado"
            message="Ocurrió un error al renderizar el dashboard."
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

// --- Colors ---

function rankColor(index: number, total: number): string {
  if (total <= 1) return 'bg-gray-300 dark:bg-gray-600';
  if (index === 0) return 'bg-red-500';
  if (index === 1) return 'bg-orange-500';
  if (index === 2) return 'bg-amber-500';
  return 'bg-brand-green-forest/60 dark:bg-brand-green-forest/50';
}

// Tailwind class tokens for the shared decision-color algorithm (see @/common/waste).
const decisionPalette: DecisionPalette = {
  donar: 'bg-brand-green-forest',
  tirar: 'bg-brand-red-coral',
  compostar: 'bg-brand-green-olive',
  fallback: [
    'bg-brand-orange',
    'bg-brand-magenta',
    'bg-brand-mountain-top',
    'bg-brand-mountain-bot',
    'bg-brand-green-sage',
    'bg-brand-mountain-mid',
    'bg-brand-primary-dark',
    'bg-brand-skin',
  ],
  defaultColor: 'bg-gray-400',
};

function findSelectedProductName(
  detalle: MermaResumenItem[],
  productoId: number | undefined,
): string | undefined {
  if (productoId === undefined) return undefined;
  for (const item of detalle) {
    if (item.producto_id === productoId) return item.producto_nombre;
  }
  return undefined;
}

const inputClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-green-forest focus:ring-1 focus:ring-brand-green-forest dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

const labelClass =
  'text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400';

// --- Sub-components ---

interface FilterBarProps {
  fechaDesde: string;
  fechaHasta: string;
  productoId: number | undefined;
  agruparPor: 'mes' | 'semana';
  products: { id: number; nombre: string }[];
  hasFilters: boolean;
  isDateRangeInvalid: boolean;
  onFechaDesdeChange: (v: string) => void;
  onFechaHastaChange: (v: string) => void;
  onProductoIdChange: (v: number | undefined) => void;
  onAgruparPorChange: (v: 'mes' | 'semana') => void;
  onReset: () => void;
  today: string;
}

function FilterBar({
  fechaDesde,
  fechaHasta,
  productoId,
  agruparPor,
  products,
  hasFilters,
  isDateRangeInvalid,
  onFechaDesdeChange,
  onFechaHastaChange,
  onProductoIdChange,
  onAgruparPorChange,
  onReset,
  today,
}: FilterBarProps) {
  return (
    <Card className="mb-6">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-wrap items-end gap-4"
      >
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Desde</label>
          <input
            type="date"
            max={today}
            value={fechaDesde}
            onChange={(e) => onFechaDesdeChange(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Hasta</label>
          <input
            type="date"
            max={today}
            value={fechaHasta}
            onChange={(e) => onFechaHastaChange(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Producto</label>
          <select
            value={productoId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              onProductoIdChange(Number.isNaN(id) ? undefined : id);
            }}
            className={inputClass}
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Agrupar</label>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              type="button"
              onClick={() => onAgruparPorChange('mes')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                agruparPor === 'mes'
                  ? 'bg-brand-green-forest text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => onAgruparPorChange('semana')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                agruparPor === 'semana'
                  ? 'bg-brand-green-forest text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Semana
            </button>
          </div>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Limpiar filtros
          </button>
        )}
      </form>

      {isDateRangeInvalid && (
        <p className="mt-3 text-xs font-medium text-red-500 dark:text-red-400">
          La fecha «Hasta» debe ser mayor o igual a «Desde».
        </p>
      )}
    </Card>
  );
}

interface SummaryCardsProps {
  totalGeneral: number;
  totalRegistros: number;
  productoMasAfectado: { nombre: string; total: number } | null;
  agruparPor: 'mes' | 'semana';
}

function SummaryCards({
  totalGeneral,
  totalRegistros,
  productoMasAfectado,
  agruparPor,
}: SummaryCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <div className="flex items-start justify-between">
          <span className="text-2xl">📦</span>
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {agruparPor === 'semana' ? 'Semanal' : 'Mensual'}
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
          {totalGeneral}
        </p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Unidades mermadas
        </p>
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <span className="text-2xl">🥇</span>
        </div>
        {productoMasAfectado ? (
          <>
            <p className="mt-3 text-xl font-bold text-gray-900 dark:text-gray-100">
              {productoMasAfectado.nombre}
            </p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {productoMasAfectado.total} unidades perdidas
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Sin datos
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <span className="text-2xl">📋</span>
        </div>
        <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
          {totalRegistros}
        </p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Registros de merma
        </p>
      </Card>
    </div>
  );
}

// --- Main component ---

export function AdminMermasDashboard() {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [productoId, setProductoId] = useState<number | undefined>(undefined);
  const [agruparPor, setAgruparPor] = useState<'mes' | 'semana'>('mes');
  const [pagina, setPagina] = useState(1);

  // Today for date inputs max attribute (local date, avoids UTC off-by-one)
  const today = useMemo(() => formatDateInput(new Date()), []);

  // Retry limit
  const retryCountRef = useRef(0);

  // Date range validation
  const isDateRangeInvalid = Boolean(
    fechaDesde && fechaHasta && fechaHasta < fechaDesde,
  );

  // --- Query ---

  const resumenQuery = useQuery({
    queryKey: ['merma-resumen', fechaDesde, fechaHasta, productoId, agruparPor],
    queryFn: () =>
      fetchMermaResumen({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        producto_id: productoId,
        agrupar_por: agruparPor,
      }),
    enabled: !isDateRangeInvalid,
    placeholderData: (prev: MermaResumenResponse | undefined) => prev,
    staleTime: WASTE_STALE_TIME_MS,
    retry: false,
  });

  // Reset retry count on successful fetch
  useEffect(() => {
    if (resumenQuery.data) retryCountRef.current = 0;
  }, [resumenQuery.data]);

  // If the selected product no longer exists in the data, drop the filter
  // instead of showing an empty dashboard with a stale selection.
  const products = useMemo(
    () => extractProducts(resumenQuery.data?.detalle ?? []),
    [resumenQuery.data?.detalle],
  );
  useEffect(() => {
    if (
      productoId !== undefined &&
      products.length > 0 &&
      !products.some((p) => p.id === productoId)
    ) {
      setProductoId(undefined);
    }
  }, [products, productoId]);

  // --- Filter handlers (reset page synchronously) ---

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
    setProductoId(undefined);
    setAgruparPor('mes');
    setPagina(1);
  }

  // --- Derived (all derive from resumen) ---

  // Query result — explicit destructure for type safety
  const resumen: MermaResumenResponse | undefined = resumenQuery.data;

  const productRanking = useMemo(
    () =>
      groupBy(
        resumen?.detalle ?? [],
        (x) => x.producto_nombre,
        (x) => x.total_cantidad,
      ),
    [resumen?.detalle],
  );

  const maxProductTotal = useMemo(
    () => Math.max(...productRanking.map((p) => p.total), 1),
    [productRanking],
  );

  const periodData = useMemo(() => {
    const sorted = [...(resumen?.detalle ?? [])].sort((a, b) =>
      a.periodo.localeCompare(b.periodo),
    );
    return groupBy(
      sorted,
      (x) => periodLabel(x.periodo, agruparPor),
      (x) => x.total_cantidad,
    );
  }, [resumen?.detalle, agruparPor]);

  const maxPeriod = useMemo(
    () => Math.max(...periodData.map((p) => p.total), 1),
    [periodData],
  );

  const totalRegistros = useMemo(
    () =>
      (resumen?.detalle ?? []).reduce(
        (sum, item) => sum + item.total_mermas,
        0,
      ),
    [resumen?.detalle],
  );

  const totalPaginas = useMemo(
    () => Math.ceil((resumen?.detalle.length ?? 0) / WASTE_PAGE_SIZE),
    [resumen?.detalle],
  );

  // 0 means empty dataset — pagination stays hidden (checked below)
  const paginaSegura = Math.min(pagina, Math.max(totalPaginas, 1));

  const detallePaginado = useMemo(
    () =>
      (resumen?.detalle ?? []).slice(
        (paginaSegura - 1) * WASTE_PAGE_SIZE,
        paginaSegura * WASTE_PAGE_SIZE,
      ),
    [resumen?.detalle, paginaSegura],
  );

  const selectedProductName = useMemo(
    () => findSelectedProductName(resumen?.detalle ?? [], productoId),
    [resumen?.detalle, productoId],
  );

  const isSingleProduct = Boolean(
    productoId !== undefined && selectedProductName,
  );

  const decisionBreakdown = useMemo(
    () =>
      isSingleProduct
        ? groupBy(
            resumen?.detalle ?? [],
            (x) => x.decision_nombre,
            (x) => x.total_cantidad,
          )
        : [],
    [resumen?.detalle, isSingleProduct],
  );
  const maxDecision = useMemo(
    () => Math.max(...decisionBreakdown.map((d) => d.total), 1),
    [decisionBreakdown],
  );
  // Full-page spinner only on the initial load; refetches keep showing data.
  const isLoading =
    resumenQuery.isPending &&
    resumenQuery.fetchStatus !== 'idle' &&
    !resumenQuery.data;
  const isError = resumenQuery.isError;
  const isFetching = resumenQuery.isFetching;
  const hasFilters = Boolean(
    fechaDesde || fechaHasta || productoId !== undefined,
  );

  // --- Render ---

  if (isLoading) {
    return (
      <>
        <PageHeader title="Dashboard de Mermas" />
        <LoadingSpinner className="py-20" />
      </>
    );
  }

  if (isError && !resumen) {
    const maxedOut = retryCountRef.current >= WASTE_RETRY_LIMIT;
    return (
      <>
        <PageHeader title="Dashboard de Mermas" />
        <EmptyState
          icon="⚠️"
          title="Error al cargar datos"
          message={
            maxedOut
              ? 'No pudimos cargar los datos. Contactá al administrador.'
              : 'No se pudieron obtener los datos de mermas. Intentá de nuevo más tarde.'
          }
          action={
            !maxedOut ? (
              isFetching ? (
                <span className="mt-3 block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Reintentando…
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    retryCountRef.current += 1;
                    resumenQuery.refetch();
                  }}
                  className="mt-3 rounded-lg bg-brand-green-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-forest/90"
                >
                  Reintentar
                </button>
              )
            ) : undefined
          }
        />
      </>
    );
  }

  if (!resumen) {
    return (
      <>
        <PageHeader title="Dashboard de Mermas" />
        <EmptyState
          icon="🗑️"
          title="Sin datos"
          message="No hay información de mermas disponible."
        />
      </>
    );
  }

  const isEmpty = resumen.detalle.length === 0;
  const isTruncated = resumen.detalle.length >= WASTE_DETAIL_LIMIT;
  const isStale = resumenQuery.isError;

  return (
    <DashboardErrorBoundary>
      <div>
        <PageHeader title="Dashboard de Mermas" />

        {/* Truncation notice — API caps the detail at WASTE_DETAIL_LIMIT */}
        {isTruncated && (
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Mostrando los primeros {WASTE_DETAIL_LIMIT} registros
          </p>
        )}

        {/* Refetch failure banner — keeps the last loaded data visible */}
        {isStale && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            <span>
              No se pudieron cargar los datos para los filtros seleccionados.
              Mostrando datos de la selección anterior.
            </span>
            {retryCountRef.current < WASTE_RETRY_LIMIT &&
              (isFetching ? (
                <span className="shrink-0 text-xs font-medium text-red-600 dark:text-red-300">
                  Reintentando…
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    retryCountRef.current += 1;
                    resumenQuery.refetch();
                  }}
                  className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                >
                  Reintentar
                </button>
              ))}
          </div>
        )}

        {/* Filters */}
        <FilterBar
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          productoId={productoId}
          agruparPor={agruparPor}
          products={products}
          hasFilters={hasFilters}
          isDateRangeInvalid={isDateRangeInvalid}
          onFechaDesdeChange={(v) => handleFilterChange(setFechaDesde, v)}
          onFechaHastaChange={(v) => handleFilterChange(setFechaHasta, v)}
          onProductoIdChange={(v) => handleFilterChange(setProductoId, v)}
          onAgruparPorChange={(v) => handleFilterChange(setAgruparPor, v)}
          onReset={handleReset}
          today={today}
        />

        {isEmpty ? (
          <EmptyState
            icon="🔍"
            title="Sin resultados"
            message="No se encontraron mermas con los filtros seleccionados."
          />
        ) : (
          <div className={isStale ? 'opacity-70' : ''}>
            {/* Stale badge — the shown data does not match the selected filters */}
            {isStale && (
              <span className="mb-4 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Datos desactualizados
              </span>
            )}

            {/* Summary cards */}
            <SummaryCards
              totalGeneral={resumen.total_general}
              totalRegistros={totalRegistros}
              productoMasAfectado={resumen.producto_mas_afectado}
              agruparPor={agruparPor}
            />

            {/* Two-column layout: main chart + trend */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
              {isSingleProduct ? (
                <Card className="lg:col-span-3">
                  <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                    Desglose por decisión
                  </h3>
                  <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    Cómo se distribuyen las pérdidas de{' '}
                    <span className="font-semibold">{selectedProductName}</span>{' '}
                    según la decisión tomada
                  </p>
                  {isTruncated && (
                    <p className="mb-4 text-xs italic text-gray-400 dark:text-gray-500">
                      Basado en los primeros {WASTE_DETAIL_LIMIT} registros.
                    </p>
                  )}
                  {decisionBreakdown.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {decisionBreakdown.map((item) => (
                        <RankingBar
                          key={item.nombre}
                          label={item.nombre}
                          total={item.total}
                          maxTotal={maxDecision}
                          barClass={getDecisionColor(
                            item.nombre,
                            decisionPalette,
                          )}
                          suffix=" uds"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No hay datos de decisiones para este producto.
                    </p>
                  )}
                </Card>
              ) : (
                <Card className="lg:col-span-3">
                  <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                    Ranking de productos más mermados
                  </h3>
                  <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    Comparación de pérdidas totales entre productos — la barra
                    más larga = el producto que más pérdidas genera
                  </p>
                  {isTruncated && (
                    <p className="mb-4 text-xs italic text-gray-400 dark:text-gray-500">
                      Basado en los primeros {WASTE_DETAIL_LIMIT} registros.
                    </p>
                  )}
                  {productRanking.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {productRanking.map((item, idx) => (
                        <RankingBar
                          key={item.nombre}
                          label={item.nombre}
                          total={item.total}
                          maxTotal={maxProductTotal}
                          barClass={rankColor(idx, productRanking.length)}
                          rank={idx + 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No hay datos de productos para mostrar.
                    </p>
                  )}
                </Card>
              )}

              {/* Period trend chart */}
              <PeriodTrendCard
                agruparPor={agruparPor}
                data={periodData}
                maxTotal={maxPeriod}
                selectedProductName={selectedProductName}
                isSingleProduct={isSingleProduct}
                truncated={isTruncated}
              />
            </div>

            {/* Detail table */}
            <DetailTable
              rows={detallePaginado}
              detailLength={resumen.detalle.length}
              agruparPor={agruparPor}
              totalPaginas={totalPaginas}
              paginaSegura={paginaSegura}
              onPrev={() => setPagina((p) => Math.max(1, p - 1))}
              onNext={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            />
          </div>
        )}
      </div>
    </DashboardErrorBoundary>
  );
}
