import { createIdempotencyKey } from './payments';

describe('createIdempotencyKey', () => {
  it('returns a fresh key on every call (ephemeral per-call semantics, R1-B)', () => {
    const a = createIdempotencyKey();
    const b = createIdempotencyKey();

    expect(a).not.toBe(b);
    expect(a).not.toBe('');
    expect(b).not.toBe('');
  });

  it('still produces distinct keys when crypto.randomUUID is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    try {
      // Force the fallback branch (Hermes / non-secure contexts): crypto
      // exists but randomUUID is not a function.
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: { randomUUID: undefined },
      });

      const a = createIdempotencyKey();
      const b = createIdempotencyKey();

      expect(a).not.toBe(b);
      expect(a).toMatch(/^\d+-[0-9a-z]+-[0-9a-z]+$/);
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'crypto', descriptor);
      } else {
        delete (globalThis as { crypto?: unknown }).crypto;
      }
    }
  });
});
