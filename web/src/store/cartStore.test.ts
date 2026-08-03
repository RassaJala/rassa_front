import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore, type CartItem } from './cartStore';

const CART_STORAGE_KEY = 'rassa-cart';

const ITEM: CartItem = {
  id_producto_semanal: 9,
  producto: 'Papa',
  unidad: 'kg',
  precio: 12,
  foto: null,
  agricultor: 'Luis Díaz',
  cantidad: 3,
  stock: 10,
};

function dispatchCartStorageEvent(newValue: string | null) {
  window.dispatchEvent(
    new StorageEvent('storage', { key: CART_STORAGE_KEY, newValue }),
  );
}

function persistedCart(items: CartItem[]) {
  return JSON.stringify({ state: { items }, version: 0 });
}

beforeEach(() => {
  window.localStorage.clear();
  useCartStore.setState({ items: [] });
});

afterEach(() => {
  useCartStore.setState({ items: [] });
  vi.restoreAllMocks();
});

describe('cartStore — cross-tab sync (S-9)', () => {
  it('rehydrates the store when another tab writes the cart', async () => {
    const otherTabValue = persistedCart([ITEM]);
    window.localStorage.setItem(CART_STORAGE_KEY, otherTabValue);

    dispatchCartStorageEvent(otherTabValue);

    await vi.waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(1);
    });
    expect(useCartStore.getState().items[0]?.producto).toBe('Papa');
    expect(useCartStore.getState().items[0]?.cantidad).toBe(3);
  });

  it('syncs an emptied cart from another tab (items removed via the event)', async () => {
    useCartStore.setState({ items: [ITEM] });
    expect(useCartStore.getState().items).toHaveLength(1);

    const clearedValue = persistedCart([]);
    window.localStorage.setItem(CART_STORAGE_KEY, clearedValue);

    dispatchCartStorageEvent(clearedValue);

    await vi.waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  it('does not touch the store on storage events for other keys', async () => {
    useCartStore.setState({ items: [ITEM] });

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'some-other-key', newValue: 'x' }),
    );

    // Give any (incorrect) rehydration a chance to run — it must not happen.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
