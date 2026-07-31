import { hashString } from '@/common/waste';
import { colors } from '@/constants/colors';

// Decision badge/bar palette (mobile). Kept module-scope: it is a palette
// constant, not an inline style, so react-native/no-color-literals does not apply.
const DECISION_COLORS: Record<string, string> = {
  donar: colors.admBrandL,
  tirar: colors.brandRedCoral,
  compostar: '#CED295',
};

const FALLBACK_COLORS = [
  '#E46C38',
  '#D52E7A',
  '#EEAA6F',
  '#B2C2B2',
  '#AEC0BC',
  '#A19FB6',
  colors.admBrandL,
  '#D8D3C8',
];

export function getDecisionColor(decision: string): string {
  const key = decision.toLowerCase().trim();
  const mapped = DECISION_COLORS[key];
  if (mapped) return mapped;
  const idx = hashString(key) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[idx] ?? '#9CA3AF';
}
