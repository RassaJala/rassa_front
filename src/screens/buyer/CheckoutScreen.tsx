import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { BottomActionBar, HeaderBackButton } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useCreatePedido } from '@/hooks/useOrders';
import type { PedidoItemInput } from '@/services/orders';
import { useCartStore } from '@/store/cartStore';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';
import { formatPrice } from '@/utils/format';

const IVA_RATE = 0.21;
const HEADER_TOP_PADDING = 60;
const SCROLL_BOTTOM_PADDING = 200;

/** Marca de error del backend cuando el pedido excede el límite de crédito */
const CREDIT_LIMIT_PATTERN = /l[ií]mite de cr[eé]dito/i;

const styles = StyleSheet.create({
  emptyCartCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  volverBtnText: { color: colors.iconWhite, fontWeight: '600' },
  headerTop: {
    paddingTop: HEADER_TOP_PADDING,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scrollContent: { padding: 20, paddingBottom: SCROLL_BOTTOM_PADDING },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  errorText: { flex: 1, fontSize: 14, color: colors.error, lineHeight: 20 },
  closeBtn: { marginTop: 2 },
  retryText: { fontSize: 14, fontWeight: '600', color: colors.error },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: colors.iconWhite },
  flexOne: { flex: 1 },
});

function buildPedidoItems(
  items: ReadonlyArray<{ id_producto_semanal: number; cantidad: number }>,
): readonly PedidoItemInput[] {
  return items.map((i) => ({
    id_producto_semanal: i.id_producto_semanal,
    cantidad: i.cantidad,
  }));
}

type Nav = NativeStackNavigationProp<BuyerStackParamList, 'Checkout'>;

function sanitizeMessage(msg: string): string {
  return msg.replace(/<[^>]*>/g, '').slice(0, 200);
}

/** Muestra una alerta nativa cuando el pedido excede el límite de crédito */
function showCreditLimitAlert(message: string): void {
  Alert.alert('Límite de crédito excedido', message, [{ text: 'Entendido' }]);
}

/** Detecta si el mensaje del backend corresponde a límite de crédito */
function isCreditLimitError(message: string): boolean {
  return CREDIT_LIMIT_PATTERN.test(message);
}

/** Extrae mensajes de error de arrays dentro de un objeto DRF */
function extractFieldMessages(data: Record<string, unknown>): string | null {
  const messages: string[] = [];
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) {
      for (const msg of value) {
        if (typeof msg === 'string') messages.push(msg);
      }
    }
  }
  return messages.length > 0 ? messages.join(' ') : null;
}

/** Mapa de status HTTP a mensajes de error conocidos */
const HTTP_ERROR_MAP: Record<number, string> = {
  401: 'Tu sesión expiró. Inicia sesión nuevamente.',
  403: 'No tienes permisos para crear pedidos.',
  500: 'Error interno del servidor. Intenta más tarde.',
};

/**
 * Intenta extraer un mensaje legible desde el error del backend.
 */
function extractError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }

  if (error.code === 'ECONNABORTED') {
    return 'La conexión tardó demasiado. Verifica tu conexión e intenta de nuevo.';
  }

  if (!error.response) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
  }

  const status = error.response.status;
  const knownMessage = HTTP_ERROR_MAP[status];
  if (knownMessage) return knownMessage;

  const data = error.response.data as Record<string, unknown> | undefined;
  if (!data) return 'Error al procesar el pedido. Intenta de nuevo.';

  if (typeof data.detail === 'string') return sanitizeMessage(data.detail);
  if (typeof data.message === 'string') return sanitizeMessage(data.message);

  const fieldMsg = extractFieldMessages(data);
  if (fieldMsg) return sanitizeMessage(fieldMsg);

  return 'Error al procesar el pedido. Intenta de nuevo.';
}

export default function CheckoutScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const createPedidoMutation = useCreatePedido();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    // Refresca precios de publicaciones al entrar al checkout
    void queryClient.invalidateQueries({ queryKey: ['publicaciones-current'] });
    return () => {
      isMountedRef.current = false;
    };
  }, [queryClient]);

  const subtotal = useMemo(
    () => cartItems.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
    [cartItems],
  );
  const iva = useMemo(() => subtotal * IVA_RATE, [subtotal]);
  const total = useMemo(() => subtotal + iva, [subtotal, iva]);

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const errorBg = isDark ? colors.admErrorBgD : colors.admErrorBgL;

  const dynamicStyles = useMemo(
    () =>
      ({
        emptyCartScreen: { flex: 1, backgroundColor: bg, padding: 16 },
        emptyCartTitle: {
          marginTop: 16,
          fontSize: 18,
          fontWeight: '700',
          color: fg,
          textAlign: 'center',
        },
        volverBtn: {
          marginTop: 16,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: brand,
        },
        screen: { flex: 1, backgroundColor: bg },
        headerTitle: { fontSize: 22, fontWeight: '700', color: fg },
        sectionTitle: {
          fontSize: 16,
          fontWeight: '600',
          color: fg,
          marginBottom: 10,
        },
        summaryCard: {
          backgroundColor: surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: border,
          padding: 16,
          marginBottom: 16,
        },
        itemName: { fontSize: 15, fontWeight: '600', color: fg },
        itemDetail: { fontSize: 13, color: muted, marginTop: 2 },
        itemPrice: { fontSize: 15, fontWeight: '700', color: fg },
        labelText: { fontSize: 14, color: muted },
        valueText: { fontSize: 14, fontWeight: '600', color: fg },
        totalRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: border,
        },
        totalLabel: { fontSize: 18, fontWeight: '700', color: fg },
        totalValue: { fontSize: 18, fontWeight: '700', color: brand },
        errorContainer: {
          backgroundColor: errorBg,
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
        },
        bottomBar: {}, // kept as empty fallback
        // BottomActionBar component handles the absolute positioning
        itemBorder: { borderBottomWidth: 1, borderBottomColor: border },
        retryBtn: {
          marginTop: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.error,
          paddingVertical: 8,
          alignItems: 'center',
        },
        confirmBtn: {
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        },
      }) as const,
    [bg, fg, muted, surface, border, brand, errorBg],
  );

  const handleConfirm = useCallback(() => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setErrorMsg(null);

    const items = buildPedidoItems(cartItems);

    if (items.length === 0) {
      isSubmittingRef.current = false;
      setErrorMsg('No hay productos en tu carrito');
      return;
    }

    createPedidoMutation.mutate(items, {
      onSuccess: (response) => {
        isSubmittingRef.current = false;
        if (!isMountedRef.current) return;
        const pedido = response.data;
        if (!pedido?.id_pedido) {
          setErrorMsg('Respuesta inesperada del servidor.');
          return;
        }
        clearCart();
        navigation.replace('OrderSuccess', {
          orderId: pedido.id_pedido,
          total: pedido.total,
        });
      },
      onError: (err) => {
        isSubmittingRef.current = false;
        if (!isMountedRef.current) return;
        const message = extractError(err);
        if (isCreditLimitError(message)) {
          showCreditLimitAlert(message);
          return;
        }
        setErrorMsg(message);
      },
    });
  }, [cartItems, createPedidoMutation, navigation, clearCart]);

  const isPending = createPedidoMutation.isPending;

  if (cartItems.length === 0) {
    return (
      <View style={dynamicStyles.emptyCartScreen}>
        <View style={styles.emptyCartCenter}>
          <MaterialCommunityIcons name="cart-outline" size={64} color={muted} />
          <Text style={dynamicStyles.emptyCartTitle}>
            No hay productos en tu carrito
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={dynamicStyles.volverBtn}
          >
            <Text style={styles.volverBtnText}>Volver al carrito</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.screen}>
      {/* Header */}
      <View style={styles.headerTop}>
        <View style={styles.headerRow}>
          <HeaderBackButton onPress={() => navigation.goBack()} />
          <Text style={dynamicStyles.headerTitle}>Confirmar pedido</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumen de productos */}
        <Text style={dynamicStyles.sectionTitle}>Resumen del pedido</Text>

        <View style={dynamicStyles.summaryCard}>
          {cartItems.map((item, index) => {
            const importe = item.precio * item.cantidad;
            return (
              <View
                key={item.id_producto_semanal}
                style={[
                  styles.itemRow,
                  index < cartItems.length - 1 && dynamicStyles.itemBorder,
                ]}
              >
                <View style={styles.flexOne}>
                  <Text style={dynamicStyles.itemName}>{item.producto}</Text>
                  <Text style={dynamicStyles.itemDetail}>
                    {item.cantidad} × {formatPrice(item.precio)}
                  </Text>
                </View>
                <Text style={dynamicStyles.itemPrice}>
                  {formatPrice(importe)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totales */}
        <Text style={dynamicStyles.sectionTitle}>Totales</Text>

        <View style={dynamicStyles.summaryCard}>
          <View style={styles.totalsRow}>
            <Text style={dynamicStyles.labelText}>Subtotal</Text>
            <Text style={dynamicStyles.valueText}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={dynamicStyles.labelText}>IVA (21%)</Text>
            <Text style={dynamicStyles.valueText}>{formatPrice(iva)}</Text>
          </View>
          <View style={dynamicStyles.totalRow}>
            <Text style={dynamicStyles.totalLabel}>Total</Text>
            <Text style={dynamicStyles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        {/* Error message */}
        {errorMsg ? (
          <View style={dynamicStyles.errorContainer}>
            <View style={styles.errorRow}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={22}
                color={colors.error}
              />
              <Text style={styles.errorText}>{errorMsg}</Text>
              <Pressable
                onPress={() => setErrorMsg(null)}
                hitSlop={8}
                style={styles.closeBtn}
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
              style={({ pressed }) => [
                dynamicStyles.retryBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Botón de confirmación */}
      <BottomActionBar>
        <Pressable
          onPress={handleConfirm}
          disabled={isPending || isSubmittingRef.current}
          style={({ pressed }) => [
            dynamicStyles.confirmBtn,
            {
              backgroundColor:
                isPending || isSubmittingRef.current ? muted : brand,
              opacity: pressed && !isPending ? 0.8 : 1,
            },
          ]}
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
          <Text style={styles.confirmBtnText}>
            {isPending ? 'Creando pedido...' : 'Confirmar pedido'}
          </Text>
        </Pressable>
      </BottomActionBar>
    </View>
  );
}
