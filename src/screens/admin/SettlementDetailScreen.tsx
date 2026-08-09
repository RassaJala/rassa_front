import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  MarcarPagadaParams,
  SettlementDetail,
} from '@/common/settlements';
import { formatDisplayDate } from '@/common/waste';
import type { AdminPalette } from '@/components/admin/merma/colors';
import PagarModal from '@/components/admin/settlements/PagarModal';
import SettlementBreakdown from '@/components/admin/settlements/SettlementBreakdown';
import SettlementEstadoBadge from '@/components/admin/settlements/SettlementEstadoBadge';
import SettlementVentasList from '@/components/admin/settlements/SettlementVentasList';
import ErrorBoundary from '@/components/ErrorBoundary';
import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import { formatearFecha } from '@/constants/dates';
import { useAdminColors } from '@/hooks/useAdminColors';
import { useToast } from '@/hooks/useToast';
import {
  fetchSettlement,
  marcarSettlementPagada,
} from '@/services/settlements';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList } from '@/types';
import { parseApiError, unwrapCause } from '@/utils/apiErrors';
import { formatMoney } from '@/utils/money';

type Props = NativeStackScreenProps<AdminStackParamList, 'SettlementDetail'>;

// A 404 on the detail endpoint is ambiguous: the endpoint may not be deployed
// yet, or the id simply does not exist. Either way "Liquidación no encontrada"
// is the honest, actionable message for an admin instead of the generic error
// (R4-1). All other failures fall back to parseApiError as before.
function getDetailErrorMessage(error: unknown): string {
  const candidate = unwrapCause(error);
  const status =
    typeof candidate === 'object' && candidate !== null
      ? (candidate as { response?: { status?: number } }).response?.status
      : undefined;
  if (status === 404) return 'Liquidación no encontrada';
  return parseApiError(error, 'Error al cargar la liquidación');
}

export default function SettlementDetailScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const { settlementId } = route.params;
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { bg, surface, fg, muted, border, brand } = useAdminColors();
  const segBg = isDark ? colors.admSegBgD : colors.admSegBgL;
  const coral = colors.brandRedCoral;
  const palette: AdminPalette = {
    surface,
    fg,
    muted,
    border,
    brand,
    bg,
    segBg,
    coral,
  };

  const queryClient = useQueryClient();

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SettlementDetail>({
    queryKey: ['settlement', settlementId],
    queryFn: ({ signal }) => fetchSettlement(settlementId, signal),
  });

  const [pagarVisible, setPagarVisible] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const pagarMutation = useMutation({
    mutationFn: (params: MarcarPagadaParams) =>
      marcarSettlementPagada(settlementId, params),
    onSuccess: (res) => {
      setPagarVisible(false);
      showToast(res.message || 'Pago registrado correctamente', 'success');
      void refetch();
      // S5: a still-mounted SettlementListScreen must reflect 'pagada'
      // without a manual pull-to-refresh.
      void queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: () => {
      // The PagarModal surfaces the business error inline (its onConfirm
      // catches the mutateAsync rejection); a second toast here would
      // duplicate the message. Still sync the list with reality (S3).
      void queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });

  const errorMessage = getDetailErrorMessage(error);

  if (isError && !detail) {
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
          <Text style={[styles.headerTitle, { color: fg }]}>
            Liquidación #{settlementId}
          </Text>
          {detail ? <SettlementEstadoBadge estado={detail.estado} /> : null}
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={brand} />
          </View>
        ) : detail ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.section,
                { backgroundColor: surface, borderColor: border },
              ]}
            >
              <Text style={[styles.farmerName, { color: fg }]}>
                {detail.agricultor_nombre}
              </Text>
              <Text style={[styles.periodo, { color: muted }]}>
                {formatDisplayDate(detail.periodo_inicio)} –{' '}
                {formatDisplayDate(detail.periodo_fin)}
              </Text>
              <Text style={[styles.creada, { color: muted }]}>
                Creada el {formatearFecha(detail.creado_en)}
              </Text>
            </View>

            <SettlementBreakdown
              montoVentas={detail.monto_ventas}
              comision={detail.comision}
              montoLiquidar={detail.monto_liquidar}
              palette={palette}
            />

            <SettlementVentasList ventas={detail.ventas} palette={palette} />

            {detail.pago_liquidacion ? (
              <View
                style={[
                  styles.pagoCard,
                  { backgroundColor: surface, borderColor: border },
                ]}
              >
                <View style={styles.pagoHeader}>
                  <Text style={[styles.pagoTitle, { color: fg }]}>
                    Pago registrado
                  </Text>
                  <View style={styles.pagoFolioBadge}>
                    <Text style={styles.pagoFolioText}>
                      {detail.pago_liquidacion.folio}
                    </Text>
                  </View>
                </View>
                <View style={styles.pagoRow}>
                  <Text style={[styles.pagoLabel, { color: muted }]}>
                    Método
                  </Text>
                  <Text style={[styles.pagoValue, { color: fg }]}>
                    {detail.pago_liquidacion.tipo_pago_nombre}
                  </Text>
                </View>
                <View style={styles.pagoRow}>
                  <Text style={[styles.pagoLabel, { color: muted }]}>
                    Monto
                  </Text>
                  <Text style={[styles.pagoValue, { color: fg }]}>
                    {formatMoney(detail.pago_liquidacion.monto)}
                  </Text>
                </View>
                <View style={styles.pagoRow}>
                  <Text style={[styles.pagoLabel, { color: muted }]}>
                    Fecha
                  </Text>
                  <Text style={[styles.pagoValue, { color: fg }]}>
                    {formatearFecha(detail.pago_liquidacion.fecha_pago)}
                  </Text>
                </View>
                {detail.pago_liquidacion.referencia ? (
                  <View style={styles.pagoRow}>
                    <Text style={[styles.pagoLabel, { color: muted }]}>
                      Referencia
                    </Text>
                    <Text style={[styles.pagoValue, { color: fg }]}>
                      {detail.pago_liquidacion.referencia}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => setPagarVisible(true)}
                  style={[styles.pagarBtn, { backgroundColor: brand }]}
                >
                  <MaterialCommunityIcons
                    name="cash-check"
                    size={20}
                    color={colors.iconWhite}
                  />
                  <Text style={styles.pagarBtnText}>Marcar como pagada</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        ) : null}

        <PagarModal
          visible={pagarVisible}
          onClose={() => setPagarVisible(false)}
          onConfirm={(params) => pagarMutation.mutateAsync(params)}
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
    gap: 10,
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
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', paddingTop: 60 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  farmerName: { fontSize: 18, fontWeight: '700' },
  periodo: { fontSize: 13, marginTop: 2 },
  creada: { fontSize: 12, marginTop: 2 },
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
  pagoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  pagoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pagoTitle: { fontSize: 14, fontWeight: '700' },
  pagoFolioBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: colors.settlementPagadaBg,
  },
  pagoFolioText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.settlementPagadaFg,
  },
  pagoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pagoLabel: { fontSize: 13 },
  pagoValue: { fontSize: 14, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pagarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  pagarBtnText: { fontSize: 15, fontWeight: '700', color: colors.iconWhite },
});
