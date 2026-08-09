import { useEffect, useState } from 'react';

import { chatApi } from '@/services/chat';
import type { SearchUser } from '@/types/chat';

export function useChatUserSearch(query: string): {
  results: SearchUser[];
  isSearching: boolean;
  error: string | null;
} {
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    const timer = setTimeout(() => {
      setIsSearching(true);
      setError(null);
      void (async () => {
        try {
          const data = await chatApi.searchUsers(
            trimmed,
            abortController.signal,
          );
          if (!abortController.signal.aborted) {
            setResults(data);
          }
        } catch (err: unknown) {
          if (!abortController.signal.aborted) {
            setResults([]);
            setError(
              err instanceof Error ? err.message : 'Error al buscar usuarios',
            );
          }
        } finally {
          if (!abortController.signal.aborted) {
            setIsSearching(false);
          }
        }
      })();
    }, 300);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query]);

  return { results, isSearching, error };
}
