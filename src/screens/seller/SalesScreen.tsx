import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useTheme } from '@/store/ThemeContext';
import type { Order, PedidoEstado } from '@/types';
import { extractApiError } from '@/utils/apiError';

interface FilterOption {
  readonly label: string;
  readonly value: PedidoEstado | '';
}

const ESTADOS: FilterOption[] = [
  { label: 'Todos', value: '' },
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Confirmado', value: 'confirmado' },
  { label: 'Preparación', value: 'en_preparacion' },
  { label: 'Listo', value: 'listo_para_retirar' },
  { label: 'Entregado', value: 'entregado' },
  { label: 'Cancelado', value: 'cancelado' },
];

interface Accion {
  readonly label: string;
  readonly estado: string;
  readonly icon: string;
  readonly color: string;
}

const ACCIONES: Readonly<Record<string, Accion | null>> = {
  pendiente: {
    label: 'Confirmar',
    estado: 'confirmado',
    icon: 'check-circle-outline',
    color: colors.success,
  },
  confirmado: {
    label: 'Preparar',
    estado: 'en_preparacion',
    icon: 'fire',
    color: colors.warning,
  },
  en_preparacion: {
    label: 'Marcar Listo',
    estado: 'listo_para_retirar',
    icon: 'package-variant-closed',
    color: colors.info,
  },
  listo_para_retirar: {
    label: 'Entregar',
    estado: 'entregado',
    icon: 'handshake',
    color: colors.success,
  },
  entregado: null,
  cancelado: null,
};

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SalesScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const activeBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const white = colors.iconWhite;
  const redCoral = colors.brandRedCoral;

  const [filter, setFilter] = useState<PedidoEstado | ''>('');
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'info' });
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();
  const isRowPending = useCallback(
    (id: number) => pendingIds.has(id),
    [pendingIds],
  );

  const queryParams = filter ? `?estado=${filter}` : '';
  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<Order[]>({
    queryKey: ['pedidos', filter],
    queryFn: async () => {
      const response = await api.get<{ results?: Order[] }>(
        `/pedidos/${queryParams}`,
      );
      const body = response.data;
      return body.results ?? [];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: {
      readonly pedidoId: number;
      readonly nuevoEstado: string;
    }) => {
      const response = await api.patch<{ message: string }>(
        `/pedidos/${payload.pedidoId}/status/`,
        { nuevo_estado: payload.nuevoEstado },
      );
      return response.data;
    },
    onMutate: ({ pedidoId }) => {
      setPendingIds((prev) => new Set(prev).add(pedidoId));
    },
    onSettled: (_data, _error, { pedidoId }) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(pedidoId);
        return next;
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      showToast('Estado actualizado correctamente', 'success');
    },
    onError: (error: unknown) => {
      const detail = extractApiError(error, ['nuevo_estado']);
      showToast(detail, 'error');
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (pedidoId: number) => {
      const response = await api.patch<{ message: string }>(
        `/pedidos/${pedidoId}/status/`,
        { nuevo_estado: 'cancelado' },
      );
      return response.data;
    },
    onMutate: (pedidoId) => {
      setPendingIds((prev) => new Set(prev).add(pedidoId));
    },
    onSettled: (_data, _error, pedidoId) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(pedidoId);
        return next;
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      showToast('Pedido cancelado', 'success');
    },
    onError: (error: unknown) => {
      const detail = extractApiError(error, ['nuevo_estado']);
      showToast(detail, 'error');
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
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

  const accionNoTerminal = useMemo(
    () =>
      new Set([
        'pendiente',
        'confirmado',
        'en_preparacion',
        'listo_para_retirar',
      ]),
    [],
  );

  const keyExtractor = useCallback((item: Order) => String(item.id_pedido), []);

  const renderOrder = useCallback(
    ({ item }: { readonly item: Order }) => {
      const accion = ACCIONES[item.estado_actual];
      const busy = isRowPending(item.id_pedido);

      return (
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            padding: 16,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: fg }}>
                {item.cliente_nombre ?? 'Cliente'}
              </Text>
              <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
                #{item.id_pedido} · {formatearFecha(item.creado_en)}
              </Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: fg }}>
              ${parseFloat(item.total).toFixed(2)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
              gap: 6,
            }}
          >
            <View
              style={{
                backgroundColor: activeBg,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
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
                {item.estado_actual.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {accion ? (
              <Pressable
                onPress={() => {
                  statusMutation.mutate({
                    pedidoId: item.id_pedido,
                    nuevoEstado: accion.estado,
                  });
                }}
                disabled={busy}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: accion.color,
                  borderRadius: 10,
                  paddingVertical: 10,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <MaterialCommunityIcons
                  name={
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                    accion.icon as any
                  }
                  size={18}
                  color={white}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: white,
                  }}
                >
                  {accion.label}
                </Text>
              </Pressable>
            ) : null}
            {accionNoTerminal.has(item.estado_actual) ? (
              <Pressable
                onPress={() => {
                  Platform.OS === 'web'
                    ? window.confirm(
                        '¿Estás seguro? Esta acción no se puede deshacer.',
                      ) && cancelMutation.mutate(item.id_pedido)
                    : Alert.alert(
                        'Cancelar pedido',
                        '¿Estás seguro? Esta acción no se puede deshacer.',
                        [
                          { text: 'No', style: 'cancel' },
                          {
                            text: 'Sí, cancelar',
                            style: 'destructive',
                            onPress: () =>
                              cancelMutation.mutate(item.id_pedido),
                          },
                        ],
                      );
                }}
                disabled={busy}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: redCoral,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={16}
                  color={redCoral}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: redCoral,
                  }}
                >
                  Cancelar
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    },
    [
      surface,
      border,
      fg,
      muted,
      activeBg,
      brand,
      white,
      redCoral,
      statusMutation,
      cancelMutation,
      accionNoTerminal,
      isRowPending,
    ],
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
          Error al cargar pedidos
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
          Pedidos
        </Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={keyExtractor}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <View
              style={{
                backgroundColor: surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: border,
                padding: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                {ESTADOS.map((e: FilterOption): React.JSX.Element => {
                  const selected = filter === e.value;
                  return (
                    <Pressable
                      key={e.value}
                      onPress={() => setFilter(e.value)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 20,
                        backgroundColor: selected ? brand : colors.transparent,
                        borderWidth: 1.5,
                        borderColor: selected ? brand : border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: selected ? white : fg,
                        }}
                      >
                        {e.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 60,
            }}
          >
            <MaterialCommunityIcons
              name="package-variant"
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
              {filter ? 'No hay pedidos en este estado' : 'No hay pedidos'}
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
