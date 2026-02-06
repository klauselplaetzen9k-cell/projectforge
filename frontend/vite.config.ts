// ============================================================================
// Vite Configuration
// ============================================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // Resolution options
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Build options
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },

  // Development server options
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // CSS options
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },

  // TypeScript options
  tsconfig: 'tsconfig.json',
});
