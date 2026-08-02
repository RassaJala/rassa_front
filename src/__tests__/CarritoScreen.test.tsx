import React from 'react';

import { Alert } from 'react-native';

import { fireEvent, render } from '@testing-library/react-native';

import CarritoScreen from '@/screens/common/CarritoScreen';
import { useCartStore } from '@/store/cartStore';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

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
  jest.restoreAllMocks();
});

describe('CarritoScreen', () => {
  it('renders empty state', () => {
    const { getByText } = render(<CarritoScreen />);
    expect(getByText('Carrito vacío')).toBeTruthy();
    expect(
      getByText('Agregá productos desde el catálogo para comenzar tu compra.'),
    ).toBeTruthy();
  });

  it('renders items with subtotal and total', () => {
    useCartStore.setState({ items: [mockItem] });

    const { getByText, getAllByText } = render(<CarritoScreen />);
    expect(getByText('Tomate')).toBeTruthy();
    expect(getByText('$2.5/kg')).toBeTruthy();
    expect(getAllByText('$5.00')).toHaveLength(2);
    expect(getByText('Mi Carrito')).toBeTruthy();
  });

  it('renders multiple items and calculates total', () => {
    useCartStore.setState({ items: [mockItem, mockItem2] });

    const { getByText } = render(<CarritoScreen />);
    expect(getByText('Tomate')).toBeTruthy();
    expect(getByText('Lechuga')).toBeTruthy();
    expect(getByText('$8.00')).toBeTruthy();
  });

  it('increments quantity via + button', () => {
    useCartStore.setState({ items: [{ ...mockItem, cantidad: 2 }] });

    const { getByTestId } = render(<CarritoScreen />);
    fireEvent.press(getByTestId('qty-inc'));

    expect(useCartStore.getState().items[0]?.cantidad).toBe(3);
  });

  it('decrements quantity via - button', () => {
    useCartStore.setState({ items: [{ ...mockItem, cantidad: 3 }] });

    const { getByTestId } = render(<CarritoScreen />);
    fireEvent.press(getByTestId('qty-dec'));

    expect(useCartStore.getState().items[0]?.cantidad).toBe(2);
  });

  it('removes item via delete button', () => {
    useCartStore.setState({ items: [mockItem, mockItem2] });

    const { getAllByTestId } = render(<CarritoScreen />);
    // First remove-item button corresponds to the first item in the list
    const removeBtns = getAllByTestId('remove-item');
    fireEvent.press(removeBtns[0]);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.id_producto_semanal).toBe(2);
  });

  it('clears cart via Vaciar button with confirmation', () => {
    useCartStore.setState({ items: [mockItem, mockItem2] });
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByTestId } = render(<CarritoScreen />);
    fireEvent.press(getByTestId('clear-cart'));

    expect(spy).toHaveBeenCalledWith(
      'Vaciar carrito',
      '¿Estás seguro? Se eliminarán todos los productos.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Vaciar', style: 'destructive' }),
      ]),
    );
  });

  it('navigates to Checkout when pressing Continuar compra', () => {
    useCartStore.setState({ items: [mockItem] });

    const { getByTestId } = render(<CarritoScreen />);
    fireEvent.press(getByTestId('checkout-btn'));

    expect(mockNavigate).toHaveBeenCalledWith('Checkout');
  });

  it('disables + button at stock limit', () => {
    useCartStore.setState({
      items: [{ ...mockItem, cantidad: 10, stock: 10 }],
    });

    const { getByTestId } = render(<CarritoScreen />);
    const incBtn = getByTestId('qty-inc');
    expect(incBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables - button at quantity 1', () => {
    useCartStore.setState({ items: [{ ...mockItem, cantidad: 1 }] });

    const { getByTestId } = render(<CarritoScreen />);
    const decBtn = getByTestId('qty-dec');
    expect(decBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('does not allow quantity above stock', () => {
    useCartStore.setState({ items: [mockItem] });

    const { getByTestId } = render(<CarritoScreen />);
    // Stock is 10, current is 2. Press + 8 times to reach stock limit
    const incBtn = getByTestId('qty-inc');
    for (let i = 0; i < 10; i++) {
      fireEvent.press(incBtn);
    }
    expect(useCartStore.getState().items[0]?.cantidad).toBe(10);
    // Button should now be disabled
    expect(incBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('does not remove item when quantity is 1 and minus is pressed', () => {
    useCartStore.setState({ items: [{ ...mockItem, cantidad: 1 }] });

    const { getByTestId } = render(<CarritoScreen />);
    // Minus button is disabled at cantidad=1, so pressing it should not remove the item
    const decBtn = getByTestId('qty-dec');
    expect(decBtn.props.accessibilityState?.disabled).toBe(true);
    // Item should still be in the cart
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.cantidad).toBe(1);
  });
});
