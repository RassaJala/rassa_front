import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";

import { QUERY_RETRY, QUERY_STALE_TIME } from "../constants/api";
import type {
  ApiResponse,
  Producto,
  ProductoSemanal,
  Publicacion,
  PublicacionEstado,
  PublicacionList,
} from "../services/publications";
import * as publicationsApi from "../services/publications";

// ── Error logging helper ──────────────────────────────────

function logMutationError(context: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(
    `[publications] ${context}: ${name}: ${msg}`,
    stack ? { stack } : "",
  );
}

// ── Mutation factory ──────────────────────────────────────

type InvalidateKeys =
  | ["publicaciones"]
  | ["publicaciones", number]
  | ["publicaciones", number, "productos"];

function usePubMutation<TData, TVariables>(
  context: string,
  mutationFn: (vars: TVariables) => Promise<TData>,
  invalidateKeys: (vars: TVariables) => InvalidateKeys[],
  options?: UseMutationOptions<TData, unknown, TVariables>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, vars) => {
      for (const key of invalidateKeys(vars)) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
    onError: (err) => logMutationError(context, err),
    ...options,
  });
}

// ── Queries ────────────────────────────────────────────────

export function usePublicaciones(estado?: PublicacionEstado) {
  return useQuery<ApiResponse<PublicacionList>>({
    queryKey: ["publicaciones", { estado }],
    queryFn: () =>
      publicationsApi.getPublicaciones(estado ? { estado } : undefined),
    staleTime: QUERY_STALE_TIME,
    retry: QUERY_RETRY,
  });
}

export function usePublicacion(id: number) {
  return useQuery<ApiResponse<Publicacion>>({
    queryKey: ["publicaciones", id],
    queryFn: () => publicationsApi.getPublicacion(id),
    enabled: id > 0,
    staleTime: QUERY_STALE_TIME,
    retry: QUERY_RETRY,
  });
}

export function useProductosSemanales(pubId: number) {
  return useQuery<ApiResponse<ProductoSemanal[]>>({
    queryKey: ["publicaciones", pubId, "productos"],
    queryFn: () => publicationsApi.getProductosSemanales(pubId),
    enabled: pubId > 0,
    staleTime: QUERY_STALE_TIME,
    retry: QUERY_RETRY,
  });
}

export function useCatalogProductos() {
  return useQuery<ApiResponse<{ results: Producto[] }>>({
    queryKey: ["productos-catalog"],
    queryFn: publicationsApi.getCatalogProductos,
    staleTime: QUERY_STALE_TIME,
    retry: QUERY_RETRY,
  });
}

export function useUnidades() {
  return useQuery<ApiResponse<Array<{ id_unidad: number; tipo: string }>>>({
    queryKey: ["unidades"],
    queryFn: publicationsApi.getUnidades,
    staleTime: QUERY_STALE_TIME,
    retry: QUERY_RETRY,
  });
}

// ── Publicacion mutations ──────────────────────────────────

export function useCreatePublicacion() {
  return usePubMutation(
    "createPublicacion",
    publicationsApi.createPublicacion,
    () => [["publicaciones"]],
  );
}

export function useDeletePublicacion() {
  return usePubMutation(
    "deletePublicacion",
    publicationsApi.deletePublicacion,
    () => [["publicaciones"]],
  );
}

export function usePublishPublicacion() {
  return usePubMutation(
    "publishPublicacion",
    publicationsApi.publishPublicacion,
    (id: number) => [["publicaciones"], ["publicaciones", id]],
  );
}

export function useClosePublicacion() {
  return usePubMutation(
    "closePublicacion",
    publicationsApi.closePublicacion,
    (id: number) => [["publicaciones"], ["publicaciones", id]],
  );
}

// ── ProductoSemanal mutations ──────────────────────────────

type AddProductoPayload = {
  pubId: number;
  payload: {
    fk_producto: number;
    fk_unidad: number;
    stock: number;
    precio: number;
    foto?: string | null;
  };
};

type UpdateProductoPayload = {
  pubId: number;
  itemId: number;
  payload: {
    fk_producto?: number;
    fk_unidad?: number;
    stock?: number;
    precio?: number;
    foto?: string | null;
  };
};

type DeleteProductoPayload = { pubId: number; itemId: number };

type UploadImagenPayload = {
  pubId: number;
  itemId: number;
  formData: FormData;
};

const productoKeys = (pubId: number): InvalidateKeys[] => [
  ["publicaciones"],
  ["publicaciones", pubId, "productos"],
];

export function useAddProductoSemanal() {
  return usePubMutation(
    "addProductoSemanal",
    ({ pubId, payload }: AddProductoPayload) =>
      publicationsApi.addProductoSemanal(pubId, payload),
    (v) => productoKeys(v.pubId),
  );
}

export function useUpdateProductoSemanal() {
  return usePubMutation(
    "updateProductoSemanal",
    ({ pubId, itemId, payload }: UpdateProductoPayload) =>
      publicationsApi.updateProductoSemanal(pubId, itemId, payload),
    (v) => productoKeys(v.pubId),
  );
}

export function useDeleteProductoSemanal() {
  return usePubMutation(
    "deleteProductoSemanal",
    ({ pubId, itemId }: DeleteProductoPayload) =>
      publicationsApi.deleteProductoSemanal(pubId, itemId),
    (v) => productoKeys(v.pubId),
  );
}

export function useUploadProductoSemanalImagen() {
  return usePubMutation(
    "uploadProductoSemanalImagen",
    ({ pubId, itemId, formData }: UploadImagenPayload) =>
      publicationsApi.uploadProductoSemanalImagen(pubId, itemId, formData),
    (v) => productoKeys(v.pubId),
  );
}
