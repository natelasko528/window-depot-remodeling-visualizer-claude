import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom for the browser-side modules; the server handlers are pure Node
    // but run fine in the same environment since they only touch fetch.
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.mjs'],
  },
});
