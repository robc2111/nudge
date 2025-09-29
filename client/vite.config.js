import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Clean, minimal config. No markdown plugin.
export default defineConfig({
  plugins: [react()],
});
