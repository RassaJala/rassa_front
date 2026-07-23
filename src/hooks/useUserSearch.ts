import { useEffect, useState } from 'react';

import { searchUsers } from '@/services/families';
import type { SearchUserResult } from '@/types';

export function useUserSearch(
  query: string,
  selectedUser: SearchUserResult | null,
  debounceMs = 300,
) {
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || selectedUser) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchUsers(trimmed);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, selectedUser, debounceMs]);

  return { results, setResults, isSearching };
}
