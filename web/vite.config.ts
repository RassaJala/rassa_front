import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/common': path.resolve(__dirname, '../packages/common/src'),
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './src'),
      '@root': path.resolve(__dirname, '../src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
