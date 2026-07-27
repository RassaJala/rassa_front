/* global window */
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Platform,
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
import { getPayment } from '@/services/payments';
import { useTheme } from '@/store/ThemeContext';
import type { SellerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<SellerStackParamList, 'Receipt'>;
type Route = RouteProp<SellerStackParamList, 'Receipt'>;

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetalleFila({
  label,
  value,
  fg,
  muted,
  border,
}: {
  readonly label: string;
  readonly value: string;
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: border,
      }}
    >
      <Text style={{ fontSize: 13, color: muted }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
        {value}
      </Text>
    </View>
  );
}

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
  const activeBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const white = colors.iconWhite;

  const {
    data: payment,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['pago', paymentId],
    queryFn: () => getPayment(paymentId),
    enabled: paymentId > 0,
  });

  const handlePrint = useCallback(() => {
    if (Platform.OS === 'web') {
      window.print();
    }
  }, []);

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

  if (isError || !payment) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={muted}
        />
        <Text style={{ fontSize: 15, color: muted, marginTop: 12 }}>
          Error al cargar el recibo
        </Text>
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
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
            Recibo
          </Text>
        </View>

        {Platform.OS === 'web' ? (
          <Pressable
            onPress={handlePrint}
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
            <MaterialCommunityIcons
              name="printer-outline"
              size={22}
              color={fg}
            />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Recibo card */}
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            padding: 24,
          }}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <MaterialCommunityIcons
              name="check-circle"
              size={48}
              color={colors.success}
            />
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: fg,
                marginTop: 8,
              }}
            >
              Pago Registrado
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: muted,
                marginTop: 2,
              }}
            >
              {formatearFecha(payment.fecha_pago)}
            </Text>
          </View>

          {/* Folio */}
          <View
            style={{
              backgroundColor: activeBg,
              borderRadius: 10,
              padding: 14,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: muted }}>
              FOLIO
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: brand,
                letterSpacing: 0.5,
                marginTop: 2,
              }}
            >
              {payment.folio}
            </Text>
          </View>

          {/* Detalles */}
          <DetalleFila
            label="Cliente"
            value={payment.cliente_nombre ?? '—'}
            fg={fg}
            muted={muted}
            border={border}
          />
          <DetalleFila
            label="Pedido"
            value={`#${payment.pedido}`}
            fg={fg}
            muted={muted}
            border={border}
          />
          <DetalleFila
            label="Método de pago"
            value={
              payment.metodo_pago.charAt(0).toUpperCase() +
              payment.metodo_pago.slice(1)
            }
            fg={fg}
            muted={muted}
            border={border}
          />
          {payment.referencia ? (
            <DetalleFila
              label="Referencia"
              value={payment.referencia}
              fg={fg}
              muted={muted}
              border={border}
            />
          ) : null}

          {/* Productos */}
          {payment.productos && payment.productos.length > 0 ? (
            <>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: fg,
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                Productos
              </Text>
              {payment.productos.map((prod, idx) => (
                <View
                  // ponytail: usamos idx como key porque no hay id único del backend aún
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                    borderBottomWidth:
                      idx < (payment.productos?.length ?? 0) - 1 ? 1 : 0,
                    borderBottomColor: border,
                  }}
                >
                  <Text style={{ fontSize: 13, color: fg }}>
                    {typeof prod === 'string' ? prod : prod.nombre}
                  </Text>
                </View>
              ))}
            </>
          ) : null}

          {/* Total */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 20,
              paddingTop: 16,
              borderTopWidth: 2,
              borderTopColor: brand,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
              Total pagado
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: brand,
              }}
            >
              ${Number.parseFloat(payment.monto).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Botón de volver */}
        <Pressable
          onPress={() => navigation.popToTop()}
          style={{
            backgroundColor: brand,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 20,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: white }}>
            Volver a inicio
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
