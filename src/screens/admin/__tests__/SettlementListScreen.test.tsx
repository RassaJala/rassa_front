/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import {
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MONTH_NAMES } from '@/constants/dates';
import SettlementListScreen from '@/screens/admin/SettlementListScreen';
import { fetchFarmers, fetchSettlements } from '@/services/settlements';

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
  fetchSettlements: jest.fn(),
  fetchFarmers: jest.fn(),
}));

const mockFetchSettlements = fetchSettlements as jest.Mock;
const mockFetchFarmers = fetchFarmers as jest.Mock;

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;

const settlementPendiente = {
  id_liquidacion: 1,
  agricultor_id: 4,
  agricultor_nombre: 'Ana Ramírez',
  periodo_inicio: '2026-07-06',
  periodo_fin: '2026-07-12',
  monto_ventas: '1500.00',
  comision: '150.00',
  monto_liquidar: '1350.00',
  estado: 'pendiente' as const,
  creado_en: '2026-07-13T08:00:00-03:00',
};

const settlementPagada = {
  ...settlementPendiente,
  id_liquidacion: 2,
  agricultor_nombre: 'Luis Pérez',
  monto_liquidar: '900.00',
  estado: 'pagada' as const,
};

const farmers = [
  {
    id_usuario: 4,
    email: 'ana@rassa.com',
    role: 'farmer' as const,
    nombre: 'Ana',
    apellido_paterno: 'Ramírez',
    apellido_materno: null,
    localidad: 1,
    localidad_nombre: 'Localidad',
    estado: true,
    creado_en: '2026-01-01T00:00:00-03:00',
  },
];

function wrapper({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// A past month so the day grid is never filtered by "today"; day 15/20 always exist.
function pastMonthParts(): {
  year: string;
  month: string;
  day15: string;
  day20: string;
} {
  const now = new Date();
  const isJan = now.getMonth() === 0;
  const year = isJan ? now.getFullYear() - 1 : now.getFullYear();
  const month = MONTH_NAMES[isJan ? 11 : now.getMonth() - 1] ?? '';
  return { year: String(year), month, day15: '15', day20: '20' };
}

async function pickDate(
  queries: ReturnType<typeof render>,
  field: string,
  year: string,
  month: string,
  day: string,
) {
  fireEvent.press(queries.getByLabelText(field));
  const modal = queries.getByTestId('date-modal');
  fireEvent.press(within(modal).getByText(year));
  fireEvent.press(within(modal).getByText(month));
  fireEvent.press(within(modal).getByText(day));
}

describe('SettlementListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchFarmers.mockResolvedValue(farmers);
  });

  it('renders settlement rows with farmer name and formatted amount', async () => {
    mockFetchSettlements.mockResolvedValue([
      settlementPendiente,
      settlementPagada,
    ]);

    const { findByText, getByText } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    expect(await findByText('Ana Ramírez')).toBeTruthy();
    expect(getByText('Luis Pérez')).toBeTruthy();
    expect(getByText('$1350.00')).toBeTruthy();
    expect(getByText('$900.00')).toBeTruthy();
    expect(mockFetchSettlements).toHaveBeenCalledTimes(1);
  });

  it('refetches filtered by estado when the chip is pressed', async () => {
    mockFetchSettlements.mockResolvedValue([settlementPendiente]);

    const { findByText, getByText } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('Ana Ramírez');
    fireEvent.press(getByText('Pagadas'));

    await waitFor(() =>
      expect(mockFetchSettlements).toHaveBeenCalledWith({ estado: 'pagada' }),
    );
  });

  it('refetches filtered by agricultor when a farmer is selected', async () => {
    mockFetchSettlements.mockResolvedValue([settlementPendiente]);

    const { findByText, getByLabelText, getByTestId } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('Ana Ramírez');
    fireEvent.press(getByLabelText('Selector de agricultor'));
    const modal = getByTestId('farmer-picker-modal');
    fireEvent.press(within(modal).getByText('Ana Ramírez'));

    await waitFor(() =>
      expect(mockFetchSettlements).toHaveBeenCalledWith({ agricultor: 4 }),
    );
  });

  it('applies the date range only after Buscar and refetches', async () => {
    mockFetchSettlements.mockResolvedValue([settlementPendiente]);

    const queries = render(<SettlementListScreen navigation={navigation} />, {
      wrapper,
    });
    const { findByText, getByText } = queries;

    await findByText('Ana Ramírez');
    expect(mockFetchSettlements).toHaveBeenCalledTimes(1);

    const { year, month, day15, day20 } = pastMonthParts();
    await pickDate(queries, 'Fecha desde', year, month, day15);
    await pickDate(queries, 'Fecha hasta', year, month, day20);

    // Draft dates do not refetch by themselves.
    expect(mockFetchSettlements).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Buscar'));
    await waitFor(() =>
      expect(mockFetchSettlements).toHaveBeenCalledWith({
        periodo_inicio: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        periodo_fin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
  });

  it('discards the draft date range when the modal is cancelled', async () => {
    mockFetchSettlements.mockResolvedValue([settlementPendiente]);

    const queries = render(<SettlementListScreen navigation={navigation} />, {
      wrapper,
    });
    const { findByText, getByText, getByLabelText, getByTestId } = queries;

    await findByText('Ana Ramírez');

    // Cancel without selecting anything discards the draft: the field keeps
    // its placeholder and Buscar never sends date params.
    fireEvent.press(getByLabelText('Fecha desde'));
    const modal = getByTestId('date-modal');
    fireEvent.press(within(modal).getByText('Cancelar'));
    fireEvent.press(getByText('Buscar'));

    await waitFor(() => expect(mockFetchSettlements).toHaveBeenCalledTimes(1));
    expect(mockFetchSettlements).not.toHaveBeenCalledWith(
      expect.objectContaining({ periodo_inicio: expect.any(String) }),
    );
  });

  it('shows the empty state with a reset hint when no settlements match', async () => {
    mockFetchSettlements.mockResolvedValue([]);

    const { findByText, getByText } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    // Wait for the initial empty render, then apply a filter so the empty
    // state carries the reset hint.
    await findByText('No hay liquidaciones registradas.');
    fireEvent.press(getByText('Pagadas'));

    expect(
      await findByText(
        'No se encontraron liquidaciones con los filtros seleccionados.',
      ),
    ).toBeTruthy();
    expect(getByText('Limpiar filtros')).toBeTruthy();
  });

  it('shows the backend message for a 400 business error and retries', async () => {
    mockFetchSettlements.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: { ok: true, message: 'Periodo inválido' },
      },
    });

    const { findByText, getByText } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    expect(await findByText('Periodo inválido')).toBeTruthy();
    expect(getByText('Reintentar')).toBeTruthy();

    fireEvent.press(getByText('Reintentar'));
    await waitFor(() => expect(mockFetchSettlements).toHaveBeenCalledTimes(2));
  });

  it('navigates to the detail screen when a row is pressed', async () => {
    mockFetchSettlements.mockResolvedValue([settlementPendiente]);

    const { findByText } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    const row = await findByText('Ana Ramírez');
    fireEvent.press(row);

    expect(navigation.navigate).toHaveBeenCalledWith('SettlementDetail', {
      settlementId: 1,
    });
  });
});
