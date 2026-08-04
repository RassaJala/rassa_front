import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useChatMessages } from '../useChatMessages';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { getMessages: vi.fn() },
}));

const mockGetMessages = chatApi.getMessages as ReturnType<typeof vi.fn>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useChatMessages', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
      },
    });
  });

  it('calls chatApi.getMessages on mount', async () => {
    mockGetMessages.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    function TestComponent() {
      const { data, isLoading } = useChatMessages(1);
      return (
        <div>
          <span data-testid="loading">{String(isLoading)}</span>
          <span data-testid="count">{data?.pages[0]?.results.length ?? 0}</span>
        </div>
      );
    }

    render(<TestComponent />, { wrapper: createWrapper(queryClient) });

    await waitFor(() => {
      expect(mockGetMessages).toHaveBeenCalledWith(1, 1);
    });
  });

  it('getNextPageParam extracts page from absolute URL', async () => {
    mockGetMessages
      .mockResolvedValueOnce({
        count: 4,
        next: 'http://localhost:8000/chat/conversaciones/1/mensajes/?page=2',
        previous: null,
        results: [
          {
            id: 1,
            conversacion: 1,
            remitente: 1,
            remitente_nombre: 'A',
            contenido: 'a',
            creado_en: '',
            leido: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        count: 4,
        next: null,
        previous:
          'http://localhost:8000/chat/conversaciones/1/mensajes/?page=1',
        results: [
          {
            id: 2,
            conversacion: 1,
            remitente: 1,
            remitente_nombre: 'B',
            contenido: 'b',
            creado_en: '',
            leido: true,
          },
        ],
      });

    function TestComponent() {
      const { data, fetchNextPage, hasNextPage } = useChatMessages(1);
      return (
        <div>
          <span data-testid="hasNext">{String(hasNextPage)}</span>
          <span data-testid="count">{data?.pages.length ?? 0}</span>
          <button onClick={() => fetchNextPage()}>Next</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(getByTestId('hasNext').textContent).toBe('true');
    });

    getByText('Next').click();

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('2');
    });
  });

  it('getNextPageParam returns undefined for null next', async () => {
    mockGetMessages.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          conversacion: 1,
          remitente: 1,
          remitente_nombre: 'A',
          contenido: 'a',
          creado_en: '',
          leido: true,
        },
      ],
    });

    function TestComponent() {
      const { hasNextPage } = useChatMessages(1);
      return <span data-testid="hasNext">{String(hasNextPage)}</span>;
    }

    const { getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(getByTestId('hasNext').textContent).toBe('false');
    });
  });

  it('dedup select filters duplicate messages by composite key', async () => {
    const msg = {
      id: 'temp-1',
      conversacion: 1,
      remitente: 1,
      remitente_nombre: 'A',
      contenido: 'dup',
      creado_en: '2026-01-01T00:00:00Z',
      leido: true,
    };
    mockGetMessages.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [msg, msg],
    });

    function TestComponent() {
      const { data } = useChatMessages(1);
      return (
        <span data-testid="count">{data?.pages[0]?.results.length ?? 0}</span>
      );
    }

    const { getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('1');
    });
  });
});
