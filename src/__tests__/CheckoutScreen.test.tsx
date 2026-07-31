import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import CheckoutScreen from '@/screens/common/CheckoutScreen';
import { createOrder } from '@/services/orders';
import { useCartStore } from '@/store/cartStore';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/services/orders', () => ({
  createOrder: jest.fn(),
}));

const mockCreateOrder = createOrder as jest.MockedFunction<typeof createOrder>;

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

const mockPedido = {
  id_pedido: 45,
  cliente_nombre: 'Ana Ramírez',
  estado: 'pendiente',
  subtotal: '8.00',
  iva: '1.68',
  total: '9.68',
  detalles: [],
  creado_en: '2026-07-30T12:00:00Z',
};

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckoutScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useCartStore.setState({ items: [] });
});

describe('CheckoutScreen', () => {
  it('renderiza el resumen del pedido con subtotal, IVA y total', () => {
    useCartStore.setState({ items: [mockItem, mockItem2] });

    const { getByText, getAllByText } = renderScreen();

    expect(getAllByText('Confirmar pedido').length).toBeGreaterThan(0);
    expect(getByText('Tomate')).toBeTruthy();
    expect(getByText('Lechuga')).toBeTruthy();
    expect(getByText('$2.50/kg')).toBeTruthy();
    expect(getByText('$1.00/unidad')).toBeTruthy();
    expect(getByText('Cantidad: 2')).toBeTruthy();
    expect(getByText('Cantidad: 3')).toBeTruthy();
    expect(getByText('$5.00')).toBeTruthy();
    expect(getByText('$3.00')).toBeTruthy();
    expect(getByText('Subtotal')).toBeTruthy();
    expect(getByText('$8.00')).toBeTruthy();
    expect(getByText('IVA (21%)')).toBeTruthy();
    expect(getByText('$1.68')).toBeTruthy();
    expect(getByText('Total')).toBeTruthy();
    expect(getByText('$9.68')).toBeTruthy();
  });

  it('muestra estado vacío sin botón de confirmar cuando el carrito está vacío', () => {
    const { getByText, queryByTestId } = renderScreen();

    expect(getByText('Carrito vacío')).toBeTruthy();
    expect(
      getByText('Agregá productos desde el catálogo para comenzar tu compra.'),
    ).toBeTruthy();
    expect(queryByTestId('confirm-order-btn')).toBeNull();
  });

  it('crea el pedido, limpia el carrito y navega al éxito', async () => {
    useCartStore.setState({ items: [mockItem, mockItem2] });
    mockCreateOrder.mockResolvedValue(mockPedido);

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        {
          items: [
            { id_producto_semanal: 1, cantidad: 2 },
            { id_producto_semanal: 2, cantidad: 3 },
          ],
        },
        expect.anything(),
      );
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('OrderSuccess', {
        orderId: 45,
        total: '9.68',
        estado: 'pendiente',
      });
    });

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('muestra el error del backend y conserva el carrito sin navegar', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      response: {
        data: {
          detail:
            "Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5.",
        },
      },
    });

    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText(
          "Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5.",
        ),
      ).toBeTruthy();
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('muestra errores con forma de array (DRF non-field errors) tal cual', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      response: {
        data: [
          "Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5.",
        ],
      },
    });

    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText(
          "Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5.",
        ),
      ).toBeTruthy();
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('no expone tracebacks del backend en detail (sanitiza a mensaje genérico)', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      response: {
        status: 500,
        data: {
          detail:
            'Traceback (most recent call last):\n  File "/app/views.py", line 12\nZeroDivisionError: division by zero',
        },
      },
    });

    const { getByTestId, getByText, queryByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText('Error al procesar el pedido. Intente de nuevo.'),
      ).toBeTruthy();
    });

    expect(queryByText(/Traceback/)).toBeNull();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('no crea un pedido duplicado si se presiona dos veces el botón de confirmar', async () => {
    useCartStore.setState({ items: [mockItem] });

    let resolveOrder!: (value: typeof mockPedido) => void;
    mockCreateOrder.mockReturnValue(
      new Promise((resolve) => {
        resolveOrder = resolve;
      }),
    );

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    // El pedido sigue en vuelo: dejar que el estado pending se commitee
    // (timing realista entre dos toques).
    await act(async () => {});

    fireEvent.press(getByTestId('confirm-order-btn'));

    expect(mockCreateOrder).toHaveBeenCalledTimes(1);

    // Resolver el pedido para no dejar la mutación colgada (limpieza del test).
    await act(async () => {
      resolveOrder(mockPedido);
    });
  });

  it('muestra mensaje ambiguo y conserva el carrito cuando el pedido pudo haberse creado (timeout)', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    });

    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText(
          'No pudimos confirmar si tu pedido se creó. Revisá Mis Pedidos antes de intentar de nuevo.',
        ),
      ).toBeTruthy();
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
