import { colors, themeColors } from '@/constants/colors';

export interface FarmerTheme {
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  border: string;
  brand: string;
  accentBg: string;
  coralBg: string;
  coral: string;
  pumpkin: string;
  pumpkinBg: string;
}

export function farmerTheme(isDark: boolean): FarmerTheme {
  const theme = themeColors(isDark);
  return {
    bg: theme.bg,
    surface: theme.surface,
    fg: theme.fg,
    muted: theme.muted,
    border: theme.border,
    brand: theme.brand,
    accentBg: theme.accentBg,
    coralBg: theme.coralBg,
    coral: colors.brandRedCoral,
    pumpkin: colors.warning,
    pumpkinBg: isDark ? 'rgba(212,160,32,0.12)' : 'rgba(242,169,0,0.07)',
  };
}
