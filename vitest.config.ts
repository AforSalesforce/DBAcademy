import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` throws outside Next's server build; tests run in plain
      // Node, so use the package's own no-op entry. The real guard still
      // applies to every `next build`.
      'server-only': path.resolve(__dirname, './node_modules/server-only/empty.js'),
    },
  },
});
