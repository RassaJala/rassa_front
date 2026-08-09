import { act, renderHook } from '@testing-library/react-native';

import { useChatUserSearch } from '@/features/chat/hooks/useChatUserSearch';
import { chatApi } from '@/services/chat';

jest.mock('@/services/chat', () => ({
  chatApi: { searchUsers: jest.fn() },
}));

const mockSearch = chatApi.searchUsers as jest.Mock;

describe('useChatUserSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('does not search with fewer than 3 characters', () => {
    const { result } = renderHook(() => useChatUserSearch('ab'));
    expect(mockSearch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('searches after debounce and returns results', async () => {
    jest.useFakeTimers();
    mockSearch.mockResolvedValue([
      { idUsuario: 2, nombreCompleto: 'Jane Doe', correo: 'j@x.com', rol: 'A' },
    ]);

    const { result } = renderHook(() => useChatUserSearch('jane'));

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSearch).toHaveBeenCalledWith('jane', expect.anything());
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0]?.idUsuario).toBe(2);
  });

  it('clears results when query falls below 3 characters', async () => {
    jest.useFakeTimers();
    mockSearch.mockResolvedValue([
      { idUsuario: 2, nombreCompleto: 'Jane Doe', correo: 'j@x.com', rol: 'A' },
    ]);

    const { result, rerender } = renderHook<
      ReturnType<typeof useChatUserSearch>,
      { q: string }
    >(({ q }) => useChatUserSearch(q), {
      initialProps: { q: 'jane' },
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.results).toHaveLength(1);

    rerender({ q: 'ja' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.results).toEqual([]);
  });
});
