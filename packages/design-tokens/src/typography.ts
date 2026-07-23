// packages/design-tokens/src/typography.ts

/**
 * Escala de tipografía del DESIGN.md.
 *
 * Valores:
 *   Título grande: 30px (#text-3xl font-bold)
 *   Título pantalla: 24px (#text-2xl font-bold)
 *   Título sección: 20px (#text-xl font-semibold)
 *   Subtítulo: 18px (#text-lg font-medium)
 *   Cuerpo: 16px (#text-base normal)
 *   Cuerpo chico: 14px (#text-sm normal)
 *   Etiqueta/caption: 12px (#text-xs medium)
 */

export const fontSizes = {
  "3xl": "30px", // Título grande
  "2xl": "24px", // Título pantalla
  xl: "20px", // Título sección
  lg: "18px", // Subtítulo
  base: "16px", // Cuerpo (normal)
  sm: "14px", // Cuerpo chico
  xs: "12px", // Etiqueta/caption
} as const;

/**
 * Pesos de fuente usando pares de números según DESIGN.md:
 *   Bold (700), Semibold (600), Medium (500), Normal (400)
 */
export const fontWeights = {
  bold: 700,
  semibold: 600,
  medium: 500,
  normal: 400,
} as const;

/**
 * Familias tipográficas.
 */
export const fontFamilies = {
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  "sans-condensed":
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

/**
 * Configuración de tamaño de línea del DESIGN.md.
 */
export const lineHeights = {
  tight: 1.2, // Títulos
  normal: 1.5, // Cuerpo
  relaxed: 1.6, // Metadatos
} as const;

/**
 * Espaciado entre letras del DESIGN.md.
 */
export const letterSpacings = {
  tight: "-0.5px",
  normal: "0px",
  wide: "0.5px",
} as const;

/**
 * Line-clamp para truncamiento de texto (ej. chips, badges).
 */
export const lineClamp = {
  1: 1,
  2: 2,
  3: 3,
} as const;
