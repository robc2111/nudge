// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
  build: {
    minify: 'esbuild', // default, fastest
    target: 'es2020',
    cssMinify: true,
    sourcemap: false,
  },
});
