// packages/design-tokens/src/shadows.ts

/**
 * Valores de shadow del DESIGN.md.
 *
 * Mobile:
 *   Cards elevadas: shadow-sm
 *   Modales, FABs: shadow-lg
 */

export const shadows = {
  none: 'none',
  'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  'xl': '0 20px 25px -5px rgba(0, 0,0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

/**
 * Sombras específicas para modo oscuro: negras o bordes sutiles.
 * Per DESIGN.md, reemplazar shadow con border en modo oscuro.
 */
export const darkShadows = {
  'sm': 'none',
  'md': 'none',
  'lg': 'none',
  'xl': 'none',
  '2xl': 'none',
  
  // Sombras con bordes sutiles para componentes en dark mode
  'sm-border': '0 0 0 1px rgba(255, 255, 255, 0.05)',
  'md-border': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
  'lg-border': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
  'xl-border': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
} as const;

/**
 * Helper para obtener sombra correcta basada en modo.
 */
export const getShadow = (mode: 'light' | 'dark', level: keyof typeof shadows) => 
  mode === 'dark' ? (shadows[level] in darkShadows ? darkShadows[shadows[level]] as string : shadows[shadows[level]] as string) : shadows[level];