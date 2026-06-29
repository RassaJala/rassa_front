/**
 * Valida mensajes de commit bajo Conventional Commits.
 */

import type { UserConfig } from '@commitlint/types';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Tipos válidos de commits.
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],

    // Subject — minúsculas, sin punto final.
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],

    // Subject obligatorio (no vacío).
    'subject-empty': [2, 'never'],

    // Cabecera máxima 100 caracteres.
    'header-max-length': [2, 'always', 100],
  },
};

export default config;
