import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setupEnv.ts', './src/__tests__/setup.ts'],
    exclude: ['node_modules', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        branches: 50,
        functions: 70,
        lines: 75,
        statements: 75
      }
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
