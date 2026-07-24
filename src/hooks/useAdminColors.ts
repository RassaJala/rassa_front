import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';

export function useAdminColors() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  return {
    bg: isDark ? colors.admBgD : colors.admBgL,
    surface: isDark ? colors.admSurfaceD : colors.admSurfaceL,
    fg: isDark ? colors.admFgD : colors.admFgL,
    muted: isDark ? colors.admMutedD : colors.admMutedL,
    border: isDark ? colors.admBorderD : colors.admBorderL,
    brand: isDark ? colors.admBrandD : colors.admBrandL,
  };
}