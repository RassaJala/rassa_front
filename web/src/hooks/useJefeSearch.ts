import { useQuery } from '@tanstack/react-query';

import api from '../services/api';
import type { SearchUserResult } from '../types';

export function useJefeSearch(
  query: string,
  selectedUser?: SearchUserResult | null,
) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= 1 && !selectedUser;

  const { data: results = [], isLoading: isSearching } = useQuery<
    SearchUserResult[]
  >({
    queryKey: ['user-search', trimmed],
    queryFn: async () => {
      const { data } = await api.get(
        `/auth/search-users/?q=${encodeURIComponent(trimmed)}&include_assigned=false`,
      );
      const payload = (data as { data?: unknown }).data ?? data;
      return Array.isArray(payload) ? (payload as SearchUserResult[]) : [];
    },
    enabled,
    staleTime: 30_000,
  });

  return { results, isSearching };
}
