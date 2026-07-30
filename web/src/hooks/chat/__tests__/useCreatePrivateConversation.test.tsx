import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useCreatePrivateConversation } from '../useCreatePrivateConversation';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { createPrivateConversation: vi.fn() },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, nombre: 'Test', rol: 'comprador' } }),
}));

const mockCreatePrivate = chatApi.createPrivateConversation as ReturnType<
  typeof vi.fn
>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useCreatePrivateConversation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
  });

  it('calls chatApi.createPrivateConversation on mutate', async () => {
    mockCreatePrivate.mockResolvedValue({
      id: 10,
      nombre: '',
      tipo: 'privada',
      es_familia: false,
      ultimo_mensaje: null,
      ultimo_mensaje_fecha: null,
      no_leidos: 0,
      participante_nombre: '',
      participante_avatar: null,
    });

    function TestComponent() {
      const mutation = useCreatePrivateConversation();
      return (
        <button onClick={() => mutation.mutate({ fk_usuario: 5 })}>
          Create
        </button>
      );
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Create').click();

    await waitFor(() => {
      expect(mockCreatePrivate).toHaveBeenCalledWith({ fk_usuario: 5 });
    });
  });

  it('returns minimal Conversation on success', async () => {
    const mockConv = {
      id: 10,
      nombre: '',
      tipo: 'privada',
      es_familia: false,
      ultimo_mensaje: null,
      ultimo_mensaje_fecha: null,
      no_leidos: 0,
      participante_nombre: '',
      participante_avatar: null,
    };
    mockCreatePrivate.mockResolvedValue(mockConv);

    function TestComponent() {
      const mutation = useCreatePrivateConversation();
      return (
        <div>
          <button onClick={() => mutation.mutate({ fk_usuario: 5 })}>
            Create
          </button>
          <span data-testid="success">{String(mutation.isSuccess)}</span>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Create').click();

    await waitFor(() => {
      expect(getByTestId('success').textContent).toBe('true');
    });
  });

  it('sets error state on failure', async () => {
    mockCreatePrivate.mockRejectedValue(new Error('Create failed'));

    function TestComponent() {
      const mutation = useCreatePrivateConversation();
      return (
        <div>
          <button onClick={() => mutation.mutate({ fk_usuario: 5 })}>
            Create
          </button>
          <span data-testid="error">{String(mutation.isError)}</span>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Create').click();

    await waitFor(() => {
      expect(getByTestId('error').textContent).toBe('true');
    });
  });
});
