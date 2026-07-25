import { useCartStore } from '../store/cartStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

const mockItem = {
  id_producto_semanal: 1,
  producto: 'Tomate orgánico',
  unidad: 'kg',
  precio: 25.5,
  foto: null,
  agricultor: 'Juan Pérez',
  stock: 50,
};

const mockItem2 = {
  id_producto_semanal: 2,
  producto: 'Lechuga hidropónica',
  unidad: 'pieza',
  precio: 15,
  foto: null,
  agricultor: 'María López',
  stock: 30,
};

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

function getFirst() {
  const item = useCartStore.getState().items[0];
  expect(item).toBeDefined();
  return item!;
}

describe('cartStore', () => {
  describe('addItem', () => {
    it('adds a new item with default quantity 1', () => {
      useCartStore.getState().addItem(mockItem);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(getFirst().cantidad).toBe(1);
    });

    it('adds a new item with custom quantity', () => {
      useCartStore.getState().addItem(mockItem, 5);
      expect(getFirst().cantidad).toBe(5);
    });

    it('increments quantity when adding the same item', () => {
      useCartStore.getState().addItem(mockItem, 2);
      useCartStore.getState().addItem(mockItem, 3);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(getFirst().cantidad).toBe(5);
    });

    it('does not exceed stock when adding existing item', () => {
      useCartStore.getState().addItem(mockItem, 40);
      useCartStore.getState().addItem(mockItem, 20);
      expect(getFirst().cantidad).toBe(50);
    });

    it('caps initial quantity to stock', () => {
      useCartStore.getState().addItem(mockItem, 100);
      expect(getFirst().cantidad).toBe(50);
    });

    it('adds multiple different items', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem2);
      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes an item by id', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem2);
      useCartStore.getState().removeItem(1);
      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0]!.id_producto_semanal).toBe(2);
    });

    it('does nothing if id does not exist', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().removeItem(999);
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('updates quantity for an item', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().updateQuantity(1, 10);
      expect(getFirst().cantidad).toBe(10);
    });

    it('does not exceed stock', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().updateQuantity(1, 999);
      expect(getFirst().cantidad).toBe(50);
    });

    it('removes item when quantity <= 0', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().updateQuantity(1, 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('removes item when quantity is negative', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().updateQuantity(1, -5);
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('removes all items', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem2);
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('total', () => {
    it('returns 0 for empty cart', () => {
      expect(useCartStore.getState().total()).toBe(0);
    });

    it('calculates total for single item', () => {
      useCartStore.getState().addItem(mockItem, 3);
      expect(useCartStore.getState().total()).toBe(25.5 * 3);
    });

    it('calculates total for multiple items', () => {
      useCartStore.getState().addItem(mockItem, 2);
      useCartStore.getState().addItem(mockItem2, 4);
      expect(useCartStore.getState().total()).toBe(25.5 * 2 + 15 * 4);
    });
  });
});
