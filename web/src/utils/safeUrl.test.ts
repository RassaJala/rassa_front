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
    // jsdom default origin is http://localhost; a same-origin absolute
    // URL is safe to follow because the request stays on the API origin.
    expect(safeNextUrl('http://localhost/api/pedidos/?page=2')).toBe(
      '/pedidos/?page=2',
    );
  });

  it('rejects different-origin absolute URLs with scheme', () => {
    expect(
      safeNextUrl('https://evil.example/recolecciones/?page=2'),
    ).toBeNull();
    expect(safeNextUrl('http://api.example.com/recolecciones/')).toBeNull();
  });

  it('rewrites localhost absolute next URLs to relative paths (Vite dev proxy)', () => {
    // The Vite proxy serves the SPA on one port and forwards /api to the
    // backend on another; DRF emits absolute next links at ITS own origin, so
    // a localhost absolute URL is rewritten to a relative path that keeps
    // going through the proxy instead of being rejected (pagination stalls).
    expect(safeNextUrl('http://localhost:8000/recolecciones/')).toBe(
      '/recolecciones/',
    );
    expect(safeNextUrl('http://localhost:9999/api/pedidos/?page=2')).toBe(
      '/pedidos/?page=2',
    );
    expect(safeNextUrl('http://127.0.0.1:8000/recolecciones/')).toBe(
      '/recolecciones/',
    );
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeNextUrl('//evil.example/recolecciones/?page=2')).toBeNull();
  });

  it('rejects backslash-prefixed values', () => {
    expect(safeNextUrl('\\evil.example\\recolecciones\\')).toBeNull();
  });
});
