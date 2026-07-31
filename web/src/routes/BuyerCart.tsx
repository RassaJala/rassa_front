import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { getColors } from '../constants/colors';
import { useTheme } from '../providers/ThemeProvider';
import { useCartStore } from '../store/cartStore';

function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_API_URL ?? '/api').replace(
    /\/api\/?$/,
    '',
  );
  return `${base}${path}`;
}

export function BuyerCart() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const total = useCartStore((s) => s.total);
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const c = getColors(resolved === 'dark');

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    borderRadius: 12,
    border: `1px solid ${c.border}`,
    backgroundColor: c.surface,
    padding: 16,
  };

  const qtyBtnStyle: React.CSSProperties = {
    display: 'flex',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    border: `1px solid ${c.border}`,
    color: c.muted,
    cursor: 'pointer',
    backgroundColor: 'transparent',
    fontSize: 14,
  };

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Mi Carrito" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 text-5xl">🛒</span>
          <h3 className="text-lg font-semibold" style={{ color: c.fg }}>
            Tu carrito está vacío
          </h3>
          <p className="mt-1 text-sm" style={{ color: c.muted }}>
            Agregá productos desde el catálogo para comenzar tu compra.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Mi Carrito" />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm" style={{ color: c.muted }}>
          {items.reduce((s, i) => s + i.cantidad, 0)} productos
        </p>
        <button
          onClick={clearCart}
          className="text-sm font-medium text-red-500 hover:text-red-600"
        >
          Vaciar carrito
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const imageUri = mediaUrl(item.foto);
          return (
            <div key={item.id_producto_semanal} style={cardStyle}>
              {/* Image */}
              <div
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
                style={{ backgroundColor: c.bg }}
              >
                {imageUri ? (
                  <img
                    src={imageUri}
                    alt={item.producto}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">🥬</span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold" style={{ color: c.fg }}>
                  {item.producto}
                </p>
                <p className="text-sm" style={{ color: c.muted }}>
                  ${item.precio}/{item.unidad}
                </p>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateQuantity(item.id_producto_semanal, item.cantidad - 1)
                  }
                  style={qtyBtnStyle}
                >
                  −
                </button>
                <span
                  className="w-6 text-center text-sm font-bold"
                  style={{ color: c.fg }}
                >
                  {item.cantidad}
                </span>
                <button
                  onClick={() =>
                    updateQuantity(item.id_producto_semanal, item.cantidad + 1)
                  }
                  disabled={item.cantidad >= item.stock}
                  style={{
                    ...qtyBtnStyle,
                    opacity: item.cantidad >= item.stock ? 0.4 : 1,
                    cursor:
                      item.cantidad >= item.stock ? 'not-allowed' : 'pointer',
                  }}
                >
                  +
                </button>
              </div>

              {/* Subtotal */}
              <p
                className="w-20 text-right font-bold"
                style={{ color: c.brand }}
              >
                ${(item.precio * item.cantidad).toFixed(2)}
              </p>

              {/* Remove */}
              <button
                onClick={() => removeItem(item.id_producto_semanal)}
                className="hover:text-red-500"
                style={{ color: c.muted }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div
        className="mt-6 flex items-center justify-between rounded-xl p-4"
        style={{ border: `1px solid ${c.border}`, backgroundColor: c.surface }}
      >
        <p className="text-lg font-bold" style={{ color: c.fg }}>
          Total
        </p>
        <p className="text-xl font-bold" style={{ color: c.brand }}>
          ${total().toFixed(2)}
        </p>
      </div>

      <button
        className="mt-4 w-full rounded-xl py-3 text-sm font-bold text-white hover:opacity-90"
        style={{ backgroundColor: c.brand }}
        onClick={() => navigate('/cliente/checkout')}
      >
        Continuar compra
      </button>
    </>
  );
}
