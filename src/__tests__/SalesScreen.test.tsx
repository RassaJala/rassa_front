/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Test files are less strict */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import SalesScreen from '@/screens/seller/SalesScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
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

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('@/components/Toast', () => {
  const ReactActual = jest.requireActual('react');
  return function MockToast({
    visible,
    message,
  }: {
    visible: boolean;
    message: string;
  }) {
    return visible
      ? ReactActual.createElement(
          'Toast',
          null,
          ReactActual.createElement('Text', null, message),
        )
      : null;
  };
});

const api = jest.requireMock('@/services/api').default as {
  get: jest.Mock;
  patch: jest.Mock;
};

const mockOrderReady = {
  id_pedido: 5,
  cliente_nombre: 'Cliente Test',
  total: '119.48',
  estado_actual: 'listo_para_retirar',
  creado_en: '2026-07-24T10:00:00Z',
};

const mockOrderPending = {
  id_pedido: 6,
  cliente_nombre: 'Cliente Dos',
  total: '90.00',
  estado_actual: 'pendiente',
  creado_en: '2026-07-24T10:00:00Z',
};

const mockOrderDelivered = {
  id_pedido: 7,
  cliente_nombre: 'Cliente Entregado',
  total: '85.00',
  estado_actual: 'entregado',
  creado_en: '2026-07-24T10:00:00Z',
};

const mockPago = {
  id_pago: 9,
  folio: 'PAG-0009',
  pedido: 7,
  tipo_pago: 1,
  tipo_pago_nombre: 'Efectivo',
  cliente_nombre: 'Cliente Entregado',
  cliente_id: 7,
  monto: '85.00',
  referencia: '',
  total_pedido: '85.00',
  productos: [],
  fecha_pago: '2026-07-30T12:00:00Z',
};

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SalesScreen />
    </QueryClientProvider>,
  );
}

describe('SalesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    api.get.mockResolvedValue({ data: { results: [mockOrderReady] } });
    api.patch.mockResolvedValue({ data: {} });
  });

  it('navigates to Payment instead of mutating status when order is listo_para_retirar', async () => {
    api.get.mockResolvedValue({ data: { results: [mockOrderReady] } });

    const { findByText } = renderScreen();
    const cobrar = await findByText('Cobrar');
    fireEvent.press(cobrar);

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('Payment', { orderId: 5 }),
    );
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('mutates status when order is pendiente', async () => {
    api.get.mockResolvedValue({ data: { results: [mockOrderPending] } });

    const { findByText } = renderScreen();
    const confirmar = await findByText('Confirmar');
    fireEvent.press(confirmar);

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/pedidos/6/status/', {
        nuevo_estado: 'confirmado',
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows Ver recibo on entregado orders and navigates to Receipt with the payment id', async () => {
    api.get
      .mockResolvedValueOnce({ data: { results: [mockOrderDelivered] } })
      .mockResolvedValueOnce({ data: { results: [mockPago] } });

    const { findByText } = renderScreen();
    const verRecibo = await findByText('Ver recibo');
    fireEvent.press(verRecibo);

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('Receipt', { paymentId: 9 }),
    );
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('shows an error toast when there is no payment for an entregado order', async () => {
    api.get
      .mockResolvedValueOnce({ data: { results: [mockOrderDelivered] } })
      .mockResolvedValueOnce({ data: { results: [] } });

    const { findByText } = renderScreen();
    const verRecibo = await findByText('Ver recibo');
    fireEvent.press(verRecibo);

    await expect(
      findByText('No hay un recibo registrado para este pedido'),
    ).resolves.toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
