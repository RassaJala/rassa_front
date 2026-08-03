import type { CSSProperties } from 'react';

export const btnStyle = {
  height: 40,
  padding: '0 18px',
  borderRadius: 10,
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  letterSpacing: '0.01em',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
} as const;

// S-5: shared cart/checkout line-row card (used by BuyerCart and BuyerCheckout —
// previously a byte-identical copy in both files).
export function cartCardStyle(border: string, surface: string): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    borderRadius: 12,
    border: `1px solid ${border}`,
    backgroundColor: surface,
    padding: 16,
  };
}
