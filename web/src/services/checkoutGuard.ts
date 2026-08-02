import type { CreateOrderItem } from './orders';

// C-1: an ambiguous POST failure (timeout / network error after the request
// may have reached the server) is persisted across navigation so a remount of
// the checkout surfaces the warning instead of letting the user re-confirm
// blindly and risk a duplicate order. The marker is cleared only on confirmed
// success, on a definitive failure, or by explicit user acknowledgment.

export const AMBIGUOUS_MARKER_KEY = 'rassa-checkout-ambiguous';

// WARNING 2 (R4-follow-up): Firefox blocked-storage throws a SecurityError on
// the sessionStorage/localStorage PROPERTY GETTER itself, not only on
// getItem/setItem. Every storage access in this module MUST go through these
// accessors so a throwing getter degrades to null (reads → "absent", writes →
// no-op) instead of crashing the checkout.
function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface AmbiguousMarker {
  timestamp: number;
  fingerprint: string;
  // JD-A-001/JD-B-001: per-attempt identity — a cross-tab dismissal only
  // clears a marker of the SAME checkout attempt. OPTIONAL and deliberately
  // excluded from isAmbiguousMarker validation: legacy markers (written
  // before this field) must still validate and simply degrade to per-tab
  // dismiss — they are never cross-tab cleared (safe degrade).
  attemptId?: string;
}

export function computePayloadFingerprint(
  items: readonly CreateOrderItem[],
): string {
  return JSON.stringify(items);
}

// W-8/LOW-3: the marker is written to BOTH sessionStorage and localStorage. A
// sessionStorage-only marker dies on tab close — exactly the moment a blind
// re-confirm (and a duplicate order) becomes likely after the ambiguous
// failure. localStorage survives tab close, so the next mount still surfaces
// the warning. Reads merge BOTH records and keep the freshest by `timestamp`
// (max wins; sessionStorage breaks timestamp ties — it is the freshest tab
// context).
export function readAmbiguousMarker(): AmbiguousMarker | null {
  if (typeof window === 'undefined') return null;
  const session = readStoredRecord(
    AMBIGUOUS_MARKER_KEY,
    isAmbiguousMarker,
    getSessionStorage(),
  );
  const local = readStoredRecord(
    AMBIGUOUS_MARKER_KEY,
    isAmbiguousMarker,
    getLocalStorage(),
  );
  if (session === null) return local;
  if (local === null) return session;
  if (local.timestamp > session.timestamp) return local;
  return session;
}

// S-9d: shared JSON-record reader — parse + shape-validate a persisted record.
// Corrupt or wrong-shape records are treated as absent (never block checkout).
// LOW-2: a storage read that throws (SecurityError in blocked/incognito
// contexts) degrades to "absent" like a corrupt record — checkout must never
// crash on a read.
function readStoredRecord<T>(
  key: string,
  validate: (value: unknown) => value is T,
  storage: Storage | null = null,
): T | null {
  if (typeof window === 'undefined') return null;
  const store = storage ?? getLocalStorage();
  // WARNING 2: a throwing property getter yields null storage — degrade to
  // "absent" like a corrupt record, never throw out of the guard.
  if (store === null) return null;
  let raw: string | null;
  try {
    raw = store.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validate(parsed)) return parsed;
  } catch {
    return null;
  }
  return null;
}

function isAmbiguousMarker(value: unknown): value is AmbiguousMarker {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AmbiguousMarker).timestamp === 'number' &&
    typeof (value as AmbiguousMarker).fingerprint === 'string'
  );
}

export function writeAmbiguousMarker(marker: AmbiguousMarker): void {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(marker);
  // WARNING 2: route through the safe accessors — a throwing property getter
  // (blocked storage) makes each write a no-op instead of throwing out of the
  // guard. A setItem failure still propagates for the caller's own try/catch.
  getSessionStorage()?.setItem(AMBIGUOUS_MARKER_KEY, serialized);
  getLocalStorage()?.setItem(AMBIGUOUS_MARKER_KEY, serialized);
}

export function clearAmbiguousMarker(): void {
  if (typeof window === 'undefined') return;
  // LOW-2: storage clears are best-effort — a SecurityError (blocked storage)
  // must never abort the confirm/success/error flows.
  try {
    getSessionStorage()?.removeItem(AMBIGUOUS_MARKER_KEY);
  } catch {
    // Swallow — the marker lingers until a working storage is available.
  }
  try {
    getLocalStorage()?.removeItem(AMBIGUOUS_MARKER_KEY);
  } catch {
    // Swallow — the marker lingers until a working storage is available.
  }
}

// R4-W3 + JD-A-001/JD-B-001: cross-tab dismiss — localStorage is shared
// across tabs, so a dismiss in one tab can reach the others via the 'storage'
// event. The record carries the fingerprint AND the attempt id of the checkout
// attempt that was acknowledged: a tab only clears its marker when the
// dismissed attempt id matches its own marker's attempt id, so a dismissal
// never silences a DIFFERENT ambiguous failure — even one with the same cart
// (same fingerprint, different attempt). Only localStorage is used
// (sessionStorage is per-tab — the shared channel is localStorage).

export const AMBIGUOUS_DISMISS_KEY = 'rassa-checkout-ambiguous-dismiss';

export interface AmbiguousDismissRecord {
  timestamp: number;
  fingerprint: string;
  attemptId: string;
}

export function writeAmbiguousDismiss(
  fingerprint: string,
  attemptId: string,
): void {
  if (typeof window === 'undefined') return;
  const record: AmbiguousDismissRecord = {
    timestamp: Date.now(),
    fingerprint,
    attemptId,
  };
  try {
    getLocalStorage()?.setItem(AMBIGUOUS_DISMISS_KEY, JSON.stringify(record));
  } catch {
    // Swallow — degraded to per-tab dismiss when storage is unavailable.
  }
}

export function readAmbiguousDismiss(): AmbiguousDismissRecord | null {
  return readStoredRecord(AMBIGUOUS_DISMISS_KEY, isAmbiguousDismissRecord);
}

function isAmbiguousDismissRecord(
  value: unknown,
): value is AmbiguousDismissRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AmbiguousDismissRecord).timestamp === 'number' &&
    typeof (value as AmbiguousDismissRecord).fingerprint === 'string' &&
    typeof (value as AmbiguousDismissRecord).attemptId === 'string'
  );
}

// ── Idempotency key (W-4) ────────────────────────────────
// One client-generated key identifies a checkout ATTEMPT end-to-end. It is
// sent as an Idempotency-Key header (best-effort — a backend that ignores
// unknown headers is unaffected; the ambiguous marker is the real duplicate
// safety net). The key is tied to the payload fingerprint so a retry of the
// SAME attempt reuses it (a server-side dedupe could then collapse the two
// POSTs into one order), while a DIFFERENT payload — even from another tab —
// always gets a fresh key.
// S-9e: SINGLE-RECORD limitation — exactly one idempotency record is kept.
// Alternating payloads rotate the stored key (F1→K1, F2→K2, F1→K3), so the
// stable-key guarantee holds ONLY for consecutive retries of the same payload
// (the re-confirm flow after an ambiguous failure). Interleaved attempts
// between different payloads cannot be deduped client-side.

export const IDEMPOTENCY_KEY_KEY = 'rassa-checkout-idempotency';

export interface IdempotencyRecord {
  key: string;
  fingerprint: string;
}

// No crypto.randomUUID guarantee on all targets; timestamp + random suffix is
// unique enough for a client-side idempotency key (mirrors the mobile app).
// S-9d: shared suffix generator — used by the idempotency key and the tab
// session id so both ids follow the same shape.
function randomSuffixId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function createIdempotencyKey(): string {
  return randomSuffixId('checkout');
}

// JD-A-001/JD-B-001: a fresh id per CHECKOUT ATTEMPT — deliberately NOT the
// idempotency key, which is per-fingerprint and shared across tabs/attempts
// (a retry of the same payload reuses it). The cross-tab dismiss channel keys
// on the attempt id so a dismissal only ever clears the marker of the exact
// attempt the user acknowledged.
export function createCheckoutAttemptId(): string {
  return randomSuffixId('attempt');
}

function readIdempotencyRecord(): IdempotencyRecord | null {
  return readStoredRecord(IDEMPOTENCY_KEY_KEY, isIdempotencyRecord);
}

function isIdempotencyRecord(value: unknown): value is IdempotencyRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as IdempotencyRecord).key === 'string' &&
    typeof (value as IdempotencyRecord).fingerprint === 'string'
  );
}

export function resolveIdempotencyKey(fingerprint: string): string {
  const existing = readIdempotencyRecord();
  if (existing !== null && existing.fingerprint === fingerprint) {
    return existing.key;
  }
  const key = createIdempotencyKey();
  if (typeof window !== 'undefined') {
    // W-7: persistence is best-effort — quota/incognito must not throw out of
    // the guard; the key still identifies THIS attempt for its lifetime.
    try {
      getLocalStorage()?.setItem(
        IDEMPOTENCY_KEY_KEY,
        JSON.stringify({ key, fingerprint }),
      );
    } catch {
      // Swallow — a fresh key is generated next attempt.
    }
  }
  return key;
}

export function clearIdempotencyKey(): void {
  if (typeof window === 'undefined') return;
  try {
    getLocalStorage()?.removeItem(IDEMPOTENCY_KEY_KEY);
  } catch {
    // LOW-2: swallow — best-effort clear, never abort the flow.
  }
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
  // W-5: no TTL — the record survives until consumed. A hidden success must
  // surface its confirmation whenever the user returns (a distraction window
  // can exceed any short TTL), and the checkout mount clears it once shown, so
  // it cannot persist forever. Dropping an aged record silently would leave an
  // empty cart with no banner and invite a re-order of the same items.
  return readStoredRecord(PLACED_ORDER_KEY, isPlacedOrderRecord);
}

function isPlacedOrderRecord(value: unknown): value is PlacedOrderRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PlacedOrderRecord).id_pedido === 'number' &&
    typeof (value as PlacedOrderRecord).timestamp === 'number'
  );
}

export function writePlacedOrder(record: PlacedOrderRecord): void {
  if (typeof window === 'undefined') return;
  // WARNING 2: route through the safe accessor — a throwing property getter
  // makes the write a no-op instead of throwing out of the guard. A setItem
  // failure still propagates for the caller's own try/catch (JD-A-002/JD-B-001).
  getLocalStorage()?.setItem(PLACED_ORDER_KEY, JSON.stringify(record));
}

export function clearPlacedOrder(): void {
  if (typeof window === 'undefined') return;
  try {
    getLocalStorage()?.removeItem(PLACED_ORDER_KEY);
  } catch {
    // LOW-2: swallow — best-effort clear, never abort the flow.
  }
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
  let existing: string | null = null;
  try {
    existing = getSessionStorage()?.getItem(TAB_SESSION_ID_KEY) ?? null;
  } catch {
    // LOW-2: a blocked read degrades to a fresh id for this page load.
    existing = null;
  }
  if (existing !== null && existing !== '') return existing;
  const id = randomSuffixId('tab');
  // W-7: persistence is best-effort — quota/incognito must not throw out of
  // the guard; the in-memory id still identifies this tab for this page load.
  try {
    getSessionStorage()?.setItem(TAB_SESSION_ID_KEY, id);
  } catch {
    // Swallow — a fresh id is generated next page load.
  }
  return id;
}

export function readInFlightCheckout(): InFlightCheckoutRecord | null {
  const record = readStoredRecord(
    IN_FLIGHT_CHECKOUT_KEY,
    isInFlightCheckoutRecord,
  );
  if (record === null) return null;
  if (Date.now() - record.timestamp > IN_FLIGHT_CHECKOUT_TTL_MS) {
    // A stale record (crashed tab) must not block checkout — drop it.
    clearInFlightCheckout();
    return null;
  }
  return record;
}

function isInFlightCheckoutRecord(
  value: unknown,
): value is InFlightCheckoutRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as InFlightCheckoutRecord).tabSessionId === 'string' &&
    typeof (value as InFlightCheckoutRecord).idempotencyKey === 'string' &&
    typeof (value as InFlightCheckoutRecord).timestamp === 'number' &&
    typeof (value as InFlightCheckoutRecord).fingerprint === 'string'
  );
}

export function writeInFlightCheckout(record: InFlightCheckoutRecord): void {
  if (typeof window === 'undefined') return;
  // WARNING 2: route through the safe accessor — a throwing property getter
  // makes the write a no-op instead of throwing out of the guard. A setItem
  // failure still propagates so the caller's write-then-verify abort (W-7)
  // keeps working.
  getLocalStorage()?.setItem(IN_FLIGHT_CHECKOUT_KEY, JSON.stringify(record));
}

export function clearInFlightCheckout(): void {
  if (typeof window === 'undefined') return;
  try {
    getLocalStorage()?.removeItem(IN_FLIGHT_CHECKOUT_KEY);
  } catch {
    // LOW-2: swallow — best-effort clear, never abort the flow.
  }
}

// True only when ANOTHER tab has a checkout POST in flight — the caller's own
// in-flight record (same tab session) is never treated as concurrent.
export function hasConcurrentCheckout(ownTabSessionId: string): boolean {
  const record = readInFlightCheckout();
  return record !== null && record.tabSessionId !== ownTabSessionId;
}
