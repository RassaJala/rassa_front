import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ApiResponse,
  ProductoSemanal,
  Publicacion,
  PublicacionEstado,
  PublicacionList,
} from '../services/publications';
import * as publicationsApi from '../services/publications';

const STALE_TIME = 30_000;

// ── Queries ────────────────────────────────────────────────

export function usePublicaciones(estado?: PublicacionEstado) {
  return useQuery<ApiResponse<PublicacionList>>({
    queryKey: ['publicaciones', { estado }],
    queryFn: () => publicationsApi.getPublicaciones({ estado }),
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function usePublicacion(id: number) {
  return useQuery<ApiResponse<Publicacion>>({
    queryKey: ['publicaciones', id],
    queryFn: () => publicationsApi.getPublicacion(id),
    enabled: id > 0,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useProductosSemanales(pubId: number) {
  return useQuery<ApiResponse<ProductoSemanal[]>>({
    queryKey: ['publicaciones', pubId, 'productos'],
    queryFn: () => publicationsApi.getProductosSemanales(pubId),
    enabled: pubId > 0,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

// ── Publicacion mutations ──────────────────────────────────

export function useCreatePublicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publicationsApi.createPublicacion,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['publicaciones'] });
    },
  });
}

export function useDeletePublicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publicationsApi.deletePublicacion,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['publicaciones'] });
    },
  });
}

export function usePublishPublicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publicationsApi.publishPublicacion,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['publicaciones'] });
      void qc.invalidateQueries({
        queryKey: ['publicaciones', variables],
      });
    },
  });
}

export function useClosePublicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publicationsApi.closePublicacion,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['publicaciones'] });
      void qc.invalidateQueries({
        queryKey: ['publicaciones', variables],
      });
    },
  });
}

// ── ProductoSemanal mutations ──────────────────────────────

export function useAddProductoSemanal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pubId,
      payload,
    }: {
      pubId: number;
      payload: {
        fk_producto: number;
        fk_unidad: number;
        stock: number;
        precio: number;
        foto?: string | null;
      };
    }) => publicationsApi.addProductoSemanal(pubId, payload),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: ['publicaciones', variables.pubId, 'productos'],
      });
    },
  });
}

export function useUpdateProductoSemanal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pubId,
      itemId,
      payload,
    }: {
      pubId: number;
      itemId: number;
      payload: {
        fk_producto?: number;
        fk_unidad?: number;
        stock?: number;
        precio?: number;
        foto?: string | null;
      };
    }) => publicationsApi.updateProductoSemanal(pubId, itemId, payload),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: ['publicaciones', variables.pubId, 'productos'],
      });
    },
  });
}

export function useDeleteProductoSemanal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pubId,
      itemId,
    }: {
      pubId: number;
      itemId: number;
    }) => publicationsApi.deleteProductoSemanal(pubId, itemId),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: ['publicaciones', variables.pubId, 'productos'],
      });
    },
  });
}
