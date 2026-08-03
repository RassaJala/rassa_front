import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    forbidOnly: true,
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
    alias: {
      '@/common': path.resolve(__dirname, '../packages/common/src'),
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './src'),
      '@rassa/chat': path.resolve(__dirname, '../packages/chat/src'),
    },
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
});
