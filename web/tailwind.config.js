/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          'green-forest': '#3A6D56',
          'green-sage': '#AEC0BC',
          'green-olive': '#CED295',
          'red-coral': '#DE393A',
          magenta: '#D52E7A',
          orange: '#E46C38',
          skin: '#D8D3C8',
          ink: '#1D1D1D',
          'mountain-top': '#EEAA6F',
          'mountain-mid': '#B2C2B2',
          'mountain-bot': '#A19FB6',
        },
      },
    },
  },
  plugins: [],
};
