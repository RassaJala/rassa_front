import { beforeEach, describe, expect, it } from 'vitest';
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

describe('checkoutGuard — ambiguous order marker (C-1)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
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
});

describe('checkoutGuard — placed order notification (S-3)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when no placed-order record was written', () => {
    expect(readPlacedOrder()).toBeNull();
  });

  it('persists id_pedido and timestamp on write', () => {
    writePlacedOrder({ id_pedido: 45, timestamp: 1234 });

    const record = readPlacedOrder();
    expect(record?.id_pedido).toBe(45);
    expect(record?.timestamp).toBe(1234);
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
});
