import { isOrderExpired } from './orders';

describe('isOrderExpired', () => {
  it('returns true when the backend flag is set', () => {
    expect(isOrderExpired({ expirado: true })).toBe(true);
    expect(isOrderExpired({ expirado: true, fecha_expiracion: null })).toBe(
      true,
    );
  });

  it('returns false when there is no expiry date', () => {
    expect(isOrderExpired({})).toBe(false);
    expect(isOrderExpired({ fecha_expiracion: null })).toBe(false);
  });

  it('treats a past expiry datetime as expired', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isOrderExpired({ fecha_expiracion: past })).toBe(true);
  });

  it('treats a future expiry datetime as not expired', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isOrderExpired({ fecha_expiracion: future })).toBe(false);
  });

  it('compares bare YYYY-MM-DD expiry as a local date (S1: no UTC shift)', () => {
    // Yesterday as a bare date must be treated as expired without UTC shifting.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const bare = [
      String(yesterday.getFullYear()),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0'),
    ].join('-');
    expect(isOrderExpired({ fecha_expiracion: bare })).toBe(true);
  });

  it('is not expired for an invalid date string', () => {
    expect(isOrderExpired({ fecha_expiracion: 'not-a-date' })).toBe(false);
  });
});
