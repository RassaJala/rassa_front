import { useQuery } from '@tanstack/react-query';

import { fetchFarmers } from '@/services/settlements';
import type { AdminUser } from '@/types/userManagement';

// Active agricultores for the settlement filter dropdown (S2). The fetch is
// server-side (GET /admin/usuarios/?rol=Agricultor&estado=true) and multi-page;
// react-query caches it under ['farmers'] so every screen sharing the query
// key refetches once.
export function useFarmers(): {
  farmers: AdminUser[];
  isLoading: boolean;
  isError: boolean;
} {
  const {
    data = [],
    isLoading,
    isError,
  } = useQuery<AdminUser[]>({
    queryKey: ['farmers'],
    queryFn: fetchFarmers,
  });

  return { farmers: data, isLoading, isError };
}
