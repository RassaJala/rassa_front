import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('~/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn() },
}));

import { DataTable } from '~/components/layout/DataTable';
import { PageHeader } from '~/components/layout/PageHeader';
import { Badge } from '~/components/ui/Badge';
import { Button } from '~/components/ui/Button';
import { LoadingSpinner } from '~/components/ui/LoadingSpinner';
import api from '~/services/api';
import { BuyerOrders } from '../BuyerOrders';

vi.mock('~/components/layout/DataTable', () => ({
  DataTable: (props: {
    data: unknown[];
    columns: Array<{ key: string; render?: (row: unknown) => React.ReactNode }>;
  }) => (
    <div data-testid="data-table">
      {props.columns.map((col) =>
        (props.data ?? []).map((row, i) => (
          <span key={`${col.key}-${i}`}>
            {col.render ? col.render(row) : null}
          </span>
        )),
      )}
    </div>
  ),
}));
vi.mock('~/components/layout/PageHeader', () => ({
  PageHeader: () => <div data-testid="page-header" />,
}));
vi.mock('~/components/ui/Badge', () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant: string;
  }) => <span data-variant={variant}>{children}</span>,
}));
vi.mock('~/components/ui/Button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));
vi.mock('~/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading" />,
}));

const mockedApiGet = api.get as ReturnType<typeof vi.fn>;

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('BuyerOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the Expirado badge for an order flagged as expired', async () => {
    mockedApiGet.mockResolvedValue({
      data: {
        results: [
          {
            id_pedido: 1,
            total: '100.00',
            estado_actual: 'pendiente',
            creado_en: '2026-08-01T10:00:00Z',
            expirado: true,
          },
        ],
      },
    });
    render(<BuyerOrders />, { wrapper: createWrapper() });
    await screen.findByTestId('data-table');
    expect(screen.getByText('Expirado')).toBeTruthy();
  });

  it('does not render the Expirado badge for a valid order', async () => {
    mockedApiGet.mockResolvedValue({
      data: {
        results: [
          {
            id_pedido: 2,
            total: '50.00',
            estado_actual: 'confirmado',
            creado_en: '2026-08-01T10:00:00Z',
          },
        ],
      },
    });
    render(<BuyerOrders />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Expirado')).toBeNull();
    });
  });
});
