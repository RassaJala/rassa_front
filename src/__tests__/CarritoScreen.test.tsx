/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { render } from '@testing-library/react-native';

import CarritoScreen from '@/screens/common/CarritoScreen';
import { useCartStore } from '@/store/cartStore';

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

const mockItem = {
  id_producto_semanal: 1,
  producto: 'Tomate',
  unidad: 'kg',
  precio: 2.5,
  foto: null,
  agricultor: 'Don Pedro',
  cantidad: 2,
  stock: 10,
};

const mockItem2 = {
  id_producto_semanal: 2,
  producto: 'Lechuga',
  unidad: 'unidad',
  precio: 1.0,
  foto: null,
  agricultor: 'Doña María',
  cantidad: 3,
  stock: 5,
};

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('CarritoScreen', () => {
  it('renders empty state', () => {
    const { getByText } = render(<CarritoScreen />);
    expect(getByText('Carrito vacío')).toBeTruthy();
    expect(
      getByText(
        'Agregá productos desde el catálogo para comenzar tu compra.',
      ),
    ).toBeTruthy();
  });

  it('renders items with subtotal and total', () => {
    useCartStore.setState({ items: [mockItem] });

    const { getByText, getAllByText } = render(<CarritoScreen />);
    expect(getByText('Tomate')).toBeTruthy();
    expect(getByText('$2.5/kg')).toBeTruthy();
    // $5.00 appears as both subtotal and total
    expect(getAllByText('$5.00')).toHaveLength(2);
    expect(getByText('Mi Carrito')).toBeTruthy();
  });

  it('renders multiple items and calculates total', () => {
    useCartStore.setState({ items: [mockItem, mockItem2] });

    const { getByText } = render(<CarritoScreen />);
    expect(getByText('Tomate')).toBeTruthy();
    expect(getByText('Lechuga')).toBeTruthy();
    // total = 2.5*2 + 1.0*3 = 8.00
    expect(getByText('$8.00')).toBeTruthy();
  });

  it('updates quantity via store', () => {
    useCartStore.setState({ items: [mockItem] });

    render(<CarritoScreen />);
    expect(useCartStore.getState().items[0]?.cantidad).toBe(2);

    useCartStore.getState().updateQuantity(1, 5);
    expect(useCartStore.getState().items[0]?.cantidad).toBe(5);
  });

  it('clears cart via store', () => {
    useCartStore.setState({ items: [mockItem, mockItem2] });

    render(<CarritoScreen />);
    expect(useCartStore.getState().items).toHaveLength(2);

    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removes item via store', () => {
    useCartStore.setState({ items: [mockItem, mockItem2] });

    render(<CarritoScreen />);
    useCartStore.getState().removeItem(1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.id_producto_semanal).toBe(2);
  });

  it('does not allow quantity above stock', () => {
    useCartStore.setState({ items: [mockItem] });

    render(<CarritoScreen />);
    useCartStore.getState().updateQuantity(1, 99);
    expect(useCartStore.getState().items[0]?.cantidad).toBe(10);
  });

  it('removes item when quantity <= 0', () => {
    useCartStore.setState({ items: [mockItem] });

    render(<CarritoScreen />);
    useCartStore.getState().updateQuantity(1, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('shows Vaciar button', () => {
    useCartStore.setState({ items: [mockItem] });

    const { getByText } = render(<CarritoScreen />);
    expect(getByText('Vaciar')).toBeTruthy();
  });

  it('shows Continuar compra button', () => {
    useCartStore.setState({ items: [mockItem] });

    const { getByText } = render(<CarritoScreen />);
    expect(getByText('Continuar compra')).toBeTruthy();
  });
});
