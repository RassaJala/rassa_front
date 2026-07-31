import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  extractProducts,
  formatDateInput,
  groupBy,
  periodLabel,
  WASTE_DETAIL_LIMIT,
  WASTE_PAGE_SIZE,
  WASTE_RETRY_LIMIT,
  WASTE_STALE_TIME_MS,
  type MermaResumenItem,
  type MermaResumenResponse,
} from '@/common/waste';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PageHeader } from '../components/layout/PageHeader';
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

const decisionColorMap = new Map<string, string>([
  ['donar', 'bg-brand-green-forest'],
  ['tirar', 'bg-brand-red-coral'],
  ['compostar', 'bg-brand-green-olive'],
]);

const fallbackColors = [
  'bg-brand-orange',
  'bg-brand-magenta',
  'bg-brand-mountain-top',
  'bg-brand-mountain-bot',
  'bg-brand-green-sage',
  'bg-brand-mountain-mid',
  'bg-brand-primary-dark',
  'bg-brand-skin',
];

function getDecisionColor(decision: string): string {
  const key = decision.toLowerCase().trim();
  const mapped = decisionColorMap.get(key);
  if (mapped) return mapped;

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % fallbackColors.length;
  return fallbackColors[idx] ?? 'bg-gray-400';
}

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

const variantMap: Record<string, 'success' | 'error' | 'warning'> = {
  donar: 'success',
  tirar: 'error',
};

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
  const today = formatDateInput(new Date());

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
  const mostrarPaginacion = totalPaginas > 1;
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

  return (
    <DashboardErrorBoundary>
      <div>
        <PageHeader title="Dashboard de Mermas" />

        {/* Refetch failure banner — keeps the last loaded data visible */}
        {isError && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            <span>
              No se pudieron actualizar los datos. Mostrando la última
              información cargada.
            </span>
            {retryCountRef.current < WASTE_RETRY_LIMIT && (
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
            )}
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
          <>
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
                  {decisionBreakdown.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {decisionBreakdown.map((item) => {
                        const pct = (item.total / maxDecision) * 100;
                        return (
                          <div key={item.nombre}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {item.nombre}
                              </span>
                              <span className="ml-2 font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                {item.total} uds
                              </span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getDecisionColor(item.nombre)}`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
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
                  {productRanking.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {productRanking.map((item, idx) => {
                        const pct = (item.total / maxProductTotal) * 100;
                        return (
                          <div key={item.nombre}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                <span className="mr-1.5 text-xs text-gray-400">
                                  {idx + 1}.
                                </span>
                                {item.nombre}
                              </span>
                              <span className="ml-2 font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                {item.total}
                              </span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${rankColor(idx, productRanking.length)}`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No hay datos de productos para mostrar.
                    </p>
                  )}
                </Card>
              )}

              {/* Period trend chart */}
              <Card className="lg:col-span-2">
                <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                  Evolución por {agruparPor === 'mes' ? 'mes' : 'semana'}
                </h3>
                <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                  Cada barra = total de unidades mermadas en ese período
                  {isSingleProduct && (
                    <>
                      {' '}
                      para{' '}
                      <span className="font-semibold">
                        {selectedProductName}
                      </span>
                    </>
                  )}
                </p>
                {periodData.length > 0 ? (
                  <div className="flex h-[180px] items-end gap-1.5">
                    {periodData.map((item) => {
                      const pct = (item.total / maxPeriod) * 100;
                      return (
                        <div
                          key={item.nombre}
                          className="flex flex-1 flex-col items-center gap-1"
                        >
                          <span className="text-[11px] font-bold tabular-nums text-gray-600 dark:text-gray-400">
                            {item.total}
                          </span>
                          <div
                            className="w-full max-w-[32px] rounded-t-sm bg-brand-green-forest/80 dark:bg-brand-green-forest/70"
                            style={{
                              height: `${Math.max(pct, 4)}%`,
                              minHeight: 6,
                            }}
                          />
                          <span className="text-center text-[10px] font-medium uppercase tracking-tight text-gray-500 dark:text-gray-400">
                            {item.nombre}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay suficientes datos para mostrar tendencia.
                  </p>
                )}
              </Card>
            </div>

            {/* Detail table */}
            <Card>
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                Detalle de mermas
              </h3>
              {resumen.detalle.length >= WASTE_DETAIL_LIMIT && (
                <p className="-mt-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
                  Mostrando los primeros {WASTE_DETAIL_LIMIT} registros del
                  detalle.
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr>
                      {[
                        'Período',
                        'Producto',
                        'Decisión',
                        'Cantidad',
                        'Registros',
                      ].map((h) => (
                        <th
                          key={h}
                          className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detallePaginado.map((item, idx) => (
                      <tr
                        key={`${item.producto_id}-${item.decision_id}-${item.periodo}-${idx}`}
                        className="border-t border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {periodLabel(item.periodo, agruparPor)}
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                          {item.producto_nombre}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              variantMap[
                                item.decision_nombre.toLowerCase().trim()
                              ] ?? 'warning'
                            }
                          >
                            {item.decision_nombre}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-brand-red-coral">
                          {item.total_cantidad}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          {item.total_mermas}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination — hidden when 0 or 1 pages */}
              {mostrarPaginacion && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Página {paginaSegura} de {totalPaginas}
                    {' — '}
                    {resumen.detalle.length} registros en total
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={paginaSegura <= 1}
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      Anterior
                    </button>

                    <button
                      type="button"
                      disabled={paginaSegura >= totalPaginas}
                      onClick={() =>
                        setPagina((p) => Math.min(totalPaginas, p + 1))
                      }
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardErrorBoundary>
  );
}
