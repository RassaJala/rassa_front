import type { CreateOrderItem } from './orders';

// C-1: an ambiguous POST failure (timeout / network error after the request
// may have reached the server) is persisted across navigation so a remount of
// the checkout surfaces the warning instead of letting the user re-confirm
// blindly and risk a duplicate order. The marker is cleared only on confirmed
// success, on a definitive failure, or by explicit user acknowledgment.

export const AMBIGUOUS_MARKER_KEY = 'rassa-checkout-ambiguous';

export interface AmbiguousMarker {
  timestamp: number;
  fingerprint: string;
}

export function computePayloadFingerprint(
  items: readonly CreateOrderItem[],
): string {
  return JSON.stringify(items);
}

export function readAmbiguousMarker(): AmbiguousMarker | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(AMBIGUOUS_MARKER_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as AmbiguousMarker).timestamp === 'number' &&
      typeof (parsed as AmbiguousMarker).fingerprint === 'string'
    ) {
      return parsed as AmbiguousMarker;
    }
  } catch {
    // Corrupt marker — treat as absent rather than blocking checkout.
    return null;
  }
  return null;
}

export function writeAmbiguousMarker(marker: AmbiguousMarker): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(AMBIGUOUS_MARKER_KEY, JSON.stringify(marker));
}

export function clearAmbiguousMarker(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(AMBIGUOUS_MARKER_KEY);
}

// ── Idempotency key (W-4) ────────────────────────────────
// One client-generated key identifies a checkout ATTEMPT end-to-end. It is
// sent as an Idempotency-Key header (best-effort — a backend that ignores
// unknown headers is unaffected; the ambiguous marker is the real duplicate
// safety net). The key is tied to the payload fingerprint so a retry of the
// SAME attempt reuses it (a server-side dedupe could then collapse the two
// POSTs into one order), while a DIFFERENT payload — even from another tab —
// always gets a fresh key.

export const IDEMPOTENCY_KEY_KEY = 'rassa-checkout-idempotency';

export interface IdempotencyRecord {
  key: string;
  fingerprint: string;
}

// No crypto.randomUUID guarantee on all targets; timestamp + random suffix is
// unique enough for a client-side idempotency key (mirrors the mobile app).
export function createIdempotencyKey(): string {
  return `checkout-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function readIdempotencyRecord(): IdempotencyRecord | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(IDEMPOTENCY_KEY_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as IdempotencyRecord).key === 'string' &&
      typeof (parsed as IdempotencyRecord).fingerprint === 'string'
    ) {
      return parsed as IdempotencyRecord;
    }
  } catch {
    // Corrupt record — treat as absent rather than blocking checkout.
    return null;
  }
  return null;
}

export function resolveIdempotencyKey(fingerprint: string): string {
  const existing = readIdempotencyRecord();
  if (existing !== null && existing.fingerprint === fingerprint) {
    return existing.key;
  }
  const key = createIdempotencyKey();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      IDEMPOTENCY_KEY_KEY,
      JSON.stringify({ key, fingerprint }),
    );
  }
  return key;
}

export function clearIdempotencyKey(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(IDEMPOTENCY_KEY_KEY);
}

// ── Placed-order notification (S-3) ──────────────────────
// When an order succeeds AFTER the user navigated away (mutation-level
// onSuccess), the checkout that resolves later writes this record so the next
// checkout mount can surface "Tu pedido N°X se confirmó" instead of a silent
// empty cart. The record is consumed (cleared) once shown.

export const PLACED_ORDER_KEY = 'rassa-checkout-placed';

export interface PlacedOrderRecord {
  id_pedido: number;
  timestamp: number;
}

export function readPlacedOrder(): PlacedOrderRecord | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PLACED_ORDER_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as PlacedOrderRecord).id_pedido === 'number' &&
      typeof (parsed as PlacedOrderRecord).timestamp === 'number'
    ) {
      return parsed as PlacedOrderRecord;
    }
  } catch {
    return null;
  }
  return null;
}

export function writePlacedOrder(record: PlacedOrderRecord): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PLACED_ORDER_KEY, JSON.stringify(record));
}

export function clearPlacedOrder(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PLACED_ORDER_KEY);
}

// ── Cross-tab in-flight checkout (S-9) ───────────────────
// localStorage is shared across tabs (sessionStorage is not), so a checkout
// POST in flight in tab A is visible to tab B. The confirm guard blocks a
// second tab from submitting while another tab's POST is pending; the record
// has a TTL so a crashed tab cannot block checkout forever.

export const IN_FLIGHT_CHECKOUT_KEY = 'rassa-checkout-in-flight';
export const IN_FLIGHT_CHECKOUT_TTL_MS = 60_000;

export interface InFlightCheckoutRecord {
  tabSessionId: string;
  idempotencyKey: string;
  timestamp: number;
  fingerprint: string;
}

export const CONCURRENT_CHECKOUT_MSG =
  'Hay un pedido en proceso desde otra pestaña. Esperá a que termine antes de confirmar de nuevo.';

const TAB_SESSION_ID_KEY = 'rassa-checkout-tab-session';

export function getTabSessionId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.sessionStorage.getItem(TAB_SESSION_ID_KEY);
  if (existing !== null && existing !== '') return existing;
  const id = `tab-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  window.sessionStorage.setItem(TAB_SESSION_ID_KEY, id);
  return id;
}

export function readInFlightCheckout(): InFlightCheckoutRecord | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(IN_FLIGHT_CHECKOUT_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as InFlightCheckoutRecord).tabSessionId === 'string' &&
      typeof (parsed as InFlightCheckoutRecord).idempotencyKey === 'string' &&
      typeof (parsed as InFlightCheckoutRecord).timestamp === 'number' &&
      typeof (parsed as InFlightCheckoutRecord).fingerprint === 'string'
    ) {
      const record = parsed as InFlightCheckoutRecord;
      if (Date.now() - record.timestamp > IN_FLIGHT_CHECKOUT_TTL_MS) {
        // A stale record (crashed tab) must not block checkout — drop it.
        clearInFlightCheckout();
        return null;
      }
      return record;
    }
  } catch {
    return null;
  }
  return null;
}

export function writeInFlightCheckout(record: InFlightCheckoutRecord): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(IN_FLIGHT_CHECKOUT_KEY, JSON.stringify(record));
}

export function clearInFlightCheckout(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(IN_FLIGHT_CHECKOUT_KEY);
}

// True only when ANOTHER tab has a checkout POST in flight — the caller's own
// in-flight record (same tab session) is never treated as concurrent.
export function hasConcurrentCheckout(ownTabSessionId: string): boolean {
  const record = readInFlightCheckout();
  return record !== null && record.tabSessionId !== ownTabSessionId;
}
