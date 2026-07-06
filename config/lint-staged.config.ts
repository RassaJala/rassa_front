/**
 * Ejecuta Prettier, ESLint y tsc solo sobre archivos staged al hacer commit.
 * Pueden añadirse tests unitarios para archivos que cambien.
 */

const config = {
  // Para archivos de TypeScript y React
  '**/*.{ts,tsx}': (filenames: readonly string[]): string[] => {
    const files = filenames.join(' ');
    return [
      `prettier --write ${files}`,
      `eslint -c config/eslint.config.ts --fix ${files}`,
      'tsc --noEmit --skipLibCheck',
      `git add ${files}`,
    ];
  },

  // Para archivos de JavaScript y configuración
  '**/*.{js,jsx,mjs,json,md,yml,yaml}': (
    filenames: readonly string[],
  ): string[] => {
    const files = filenames.join(' ');
    return [`prettier --write ${files}`, `git add ${files}`];
  },
};

export default config;
