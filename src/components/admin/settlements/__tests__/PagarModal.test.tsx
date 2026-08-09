/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { fetchTiposPago } from '@/common/payments';
import type { MarcarPagadaParams } from '@/common/settlements';
import PagarModal from '@/components/admin/settlements/PagarModal';
import type { AdminPalette } from '@/components/admin/merma/colors';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
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

const mockFetchTiposPago = fetchTiposPago as jest.Mock;

const palette: AdminPalette = {
  surface: '#ffffff',
  fg: '#111111',
  muted: '#666666',
  border: '#e0e0e0',
  brand: '#DE393A',
  bg: '#f5f5f5',
  segBg: '#fef2f2',
  coral: '#DE393A',
};

const tiposPago = [
  { id_tipo_pago: 1, nombre: 'Efectivo' },
  { id_tipo_pago: 2, nombre: 'Transferencia' },
];

describe('PagarModal guards (R3-1 / R4-3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchTiposPago.mockResolvedValue(tiposPago);
  });

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

  function renderModal(overrides?: {
    onConfirm?: (params: MarcarPagadaParams) => Promise<unknown>;
  }) {
    return render(
      <PagarModal
        visible
        onClose={jest.fn()}
        onConfirm={
          overrides?.onConfirm ?? jest.fn().mockResolvedValue(undefined)
        }
        palette={palette}
      />,
      { wrapper },
    );
  }

  function confirmDisabled(queries: ReturnType<typeof render>): boolean {
    const btn = queries.getByTestId('pagar-confirm');
    return (
      btn.props.accessibilityState?.disabled ?? btn.props.disabled ?? false
    );
  }

  it('R3-1: disables Confirmar pago while no tipo is selected (query loading)', () => {
    // The tipos query never resolves → selectedTipo stays null.
    mockFetchTiposPago.mockImplementation(() => new Promise(() => {}));

    const queries = renderModal();

    expect(confirmDisabled(queries)).toBe(true);
  });

  it('R3-1: with zero tipos de pago the confirm button stays disabled', async () => {
    mockFetchTiposPago.mockResolvedValue([]);

    const queries = renderModal();

    await waitFor(() => expect(confirmDisabled(queries)).toBe(true));
    // No auto-select happened and no tipo row rendered.
    expect(queries.queryByText('Transferencia')).toBeNull();
  });

  it('R3-1/R4-3: double-tap while submitting calls onConfirm only once', async () => {
    let resolveConfirm!: (value: unknown) => void;
    const pending = new Promise<unknown>((resolve) => {
      resolveConfirm = resolve;
    });
    const onConfirm = jest.fn(() => pending);

    const queries = renderModal({ onConfirm });

    // Wait until the tipos arrive: the first one is auto-selected and the
    // confirm button becomes enabled.
    await waitFor(() => expect(confirmDisabled(queries)).toBe(false));

    const confirmBtn = queries.getByTestId('pagar-confirm');
    fireEvent.press(confirmBtn);
    // Same-frame second tap: the synchronous ref lock (not the async React
    // state) is what stops the duplicate submit.
    fireEvent.press(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Let the pending submit settle so the finally block can run.
    await act(async () => {
      resolveConfirm(undefined);
    });
  });

  it('calls onConfirm with the auto-selected tipo_pago', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);

    const queries = renderModal({ onConfirm });

    await waitFor(() => expect(confirmDisabled(queries)).toBe(false));
    fireEvent.press(queries.getByTestId('pagar-confirm'));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({ tipo_pago: 1 }),
    );
  });
});
