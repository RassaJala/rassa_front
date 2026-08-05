/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { fetchTiposPago } from '@/common/payments';
import type { SettlementDetail } from '@/common/settlements';
import { formatDisplayDate } from '@/common/waste';
import SettlementDetailScreen from '@/screens/admin/SettlementDetailScreen';
import {
  fetchSettlement,
  marcarSettlementPagada,
} from '@/services/settlements';

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/services/settlements', () => ({
  fetchSettlement: jest.fn(),
  marcarSettlementPagada: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('@/common/payments', () => ({
  fetchTiposPago: jest.fn(),
}));

const mockFetchSettlement = fetchSettlement as jest.Mock;
const mockMarcarPagada = marcarSettlementPagada as jest.Mock;
const mockFetchTiposPago = fetchTiposPago as jest.Mock;

const route = { params: { settlementId: 1 } } as never;
const navigation = { goBack: jest.fn() } as never;

const detallePendiente: SettlementDetail = {
  id_liquidacion: 1,
  agricultor_id: 4,
  agricultor_nombre: 'Ana Ramírez',
  periodo_inicio: '2026-07-06',
  periodo_fin: '2026-07-12',
  monto_ventas: '1500.00',
  comision: '150.00',
  monto_liquidar: '1350.00',
  estado: 'pendiente',
  creado_en: '2026-07-13T08:00:00-03:00',
  ventas: [
    {
      id_pedido: 101,
      cliente_nombre: 'Cliente Uno',
      total: '800.00',
      creado_en: '2026-07-08T10:00:00-03:00',
      pago_folio: 'F-2026-0001',
    },
    {
      id_pedido: 102,
      cliente_nombre: 'Cliente Dos',
      total: '700.00',
      creado_en: '2026-07-09T11:00:00-03:00',
      pago_folio: null,
    },
  ],
  pago_liquidacion: null,
};

const detallePagada: SettlementDetail = {
  ...detallePendiente,
  estado: 'pagada',
  pago_liquidacion: {
    id_pago: 55,
    folio: 'LIQ-2026-0001',
    tipo_pago_nombre: 'Transferencia',
    monto: '1350.00',
    referencia: 'Ref-123',
    fecha_pago: '2026-07-14T09:00:00-03:00',
  },
};

const tiposPago = [
  { id_tipo_pago: 1, nombre: 'Efectivo' },
  { id_tipo_pago: 2, nombre: 'Transferencia' },
];

describe('SettlementDetailScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  function wrapper({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  function renderScreen() {
    return render(
      <SettlementDetailScreen route={route} navigation={navigation} />,
      { wrapper },
    );
  }

  it('renders farmer, period, breakdown amounts and ventas rows', async () => {
    mockFetchSettlement.mockResolvedValue(detallePendiente);

    const { findByText, getByText } = renderScreen();

    await findByText('Ana Ramírez');
    expect(getByText('Liquidación #1')).toBeTruthy();
    expect(
      getByText(
        `${formatDisplayDate('2026-07-06')} – ${formatDisplayDate('2026-07-12')}`,
      ),
    ).toBeTruthy();
    expect(getByText('$1500.00')).toBeTruthy();
    expect(getByText('$150.00')).toBeTruthy();
    expect(getByText('$1350.00')).toBeTruthy();
    expect(getByText('Pedido #101')).toBeTruthy();
    expect(getByText('Cliente Uno')).toBeTruthy();
    expect(getByText('$800.00')).toBeTruthy();
    expect(getByText('Pedido #102')).toBeTruthy();
  });

  it('shows the empty ventas message when there are no ventas', async () => {
    mockFetchSettlement.mockResolvedValue({ ...detallePendiente, ventas: [] });

    const { findByText } = renderScreen();

    expect(await findByText('Sin ventas en este periodo.')).toBeTruthy();
  });

  it('marks the settlement as paid from the pagar modal', async () => {
    mockFetchSettlement
      .mockResolvedValueOnce(detallePendiente)
      .mockResolvedValueOnce(detallePagada);
    mockFetchTiposPago.mockResolvedValue(tiposPago);
    mockMarcarPagada.mockResolvedValue({
      detail: detallePagada,
      message: 'Pago registrado',
    });

    const { findByText, getByText, getByLabelText } = renderScreen();

    await findByText('Marcar como pagada');
    fireEvent.press(getByText('Marcar como pagada'));

    // Modal loads the payment types and lets the admin pick one + reference.
    await findByText('Registrar pago');
    await findByText('Transferencia');
    fireEvent.press(getByText('Transferencia'));
    fireEvent.changeText(getByLabelText('Referencia (opcional)'), 'Ref-123');
    fireEvent.press(getByText('Confirmar pago'));

    await waitFor(() =>
      expect(mockMarcarPagada).toHaveBeenCalledWith(1, {
        tipo_pago: 2,
        referencia: 'Ref-123',
      }),
    );
    // After the refetch the detail now shows the registered payment.
    await findByText('LIQ-2026-0001');
    expect(mockFetchSettlement).toHaveBeenCalledTimes(2);
  });

  it('invalidates the settlements list query after a successful payment', async () => {
    mockFetchSettlement
      .mockResolvedValueOnce(detallePendiente)
      .mockResolvedValueOnce(detallePagada);
    mockFetchTiposPago.mockResolvedValue(tiposPago);
    mockMarcarPagada.mockResolvedValue({
      detail: detallePagada,
      message: 'Pago registrado',
    });

    const { findByText, getByText } = renderScreen();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await findByText('Marcar como pagada');
    fireEvent.press(getByText('Marcar como pagada'));
    await findByText('Registrar pago');
    await findByText('Transferencia');
    fireEvent.press(getByText('Confirmar pago'));

    // S5: the still-mounted SettlementListScreen must reflect 'pagada'
    // without a manual pull-to-refresh.
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['settlements'],
      });
    });
  });

  it('invalidates the settlements list query when marking paid fails', async () => {
    mockFetchSettlement.mockResolvedValue(detallePendiente);
    mockFetchTiposPago.mockResolvedValue(tiposPago);
    mockMarcarPagada.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: { ok: true, message: 'Datos de pago inválidos' },
      },
    });

    const { findAllByText, findByText, getByText } = renderScreen();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await findByText('Marcar como pagada');
    fireEvent.press(getByText('Marcar como pagada'));
    await findByText('Registrar pago');
    await findByText('Transferencia');
    fireEvent.press(getByText('Confirmar pago'));

    // S3: the business error is surfaced...
    const matches = await findAllByText('Datos de pago inválidos');
    expect(matches.length).toBeGreaterThan(0);
    // ...and the list is invalidated so state reflects reality.
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['settlements'],
      });
    });
  });

  it('keeps the modal open and shows the backend message on a 409 already-paid', async () => {
    mockFetchSettlement.mockResolvedValue(detallePendiente);
    mockFetchTiposPago.mockResolvedValue(tiposPago);
    mockMarcarPagada.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          ok: true,
          message: 'La liquidación ya está marcada como pagada.',
        },
      },
    });

    const { findAllByText, findByText, getByText } = renderScreen();

    await findByText('Marcar como pagada');
    fireEvent.press(getByText('Marcar como pagada'));
    await findByText('Registrar pago');
    // Wait for the payment types so the confirm button is enabled.
    await findByText('Transferencia');
    fireEvent.press(getByText('Confirmar pago'));

    const matches = await findAllByText(
      'La liquidación ya está marcada como pagada.',
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(getByText('Registrar pago')).toBeTruthy();
    expect(mockFetchSettlement).toHaveBeenCalledTimes(1);
  });

  it('renders the registered payment section when the settlement is paid', async () => {
    mockFetchSettlement.mockResolvedValue(detallePagada);

    const { findByText, getByText, queryByText } = renderScreen();

    await findByText('LIQ-2026-0001');
    expect(getByText('Transferencia')).toBeTruthy();
    expect(getByText('Ref-123')).toBeTruthy();
    expect(queryByText('Marcar como pagada')).toBeNull();
  });

  it('shows the backend message for a load error and retries', async () => {
    mockFetchSettlement
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: { ok: true, message: 'Periodo inválido' },
        },
      })
      .mockResolvedValueOnce(detallePendiente);

    const { findByText, getByText } = renderScreen();

    expect(await findByText('Periodo inválido')).toBeTruthy();
    fireEvent.press(getByText('Reintentar'));

    await findByText('Ana Ramírez');
    expect(mockFetchSettlement).toHaveBeenCalledTimes(2);
  });

  it('R4-1: shows "Liquidación no encontrada" for a 404 and retries', async () => {
    mockFetchSettlement
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 404,
          data: { detail: 'No Liquidación matches the given query.' },
        },
      })
      .mockResolvedValueOnce(detallePendiente);

    const { findByText, getByText } = renderScreen();

    // The 404 detail is ambiguous (endpoint missing vs id not found): the
    // admin gets the honest message instead of the raw DRF detail.
    expect(await findByText('Liquidación no encontrada')).toBeTruthy();
    fireEvent.press(getByText('Reintentar'));

    await findByText('Ana Ramírez');
    expect(mockFetchSettlement).toHaveBeenCalledTimes(2);
  });
});
