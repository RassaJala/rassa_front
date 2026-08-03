import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { formatearFecha } from '@/common/dates';
import { isOrderExpired } from '@/common/orders';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useTheme } from '@/store/ThemeContext';
import type {
  BuyerStackParamList,
  OrderDetail,
  OrderHistoryEntry,
} from '@/types';

type Nav = NativeStackNavigationProp<BuyerStackParamList, 'OrderDetail'>;
type Route = RouteProp<BuyerStackParamList, 'OrderDetail'>;

interface TimelineConfig {
  readonly icon: string;
  readonly color: string;
}

const TIMELINE_MAP: Readonly<Record<string, TimelineConfig>> = {
  pendiente: { icon: 'clock-outline', color: colors.warning },
  confirmado: { icon: 'check-circle-outline', color: colors.info },
  en_preparacion: { icon: 'fire', color: colors.warning },
  listo_para_retirar: { icon: 'package-variant-closed', color: colors.success },
  entregado: { icon: 'handshake', color: colors.success },
  cancelado: { icon: 'close-circle', color: colors.error },
};

function TimelineEntry({
  entry,
  isFirst,
  isLast,
  fg,
  muted,
  border: borderColor,
}: {
  readonly entry: OrderHistoryEntry;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
}): React.JSX.Element {
  const config = TIMELINE_MAP[entry.estado_nuevo] ?? {
    icon: 'help-circle-outline',
    color: muted,
  };
  const label = isFirst
    ? 'Pedido creado'
    : entry.estado_nuevo.replace(/_/g, ' ');
  const subtitle = entry.cambiado_por_nombre
    ? `por ${entry.cambiado_por_nombre}`
    : undefined;

  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ alignItems: 'center', width: 32 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: config.color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name={
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
              config.icon as any
            }
            size={16}
            color={colors.iconWhite}
          />
        </View>
        {isLast ? null : (
          <View style={{ flex: 1, width: 2, backgroundColor: borderColor }} />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12, paddingBottom: isLast ? 0 : 20 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: fg,
            textTransform: 'capitalize',
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: muted, marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>
          {formatearFecha(entry.creado_en)}
        </Text>
      </View>
    </View>
  );
}

export default function OrderDetailScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId } = route.params;

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const activeBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const white = colors.iconWhite;
  const success = colors.success;

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery<OrderDetail>({
    queryKey: ['pedido', orderId],
    queryFn: async () => {
      const response = await api.get<OrderDetail>(`/pedidos/${orderId}/`);
      return response.data;
    },
    enabled: orderId > 0,
  });

  const isPickupReady = order?.estado_actual === 'listo_para_retirar';

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

  if (isError || !order) {
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
          Error al cargar el pedido
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
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={fg} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: '700', color: fg }}>
          Pedido #{order.id_pedido}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View>
              <Text style={{ fontSize: 13, color: muted }}>Creado</Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: fg,
                  marginTop: 2,
                }}
              >
                {formatearFecha(order.creado_en)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 13, color: muted }}>Total</Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: fg,
                  marginTop: 2,
                }}
              >
                ${parseFloat(order.total).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
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
                {order.estado_actual.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          {isOrderExpired(order) ? (
            <View
              style={{
                backgroundColor: colors.error,
                borderRadius: 12,
                padding: 14,
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <MaterialCommunityIcons
                name="timer-off-outline"
                size={22}
                color={white}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: white }}>
                  Pedido expirado
                </Text>
                <Text style={{ fontSize: 13, color: white, marginTop: 1 }}>
                  Este pedido expiró el{' '}
                  {order.fecha_expiracion
                    ? formatearFecha(order.fecha_expiracion)
                    : 'en una fecha no disponible'}
                  . Ya no se puede modificar ni confirmar.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 24, marginTop: 12 }}>
            <View>
              <Text style={{ fontSize: 13, color: muted }}>Subtotal</Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: fg,
                  marginTop: 2,
                }}
              >
                ${parseFloat(order.subtotal).toFixed(2)}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 13, color: muted }}>IVA</Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: fg,
                  marginTop: 2,
                }}
              >
                ${parseFloat(order.iva).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {isPickupReady ? (
          <View
            style={{
              backgroundColor: success,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={32}
              color={white}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: white }}>
                ¡Listo para recoger!
              </Text>
              <Text style={{ fontSize: 13, color: white, marginTop: 2 }}>
                Pasa al punto de entrega por tu pedido
              </Text>
            </View>
          </View>
        ) : null}

        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: fg,
            marginBottom: 10,
            marginTop: 4,
          }}
        >
          Productos
        </Text>
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            padding: 16,
            marginBottom: 20,
          }}
        >
          {order.detalles.map((detalle, index) => (
            <View
              key={detalle.id_detalle}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 8,
                ...(index < order.detalles.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: border }
                  : {}),
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
                  {detalle.nombre_producto}
                </Text>
                <Text style={{ fontSize: 13, color: muted, marginTop: 1 }}>
                  {detalle.cantidad}x $
                  {parseFloat(detalle.precio_unitario).toFixed(2)}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: fg }}>
                ${parseFloat(detalle.importe).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: fg,
            marginBottom: 10,
          }}
        >
          Historial
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
          {order.historial.map((entry, index) => (
            <TimelineEntry
              key={entry.id_historial}
              entry={entry}
              isFirst={index === 0}
              isLast={index === order.historial.length - 1}
              fg={fg}
              muted={muted}
              border={border}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
