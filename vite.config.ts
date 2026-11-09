import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
