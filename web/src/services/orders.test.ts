import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}));

import api from './api';
import {
  createOrder,
  extractOrderError,
  isAmbiguousOrderError,
} from './orders';

const mockedApi = vi.mocked(api);

const CONFIG: AxiosRequestConfig = { url: '/pedidos/', method: 'post' };

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

const PEDIDO = {
  id_pedido: 45,
  cliente_nombre: 'Cliente Demo',
  estado: 'pendiente',
  subtotal: '25.00',
  iva: '5.25',
  total: '30.25',
  detalles: [],
  creado_en: '2026-07-31T13:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createOrder', () => {
  it('POSTs the exact payload to /pedidos/ and unwraps data.data', async () => {
    mockedApi.post.mockResolvedValue({ data: { data: PEDIDO } });
    const payload = { items: [{ id_producto_semanal: 1, cantidad: 2 }] };

    const result = await createOrder(payload);

    expect(mockedApi.post).toHaveBeenCalledWith('/pedidos/', payload, {
      'axios-retry': { retries: 0 },
    });
    expect(result).toEqual(PEDIDO);
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
      'Error del servidor. Intenta de nuevo.',
    );
  });

  it('R10: falls back to the default when the array item is unsafe (traceback)', () => {
    const err = axiosErrorWithResponse(500, [
      'Traceback (most recent call last):\n  File "/app/views.py", line 42',
    ]);

    expect(extractOrderError(err)).toBe(
      'Error del servidor. Intenta de nuevo.',
    );
  });

  it('delegates to extractApiError for an object body with detail', () => {
    const err = axiosErrorWithResponse(400, { detail: 'Stock insuficiente' });

    expect(extractOrderError(err)).toBe('Stock insuficiente');
  });

  it('returns the message field when detail is absent', () => {
    const err = axiosErrorWithResponse(422, { message: 'Cantidad inválida' });

    expect(extractOrderError(err)).toBe('Cantidad inválida');
  });

  it('R8/R10: sanitizes a 5xx HTML/traceback string body', () => {
    const err = axiosErrorWithResponse(
      500,
      '<html><body><pre>Traceback (most recent call last)</pre></body></html>',
    );

    expect(extractOrderError(err)).toBe(
      'Error interno del servidor. Revisa los logs del backend.',
    );
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
});
