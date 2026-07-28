import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { extractApiError } from './apiError';

function makeAxiosError(data: unknown): unknown {
  const error = new Error('Request failed');
  Object.defineProperty(error, 'isAxiosError', { value: true });
  Object.defineProperty(error, 'response', {
    value: { data, status: 500, statusText: '', headers: {}, config: {} },
  });
  return error;
}

describe('extractApiError', () => {
  const fields = ['detail', 'message', 'errors'];

  it('returns fallback for non-Axios non-Error', () => {
    expect(extractApiError('some string', fields)).toBe('Error desconocido.');
  });

  it('returns message from Error instance', () => {
    expect(extractApiError(new Error('boom'), fields)).toBe('boom');
  });

  it('returns fallback for Axios error with no response', () => {
    const error = new Error('Request failed');
    Object.defineProperty(error, 'isAxiosError', { value: true });
    expect(extractApiError(error, fields)).toBe(
      'Error del servidor. Intenta de nuevo.',
    );
  });

  it('returns string data directly', () => {
    expect(extractApiError(makeAxiosError('Not found'), fields)).toBe(
      'Not found',
    );
  });

  it('returns data.detail when string', () => {
    expect(
      extractApiError(makeAxiosError({ detail: 'Unauthorized' }), fields),
    ).toBe('Unauthorized');
  });

  it('returns data.message when string', () => {
    expect(
      extractApiError(makeAxiosError({ message: 'Rate limited' }), fields),
    ).toBe('Rate limited');
  });

  it('returns first fieldKey array value', () => {
    expect(
      extractApiError(makeAxiosError({ errors: ['Name is required'] }), fields),
    ).toBe('Name is required');
  });

  it('returns fieldKey string value', () => {
    expect(
      extractApiError(makeAxiosError({ errors: 'Too many' }), fields),
    ).toBe('Too many');
  });

  it('returns fallback when no fieldKey matches', () => {
    expect(extractApiError(makeAxiosError({ other: 'nope' }), fields)).toBe(
      'Error del servidor. Intenta de nuevo.',
    );
  });

  it('prefers detail over message', () => {
    expect(
      extractApiError(
        makeAxiosError({ detail: 'First', message: 'Second' }),
        fields,
      ),
    ).toBe('First');
  });

  it('returns fallback for empty array field value', () => {
    expect(extractApiError(makeAxiosError({ errors: [] }), fields)).toBe(
      'Error del servidor. Intenta de nuevo.',
    );
  });

  // ── Security: error message handling ──────────────────────

  it('SECURITY: does not leak stack traces', () => {
    const error = new Error('Internal error');
    Object.defineProperty(error, 'stack', {
      value: 'Error: Internal error\n    at server.ts:42:10',
    });
    const result = extractApiError(error, fields);
    expect(result).not.toContain('at server.ts');
    expect(result).not.toContain('42:10');
  });

  it('SECURITY: handles deeply nested data objects', () => {
    const deepData = { a: { b: { c: { d: 'deep error' } } } };
    const error = makeAxiosError(deepData);
    expect(extractApiError(error, fields)).toBe(
      'Error del servidor. Intenta de nuevo.',
    );
  });

  it('SECURITY: handles circular references without crash', () => {
    const data: Record<string, unknown> = { detail: 'error' };
    data.self = data;
    const error = makeAxiosError(data);
    expect(extractApiError(error, fields)).toBe('error');
  });

  it('SECURITY: handles null data gracefully', () => {
    const error = new Error('Request failed');
    Object.defineProperty(error, 'isAxiosError', { value: true });
    Object.defineProperty(error, 'response', {
      value: { data: null, status: 500 },
    });
    expect(extractApiError(error, fields)).toBe(
      'Error del servidor. Intenta de nuevo.',
    );
  });

  it('SECURITY: handles undefined data gracefully', () => {
    const error = new Error('Request failed');
    Object.defineProperty(error, 'isAxiosError', { value: true });
    Object.defineProperty(error, 'response', {
      value: { data: undefined, status: 500 },
    });
    expect(extractApiError(error, fields)).toBe(
      'Error del servidor. Intenta de nuevo.',
    );
  });

  it('SECURITY: handles numeric field values', () => {
    const error = makeAxiosError({ detail: 12345 });
    expect(extractApiError(error, fields)).toBe(
      'Error del servidor. Intenta de nuevo.',
    );
  });

  it('SECURITY: handles boolean field values', () => {
    const error = makeAxiosError({ detail: true });
    expect(extractApiError(error, fields)).toBe(
      'Error del servidor. Intenta de nuevo.',
    );
  });

  it('SECURITY: handles array of non-strings', () => {
    const error = makeAxiosError({ errors: [123, true, null] });
    expect(extractApiError(error, fields)).toBe('123');
  });

  it('SECURITY: handles object in array', () => {
    const error = makeAxiosError({ errors: [{ msg: 'nested' }] });
    expect(extractApiError(error, fields)).toBe('[object Object]');
  });

  it('SECURITY: limits error message length', () => {
    const longMessage = 'x'.repeat(100000);
    const error = makeAxiosError({ detail: longMessage });
    const result = extractApiError(error, fields);
    expect(result.length).toBeLessThanOrEqual(1000);
  });

  it('returns second fieldKey match when first does not exist', () => {
    const error = makeAxiosError({ message: 'Rate limited' });
    const result = extractApiError(error, ['detail', 'message', 'errors']);
    expect(result).toBe('Rate limited');
  });

  it('skips non-string, non-array field values', () => {
    const error = makeAxiosError({ detail: 42, message: true, errors: null });
    const result = extractApiError(error, ['detail', 'message', 'errors']);
    expect(result).toBe('Error del servidor. Intenta de nuevo.');
  });

  it('returns array value from second fieldKey when first has no match', () => {
    const error = makeAxiosError({ warnings: ['Deprecated field'] });
    const result = extractApiError(error, ['errors', 'warnings']);
    expect(result).toBe('Deprecated field');
  });

  it('returns string from second fieldKey when first has empty array', () => {
    const error = makeAxiosError({ errors: [], message: 'Fallback msg' });
    const result = extractApiError(error, ['detail', 'errors', 'message']);
    expect(result).toBe('Fallback msg');
  });

  it('returns first element of array fieldKey', () => {
    const error = makeAxiosError({ errors: ['First error', 'Second error'] });
    const result = extractApiError(error, ['detail', 'message', 'errors']);
    expect(result).toBe('First error');
  });

  it('prefers detail over message over errors', () => {
    const error = makeAxiosError({
      detail: 'A',
      message: 'B',
      errors: ['C'],
    });
    const result = extractApiError(error, ['detail', 'message', 'errors']);
    expect(result).toBe('A');
  });

  it('skips detail/message check when they are non-string primitives', () => {
    const error = makeAxiosError({
      detail: 123,
      message: true,
      errors: ['Actual error'],
    });
    const result = extractApiError(error, ['detail', 'message', 'errors']);
    expect(result).toBe('Actual error');
  });
});
