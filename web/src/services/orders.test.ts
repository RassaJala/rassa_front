import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { INTERNAL_SERVER_HTML_MESSAGE } from '~/utils/apiErrors';

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}));

import { PEDIDO_45 } from '../mocks/fixtures';
import api from './api';
import {
  clampOrderItems,
  createOrder,
  extractOrderError,
  isAmbiguousOrderError,
  MALFORMED_RESPONSE_MSG,
  MalformedOrderResponseError,
  ORDER_ERROR_DEFAULT,
} from './orders';

const mockedApi = vi.mocked(api);

const CONFIG: InternalAxiosRequestConfig = {
  url: '/pedidos/',
  method: 'post',
  headers: new axios.AxiosHeaders(),
};

function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    CONFIG,
    undefined,
    {
      data,
      status,
      statusText: 'Bad Request',
      headers: {},
      config: CONFIG,
    },
  );
}

function axiosErrorWithoutResponse(
  code: string,
  message = 'Network Error',
): AxiosError {
  return new AxiosError(message, code, CONFIG);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createOrder', () => {
  it('POSTs the exact payload to /pedidos/ and unwraps data.data', async () => {
    mockedApi.post.mockResolvedValue({ data: { data: PEDIDO_45 } });
    const payload = { items: [{ id_producto_semanal: 1, cantidad: 2 }] };

    const result = await createOrder(payload);

    expect(mockedApi.post).toHaveBeenCalledWith('/pedidos/', payload, {
      'axios-retry': { retries: 0 },
    });
    expect(result).toEqual(PEDIDO_45);
  });

  it('W-4: sends the Idempotency-Key header when an idempotency key is provided', async () => {
    mockedApi.post.mockResolvedValue({ data: { data: PEDIDO_45 } });
    const payload = { items: [{ id_producto_semanal: 1, cantidad: 2 }] };

    await createOrder(payload, 'checkout-abc123');

    expect(mockedApi.post).toHaveBeenCalledWith('/pedidos/', payload, {
      'axios-retry': { retries: 0 },
      headers: { 'Idempotency-Key': 'checkout-abc123' },
    });
  });

  it('W-4: omits the Idempotency-Key header when no key is provided', async () => {
    mockedApi.post.mockResolvedValue({ data: { data: PEDIDO_45 } });
    const payload = { items: [{ id_producto_semanal: 1, cantidad: 2 }] };

    await createOrder(payload);

    expect(mockedApi.post).toHaveBeenCalledWith('/pedidos/', payload, {
      'axios-retry': { retries: 0 },
    });
  });
});

describe('createOrder — response shape validation (W-3)', () => {
  it('W-3: rejects a 2xx body without the { data: Pedido } envelope', async () => {
    mockedApi.post.mockResolvedValue({ data: {} });

    await expect(createOrder({ items: [] })).rejects.toBeInstanceOf(
      MalformedOrderResponseError,
    );
  });

  it('W-3: rejects a raw Pedido at the top level (unwrapped)', async () => {
    mockedApi.post.mockResolvedValue({ data: PEDIDO_45 });

    await expect(createOrder({ items: [] })).rejects.toBeInstanceOf(
      MalformedOrderResponseError,
    );
  });

  it('W-3: rejects an array body', async () => {
    mockedApi.post.mockResolvedValue({ data: [PEDIDO_45] });

    await expect(createOrder({ items: [] })).rejects.toBeInstanceOf(
      MalformedOrderResponseError,
    );
  });

  it('W-3: rejects a non-numeric id_pedido', async () => {
    mockedApi.post.mockResolvedValue({
      data: { data: { ...PEDIDO_45, id_pedido: '45' } },
    });

    await expect(createOrder({ items: [] })).rejects.toBeInstanceOf(
      MalformedOrderResponseError,
    );
  });

  it('W-3: the classified error is user-safe and NOT ambiguous', async () => {
    mockedApi.post.mockResolvedValue({ data: {} });

    const err: unknown = await createOrder({ items: [] }).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe(MALFORMED_RESPONSE_MSG);
    expect(isAmbiguousOrderError(err)).toBe(false);
  });
});

describe('extractOrderError', () => {
  it('JD-001: returns first item of a top-level string-array body', () => {
    const err = axiosErrorWithResponse(400, [
      "Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5.",
    ]);

    expect(extractOrderError(err)).toBe(
      "Stock insuficiente para 'Tomate'. Disponible: 2, solicitado: 5.",
    );
  });

  it('falls back to the default message when the array body is empty', () => {
    expect(extractOrderError(axiosErrorWithResponse(400, []))).toBe(
      ORDER_ERROR_DEFAULT,
    );
  });

  it('R10: falls back to the default when the array item is unsafe (traceback)', () => {
    const err = axiosErrorWithResponse(500, [
      'Traceback (most recent call last):\n  File "/app/views.py", line 42',
    ]);

    expect(extractOrderError(err)).toBe(ORDER_ERROR_DEFAULT);
  });

  it('delegates to extractApiError for an object body with detail', () => {
    const err = axiosErrorWithResponse(400, { detail: 'Stock insuficiente' });

    expect(extractOrderError(err)).toBe('Stock insuficiente');
  });

  it('returns the message field when detail is absent', () => {
    const err = axiosErrorWithResponse(422, { message: 'Cantidad inválida' });

    expect(extractOrderError(err)).toBe('Cantidad inválida');
  });

  it('W-1: sanitizes an unsafe message field (5xx HTML/traceback body)', () => {
    const err = axiosErrorWithResponse(500, {
      message:
        '<html><body><pre>Traceback (most recent call last)</pre></body></html>',
    });

    expect(extractOrderError(err)).toBe(ORDER_ERROR_DEFAULT);
  });

  it('W-1: sanitizes a Django traceback in the message field', () => {
    const err = axiosErrorWithResponse(500, {
      message:
        'Traceback (most recent call last):\n  File "/app/views.py", line 42, in post',
    });

    expect(extractOrderError(err)).toBe(ORDER_ERROR_DEFAULT);
  });

  it('R8/R10: sanitizes a 5xx HTML/traceback string body', () => {
    const err = axiosErrorWithResponse(
      500,
      '<html><body><pre>Traceback (most recent call last)</pre></body></html>',
    );

    expect(extractOrderError(err)).toBe(INTERNAL_SERVER_HTML_MESSAGE);
  });

  it('JD-001-B: a bare Error surfaces its own message (Sesión expirada)', () => {
    expect(extractOrderError(new Error('Sesión expirada'))).toBe(
      'Sesión expirada',
    );
  });

  it('unwraps error.cause before inspecting the response', () => {
    const inner = axiosErrorWithResponse(400, ['Stock insuficiente']);
    const wrapped = Object.assign(new Error('wrapped'), { cause: inner });

    expect(extractOrderError(wrapped)).toBe('Stock insuficiente');
  });
});

describe('isAmbiguousOrderError', () => {
  it('R7: network error (axios without response) is ambiguous', () => {
    expect(
      isAmbiguousOrderError(axiosErrorWithoutResponse('ERR_NETWORK')),
    ).toBe(true);
  });

  it('JD-002-A: timeout error (ECONNABORTED, no response) is ambiguous', () => {
    expect(
      isAmbiguousOrderError(
        axiosErrorWithoutResponse(
          'ECONNABORTED',
          'timeout of 15000ms exceeded',
        ),
      ),
    ).toBe(true);
  });

  it('an axios error WITH a response is not ambiguous', () => {
    expect(
      isAmbiguousOrderError(axiosErrorWithResponse(400, { detail: 'x' })),
    ).toBe(false);
  });

  it('JD-001-B: a bare Error is not ambiguous', () => {
    expect(isAmbiguousOrderError(new Error('Sesión expirada'))).toBe(false);
  });

  it('unwraps error.cause before checking', () => {
    const inner = axiosErrorWithoutResponse('ERR_NETWORK');
    const wrapped = Object.assign(new Error('wrapped'), { cause: inner });

    expect(isAmbiguousOrderError(wrapped)).toBe(true);
  });

  it('is backed by axios.isAxiosError', () => {
    // Non-axios error shaped exactly like a network failure must NOT be ambiguous.
    const fake = Object.assign(new Error('Network Error'), {
      response: undefined,
    });

    expect(isAmbiguousOrderError(fake)).toBe(false);
    expect(axios.isAxiosError(fake)).toBe(false);
  });

  it('S-12: ERR_CANCELED is NOT ambiguous (request never left the client)', () => {
    expect(
      isAmbiguousOrderError(axiosErrorWithoutResponse('ERR_CANCELED')),
    ).toBe(false);
  });

  it('S-12: a real axios CanceledError is NOT ambiguous', () => {
    const canceled = new axios.CanceledError('canceled', CONFIG, undefined);

    expect(isAmbiguousOrderError(canceled)).toBe(false);
  });
});

describe('clampOrderItems (W-2)', () => {
  const line = (id: number, cantidad: number, stock: number) => ({
    id_producto_semanal: id,
    cantidad,
    stock,
  });

  it('keeps integer quantities within [1, stock]', () => {
    const result = clampOrderItems([line(1, 1, 10), line(2, 10, 10)]);

    expect(result.items).toEqual([
      { id_producto_semanal: 1, cantidad: 1 },
      { id_producto_semanal: 2, cantidad: 10 },
    ]);
    expect(result.skipped).toEqual([]);
  });

  it('skips zero and negative quantities', () => {
    const result = clampOrderItems([
      line(1, 0, 10),
      line(2, -3, 10),
      line(3, 2, 10),
    ]);

    expect(result.items).toEqual([{ id_producto_semanal: 3, cantidad: 2 }]);
    expect(result.skipped).toEqual([1, 2]);
  });

  it('skips quantities above stock', () => {
    const result = clampOrderItems([line(1, 11, 10), line(2, 5, 5)]);

    expect(result.items).toEqual([{ id_producto_semanal: 2, cantidad: 5 }]);
    expect(result.skipped).toEqual([1]);
  });

  it('skips non-integer and NaN quantities', () => {
    const result = clampOrderItems([line(1, 2.5, 10), line(2, Number.NaN, 10)]);

    expect(result.items).toEqual([]);
    expect(result.skipped).toEqual([1, 2]);
  });

  it('returns an empty result for an empty candidate list', () => {
    const result = clampOrderItems([]);

    expect(result.items).toEqual([]);
    expect(result.skipped).toEqual([]);
  });
});
