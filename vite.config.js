import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        supervisor: resolve(__dirname, 'supervisor.html')
      }
    },
    assetsInlineLimit: 0
  },
  publicDir: 'public'
});
