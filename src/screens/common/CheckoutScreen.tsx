import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  clearInFlightOrder,
  createIdempotencyKey,
  getInFlightOrder,
  saveInFlightOrder,
} from '@/services/checkoutPersistence';
import {
  createOrder,
  findMatchingOrder,
  findOrderByRecord,
  InvalidOrderEnvelopeError,
} from '@/services/orders';
import type { CreateOrderPayload } from '@/services/orders';
import { sanitizeSentryError } from '@/services/sentry';
import { useCartStore } from '@/store/cartStore';
import type { CartItem } from '@/store/cartStore';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';
import { parseApiError } from '@/utils/apiErrors';
import { computeTotals, formatMoney, IVA_RATE } from '@/utils/money';

type Nav = NativeStackNavigationProp<BuyerStackParamList>;

// A client-generated key identifies this checkout attempt end-to-end. It is
// sent as an Idempotency-Key header (best-effort) and persisted in the
// in-flight record used to reconcile an app kill between POST and clearCart.
interface OrderAttempt {
  payload: CreateOrderPayload;
  idempotencyKey: string;
}

const IVA_LABEL = `IVA (${Math.round(IVA_RATE * 100)}%)`;
const ORDER_ERROR_FALLBACK = 'Error al procesar el pedido. Intente de nuevo.';
const CHECKOUT_AMBIGUOUS_ERROR =
  'No pudimos confirmar si tu pedido se creó. Revisá Mis Pedidos antes de intentar de nuevo.';
const CART_INVALID_ERROR =
  'El carrito contiene productos con cantidades inválidas. Revisá el carrito e intentá de nuevo.';
// Shown when the mount reconcile finds no matching order but the persisted
// in-flight record may still correspond to a committed order (e.g. the record
// predates the fuzzy 60s match window). The record is kept until the user
// acknowledges or a fresh attempt overwrites it.
const ORDER_MAY_EXIST_WARNING =
  'Es posible que tu pedido anterior ya se haya creado. Revisá Mis Pedidos antes de confirmar de nuevo.';

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

// Recovery cart resolution (exported for tests): after an app kill the mount
// reconcile may find the interrupted order already committed server-side. The
// recovered order covers `cantidad` units of each record-payload product, so
// those units are subtracted from the matching live line: a line keeps only
// the never-ordered delta (liveQty - recordedQty) and is dropped when no delta
// remains. Lines added after the interrupted attempt (never ordered) are
// preserved unchanged. When the live cart matches the payload exactly the
// result is an empty cart, identical to a wholesale clearCart.
export function resolveCartAfterRecovery(
  items: readonly CartItem[],
  recoveredLines: readonly { id_producto_semanal: number; cantidad: number }[],
): CartItem[] {
  const recordedQtyById = new Map<number, number>(
    recoveredLines.map((line): [number, number] => [
      line.id_producto_semanal,
      line.cantidad,
    ]),
  );
  return items.flatMap((item) => {
    const recordedQty = recordedQtyById.get(item.id_producto_semanal);
    if (recordedQty === undefined) {
      // Not covered by the recovered order: the line was never ordered.
      return [item];
    }
    const remainingQty = item.cantidad - recordedQty;
    // The recovered order consumed `recordedQty` units of this product: keep
    // the line only when a never-ordered delta survives the subtraction.
    return remainingQty > 0 ? [{ ...item, cantidad: remainingQty }] : [];
  });
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
  // Set when the mount reconcile found no matching order but kept the
  // possibly-committed in-flight record, asking the user to check Mis Pedidos
  // before re-submitting (JD-B-001).
  const [reconcileWarning, setReconcileWarning] = useState<string | null>(null);
  // Same-tick double-submit guard: `isPending` only updates on re-render, so
  // two taps in the same frame could both pass the render-state check. A ref
  // is set synchronously before the POST starts and cleared in `finally`.
  const inFlightRef = useRef(false);
  // True while the mount reconcile is pending: the confirm button is disabled
  // (and shows a pending indicator) so taps during the reconcile window are
  // not silently dropped (R3-B-001).
  const [reconciling, setReconciling] = useState(false);
  // Runs once per mount: an app kill between a successful POST and clearCart
  // leaves an in-flight record that must be reconciled before the user can
  // place a fresh order.
  const reconciledOnMountRef = useRef(false);

  const orderMutation = useMutation({
    mutationFn: (attempt: OrderAttempt) =>
      createOrder(attempt.payload, attempt.idempotencyKey),
  });

  useEffect(() => {
    if (reconciledOnMountRef.current) {
      return;
    }
    reconciledOnMountRef.current = true;

    let cancelled = false;
    // Mutual exclusion with handleConfirm (JD-A-001): the mount reconcile
    // reads and clears the same in-flight record the submit path manages, so
    // a confirm tap while the reconcile's async read + match is still pending
    // must be blocked. The submit path guards on inFlightRef, so the reconcile
    // holds the same guard until it settles.
    inFlightRef.current = true;
    setReconciling(true);

    void (async () => {
      try {
        const record = await getInFlightOrder();
        if (cancelled || record === null) {
          return;
        }
        try {
          const existing = await findOrderByRecord({
            payload: record.payload,
            productNames: record.productNames,
            total: record.total,
          });
          if (cancelled) {
            return;
          }
          if (existing === null) {
            // No match server-side, but the record may still correspond to a
            // committed order (e.g. created >60s ago and thus outside the
            // fuzzy match window, or the list is paginated). Never silently
            // discard a possibly-committed record: warn the user and keep it
            // until a fresh attempt overwrites it (JD-B-001).
            setReconcileWarning(ORDER_MAY_EXIST_WARNING);
            return;
          }
          // The order WAS created before the kill: recover the success state
          // instead of letting the user re-submit and duplicate the order.
          Sentry.addBreadcrumb({
            category: 'checkout',
            message: 'Pedido en vuelo reconciliado tras interrupción',
            level: 'info',
            data: {
              orderId: existing.id_pedido,
              reconciled: true,
              stale: true,
            },
          });
          // R3-B-002: never wipe cart lines the user added after the
          // interrupted attempt — the recovered order only covers the record
          // payload. The recorded quantity is subtracted from each matching
          // live line: a line keeps only the never-ordered delta (dropped
          // when no delta remains); everything else stays. When the live cart
          // matches the payload exactly, the resolution is an empty cart,
          // preserving the previous wholesale clearCart behavior.
          const remainingItems = resolveCartAfterRecovery(
            useCartStore.getState().items,
            record.payload.items,
          );
          if (remainingItems.length === 0) {
            useCartStore.getState().clearCart();
          } else {
            useCartStore.setState({ items: remainingItems });
          }
          await clearInFlightOrder();
          navigation.replace('OrderSuccess', {
            orderId: existing.id_pedido,
            total: existing.total,
            estado: existing.estado_actual,
          });
        } catch {
          // Reconciliation failed (offline, list error): keep the record so a
          // later mount can retry instead of risking a duplicate order.
        }
      } finally {
        inFlightRef.current = false;
        setReconciling(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigation]);

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
    // A fresh attempt starts now: it overwrites the in-flight record, so any
    // prior "may already have been created" warning no longer applies.
    setReconcileWarning(null);

    const payload: CreateOrderPayload = {
      items: items.map((i) => ({
        id_producto_semanal: i.id_producto_semanal,
        cantidad: i.cantidad,
      })),
    };
    // Single source of truth for the totals: the same computeTotals() the
    // render path uses, so the reconciled math can never drift from what the
    // user saw on screen.
    const totals = computeTotals(items);
    const productNames = items.map((i) => i.producto);
    const idempotencyKey = createIdempotencyKey();

    // Persist the in-flight attempt BEFORE issuing the POST: if the app is
    // killed after the server commits but before clearCart runs, the next
    // mount reconciles this record instead of re-submitting a duplicate.
    await saveInFlightOrder({
      idempotencyKey,
      payload,
      productNames,
      total: totals.total,
      createdAt: new Date().toISOString(),
    });

    try {
      // createOrder validates the envelope and throws
      // InvalidOrderEnvelopeError when `data` is missing, so a resolved order
      // is guaranteed to carry a numeric id_pedido before the cart is cleared.
      const order = await orderMutation.mutateAsync({
        payload,
        idempotencyKey,
      });
      // Record the created order id so a later ambiguous failure can be
      // correlated with this successful creation.
      Sentry.addBreadcrumb({
        category: 'checkout',
        message: 'Pedido creado correctamente',
        level: 'info',
        data: { orderId: order.id_pedido },
      });
      useCartStore.getState().clearCart();
      await clearInFlightOrder();
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
            totals.total,
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
            await clearInFlightOrder();
            navigation.replace('OrderSuccess', {
              orderId: existing.id_pedido,
              total: existing.total,
              estado: existing.estado_actual,
            });
            return;
          }
        } catch {
          // Reconciliation failed (e.g. the list request errored): fall
          // through to the ambiguous message so the user is never blocked.
        }
        // No match: KEEP the in-flight record — the server may still commit
        // the order — and let the next mount reconcile it again.
        setErrorMessage(CHECKOUT_AMBIGUOUS_ERROR);
      } else {
        // Definitive rejection (4xx with body) or a pure client/network
        // failure: the server never committed the order, so the in-flight
        // record is stale.
        await clearInFlightOrder();
        setErrorMessage(extractCheckoutError(error));
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [items, navigation, orderMutation]);

  if (items.length === 0) {
    return <EmptyCart isDark={isDark} />;
  }

  const { subtotal, iva, total } = computeTotals(items);
  const disabledBg = isDark
    ? colors.cartBtnDisabledBgD
    : colors.cartBtnDisabledBg;
  const buttonBusy = orderMutation.isPending || reconciling;
  const buttonBg = buttonBusy ? disabledBg : tc.brand;

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: tc.bg }}
      edges={['top']}
    >
      <View className="flex-1 px-4 pt-2">
        {/* Header */}
        <View className="mb-4 flex-row items-center justify-between pt-3">
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

        {reconcileWarning !== null && (
          <View
            className="mt-3 flex-row items-center"
            style={{ backgroundColor: tc.surface }}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={16}
              color={colors.warning}
            />
            <Text
              className="ml-1.5 flex-1 text-sm"
              style={{ color: colors.warning }}
            >
              {reconcileWarning}
            </Text>
          </View>
        )}

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
          className="mb-4 rounded-2xl border-t px-5 py-4"
          style={{ backgroundColor: tc.surface, borderTopColor: tc.border }}
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
            disabled={buttonBusy}
            onPress={() => void handleConfirm()}
          >
            {buttonBusy ? (
              <ActivityIndicator
                testID="confirm-order-loading"
                size="small"
                color={colors.iconWhite}
              />
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
