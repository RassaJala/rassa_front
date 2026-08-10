import { describe, expect, it } from 'vitest';

import { safeNextUrl } from './safeUrl';

describe('safeNextUrl', () => {
  it('accepts same-origin relative paths', () => {
    expect(safeNextUrl('/recolecciones/?page=2')).toBe(
      '/recolecciones/?page=2',
    );
    expect(safeNextUrl('/')).toBe('/');
  });

  it('rejects null and undefined', () => {
    expect(safeNextUrl(null)).toBeNull();
    expect(safeNextUrl(undefined)).toBeNull();
  });

  it('rejects empty and non-slash-prefixed values', () => {
    expect(safeNextUrl('')).toBeNull();
    expect(safeNextUrl('recolecciones/?page=2')).toBeNull();
    expect(safeNextUrl('?page=2')).toBeNull();
  });

  it('accepts same-origin absolute URLs (DRF emits absolute next links)', () => {
    // jsdom default origin is http://localhost:3000; a same-origin absolute
    // URL is safe to follow because the request stays on the API origin.
    expect(safeNextUrl('http://localhost:3000/api/pedidos/?page=2')).toBe(
      'http://localhost:3000/api/pedidos/?page=2',
    );
  });

  it('rejects different-origin absolute URLs with scheme', () => {
    expect(
      safeNextUrl('https://evil.example/recolecciones/?page=2'),
    ).toBeNull();
    expect(safeNextUrl('http://localhost:8000/recolecciones/')).toBeNull();
    expect(safeNextUrl('http://localhost:9999/api/pedidos/?page=2')).toBeNull();
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeNextUrl('//evil.example/recolecciones/?page=2')).toBeNull();
  });

  it('rejects backslash-prefixed values', () => {
    expect(safeNextUrl('\\evil.example\\recolecciones\\')).toBeNull();
  });
});
