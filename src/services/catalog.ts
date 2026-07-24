import api from './api';

// ── Types ────────────────────────────────────────────────

export interface CatalogProduct {
  id_producto_semanal: number;
  producto: string;
  unidad: string;
  stock: number;
  precio: string;
  foto: string | null;
}

export interface CatalogPublication {
  id_publicacion: number;
  agricultor: {
    id_usuario: number;
    nombre: string;
    apellido: string;
  };
  fecha_publicacion: string;
  semana: number;
  productos: CatalogProduct[];
}

export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
}

// ── API calls ────────────────────────────────────────────

export async function getCurrentPublications(): Promise<CatalogPublication[]> {
  const { data } = await api.get<{ data: CatalogPublication[] }>(
    '/publicaciones/current/',
  );
  return data.data;
}

export async function getCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<{ data: Categoria[] }>('/categorias/');
  // Handle both { data: T[] } and { results: T[] } shapes
  if (Array.isArray(data.data)) return data.data;
  if ('results' in data.data)
    return (data.data as unknown as { results: Categoria[] }).results;
  return [];
}
