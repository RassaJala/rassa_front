import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ────────────────────────────────────────────────

// Minimal snapshot of the checkout attempt, persisted BEFORE the POST so an
// app kill between the server commit and clearCart can be reconciled on the
// next mount. Kept structurally identical to CreateOrderPayload instead of
// importing it: services must not depend on sibling services.
export interface InFlightOrderPayload {
  items: Array<{
    id_producto_semanal: number;
    cantidad: number;
  }>;
}

export interface InFlightOrderRecord {
  readonly idempotencyKey: string;
  readonly payload: InFlightOrderPayload;
  readonly productNames: string[];
  readonly total: number;
  readonly createdAt: string;
}

// Same AsyncStorage used by the cart store (rassa-cart), separate key.
export const IN_FLIGHT_ORDER_KEY = 'rassa-checkout-in-flight';

// ── Helpers ──────────────────────────────────────────────

// No crypto.randomUUID on Hermes; a timestamp + random suffix is unique
// enough for a client-side idempotency key. The backend may ignore the key;
// the persisted record is the real duplicate-order safety net.
export function createIdempotencyKey(): string {
  return `checkout-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

// ── Persistence (best-effort) ────────────────────────────
// Storage failures are swallowed on purpose: this safety net must never block
// checkout. A lost/never-written record degrades to today's behavior, and the
// next successful write or the next mount reconcile heals the state.

export async function saveInFlightOrder(
  record: InFlightOrderRecord,
): Promise<void> {
  try {
    await AsyncStorage.setItem(IN_FLIGHT_ORDER_KEY, JSON.stringify(record));
  } catch {
    // Best-effort: proceed without the safety net rather than blocking.
  }
}

export async function getInFlightOrder(): Promise<InFlightOrderRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(IN_FLIGHT_ORDER_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isInFlightOrderRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearInFlightOrder(): Promise<void> {
  try {
    await AsyncStorage.removeItem(IN_FLIGHT_ORDER_KEY);
  } catch {
    // Best-effort: a stale record is discarded by the next mount reconcile.
  }
}

function isInFlightOrderRecord(value: unknown): value is InFlightOrderRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<InFlightOrderRecord>;
  return (
    typeof record.idempotencyKey === 'string' &&
    typeof record.total === 'number' &&
    typeof record.createdAt === 'string' &&
    Array.isArray(record.productNames) &&
    record.productNames.every((name) => typeof name === 'string') &&
    record.payload !== undefined &&
    record.payload !== null &&
    Array.isArray(record.payload.items) &&
    record.payload.items.every(
      (item) =>
        typeof item.id_producto_semanal === 'number' &&
        typeof item.cantidad === 'number',
    )
  );
}
