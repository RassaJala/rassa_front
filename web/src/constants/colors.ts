export const colors = {
  primary: '#16a34a',
  primaryDark: '#15803d',
  primaryLight: '#22c55e',
  accent: '#f59e0b',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  border: '#e5e7eb',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
  placeholder: '#94a3b8',
  brand: {
    greenForest: '#3A6D56',
    greenSage: '#AEC0BC',
    greenOlive: '#CED295',
    redCoral: '#DE393A',
    magenta: '#D52E7A',
    orange: '#E46C38',
    skin: '#D8D3C8',
    ink: '#1D1D1D',
    mountainTop: '#EEAA6F',
    mountainMid: '#B2C2B2',
    mountainBot: '#A19FB6',
  },
  brandPrimary: '#24563C',
  brandPrimaryDark: '#4A8A63',
  brandGreenForest: '#3A6D56',
  brandRedCoral: '#DE393A',
  brandOrange: '#E46C38',
  mutedDark: '#9DA89D',
  iconDark: '#1D1D1D',
  brandInk: '#1f2937',
  iconMuted: '#9ca3af',
  iconWhite: '#ffffff',
  transparent: 'transparent',
  shadow: '#000000',
  overlayBg: 'rgba(0, 0, 0, 0.4)',
  modalOverlayBg: 'rgba(0, 0, 0, 0.5)',
  activeGreenBg: 'rgba(74, 138, 99, 0.1)',
  inactiveGrayBg: 'rgba(0, 0, 0, 0.03)',
  admSurfaceL: '#FFFFFF',
  admSurfaceD: '#263028',
  admFgL: '#2D3328',
  admFgD: '#E8EAE4',
  admMutedL: '#5E6B5E',
  admMutedD: '#9DA89D',
  admBorderL: '#E2E6DF',
  admBorderD: '#353D35',
  admBrandL: '#24563C',
  admBrandD: '#4A8A63',
  admBgL: '#F5F7F0',
  admBgD: '#1A211B',
  admActiveBgL: 'rgba(36, 86, 60, 0.07)',
  admActiveBgD: 'rgba(74, 138, 99, 0.12)',
  admInactiveBgL: 'rgba(0, 0, 0, 0.03)',
  admInactiveBgD: 'rgba(255, 255, 255, 0.03)',
  admSegBgL: '#E8ECE4',
  admSegBgD: '#353D35',
  admCoralBgL: 'rgba(222,57,58,0.07)',
  admCoralBgD: 'rgba(232,74,74,0.12)',
  admPumpkinBgL: 'rgba(242,169,0,0.07)',
  admPumpkinBgD: 'rgba(212,160,32,0.12)',
  admErrorBgL: '#FDEDEE',
  admErrorBgD: '#3D2023',
};

export interface ThemeColors {
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly surface: string;
  readonly bg: string;
  readonly brand: string;
  readonly coral: string;
  readonly sidebarBg: string;
  readonly activeBg: string;
}

const light: ThemeColors = {
  fg: '#2D3328',
  muted: '#5E6B5E',
  border: '#D6DAD4',
  surface: '#FFFFFF',
  bg: '#F5F7F0',
  brand: '#24563C',
  coral: '#DE393A',
  sidebarBg: '#F5F7F0',
  activeBg: '#E2F0E6',
};

const dark: ThemeColors = {
  fg: '#E8EAE4',
  muted: '#9DA89D',
  border: '#2A332A',
  surface: '#263028',
  bg: '#1A211B',
  brand: '#4A8A63',
  coral: '#DE393A',
  sidebarBg: '#161B17',
  activeBg: '#1C2D22',
};

export function getColors(isDark: boolean): ThemeColors {
  return isDark ? dark : light;
}

export function themeColors(isDark: boolean): ThemeColors {
  return getColors(isDark);
}
