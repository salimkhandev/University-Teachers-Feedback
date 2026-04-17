import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Proxy /api → backend so browser never makes a cross-origin request
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:      'http://localhost:5000',
        changeOrigin: true,
        secure:      false,
      },
    },
  },
});
