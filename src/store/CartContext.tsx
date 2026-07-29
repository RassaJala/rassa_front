import type { ReactNode } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';

// ── Types ──────────────────────────────────────────────────

export interface CartItem {
  readonly id_producto_semanal: number;
  readonly nombre_producto: string;
  readonly precio: string;
  readonly stock: number;
  readonly cantidad: number;
}

interface CartState {
  readonly items: readonly CartItem[];
}

type CartAction =
  | { readonly type: 'ADD_ITEM'; readonly payload: CartItem }
  | { readonly type: 'REMOVE_ITEM'; readonly payload: number }
  | {
      readonly type: 'UPDATE_QTY';
      readonly payload: { id: number; cantidad: number };
    }
  | { readonly type: 'CLEAR' };

interface CartContextType {
  readonly items: readonly CartItem[];
  readonly totalItems: number;
  readonly subtotal: number;
  readonly iva: number;
  readonly total: number;
  addItem: (item: CartItem) => void;
  removeItem: (idProductoSemanal: number) => void;
  updateQuantity: (idProductoSemanal: number, cantidad: number) => void;
  clearCart: () => void;
  hasItem: (idProductoSemanal: number) => boolean;
}

const IVA_RATE = 0.21;

/** Convierte un precio string a número, retorna 0 si es inválido */
function safePrice(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

// ── Reducer ─────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      if (action.payload.cantidad <= 0) return state;
      const existing = state.items.find(
        (i) => i.id_producto_semanal === action.payload.id_producto_semanal,
      );
      if (existing) {
        const newQty = Math.min(
          existing.cantidad + action.payload.cantidad,
          existing.stock,
        );
        return {
          items: state.items.map((i) =>
            i.id_producto_semanal === action.payload.id_producto_semanal
              ? { ...i, cantidad: newQty }
              : i,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            ...action.payload,
            cantidad: Math.min(action.payload.cantidad, action.payload.stock),
          },
        ],
      };
    }
    case 'REMOVE_ITEM':
      return {
        items: state.items.filter(
          (i) => i.id_producto_semanal !== action.payload,
        ),
      };
    case 'UPDATE_QTY': {
      if (action.payload.cantidad <= 0) {
        return {
          items: state.items.filter(
            (i) => i.id_producto_semanal !== action.payload.id,
          ),
        };
      }
      return {
        items: state.items.map((i) =>
          i.id_producto_semanal === action.payload.id
            ? { ...i, cantidad: Math.min(action.payload.cantidad, i.stock) }
            : i,
        ),
      };
    }
    case 'CLEAR':
      return { items: [] };
    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────

interface CartProviderProps {
  readonly children: ReactNode;
}

export function CartProvider({
  children,
}: CartProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const subtotal = useMemo(
    () =>
      state.items.reduce(
        (acc, item) => acc + safePrice(item.precio) * item.cantidad,
        0,
      ),
    [state.items],
  );

  const iva = useMemo(() => subtotal * IVA_RATE, [subtotal]);
  const total = useMemo(() => subtotal + iva, [subtotal, iva]);
  const totalItems = useMemo(
    () => state.items.reduce((acc, i) => acc + i.cantidad, 0),
    [state.items],
  );

  const addItem = useCallback(
    (item: CartItem) => dispatch({ type: 'ADD_ITEM', payload: item }),
    [],
  );

  const removeItem = useCallback(
    (id: number) => dispatch({ type: 'REMOVE_ITEM', payload: id }),
    [],
  );

  const updateQuantity = useCallback(
    (id: number, cantidad: number) =>
      dispatch({ type: 'UPDATE_QTY', payload: { id, cantidad } }),
    [],
  );

  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const hasItem = useCallback(
    (id: number) => state.items.some((i) => i.id_producto_semanal === id),
    [state.items],
  );

  const value = useMemo<CartContextType>(
    () => ({
      items: state.items,
      totalItems,
      subtotal,
      iva,
      total,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      hasItem,
    }),
    [
      state.items,
      totalItems,
      subtotal,
      iva,
      total,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      hasItem,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
