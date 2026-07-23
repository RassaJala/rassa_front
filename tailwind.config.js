const { colors } = require('./src/constants/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            forest: colors.brand.greenForest,
            sage: colors.brand.greenSage,
            olive: colors.brand.greenOlive,
          },
          red: {
            coral: colors.brand.redCoral,
          },
          magenta: colors.brand.magenta,
          orange: colors.brand.orange,
          skin: colors.brand.skin,
          ink: colors.brand.ink,
          mountain: {
            top: colors.brand.mountainTop,
            mid: colors.brand.mountainMid,
            bot: colors.brand.mountainBot,
          },
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
          'error-bg': '#FDEDEE',
          'error-bg-dark': '#3D2023',
          overlay: colors.overlayBg,
        },
      },
    },
  },
  plugins: [],
};
