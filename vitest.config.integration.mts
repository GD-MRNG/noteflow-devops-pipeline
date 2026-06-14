import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    globalSetup: ['__tests__/integration/setup.ts'],
    include: ['__tests__/integration/**/*.test.ts'],
  },
});
