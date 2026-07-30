import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { messagesKey } from '@rassa/chat';
import { useEditMessage } from '../useEditMessage';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { editMessage: vi.fn() },
}));

const mockEditMessage = chatApi.editMessage as ReturnType<typeof vi.fn>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useEditMessage', () => {
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
            contenido: 'Original',
            creado_en: new Date().toISOString(),
            leido: true,
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

  it('optimistically updates message content', async () => {
    mockEditMessage.mockResolvedValue({
      id: 1,
      conversacion: 1,
      remitente: 1,
      remitente_nombre: 'Test User',
      contenido: 'Updated',
      creado_en: '',
      leido: true,
      editado: true,
    });

    function TestComponent() {
      const mutation = useEditMessage(1);
      return (
        <button
          onClick={() =>
            mutation.mutate({ messageId: 1, contenido: 'Updated' })
          }
        >
          Edit
        </button>
      );
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Edit').click();

    await waitFor(() => {
      const data = queryClient.getQueryData<{
        pages: {
          results: { id: number; contenido: string; editado: boolean }[];
        }[];
      }>(messagesKey(1));
      const msg = data?.pages.flatMap((p) => p.results).find((m) => m.id === 1);
      expect(msg?.contenido).toBe('Updated');
      expect(msg?.editado).toBe(true);
    });
  });

  it('calls chatApi.editMessage with correct params', async () => {
    mockEditMessage.mockResolvedValue({
      id: 1,
      conversacion: 1,
      remitente: 1,
      remitente_nombre: 'Test User',
      contenido: 'Updated',
      creado_en: '',
      leido: true,
      editado: true,
    });

    function TestComponent() {
      const mutation = useEditMessage(1);
      return (
        <button
          onClick={() =>
            mutation.mutate({ messageId: 1, contenido: 'Updated' })
          }
        >
          Edit
        </button>
      );
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Edit').click();

    await waitFor(() => {
      expect(mockEditMessage).toHaveBeenCalledWith(1, 'Updated', 1);
    });
  });

  it('rolls back optimistic update on error', async () => {
    mockEditMessage.mockRejectedValue(new Error('Edit failed'));

    function TestComponent() {
      const mutation = useEditMessage(1);
      return (
        <button
          onClick={() =>
            mutation.mutate({ messageId: 1, contenido: 'Updated' })
          }
        >
          Edit
        </button>
      );
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Edit').click();

    await waitFor(() => {
      const data = queryClient.getQueryData(messagesKey(1));
      expect(data).toEqual(existingMessages);
    });
  });
});
