import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { formatearFecha, formatoDinero, hoyISO } from '@/common/cortes';
import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import { crearCorte, getCortes, getTeorico } from '@/services/cortes';
import type { Corte, TeoricoResponse } from '@/services/cortes';
import { useTheme } from '@/store/ThemeContext';
import { extractApiError } from '@/utils/apiErrors';

export default function CashClosingScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const activeBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const inputBg = isDark ? colors.admInactiveBgD : colors.admInactiveBgL;
  const coralBg = isDark ? colors.admCoralBgD : colors.admCoralBgL;
  const redCoral = colors.brandRedCoral;
  const success = colors.success;
  const white = colors.iconWhite;

  const [monto, setMonto] = useState('');
  const [ultimoCorte, setUltimoCorte] = useState<Corte | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'info' });

  const queryClient = useQueryClient();
  const netInfo = useNetInfo();

  const today = hoyISO();

  const {
    data: cortes = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<Corte[]>({
    queryKey: ['cortes'],
    queryFn: getCortes,
    staleTime: 30_000,
  });

  const { data: teorico } = useQuery<TeoricoResponse>({
    queryKey: ['cortes-teorico', today],
    queryFn: () => getTeorico(today),
    staleTime: 30_000,
  });

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ visible: true, message, type });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const confirmarMutation = useMutation({
    mutationFn: async (montoReal: string) => crearCorte(montoReal, hoyISO()),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['cortes'] });
      const prev = queryClient.getQueryData<Corte[]>(['cortes']);
      return { prev };
    },
    onSuccess: (corte) => {
      setUltimoCorte(corte);
      setMonto('');
      showToast('Corte registrado correctamente', 'success');
    },
    onError: (
      error: unknown,
      _montoReal: string,
      context: { prev: Corte[] | undefined } | undefined,
    ) => {
      if (context?.prev) {
        queryClient.setQueryData(['cortes'], context.prev);
      }
      const detail = extractApiError(error, ['fecha', 'monto_real']);
      showToast(detail, 'error');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cortes'] });
      void queryClient.invalidateQueries({ queryKey: ['cortes-teorico'] });
    },
  });

  const confirmar = useCallback(() => {
    const valor = monto.trim();
    const num = parseFloat(valor);
    if (!valor || confirmarMutation.isPending || Number.isNaN(num) || num < 0) {
      return;
    }
    confirmarMutation.mutate(valor);
  }, [monto, confirmarMutation]);

  const keyExtractor = useCallback((item: Corte) => String(item.id_corte), []);

  const renderCorte = useCallback(
    ({ item }: { readonly item: Corte }) => {
      const hasDiff = parseFloat(item.diferencia) !== 0;
      const cardBg = hasDiff ? coralBg : surface;
      const cardBorder = hasDiff ? redCoral : border;
      const diffColor = hasDiff ? redCoral : success;

      return (
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: cardBorder,
            padding: 16,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: fg }}>
                {formatearFecha(item.fecha)}
              </Text>
              <View
                style={{
                  backgroundColor: activeBg,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginTop: 6,
                  alignSelf: 'flex-start',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: brand,
                    textTransform: 'capitalize',
                  }}
                >
                  {item.estado}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: diffColor }}>
              {formatoDinero(item.diferencia)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 10,
            }}
          >
            <Text style={{ fontSize: 13, color: muted }}>Monto esperado</Text>
            <Text style={{ fontSize: 13, color: fg }}>
              {formatoDinero(item.monto_teorico)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            <Text style={{ fontSize: 13, color: muted }}>Monto contado</Text>
            <Text style={{ fontSize: 13, color: fg }}>
              {formatoDinero(item.monto_real)}
            </Text>
          </View>
        </View>
      );
    },
    [surface, border, fg, muted, activeBg, brand, coralBg, redCoral, success],
  );

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={muted}
        />
        <Text
          style={{
            marginTop: 12,
            fontSize: 15,
            color: muted,
            textAlign: 'center',
          }}
        >
          Error al cargar cortes de caja
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <MaterialCommunityIcons name="refresh" size={18} color={brand} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: brand }}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  const montoEsperado = teorico?.monto_teorico ?? '0.00';
  const canConfirmar = monto.trim().length > 0 && !confirmarMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.02,
            color: fg,
          }}
        >
          Corte de caja
        </Text>
      </View>

      <FlatList
        data={cortes}
        renderItem={renderCorte}
        keyExtractor={keyExtractor}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            {netInfo.isConnected === false && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: coralBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: redCoral,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: 12,
                }}
              >
                <MaterialCommunityIcons
                  name="wifi-off"
                  size={18}
                  color={redCoral}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: redCoral,
                    flex: 1,
                  }}
                >
                  Sin conexión a Internet — los datos pueden estar
                  desactualizados
                </Text>
              </View>
            )}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: muted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Hoy
            </Text>
            <View
              style={{
                backgroundColor: surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: border,
                padding: 16,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, color: muted }}>
                  Monto esperado
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: fg }}>
                  {formatoDinero(montoEsperado)}
                </Text>
              </View>

              <Text style={{ fontSize: 13, color: muted, marginTop: 12 }}>
                Monto contado
              </Text>

              <TextInput
                value={monto}
                onChangeText={(texto) => {
                  const cleaned = texto
                    .replace(/[^\d.]/g, '')
                    .replace(/(\..*)\./g, '$1');
                  setMonto(cleaned);
                  setUltimoCorte(null);
                }}
                keyboardType="decimal-pad"
                maxLength={15}
                placeholder="0.00"
                placeholderTextColor={colors.placeholder}
                style={{
                  backgroundColor: inputBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginTop: 6,
                  fontSize: 16,
                  color: fg,
                }}
              />

              <Pressable
                onPress={confirmar}
                disabled={!canConfirmar}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: brand,
                  borderRadius: 10,
                  paddingVertical: 12,
                  marginTop: 12,
                  opacity: canConfirmar ? 1 : 0.5,
                }}
              >
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color={white}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: white,
                  }}
                >
                  Confirmar corte
                </Text>
              </Pressable>

              {ultimoCorte != null &&
                (() => {
                  const diff = parseFloat(ultimoCorte.diferencia);
                  const esCero = diff === 0;
                  const bannerColor = esCero ? success : redCoral;
                  const texto = esCero
                    ? 'Caja cuadrada — diferencia $0.00'
                    : (diff > 0
                      ? `Sobró ${formatoDinero(ultimoCorte.diferencia)}`
                      : `Faltó ${formatoDinero(String(Math.abs(diff)))}`);
                  return (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: esCero
                          ? colors.activeGreenBg
                          : coralBg,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: bannerColor,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        marginTop: 12,
                      }}
                    >
                      <MaterialCommunityIcons
                        name={
                          esCero
                            ? 'check-circle-outline'
                            : 'alert-circle-outline'
                        }
                        size={18}
                        color={bannerColor}
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: bannerColor,
                        }}
                      >
                        {texto}
                      </Text>
                    </View>
                  );
                })()}
            </View>

            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: muted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginTop: 20,
                marginBottom: 8,
              }}
            >
              Historial
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 40,
            }}
          >
            <MaterialCommunityIcons
              name="calendar-remove-outline"
              size={48}
              color={muted}
            />
            <Text
              style={{
                marginTop: 12,
                fontSize: 15,
                color: muted,
                textAlign: 'center',
              }}
            >
              No hay cortes registrados
            </Text>
          </View>
        }
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40,
          flexGrow: 1,
        }}
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

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </View>
  );
}
