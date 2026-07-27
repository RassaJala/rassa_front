/**
 * Configura formato de código (no linting). Incluye plugin de TailwindCSS para NativeWind.
 */

/** @type {import("prettier").Config} */
const config = {
  // Establece el ancho máximo de la línea antes de forzar un salto de línea.
  printWidth: 80,

  // Número de espacios que equivalen a una indentación.
  tabWidth: 2,

  // Indentar con espacios en lugar de tabuladores reales.
  useTabs: false,

  // Añadir punto y coma al final de cada sentencia.
  semi: true,

  // Utilizar comillas simples en lugar de dobles para cadenas de texto.
  singleQuote: true,

  // Comas finales aplicadas a todos los elementos donde sea válido (ES5, tipos, etc.).
  trailingComma: 'all',

  // Insertar espacios entre corchetes en objetos (ej: { foo: bar }).
  bracketSpacing: true,

  // Colocar el símbolo '>' de la etiqueta JSX de cierre en la misma línea del último prop en lugar de en una línea nueva.
  bracketSameLine: false,

  // Forzar paréntesis alrededor de parámetros de arrow functions cuando sea necesario (ej: (x) => x).
  arrowParens: 'always',

  // Fin de línea con formato de salto LF (Unix) consistente.
  endOfLine: 'lf',

  // No usar comillas simples para strings de atributos JSX (forzar comillas dobles estándar en JSX).
  jsxSingleQuote: false,

  // Listado de plugins de formateo adicionales.
  // plugins: ['prettier-plugin-tailwindcss'],
};

export default config;
