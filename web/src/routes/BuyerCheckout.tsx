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
  readInFlightCheckout,
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
// W-2: shown when a confirm is attempted while an unresolved ambiguous outcome
// blocks it — the user must acknowledge the warning banner first.
const AMBIGUOUS_BLOCK_MSG = 'Revisá tus pedidos antes de confirmar de nuevo.';
// W-7: shown when persisting the guard records fails (quota/incognito) — the
// confirm aborts instead of firing a POST without its guards in place.
const WRITE_FAILED_MSG =
  'No se pudo guardar el estado del pedido. Intentá de nuevo.';

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
  // the next checkout mount; the record is consumed (cleared) once shown. The
  // consumption must NOT happen in this initializer — React initializers must
  // be pure (R4-W1): StrictMode double-invokes them in dev, and a discarded
  // render would consume the record without ever showing the banner. The
  // record is consumed in the effect below, which also re-reads it when an
  // in-flight POST settles (R4-W2).
  const [placedOrder, setPlacedOrder] = useState<PlacedOrderRecord | null>(
    null,
  );
  // S-10: synchronous in-flight flag — two handleConfirm calls in the same
  // tick cannot both pass (state-based guards only update after a re-render).
  const inFlightRef = useRef(false);
  // W-5: tracks whether this checkout instance is still mounted. The
  // mutation-level onSuccess runs even after unmount — the placed-order record
  // is only written for HIDDEN successes (the user navigated away), never for
  // a success the user actually saw.
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // C-1: every callback lives at the MUTATION level so it survives unmount —
  // per-mutate callbacks are dropped together with the observer. The ambiguous
  // marker is persisted here so a remount surfaces the warning; it is cleared
  // on confirmed success, on a definitive failure, or by explicit dismissal.
  const mutation = useMutation({
    mutationKey: CREATE_ORDER_MUTATION_KEY,
    mutationFn: ({ payload, idempotencyKey }: OrderAttempt) =>
      createOrder(payload, idempotencyKey),
    onSuccess: (order) => {
      // JD-A-002/JD-B-001: storage bookkeeping in the mutation callbacks is
      // best-effort — a quota/incognito throw must never abort this path. The
      // order EXISTS server-side: the cart MUST still clear and the user MUST
      // still navigate, or a stale cart invites a duplicate order.
      try {
        clearAmbiguousMarker();
        clearIdempotencyKey();
        clearInFlightCheckout();
        // W-5: only a HIDDEN success (resolved after navigate-away) writes the
        // placed-order record. A visible success already navigates to the order
        // detail, so the next checkout mount must NOT show a stale banner.
        if (!mountedRef.current) {
          writePlacedOrder({
            id_pedido: order.id_pedido,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.warn('checkout: success bookkeeping failed', e);
      }
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
        // JD-A-002/JD-B-001: persisting the marker is best-effort — a throw
        // must not prevent the in-memory banner and the observability report.
        try {
          writeAmbiguousMarker(marker);
        } catch (e) {
          console.warn('checkout: ambiguous marker persistence failed', e);
        }
        setAmbiguousMarker(marker);
        // S-11: structured observability — the operator must know the order
        // outcome is unknown and may exist server-side.
        reportAmbiguousOrder(err, {
          marker,
          idempotencyKey: variables?.idempotencyKey,
        });
      } else {
        try {
          clearAmbiguousMarker();
          clearIdempotencyKey();
        } catch (e) {
          console.warn('checkout: error bookkeeping failed', e);
        }
        setAmbiguousMarker(null);
        setToast({ message: extractOrderError(err), type: 'error' });
      }
    },
    onSettled: () => {
      inFlightRef.current = false;
      // JD-A-002/JD-B-001: the ref is already reset — a storage throw must not
      // leave the button dead.
      try {
        clearInFlightCheckout();
      } catch (e) {
        console.warn('checkout: in-flight cleanup failed', e);
      }
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

  // R4-W1/R4-W2: consume the placed-order record in an effect, NOT in the
  // useState initializer (React initializers must be pure — StrictMode
  // double-invokes them in dev, and a discarded prod render would consume
  // the record without showing the banner). Mirror the ambiguous-marker
  // effect: when the in-flight state drops back to idle, re-read the record
  // so a confirmation deferred by LOW-4 (mount while a POST is pending)
  // surfaces on THIS mount instead of requiring another one.
  useEffect(() => {
    if (isOrderInFlight) return;
    const record = readPlacedOrder();
    if (record !== null && readInFlightCheckout() === null) {
      clearPlacedOrder();
      setPlacedOrder(record);
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

    // W-2: an unresolved ambiguous outcome blocks re-confirmation until the
    // user acknowledges the warning — a blind re-confirm could create a
    // duplicate order.
    if (ambiguousMarker !== null) {
      setToast({ message: AMBIGUOUS_BLOCK_MSG, type: 'error' });
      return;
    }

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
    const ownTabSessionId = getTabSessionId();

    // S-9: never confirm while ANOTHER tab has a checkout POST in flight —
    // two tabs with a persisted cart must not both create an order.
    if (hasConcurrentCheckout(ownTabSessionId)) {
      setToast({ message: CONCURRENT_CHECKOUT_MSG, type: 'error' });
      return;
    }

    inFlightRef.current = true;
    // W-7: a storage write failure must never fire a POST without its guards
    // persisted nor leave the button dead — abort with a toast instead.
    try {
      // JD-A-002 (W-8): persist the marker BEFORE the POST to BOTH storages. A
      // hard reload OR tab close while the request is pending destroys the JS
      // context before the mutation onError can run — this write guarantees
      // the next mount still sees the warning. It is cleared on confirmed
      // success, definitive failure, or dismissal; the local banner state is
      // not set here so the live instance only warns once the outcome settles.
      writeAmbiguousMarker({ timestamp: Date.now(), fingerprint });
      writeInFlightCheckout({
        tabSessionId: ownTabSessionId,
        idempotencyKey,
        timestamp: Date.now(),
        fingerprint,
      });
    } catch {
      inFlightRef.current = false;
      // JD-A-001/JD-B-002: roll back the optimistic marker write — the POST
      // never fired, so no false ambiguous state may survive for the next
      // checkout mount (it would block re-confirmation of an un-attempted
      // order).
      clearAmbiguousMarker();
      setToast({ message: WRITE_FAILED_MSG, type: 'error' });
      return;
    }

    // W-4 (follow-up): write-then-verify — between the hasConcurrentCheckout
    // check and OUR write, another tab may have won the race. Re-read the
    // record: if it now belongs to a foreign session, abort. This narrows (not
    // eliminates) the TOCTOU window — the backend idempotency key is the real
    // duplicate-order guarantee.
    const afterWrite = readInFlightCheckout();
    if (afterWrite !== null && afterWrite.tabSessionId !== ownTabSessionId) {
      inFlightRef.current = false;
      // JD-A-001/JD-B-002: OUR optimistic marker write is rolled back — no
      // POST left this tab, so no false ambiguous state may survive for the
      // next checkout mount.
      clearAmbiguousMarker();
      // R4-follow-up: the stored record is the WINNER tab's REAL in-flight
      // record — it passed its own write-then-verify and is about to POST.
      // Clearing it here would void the S-9 cross-tab guard for the whole
      // duration of the winner's POST (duplicate-order window), so it is left
      // intact: the winner's onSettled/onError clears its own record, and a
      // crashed tab's stale record is already handled by the TTL in
      // readInFlightCheckout.
      setToast({ message: CONCURRENT_CHECKOUT_MSG, type: 'error' });
      return;
    }

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
