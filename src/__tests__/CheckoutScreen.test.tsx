import React from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { IN_FLIGHT_ORDER_KEY } from '@/services/checkoutPersistence';
import type { InFlightOrderRecord } from '@/services/checkoutPersistence';
import CheckoutScreen, {
  resolveCartAfterRecovery,
} from '@/screens/common/CheckoutScreen';
import {
  createOrder,
  findMatchingOrder,
  findOrderByRecord,
  InvalidOrderEnvelopeError,
} from '@/services/orders';
import type { Pedido } from '@/services/orders';
import { useCartStore } from '@/store/cartStore';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
// Stable navigation object: react-navigation's useNavigation returns the same
// reference across renders. A per-render literal would change the identity of
// the screen's useEffect dep [navigation] and cancel a pending mount
// reconcile on the first state update.
const mockNavigation = {
  navigate: mockNavigate,
  replace: mockReplace,
  goBack: mockGoBack,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
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
    findOrderByRecord: jest.fn().mockResolvedValue(null),
    InvalidOrderEnvelopeError,
  };
});

const mockCreateOrder = createOrder as jest.MockedFunction<typeof createOrder>;
const mockFindMatchingOrder = findMatchingOrder as jest.MockedFunction<
  typeof findMatchingOrder
>;
const mockFindOrderByRecord = findOrderByRecord as jest.MockedFunction<
  typeof findOrderByRecord
>;
const mockStorageGetItem = AsyncStorage.getItem as jest.MockedFunction<
  typeof AsyncStorage.getItem
>;
const mockStorageSetItem = AsyncStorage.setItem as jest.MockedFunction<
  typeof AsyncStorage.setItem
>;
const mockStorageRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<
  typeof AsyncStorage.removeItem
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

// Snapshot of a checkout attempt interrupted between a successful POST and
// clearCart (app killed): the record is what a later mount must reconcile.
const inFlightRecord: InFlightOrderRecord = {
  idempotencyKey: 'checkout-testkey-1',
  payload: { items: [{ id_producto_semanal: 1, cantidad: 2 }] },
  productNames: ['Tomate'],
  total: 5,
  createdAt: '2026-07-30T12:00:00Z',
};

function seedInFlightRecord(): void {
  mockStorageGetItem.mockImplementation((key) =>
    key === IN_FLIGHT_ORDER_KEY
      ? Promise.resolve(JSON.stringify(inFlightRecord))
      : Promise.resolve(null),
  );
}

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
  mockFindOrderByRecord.mockResolvedValue(null);
  // clearAllMocks keeps implementations; reset the storage reads so no test
  // leaks an in-flight record into the next one.
  mockStorageGetItem.mockImplementation(() => Promise.resolve(null));
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        {
          items: [
            { id_producto_semanal: 1, cantidad: 2 },
            { id_producto_semanal: 2, cantidad: 3 },
          ],
        },
        // Client-side idempotency key passed to createOrder.
        expect.any(String),
      );
    });

    // The in-flight record is persisted BEFORE the POST: the setItem call
    // order must precede the createOrder call.
    const setCallIndex = mockStorageSetItem.mock.calls.findIndex(
      ([key]) => key === IN_FLIGHT_ORDER_KEY,
    );
    expect(setCallIndex).toBeGreaterThanOrEqual(0);
    expect(
      mockStorageSetItem.mock.invocationCallOrder[setCallIndex],
    ).toBeLessThan(mockCreateOrder.mock.invocationCallOrder[0] ?? 0);

    // The persisted snapshot carries the same totals the render shows: both
    // sides derive from the single computeTotals source of truth.
    expect(mockStorageSetItem.mock.calls[setCallIndex]?.[1]).toContain(
      '"total":9.68',
    );
    expect(mockStorageSetItem.mock.calls[setCallIndex]?.[1]).toContain(
      '"payload":{"items":[{"id_producto_semanal":1,"cantidad":2},{"id_producto_semanal":2,"cantidad":3}]}',
    );

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
    // Confirmed success removes the in-flight record.
    expect(mockStorageRemoveItem).toHaveBeenCalledWith(IN_FLIGHT_ORDER_KEY);
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The in-flight record is KEPT on ambiguous failures: the server may still
    // commit the order, and the next mount reconciles it again.
    expect(mockStorageSetItem).toHaveBeenCalledWith(
      IN_FLIGHT_ORDER_KEY,
      expect.any(String),
    );
    expect(mockStorageRemoveItem).not.toHaveBeenCalled();
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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

  it('R4: trata ERR_NETWORK (sin respuesta) como ambiguo y reconcilia contra la lista', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      code: 'ERR_NETWORK',
      message: 'Network Error',
    });
    mockFindMatchingOrder.mockResolvedValue(null);

    const { getByTestId, getByText } = renderScreen();
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
    fireEvent.press(getByTestId('confirm-order-btn'));

    // A dropped connection may have reached the server and committed the
    // order, so ERR_NETWORK is ambiguous: the order list is reconciled and the
    // ambiguous message (not a definitive error) is shown.
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
    // The in-flight record is KEPT: the server may still commit the order, and
    // a later mount reconciles it again instead of risking a duplicate.
    expect(mockStorageRemoveItem).not.toHaveBeenCalled();
  });

  it('R4: trata ETIMEDOUT (sin respuesta) como ambiguo y reconcilia contra la lista', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      code: 'ETIMEDOUT',
      message: 'connect ETIMEDOUT',
    });
    mockFindMatchingOrder.mockResolvedValue(null);

    const { getByTestId, getByText } = renderScreen();
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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

  it('R4: no reconcilia con fallo de DNS (ENOTFOUND): nunca llegó al servidor, error definitivo', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      code: 'ENOTFOUND',
      message: 'getaddrinfo ENOTFOUND api.example.com',
    });

    const { getByTestId, getByText } = renderScreen();
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText('Error al procesar el pedido. Intente de nuevo.'),
      ).toBeTruthy();
    });

    // DNS resolution never reached a server, so no order can exist: definitive
    // rejection, no reconciliation, stale in-flight record discarded.
    expect(mockFindMatchingOrder).not.toHaveBeenCalled();
    expect(mockStorageRemoveItem).toHaveBeenCalledWith(IN_FLIGHT_ORDER_KEY);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('R4: no reconcilia con conexión rechazada (ECONNREFUSED): nunca llegó al servidor, error definitivo', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue({
      isAxiosError: true,
      code: 'ECONNREFUSED',
      message: 'connect ECONNREFUSED 127.0.0.1:8000',
    });

    const { getByTestId, getByText } = renderScreen();
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText('Error al procesar el pedido. Intente de nuevo.'),
      ).toBeTruthy();
    });

    expect(mockFindMatchingOrder).not.toHaveBeenCalled();
    expect(mockStorageRemoveItem).toHaveBeenCalledWith(IN_FLIGHT_ORDER_KEY);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('reconcilia con InvalidOrderEnvelopeError: mensaje ambiguo y carrito conservado', async () => {
    useCartStore.setState({ items: [mockItem] });
    mockCreateOrder.mockRejectedValue(new InvalidOrderEnvelopeError());
    mockFindMatchingOrder.mockResolvedValue(null);

    const { getByTestId, getByText } = renderScreen();
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
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

  it('R4-005: tras un kill de app con pedido existente, reconcilia el registro en vuelo y navega al éxito sin re-POST', async () => {
    useCartStore.setState({ items: [mockItem] });
    seedInFlightRecord();
    mockFindOrderByRecord.mockResolvedValue({
      id_pedido: 45,
      cliente_nombre: 'Ana Ramírez',
      vendedor_nombre: null,
      total: '5.00',
      estado_actual: 'pendiente',
      creado_en: '2026-07-30T12:00:00Z',
    });

    renderScreen();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('OrderSuccess', {
        orderId: 45,
        total: '5.00',
        estado: 'pendiente',
      });
    });

    // The interrupted order is recovered as success: no duplicate POST, cart
    // cleared, record removed.
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockFindOrderByRecord).toHaveBeenCalledWith({
      payload: inFlightRecord.payload,
      productNames: inFlightRecord.productNames,
      total: inFlightRecord.total,
    });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'checkout',
        data: expect.objectContaining({ orderId: 45, reconciled: true }),
      }),
    );
    expect(mockStorageRemoveItem).toHaveBeenCalledWith(IN_FLIGHT_ORDER_KEY);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('JD-B-001: sin pedido coincidente muestra la advertencia y conserva el registro hasta un intento nuevo', async () => {
    useCartStore.setState({ items: [mockItem] });
    seedInFlightRecord();
    mockFindOrderByRecord.mockResolvedValue(null);

    const { getByTestId, getByText } = renderScreen();

    // A possibly-committed record is never silently discarded: the warning
    // asks the user to check Mis Pedidos before re-submitting.
    await waitFor(() => {
      expect(
        getByText(
          'Es posible que tu pedido anterior ya se haya creado. Revisá Mis Pedidos antes de confirmar de nuevo.',
        ),
      ).toBeTruthy();
    });

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    // The stale record is kept (not discarded): it is only overwritten when a
    // fresh attempt starts.
    expect(mockStorageRemoveItem).not.toHaveBeenCalledWith(IN_FLIGHT_ORDER_KEY);
    expect(useCartStore.getState().items).toHaveLength(1);

    // A fresh POST is still allowed: the new attempt overwrites the record.
    mockCreateOrder.mockResolvedValue(mockPedido);
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    });
  });

  it('R3-B-002: tras un kill, conserva los items agregados después del intento (fuera del payload del registro)', async () => {
    // Live cart: the recovered payload line (Tomate x2) PLUS a new line the
    // user added after the interrupted attempt (Lechuga x3, never ordered).
    useCartStore.setState({ items: [mockItem, mockItem2] });
    seedInFlightRecord();
    mockFindOrderByRecord.mockResolvedValue({
      id_pedido: 45,
      cliente_nombre: 'Ana Ramírez',
      vendedor_nombre: null,
      total: '5.00',
      estado_actual: 'pendiente',
      creado_en: '2026-07-30T12:00:00Z',
    });

    const { getByText, queryByText } = renderScreen();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('OrderSuccess', {
        orderId: 45,
        total: '5.00',
        estado: 'pendiente',
      });
    });

    // No wholesale clearCart: only the recovered payload line (Tomate) is
    // removed — it belongs to the recovered order — while Lechuga, which was
    // never ordered, survives in the cart and is still rendered.
    const cart = useCartStore.getState().items;
    expect(cart).toHaveLength(1);
    expect(cart[0]?.id_producto_semanal).toBe(2);
    expect(cart[0]?.producto).toBe('Lechuga');
    expect(getByText('Lechuga')).toBeTruthy();
    expect(queryByText('Tomate')).toBeNull();
    // The recovered order's record is still cleared on success.
    expect(mockStorageRemoveItem).toHaveBeenCalledWith(IN_FLIGHT_ORDER_KEY);
  });

  it('R3-B-001: deshabilita Confirmar pedido y muestra un indicador mientras el reconcile del mount está pendiente', async () => {
    useCartStore.setState({ items: [mockItem] });
    seedInFlightRecord();

    let resolveReconcile!: (
      value: Awaited<ReturnType<typeof findOrderByRecord>>,
    ) => void;
    mockFindOrderByRecord.mockReturnValue(
      new Promise((resolve) => {
        resolveReconcile = resolve;
      }),
    );

    const { getByTestId } = renderScreen();

    // While the mount reconcile is in flight the confirm button is disabled
    // and shows a pending indicator instead of its label: taps are not
    // silently dropped.
    const button = getByTestId('confirm-order-btn');
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(getByTestId('confirm-order-loading')).toBeTruthy();

    fireEvent.press(button);
    expect(mockCreateOrder).not.toHaveBeenCalled();

    // Once the reconcile settles with a match, the interrupted order is
    // recovered as success.
    await act(async () => {
      resolveReconcile({
        id_pedido: 45,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        total: '5.00',
        estado_actual: 'pendiente',
        creado_en: '2026-07-30T12:00:00Z',
      });
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('OrderSuccess', {
        orderId: 45,
        total: '5.00',
        estado: 'pendiente',
      });
    });
  });

  it('JD-A-001: bloquea Confirmar mientras el reconcile del mount está pendiente y no duplica el pedido', async () => {
    useCartStore.setState({ items: [mockItem] });
    seedInFlightRecord();

    // The mount reconcile's match call stays pending: the race window between
    // the async read + match and a fresh confirm tap.
    let resolveReconcile!: (
      value: Awaited<ReturnType<typeof findOrderByRecord>>,
    ) => void;
    mockFindOrderByRecord.mockReturnValue(
      new Promise((resolve) => {
        resolveReconcile = resolve;
      }),
    );

    const { getByTestId } = renderScreen();

    // The reconcile is pending (holds the in-flight guard): a confirm tap must
    // be blocked, not start a fresh POST that the reconcile could clobber.
    fireEvent.press(getByTestId('confirm-order-btn'));
    expect(mockCreateOrder).not.toHaveBeenCalled();

    // The reconcile settles with a match: it recovers the interrupted order as
    // success. No fresh POST ever fired, so no duplicate-order path exists.
    await act(async () => {
      resolveReconcile({
        id_pedido: 45,
        cliente_nombre: 'Ana Ramírez',
        vendedor_nombre: null,
        total: '5.00',
        estado_actual: 'pendiente',
        creado_en: '2026-07-30T12:00:00Z',
      });
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('OrderSuccess', {
        orderId: 45,
        total: '5.00',
        estado: 'pendiente',
      });
    });

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(mockStorageRemoveItem).toHaveBeenCalledWith(IN_FLIGHT_ORDER_KEY);
  });

  it('JD-A-001: el reconcile sin match no borra el registro de un intento nuevo mientras está pendiente', async () => {
    useCartStore.setState({ items: [mockItem] });
    seedInFlightRecord();

    let resolveReconcile!: (
      value: Awaited<ReturnType<typeof findOrderByRecord>>,
    ) => void;
    mockFindOrderByRecord.mockReturnValue(
      new Promise((resolve) => {
        resolveReconcile = resolve;
      }),
    );

    const { getByTestId, getByText } = renderScreen();

    // Reconcile pending: confirm is blocked, so no fresh record exists yet.
    fireEvent.press(getByTestId('confirm-order-btn'));
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockStorageSetItem).not.toHaveBeenCalledWith(
      IN_FLIGHT_ORDER_KEY,
      expect.any(String),
    );

    // Reconcile settles with no match: the possibly-committed record is KEPT
    // and a warning is surfaced instead of a silent discard.
    await act(async () => {
      resolveReconcile(null);
    });

    await waitFor(() => {
      expect(
        getByText(
          'Es posible que tu pedido anterior ya se haya creado. Revisá Mis Pedidos antes de confirmar de nuevo.',
        ),
      ).toBeTruthy();
    });
    expect(mockStorageRemoveItem).not.toHaveBeenCalledWith(IN_FLIGHT_ORDER_KEY);

    // A fresh attempt is still allowed and overwrites the kept record.
    mockCreateOrder.mockResolvedValue(mockPedido);
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    });
  });

  it('R4-005: ante un rechazo definitivo (4xx), descarta el registro en vuelo y conserva el carrito', async () => {
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
    // The mount reconcile (JD-A-001) holds the in-flight guard while its async
    // read settles; flush it before pressing so the confirm is not blocked.
    await act(async () => {});
    fireEvent.press(getByTestId('confirm-order-btn'));

    await waitFor(() => {
      expect(
        getByText(
          "Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5.",
        ),
      ).toBeTruthy();
    });

    // The 4xx is a definitive rejection: the server never committed the order,
    // so the stale record is removed and the cart is kept for a retry.
    expect(mockStorageRemoveItem).toHaveBeenCalledWith(IN_FLIGHT_ORDER_KEY);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('resolveCartAfterRecovery', () => {
  it('quita solo las líneas cubiertas por el payload y conserva las líneas nuevas', () => {
    expect(
      resolveCartAfterRecovery(
        [mockItem, mockItem2],
        inFlightRecord.payload.items,
      ),
    ).toEqual([mockItem2]);
  });

  it('devuelve un carrito vacío cuando coincide exactamente con el payload (equivalente a clearCart)', () => {
    expect(
      resolveCartAfterRecovery([mockItem], inFlightRecord.payload.items),
    ).toEqual([]);
  });

  it('JD-A-001: resta la cantidad registrada y conserva el delta nunca pedido cuando el carrito vivo supera el payload', () => {
    expect(
      resolveCartAfterRecovery(
        [{ ...mockItem, cantidad: 5 }],
        inFlightRecord.payload.items,
      ),
    ).toEqual([{ ...mockItem, cantidad: 3 }]);
  });

  it('JD-A-001: elimina la línea del payload cuando el delta vivo no supera lo registrado', () => {
    expect(
      resolveCartAfterRecovery(
        [{ ...mockItem, cantidad: 1 }],
        inFlightRecord.payload.items,
      ),
    ).toEqual([]);
  });

  it('conserva todo el carrito cuando ninguna línea del carrito está en el payload', () => {
    expect(
      resolveCartAfterRecovery([mockItem2], inFlightRecord.payload.items),
    ).toEqual([mockItem2]);
  });
});
