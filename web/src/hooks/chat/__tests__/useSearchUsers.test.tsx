import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useSearchUsers } from '../useSearchUsers';
import { chatApi } from '~/services/chat';

vi.mock('~/services/chat', () => ({
  chatApi: { searchUsers: vi.fn() },
}));

const mockSearchUsers = chatApi.searchUsers as ReturnType<typeof vi.fn>;

describe('useSearchUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty results for queries shorter than 3 characters', () => {
    function TestComponent() {
      const { results, loading } = useSearchUsers('ab');
      return (
        <div>
          <span data-testid="count">{results.length}</span>
          <span data-testid="loading">{String(loading)}</span>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('count').textContent).toBe('0');
    expect(getByTestId('loading').textContent).toBe('false');
    expect(mockSearchUsers).not.toHaveBeenCalled();
  });

  it('debounces API call by 300ms', async () => {
    mockSearchUsers.mockResolvedValue([]);

    function TestComponent() {
      const { results, loading } = useSearchUsers('test');
      return (
        <div>
          <span data-testid="count">{results.length}</span>
          <span data-testid="loading">{String(loading)}</span>
        </div>
      );
    }

    render(<TestComponent />);

    await new Promise((r) => setTimeout(r, 350));

    expect(mockSearchUsers).toHaveBeenCalledWith('test', expect.any(Object));
  });

  it('aborts previous request on query change', async () => {
    let abortSignal: AbortSignal | undefined;
    mockSearchUsers.mockImplementation(
      async (_q: string, signal?: AbortSignal) => {
        abortSignal = signal;
        return [];
      },
    );

    function TestComponent({ query }: { query: string }) {
      useSearchUsers(query);
      return null;
    }

    const { rerender } = render(<TestComponent query="first" />);

    await new Promise((r) => setTimeout(r, 350));

    const firstSignal = abortSignal;
    rerender(<TestComponent query="second" />);

    await new Promise((r) => setTimeout(r, 350));

    expect(firstSignal?.aborted).toBe(true);
  });

  it('sets error when API call fails', async () => {
    mockSearchUsers.mockRejectedValue(new Error('Search failed'));

    function TestComponent() {
      const { error } = useSearchUsers('test');
      return <span data-testid="error">{error}</span>;
    }

    const { getByTestId } = render(<TestComponent />);

    await new Promise((r) => setTimeout(r, 350));

    expect(getByTestId('error').textContent).toBe('Search failed');
  });
});
