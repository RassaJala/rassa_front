import { API_TIMEOUT } from '@/constants/api';
import type { ApiResponse } from '@/types';
import { assertValidId } from '@/utils/ids';

import api from './api';

export type { ApiResponse } from '@/types';

// ── Backend response types (match Django serializers) ──────

export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion: string;
}

export interface Unidad {
  id_unidad: number;
  tipo: string;
}

export interface ProductoImagen {
  id_imagen: number;
  url: string;
  es_principal: boolean;
}

export interface Producto {
  id_producto: number;
  nombre_producto: string;
  descripcion: string;
  precio: string;
  stock: number;
  es_perecedero: boolean;
  imagen: string | null;
  estado: boolean;
  categoria: Categoria;
  unidad: Unidad | null;
  imagenes?: ProductoImagen[];
  imagen_principal: string | null;
  creado_en: string;
}

export interface ProductoDetail extends Producto {
  fk_categoria: number;
  fk_unidad: number | null;
  imagenes: ProductoImagen[];
}

export interface CreateProductoPayload {
  nombre_producto: string;
  descripcion: string;
  precio: number;
  stock: number;
  fk_categoria: number;
  fk_unidad: number;
  es_perecedero: boolean;
}

// ── API functions ──────────────────────────────────────────

export async function getProductos(params?: {
  categoria?: number | undefined;
  nombre?: string | undefined;
  es_perecedero?: boolean | undefined;
  precio_min?: number | undefined;
  precio_max?: number | undefined;
  unidad?: number | undefined;
  ordering?: string | undefined;
  page?: number | undefined;
}): Promise<ApiResponse<Producto[]>> {
  const { data } = await api.get<ApiResponse<Producto[]>>('/productos/', {
    params,
  });
  return data;
}

export async function getProducto(
  id: number,
): Promise<ApiResponse<ProductoDetail>> {
  const { data } = await api.get<ApiResponse<ProductoDetail>>(
    `/productos/${String(id)}/`,
  );
  return data;
}

export async function createProducto(
  payload: CreateProductoPayload,
): Promise<ApiResponse<ProductoDetail>> {
  const { data } = await api.post<ApiResponse<ProductoDetail>>(
    '/productos/',
    payload,
  );
  return data;
}

export async function updateProducto(
  id: number,
  payload: CreateProductoPayload,
): Promise<ApiResponse<ProductoDetail>> {
  assertValidId(id, 'productoId');
  const { data } = await api.put<ApiResponse<ProductoDetail>>(
    `/productos/${String(id)}/`,
    payload,
  );
  return data;
}

export async function deleteProducto(id: number): Promise<ApiResponse<null>> {
  assertValidId(id, 'productoId');
  const { data } = await api.delete<ApiResponse<null>>(
    `/productos/${String(id)}/`,
  );
  return data;
}

export async function uploadProductoImagen(
  id: number,
  formData: FormData,
): Promise<ApiResponse<ProductoImagen>> {
  assertValidId(id, 'productoId');
  const { data } = await api.post<ApiResponse<ProductoImagen>>(
    `/productos/${String(id)}/imagen/`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: API_TIMEOUT,
    },
  );
  return data;
}

export async function getCategorias(): Promise<ApiResponse<Categoria[]>> {
  const { data } = await api.get<ApiResponse<Categoria[]>>('/categorias/');
  return data;
}

export async function getUnidades(): Promise<ApiResponse<Unidad[]>> {
  const { data } = await api.get<ApiResponse<Unidad[]>>('/unidades/');
  return data;
}
