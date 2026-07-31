import type { ReactNode } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { safePrice } from '@/utils/format';

const CART_STORAGE_KEY = '@rassa/cart';

// ── Types ──────────────────────────────────────────────────

export interface CartItem {
  readonly id_producto_semanal: number;
  readonly nombre_producto: string;
  readonly precio: string;
  readonly stock: number;
  readonly cantidad: number;
}

export interface CartState {
  readonly items: readonly CartItem[];
}

export type CartAction =
  | { readonly type: 'ADD_ITEM'; readonly payload: CartItem }
  | { readonly type: 'REMOVE_ITEM'; readonly payload: number }
  | {
      readonly type: 'UPDATE_QTY';
      readonly payload: { id: number; cantidad: number };
    }
  | { readonly type: 'CLEAR' }
  | { readonly type: 'HYDRATE'; readonly payload: readonly CartItem[] };

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
const MAX_CART_ITEMS = 50;

// ── Reducer (exportado para testing) ────────────────────────

function handleAddItem(state: CartState, payload: CartItem): CartState {
  if (payload.cantidad <= 0) return state;
  const capped = Math.min(payload.cantidad, payload.stock);
  if (capped <= 0) return state;

  const existing = state.items.find(
    (i) => i.id_producto_semanal === payload.id_producto_semanal,
  );
  if (existing) {
    const newQty = Math.min(existing.cantidad + capped, existing.stock);
    if (newQty <= 0) return state;
    return {
      items: state.items.map((i) =>
        i.id_producto_semanal === payload.id_producto_semanal
          ? { ...i, cantidad: newQty }
          : i,
      ),
    };
  }
  if (state.items.length >= MAX_CART_ITEMS) return state;
  return {
    items: [
      ...state.items,
      { ...payload, cantidad: capped },
    ],
  };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      return handleAddItem(state, action.payload);
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
        items: state.items
          .map((i) =>
            i.id_producto_semanal === action.payload.id
              ? { ...i, cantidad: Math.min(action.payload.cantidad, i.stock) }
              : i,
          )
          .filter((i) => i.cantidad > 0),
      };
    }
    case 'CLEAR':
      return { items: [] };
    case 'HYDRATE':
      return { items: action.payload };
    default:
      if (__DEV__) {
         
        console.warn('Carrito: acción desconocida', action);
      }
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
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate desde AsyncStorage al montar
  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const items: readonly CartItem[] = JSON.parse(stored) as {
            id_producto_semanal: number;
            nombre_producto: string;
            precio: string;
            stock: number;
            cantidad: number;
          }[];
          dispatch({ type: 'HYDRATE', payload: items });
        }
      } catch {
        // Si falla la lectura, arrancamos vacío
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persistir después de cada cambio (excepto HYDRATE inicial)
  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items, hydrated]);

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
