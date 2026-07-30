import { colors } from '@/constants/colors';

export interface AdminColors {
  readonly bg: string;
  readonly surface: string;
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly brand: string;
  readonly segBg: string;
  readonly accentBg: string;
  readonly coralBg: string;
  readonly errorBg: string;
  readonly errorBorder: string;
  readonly errorText: string;
  readonly errorAction: string;
  readonly inputBg: string;
  readonly inputBorder: string;
  readonly inputFocusedBorder: string;
  readonly rowBg: string;
  readonly rowBgAlt: string;
  readonly badgeBg: string;
}

const LIGHT_COLORS: AdminColors = {
  bg: colors.admBgL,
  surface: colors.admSurfaceL,
  fg: colors.admFgL,
  muted: colors.admMutedL,
  border: colors.admBorderL,
  brand: colors.admBrandL,
  segBg: colors.admSegBgL,
  accentBg: colors.admActiveBgL,
  coralBg: colors.admCoralBgL,
  errorBg: colors.admErrorBgL,
  errorBorder: colors.admErrorBorderL,
  errorText: colors.admErrorTextL,
  errorAction: colors.admErrorActionL,
  inputBg: colors.admBgL,
  inputBorder: colors.admBorderL,
  inputFocusedBorder: colors.admBrandL,
  rowBg: colors.admSurfaceL,
  rowBgAlt: colors.admBgL,
  badgeBg: colors.admSegBgL,
};

const DARK_COLORS: AdminColors = {
  bg: colors.admBgD,
  surface: colors.admSurfaceD,
  fg: colors.admFgD,
  muted: colors.admMutedD,
  border: colors.admBorderD,
  brand: colors.admBrandD,
  segBg: colors.admSegBgD,
  accentBg: colors.admActiveBgD,
  coralBg: colors.admCoralBgD,
  errorBg: colors.admErrorBgD,
  errorBorder: colors.admErrorBorderD,
  errorText: colors.admErrorTextD,
  errorAction: colors.admErrorActionD,
  inputBg: colors.admSurfaceD,
  inputBorder: colors.admBorderD,
  inputFocusedBorder: colors.admBrandD,
  rowBg: colors.admSurfaceD,
  rowBgAlt: colors.admBgD,
  badgeBg: colors.admSegBgD,
};

export function getAdminColors(isDark: boolean): AdminColors {
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}
