import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://demo1.taxxa.co', // URL de destino
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            
            delete proxyRes.headers['access-control-allow-origin'];
            proxyRes.headers['access-control-allow-origin'] = 'http://localhost:5173';
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      //external: ['crypto-js'],
    },
  },
});