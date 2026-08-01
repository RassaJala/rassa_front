/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import api from '@/services/api';
import { fetchAllPages } from '@/services/pagination';

jest.mock('@sentry/react-native', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
  isApiUrl: (url: string) => url.startsWith('/'),
}));

const getMock = api.get as jest.Mock;

interface Item {
  readonly id: number;
}

function page(results: Item[], next: string | null): { data: object } {
  return { data: { results, next } };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('fetchAllPages', () => {
  it('recorre todas las páginas vía next y acumula', async () => {
    getMock
      .mockResolvedValueOnce(page([{ id: 1 }], '/recolecciones/?page=2'))
      .mockResolvedValueOnce(page([{ id: 2 }], '/recolecciones/?page=3'))
      .mockResolvedValueOnce(page([{ id: 3 }], null));

    const result = await fetchAllPages<Item>('/recolecciones/');

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(result.truncated).toBe(false);
    expect(result.errores).toBe(0);
    expect(getMock).toHaveBeenCalledTimes(3);
    expect(getMock).toHaveBeenNthCalledWith(1, '/recolecciones/');
    expect(getMock).toHaveBeenNthCalledWith(2, '/recolecciones/?page=2');
    expect(getMock).toHaveBeenNthCalledWith(3, '/recolecciones/?page=3');
  });

  it('acepta un arreglo plano (endpoint sin paginación)', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });

    const result = await fetchAllPages<Item>('/items/');

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('marca truncated al alcanzar maxPages', async () => {
    getMock
      .mockResolvedValueOnce(page([{ id: 1 }], '/x/?page=2'))
      .mockResolvedValueOnce(page([{ id: 2 }], '/x/?page=3'))
      .mockResolvedValueOnce(page([{ id: 3 }], '/x/?page=4'));

    const result = await fetchAllPages<Item>('/x/', { maxPages: 2 });

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.truncated).toBe(true);
  });

  it('tolera un fallo intermedio y reporta errores parciales', async () => {
    getMock
      .mockResolvedValueOnce(page([{ id: 1 }], '/x/?page=2'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(page([{ id: 3 }], null));

    const result = await fetchAllPages<Item>('/x/', { maxPages: 10 });

    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.errores).toBe(1);
    expect(result.truncated).toBe(false);
  });

  it('re-lanza el error si la primera página falla', async () => {
    getMock.mockRejectedValueOnce(new Error('Down'));

    await expect(fetchAllPages<Item>('/x/')).rejects.toThrow('Down');
  });

  it('no explota con payload null o vacío', async () => {
    getMock.mockResolvedValueOnce({ data: null });
    getMock.mockResolvedValueOnce({ data: {} });

    const first = await fetchAllPages<Item>('/x/');
    expect(first.data).toEqual([]);

    const second = await fetchAllPages<Item>('/y/');
    expect(second.data).toEqual([]);
  });

  it('deduplica por keyOf cuando hay filas repetidas entre páginas', async () => {
    getMock
      .mockResolvedValueOnce(page([{ id: 1 }], '/x/?page=2'))
      .mockResolvedValueOnce(page([{ id: 1 }, { id: 2 }], null));

    const result = await fetchAllPages<Item>('/x/', { keyOf: (i) => i.id });

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('ignora un next fuera del origen de la API', async () => {
    getMock.mockResolvedValueOnce(
      page([{ id: 1 }], 'https://evil.example/x?page=2'),
    );
    getMock.mockResolvedValueOnce(page([{ id: 2 }], null));

    const result = await fetchAllPages<Item>('/x/');

    expect(result.data).toEqual([{ id: 1 }]);
    expect(getMock).toHaveBeenCalledTimes(1);
  });
});
