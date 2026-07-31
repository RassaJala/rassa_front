import { getDecisionColor as sharedGetDecisionColor } from '@/common/waste';
import type { DecisionPalette } from '@/common/waste';
import { colors } from '@/constants/colors';

// Palette shared by every merma component. Screens build one MermaPalette and
// pass it down as a single prop instead of drilling individual color props.
export interface MermaPalette {
  surface: string;
  fg: string;
  muted: string;
  border: string;
  brand: string;
  bg: string;
  segBg: string;
  coral: string;
}

// Decision badge/bar palette (mobile, hex). Kept module-scope: it is a palette
// constant, not an inline style, so react-native/no-color-literals does not apply.
const decisionPalette: DecisionPalette = {
  donar: colors.admBrandL,
  tirar: colors.brandRedCoral,
  compostar: '#CED295',
  fallback: [
    '#E46C38',
    '#D52E7A',
    '#EEAA6F',
    '#B2C2B2',
    '#AEC0BC',
    '#A19FB6',
    colors.admBrandL,
    '#D8D3C8',
  ],
  defaultColor: '#9CA3AF',
};

export function getDecisionColor(decision: string): string {
  return sharedGetDecisionColor(decision, decisionPalette);
}
