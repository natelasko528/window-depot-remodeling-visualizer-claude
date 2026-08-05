import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { generateHandler } from './server/generate.mjs';
import { detectHandler } from './server/detect.mjs';
import { settingsHandler } from './server/settings.mjs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'visualizer-api',
      configureServer(server) {
        server.middlewares.use('/api/generate', generateHandler);
        server.middlewares.use('/api/detect', detectHandler);
        server.middlewares.use('/api/settings', settingsHandler);
      },
    },
  ],
});
