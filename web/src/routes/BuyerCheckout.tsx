import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIsMutating, useMutation } from '@tanstack/react-query';
import { PageHeader } from '~/components/layout/PageHeader';
import { Button } from '~/components/ui/Button';
import { EmptyState } from '~/components/ui/EmptyState';
import { Toast, type ToastState } from '~/components/ui/Toast';
import { IVA_RATE } from '~/constants/order';
import { cartCardStyle } from '~/constants/styles';
import { useAppColors } from '~/hooks/useAppColors';
import {
  clearAmbiguousMarker,
  clearIdempotencyKey,
  clearInFlightCheckout,
  clearPlacedOrder,
  computePayloadFingerprint,
  CONCURRENT_CHECKOUT_MSG,
  getTabSessionId,
  hasConcurrentCheckout,
  readAmbiguousMarker,
  readPlacedOrder,
  resolveIdempotencyKey,
  writeAmbiguousMarker,
  writeInFlightCheckout,
  writePlacedOrder,
} from '~/services/checkoutGuard';
import type {
  AmbiguousMarker,
  PlacedOrderRecord,
} from '~/services/checkoutGuard';
import {
  AMBIGUOUS_MSG,
  clampOrderItems,
  createOrder,
  extractOrderError,
  isAmbiguousOrderError,
  reportAmbiguousOrder,
} from '~/services/orders';
import type { CreateOrderPayload } from '~/services/orders';
import { useCartStore } from '~/store/cartStore';

const CONFIRM_LABEL = 'Confirmar pedido';
const PENDING_LABEL = 'Procesando pedido…';
const AMBIGUOUS_ACK_LABEL = 'Ya revisé mis pedidos';
const PLACED_ACK_LABEL = 'Entendido';
const CREATE_ORDER_MUTATION_KEY = ['create-order'] as const;

// W-4: the idempotency key identifies one checkout attempt end-to-end; it is
// sent as an Idempotency-Key header (best-effort) and persisted so retries of
// the SAME attempt reuse it.
interface OrderAttempt {
  payload: CreateOrderPayload;
  idempotencyKey: string;
}

export function BuyerCheckout() {
  const t = useAppColors();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [ambiguousMarker, setAmbiguousMarker] =
    useState<AmbiguousMarker | null>(() => readAmbiguousMarker());
  // S-3: an order that succeeded after the user navigated away is surfaced on
  // the next checkout mount; the record is consumed (cleared) once shown.
  const [placedOrder, setPlacedOrder] = useState<PlacedOrderRecord | null>(
    () => {
      const record = readPlacedOrder();
      if (record !== null) clearPlacedOrder();
      return record;
    },
  );
  // S-10: synchronous in-flight flag — two handleConfirm calls in the same
  // tick cannot both pass (state-based guards only update after a re-render).
  const inFlightRef = useRef(false);

  // C-1: every callback lives at the MUTATION level so it survives unmount —
  // per-mutate callbacks are dropped together with the observer. The ambiguous
  // marker is persisted here so a remount surfaces the warning; it is cleared
  // on confirmed success, on a definitive failure, or by explicit dismissal.
  const mutation = useMutation({
    mutationKey: CREATE_ORDER_MUTATION_KEY,
    mutationFn: ({ payload, idempotencyKey }: OrderAttempt) =>
      createOrder(payload, idempotencyKey),
    onSuccess: (order) => {
      clearAmbiguousMarker();
      clearIdempotencyKey();
      clearInFlightCheckout();
      // S-3: even a navigate-away-while-pending success is not silent — the
      // next checkout mount shows the confirmation (record consumed on read).
      writePlacedOrder({ id_pedido: order.id_pedido, timestamp: Date.now() });
      setAmbiguousMarker(null);
      useCartStore.getState().clearCart();
      navigate(`/cliente/pedidos/${order.id_pedido}`);
    },
    onError: (err, variables) => {
      if (isAmbiguousOrderError(err)) {
        const marker: AmbiguousMarker = {
          timestamp: Date.now(),
          fingerprint: computePayloadFingerprint(
            variables?.payload.items ?? [],
          ),
        };
        writeAmbiguousMarker(marker);
        setAmbiguousMarker(marker);
        // S-11: structured observability — the operator must know the order
        // outcome is unknown and may exist server-side.
        reportAmbiguousOrder(err, {
          marker,
          idempotencyKey: variables?.idempotencyKey,
        });
      } else {
        clearAmbiguousMarker();
        clearIdempotencyKey();
        setAmbiguousMarker(null);
        setToast({ message: extractOrderError(err), type: 'error' });
      }
    },
    onSettled: () => {
      inFlightRef.current = false;
      clearInFlightCheckout();
    },
  });

  // R3-002: a fresh observer starts idle on remount even while the previous
  // POST is still in flight, so `mutation.isPending` alone cannot block a
  // second confirm after navigate-away-and-return. The MutationCache keeps the
  // pending mutation alive across unmount/remount — mirror it into the render
  // cycle with useIsMutating so the guard and the button stay active.
  const pendingOrderCount = useIsMutating({
    mutationKey: CREATE_ORDER_MUTATION_KEY,
  });
  const isOrderInFlight = mutation.isPending || pendingOrderCount > 0;

  // JD-A-001: a remount while the POST is still pending creates a fresh
  // observer whose own mutation never ran — the in-flight mutation's callbacks
  // (including onError → setAmbiguousMarker) are bound to the unmounted mount
  // and cannot update this instance. Re-read the persisted marker whenever the
  // in-flight state drops back to idle so a late ambiguous resolution surfaces
  // the warning here instead of silently re-enabling the button.
  useEffect(() => {
    if (!isOrderInFlight) {
      setAmbiguousMarker(readAmbiguousMarker());
    }
  }, [isOrderInFlight]);

  const subtotal = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;

  function handleDismissAmbiguous() {
    clearAmbiguousMarker();
    setAmbiguousMarker(null);
  }

  function handleDismissPlacedOrder() {
    setPlacedOrder(null);
  }

  function handleConfirm() {
    if (inFlightRef.current || isOrderInFlight || items.length === 0) return;

    // W-2: defense in depth — re-validate the persisted cart before mapping
    // the payload; the server 400 stays the authority for anything else.
    const { items: payloadItems, skipped } = clampOrderItems(items);
    if (skipped.length > 0) {
      const skippedNames = skipped
        .map(
          (id) =>
            items.find((item) => item.id_producto_semanal === id)?.producto,
        )
        .filter((name): name is string => name !== undefined)
        .join(', ');
      setToast({
        message: `Cantidad inválida en: ${skippedNames}. Revisá el carrito e intentá de nuevo.`,
        type: 'error',
      });
    }
    if (payloadItems.length === 0) return;

    // W-4: one stable key per attempt, keyed by payload fingerprint — a retry
    // of the SAME attempt reuses it; a different payload gets a fresh key.
    const fingerprint = computePayloadFingerprint(payloadItems);
    const idempotencyKey = resolveIdempotencyKey(fingerprint);

    // S-9: never confirm while ANOTHER tab has a checkout POST in flight —
    // two tabs with a persisted cart must not both create an order.
    if (hasConcurrentCheckout(getTabSessionId())) {
      setToast({ message: CONCURRENT_CHECKOUT_MSG, type: 'error' });
      return;
    }

    inFlightRef.current = true;
    // JD-A-002: persist the marker BEFORE the POST. A hard reload or tab close
    // while the request is pending destroys the JS context before the mutation
    // onError can run — this write guarantees the next mount still sees the
    // warning. It is cleared on confirmed success, definitive failure, or
    // dismissal; the local banner state is not set here so the live instance
    // only warns once the outcome actually settles.
    writeAmbiguousMarker({ timestamp: Date.now(), fingerprint });
    writeInFlightCheckout({
      tabSessionId: getTabSessionId(),
      idempotencyKey,
      timestamp: Date.now(),
      fingerprint,
    });
    mutation.mutate({ payload: { items: payloadItems }, idempotencyKey });
  }

  const ambiguityBanner =
    ambiguousMarker !== null ? (
      <div
        role="alert"
        className="mb-4 rounded-xl p-4"
        style={{ border: `1px solid ${t.border}`, backgroundColor: t.surface }}
      >
        <p className="text-sm font-medium" style={{ color: t.fg }}>
          {AMBIGUOUS_MSG}
        </p>
        <Button
          onClick={handleDismissAmbiguous}
          className="mt-3"
          style={{ backgroundColor: t.brand, color: t.onBrand }}
        >
          {AMBIGUOUS_ACK_LABEL}
        </Button>
      </div>
    ) : null;

  const placedOrderBanner =
    placedOrder !== null ? (
      <div
        role="status"
        className="mb-4 rounded-xl p-4"
        style={{ border: `1px solid ${t.border}`, backgroundColor: t.surface }}
      >
        <p className="text-sm font-medium" style={{ color: t.fg }}>
          Tu pedido N°{placedOrder.id_pedido} se confirmó. Podés verlo en Mis
          Pedidos.
        </p>
        <Button
          onClick={handleDismissPlacedOrder}
          className="mt-3"
          style={{ backgroundColor: t.brand, color: t.onBrand }}
        >
          {PLACED_ACK_LABEL}
        </Button>
      </div>
    ) : null;

  if (items.length === 0) {
    return (
      <>
        <Toast toast={toast} onDone={() => setToast(null)} />
        {ambiguityBanner}
        {placedOrderBanner}
        <PageHeader title="Checkout" />
        <EmptyState
          icon="🛒"
          title="Tu carrito está vacío"
          message="Agregá productos desde el catálogo para comenzar tu compra."
          action={
            <Link
              to="/cliente/catalogo"
              className="mt-4 rounded-xl px-6 py-3 text-sm font-bold"
              style={{ backgroundColor: t.brand, color: t.onBrand }}
            >
              Ir al catálogo
            </Link>
          }
        />
      </>
    );
  }

  const cardStyle = cartCardStyle(t.border, t.surface);

  return (
    <>
      <Toast toast={toast} onDone={() => setToast(null)} />
      {ambiguityBanner}
      {placedOrderBanner}
      <PageHeader title="Confirmá tu pedido" />

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id_producto_semanal} style={cardStyle}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold" style={{ color: t.fg }}>
                {item.producto}
              </p>
              <p className="text-sm" style={{ color: t.muted }}>
                ${item.precio}/{item.unidad} × {item.cantidad}
              </p>
            </div>
            <p className="font-bold" style={{ color: t.fg }}>
              ${(item.precio * item.cantidad).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div
        className="mt-6 rounded-xl p-4"
        style={{ border: `1px solid ${t.border}`, backgroundColor: t.surface }}
      >
        <div className="flex items-center justify-between py-1">
          <span className="text-sm" style={{ color: t.muted }}>
            Subtotal
          </span>
          <span className="font-semibold" style={{ color: t.fg }}>
            ${subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm" style={{ color: t.muted }}>
            {`IVA (${Math.round(IVA_RATE * 100)}%)`}
          </span>
          <span className="font-semibold" style={{ color: t.fg }}>
            ${iva.toFixed(2)}
          </span>
        </div>
        <div
          className="mt-2 flex items-center justify-between border-t pt-3"
          style={{ borderColor: t.border }}
        >
          <span className="text-lg font-bold" style={{ color: t.fg }}>
            Total
          </span>
          <span className="text-xl font-bold" style={{ color: t.brand }}>
            ${total.toFixed(2)}
          </span>
        </div>
      </div>

      <Button
        onClick={handleConfirm}
        disabled={isOrderInFlight}
        className="mt-4 w-full"
        style={{ backgroundColor: t.brand, color: t.onBrand }}
      >
        {isOrderInFlight ? (
          <>
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {PENDING_LABEL}
          </>
        ) : (
          CONFIRM_LABEL
        )}
      </Button>
    </>
  );
}
