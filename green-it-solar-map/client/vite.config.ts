import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    // This ensures Cesium's assets are found correctly by hard-coding the path.
    'CESIUM_BASE_URL': JSON.stringify('/cesium/')
  },
  server: {
    open: true, // Automatically open the browser
  },
});