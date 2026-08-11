/**
 * Tokens del verde/neutros de marca de la redesign palette, compartidos entre
 * el recibo (PDF), la web y el mobile.
 *
 * FUENTE ÚNICA (R2-01): `brandPrimary`/`admBrandL` de
 * src/constants/colors.ts (mobile) y web/src/constants/colors.ts + la rama
 * light de useAppColors.ts (web) derivan de BRAND/CORAL/INK/MUTED/BORDER de
 * este archivo. Un rebrand cambia el valor acá y todos los artefactos se
 * actualizan juntos.
 *
 * El recibo es un documento HTML standalone que no puede importar constantes
 * de React Native/React: por eso los tokens viven en packages/common y no en
 * las constantes de cada plataforma.
 *
 * NOTA: `packages/design-tokens/src/colors.ts` define brand.forest (#3A6D56),
 * la paleta del LOGO según DESIGN.md. Es un concepto distinto del verde de la
 * redesign palette que usan las apps y el recibo; se mantiene deliberadamente
 * separado y ningún artefacto del recibo lo importa.
 */

export const BRAND = '#24563C';
/** Tono profundo del verde de marca para títulos del documento. */
export const BRAND_DARK = '#1B402E';
export const CORAL = '#DE393A';
export const INK = '#2D3328';
export const MUTED = '#5E6B5E';
export const BORDER = '#E2E6DF';

export const BRAND_NAME = 'RASSA';
export const BRAND_TAGLINE = 'Frutas del campo a tu mesa';
