import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useRenameGroup } from '../useRenameGroup';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { renameGroup: vi.fn() },
}));

const mockRenameGroup = chatApi.renameGroup as ReturnType<typeof vi.fn>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useRenameGroup', () => {
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

  it('calls chatApi.renameGroup on mutate', async () => {
    mockRenameGroup.mockResolvedValue({
      id: 1,
      nombre: 'Renamed',
      tipo: 'grupal',
      es_familia: false,
      ultimo_mensaje: null,
      ultimo_mensaje_fecha: null,
      no_leidos: 0,
      participante_nombre: 'Renamed',
      participante_avatar: null,
    });

    function TestComponent() {
      const mutation = useRenameGroup(1);
      return (
        <button onClick={() => mutation.mutate({ nombre: 'Renamed' })}>
          Rename
        </button>
      );
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Rename').click();

    await waitFor(() => {
      expect(mockRenameGroup).toHaveBeenCalledWith(1, { nombre: 'Renamed' });
    });
  });

  it('returns Conversation with new name on success', async () => {
    mockRenameGroup.mockResolvedValue({
      id: 1,
      nombre: 'Renamed',
      tipo: 'grupal',
      es_familia: false,
      ultimo_mensaje: null,
      ultimo_mensaje_fecha: null,
      no_leidos: 0,
      participante_nombre: 'Renamed',
      participante_avatar: null,
    });

    function TestComponent() {
      const mutation = useRenameGroup(1);
      return (
        <div>
          <button onClick={() => mutation.mutate({ nombre: 'Renamed' })}>
            Rename
          </button>
          <span data-testid="success">{String(mutation.isSuccess)}</span>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Rename').click();

    await waitFor(() => {
      expect(getByTestId('success').textContent).toBe('true');
    });
  });

  it('sets error state on failure', async () => {
    mockRenameGroup.mockRejectedValue(new Error('Rename failed'));

    function TestComponent() {
      const mutation = useRenameGroup(1);
      return (
        <div>
          <button onClick={() => mutation.mutate({ nombre: 'X' })}>
            Rename
          </button>
          <span data-testid="error">{String(mutation.isError)}</span>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Rename').click();

    await waitFor(() => {
      expect(getByTestId('error').textContent).toBe('true');
    });
  });
});
