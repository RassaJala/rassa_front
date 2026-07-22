export const colors = {
  primary: '#16a34a', // green-600
  primaryDark: '#15803d', // green-700
  primaryLight: '#22c55e', // green-500
  accent: '#f59e0b', // amber-500
  background: '#f9fafb', // gray-50
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
  brandInk: '#1f2937', // gray-800
  iconMuted: '#9ca3af', // gray-400
  iconWhite: '#ffffff',
};

export function themeColors(isDark: boolean) {
  return {
    bg: isDark ? '#1A211B' : '#F5F7F0',
    surface: isDark ? '#263028' : '#FFFFFF',
    fg: isDark ? '#E8EAE4' : '#2D3328',
    muted: isDark ? '#9DA89D' : '#5E6B5E',
    border: isDark ? '#353D35' : '#E2E6DF',
    input: isDark ? '#263028' : '#F5F7F0',
    errorBg: isDark ? '#3D2023' : '#FDEDEE',
    accentBg: isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)',
    coralBg: isDark ? 'rgba(222,57,58,0.07)' : 'rgba(222,57,58,0.07)',
    brand: isDark ? '#4A8A63' : '#24563C',
    segBg: isDark ? '#263028' : '#E8ECE4',
  };
}
