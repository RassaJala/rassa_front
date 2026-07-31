import { describe, expect, it } from 'vitest';

import { normalizeRole } from './index';

describe('normalizeRole', () => {
  it('returns admin for "admin"', () => {
    expect(normalizeRole('admin')).toBe('admin');
  });

  it('returns agricultor for "farmer"', () => {
    expect(normalizeRole('farmer')).toBe('agricultor');
  });

  it('returns vendedor for "seller"', () => {
    expect(normalizeRole('seller')).toBe('vendedor');
  });

  it('returns cliente for "buyer"', () => {
    expect(normalizeRole('buyer')).toBe('cliente');
  });

  it('returns cliente for unknown role', () => {
    expect(normalizeRole('unknown')).toBe('cliente');
  });

  it('returns cliente for undefined', () => {
    expect(normalizeRole(undefined)).toBe('cliente');
  });

  it('returns cliente for empty string', () => {
    expect(normalizeRole('')).toBe('cliente');
  });

  it('is case-sensitive — "Admin" returns cliente', () => {
    expect(normalizeRole('Admin')).toBe('cliente');
  });

  it('is case-sensitive — "FARMER" returns cliente', () => {
    expect(normalizeRole('FARMER')).toBe('cliente');
  });
});
