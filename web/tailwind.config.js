import { colors } from './src/constants/colors';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          'green-forest': colors.brand.greenForest,
          'green-sage': colors.brand.greenSage,
          'green-olive': colors.brand.greenOlive,
          'red-coral': colors.brand.redCoral,
          magenta: colors.brand.magenta,
          orange: colors.brand.orange,
          skin: colors.brand.skin,
          ink: colors.brand.ink,
          'mountain-top': colors.brand.mountainTop,
          'mountain-mid': colors.brand.mountainMid,
          'mountain-bot': colors.brand.mountainBot,
          primary: colors.brandPrimary,
          'primary-dark': colors.brandPrimaryDark,
        },
        rassa: {
          bg: colors.admBgL,
          surface: colors.admSurfaceL,
          fg: colors.admFgL,
          muted: colors.admMutedL,
          border: colors.admBorderL,
          input: colors.admBgL,
          'bg-dark': colors.admBgD,
          'surface-dark': colors.admSurfaceD,
          'fg-dark': colors.admFgD,
          'muted-dark': colors.admMutedD,
          'border-dark': colors.admBorderD,
          'input-dark': colors.admBgD,
          'accent-bg': colors.admBgL,
          'accent-bg-dark': colors.admBorderD,
          'brand-dark': colors.admBrandD,
          error: colors.brandRedCoral,
          'error-bg': colors.admErrorBgL,
          'error-bg-dark': colors.admErrorBgD,
          overlay: colors.overlayBg,
        },
      },
    },
  },
  plugins: [],
};
