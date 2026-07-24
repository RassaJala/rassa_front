import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ApiResponse,
  ProductoSemanal,
  Publicacion,
  PublicacionEstado,
  PublicacionList,
} from '@/services/publications';
import * as publicationsApi from '@/services/publications';

// ── Queries ────────────────────────────────────────────────

export function usePublicaciones(
  estado?: PublicacionEstado,
): UseQueryResult<ApiResponse<PublicacionList>> {
  return useQuery({
    queryKey: ['publicaciones', { estado }],
    queryFn: () => publicationsApi.getPublicaciones({ estado }),
    staleTime: 30_000,
    retry: 1,
  });
}

export function usePublicacion(
  id: number,
): UseQueryResult<ApiResponse<Publicacion>> {
  return useQuery({
    queryKey: ['publicaciones', id],
    queryFn: () => publicationsApi.getPublicacion(id),
    enabled: id > 0,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useProductosSemanales(
  pubId: number,
): UseQueryResult<ApiResponse<ProductoSemanal[]>> {
  return useQuery({
    queryKey: ['publicaciones', pubId, 'productos'],
    queryFn: () => publicationsApi.getProductosSemanales(pubId),
    enabled: pubId > 0,
    staleTime: 30_000,
    retry: 1,
  });
}

// ── Publicacion mutations ──────────────────────────────────

export function useCreatePublicacion(): UseMutationResult<
  ApiResponse<Publicacion>,
  Error,
  void
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publicationsApi.createPublicacion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['publicaciones'] });
    },
  });
}

export function useDeletePublicacion(): UseMutationResult<
  ApiResponse<null>,
  Error,
  number
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publicationsApi.deletePublicacion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['publicaciones'] });
    },
  });
}

export function usePublishPublicacion(): UseMutationResult<
  ApiResponse<Publicacion>,
  Error,
  number
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publicationsApi.publishPublicacion,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['publicaciones'] });
      void queryClient.invalidateQueries({
        queryKey: ['publicaciones', variables],
      });
    },
  });
}

export function useClosePublicacion(): UseMutationResult<
  ApiResponse<Publicacion>,
  Error,
  number
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publicationsApi.closePublicacion,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['publicaciones'] });
      void queryClient.invalidateQueries({
        queryKey: ['publicaciones', variables],
      });
    },
  });
}

// ── ProductoSemanal mutations ──────────────────────────────

export function useAddProductoSemanal(): UseMutationResult<
  ApiResponse<ProductoSemanal>,
  Error,
  {
    pubId: number;
    payload: {
      fk_producto: number;
      fk_unidad: number;
      stock: number;
      precio: number;
      foto?: string | null;
    };
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pubId, payload }) =>
      publicationsApi.addProductoSemanal(pubId, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['publicaciones', variables.pubId, 'productos'],
      });
    },
  });
}

export function useUpdateProductoSemanal(): UseMutationResult<
  ApiResponse<ProductoSemanal>,
  Error,
  {
    pubId: number;
    itemId: number;
    payload: {
      fk_producto?: number;
      fk_unidad?: number;
      stock?: number;
      precio?: number;
      foto?: string | null;
    };
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pubId, itemId, payload }) =>
      publicationsApi.updateProductoSemanal(pubId, itemId, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['publicaciones', variables.pubId, 'productos'],
      });
    },
  });
}

export function useDeleteProductoSemanal(): UseMutationResult<
  ApiResponse<null>,
  Error,
  { pubId: number; itemId: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pubId, itemId }) =>
      publicationsApi.deleteProductoSemanal(pubId, itemId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['publicaciones', variables.pubId, 'productos'],
      });
    },
  });
}
