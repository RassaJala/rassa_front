/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { RefreshControl } from 'react-native';

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
    nombre: 'Ana Ramírez',
  },
];

function makeSettlements(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...settlementPendiente,
    id_liquidacion: i + 1,
    agricultor_nombre: `Agricultor ${i + 1}`,
  }));
}

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
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente, settlementPagada],
      count: 2,
      truncated: false,
    });

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
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente],
      count: 1,
      truncated: false,
    });

    const { findByText, getByText } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('Ana Ramírez');
    fireEvent.press(getByText('Pagadas'));

    await waitFor(() =>
      expect(mockFetchSettlements).toHaveBeenCalledWith(
        { estado: 'pagada' },
        expect.anything(),
      ),
    );
  });

  it('refetches filtered by agricultor when a farmer is selected', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente],
      count: 1,
      truncated: false,
    });

    const { findByText, getByLabelText, getByTestId } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('Ana Ramírez');
    fireEvent.press(getByLabelText('Selector de agricultor'));
    const modal = getByTestId('farmer-picker-modal');
    fireEvent.press(within(modal).getByText('Ana Ramírez'));

    await waitFor(() =>
      expect(mockFetchSettlements).toHaveBeenCalledWith(
        { agricultor: 4 },
        expect.anything(),
      ),
    );
  });

  it('applies the date range only after Buscar and refetches', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente],
      count: 1,
      truncated: false,
    });

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
      expect(mockFetchSettlements).toHaveBeenCalledWith(
        {
          periodo_inicio: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          periodo_fin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        },
        expect.anything(),
      ),
    );
  });

  it('discards the draft date range when the modal is cancelled', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente],
      count: 1,
      truncated: false,
    });

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
    mockFetchSettlements.mockResolvedValue({
      items: [],
      count: 0,
      truncated: false,
    });

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
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente],
      count: 1,
      truncated: false,
    });

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

  it('paginates 25 items into 3 pages and slices the data per page', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: makeSettlements(25),
      count: 25,
      truncated: false,
    });

    const { findByText, getByTestId } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('25 liquidaciones');

    const list = getByTestId('settlement-list');
    expect(list.props.data).toHaveLength(10);
    expect(list.props.data[0].agricultor_nombre).toBe('Agricultor 1');
    expect(list.props.data[9].agricultor_nombre).toBe('Agricultor 10');

    // 3 page dots are rendered.
    expect(getByTestId('paginator-page-1')).toBeTruthy();
    expect(getByTestId('paginator-page-2')).toBeTruthy();
    expect(getByTestId('paginator-page-3')).toBeTruthy();

    fireEvent.press(getByTestId('paginator-page-2'));
    await waitFor(() =>
      expect(list.props.data[0].agricultor_nombre).toBe('Agricultor 11'),
    );
    expect(list.props.data).toHaveLength(10);

    fireEvent.press(getByTestId('paginator-page-3'));
    await waitFor(() => expect(list.props.data).toHaveLength(5));
    expect(list.props.data[0].agricultor_nombre).toBe('Agricultor 21');
  });

  it('navigates with Siguiente/Anterior and disables buttons at the edges', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: makeSettlements(25),
      count: 25,
      truncated: false,
    });

    const { findByText, getByTestId } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('25 liquidaciones');

    const list = getByTestId('settlement-list');
    const prev = getByTestId('paginator-prev');
    const next = getByTestId('paginator-next');
    const isDisabled = (el: ReturnType<typeof getByTestId>) =>
      el.props.accessibilityState?.disabled ?? el.props.disabled;

    // Page 1: previous is disabled.
    expect(isDisabled(prev)).toBe(true);

    fireEvent.press(next);
    await waitFor(() =>
      expect(list.props.data[0].agricultor_nombre).toBe('Agricultor 11'),
    );
    expect(isDisabled(prev)).toBe(false);

    fireEvent.press(prev);
    await waitFor(() =>
      expect(list.props.data[0].agricultor_nombre).toBe('Agricultor 1'),
    );

    fireEvent.press(next);
    await waitFor(() =>
      expect(list.props.data[0].agricultor_nombre).toBe('Agricultor 11'),
    );
    fireEvent.press(next);
    await waitFor(() => expect(list.props.data).toHaveLength(5));
    // Page 3: next is disabled.
    expect(isDisabled(next)).toBe(true);
  });

  it('resets to page 1 when the estado chip is changed', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: makeSettlements(25),
      count: 25,
      truncated: false,
    });

    const { findByText, getByTestId, getByText } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('25 liquidaciones');

    const list = getByTestId('settlement-list');
    fireEvent.press(getByTestId('paginator-next'));
    await waitFor(() =>
      expect(list.props.data[0].agricultor_nombre).toBe('Agricultor 11'),
    );

    fireEvent.press(getByText('Pagadas'));
    await waitFor(() =>
      expect(mockFetchSettlements).toHaveBeenCalledWith(
        { estado: 'pagada' },
        expect.anything(),
      ),
    );

    // The refetch swaps the list out for a loading state, so re-query it once
    // the new data settles: page was reset to 1 and no empty page is shown.
    await waitFor(() => {
      const refreshedList = getByTestId('settlement-list');
      expect(refreshedList.props.data[0].agricultor_nombre).toBe(
        'Agricultor 1',
      );
      expect(refreshedList.props.data).toHaveLength(10);
    });
  });

  it('clamps to the last valid page when a refetch returns fewer items', async () => {
    mockFetchSettlements.mockResolvedValueOnce({
      items: makeSettlements(25),
      count: 25,
      truncated: false,
    });
    mockFetchSettlements.mockResolvedValueOnce({
      items: makeSettlements(5),
      count: 5,
      truncated: false,
    });

    const { findByText, getByTestId, getByText, UNSAFE_getByType } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('25 liquidaciones');

    const list = getByTestId('settlement-list');
    fireEvent.press(getByTestId('paginator-page-3'));
    await waitFor(() => expect(list.props.data).toHaveLength(5));

    // Pull-to-refresh. Firing 'refresh' on the FlatList host does not reach
    // onRefresh on the iOS renderer, so fire it on the RefreshControl element.
    fireEvent(UNSAFE_getByType(RefreshControl), 'refresh');

    await waitFor(() => expect(getByText('5 liquidaciones')).toBeTruthy());
    expect(list.props.data).toHaveLength(5);
    expect(list.props.data[0].agricultor_nombre).toBe('Agricultor 1');
  });

  it('shows the server total and a truncation notice when the walk is capped', async () => {
    // Server reports 250 total but only 25 were walked before the cap:
    // the header uses the server count and a muted notice explains the gap.
    mockFetchSettlements.mockResolvedValue({
      items: makeSettlements(25),
      count: 250,
      truncated: true,
    });

    const { findByText, getByText } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    expect(await findByText('250 liquidaciones')).toBeTruthy();
    expect(getByText('Se muestran las primeras 25 liquidaciones')).toBeTruthy();
  });

  it('R3-4: Limpiar filtros resets the applied filters and refetches with {}', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente],
      count: 1,
      truncated: false,
    });

    const { findByText, getByText, getByLabelText } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('Ana Ramírez');
    fireEvent.press(getByText('Pagadas'));
    await waitFor(() =>
      expect(mockFetchSettlements).toHaveBeenCalledWith(
        { estado: 'pagada' },
        expect.anything(),
      ),
    );
    // Wait for the refetch to settle — while loading, the filter bar (and
    // its reset button) are not rendered.
    await findByText('Ana Ramírez');

    // Reset clears estado (and any dates) and refetches the unfiltered list.
    fireEvent.press(getByLabelText('Limpiar filtros'));
    await waitFor(() =>
      expect(mockFetchSettlements).toHaveBeenLastCalledWith(
        {},
        expect.anything(),
      ),
    );
  });

  it('R3-4: a Desde > Hasta range blocks Buscar without refetching', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente],
      count: 1,
      truncated: false,
    });

    const queries = render(<SettlementListScreen navigation={navigation} />, {
      wrapper,
    });
    const { findByText, getByText } = queries;

    await findByText('Ana Ramírez');
    expect(mockFetchSettlements).toHaveBeenCalledTimes(1);

    const { year, month, day15, day20 } = pastMonthParts();
    // "desde" is picked AFTER "hasta" → the range is invalid.
    await pickDate(queries, 'Fecha desde', year, month, day20);
    await pickDate(queries, 'Fecha hasta', year, month, day15);

    fireEvent.press(getByText('Buscar'));
    expect(mockFetchSettlements).toHaveBeenCalledTimes(1);
    expect(getByText('«Hasta» debe ser mayor o igual a «Desde»')).toBeTruthy();
  });

  it('R3-4: a failed refetch keeps the stale list and shows an error toast', async () => {
    mockFetchSettlements.mockResolvedValueOnce({
      items: [settlementPendiente],
      count: 1,
      truncated: false,
    });
    mockFetchSettlements.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 500,
        data: { message: 'Error interno del servidor' },
      },
    });

    const { findByText, getByText, UNSAFE_getByType } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('Ana Ramírez');

    // Pull-to-refresh → the refetch rejects with stale data in the cache.
    fireEvent(UNSAFE_getByType(RefreshControl), 'refresh');

    // The list items remain rendered and the error surfaces as a toast.
    expect(await findByText('Error interno del servidor')).toBeTruthy();
    expect(getByText('Ana Ramírez')).toBeTruthy();
  });

  it('R3-4: pull-to-refresh calls fetchSettlements again with the same params', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente],
      count: 1,
      truncated: false,
    });

    const { findByText, UNSAFE_getByType } = render(
      <SettlementListScreen navigation={navigation} />,
      { wrapper },
    );

    await findByText('Ana Ramírez');
    expect(mockFetchSettlements).toHaveBeenCalledTimes(1);

    fireEvent(UNSAFE_getByType(RefreshControl), 'refresh');

    await waitFor(() => expect(mockFetchSettlements).toHaveBeenCalledTimes(2));
    expect(mockFetchSettlements).toHaveBeenLastCalledWith(
      {},
      expect.anything(),
    );
  });
});
