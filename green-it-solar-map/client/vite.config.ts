import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    'CESIUM_BASE_URL': JSON.stringify('/cesium/')
  },
  server: {
    open: true, // Automatically open the browser
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
});