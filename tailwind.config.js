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
            forest: '#3A6D56',
            sage: '#AEC0BC',
            olive: '#CED295',
          },
          red: {
            coral: '#DE393A',
          },
          magenta: '#D52E7A',
          orange: '#E46C38',
          skin: '#D8D3C8',
          ink: '#1D1D1D',
          mountain: {
            top: '#EEAA6F',
            mid: '#B2C2B2',
            bot: '#A19FB6',
          },
        },
        rassa: {
          bg: '#F5F7F0',
          surface: '#FFFFFF',
          fg: '#2D3328',
          muted: '#5E6B5E',
          border: '#E2E6DF',
          input: '#F9FAF6',
          'bg-dark': '#1A211B',
          'surface-dark': '#263028',
          'fg-dark': '#E8EAE4',
          'muted-dark': '#9DA89D',
          'border-dark': '#353D35',
          'input-dark': '#1A211B',
          'accent-bg': '#F5F7F0',
          'accent-bg-dark': '#353D35',
          'brand-dark': '#4A8A63',
          error: '#DE393A',
          'error-bg': '#FDEDEE',
          'error-bg-dark': '#3D2023',
          overlay: 'rgba(0,0,0,0.4)',
        },
      },
    },
  },
  plugins: [],
};
