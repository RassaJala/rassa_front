import React from 'react';

import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import CheckoutScreen from '@/screens/common/CheckoutScreen';
import {
  createOrder,
  findMatchingOrder,
  InvalidOrderEnvelopeError,
} from '@/services/orders';
import type { Pedido } from '@/services/orders';
import { useCartStore } from '@/store/cartStore';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
    goBack: mockGoBack,
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
  addBreadcrumb: jest.fn(),
}));

jest.mock('@/services/orders', () => {
  // Matching class so `instanceof InvalidOrderEnvelopeError` in the screen
  // works against errors created with the mocked export.
  class InvalidOrderEnvelopeError extends Error {
    constructor() {
      super('Invalid order response envelope');
      this.name = 'InvalidOrderEnvelopeError';
    }
  }
  return {
    createOrder: jest.fn(),
    findMatchingOrder: jest.fn().mockResolvedValue(null),
    InvalidOrderEnvelopeError,
  };
});

const mockCreateOrder = createOrder as jest.MockedFunction<typeof createOrder>;
const mockFindMatchingOrder = findMatchingOrder as jest.MockedFunction<
  typeof findMatchingOrder
>;

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

const mockPedido: Pedido = {
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
  mockFindMatchingOrder.mockResolvedValue(null);
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

  it('vuelve al carrito al presionar el botón Volver al carrito', () => {
    useCartStore.setState({ items: [mockItem] });

    const { getByTestId, getAllByText } = renderScreen();

    expect(getAllByText('Volver al carrito').length).toBeGreaterThan(0);
    fireEvent.press(getByTestId('back-to-cart-btn'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('vuelve al carrito desde el botón inferior junto a Confirmar pedido', () => {
    useCartStore.setState({ items: [mockItem] });

    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('back-to-cart-bottom-btn'));

    expect(mockGoBack).toHaveBeenCalled();
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

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'checkout',
        message: 'Pedido creado correctamente',
        data: { orderId: 45 },
      }),
    );
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('muestra el error del backend y conserva el carrito sin navegar', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
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

    // 4xx business rejections are expected outcomes: no Sentry alert.
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('muestra el item de un array de errores cuando es seguro (DRF non-field errors)', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
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
      isAxiosError: true,
      response: {
        status: 400,
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

  it('no expone un item inseguro de un array de errores (sanitiza a mensaje genérico)', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: ['django.db.utils.OperationalError: could not connect to server'],
      },
    });

    const { getByTestId, getByText, queryByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText('Error al procesar el pedido. Intente de nuevo.'),
      ).toBeTruthy();
    });

    expect(queryByText(/django\.db/)).toBeNull();
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
      isAxiosError: true,
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

  it('reconcilia: si el POST falla ambiguo pero el pedido existe, navega al éxito sin duplicar', async () => {
    useCartStore.setState({ items: [mockItem, mockItem2] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    });
    mockFindMatchingOrder.mockResolvedValue({
      id_pedido: 45,
      cliente_nombre: 'Ana Ramírez',
      vendedor_nombre: null,
      total: '9.68',
      estado_actual: 'pendiente',
      creado_en: '2026-07-30T12:00:00Z',
    });

    const { getByTestId, queryByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('OrderSuccess', {
        orderId: 45,
        total: '9.68',
        estado: 'pendiente',
      });
    });

    expect(mockFindMatchingOrder).toHaveBeenCalledWith(
      {
        items: [
          { id_producto_semanal: 1, cantidad: 2 },
          { id_producto_semanal: 2, cantidad: 3 },
        ],
      },
      expect.any(Number),
      ['Tomate', 'Lechuga'],
    );
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'checkout',
        data: { orderId: 45, reconciled: true },
      }),
    );
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(
      queryByText(
        'No pudimos confirmar si tu pedido se creó. Revisá Mis Pedidos antes de intentar de nuevo.',
      ),
    ).toBeNull();
  });

  it('reconcilia: sin pedido existente muestra el mensaje ambiguo y conserva el carrito', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
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

    expect(mockFindMatchingOrder).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('reconcilia: si el listado de pedidos falla, muestra el mensaje ambiguo sin romper el flujo', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    });
    mockFindMatchingOrder.mockRejectedValue(new Error('listado falló'));

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

  it('no duplica el pedido si se presiona dos veces en el mismo tick (guard por ref)', async () => {
    useCartStore.setState({ items: [mockItem] });

    let resolveOrder!: (value: typeof mockPedido) => void;
    mockCreateOrder.mockReturnValue(
      new Promise((resolve) => {
        resolveOrder = resolve;
      }),
    );

    const { getByTestId } = renderScreen();
    const button = getByTestId('confirm-order-btn');

    // Both presses in the same act: no re-render happens in between, so
    // `orderMutation.isPending` is still false for the second press — only the
    // ref guard can stop the duplicate POST.
    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });

    expect(mockCreateOrder).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveOrder(mockPedido);
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

  it('reconcilia con 5xx: mensaje ambiguo y carrito conservado si no hay pedido', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: 'Internal Server Error' },
    });
    mockFindMatchingOrder.mockResolvedValue(null);

    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText(
          'No pudimos confirmar si tu pedido se creó. Revisá Mis Pedidos antes de intentar de nuevo.',
        ),
      ).toBeTruthy();
    });

    expect(mockFindMatchingOrder).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('reconcilia con 5xx: navega al éxito con el pedido existente y limpia el carrito', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: 'Internal Server Error' },
    });
    mockFindMatchingOrder.mockResolvedValue({
      id_pedido: 45,
      cliente_nombre: 'Ana Ramírez',
      vendedor_nombre: null,
      total: '9.68',
      estado_actual: 'pendiente',
      creado_en: '2026-07-30T12:00:00Z',
    });

    const { getByTestId, queryByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('OrderSuccess', {
        orderId: 45,
        total: '9.68',
        estado: 'pendiente',
      });
    });

    expect(mockFindMatchingOrder).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(
      queryByText(
        'No pudimos confirmar si tu pedido se creó. Revisá Mis Pedidos antes de intentar de nuevo.',
      ),
    ).toBeNull();
  });

  it('no reconcilia con error de red puro (ERR_NETWORK): muestra error sanitizado y conserva el carrito', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      code: 'ERR_NETWORK',
      message: 'Network Error',
    });

    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText('Error al procesar el pedido. Intente de nuevo.'),
      ).toBeTruthy();
    });

    expect(mockFindMatchingOrder).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('reconcilia con InvalidOrderEnvelopeError: mensaje ambiguo y carrito conservado', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue(new InvalidOrderEnvelopeError());
    mockFindMatchingOrder.mockResolvedValue(null);

    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText(
          'No pudimos confirmar si tu pedido se creó. Revisá Mis Pedidos antes de intentar de nuevo.',
        ),
      ).toBeTruthy();
    });

    expect(mockFindMatchingOrder).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clasifica como ambiguo un error 5xx envuelto en cause (interceptor de axios-retry)', async () => {
    useCartStore.setState({ items: [mockItem] });
    const wrapped = new Error('boom');
    wrapped.cause = {
      isAxiosError: true,
      response: { status: 500, data: 'Internal Server Error' },
    };
    mockCreateOrder.mockRejectedValue(wrapped);
    mockFindMatchingOrder.mockResolvedValue(null);

    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText(
          'No pudimos confirmar si tu pedido se creó. Revisá Mis Pedidos antes de intentar de nuevo.',
        ),
      ).toBeTruthy();
    });

    // The cause-unwrap path must classify the wrapped 5xx as ambiguous, so the
    // order is reconciled and the ambiguous failure is captured by Sentry.
    expect(mockFindMatchingOrder).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('no crea el pedido si la cantidad supera el stock (carrito persistido viejo)', async () => {
    useCartStore.setState({
      items: [{ ...mockItem, cantidad: 99, stock: 5 }],
    });

    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    expect(
      getByText(
        'La cantidad de "Tomate" supera el stock disponible. Revisá el carrito.',
      ),
    ).toBeTruthy();
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('no crea el pedido si el carrito tiene datos inválidos (cantidad no entera)', async () => {
    useCartStore.setState({
      items: [{ ...mockItem, cantidad: 2.5 }],
    });

    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('confirm-order-btn'));

    expect(
      getByText(
        'El carrito contiene productos con cantidades inválidas. Revisá el carrito e intentá de nuevo.',
      ),
    ).toBeTruthy();
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
