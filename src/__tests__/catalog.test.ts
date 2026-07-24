/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return -- Test files are less strict */
import { getCategorias, getCurrentPublications } from '../services/catalog';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import api from '../services/api';

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCurrentPublications', () => {
  it('returns publications from API', async () => {
    const pubs = [
      {
        id_publicacion: 1,
        agricultor: { id_usuario: 1, nombre: 'Juan', apellido: 'Pérez' },
        fecha_publicacion: '2026-07-20',
        semana: 30,
        productos: [
          {
            id_producto_semanal: 10,
            producto: 'Tomate',
            unidad: 'kg',
            stock: 50,
            precio: '25.50',
            foto: null,
          },
        ],
      },
    ];
    mockApi.get.mockResolvedValue({ data: { data: pubs } });

    const result = await getCurrentPublications();
    expect(result).toEqual(pubs);
    expect(mockApi.get).toHaveBeenCalledWith('/publicaciones/current/');
  });
});

describe('getCategorias', () => {
  it('returns categories from API (data wrapper)', async () => {
    const cats = [
      {
        id_categoria: 1,
        nombre: 'Verduras',
        descripcion: 'Verduras frescas',
        estado: true,
      },
    ];
    mockApi.get.mockResolvedValue({ data: { data: cats } });

    const result = await getCategorias();
    expect(result).toEqual(cats);
  });

  it('returns categories from API (results wrapper)', async () => {
    const cats = [
      {
        id_categoria: 2,
        nombre: 'Frutas',
        descripcion: 'Frutas frescas',
        estado: true,
      },
    ];
    mockApi.get.mockResolvedValue({ data: { data: { results: cats } } });

    const result = await getCategorias();
    expect(result).toEqual(cats);
  });

  it('returns empty array on unexpected shape', async () => {
    mockApi.get.mockResolvedValue({ data: { data: null } });

    const result = await getCategorias();
    expect(result).toEqual([]);
  });
});
