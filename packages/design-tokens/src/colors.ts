// packages/design-tokens/src/colors.ts

/**
 * Diseño de tokens de color siguiendo constraints del DESIGN.md.
 *
 * Estrictamente las paletas del logo:
 *   Forest (#3A6D56) - green-forest
 *   Coral (#DE393A)   - red-coral  
 *   Orange (#E46C38)   - orange
 *   Ink (#1D1D1D)      - ink
 *
 * Neutros via Tailwind + semánticos para feedback.
 */

// Marca - solo 4 colores del logo exactos
export const brand = {
  forest: '#3A6D56',
  coral: '#DE393A',
  orange: '#E46C38',
  ink: '#1D1D1D',
} as const;

// Neutros del DESIGN.md - usando clases de Tailwind para constanteidad
// Estos valores corresponden a las clases de Tailwind utilizadas en el diseño
export const neutrals = {
  white: '#ffffff',
  gray50: '#f9fafb', // bg-gray-50
  gray100: '#f3f4f6', // tailwind: gray-100
  gray200: '#e5e7eb', // border-gray-200
  gray300: '#d1d5db', // gray-300
  gray400: '#9ca3af', // text-gray-400
  gray500: '#6b7280', // text-gray-500
  gray600: '#4b5563', // gray-600
  gray700: '#374151', // gray-700
  gray800: '#1f2937', // text-brand-ink (ink principal)
  gray900: '#111827', // text-gray-900
  gray950: '#030712', // dark mode bg-gray-950
} as const;

// Semánticos - para errores, éxito, advertencia
export const semantics = {
  error: '#ef4444', // text-red-500 (error/alerta)
  errorBg: '#fee2e2', // bg-red-100 (error/alerta)
  success: '#3A6D56', // brand-green-forest (#3A6D56)
  warning: '#E46C38', // text-brand-orange (advertencia)
  warningBg: '#fff7ed', // bg-orange-50 (advertencia)
} as const;

// Alias para diseños usando colores de marca en contextos semánticos
export const semanticColors = {
  successText: brand.forest,
  successBg: '#f0fdf4', // green-50
  errorText: semantics.error,
  errorBg: semantics.errorBg,
  warningText: semantics.warning,
  warningBg: semantics.warningBg,
} as const;

// Contraste seguro para modo oscuro: reciprocidad light/dark
export const darkModeOverrides = {
  // Superficies
  lightBg: neutrals.white,
  darkBg: '#111827', // bg-gray-900 (era 950, ajustado por contraste)
  lightSurface: neutrals.white,
  darkSurface: '#1f2937', // bg-gray-800
  lightElevated: neutrals.white,
  darkElevated: '#374151', // bg-gray-700

  // Texto
  lightText: neutrals.gray900,
  darkText: '#f3f4f6', // text-gray-100 (era 100, ajustado por contraste)
  lightTextSecondary: neutrals.gray500,
  darkTextSecondary: '#9ca3af', // text-gray-400
  lightTextTertiary: neutrals.gray400,
  darkTextTertiary: '#6b7280', // text-gray-500

  // Bordes
  lightBorder: neutrals.gray200,
  darkBorder: '#374151', // border-gray-700

  // Brand (mismos valores en ambos modos per mapping)
  forest: brand.forest,
  coral: brand.coral,
  orange: brand.orange,
  ink: brand.ink,

  // Dark aliases para uso semántico
  forestDark: brand.forest,
  coralDark: brand.coral,
  orangeDark: brand.orange,
  inkDark: '#e5e7eb', // text-gray-200 (versión clara de ink)
} as const;
