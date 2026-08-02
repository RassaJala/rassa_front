import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AMBIGUOUS_MARKER_KEY,
  clearAmbiguousMarker,
  clearIdempotencyKey,
  clearInFlightCheckout,
  clearPlacedOrder,
  computePayloadFingerprint,
  createIdempotencyKey,
  getTabSessionId,
  hasConcurrentCheckout,
  IDEMPOTENCY_KEY_KEY,
  PLACED_ORDER_KEY,
  readAmbiguousMarker,
  readInFlightCheckout,
  readPlacedOrder,
  resolveIdempotencyKey,
  writeAmbiguousMarker,
  writeInFlightCheckout,
  writePlacedOrder,
} from './checkoutGuard';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkoutGuard — ambiguous order marker (C-1)', () => {
  beforeEach(() => {
    // W-8: the marker is written to BOTH storages — isolation must clear both.
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('returns null when no marker was written', () => {
    expect(readAmbiguousMarker()).toBeNull();
  });

  it('persists timestamp and payload fingerprint on write', () => {
    const fingerprint = '[{"id_producto_semanal":1,"cantidad":2}]';
    writeAmbiguousMarker({ timestamp: 1234, fingerprint });

    const marker = readAmbiguousMarker();
    expect(marker).not.toBeNull();
    expect(marker?.timestamp).toBe(1234);
    expect(marker?.fingerprint).toBe(fingerprint);
  });

  it('clears the marker from session storage', () => {
    writeAmbiguousMarker({ timestamp: 1, fingerprint: 'x' });

    clearAmbiguousMarker();

    expect(readAmbiguousMarker()).toBeNull();
    expect(window.sessionStorage.getItem(AMBIGUOUS_MARKER_KEY)).toBeNull();
  });

  it('returns null for corrupt marker JSON', () => {
    window.sessionStorage.setItem(AMBIGUOUS_MARKER_KEY, 'not-json{');

    expect(readAmbiguousMarker()).toBeNull();
  });

  it('returns null when the stored marker has the wrong shape', () => {
    window.sessionStorage.setItem(
      AMBIGUOUS_MARKER_KEY,
      JSON.stringify({ foo: 1 }),
    );

    expect(readAmbiguousMarker()).toBeNull();
  });

  it('fingerprint is deterministic for the same payload', () => {
    const items = [
      { id_producto_semanal: 1, cantidad: 2 },
      { id_producto_semanal: 2, cantidad: 1 },
    ];

    expect(computePayloadFingerprint(items)).toBe(
      computePayloadFingerprint([...items]),
    );
    expect(computePayloadFingerprint(items)).toContain('id_producto_semanal');
    expect(computePayloadFingerprint([])).toBe('[]');
  });

  it('W-8: the marker is written to BOTH sessionStorage and localStorage', () => {
    writeAmbiguousMarker({ timestamp: 1, fingerprint: 'x' });

    expect(window.sessionStorage.getItem(AMBIGUOUS_MARKER_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(AMBIGUOUS_MARKER_KEY)).not.toBeNull();
  });

  it('W-8: the marker survives tab close (readable from localStorage after sessionStorage is gone)', () => {
    writeAmbiguousMarker({ timestamp: 1234, fingerprint: 'survivor' });

    // Simulate tab close: sessionStorage dies, localStorage survives.
    window.sessionStorage.clear();

    const marker = readAmbiguousMarker();
    expect(marker).not.toBeNull();
    expect(marker?.fingerprint).toBe('survivor');
  });

  it('W-8: clear removes the marker from BOTH storages', () => {
    writeAmbiguousMarker({ timestamp: 1, fingerprint: 'x' });

    clearAmbiguousMarker();

    expect(window.sessionStorage.getItem(AMBIGUOUS_MARKER_KEY)).toBeNull();
    expect(window.localStorage.getItem(AMBIGUOUS_MARKER_KEY)).toBeNull();
    expect(readAmbiguousMarker()).toBeNull();
  });

  it('W-8: sessionStorage wins when both storages hold a marker', () => {
    window.localStorage.setItem(
      AMBIGUOUS_MARKER_KEY,
      JSON.stringify({ timestamp: 1, fingerprint: 'stale-local' }),
    );
    window.sessionStorage.setItem(
      AMBIGUOUS_MARKER_KEY,
      JSON.stringify({ timestamp: 2, fingerprint: 'fresh-session' }),
    );

    const marker = readAmbiguousMarker();
    expect(marker?.fingerprint).toBe('fresh-session');
  });

  it('LOW-3: the fresher marker wins across storages (local beats stale session)', () => {
    window.sessionStorage.setItem(
      AMBIGUOUS_MARKER_KEY,
      JSON.stringify({ timestamp: 100, fingerprint: 'stale-session' }),
    );
    window.localStorage.setItem(
      AMBIGUOUS_MARKER_KEY,
      JSON.stringify({ timestamp: 200, fingerprint: 'fresh-local' }),
    );

    const marker = readAmbiguousMarker();
    expect(marker?.timestamp).toBe(200);
    expect(marker?.fingerprint).toBe('fresh-local');
  });

  it('LOW-3: equal timestamps resolve deterministically to sessionStorage', () => {
    window.localStorage.setItem(
      AMBIGUOUS_MARKER_KEY,
      JSON.stringify({ timestamp: 500, fingerprint: 'local' }),
    );
    window.sessionStorage.setItem(
      AMBIGUOUS_MARKER_KEY,
      JSON.stringify({ timestamp: 500, fingerprint: 'session' }),
    );

    const marker = readAmbiguousMarker();
    expect(marker?.fingerprint).toBe('session');
  });

  it('LOW-2: reads return null when getItem throws a SecurityError', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(readAmbiguousMarker()).toBeNull();
    expect(readPlacedOrder()).toBeNull();
    expect(readInFlightCheckout()).toBeNull();
    expect(hasConcurrentCheckout('tab-B')).toBe(false);
  });

  it('LOW-2: getTabSessionId still returns a usable id when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    const id = getTabSessionId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('LOW-2: clear functions never throw when removeItem fails', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(() => {
      clearAmbiguousMarker();
      clearIdempotencyKey();
      clearPlacedOrder();
      clearInFlightCheckout();
    }).not.toThrow();
  });
});

describe('checkoutGuard — idempotency key (W-4)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('createIdempotencyKey returns unique keys with the checkout- prefix', () => {
    const a = createIdempotencyKey();
    const b = createIdempotencyKey();

    expect(a).toMatch(/^checkout-/);
    expect(b).toMatch(/^checkout-/);
    expect(a).not.toBe(b);
  });

  it('resolveIdempotencyKey returns the SAME key for the same payload fingerprint', () => {
    const fingerprint = '[{"id_producto_semanal":1,"cantidad":2}]';

    const key1 = resolveIdempotencyKey(fingerprint);
    const key2 = resolveIdempotencyKey(fingerprint);

    expect(key1).toMatch(/^checkout-/);
    expect(key2).toBe(key1);
  });

  it('resolveIdempotencyKey returns a DIFFERENT key when the payload changes', () => {
    const key1 = resolveIdempotencyKey('payload-a');
    const key2 = resolveIdempotencyKey('payload-b');

    expect(key2).not.toBe(key1);
  });

  it('a corrupt persisted record is discarded and a new key is generated', () => {
    window.localStorage.setItem(IDEMPOTENCY_KEY_KEY, 'not-json{');

    const key = resolveIdempotencyKey('x');

    expect(key).toMatch(/^checkout-/);
  });

  it('clearIdempotencyKey removes the persisted record', () => {
    resolveIdempotencyKey('x');
    expect(window.localStorage.getItem(IDEMPOTENCY_KEY_KEY)).not.toBeNull();

    clearIdempotencyKey();

    expect(window.localStorage.getItem(IDEMPOTENCY_KEY_KEY)).toBeNull();
  });

  it('W-7: resolveIdempotencyKey does not throw when setItem fails (quota/incognito)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const key = resolveIdempotencyKey('payload-x');

    // The key is still returned for THIS attempt even though persisting it
    // failed — persistence is best-effort.
    expect(key).toMatch(/^checkout-/);
  });
});

describe('checkoutGuard — placed order notification (S-3)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when no placed-order record was written', () => {
    expect(readPlacedOrder()).toBeNull();
  });

  it('persists id_pedido and timestamp on write', () => {
    const timestamp = Date.now();
    writePlacedOrder({ id_pedido: 45, timestamp });

    const record = readPlacedOrder();
    expect(record?.id_pedido).toBe(45);
    expect(record?.timestamp).toBe(timestamp);
  });

  it('returns null for a corrupt placed-order record', () => {
    window.localStorage.setItem(PLACED_ORDER_KEY, 'oops');

    expect(readPlacedOrder()).toBeNull();
  });

  it('clears the placed-order record', () => {
    writePlacedOrder({ id_pedido: 45, timestamp: 1 });

    clearPlacedOrder();

    expect(readPlacedOrder()).toBeNull();
    expect(window.localStorage.getItem(PLACED_ORDER_KEY)).toBeNull();
  });

  it('W-5: an old placed-order record is NOT dropped by age — it surfaces until consumed', () => {
    writePlacedOrder({ id_pedido: 45, timestamp: Date.now() - 120_000 });

    // No TTL: the record survives a long distraction window so a hidden
    // success always surfaces its confirmation on the next checkout mount (S-3).
    expect(readPlacedOrder()?.id_pedido).toBe(45);
    // Consumed on read/dismiss — it cannot persist forever.
    clearPlacedOrder();
    expect(readPlacedOrder()).toBeNull();
  });
});

describe('checkoutGuard — cross-tab in-flight checkout (S-9)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('returns no record and no concurrency when nothing is in flight', () => {
    expect(readInFlightCheckout()).toBeNull();
    expect(hasConcurrentCheckout('tab-B')).toBe(false);
  });

  it('persists the record and flags another tab as concurrent', () => {
    writeInFlightCheckout({
      tabSessionId: 'tab-A',
      idempotencyKey: 'checkout-k1',
      timestamp: Date.now(),
      fingerprint: 'f',
    });

    expect(readInFlightCheckout()?.tabSessionId).toBe('tab-A');
    expect(hasConcurrentCheckout('tab-B')).toBe(true);
    expect(hasConcurrentCheckout('tab-A')).toBe(false);
  });

  it('treats a stale record (TTL elapsed) as absent', () => {
    writeInFlightCheckout({
      tabSessionId: 'tab-A',
      idempotencyKey: 'checkout-k1',
      timestamp: Date.now() - 120_000,
      fingerprint: 'f',
    });

    expect(readInFlightCheckout()).toBeNull();
    expect(hasConcurrentCheckout('tab-B')).toBe(false);
  });

  it('clears the in-flight record', () => {
    writeInFlightCheckout({
      tabSessionId: 'tab-A',
      idempotencyKey: 'checkout-k1',
      timestamp: Date.now(),
      fingerprint: 'f',
    });

    clearInFlightCheckout();

    expect(readInFlightCheckout()).toBeNull();
  });

  it('getTabSessionId is stable within the same tab context', () => {
    const a = getTabSessionId();
    const b = getTabSessionId();

    expect(a.length).toBeGreaterThan(0);
    expect(b).toBe(a);
  });

  it('W-7: getTabSessionId does not throw when setItem fails (quota/incognito)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const id = getTabSessionId();

    expect(id.length).toBeGreaterThan(0);
  });
});

describe('checkoutGuard — blocked storage PROPERTY GETTERS (WARNING 2)', () => {
  // Firefox blocked-storage throws a SecurityError on the sessionStorage /
  // localStorage property getter ITSELF (not just on getItem/setItem). Every
  // guard function must survive it: reads degrade to "absent", writes/clears
  // become no-ops, and ids still resolve.
  beforeEach(() => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
  });

  it('readAmbiguousMarker returns null when the property getters throw', () => {
    expect(readAmbiguousMarker()).toBeNull();
  });

  it('readPlacedOrder returns null when the property getters throw', () => {
    expect(readPlacedOrder()).toBeNull();
  });

  it('readInFlightCheckout returns null when the property getters throw', () => {
    expect(readInFlightCheckout()).toBeNull();
  });

  it('getTabSessionId still returns a usable id when the property getters throw', () => {
    const id = getTabSessionId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('resolveIdempotencyKey still returns a fresh key when the property getters throw', () => {
    const key = resolveIdempotencyKey('payload-x');
    expect(key).toMatch(/^checkout-/);
  });

  it('write and clear functions never throw when the property getters throw', () => {
    expect(() => {
      writeAmbiguousMarker({ timestamp: 1, fingerprint: 'x' });
      clearAmbiguousMarker();
      writePlacedOrder({ id_pedido: 1, timestamp: 1 });
      clearPlacedOrder();
      writeInFlightCheckout({
        tabSessionId: 'tab-A',
        idempotencyKey: 'checkout-k1',
        timestamp: 1,
        fingerprint: 'f',
      });
      clearInFlightCheckout();
      clearIdempotencyKey();
    }).not.toThrow();
  });
});
