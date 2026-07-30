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

import { colors } from '@/constants/colors';
import { fetchPago } from '@/services/payments';
import { useTheme } from '@/store/ThemeContext';
import type { SellerStackParamList } from '@/types';

// ── Types ──────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<SellerStackParamList, 'Receipt'>;
type Route = RouteProp<SellerStackParamList, 'Receipt'>;

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

// ── Component ──────────────────────────────────────────────

export default function ReceiptScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { paymentId } = route.params;

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const success = colors.success;

  const {
    data: pago,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['pago', paymentId],
    queryFn: () => fetchPago(paymentId),
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
      </View>
    );
  }

  if (isError || !pago) {
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
      {/* Header */}
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
          onPress={() => navigation.popToTop()}
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
          Recibo de Pago
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success badge */}
        <View
          style={{
            backgroundColor: success,
            borderRadius: 14,
            padding: 20,
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <MaterialCommunityIcons
            name="check-circle"
            size={48}
            color={colors.iconWhite}
          />
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: colors.iconWhite,
              marginTop: 8,
            }}
          >
            Pago Registrado
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.iconWhite,
              marginTop: 4,
              opacity: 0.9,
            }}
          >
            {pago.folio}
          </Text>
        </View>

        {/* Receipt details */}
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

        {/* Products */}
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
          {pago.productos.map((prod, idx) => (
            <View
              key={`${prod.nombre}-${idx}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 8,
                ...(idx < pago.productos.length - 1
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
        </View>

        {/* Total */}
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

        {/* Back button */}
        <Pressable
          onPress={() => navigation.popToTop()}
          style={{
            backgroundColor: brand,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ fontSize: 17, fontWeight: '700', color: colors.iconWhite }}
          >
            Volver a pedidos
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ── Detail row helper ─────────────────────────────────────

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
