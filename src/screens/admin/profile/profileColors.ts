import { useTheme } from '@/store/ThemeContext';

export interface ProfileColors {
  readonly bg: string;
  readonly surface: string;
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly brand: string;
  readonly accentBg: string;
  readonly inputBg: string;
  readonly inputText: string;
  readonly placeholderColor: string;
  readonly errorColor: string;
  readonly errorBg: string;
  readonly white: string;
}

export function useProfileColors(): ProfileColors {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  return {
    bg: isDark ? '#1A211B' : '#F5F7F0',
    surface: isDark ? '#263028' : '#FFFFFF',
    fg: isDark ? '#E8EAE4' : '#2D3328',
    muted: isDark ? '#9DA89D' : '#5E6B5E',
    border: isDark ? '#353D35' : '#E2E6DF',
    brand: isDark ? '#4A8A63' : '#24563C',
    accentBg: isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)',
    inputBg: isDark ? '#1A211B' : '#F9FAF8',
    inputText: isDark ? '#E8EAE4' : '#2D3328',
    placeholderColor: isDark ? '#6B7A6B' : '#9CA89C',
    errorColor: '#DE393A',
    errorBg: isDark ? 'rgba(222,57,58,0.12)' : 'rgba(222,57,58,0.07)',
    white: '#FFFFFF',
  };
}
