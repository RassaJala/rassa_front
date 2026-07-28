import { useEffect, useState } from 'react';
import { chatApi } from '~/services/chat';
import type { SearchUserResult } from '@rassa/chat';

export function useSearchUsers(query: string) {
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      return;
    }

    const abortController = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await chatApi.searchUsers(trimmed, abortController.signal);
        if (!abortController.signal.aborted) {
          setResults(data);
        }
      } catch {
        if (!abortController.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query]);

  return { results, loading };
}
