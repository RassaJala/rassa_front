/**
 * Configura reglas de linting, boundaries arquitectónicos y orden de imports.
 * No modificar la exportación final ni los grupos de perfectionist.
 */

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactNativePlugin from 'eslint-plugin-react-native';
import importXPlugin from 'eslint-plugin-import-x';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';
import securityPlugin from 'eslint-plugin-security';
import promisePlugin from 'eslint-plugin-promise';
import perfectionistPlugin from 'eslint-plugin-perfectionist';
import regexpPlugin from 'eslint-plugin-regexp';
import eslintCommentsPlugin from 'eslint-plugin-eslint-comments';
import boundariesPlugin from 'eslint-plugin-boundaries';
import packageJsonPlugin from 'eslint-plugin-package-json';
import jsdocPlugin from 'eslint-plugin-jsdoc';

// @ts-ignore
import path from 'node:path';
// @ts-ignore
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Ignores globales — excluye archivos autogenerados y pesados.
function createIgnoresConfig() {
  return defineConfig({
    ignores: [
      '**/node_modules/**',
      '**/.expo/**',
      '**/dist/**',
      '**/web-build/**',
      '**/build/**',
      'config/eslint.config.ts',
      'config/prettier.config.mjs',
      '**/*.js',
      '**/*.mjs',
    ],
  });
}

// 2. Reglas base de JS y comentarios ESLint.
function createBaseRules() {
  return defineConfig({
    plugins: {
      'eslint-comments': eslintCommentsPlugin,
    },
    rules: {
      // Variables y sintaxis básica
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-redeclare': 'error',

      // Comentarios ESLint
      'eslint-comments/no-unlimited-disable': 'error',
      'eslint-comments/require-description': 'error',
    },
  });
}

// 3. Reglas de TypeScript — tipado estricto y limpieza de imports.
function createTypeScriptRules() {
  return defineConfig({
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImportsPlugin,
    },
    rules: {
      // SEGURIDAD DE TIPOS //

      // Prohibir el uso explícito de any.
      '@typescript-eslint/no-explicit-any': 'error',
      // Exigir tipos en firmas públicas de módulos.
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Evitar aserciones no nulas inseguras.
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Prohibir llamadas inseguras a miembros typed 'any'.
      '@typescript-eslint/no-unsafe-member-access': 'error',
      // Evitar promesas flotantes (no gestionadas).
      '@typescript-eslint/no-floating-promises': 'error',

      // LIMPIEZA DE CÓDIGO //
      '@typescript-eslint/no-unused-vars': 'off', // Desactivada para delegar a unused-imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  });
}

// 4. Reglas de React y Hooks (React 19).
function createReactRules() {
  return defineConfig({
    files: ['**/*.tsx', '**/*.ts'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin as any,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Hooks — orden de llamada y dependencias de useEffect/useMemo.
      'react-hooks/rules-of-hooks': 'error',
      // Exhaustividad del arreglo de dependencias.
      'react-hooks/exhaustive-deps': 'error',
      // Componentes — key obligatoria, sin nests inestables, sin props duplicados.
      'react/jsx-key': 'error',
      // Evitar funciones inestables como componentes anidados.
      'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
      // Evitar props duplicadas en JSX.
      'react/jsx-no-duplicate-props': 'error',
    },
  });
}

// 5. Reglas de React Native — estilos y rendimiento en móvil.
function createReactNativeRules() {
  return defineConfig({
    files: ['**/*.tsx', '**/*.ts'],
    plugins: {
      'react-native': reactNativePlugin as any,
    },
    rules: {
      // Estilos — sin unused, inline ni colores hardcodeados.
      'react-native/no-unused-styles': 'error',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'error',
    },
  });
}

// 6. Imports y arquitectura — orden alfabético y límites de dependencias.
function createImportsAndBoundariesRules() {
  return defineConfig({
    plugins: {
      'import-x': importXPlugin,
      perfectionist: perfectionistPlugin,
      boundaries: boundariesPlugin,
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          project: './config/tsconfig.eslint.json',
        },
      },
      // Definición de capas — Feature First: screens > features > components > hooks > services > api.
      'boundaries/elements': [
        { type: 'screens', pattern: 'src/screens/*' },
        { type: 'features', pattern: 'src/features/*' },
        { type: 'components', pattern: 'src/components/*' },
        { type: 'hooks', pattern: 'src/hooks/*' },
        { type: 'services', pattern: 'src/services/*' },
        { type: 'api', pattern: 'src/api/*' },
      ],
    },
    rules: {
      // Boundaries — dependencias unidireccionales: screens > features > components > hooks > services > api.
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            'Violación de arquitectura: {{from.type}} no puede importar {{to.type}}.',
          rules: [
            {
              from: [{ type: 'screens' }],
              allow: [
                { to: { type: 'features' } },
                { to: { type: 'components' } },
                { to: { type: 'hooks' } },
                { to: { type: 'services' } },
                { to: { type: 'api' } },
              ],
            },
            {
              from: [{ type: 'features' }],
              allow: [
                { to: { type: 'components' } },
                { to: { type: 'hooks' } },
                { to: { type: 'services' } },
                { to: { type: 'api' } },
              ],
            },
            {
              from: [{ type: 'components' }],
              allow: [
                { to: { type: 'hooks' } },
                { to: { type: 'services' } },
                { to: { type: 'api' } },
              ],
            },
            {
              from: [{ type: 'hooks' }],
              allow: [{ to: { type: 'services' } }, { to: { type: 'api' } }],
            },
            { from: [{ type: 'services' }], allow: [{ to: { type: 'api' } }] },
            { from: [{ type: 'api' }], allow: [] },
          ],
        },
      ],

      // Perfectionist — orden alfabético: Node > React > Expo > ThirdParty > Alias > Relativos.
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
          internalPattern: ['^~/.+', '^@/.+'],
          groups: [
            'builtin',
            'react',
            'expo',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          newlinesBetween: 1,
          customGroups: [
            {
              groupName: 'react',
              elementNamePattern: ['^react$', '^react-.+'],
            },
            { groupName: 'expo', elementNamePattern: ['^expo$', '^expo-.+'] },
          ],
        },
      ],
    },
  });
}

// 7. Calidad, seguridad y complejidad — sonarjs, security, promise, regexp.
function createQualityAndSecurityRules() {
  return defineConfig({
    plugins: {
      sonarjs: sonarjsPlugin,
      unicorn: unicornPlugin,
      security: securityPlugin as any,
      promise: promisePlugin as any,
      regexp: regexpPlugin as any,
      jsdoc: jsdocPlugin,
      'package-json': packageJsonPlugin,
    },
    rules: {
      // Complejidad — cognitiva máx. 15, sin branches idénticos.
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicated-branches': 'error',

      // Seguridad — sin eval, regex anti-ReDoS.
      'security/detect-eval-with-expression': 'error',
      'regexp/no-super-linear-backtracking': 'error',

      // Promesas — siempre retornar y capturar errores.
      'promise/always-return': 'error',
      'promise/catch-or-return': 'error',

      // Unicorn — filename-case desactivado (React Native usa PascalCase).
      'unicorn/filename-case': 'off',

      // JSDoc — alineación de bloques de comentarios.
      'jsdoc/check-alignment': 'error',
    },
  });
}

// Flat config consolidada — todos los bloques se combinan aquí.
export default defineConfig(
  eslint.configs.recommended,
  ...createIgnoresConfig(),
  ...createBaseRules(),
  ...createTypeScriptRules(),
  ...createReactRules(),
  ...createReactNativeRules(),
  ...createImportsAndBoundariesRules(),
  ...createQualityAndSecurityRules(),
);
