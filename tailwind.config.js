/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            forest: '#3A6D56', // Hojas — verde base
            sage: '#AEC0BC', // Nopal — verde pálido
            olive: '#CED295', // Tipografía y marco — verde oliva
          },
          red: {
            coral: '#DE393A', // Tomates — rojo intenso
          },
          magenta: '#D52E7A', // Tunas — fucsia
          orange: '#E46C38', // Zanahorias — naranja
          skin: '#D8D3C8', // Manos — beige grisáceo
          ink: '#1D1D1D', // Contornos — negro suave
          mountain: {
            top: '#EEAA6F', // Montaña superior
            mid: '#B2C2B2', // Montaña media
            bot: '#A19FB6', // Montaña inferior
          },
        },
      },
    },
  },
  plugins: [],
};
