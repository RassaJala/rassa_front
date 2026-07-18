// packages/design-tokens/src/radius.ts

/**
 * Border radius del DESIGN.md.
 *
 * Valores:
 *   Botones, inputs: rounded-lg (8px)
 *   Cards, modales: rounded-xl (12px)
 *   Badges, chips: rounded-full (9999px)
 */

export const radius = {
  'lg': '8px',      // Botones, inputs
  'xl': '12px',     // Cards, modales
  'full': '9999px', // Badges, chips
} as const;

/**
 * Estilos de borde para componentes Paper.
 */
export const borderStyles = {
  solid: '1px solid',
  none: 'none',
} as const;

/**
 * Grosor de borde.
 */
export const borderWidths = {
  '0': '0px',
  '1': '1px',
  '2': '2px',
  '4': '4px',
  '8': '8px',
} as const;