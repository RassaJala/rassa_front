// packages/design-tokens/src/spacing.ts

/**
 * Escala de espaciado siguiendo el DESIGN.md spacing.
 *
 * Valores: 0px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px, 128px, 160px, 192px, 224px, 256px
 *
 * Consistente con Tailwind spacing (padrones.
 */

export const spacing = {
  // Espacios más pequeños
  '0': '0px',
  px: '1px',
  '0.5': '2px', // 2px - 0.5 * 4
  '1': '4px',
  '1.5': '6px', // 6px - 1.5 * 4
  '2': '8px',
  '2.5': '10px', // 10px - 2.5 * 4
  '3': '12px',
  '3.5': '14px', // 14px - 3.5 * 4
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '9': '36px',
  '10': '40px',
  '11': '44px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
  '28': '112px',
  '32': '128px',
  '36': '144px',
  '40': '160px',
  '44': '176px',
  '48': '192px',
  '56': '224px',
  '64': '256px',
} as const;

/**
 * Padding y margin shortcuts usando spacing definido.
 * Equivalen a clases de Tailwind (p-*, m-*).
 */
export const padding = spacing;
export const margin = spacing;

/**
 * Breakpoints derivados del DESIGN.md responsive.
 * Estos son los valores exactos para los breakpoints del diseño.
 */
export const breakpoints = {
  mobile: '0px', // < 640px
  tablet: '640px', // 640px - 1023px
  desktop: '1024px', // >= 1024px
} as const;

/**
 * Grid columns para layout responsive.
 * Mobile-first: 1 columna → tablet 2 → desktop 3+.
 */
export const gridColumns = {
  mobile: 1,
  tablet: 2,
  desktop: 3,
} as const;
