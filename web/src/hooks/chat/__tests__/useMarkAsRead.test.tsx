import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useMarkAsRead } from '../useMarkAsRead';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { markConversationAsRead: vi.fn() },
}));

const mockMarkAsRead = chatApi.markConversationAsRead as ReturnType<
  typeof vi.fn
>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useMarkAsRead', () => {
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

  it('calls chatApi.markConversationAsRead on mutate', async () => {
    mockMarkAsRead.mockResolvedValue(undefined);

    function TestComponent() {
      const mutation = useMarkAsRead();
      return <button onClick={() => mutation.mutate(42)}>Mark</button>;
    }

    const { getByText } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Mark').click();

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith(42);
    });
  });

  it('sets error state on failure', async () => {
    mockMarkAsRead.mockRejectedValue(new Error('Mark failed'));

    function TestComponent() {
      const mutation = useMarkAsRead();
      return (
        <div>
          <button onClick={() => mutation.mutate(42)}>Mark</button>
          <span data-testid="error">{String(mutation.isError)}</span>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<TestComponent />, {
      wrapper: createWrapper(queryClient),
    });

    getByText('Mark').click();

    await waitFor(() => {
      expect(getByTestId('error').textContent).toBe('true');
    });
  });
});
