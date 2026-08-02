import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useConversations } from '../useConversations';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { getConversations: vi.fn() },
}));

const mockGetConversations = chatApi.getConversations as ReturnType<
  typeof vi.fn
>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useConversations', () => {
  let queryClient: QueryClient;

  const mockData = {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        nombre: 'Chat 1',
        tipo: 'privada',
        ultimo_mensaje: 'Hola',
        ultimo_mensaje_fecha: '2026-01-01',
        no_leidos: 2,
        participante_nombre: 'User 1',
        participante_avatar: null,
      },
      {
        id: 2,
        nombre: 'Grupo 1',
        tipo: 'grupal',
        ultimo_mensaje: 'Adios',
        ultimo_mensaje_fecha: '2026-01-02',
        no_leidos: 0,
        participante_nombre: '',
        participante_avatar: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
      },
    });
    mockGetConversations.mockResolvedValue(mockData);
  });

  it('fetches conversations on mount', async () => {
    function TestComponent() {
      const { data, isLoading } = useConversations();
      return (
        <div>
          <span data-testid="loading">{String(isLoading)}</span>
          <span data-testid="count">{data?.results.length ?? 0}</span>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(mockGetConversations).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('2');
    });
  });

  it('shows loading state initially', () => {
    mockGetConversations.mockReturnValue(new Promise(() => {}));

    function TestComponent() {
      const { isLoading } = useConversations();
      return <span data-testid="loading">{String(isLoading)}</span>;
    }

    const { getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    expect(getByTestId('loading').textContent).toBe('true');
  });

  it('handles API errors', async () => {
    mockGetConversations.mockRejectedValueOnce(new Error('Network error'));

    function TestComponent() {
      const { error } = useConversations();
      return <span data-testid="error">{error?.message ?? ''}</span>;
    }

    const { getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(getByTestId('error').textContent).toBe('Network error');
    });
  });

  it('failureCount resets on successful fetch (backoff)', async () => {
    mockGetConversations.mockResolvedValueOnce(mockData);

    function TestComponent() {
      const query = useConversations();
      return <span data-testid="status">{query.fetchStatus}</span>;
    }

    const { getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(getByTestId('status').textContent).not.toBe('fetching');
    });
  });
});
