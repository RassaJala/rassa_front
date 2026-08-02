import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sentry from '@sentry/react-native';
import axios from 'axios';

import {
  extractProducts,
  groupBy,
  parseDate,
  periodLabel,
  WASTE_DETAIL_LIMIT,
  WASTE_PAGE_SIZE,
} from '@/common/waste';
import type { MermaResumenResponse, ResumenParams } from '@/common/waste';
import type { MermaPalette } from '@/components/admin/merma/colors';
import { MermaDateModal } from '@/components/admin/merma/MermaDateModal';
import { MermaDetailList } from '@/components/admin/merma/MermaDetailList';
import { MermaErrorBox } from '@/components/admin/merma/MermaErrorBox';
import { MermaFilterBar } from '@/components/admin/merma/MermaFilterBar';
import type {
  AgruparPor,
  PickerTarget,
} from '@/components/admin/merma/MermaFilterBar';
import { MermaProductPickerModal } from '@/components/admin/merma/MermaProductPickerModal';
import { MermaRankingChart } from '@/components/admin/merma/MermaRankingChart';
import { MermaSummaryCards } from '@/components/admin/merma/MermaSummaryCards';
import { MermaTrendChart } from '@/components/admin/merma/MermaTrendChart';
import ErrorBoundary from '@/components/ErrorBoundary';
import { colors } from '@/constants/colors';
import { useAdminColors } from '@/hooks/useAdminColors';
import { fetchMermaResumen } from '@/services/waste';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList } from '@/types';

// --- Navigation --------------------------------------------------------------

type Nav = NativeStackNavigationProp<AdminStackParamList, 'MermaResumen'>;

interface Props {
  readonly navigation: Nav;
}

// --- Component ---------------------------------------------------------------

function fetchErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const status = e.response?.status;
    return status !== undefined && status < 500
      ? 'No se pudieron cargar los datos. Revisá los filtros y probá de nuevo.'
      : 'Error al cargar los datos.';
  }
  return 'Error de conexión. Verificá tu conexión e intentá de nuevo.';
}

export default function MermaResumenScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { bg, surface, fg, muted, border, brand } = useAdminColors();
  const coral = colors.brandRedCoral;
  const segBg = isDark ? colors.admSegBgD : colors.admSegBgL;

  const palette: MermaPalette = {
    surface,
    fg,
    muted,
    border,
    brand,
    bg,
    segBg,
    coral,
  };

  // Date picker state
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const showPicker = pickerTarget !== null;

  // Product picker
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Draft filter values
  const [draftDesde, setDraftDesde] = useState('');
  const [draftHasta, setDraftHasta] = useState('');
  const [productoId, setProductoId] = useState<number | undefined>(undefined);
  const [agruparPor, setAgruparPor] = useState<AgruparPor>('mes');

  // Applied filter values (what triggers fetch)
  const [appliedDesde, setAppliedDesde] = useState('');
  const [appliedHasta, setAppliedHasta] = useState('');

  // Pagination
  const [pagina, setPagina] = useState(1);
  const scrollRef = useRef<ScrollView>(null);

  // Data
  const [data, setData] = useState<MermaResumenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(0);
  const retryCountRef = useRef(0);
  const dataLoadedAtRef = useRef(0);

  // Date validation
  const desdeDate = draftDesde ? parseDate(draftDesde) : null;
  const hastaDate = draftHasta ? parseDate(draftHasta) : null;
  const isDateRangeInvalid =
    desdeDate !== null && hastaDate !== null && desdeDate > hastaDate;

  // Fetch
  const fetchData = useCallback(async () => {
    const id = ++fetchRef.current;
    setLoading(true);
    setError(null);
    try {
      const params: ResumenParams = { agrupar_por: agruparPor };
      if (appliedDesde) params.fecha_desde = appliedDesde;
      if (appliedHasta) params.fecha_hasta = appliedHasta;
      if (productoId !== undefined) params.producto_id = productoId;
      const result = await fetchMermaResumen(params);
      if (id !== fetchRef.current) return; // stale, discard
      retryCountRef.current = 0;
      dataLoadedAtRef.current = Date.now();
      setData(result);
      setPagina(1);
    } catch (e) {
      if (id !== fetchRef.current) return;
      retryCountRef.current += 1;
      console.error(e instanceof Error ? e.message : e);
      Sentry.captureException(e);
      setError(fetchErrorMessage(e));
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  }, [appliedDesde, appliedHasta, agruparPor, productoId]);

  // Fetch on mount + when applied filters or grouping change
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Reset the retry budget when the applied filters change: each combination
  // is an independent search, so manual retries must not carry over between
  // different filter sets (same defect fixed on web in dbb3c04).
  useEffect(() => {
    retryCountRef.current = 0;
  }, [appliedDesde, appliedHasta, agruparPor, productoId]);

  // Handlers
  const handleApply = () => {
    if (isDateRangeInvalid) return;
    setAppliedDesde(draftDesde);
    setAppliedHasta(draftHasta);
  };

  const handleReset = () => {
    setDraftDesde('');
    setDraftHasta('');
    setAppliedDesde('');
    setAppliedHasta('');
    setProductoId(undefined);
    setAgruparPor('mes');
    setPagina(1);
  };

  // Derived data
  const detalle = useMemo(() => data?.detalle ?? [], [data?.detalle]);
  const isSingleProduct = productoId !== undefined;

  const {
    productRanking,
    maxProductTotal,
    periodData,
    maxPeriod,
    totalRegistros,
  } = useMemo(() => {
    const ranking = isSingleProduct
      ? groupBy(
          detalle,
          (x) => x.decision_nombre,
          (x) => x.total_cantidad,
        )
      : groupBy(
          detalle,
          (x) => x.producto_nombre,
          (x) => x.total_cantidad,
        );
    const maxProd = Math.max(...ranking.map((p) => p.total), 1);
    const sorted = [...detalle].sort((a, b) =>
      a.periodo.localeCompare(b.periodo),
    );
    const periods = groupBy(
      sorted,
      (x) => x.periodo,
      (x) => x.total_cantidad,
    ).map((p) => ({
      nombre: periodLabel(p.nombre, data?.agrupacion ?? 'mes'),
      total: p.total,
    }));
    const maxPer = Math.max(...periods.map((p) => p.total), 1);
    const totalRegs = detalle.reduce((sum, item) => sum + item.total_mermas, 0);
    return {
      productRanking: ranking,
      maxProductTotal: maxProd,
      periodData: periods,
      maxPeriod: maxPer,
      totalRegistros: totalRegs,
    };
  }, [detalle, isSingleProduct, data?.agrupacion]);

  const products = useMemo(() => extractProducts(detalle), [detalle]);

  // Describe the applied filters so the error box can show what failed.
  const errorContext = useMemo(() => {
    const parts: string[] = [];
    if (appliedDesde) parts.push(`desde ${appliedDesde}`);
    if (appliedHasta) parts.push(`hasta ${appliedHasta}`);
    if (productoId !== undefined) {
      const name = products.find((p) => p.id === productoId)?.nombre;
      parts.push(name ? `producto «${name}»` : `producto id ${productoId}`);
    }
    parts.push(agruparPor === 'mes' ? 'por mes' : 'por semana');
    return parts.join(', ');
  }, [appliedDesde, appliedHasta, productoId, agruparPor, products]);

  // If the selected product no longer exists in the data, drop the filter
  // instead of showing an empty dashboard with a stale selection.
  useEffect(() => {
    if (
      productoId !== undefined &&
      products.length > 0 &&
      !products.some((p) => p.id === productoId)
    ) {
      setProductoId(undefined);
    }
  }, [products, productoId]);

  const totalPaginas = Math.max(1, Math.ceil(detalle.length / WASTE_PAGE_SIZE));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const detallePaginado = useMemo(
    () =>
      detalle.slice(
        (paginaSegura - 1) * WASTE_PAGE_SIZE,
        paginaSegura * WASTE_PAGE_SIZE,
      ),
    [detalle, paginaSegura],
  );

  const isEmpty = detalle.length === 0 && !loading;
  const isTruncated = detalle.length >= WASTE_DETAIL_LIMIT;
  const isRetrying = loading && data !== null && retryCountRef.current > 0;
  const showReset =
    appliedDesde !== '' ||
    appliedHasta !== '' ||
    agruparPor !== 'mes' ||
    productoId !== undefined;

  const scrollTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Render ──

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* ═══ Header ═══ */}
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [
                  styles.backBtn,
                  { backgroundColor: surface, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={22}
                  color={fg}
                />
              </Pressable>
              <Text style={[styles.headerTitle, { color: fg }]}>
                Dashboard de Mermas
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {isTruncated ? (
              <Text style={[styles.truncationNotice, { color: muted }]}>
                Mostrando los primeros {WASTE_DETAIL_LIMIT} registros
              </Text>
            ) : null}

            {/* ═══ Filters ═══ */}
            <MermaFilterBar
              draftDesde={draftDesde}
              draftHasta={draftHasta}
              productId={productoId}
              products={products}
              agruparPor={agruparPor}
              isDateRangeInvalid={isDateRangeInvalid}
              showReset={showReset}
              onOpenDate={setPickerTarget}
              onOpenProduct={() => setShowProductPicker(true)}
              onAgrupar={setAgruparPor}
              onApply={handleApply}
              onReset={handleReset}
              palette={palette}
            />

            {/* ═══ Error (initial load or refetch failure) ═══ */}
            {error !== null && (
              <MermaErrorBox
                message={error}
                context={errorContext}
                retryCount={retryCountRef.current}
                onRetry={() => void fetchData()}
              />
            )}

            {/* ═══ Stale-data banner (refetch failed but previous data remains) ═══ */}
            {error !== null && data !== null ? (
              <View
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={[
                  styles.staleBox,
                  { backgroundColor: coral, borderColor: border },
                ]}
              >
                <MaterialCommunityIcons
                  name="alert-outline"
                  size={18}
                  color={fg}
                />
                <Text style={[styles.staleText, { color: fg }]}>
                  No se pudieron cargar los datos para los filtros
                  seleccionados. Mostrando datos de la última consulta exitosa.
                  <Text style={{ fontSize: 11, opacity: 0.8 }}>
                    {'\n'}Actualizado:{' '}
                    {new Date(dataLoadedAtRef.current).toLocaleString('es-MX', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* ═══ Retry feedback (refetch after a previous failure) ═══ */}
            {isRetrying ? (
              <View style={styles.retryingBox}>
                <ActivityIndicator size="small" color={brand} />
                <Text style={[styles.retryingText, { color: muted }]}>
                  Reintentando…
                </Text>
              </View>
            ) : null}

            {/* ═══ Loading (only when there is nothing to show yet) ═══ */}
            {loading && data === null ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={brand} />
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: muted,
                    fontWeight: '500',
                  }}
                >
                  Cargando...
                </Text>
              </View>
            ) : null}

            {/* ═══ Data (kept visible during refetch and on refetch failure) ═══ */}
            {data !== null && (
              <>
                {isEmpty ? (
                  <View style={styles.centerBox}>
                    <MaterialCommunityIcons
                      name="inbox-outline"
                      size={48}
                      color={muted}
                    />
                    <Text
                      style={{
                        marginTop: 12,
                        fontSize: 16,
                        fontWeight: '600',
                        color: muted,
                      }}
                    >
                      Sin resultados
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: muted,
                        textAlign: 'center',
                      }}
                    >
                      No se encontraron mermas con los filtros seleccionados.
                    </Text>
                  </View>
                ) : (
                  <>
                    <MermaSummaryCards
                      totalGeneral={data.total_general}
                      productoMasAfectado={data.producto_mas_afectado}
                      totalRegistros={totalRegistros}
                      palette={palette}
                    />

                    <MermaRankingChart
                      isSingleProduct={isSingleProduct}
                      ranking={productRanking}
                      maxTotal={maxProductTotal}
                      truncated={isTruncated}
                      isDark={isDark}
                      palette={palette}
                    />

                    <MermaTrendChart
                      data={periodData}
                      maxTotal={maxPeriod}
                      agruparPor={agruparPor}
                      truncated={isTruncated}
                      palette={palette}
                    />

                    <MermaDetailList
                      rows={detallePaginado}
                      detailLength={detalle.length}
                      agrupacion={data.agrupacion}
                      totalPaginas={totalPaginas}
                      paginaSegura={paginaSegura}
                      onPrev={() => {
                        setPagina((p) => Math.max(1, p - 1));
                        scrollTop();
                      }}
                      onNext={() => {
                        setPagina((p) => Math.min(totalPaginas, p + 1));
                        scrollTop();
                      }}
                      palette={palette}
                    />
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* ═══ Date picker modal ═══ */}
        <MermaDateModal
          visible={showPicker}
          onClose={() => setPickerTarget(null)}
          onSelectDate={(iso) => {
            if (pickerTarget === 'desde') {
              setDraftDesde(iso);
            } else {
              setDraftHasta(iso);
            }
            setPickerTarget(null);
          }}
          initialDate={pickerTarget === 'desde' ? draftDesde : draftHasta}
          palette={palette}
        />

        {/* ═══ Product picker modal ═══ */}
        <MermaProductPickerModal
          visible={showProductPicker}
          onClose={() => setShowProductPicker(false)}
          onSelect={(id) => {
            setProductoId(id);
            setPagina(1);
          }}
          selectedId={productoId}
          products={products}
          palette={palette}
        />
      </View>
    </ErrorBoundary>
  );
}

// --- Styles ------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  content: { flex: 1, paddingTop: 48, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  truncationNotice: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  retryingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  retryingText: { fontSize: 13, fontWeight: '600' },
  staleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    opacity: 0.9,
  },
  staleText: { flex: 1, fontSize: 12, fontWeight: '500' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
