import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useRemoveGroupMember } from '../useRemoveGroupMember';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { removeGroupMember: vi.fn() },
}));

const mockRemoveGroupMember = chatApi.removeGroupMember as ReturnType<
  typeof vi.fn
>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useRemoveGroupMember', () => {
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

  it('calls chatApi.removeGroupMember on mutate', async () => {
    mockRemoveGroupMember.mockResolvedValue(undefined);

    function TestComponent() {
      const mutation = useRemoveGroupMember(1);
      return <button onClick={() => mutation.mutate(5)}>Remove</button>;
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Remove').click();

    await waitFor(() => {
      expect(mockRemoveGroupMember).toHaveBeenCalledWith(1, 5);
    });
  });

  it('returns void on success', async () => {
    mockRemoveGroupMember.mockResolvedValue(undefined);

    function TestComponent() {
      const mutation = useRemoveGroupMember(1);
      return (
        <div>
          <button onClick={() => mutation.mutate(5)}>Remove</button>
          <span data-testid="success">{String(mutation.isSuccess)}</span>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Remove').click();

    await waitFor(() => {
      expect(getByTestId('success').textContent).toBe('true');
    });
  });

  it('sets error state on failure', async () => {
    mockRemoveGroupMember.mockRejectedValue(new Error('Remove failed'));

    function TestComponent() {
      const mutation = useRemoveGroupMember(1);
      return (
        <div>
          <button onClick={() => mutation.mutate(5)}>Remove</button>
          <span data-testid="error">{String(mutation.isError)}</span>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Remove').click();

    await waitFor(() => {
      expect(getByTestId('error').textContent).toBe('true');
    });
  });
});
