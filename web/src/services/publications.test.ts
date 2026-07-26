import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from './api';
import {
  PUBLICACION_ESTADOS,
  addProductoSemanal,
  closePublicacion,
  createPublicacion,
  deleteProductoSemanal,
  deletePublicacion,
  getCatalogProductos,
  getPublicacion,
  getPublicaciones,
  getProductosSemanales,
  getUnidades,
  publishPublicacion,
  updateProductoSemanal,
  uploadProductoSemanalImagen,
} from './publications';

const mockedApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PUBLICACION_ESTADOS', () => {
  it('has correct values', () => {
    expect(PUBLICACION_ESTADOS.BORRADOR).toBe('borrador');
    expect(PUBLICACION_ESTADOS.PUBLICADO).toBe('publicado');
    expect(PUBLICACION_ESTADOS.CERRADO).toBe('cerrado');
    expect(PUBLICACION_ESTADOS.CANCELADO).toBe('cancelado');
  });
});

describe('getPublicaciones', () => {
  it('calls GET /publicaciones/', async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { count: 0, results: [] } } });
    const result = await getPublicaciones();
    expect(mockedApi.get).toHaveBeenCalledWith('/publicaciones/', { params: undefined });
    expect(result).toEqual({ data: { count: 0, results: [] } });
  });

  it('passes estado filter', async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { count: 0, results: [] } } });
    await getPublicaciones({ estado: 'borrador' });
    expect(mockedApi.get).toHaveBeenCalledWith('/publicaciones/', {
      params: { estado: 'borrador' },
    });
  });
});

describe('getPublicacion', () => {
  it('calls GET /publicaciones/:id/', async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { id_publicacion: 1 } } });
    const result = await getPublicacion(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/publicaciones/1/');
    expect(result).toEqual({ data: { id_publicacion: 1 } });
  });
});

describe('createPublicacion', () => {
  it('calls POST /publicaciones/', async () => {
    mockedApi.post.mockResolvedValue({ data: { data: { id_publicacion: 1 } } });
    const result = await createPublicacion();
    expect(mockedApi.post).toHaveBeenCalledWith('/publicaciones/');
    expect(result).toEqual({ data: { id_publicacion: 1 } });
  });
});

describe('deletePublicacion', () => {
  it('calls DELETE /publicaciones/:id/', async () => {
    mockedApi.delete.mockResolvedValue({ data: { data: null } });
    const result = await deletePublicacion(42);
    expect(mockedApi.delete).toHaveBeenCalledWith('/publicaciones/42/');
    expect(result).toEqual({ data: null });
  });
});

describe('publishPublicacion', () => {
  it('calls POST /publicaciones/:id/publish/', async () => {
    mockedApi.post.mockResolvedValue({ data: { data: { id_publicacion: 1 } } });
    const result = await publishPublicacion(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/publicaciones/1/publish/');
    expect(result).toEqual({ data: { id_publicacion: 1 } });
  });
});

describe('closePublicacion', () => {
  it('calls POST /publicaciones/:id/close/', async () => {
    mockedApi.post.mockResolvedValue({ data: { data: { id_publicacion: 1 } } });
    const result = await closePublicacion(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/publicaciones/1/close/');
    expect(result).toEqual({ data: { id_publicacion: 1 } });
  });
});

describe('addProductoSemanal', () => {
  it('calls POST /publicaciones/:pubId/productos/', async () => {
    const payload = { fk_producto: 1, fk_unidad: 1, stock: 10, precio: 500 };
    mockedApi.post.mockResolvedValue({ data: { data: { id_producto_semanal: 1 } } });
    const result = await addProductoSemanal(5, payload);
    expect(mockedApi.post).toHaveBeenCalledWith('/publicaciones/5/productos/', payload);
    expect(result).toEqual({ data: { id_producto_semanal: 1 } });
  });
});

describe('updateProductoSemanal', () => {
  it('calls PATCH with correct path', async () => {
    mockedApi.patch.mockResolvedValue({ data: { data: { id_producto_semanal: 1 } } });
    const result = await updateProductoSemanal(5, 10, { stock: 20 });
    expect(mockedApi.patch).toHaveBeenCalledWith('/publicaciones/5/productos/10/', { stock: 20 });
    expect(result).toEqual({ data: { id_producto_semanal: 1 } });
  });
});

describe('deleteProductoSemanal', () => {
  it('calls DELETE with correct path', async () => {
    mockedApi.delete.mockResolvedValue({ data: { data: null } });
    const result = await deleteProductoSemanal(5, 10);
    expect(mockedApi.delete).toHaveBeenCalledWith('/publicaciones/5/productos/10/');
    expect(result).toEqual({ data: null });
  });
});

describe('uploadProductoSemanalImagen', () => {
  it('calls POST with multipart and 60s timeout', async () => {
    const formData = new FormData();
    mockedApi.post.mockResolvedValue({ data: { data: { id_producto_semanal: 1 } } });
    const result = await uploadProductoSemanalImagen(5, 10, formData);
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/publicaciones/5/productos/10/imagen/',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 },
    );
    expect(result).toEqual({ data: { id_producto_semanal: 1 } });
  });
});

describe('getCatalogProductos', () => {
  it('calls GET /productos/', async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { results: [] } } });
    await getCatalogProductos();
    expect(mockedApi.get).toHaveBeenCalledWith('/productos/');
  });
});

describe('getUnidades', () => {
  it('calls GET /unidades/', async () => {
    mockedApi.get.mockResolvedValue({ data: { data: [] } });
    await getUnidades();
    expect(mockedApi.get).toHaveBeenCalledWith('/unidades/');
  });
});
