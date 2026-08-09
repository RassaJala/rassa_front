import { useQuery } from '@tanstack/react-query';

import { fetchFarmers } from '@/services/settlements';
import type { FarmerOption } from '@/services/settlements';

export interface FarmersResult {
  farmers: FarmerOption[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

// Active agricultores for the settlement filter dropdown (S2). The fetch is
// server-side (GET /admin/usuarios/?rol=Agricultor&estado=true) and multi-page;
// react-query caches it under ['farmers'] so every screen sharing the query
// key refetches once. Callers may also surface the error state and trigger a
// manual refetch (FarmerPickerModal retry). Farmers arrive as FarmerOption
// (id + display name only) — the service already stripped the PII (R1-3).
export function useFarmers(): FarmersResult {
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<FarmerOption[]>({
    queryKey: ['farmers'],
    queryFn: fetchFarmers,
  });

  return { farmers: data, isLoading, isError, refetch };
}
