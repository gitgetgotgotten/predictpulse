import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => ({
  plugins: [react()],
  // Set base to '/predictpulse/' in production for GitHub Pages, '/' in dev
  base: mode === 'production' ? '/predictpulse/' : '/',
  server: {
    port: 5173,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  },
  build: {
    assetsInlineLimit: 0, // Keep assets as separate files
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    emptyOutDir: true // Clear dist/ before building
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
}));