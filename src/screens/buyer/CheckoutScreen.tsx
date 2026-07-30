import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';

import { colors } from '@/constants/colors';
import { useCreatePedido } from '@/hooks/useOrders';
import type { PedidoItemInput } from '@/services/orders';
import { useCart } from '@/store/CartContext';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';
import { formatPrice, safePrice } from '@/utils/format';

type Nav = NativeStackNavigationProp<BuyerStackParamList, 'Checkout'>;

/**
 * Intenta extraer un mensaje legible desde el error del backend.
 * Soporta: timeout, sin conexión, 401, { detail }, { message },
 * field-level arrays, y códigos HTTP comunes.
 */
function extractError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }

  // Timeout
  if (error.code === 'ECONNABORTED') {
    return 'La conexión tardó demasiado. Verifica tu conexión e intenta de nuevo.';
  }

  // Sin conexión / no hubo respuesta del servidor
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
  }

  const data = error.response?.data as Record<string, unknown> | undefined;

  // 401 — sesión expirada
  if (error.response?.status === 401) {
    return 'Tu sesión expiró. Inicia sesión nuevamente.';
  }

  // DRF ValidationError: { "detail": "mensaje" }
  if (data && typeof data.detail === 'string') return data.detail;

  // Custom ok_response: { "message": "mensaje" }
  if (data && typeof data.message === 'string') return data.message;

  // DRF field-level errors: collect string messages without exposing field names
  if (data) {
    const messages: string[] = [];
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) {
        for (const msg of value) {
          if (typeof msg === 'string') messages.push(msg);
        }
      }
    }
    if (messages.length > 0) return messages.join(' ');
  }

  // Http-level status
  const status = error.response?.status;
  if (status === 403) return 'No tienes permisos para crear pedidos.';
  if (status === 500) return 'Error interno del servidor. Intenta más tarde.';

  return 'Error al procesar el pedido. Intenta de nuevo.';
}

export default function CheckoutScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const cart = useCart();
  const createPedido = useCreatePedido();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const isMutatingRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const errorBg = isDark ? colors.admErrorBgD : colors.admErrorBgL;

  const handleConfirm = useCallback(() => {
    if (isMutatingRef.current) return;
    setErrorMsg(null);

    const items: readonly PedidoItemInput[] = cart.items.map((i) => ({
      id_producto_semanal: i.id_producto_semanal,
      cantidad: i.cantidad,
    }));

    if (items.length === 0) {
      setErrorMsg('No hay productos en tu carrito');
      return;
    }

    isMutatingRef.current = true;
    createPedido.mutate(items, {
      onSuccess: (response) => {
        isMutatingRef.current = false;
        if (!isMountedRef.current) return;
        const pedido = response.data;
        if (!pedido?.id_pedido) {
          setErrorMsg('Respuesta inesperada del servidor.');
          return;
        }
        cart.clearCart();
        navigation.replace('OrderSuccess', {
          orderId: pedido.id_pedido,
          total: pedido.total,
        });
      },
      onError: (err) => {
        isMutatingRef.current = false;
        if (isMountedRef.current) setErrorMsg(extractError(err));
      },
    });
  }, [cart, createPedido, navigation]);

  const isPending = createPedido.isPending;

  if (cart.items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, padding: 16 }}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="cart-outline" size={64} color={muted} />
          <Text
            style={{
              marginTop: 16,
              fontSize: 18,
              fontWeight: '700',
              color: fg,
              textAlign: 'center',
            }}
          >
            No hay productos en tu carrito
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              marginTop: 16,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: brand,
            }}
          >
            <Text style={{ color: colors.iconWhite, fontWeight: '600' }}>
              Volver al carrito
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: surface,
              borderWidth: 1,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={fg} />
          </Pressable>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: fg,
            }}
          >
            Confirmar pedido
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumen de productos */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: fg,
            marginBottom: 10,
          }}
        >
          Resumen del pedido
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
          {cart.items.map((item, index) => {
            const importe = safePrice(item.precio) * item.cantidad;
            return (
              <View
                key={item.id_producto_semanal}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 8,
                  ...(index < cart.items.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: border }
                    : {}),
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: fg,
                    }}
                  >
                    {item.nombre_producto}
                  </Text>
                  <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
                    {item.cantidad} ×{' '}
                    {formatPrice(Number.parseFloat(item.precio))}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: fg,
                  }}
                >
                  {formatPrice(importe)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totales */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: fg,
            marginBottom: 10,
          }}
        >
          Totales
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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 14, color: muted }}>Subtotal</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
              {formatPrice(cart.subtotal)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 14, color: muted }}>IVA (21%)</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
              {formatPrice(cart.iva)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: border,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: fg,
              }}
            >
              Total
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: brand,
              }}
            >
              {formatPrice(cart.total)}
            </Text>
          </View>
        </View>

        {/* Error message */}
        {errorMsg ? (
          <View
            style={{
              backgroundColor: errorBg,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={22}
                color={colors.error}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: colors.error,
                  lineHeight: 20,
                }}
              >
                {errorMsg}
              </Text>
              <Pressable
                onPress={() => setErrorMsg(null)}
                hitSlop={8}
                style={{ marginTop: 2 }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={colors.error}
                />
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                setErrorMsg(null);
                handleConfirm();
              }}
              style={({ pressed }) => ({
                marginTop: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.error,
                paddingVertical: 8,
                alignItems: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.error,
                }}
              >
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Botón de confirmación */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: surface,
          borderTopWidth: 1,
          borderTopColor: border,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 32,
        }}
      >
        <Pressable
          onPress={handleConfirm}
          disabled={isPending}
          style={({ pressed }) => ({
            backgroundColor: isPending ? muted : brand,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: pressed && !isPending ? 0.8 : 1,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          })}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.iconWhite} />
          ) : (
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={22}
              color={colors.iconWhite}
            />
          )}
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.iconWhite,
            }}
          >
            {isPending ? 'Creando pedido...' : 'Confirmar pedido'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
