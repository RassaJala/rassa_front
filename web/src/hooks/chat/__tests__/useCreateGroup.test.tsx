import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useCreateGroup } from '../useCreateGroup';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { createGroup: vi.fn() },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, nombre: 'Test', rol: 'comprador' } }),
}));

const mockCreateGroup = chatApi.createGroup as ReturnType<typeof vi.fn>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useCreateGroup', () => {
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

  it('calls chatApi.createGroup on mutate', async () => {
    mockCreateGroup.mockResolvedValue({
      id: 1,
      nombre: 'New Group',
      tipo: 'grupal',
      es_familia: false,
      ultimo_mensaje: null,
      ultimo_mensaje_fecha: null,
      no_leidos: 0,
      participante_nombre: 'New Group',
      participante_avatar: null,
    });

    function TestComponent() {
      const mutation = useCreateGroup();
      return (
        <button
          onClick={() =>
            mutation.mutate({ nombre: 'New Group', fk_usuarios: [1, 2] })
          }
        >
          Create
        </button>
      );
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Create').click();

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith({
        nombre: 'New Group',
        fk_usuarios: [1, 2],
      });
    });
  });

  it('sets error state on failure', async () => {
    mockCreateGroup.mockRejectedValue(new Error('Create failed'));

    function TestComponent() {
      const mutation = useCreateGroup();
      return (
        <div>
          <button
            onClick={() => mutation.mutate({ nombre: 'G', fk_usuarios: [1] })}
          >
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
