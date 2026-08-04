/* eslint-disable */
/**
 * Configura reglas de linting, boundaries arquitectónicos y orden de imports.
 * No modificar la exportación final ni los grupos de perfectionist.
 *
 * Este archivo se auto-excluye de ESLint (en ignores), pero la extensión
 * de VS Code a veces lo lintea de todas formas. El eslint-disable global
 * previene esos falsos positivos en el IDE.
 */

import eslint from '@eslint/js';
import boundariesPlugin from 'eslint-plugin-boundaries';
import importXPlugin from 'eslint-plugin-import-x';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import packageJsonPlugin from 'eslint-plugin-package-json';
import perfectionistPlugin from 'eslint-plugin-perfectionist';
import promisePlugin from 'eslint-plugin-promise';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactNativePlugin from 'eslint-plugin-react-native';
import regexpPlugin from 'eslint-plugin-regexp';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

import path from 'node:path';
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
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      'jest.setup.ts',
      'web/**',
      'packages/**',
    ],
  });
}

// 2. Reglas base de JS.
function createBaseRules() {
  return defineConfig({
    rules: {
      // Variables y sintaxis básica
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-redeclare': 'error',

      // Deactivar no-unused-vars nativo; unused-imports plugin lo gestiona
      'no-unused-vars': 'off',
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
      // Desactivar no-undef para TS — TypeScript ya valida esto.
      'no-undef': 'off',

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

      // NO-UNSAFE FAMILY — propagación estricta de any.
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // TIPOS CONSISTENTES Y ESTRICTOS //
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      // Exigir tipos readonly en parámetros de componentes (previene mutaciones de props).
      '@typescript-eslint/prefer-readonly-parameter-types': 'warn',

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

      // REACT — PATRONES DE CALIDAD //
      'react/jsx-no-leaked-render': 'error',
      'react/jsx-no-useless-fragment': 'warn',
      'react/no-direct-mutation-state': 'error',
      'react/jsx-boolean-value': 'warn',
      'react/self-closing-comp': 'warn',
      'react/jsx-fragments': 'warn',
      'react/no-array-index-key': 'warn',
      'react/jsx-no-constructed-context-values': 'error',
      'react/forward-ref-uses-ref': 'error',
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
    languageOptions: {
      globals: {
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        __DEV__: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      // Estilos — sin unused, inline ni colores hardcodeados.
      'react-native/no-unused-styles': 'error',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'error',
      'react-native/no-single-element-style-arrays': 'error',
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
      // IMPORT-X — RESOLUCIÓN E INTEGRIDAD //
      'import-x/no-unresolved': 'error',
      'import-x/no-cycle': 'warn',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/first': 'error',
      'import-x/consistent-type-specifier-style': 'error',

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
      'perfectionist/sort-named-imports': 'error',
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
      regexp: regexpPlugin,
      jsdoc: jsdocPlugin,
      'package-json': packageJsonPlugin,
    },
    rules: {
      // Complejidad — cognitiva máx. 15, sin branches idénticos.
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicated-branches': 'error',

      // SONARJS — PREVENCIÓN DE BUGS //
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-identical-expressions': 'error',
      'sonarjs/no-gratuitous-expressions': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/no-useless-catch': 'error',

      // SONARJS — OLORES DE CÓDIGO //
      'sonarjs/no-collapsible-if': 'warn',
      'sonarjs/no-dead-store': 'warn',
      'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/no-inverted-boolean-check': 'error',
      'sonarjs/no-nested-switch': 'warn',
      'sonarjs/no-nested-template-literals': 'warn',
      'sonarjs/no-redundant-jump': 'warn',
      'sonarjs/no-same-line-conditional': 'warn',

      // Seguridad — sin eval, regex anti-ReDoS.
      'security/detect-eval-with-expression': 'error',
      'security/detect-object-injection': 'warn',

      // RegExp — seguridad y limpieza.
      'regexp/no-super-linear-backtracking': 'error',
      'regexp/no-useless-escape': 'error',
      'regexp/no-empty-character-class': 'error',
      'regexp/no-empty-group': 'error',
      'regexp/no-empty-alternative': 'error',
      'regexp/prefer-regexp-exec': 'warn',
      'regexp/prefer-regexp-test': 'warn',
      'regexp/no-useless-flag': 'error',
      'regexp/prefer-character-class': 'warn',
      'regexp/sort-character-class-elements': 'warn',
      'regexp/no-useless-backreference': 'error',

      // Promesas — siempre retornar y capturar errores.
      'promise/always-return': 'error',
      'promise/catch-or-return': 'error',
      'promise/no-nesting': 'warn',
      'promise/prefer-catch': 'error',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/no-multiple-resolved': 'error',
      'promise/no-return-in-finally': 'warn',

      // Unicorn — RN-compatible: sin undefined inútiles, spreads, concat.
      'unicorn/filename-case': 'off',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-concat': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/no-nested-ternary': 'warn',
      'unicorn/no-named-default': 'error',
      'unicorn/prefer-add-event-listener': 'error',

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
  // eslint-config-prettier DEBE ir al final absoluto: apaga cualquier regla
  // de ESLint que choque con Prettier (p. ej. unicorn/no-nested-ternary, cuyos
  // paréntesis Prettier elimina, causando el ping-pong eslint --fix ↔ prettier).
  prettierConfig,
);
