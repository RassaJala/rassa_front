import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import type {
  Settlement,
  SettlementEstado,
  SettlementListParams,
} from '@/common/settlements';
import { parseDate } from '@/common/waste';
import type { MermaPalette } from '@/components/admin/merma/colors';
import { MermaDateModal } from '@/components/admin/merma/MermaDateModal';
import type { PickerTarget } from '@/components/admin/merma/MermaFilterBar';
import { FarmerPickerModal } from '@/components/admin/settlements/FarmerPickerModal';
import { SettlementCard } from '@/components/admin/settlements/SettlementCard';
import { SettlementFilterBar } from '@/components/admin/settlements/SettlementFilterBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import { useAdminColors } from '@/hooks/useAdminColors';
import { useFarmers } from '@/hooks/useFarmers';
import { fetchSettlements } from '@/services/settlements';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList } from '@/types';
import { parseApiError } from '@/utils/apiErrors';

const PAGE_SIZE = 10;
const EMPTY_FILTERS: SettlementListParams = {};

type Nav = NativeStackNavigationProp<AdminStackParamList, 'SettlementList'>;

interface Props {
  readonly navigation: Nav;
}

type ToastState = {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
};

function Paginator({
  totalPages,
  safePage,
  setPage,
  palette,
}: {
  totalPages: number;
  safePage: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  palette: MermaPalette;
}): React.JSX.Element | null {
  const { border, fg, muted, brand } = palette;

  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <View style={styles.paginatorRow}>
      <Pressable
        onPress={() => setPage((p) => Math.max(1, p - 1))}
        disabled={safePage <= 1}
        style={[styles.paginatorBtn, { borderColor: border }]}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: safePage <= 1 ? muted : fg,
          }}
        >
          ← Anterior
        </Text>
      </Pressable>

      <View style={styles.paginatorPages}>
        {pages.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPage(p)}
            style={[
              styles.pageDot,
              { backgroundColor: p === safePage ? brand : palette.bg },
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: p === safePage ? '700' : '500',
                color: p === safePage ? colors.iconWhite : fg,
              }}
            >
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={safePage >= totalPages}
        style={[styles.paginatorBtn, { borderColor: border }]}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: safePage >= totalPages ? muted : fg,
          }}
        >
          Siguiente →
        </Text>
      </Pressable>
    </View>
  );
}

function EmptyState({
  hasFilters,
  onReset,
  palette,
}: {
  hasFilters: boolean;
  onReset: () => void;
  palette: MermaPalette;
}): React.JSX.Element {
  const { muted, brand, border } = palette;
  return (
    <View style={styles.emptyBox}>
      <MaterialCommunityIcons
        name="file-document-remove-outline"
        size={64}
        color={muted}
      />
      <Text style={[styles.emptyText, { color: muted }]}>
        {hasFilters
          ? 'No se encontraron liquidaciones con los filtros seleccionados.'
          : 'No hay liquidaciones registradas.'}
      </Text>
      {hasFilters ? (
        <Pressable
          onPress={onReset}
          style={[styles.emptyReset, { borderColor: border }]}
        >
          <Text style={[styles.emptyResetText, { color: brand }]}>
            Limpiar filtros
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function SettlementListScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { bg, surface, fg, muted, border, brand } = useAdminColors();
  const segBg = isDark ? colors.admSegBgD : colors.admSegBgL;
  const coral = colors.brandRedCoral;
  const palette = useMemo<MermaPalette>(
    () => ({ surface, fg, muted, border, brand, bg, segBg, coral }),
    [surface, fg, muted, border, brand, bg, segBg, coral],
  );

  const { farmers } = useFarmers();

  // Draft date fields (modal) vs applied filters (post-Buscar). Estado and
  // agricultor apply immediately; dates only after Buscar (S2).
  const [draftDesde, setDraftDesde] = useState('');
  const [draftHasta, setDraftHasta] = useState('');
  const [applied, setApplied] = useState<SettlementListParams>(EMPTY_FILTERS);

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [showFarmerPicker, setShowFarmerPicker] = useState(false);

  const [page, setPage] = useState(1);

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((message: string, type: ToastState['type']) => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<Settlement[]>({
    queryKey: ['settlements', applied],
    queryFn: () => fetchSettlements(applied),
  });

  const errorMessage = parseApiError(error, 'Error al cargar liquidaciones');

  // Refetch failure with stale data: keep the list and surface the message.
  useEffect(() => {
    if (isError && data.length > 0) {
      showToast(errorMessage, 'error');
    }
  }, [isError, data.length, errorMessage, showToast]);

  const desdeDate = draftDesde ? parseDate(draftDesde) : null;
  const hastaDate = draftHasta ? parseDate(draftHasta) : null;
  const isDateRangeInvalid =
    desdeDate !== null && hastaDate !== null && desdeDate > hastaDate;

  const showReset =
    draftDesde !== '' ||
    draftHasta !== '' ||
    applied.agricultor !== undefined ||
    applied.estado !== undefined ||
    applied.periodo_inicio !== undefined ||
    applied.periodo_fin !== undefined;

  const handleApply = useCallback(() => {
    if (isDateRangeInvalid) return;
    setPage(1);
    setApplied((prev) => {
      const next: SettlementListParams = { ...prev };
      if (draftDesde) next.periodo_inicio = draftDesde;
      else delete next.periodo_inicio;
      if (draftHasta) next.periodo_fin = draftHasta;
      else delete next.periodo_fin;
      return next;
    });
  }, [isDateRangeInvalid, draftDesde, draftHasta]);

  const handleReset = useCallback(() => {
    setDraftDesde('');
    setDraftHasta('');
    setPage(1);
    setApplied({});
  }, []);

  const handleEstadoChange = useCallback((estado: SettlementEstado | '') => {
    setPage(1);
    setApplied((prev) => {
      const next: SettlementListParams = { ...prev };
      if (estado) next.estado = estado;
      else delete next.estado;
      return next;
    });
  }, []);

  const handleFarmerSelect = useCallback((farmerId: number | undefined) => {
    setShowFarmerPicker(false);
    setPage(1);
    setApplied((prev) => {
      const next: SettlementListParams = { ...prev };
      if (farmerId !== undefined) next.agricultor = farmerId;
      else delete next.agricultor;
      return next;
    });
  }, []);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => data.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [data, safePage],
  );

  const keyExtractor = useCallback(
    (item: Settlement) => String(item.id_liquidacion),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Settlement }) => (
      <SettlementCard
        settlement={item}
        palette={palette}
        onPress={() =>
          navigation.navigate('SettlementDetail', {
            settlementId: item.id_liquidacion,
          })
        }
      />
    ),
    [navigation, palette],
  );

  // ── Full error state (no data to fall back on) ──
  if (isError && data.length === 0) {
    return (
      <ErrorBoundary>
        <View style={[styles.container, { backgroundColor: bg }]}>
          <View style={styles.errorBox}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={muted}
            />
            <Text style={[styles.errorText, { color: muted }]}>
              {errorMessage}
            </Text>
            <Pressable
              onPress={() => void refetch()}
              style={[styles.errorRetry, { borderColor: border }]}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={brand} />
              <Text style={[styles.errorRetryText, { color: brand }]}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        </View>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: surface, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={fg} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: fg }]}>Liquidaciones</Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={brand} />
          </View>
        ) : (
          <FlatList
            data={paginated}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListHeaderComponent={
              <View style={{ gap: 12 }}>
                <SettlementFilterBar
                  draftDesde={draftDesde}
                  draftHasta={draftHasta}
                  isDateRangeInvalid={isDateRangeInvalid}
                  farmerId={applied.agricultor}
                  farmers={farmers}
                  selectedEstado={applied.estado ?? ''}
                  showReset={showReset}
                  onOpenDate={setPickerTarget}
                  onOpenFarmer={() => setShowFarmerPicker(true)}
                  onEstadoChange={handleEstadoChange}
                  onApply={handleApply}
                  onReset={handleReset}
                  palette={palette}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: fg,
                    paddingBottom: 4,
                  }}
                >
                  {data.length} liquidaciones
                </Text>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                hasFilters={showReset}
                onReset={handleReset}
                palette={palette}
              />
            }
            ListFooterComponent={
              <Paginator
                totalPages={totalPages}
                safePage={safePage}
                setPage={setPage}
                palette={palette}
              />
            }
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
                tintColor={brand}
                colors={[brand]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        <MermaDateModal
          visible={pickerTarget !== null}
          onClose={() => setPickerTarget(null)}
          onSelectDate={(iso) => {
            if (pickerTarget === 'desde') setDraftDesde(iso);
            else if (pickerTarget === 'hasta') setDraftHasta(iso);
            setPickerTarget(null);
          }}
          initialDate={pickerTarget === 'desde' ? draftDesde : draftHasta}
          palette={palette}
        />

        <FarmerPickerModal
          visible={showFarmerPicker}
          onClose={() => setShowFarmerPicker(false)}
          onSelect={handleFarmerSelect}
          selectedId={applied.agricultor}
          farmers={farmers}
          palette={palette}
        />

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onDismiss={hideToast}
        />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
    gap: 10,
  },
  loadingBox: { flex: 1, alignItems: 'center', paddingTop: 60 },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 15,
  },
  errorRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorRetryText: { fontSize: 14, fontWeight: '600' },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 15,
  },
  emptyReset: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyResetText: { fontSize: 14, fontWeight: '600' },
  paginatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  paginatorBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginatorPages: {
    flexDirection: 'row',
    gap: 4,
  },
  pageDot: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
