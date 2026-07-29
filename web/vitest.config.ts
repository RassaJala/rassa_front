import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    alias: {
      '@/common': path.resolve(__dirname, '../packages/common/src'),
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './src'),
    },
  },
});
