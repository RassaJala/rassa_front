import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id_producto_semanal: number;
  producto: string;
  unidad: string;
  precio: number;
  foto: string | null;
  agricultor: string;
  cantidad: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'cantidad'>, cantidad?: number) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, cantidad: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, cantidad = 1) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.id_producto_semanal === item.id_producto_semanal,
          );

          if (existing) {
            const newQty = Math.min(existing.cantidad + cantidad, item.stock);
            return {
              items: state.items.map((i) =>
                i.id_producto_semanal === item.id_producto_semanal
                  ? { ...i, cantidad: newQty }
                  : i,
              ),
            };
          }

          return {
            items: [
              ...state.items,
              { ...item, cantidad: Math.min(cantidad, item.stock) },
            ],
          };
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id_producto_semanal !== id),
        }));
      },

      updateQuantity: (id, cantidad) => {
        if (cantidad <= 0) {
          set((state) => ({
            items: state.items.filter((i) => i.id_producto_semanal !== id),
          }));
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id_producto_semanal === id
              ? { ...i, cantidad: Math.min(cantidad, i.stock) }
              : i,
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      total: () => {
        return get().items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
      },
    }),
    { name: 'rassa-cart' },
  ),
);
