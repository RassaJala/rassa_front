import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import type { Order } from '@root/types';

import { fetchWasteOrders } from './waste';
import api from './api';

const mockedApi = vi.mocked(api);

// Mirrors the mobile orders fixture shape: only the fields the resumen path
// reads (the terminal-state filter).
const order = (id: number, estado_actual: string): Order =>
  ({ id, estado_actual }) as Order;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchWasteOrders', () => {
  it('walks raw DRF pages ({ results, next }) and filters terminal states', async () => {
    mockedApi.get.mockImplementation(async (url: string) => ({
      data:
        url === '/pedidos/'
          ? {
              results: [
                order(1, 'preparacion'),
                order(2, 'entregado'),
                order(3, 'cancelado'),
              ],
              next: 'http://localhost:3000/api/pedidos/?page=2',
            }
          : {
              results: [order(4, 'preparacion'), order(5, 'en_viaje')],
              next: null,
            },
    }));

    const result = await fetchWasteOrders();

    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(result.map((o) => o.id)).toEqual([1, 4, 5]);
  });

  it('tolerates the { ok, data } envelope shape', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        ok: true,
        data: { results: [order(1, 'preparacion')], next: null },
      },
    });

    const result = await fetchWasteOrders();

    expect(result.map((o) => o.id)).toEqual([1]);
  });

  it('tolerates a raw array body', async () => {
    mockedApi.get.mockResolvedValue({
      data: [order(1, 'preparacion'), order(2, 'entregado')],
    });

    const result = await fetchWasteOrders();

    expect(result.map((o) => o.id)).toEqual([1]);
  });

  it('tolerates a bare { data } envelope', async () => {
    mockedApi.get.mockResolvedValue({
      data: { data: [order(1, 'preparacion')] },
    });

    const result = await fetchWasteOrders();

    expect(result.map((o) => o.id)).toEqual([1]);
  });

  it('degrades to an empty list on a non-object body instead of crashing', async () => {
    mockedApi.get.mockResolvedValue({ data: 'not-json' });

    const result = await fetchWasteOrders();

    expect(result).toEqual([]);
  });
});
