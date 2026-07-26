import api from './api';

// ── Types ──────────────────────────────────────────────────

export const PUBLICACION_ESTADOS = {
  BORRADOR: 'borrador',
  PUBLICADO: 'publicado',
  CERRADO: 'cerrado',
  CANCELADO: 'cancelado',
} as const;

export type PublicacionEstado =
  (typeof PUBLICACION_ESTADOS)[keyof typeof PUBLICACION_ESTADOS];

export interface ProductoSemanal {
  id_producto_semanal: number;
  fk_producto: number;
  fk_unidad: number;
  stock: number;
  precio: string;
  foto: string | null;
  estado: string;
  creado_en: string;
}

export interface Publicacion {
  id_publicacion: number;
  fk_agricultor: number;
  fecha_publicacion: string;
  semana: number;
  estado: PublicacionEstado;
  productos: ProductoSemanal[];
  creado_en: string;
}

export interface PublicacionList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Publicacion[];
}

export interface ApiResponse<T> {
  data: T;
}

// ── Publicacion endpoints ───────────────────────────────────

export async function getPublicaciones(params?: {
  estado?: PublicacionEstado;
}): Promise<ApiResponse<PublicacionList>> {
  const { data } = await api.get<ApiResponse<PublicacionList>>(
    '/publicaciones/',
    { params },
  );
  return data;
}

export async function getPublicacion(
  id: number,
): Promise<ApiResponse<Publicacion>> {
  const { data } = await api.get<ApiResponse<Publicacion>>(
    `/publicaciones/${String(id)}/`,
  );
  return data;
}

export async function createPublicacion(): Promise<
  ApiResponse<Publicacion>
> {
  const { data } = await api.post<ApiResponse<Publicacion>>(
    '/publicaciones/',
  );
  return data;
}

export async function deletePublicacion(
  id: number,
): Promise<ApiResponse<null>> {
  const { data } = await api.delete<ApiResponse<null>>(
    `/publicaciones/${String(id)}/`,
  );
  return data;
}

export async function publishPublicacion(
  id: number,
): Promise<ApiResponse<Publicacion>> {
  const { data } = await api.post<ApiResponse<Publicacion>>(
    `/publicaciones/${String(id)}/publish/`,
  );
  return data;
}

export async function closePublicacion(
  id: number,
): Promise<ApiResponse<Publicacion>> {
  const { data } = await api.post<ApiResponse<Publicacion>>(
    `/publicaciones/${String(id)}/close/`,
  );
  return data;
}

// ── ProductoSemanal endpoints ───────────────────────────────

export async function getProductosSemanales(
  pubId: number,
): Promise<ApiResponse<ProductoSemanal[]>> {
  const { data } = await api.get<ApiResponse<ProductoSemanal[]>>(
    `/publicaciones/${String(pubId)}/productos/`,
  );
  return data;
}

export async function addProductoSemanal(
  pubId: number,
  payload: {
    fk_producto: number;
    fk_unidad: number;
    stock: number;
    precio: number;
    foto?: string | null;
  },
): Promise<ApiResponse<ProductoSemanal>> {
  const { data } = await api.post<ApiResponse<ProductoSemanal>>(
    `/publicaciones/${String(pubId)}/productos/`,
    payload,
  );
  return data;
}

export async function updateProductoSemanal(
  pubId: number,
  itemId: number,
  payload: {
    fk_producto?: number;
    fk_unidad?: number;
    stock?: number;
    precio?: number;
    foto?: string | null;
  },
): Promise<ApiResponse<ProductoSemanal>> {
  const { data } = await api.patch<ApiResponse<ProductoSemanal>>(
    `/publicaciones/${String(pubId)}/productos/${String(itemId)}/`,
    payload,
  );
  return data;
}

export async function deleteProductoSemanal(
  pubId: number,
  itemId: number,
): Promise<ApiResponse<null>> {
  const { data } = await api.delete<ApiResponse<null>>(
    `/publicaciones/${String(pubId)}/productos/${String(itemId)}/`,
  );
  return data;
}

export async function uploadProductoSemanalImagen(
  pubId: number,
  itemId: number,
  formData: FormData,
): Promise<ApiResponse<ProductoSemanal>> {
  const { data } = await api.post<ApiResponse<ProductoSemanal>>(
    `/publicaciones/${String(pubId)}/productos/${String(itemId)}/imagen/`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    },
  );
  return data;
}

// ── Product catalog (for the picker) ───────────────────────

export interface Producto {
  id_producto: number;
  nombre_producto: string;
  precio: string;
  stock: number;
  imagen: string | null;
  imagen_principal: string | null;
}

export async function getCatalogProductos(): Promise<
  ApiResponse<{ results: Producto[] }>
> {
  const { data } = await api.get<ApiResponse<{ results: Producto[] }>>(
    '/productos/',
  );
  return data;
}

export async function getUnidades(): Promise<
  ApiResponse<{ id_unidad: number; tipo: string }[]>
> {
  const { data } = await api.get<
    ApiResponse<{ id_unidad: number; tipo: string }[]>
  >('/unidades/');
  return data;
}
