import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    'import.meta.env.NODE_ENV': JSON.stringify('development'),
  },
  optimizeDeps: {
    include: ['bip39'],
    exclude: ['tiny-secp256k1'],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  base: './',
});
