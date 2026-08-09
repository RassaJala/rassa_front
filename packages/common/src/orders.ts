// Shared buyer-order helpers used by both the mobile app
// (src/screens/buyer/OrderDetailScreen.tsx) and the web app
// (web/src/routes/BuyerOrderDetail.tsx).

import { toLocalDate } from './waste';

export interface OrderExpiryLike {
  readonly expirado?: boolean;
  readonly fecha_expiracion?: string | null;
}

/**
 * A pending order is expired when the backend flags it (`expirado: true`) or
 * when its expiry datetime has passed. Bare `YYYY-MM-DD` expiry dates are
 * compared as local dates (the backend sends them without a timezone, so a
 * UTC-naive `new Date()` comparison would shift by a day in negative-offset
 * timezones — S1).
 */
export function isOrderExpired(order: OrderExpiryLike): boolean {
  if (order.expirado === true) return true;
  const fecha = order.fecha_expiracion;
  if (!fecha) return false;

  const trimmed = fecha.trim();
  const isBareDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const expiry = isBareDate ? toLocalDate(trimmed) : new Date(trimmed);

  if (!expiry || Number.isNaN(expiry.getTime())) return false;
  return expiry < new Date();
}
