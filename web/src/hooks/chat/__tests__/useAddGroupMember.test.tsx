import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useAddGroupMember } from '../useAddGroupMember';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { addGroupMember: vi.fn() },
}));

const mockAddGroupMember = chatApi.addGroupMember as ReturnType<typeof vi.fn>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useAddGroupMember', () => {
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

  it('calls chatApi.addGroupMember on mutate', async () => {
    mockAddGroupMember.mockResolvedValue(undefined);

    function TestComponent() {
      const mutation = useAddGroupMember(1);
      return (
        <button onClick={() => mutation.mutate({ fk_usuario: 5 })}>Add</button>
      );
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Add').click();

    await waitFor(() => {
      expect(mockAddGroupMember).toHaveBeenCalledWith(1, { fk_usuario: 5 });
    });
  });

  it('returns void on success', async () => {
    mockAddGroupMember.mockResolvedValue(undefined);

    function TestComponent() {
      const mutation = useAddGroupMember(1);
      return (
        <div>
          <button onClick={() => mutation.mutate({ fk_usuario: 5 })}>
            Add
          </button>
          <span data-testid="success">{String(mutation.isSuccess)}</span>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Add').click();

    await waitFor(() => {
      expect(getByTestId('success').textContent).toBe('true');
    });
  });

  it('sets error state on failure', async () => {
    mockAddGroupMember.mockRejectedValue(new Error('Add failed'));

    function TestComponent() {
      const mutation = useAddGroupMember(1);
      return (
        <div>
          <button onClick={() => mutation.mutate({ fk_usuario: 5 })}>
            Add
          </button>
          <span data-testid="error">{String(mutation.isError)}</span>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Add').click();

    await waitFor(() => {
      expect(getByTestId('error').textContent).toBe('true');
    });
  });
});
