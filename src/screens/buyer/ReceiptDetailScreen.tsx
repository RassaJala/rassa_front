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
import { fetchPago } from '@/common/payments';
import type { PaymentDetail } from '@/common/payments';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<BuyerStackParamList, 'ReceiptDetail'>;
type Route = RouteProp<BuyerStackParamList, 'ReceiptDetail'>;

export default function ReceiptDetailScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const { paymentId } = route.params;
  const paymentIdValid = Number.isInteger(paymentId) && paymentId > 0;

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;

  const {
    data: pago,
    isLoading,
    isError,
    refetch,
  } = useQuery<PaymentDetail>({
    queryKey: ['pago', paymentId],
    queryFn: () => fetchPago(api, paymentId),
    enabled: paymentIdValid,
  });

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
        <LinkLikeButton
          label="Volver"
          icon="arrow-left"
          color={muted}
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  // Defensa en profundidad: aunque el backend ya scoping los pagos al
  // propietario (IDOR mitigate), nunca renderizamos un recibo ajeno.
  const esPropietario =
    pago != null && pago.cliente_id != null && pago.cliente_id === user?.id;

  if (isError || !pago || !esPropietario) {
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
          Error al cargar el recibo
        </Text>
        <LinkLikeButton
          label="Reintentar"
          icon="refresh"
          color={brand}
          onPress={() => void refetch()}
        />
        <LinkLikeButton
          label="Volver"
          icon="arrow-left"
          color={muted}
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  const productos = pago.productos ?? [];

  const subtotal = productos.reduce(
    (acc, prod) => acc + prod.cantidad * Number(prod.precio),
    0,
  );

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
          Recibo {pago.folio}
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
          <DetailRow label="Folio" value={pago.folio} fg={fg} muted={muted} />
          {pago.pedido ? (
            <DetailRow
              label="Pedido"
              value={`#${pago.pedido}`}
              fg={fg}
              muted={muted}
            />
          ) : null}
          <DetailRow
            label="Fecha"
            value={formatearFecha(pago.fecha_pago)}
            fg={fg}
            muted={muted}
          />
          <DetailRow
            label="Cliente"
            value={pago.cliente_nombre ?? '—'}
            fg={fg}
            muted={muted}
          />
          <DetailRow
            label="Método de pago"
            value={pago.tipo_pago_nombre}
            fg={fg}
            muted={muted}
          />
          {pago.referencia ? (
            <DetailRow
              label="Referencia"
              value={pago.referencia}
              fg={fg}
              muted={muted}
            />
          ) : null}
        </View>

        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: fg,
            marginBottom: 10,
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
            marginBottom: 16,
          }}
        >
          {productos.map((prod, idx) => (
            <View
              key={`${prod.nombre}-${idx}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 8,
                ...(idx < productos.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: border }
                  : {}),
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
                  {prod.nombre}
                </Text>
                <Text style={{ fontSize: 13, color: muted, marginTop: 1 }}>
                  {prod.cantidad}x ${Number(prod.precio).toFixed(2)}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: fg }}>
                ${(prod.cantidad * Number(prod.precio)).toFixed(2)}
              </Text>
            </View>
          ))}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 12,
              marginTop: 8,
              borderTopWidth: 1,
              borderTopColor: border,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: muted }}>
              Subtotal
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: fg }}>
              ${subtotal.toFixed(2)}
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            padding: 16,
            marginBottom: 24,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: fg }}>
            Total pagado
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: brand }}>
            ${Number(pago.monto).toFixed(2)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Detail row helper ─────────────────────────────────────

function LinkLikeButton({
  label,
  icon,
  color,
  onPress,
}: {
  readonly label: string;
  readonly icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  readonly color: string;
  readonly onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={{ fontSize: 14, fontWeight: '600', color }}>{label}</Text>
    </Pressable>
  );
}

function DetailRow({
  label,
  value,
  fg,
  muted,
}: {
  readonly label: string;
  readonly value: string;
  readonly fg: string;
  readonly muted: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
      }}
    >
      <Text style={{ fontSize: 14, color: muted }}>{label}</Text>
      <Text
        style={{ fontSize: 14, fontWeight: '600', color: fg, maxWidth: '60%' }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
