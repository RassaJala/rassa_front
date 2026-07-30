import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { messagesKey } from '@rassa/chat';
import { useDeleteMessage } from '../useDeleteMessage';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { deleteMessage: vi.fn() },
}));

const mockDeleteMessage = chatApi.deleteMessage as ReturnType<typeof vi.fn>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useDeleteMessage', () => {
  let queryClient: QueryClient;

  const existingMessages = {
    pages: [
      {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            conversacion: 1,
            remitente: 1,
            remitente_nombre: 'Test User',
            contenido: 'Hello',
            creado_en: new Date().toISOString(),
            leido: true,
            activo: true,
          },
        ],
      },
    ],
    pageParams: [1],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(messagesKey(1), existingMessages);
  });

  it('optimistically sets activo to false', async () => {
    mockDeleteMessage.mockResolvedValue(undefined);

    function TestComponent() {
      const mutation = useDeleteMessage(1);
      return (
        <div>
          <button onClick={() => mutation.mutate(1)}>Delete</button>
        </div>
      );
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Delete').click();

    await waitFor(() => {
      const data = queryClient.getQueryData<{
        pages: { results: { id: number; activo: boolean }[] }[];
      }>(messagesKey(1));
      const msg = data?.pages.flatMap((p) => p.results).find((m) => m.id === 1);
      expect(msg?.activo).toBe(false);
    });
  });

  it('calls chatApi.deleteMessage with messageId', async () => {
    mockDeleteMessage.mockResolvedValue(undefined);

    function TestComponent() {
      const mutation = useDeleteMessage(1);
      return <button onClick={() => mutation.mutate(1)}>Delete</button>;
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Delete').click();

    await waitFor(() => {
      expect(mockDeleteMessage).toHaveBeenCalledWith(1);
    });
  });

  it('rolls back optimistic update on error', async () => {
    mockDeleteMessage.mockRejectedValue(new Error('Delete failed'));

    function TestComponent() {
      const mutation = useDeleteMessage(1);
      return <button onClick={() => mutation.mutate(1)}>Delete</button>;
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Delete').click();

    await waitFor(() => {
      const data = queryClient.getQueryData(messagesKey(1));
      expect(data).toEqual(existingMessages);
    });
  });
});
