export const colors = {
  primary: '#16a34a',
  primaryDark: '#15803d',
  primaryLight: '#22c55e',
  accent: '#f59e0b',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827', // gray-900
  textSecondary: '#6b7280', // gray-500
  textTertiary: '#9ca3af', // gray-400
  border: '#e5e7eb', // gray-200
  error: '#ef4444', // red-500
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  info: '#3b82f6', // blue-500
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
  brandPrimary: '#24563C', // redesign palette brand green (light)
  brandPrimaryDark: '#4A8A63', // redesign palette brand green (dark)
  brandGreenForest: '#3A6D56',
  brandRedCoral: '#DE393A',
  brandOrange: '#E46C38',
  mutedDark: '#9DA89D', // redesign dark mode muted text
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
  // ── Redesign/Admin palette ──
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
  admErrorBgL: 'rgba(254,242,242,1)',
  admErrorBgD: 'rgba(127,29,29,0.2)',
  admErrorBorderL: '#fca5a5',
  admErrorBorderD: 'rgba(153,27,27,0.5)',
  admErrorTextL: '#dc2626',
  admErrorTextD: '#f87171',
  admErrorActionL: '#b91c1c',
  admErrorActionD: '#fca5a5',
  // ── Status badge tokens ──
  statusBorradorBg: 'rgba(242,169,0,0.12)',
  statusBorradorFg: '#F2A900',
  statusPublicadoBg: 'rgba(74,138,99,0.12)',
  statusPublicadoFg: '#4A8A63',
  statusCerradoBg: 'rgba(156,163,175,0.12)',
  statusCerradoFg: '#6B7280',
  statusCanceladoBg: 'rgba(222,57,58,0.12)',
  statusCanceladoFg: '#DE393A',
  // ── Settlement badge tokens (R2-4: liquidaciones must not reuse the
  // publication-status tokens — pagada mirrors the published green, pendiente
  // mirrors the draft amber) ──
  settlementPagadaBg: 'rgba(74,138,99,0.12)',
  settlementPagadaFg: '#4A8A63',
  settlementPendienteBg: 'rgba(242,169,0,0.12)',
  settlementPendienteFg: '#F2A900',
  // ── Cart-specific tokens ──
  cartRowBg: 'rgba(128,128,128,0.08)',
  cartRowBgD: 'rgba(255,255,255,0.05)',
  cartPlaceholderBg: 'rgba(128,128,128,0.1)',
  cartPlaceholderBgD: 'rgba(255,255,255,0.08)',
  cartBtnBg: 'rgba(128,128,128,0.15)',
  cartBtnBgD: 'rgba(255,255,255,0.1)',
  cartBtnDisabledBg: 'rgba(128,128,128,0.08)',
  cartBtnDisabledBgD: 'rgba(255,255,255,0.04)',
};

export interface ThemeColors {
  readonly bg: string;
  readonly surface: string;
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly input: string;
  readonly errorBg: string;
  readonly accentBg: string;
  readonly coralBg: string;
  readonly brand: string;
  readonly segBg: string;
  readonly shadowBg: string;
  readonly subtleBg: string;
  readonly statusBorradorBg: string;
  readonly statusBorradorFg: string;
  readonly statusPublicadoBg: string;
  readonly statusPublicadoFg: string;
  readonly statusCerradoBg: string;
  readonly statusCerradoFg: string;
  readonly statusCanceladoBg: string;
  readonly statusCanceladoFg: string;
}

function statusColors(isDark: boolean) {
  return {
    statusBorradorBg: isDark ? 'rgba(242,169,0,0.15)' : 'rgba(242,169,0,0.1)',
    statusBorradorFg: isDark ? '#F2A900' : '#D4A020',
    statusPublicadoBg: isDark ? 'rgba(74,138,99,0.15)' : 'rgba(36,86,60,0.1)',
    statusPublicadoFg: isDark ? '#4A8A63' : '#24563C',
    statusCerradoBg: isDark
      ? 'rgba(156,163,175,0.15)'
      : 'rgba(107,114,128,0.1)',
    statusCerradoFg: isDark ? '#9DA3AF' : '#6B7280',
    statusCanceladoBg: isDark ? 'rgba(232,74,74,0.15)' : 'rgba(222,57,58,0.1)',
    statusCanceladoFg: isDark ? '#F87171' : '#DE393A',
  };
}

export function themeColors(isDark: boolean): ThemeColors {
  return {
    bg: isDark ? '#1A211B' : '#F5F7F0',
    surface: isDark ? '#263028' : '#FFFFFF',
    fg: isDark ? '#E8EAE4' : '#2D3328',
    muted: isDark ? '#9DA89D' : '#5E6B5E',
    border: isDark ? '#353D35' : '#E2E6DF',
    input: isDark ? '#263028' : '#F5F7F0',
    errorBg: isDark ? '#3D2023' : '#FDEDEE',
    accentBg: isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)',
    coralBg: isDark ? 'rgba(232,74,74,0.12)' : 'rgba(222,57,58,0.07)',
    ...statusColors(isDark),
    brand: isDark ? '#4A8A63' : '#24563C',
    segBg: isDark ? '#263028' : '#E8ECE4',
    shadowBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    subtleBg: isDark ? 'rgba(74,138,99,0.14)' : 'rgba(36,86,60,0.08)',
  };
}
