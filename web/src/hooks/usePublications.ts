import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ApiResponse,
  Producto,
  ProductoSemanal,
  Publicacion,
  PublicacionEstado,
  PublicacionList,
} from '../services/publications';
import * as publicationsApi from '../services/publications';

const STALE_TIME = 30_000;

// ── Error logging helper ──────────────────────────────────

function logMutationError(context: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[publications] ${context}:`, msg);
}

// ── Queries ────────────────────────────────────────────────

export function usePublicaciones(estado?: PublicacionEstado) {
  return useQuery<ApiResponse<PublicacionList>>({
    queryKey: ['publicaciones', { estado }],
    queryFn: () =>
      publicationsApi.getPublicaciones(estado ? { estado } : undefined),
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

export function useCatalogProductos() {
  return useQuery<ApiResponse<{ results: Producto[] }>>({
    queryKey: ['productos-catalog'],
    queryFn: publicationsApi.getCatalogProductos,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useUnidades() {
  return useQuery<ApiResponse<Array<{ id_unidad: number; tipo: string }>>>({
    queryKey: ['unidades'],
    queryFn: publicationsApi.getUnidades,
    staleTime: 60_000,
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
    onError: (err) => logMutationError('createPublicacion', err),
  });
}

export function useDeletePublicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publicationsApi.deletePublicacion,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['publicaciones'] });
    },
    onError: (err) => logMutationError('deletePublicacion', err),
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
    onError: (err) => logMutationError('publishPublicacion', err),
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
    onError: (err) => logMutationError('closePublicacion', err),
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
      void qc.invalidateQueries({ queryKey: ['publicaciones'] });
      void qc.invalidateQueries({
        queryKey: ['publicaciones', variables.pubId, 'productos'],
      });
    },
    onError: (err) => logMutationError('addProductoSemanal', err),
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
      void qc.invalidateQueries({ queryKey: ['publicaciones'] });
      void qc.invalidateQueries({
        queryKey: ['publicaciones', variables.pubId, 'productos'],
      });
    },
    onError: (err) => logMutationError('updateProductoSemanal', err),
  });
}

export function useDeleteProductoSemanal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pubId, itemId }: { pubId: number; itemId: number }) =>
      publicationsApi.deleteProductoSemanal(pubId, itemId),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['publicaciones'] });
      void qc.invalidateQueries({
        queryKey: ['publicaciones', variables.pubId, 'productos'],
      });
    },
    onError: (err) => logMutationError('deleteProductoSemanal', err),
  });
}

export function useUploadProductoSemanalImagen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pubId,
      itemId,
      formData,
    }: {
      pubId: number;
      itemId: number;
      formData: FormData;
    }) => publicationsApi.uploadProductoSemanalImagen(pubId, itemId, formData),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['publicaciones'] });
      void qc.invalidateQueries({
        queryKey: ['publicaciones', variables.pubId, 'productos'],
      });
    },
    onError: (err) => logMutationError('uploadProductoSemanalImagen', err),
  });
}
