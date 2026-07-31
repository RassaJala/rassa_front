import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIsMutating, useMutation } from '@tanstack/react-query';
import { PageHeader } from '~/components/layout/PageHeader';
import { Button } from '~/components/ui/Button';
import { Toast, type ToastState } from '~/components/ui/Toast';
import { IVA_RATE } from '~/constants/order';
import { useAppColors } from '~/hooks/useAppColors';
import {
  AMBIGUOUS_MSG,
  createOrder,
  extractOrderError,
  isAmbiguousOrderError,
} from '~/services/orders';
import { useCartStore } from '~/store/cartStore';

const CONFIRM_LABEL = 'Confirmar pedido';
const PENDING_LABEL = 'Procesando pedido…';
const CREATE_ORDER_MUTATION_KEY = ['create-order'] as const;

export function BuyerCheckout() {
  const t = useAppColors();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const [toast, setToast] = useState<ToastState | null>(null);

  // R3-002: clearCart lives on the mutation-level onSuccess (not the
  // mutate-level one) so it still runs when the order resolves after the
  // component unmounted — mutate-level callbacks are dropped with the observer.
  const mutation = useMutation({
    mutationKey: CREATE_ORDER_MUTATION_KEY,
    mutationFn: createOrder,
    onSuccess: () => {
      useCartStore.getState().clearCart();
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

  const subtotal = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;

  function handleConfirm() {
    if (isOrderInFlight || items.length === 0) return;
    mutation.mutate(
      {
        items: items.map((i) => ({
          id_producto_semanal: i.id_producto_semanal,
          cantidad: i.cantidad,
        })),
      },
      {
        onSuccess: (order) => {
          navigate(`/cliente/pedidos/${order.id_pedido}`);
        },
        onError: (err) => {
          const message = isAmbiguousOrderError(err)
            ? AMBIGUOUS_MSG
            : extractOrderError(err);
          setToast({ message, type: 'error' });
        },
      },
    );
  }

  if (items.length === 0) {
    return (
      <>
        <Toast toast={toast} onDone={() => setToast(null)} />
        <PageHeader title="Checkout" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 text-5xl">🛒</span>
          <h3 className="text-lg font-semibold" style={{ color: t.fg }}>
            Tu carrito está vacío
          </h3>
          <p className="mt-1 text-sm" style={{ color: t.muted }}>
            Agregá productos desde el catálogo para comenzar tu compra.
          </p>
          <Link
            to="/cliente/catalogo"
            className="mt-4 rounded-xl px-6 py-3 text-sm font-bold"
            style={{ backgroundColor: t.brand, color: t.onBrand }}
          >
            Ir al catálogo
          </Link>
        </div>
      </>
    );
  }

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    backgroundColor: t.surface,
    padding: 16,
  };

  return (
    <>
      <Toast toast={toast} onDone={() => setToast(null)} />
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
            IVA (21%)
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
