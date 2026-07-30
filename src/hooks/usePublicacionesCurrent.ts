import { useQuery } from '@tanstack/react-query';

import type { PublicacionCurrent } from '@/services/publications';
import { getPublicacionesCurrent } from '@/services/publications';
import type { ApiResponse } from '@/types';

/**
 * Hook para obtener las publicaciones publicadas de la semana actual.
 * Endpoint público: GET /api/publicaciones/current/
 */
export function usePublicacionesCurrent(): ReturnType<
  typeof useQuery<ApiResponse<readonly PublicacionCurrent[]>>
> {
  return useQuery({
    queryKey: ['publicaciones-current'],
    queryFn: getPublicacionesCurrent,
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}
