import { colors } from '@/constants/colors';

export function getAdminColors(isDark: boolean) {
  return {
    bg: isDark ? colors.admBgD : colors.admBgL,
    surface: isDark ? colors.admSurfaceD : colors.admSurfaceL,
    fg: isDark ? colors.admFgD : colors.admFgL,
    muted: isDark ? colors.admMutedD : colors.admMutedL,
    border: isDark ? colors.admBorderD : colors.admBorderL,
    brand: isDark ? colors.admBrandD : colors.admBrandL,
    segBg: isDark ? colors.admSegBgD : colors.admSegBgL,
    accentBg: isDark ? colors.admActiveBgD : colors.admActiveBgL,
    coralBg: isDark ? colors.admCoralBgD : colors.admCoralBgL,
    errorBg: isDark ? colors.admErrorBgD : colors.admErrorBgL,
    errorBorder: isDark ? colors.admErrorBorderD : colors.admErrorBorderL,
    errorText: isDark ? colors.admErrorTextD : colors.admErrorTextL,
    errorAction: isDark ? colors.admErrorActionD : colors.admErrorActionL,
    inputBg: isDark ? colors.admSurfaceD : colors.admBgL,
    inputBorder: isDark ? colors.admBorderD : colors.admBorderL,
    inputFocusedBorder: isDark ? colors.admBrandD : colors.admBrandL,
    rowBg: isDark ? colors.admSurfaceD : colors.admSurfaceL,
    rowBgAlt: isDark ? colors.admBgD : colors.admBgL,
    badgeBg: isDark ? colors.admSegBgD : colors.admSegBgL,
  };
}
