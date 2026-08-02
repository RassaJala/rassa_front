import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import type { Producto } from '@/services/productos';
import type { PublicacionList } from '@/services/publications';
import type { ApiResponse } from '@/types';

const STALE_TIME = 30_000;

interface FarmerHomeStats {
  totalProducts: number;
  totalPublications: number;
  activePublications: number;
}

export function useFarmerHomeStats(): FarmerHomeStats {
  const { data: productsData } = useQuery({
    queryKey: ['productos-count'],
    queryFn: async () => {
      const { data } =
        await api.get<ApiResponse<{ results: Producto[]; count?: number }>>(
          '/productos/',
        );
      return data.data;
    },
    staleTime: STALE_TIME,
  });

  const { data: pubsData } = useQuery({
    queryKey: ['publicaciones-count'],
    queryFn: async () => {
      const { data } =
        await api.get<ApiResponse<PublicacionList>>('/publicaciones/');
      return data.data;
    },
    staleTime: STALE_TIME,
  });

  const totalProducts =
    productsData?.count ?? productsData?.results?.length ?? 0;
  const totalPublications = pubsData?.count ?? 0;
  const activePublications =
    pubsData?.results?.filter((p) => p.estado === 'publicado').length ?? 0;

  return { totalProducts, totalPublications, activePublications };
}
