import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ApiResponse,
  Categoria,
  CreateProductoPayload,
  Producto,
  ProductoDetail,
  Unidad,
} from '@/services/productos';
import * as productosApi from '@/services/productos';

export { productosApi };

const STALE_TIME = 30_000;

export function useProductos(params?: {
  categoria?: number | undefined;
  nombre?: string | undefined;
  es_perecedero?: boolean | undefined;
  precio_min?: number | undefined;
  precio_max?: number | undefined;
  unidad?: number | undefined;
  ordering?: string | undefined;
}): UseQueryResult<ApiResponse<Producto[]>> {
  return useQuery({
    queryKey: ['productos', params],
    queryFn: () => productosApi.getProductos(params),
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useProducto(
  id: number,
): UseQueryResult<ApiResponse<ProductoDetail>> {
  return useQuery({
    queryKey: ['productos', id],
    queryFn: () => productosApi.getProducto(id),
    enabled: id > 0,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useCategorias(): UseQueryResult<ApiResponse<Categoria[]>> {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: productosApi.getCategorias,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useUnidades(): UseQueryResult<ApiResponse<Unidad[]>> {
  return useQuery({
    queryKey: ['unidades'],
    queryFn: productosApi.getUnidades,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useCreateProducto(): UseMutationResult<
  ApiResponse<ProductoDetail>,
  Error,
  CreateProductoPayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductoPayload) =>
      productosApi.createProducto(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
  });
}

export function useUpdateProducto(): UseMutationResult<
  ApiResponse<ProductoDetail>,
  Error,
  { id: number; payload: CreateProductoPayload }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: CreateProductoPayload;
    }) => productosApi.updateProducto(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['productos'] });
      void queryClient.invalidateQueries({
        queryKey: ['productos', variables.id],
      });
    },
  });
}

export function useDeleteProducto(): UseMutationResult<
  ApiResponse<null>,
  Error,
  number
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productosApi.deleteProducto,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
  });
}
