// R3-B: guarda el anclaje del origen de la API en despliegues cross-origin y
// cuando no hay `window` (SSR). `safeUrl` debe aislarse contra el ORIGEN REAL
// de la API (el mismo base que usa el axios instance), no contra
// window.location.origin, y no debe devolver null por un crash de parseo.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { safeNextUrl } from './safeUrl';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('safeNextUrl without a window (SSR)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
  });

  it('resolves relative API base against a fallback origin instead of failing', () => {
    expect(safeNextUrl('http://localhost/api/pedidos/?page=2')).toBe(
      'http://localhost/api/pedidos/?page=2',
    );
  });

  it('still rejects cross-origin absolute URLs', () => {
    expect(safeNextUrl('https://evil.example/api/pedidos/?page=2')).toBeNull();
  });

  it('still accepts same-origin relative paths', () => {
    expect(safeNextUrl('/api/pedidos/?page=2')).toBe('/api/pedidos/?page=2');
  });
});

describe('safeNextUrl with a cross-origin VITE_API_URL', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('anchors on the configured API origin, not the window origin', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api');
    const { safeNextUrl: isolated } = await import('./safeUrl');

    expect(isolated('https://api.example.com/api/pedidos/?page=2')).toBe(
      'https://api.example.com/api/pedidos/?page=2',
    );
    expect(isolated('https://api.example.com/other/?page=2')).toBe(
      'https://api.example.com/other/?page=2',
    );
    expect(isolated('https://evil.example/api/pedidos/?page=2')).toBeNull();
  });
});
