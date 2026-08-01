import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sentry from '@sentry/react-native';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

import EmptyCart from '@/components/EmptyCart';
import FormErrorBanner from '@/components/FormErrorBanner';
import { colors, themeColors } from '@/constants/colors';
import {
  createOrder,
  findMatchingOrder,
  InvalidOrderEnvelopeError,
} from '@/services/orders';
import type { CreateOrderPayload } from '@/services/orders';
import { sanitizeSentryError } from '@/services/sentry';
import { useCartStore } from '@/store/cartStore';
import type { CartItem } from '@/store/cartStore';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';
import { parseApiError } from '@/utils/apiErrors';
import { formatMoney } from '@/utils/money';

type Nav = NativeStackNavigationProp<BuyerStackParamList>;

const IVA_RATE = 0.21;
const IVA_LABEL = `IVA (${Math.round(IVA_RATE * 100)}%)`;
const ORDER_ERROR_FALLBACK = 'Error al procesar el pedido. Intente de nuevo.';
const CHECKOUT_AMBIGUOUS_ERROR =
  'No pudimos confirmar si tu pedido se creó. Revisá Mis Pedidos antes de intentar de nuevo.';
const CART_INVALID_ERROR =
  'El carrito contiene productos con cantidades inválidas. Revisá el carrito e intentá de nuevo.';

function extractCheckoutError(error: unknown): string {
  return parseApiError(error, ORDER_ERROR_FALLBACK);
}

// Only errors where the server may have already committed the order are
// ambiguous: no-response timeouts (ECONNABORTED) and 5xx responses (proxy,
// gateway, server timeout). Pure client/network failures (offline, DNS,
// refused) cannot have created an order, and 4xx with a body is a definitive
// rejection.
function isAmbiguousOrderError(error: unknown): boolean {
  const candidate =
    error instanceof Error && error.cause !== undefined ? error.cause : error;
  if (axios.isAxiosError(candidate)) {
    if (candidate.response === undefined) {
      // The request was in-flight long enough for the server to commit
      // (timeout). Pure client/network failures (offline, DNS, refused)
      // cannot have created an order.
      return candidate.code === 'ECONNABORTED';
    }
    // 5xx (proxy/gateway/timeout) may have committed before failing.
    return candidate.response.status >= 500;
  }
  return false;
}

// Persisted carts can hold stale quantities or ids (items added days ago,
// stock changed since). This is UX pre-validation only: the backend revalidates
// under lock and remains the source of truth. Returns the message for the
// first item that cannot be ordered, or null when every item is safe.
function firstInvalidCartMessage(items: CartItem[]): string | null {
  for (const item of items) {
    if (
      !Number.isInteger(item.id_producto_semanal) ||
      item.id_producto_semanal <= 0 ||
      !Number.isInteger(item.cantidad) ||
      item.cantidad < 1
    ) {
      return CART_INVALID_ERROR;
    }
    if (item.cantidad > item.stock) {
      return `La cantidad de "${item.producto}" supera el stock disponible. Revisá el carrito.`;
    }
  }
  return null;
}

function CheckoutRow({
  item,
  textColor,
  mutedColor,
  isDark,
}: {
  item: CartItem;
  textColor: string;
  mutedColor: string;
  isDark: boolean;
}): React.JSX.Element {
  const rowBg = isDark ? colors.cartRowBgD : colors.cartRowBg;

  return (
    <View
      className="mb-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: rowBg }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="text-sm font-semibold"
            style={{ color: textColor }}
            numberOfLines={1}
          >
            {item.producto}
          </Text>
          <Text className="mt-0.5 text-xs" style={{ color: mutedColor }}>
            {`${formatMoney(item.precio)}/${item.unidad}`}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: mutedColor }}>
            {`Cantidad: ${item.cantidad}`}
          </Text>
        </View>
        <Text className="text-sm font-bold" style={{ color: colors.primary }}>
          {formatMoney(item.precio * item.cantidad)}
        </Text>
      </View>
    </View>
  );
}

export default function CheckoutScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const tc = themeColors(isDark);
  const navigation = useNavigation<Nav>();
  const items = useCartStore((s) => s.items);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Same-tick double-submit guard: `isPending` only updates on re-render, so
  // two taps in the same frame could both pass the render-state check. A ref
  // is set synchronously before the POST starts and cleared in `finally`.
  const inFlightRef = useRef(false);

  const orderMutation = useMutation({
    mutationFn: createOrder,
  });

  const handleConfirm = useCallback(async () => {
    if (inFlightRef.current || orderMutation.isPending) {
      return;
    }

    // Revalidate the persisted cart before POSTing: quantities or ids may be
    // stale (stock changed since the items were added). An invalid cart shows
    // an error and never fires the request.
    const cartError = firstInvalidCartMessage(items);
    if (cartError !== null) {
      setErrorMessage(cartError);
      return;
    }

    inFlightRef.current = true;

    setErrorMessage(null);

    const payload: CreateOrderPayload = {
      items: items.map((i) => ({
        id_producto_semanal: i.id_producto_semanal,
        cantidad: i.cantidad,
      })),
    };

    // Same totals math as the render section below (subtotal + IVA 21%).
    const subtotal = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
    const iva = subtotal * IVA_RATE;
    const total = subtotal + iva;
    const productNames = items.map((i) => i.producto);

    try {
      // createOrder validates the envelope and throws
      // InvalidOrderEnvelopeError when `data` is missing, so a resolved order
      // is guaranteed to carry a numeric id_pedido before the cart is cleared.
      const order = await orderMutation.mutateAsync(payload);
      // Record the created order id so a later ambiguous failure can be
      // correlated with this successful creation.
      Sentry.addBreadcrumb({
        category: 'checkout',
        message: 'Pedido creado correctamente',
        level: 'info',
        data: { orderId: order.id_pedido },
      });
      useCartStore.getState().clearCart();
      navigation.replace('OrderSuccess', {
        orderId: order.id_pedido,
        total: String(order.total),
        estado: order.estado,
      });
    } catch (error) {
      if (
        isAmbiguousOrderError(error) ||
        error instanceof InvalidOrderEnvelopeError
      ) {
        // 4xx business rejections (stock insuficiente, límite de crédito) are
        // expected outcomes, not exceptions, and must not raise Sentry alerts.
        // Only genuinely uncertain failures are captured: ambiguous network or
        // 5xx errors and unreadable order envelopes.
        Sentry.captureException(sanitizeSentryError(error), {
          tags: { flow: 'checkout', step: 'createOrder' },
        });
        try {
          // The order may have been created server-side even though the POST
          // failed without an HTTP response: reconcile against the order list
          // before telling the user the outcome is unknown.
          const existing = await findMatchingOrder(
            payload,
            total,
            productNames,
          );
          if (existing !== null) {
            // Correlate the reconciled order with the ambiguous failure that
            // preceded it.
            Sentry.addBreadcrumb({
              category: 'checkout',
              message: 'Pedido ya existente — reconciliado',
              level: 'info',
              data: { orderId: existing.id_pedido, reconciled: true },
            });
            useCartStore.getState().clearCart();
            navigation.replace('OrderSuccess', {
              orderId: existing.id_pedido,
              total: existing.total,
              estado: existing.estado_actual,
            });
            return;
          }
        } catch {
          // Reconciliation failed (e.g. the list request errored): fall through
          // to the ambiguous message so the user is never left blocked.
        }
        setErrorMessage(CHECKOUT_AMBIGUOUS_ERROR);
      } else {
        setErrorMessage(extractCheckoutError(error));
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [items, navigation, orderMutation]);

  if (items.length === 0) {
    return <EmptyCart isDark={isDark} />;
  }

  const subtotal = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;
  const disabledBg = isDark
    ? colors.cartBtnDisabledBgD
    : colors.cartBtnDisabledBg;
  const buttonBg = orderMutation.isPending ? disabledBg : tc.brand;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }} edges={['top']}>
      <View style={{ flex: 1, paddingTop: 8, paddingHorizontal: 16 }}>
        {/* Header */}
        <View
          className="mb-4 flex-row items-center justify-between"
          style={{ paddingTop: 12 }}
        >
          <Text className="text-2xl font-bold" style={{ color: tc.fg }}>
            Confirmar pedido
          </Text>
          <Pressable
            testID="back-to-cart-btn"
            onPress={() => navigation.goBack()}
            className="flex-row items-center rounded-lg px-3 py-2"
            style={{ backgroundColor: tc.surface }}
            disabled={orderMutation.isPending}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={16}
              color={tc.brand}
            />
            <Text
              className="ml-1 text-sm font-semibold"
              style={{ color: tc.brand }}
            >
              Volver al carrito
            </Text>
          </Pressable>
        </View>

        <FormErrorBanner message={errorMessage} isDark={isDark} />

        {/* Items */}
        <FlatList
          data={items}
          keyExtractor={(i) => i.id_producto_semanal.toString()}
          renderItem={({ item }) => (
            <CheckoutRow
              item={item}
              textColor={tc.fg}
              mutedColor={tc.muted}
              isDark={isDark}
            />
          )}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Totals */}
        <View
          className="mb-4 rounded-2xl px-5 py-4"
          style={{
            backgroundColor: tc.surface,
            borderTopWidth: 1,
            borderTopColor: tc.border,
          }}
        >
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: tc.muted }}>
              Subtotal
            </Text>
            <Text className="text-sm font-semibold" style={{ color: tc.fg }}>
              {formatMoney(subtotal)}
            </Text>
          </View>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: tc.muted }}>
              {IVA_LABEL}
            </Text>
            <Text className="text-sm font-semibold" style={{ color: tc.fg }}>
              {formatMoney(iva)}
            </Text>
          </View>
          <View
            className="mt-2 flex-row items-center justify-between border-t pt-2"
            style={{ borderTopColor: tc.border }}
          >
            <Text className="text-base font-bold" style={{ color: tc.fg }}>
              Total
            </Text>
            <Text className="text-xl font-bold" style={{ color: tc.fg }}>
              {formatMoney(total)}
            </Text>
          </View>

          <Pressable
            testID="confirm-order-btn"
            className="mt-4 items-center justify-center rounded-xl py-3.5"
            style={{ backgroundColor: buttonBg }}
            disabled={orderMutation.isPending}
            onPress={() => void handleConfirm()}
          >
            {orderMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.iconWhite} />
            ) : (
              <Text
                className="text-base font-bold"
                style={{ color: colors.iconWhite }}
              >
                Confirmar pedido
              </Text>
            )}
          </Pressable>

          <Pressable
            testID="back-to-cart-bottom-btn"
            className="mt-2 items-center justify-center rounded-xl border py-3"
            style={{ borderColor: tc.border }}
            disabled={orderMutation.isPending}
            onPress={() => navigation.goBack()}
          >
            <Text className="text-sm font-semibold" style={{ color: tc.muted }}>
              Volver al carrito
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
