import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { messagesKey } from '@rassa/chat';
import { useSendMessage } from '../useSendMessage';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: {
    sendMessage: vi.fn(),
  },
}));

vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, nombre: 'Test', rol: 'comprador' } }),
}));

const mockSendMessage = chatApi.sendMessage as ReturnType<typeof vi.fn>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useSendMessage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(messagesKey(1), {
      pages: [
        {
          count: 0,
          next: null,
          previous: null,
          results: [],
        },
      ],
      pageParams: [1],
    });
  });

  it('should call chatApi.sendMessage on mutate', async () => {
    mockSendMessage.mockResolvedValueOnce({
      id: 2,
      conversacion: 1,
      remitente: 1,
      remitente_nombre: 'Test',
      contenido: 'Hello',
      creado_en: new Date().toISOString(),
      leido: false,
    });

    function TestComponent() {
      const mutation = useSendMessage(1);
      return (
        <button
          onClick={() =>
            mutation.mutate({ conversacion: 1, contenido: 'Hello' })
          }
        >
          Send
        </button>
      );
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Send').click();

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        conversacion: 1,
        contenido: 'Hello',
      });
    });
  });

  it('should rollback optimistic update on error', async () => {
    const originalData = {
      pages: [
        {
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              conversacion: 1,
              remitente: 2,
              remitente_nombre: 'Other',
              contenido: 'Hi',
              creado_en: '2026-01-01T00:00:00Z',
              leido: true,
            },
          ],
        },
      ],
      pageParams: [1],
    };
    queryClient.setQueryData(messagesKey(1), originalData);

    mockSendMessage.mockRejectedValueOnce(new Error('Network error'));

    function TestComponent() {
      const mutation = useSendMessage(1);
      return (
        <button
          onClick={() =>
            mutation.mutate({ conversacion: 1, contenido: 'Fail' })
          }
        >
          Send
        </button>
      );
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Send').click();

    await waitFor(() => {
      const data = queryClient.getQueryData(messagesKey(1));
      expect(data).toEqual(originalData);
    });
  });
});
