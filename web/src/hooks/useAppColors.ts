import { useTheme } from '../providers/ThemeProvider';

// ponytail: hook único para colores del tema (#30) — reemplaza la duplicación
// en farmer.tsx, AdminCategories, AdminDashboard, AdminProducts, AdminUnits
export function useAppColors() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  return {
    isDark,
    brand: isDark ? '#4A8A63' : '#24563C',
    onBrand: '#FFFFFF',
    coral: '#DE393A',
    muted: isDark ? '#9DA89D' : '#5E6B5E',
    border: isDark ? '#2A332A' : '#E2E6DF',
    inputBorder: isDark ? '#4A5C4F' : '#D6DAD4',
    surface: isDark ? '#263028' : '#FFFFFF',
    bg: isDark ? '#1A211B' : '#F5F7F0',
    fg: isDark ? '#E8EAE4' : '#2D3328',
    accentBg: isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)',
  } as const;
}

export type AppColors = ReturnType<typeof useAppColors>;
